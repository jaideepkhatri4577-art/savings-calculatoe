from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone
from services.bill_processor import BillProcessor


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/calculate-savings")
async def calculate_savings(file: UploadFile = File(...)):
    """
    Process AWS bill (PDF or CSV) and calculate potential savings
    """
    try:
        # Security Check 1: Validate file provided
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Security Check 2: Validate file extension
        file_ext = file.filename.lower().split('.')[-1]
        allowed_extensions = ['pdf', 'csv']
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Only PDF and CSV files are supported. Received: {file_ext}"
            )
        
        # Security Check 3: Validate MIME type
        allowed_mime_types = [
            'application/pdf',
            'text/csv',
            'application/csv',
            'application/vnd.ms-excel',
            'text/plain'  # Some browsers send CSV as text/plain
        ]
        if file.content_type and file.content_type not in allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content type. Expected PDF or CSV. Received: {file.content_type}"
            )
        
        # Security Check 4: Validate file size (max 50MB)
        file_content = await file.read()
        max_size = 50 * 1024 * 1024  # 50MB
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is 50MB. Received: {len(file_content) / 1024 / 1024:.2f}MB"
            )
        
        # Security Check 5: Validate file is not empty
        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Process based on file type
        if file_ext == 'pdf':
            result = await BillProcessor.process_pdf(file_content)
        else:  # csv
            result = await BillProcessor.process_csv(file_content)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error', 'Error processing file'))
        
        # Calculate totals
        total_savings = sum(item['savings'] for item in result['savings_breakdown'])
        total_on_demand = sum(item['on_demand_cost'] for item in result['savings_breakdown'])
        total_bill = result.get('total_bill_amount', total_on_demand)
        optimized_total = total_bill - total_savings
        
        return {
            'success': True,
            'current_spend': round(total_bill, 2),  # Show total bill amount
            'optimized_spend': round(optimized_total, 2),  # Projection after savings
            'monthly_savings': round(total_savings, 2),
            'annual_savings': round(total_savings * 12, 2),
            'savings_percentage': round((total_savings / total_bill * 100), 1) if total_bill > 0 else 0,
            'breakdown': result['savings_breakdown'],
            'has_reserved_instances': any(item.get('coverage') != 'On-demand' for item in result['savings_breakdown'])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Security: Don't leak internal error details to client
        logger.error(f"Error in calculate_savings endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Unable to process file. Please ensure it's a valid AWS bill in PDF or CSV format."
        )

# Include the router in the main app
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()