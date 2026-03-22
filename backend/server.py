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
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        file_ext = file.filename.lower().split('.')[-1]
        if file_ext not in ['pdf', 'csv']:
            raise HTTPException(status_code=400, detail="Only PDF and CSV files are supported")
        
        # Read file content
        file_content = await file.read()
        
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
        logger.error(f"Error in calculate_savings endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()