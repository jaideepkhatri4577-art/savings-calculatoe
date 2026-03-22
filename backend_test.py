#!/usr/bin/env python3
"""
Backend API Testing for AWS Cost Calculator
Tests the /api/calculate-savings endpoint with PDF and CSV uploads
"""

import requests
import json
import io
import csv
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_BASE = f"{BACKEND_URL}/api"

def create_mock_csv_content():
    """Create mock CSV content with AWS service costs"""
    csv_content = io.StringIO()
    writer = csv.writer(csv_content)
    
    # Write header
    writer.writerow(['service', 'cost'])
    
    # Write sample data
    writer.writerow(['Amazon Elastic Compute Cloud', '3500.00'])
    writer.writerow(['Amazon RDS', '2500.00'])
    writer.writerow(['AWS Lambda', '1500.00'])
    writer.writerow(['Amazon ElastiCache', '1500.00'])
    writer.writerow(['Amazon S3', '1000.00'])
    
    return csv_content.getvalue().encode('utf-8')

def create_mock_pdf_content():
    """Create mock PDF content (just bytes for testing)"""
    # This is a minimal PDF structure for testing
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(AWS Bill - EC2: $3500) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF"""
    return pdf_content

def test_health_check():
    """Test basic API health"""
    print("🔍 Testing API health check...")
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            print("✅ API health check passed")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API health check failed: {str(e)}")
        return False

def test_calculate_savings_csv():
    """Test /api/calculate-savings endpoint with CSV file"""
    print("\n🔍 Testing /api/calculate-savings with CSV file...")
    
    try:
        # Create mock CSV content
        csv_content = create_mock_csv_content()
        
        # Prepare file upload
        files = {
            'file': ('test_bill.csv', csv_content, 'text/csv')
        }
        
        # Make request
        response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=30)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            required_fields = ['success', 'current_spend', 'monthly_savings', 'annual_savings', 
                             'savings_percentage', 'breakdown', 'has_reserved_instances']
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            
            # Validate data types and values
            if not isinstance(data['success'], bool) or not data['success']:
                print(f"❌ Success field should be True, got: {data['success']}")
                return False
            
            if not isinstance(data['current_spend'], (int, float)) or data['current_spend'] <= 0:
                print(f"❌ Invalid current_spend: {data['current_spend']}")
                return False
            
            if not isinstance(data['monthly_savings'], (int, float)) or data['monthly_savings'] <= 0:
                print(f"❌ Invalid monthly_savings: {data['monthly_savings']}")
                return False
            
            if data['annual_savings'] != data['monthly_savings'] * 12:
                print(f"❌ Annual savings calculation incorrect: {data['annual_savings']} != {data['monthly_savings']} * 12")
                return False
            
            if not isinstance(data['savings_percentage'], (int, float)) or not (10 <= data['savings_percentage'] <= 60):
                print(f"❌ Savings percentage should be between 10-60%, got: {data['savings_percentage']}")
                return False
            
            if not isinstance(data['breakdown'], list) or len(data['breakdown']) == 0:
                print(f"❌ Breakdown should be a non-empty list, got: {data['breakdown']}")
                return False
            
            # Validate breakdown items
            for item in data['breakdown']:
                required_breakdown_fields = ['service', 'on_demand_cost', 'optimized_cost', 
                                           'savings', 'discount_percentage', 'coverage']
                missing_breakdown_fields = [field for field in required_breakdown_fields if field not in item]
                if missing_breakdown_fields:
                    print(f"❌ Missing breakdown fields: {missing_breakdown_fields}")
                    return False
                
                # Check savings calculation
                expected_savings = item['on_demand_cost'] - item['optimized_cost']
                if abs(item['savings'] - expected_savings) > 0.01:
                    print(f"❌ Savings calculation incorrect for {item['service']}: {item['savings']} != {expected_savings}")
                    return False
                
                # Check discount percentage is reasonable
                if not (10 <= item['discount_percentage'] <= 60):
                    print(f"❌ Discount percentage should be between 10-60% for {item['service']}, got: {item['discount_percentage']}")
                    return False
            
            print("✅ CSV upload test passed - all validations successful")
            return True
            
        else:
            print(f"❌ CSV upload test failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ CSV upload test failed with exception: {str(e)}")
        return False

def test_calculate_savings_pdf():
    """Test /api/calculate-savings endpoint with PDF file"""
    print("\n🔍 Testing /api/calculate-savings with PDF file...")
    
    try:
        # Create mock PDF content
        pdf_content = create_mock_pdf_content()
        
        # Prepare file upload
        files = {
            'file': ('test_bill.pdf', pdf_content, 'application/pdf')
        }
        
        # Make request
        response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=30)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")
            
            # Validate response structure (same as CSV test)
            required_fields = ['success', 'current_spend', 'monthly_savings', 'annual_savings', 
                             'savings_percentage', 'breakdown', 'has_reserved_instances']
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            
            # Validate basic structure
            if not data['success']:
                print(f"❌ Success should be True, got: {data['success']}")
                return False
            
            if data['current_spend'] <= 0:
                print(f"❌ Current spend should be positive, got: {data['current_spend']}")
                return False
            
            if len(data['breakdown']) == 0:
                print(f"❌ Breakdown should not be empty")
                return False
            
            print("✅ PDF upload test passed - response structure is valid")
            return True
            
        else:
            print(f"❌ PDF upload test failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ PDF upload test failed with exception: {str(e)}")
        return False

def test_invalid_file_type():
    """Test /api/calculate-savings endpoint with invalid file type"""
    print("\n🔍 Testing /api/calculate-savings with invalid file type...")
    
    try:
        # Create a text file (invalid type)
        text_content = b"This is not a valid PDF or CSV file"
        
        files = {
            'file': ('test_bill.txt', text_content, 'text/plain')
        }
        
        response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=30)
        
        if response.status_code == 400:
            print("✅ Invalid file type correctly rejected")
            return True
        else:
            print(f"❌ Expected 400 status code for invalid file, got: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Invalid file type test failed with exception: {str(e)}")
        return False

def test_no_file():
    """Test /api/calculate-savings endpoint with no file"""
    print("\n🔍 Testing /api/calculate-savings with no file...")
    
    try:
        response = requests.post(f"{API_BASE}/calculate-savings", timeout=30)
        
        if response.status_code == 422:  # FastAPI validation error
            print("✅ No file correctly rejected")
            return True
        else:
            print(f"❌ Expected 422 status code for no file, got: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ No file test failed with exception: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 50)
    
    test_results = {
        'health_check': test_health_check(),
        'csv_upload': test_calculate_savings_csv(),
        'pdf_upload': test_calculate_savings_pdf(),
        'invalid_file': test_invalid_file_type(),
        'no_file': test_no_file()
    }
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed!")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)