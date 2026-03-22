#!/usr/bin/env python3
"""
Backend API Testing for AWS Cost Calculator - 24/7 Instance Filtering
Tests the extended 24/7 filtering logic for EC2, Lambda, Fargate, ECS
and verifies Linux/RHEL split preservation with RDS ratio fallback
"""

import pytest
import requests
import os
from pathlib import Path

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://straw-calc.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test PDF path
TEST_PDF_PATH = "/tmp/user_aws_bill.pdf"


class Test247FilteringFeatures:
    """Test 24/7 instance filtering extended to all services"""
    
    def test_api_health(self):
        """Test basic API health"""
        response = requests.get(f"{API_BASE}/", timeout=10)
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✅ API health check passed")
    
    def test_pdf_upload_with_real_bill(self):
        """Test PDF upload with real AWS bill"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        assert response.status_code == 200, f"PDF upload failed: {response.status_code}"
        data = response.json()
        assert data.get('success') == True, "Response success should be True"
        print(f"✅ PDF upload successful - Total Bill: ${data.get('current_spend', 0):,.2f}")
        return data
    
    def test_ec2_has_247_indicator_logic(self):
        """Test that EC2 shows 24/7 indicator in UI (via commitment_type check)"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find EC2 in breakdown
        ec2_item = None
        for item in breakdown:
            if 'EC2' in item.get('service', ''):
                ec2_item = item
                break
        
        assert ec2_item is not None, "EC2 not found in breakdown"
        
        # EC2 should have commitment_type that qualifies for 24/7 indicator
        commitment_type = ec2_item.get('commitment_type', '')
        assert commitment_type, "EC2 should have commitment_type"
        
        # Check that commitment_type is NOT flat-rate, N/A, or Intelligent-Tiering
        # (these are excluded from 24/7 indicator in frontend)
        excluded_types = ['Flat-rate', 'N/A', 'Intelligent-Tiering']
        should_show_247 = not any(excl in commitment_type for excl in excluded_types)
        
        print(f"✅ EC2 commitment_type: {commitment_type}")
        print(f"✅ EC2 should show 24/7 indicator: {should_show_247}")
        
        # EC2 uses Compute SP, so it SHOULD show 24/7 indicator
        assert should_show_247, f"EC2 should show 24/7 indicator but commitment_type is: {commitment_type}"
    
    def test_ec2_linux_rhel_split_preserved(self):
        """Test that EC2 Linux/RHEL split is preserved with 24/7 filtering"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find EC2 in breakdown
        ec2_item = None
        for item in breakdown:
            if 'EC2' in item.get('service', ''):
                ec2_item = item
                break
        
        assert ec2_item is not None, "EC2 not found in breakdown"
        
        # Check for Linux/RHEL breakdown
        linux_cost = ec2_item.get('linux_cost', 0)
        rhel_cost = ec2_item.get('rhel_cost', 0)
        
        print(f"✅ EC2 Linux cost: ${linux_cost:,.2f}")
        print(f"✅ EC2 RHEL cost: ${rhel_cost:,.2f}")
        
        # At least one should be > 0 if the PDF has EC2 data
        assert linux_cost > 0 or rhel_cost > 0, "EC2 should have Linux or RHEL cost breakdown"
    
    def test_ec2_savings_with_247_filtering(self):
        """Test that EC2 savings are calculated with 24/7 filtering applied"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find EC2 in breakdown
        ec2_item = None
        for item in breakdown:
            if 'EC2' in item.get('service', ''):
                ec2_item = item
                break
        
        assert ec2_item is not None, "EC2 not found in breakdown"
        
        savings = ec2_item.get('savings', 0)
        on_demand_cost = ec2_item.get('on_demand_cost', 0)
        optimized_cost = ec2_item.get('optimized_cost', 0)
        
        print(f"✅ EC2 on_demand_cost: ${on_demand_cost:,.2f}")
        print(f"✅ EC2 optimized_cost: ${optimized_cost:,.2f}")
        print(f"✅ EC2 savings: ${savings:,.2f}")
        
        # Savings should be positive if there's on-demand cost
        # Note: With 24/7 filtering, savings may be reduced compared to before
        if on_demand_cost > 100:
            assert savings >= 0, "EC2 savings should be non-negative"
    
    def test_rds_247_filtering_still_works(self):
        """Test that RDS 24/7 filtering still works (no regression)"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find RDS in breakdown
        rds_item = None
        for item in breakdown:
            if item.get('service', '') == 'RDS':
                rds_item = item
                break
        
        assert rds_item is not None, "RDS not found in breakdown"
        
        savings = rds_item.get('savings', 0)
        on_demand_cost = rds_item.get('on_demand_cost', 0)
        commitment_type = rds_item.get('commitment_type', '')
        
        print(f"✅ RDS on_demand_cost: ${on_demand_cost:,.2f}")
        print(f"✅ RDS savings: ${savings:,.2f}")
        print(f"✅ RDS commitment_type: {commitment_type}")
        
        # RDS should have savings and proper commitment type
        assert savings > 0, "RDS should have positive savings"
        assert '1-year' in commitment_type or 'RI' in commitment_type, "RDS should use 1-year RI"
    
    def test_opensearch_247_filtering_still_works(self):
        """Test that OpenSearch 24/7 filtering still works (no regression)"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find OpenSearch in breakdown
        opensearch_item = None
        for item in breakdown:
            if 'OpenSearch' in item.get('service', ''):
                opensearch_item = item
                break
        
        if opensearch_item is None:
            pytest.skip("OpenSearch not found in this bill")
        
        savings = opensearch_item.get('savings', 0)
        commitment_type = opensearch_item.get('commitment_type', '')
        
        print(f"✅ OpenSearch savings: ${savings:,.2f}")
        print(f"✅ OpenSearch commitment_type: {commitment_type}")
        
        # OpenSearch should have proper commitment type
        assert commitment_type, "OpenSearch should have commitment_type"
    
    def test_s3_no_247_indicator(self):
        """Test that S3 does NOT show 24/7 indicator (storage service)"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find S3 in breakdown
        s3_item = None
        for item in breakdown:
            if item.get('service', '') == 'S3':
                s3_item = item
                break
        
        if s3_item is None:
            pytest.skip("S3 not found in this bill")
        
        commitment_type = s3_item.get('commitment_type', '')
        
        print(f"✅ S3 commitment_type: {commitment_type}")
        
        # S3 uses Intelligent-Tiering, which should NOT show 24/7 indicator
        assert 'Intelligent-Tiering' in commitment_type, "S3 should use Intelligent-Tiering"
    
    def test_sp_coverage_deduction_preserved(self):
        """Test that SP coverage deduction is preserved for EC2"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        # Find EC2 in breakdown
        ec2_item = None
        for item in breakdown:
            if 'EC2' in item.get('service', ''):
                ec2_item = item
                break
        
        assert ec2_item is not None, "EC2 not found in breakdown"
        
        reserved_portion = ec2_item.get('reserved_portion', 0)
        coverage_percentage = ec2_item.get('coverage_percentage', 0)
        
        print(f"✅ EC2 reserved_portion (SP coverage): ${reserved_portion:,.2f}")
        print(f"✅ EC2 coverage_percentage: {coverage_percentage}%")
        
        # EC2 should have SP coverage detected
        # Based on previous tests, EC2 has ~82-100% SP coverage
        assert coverage_percentage > 0, "EC2 should have SP coverage detected"
    
    def test_overall_savings_calculation(self):
        """Test overall savings calculation with 24/7 filtering"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        
        current_spend = data.get('current_spend', 0)
        optimized_spend = data.get('optimized_spend', 0)
        monthly_savings = data.get('monthly_savings', 0)
        annual_savings = data.get('annual_savings', 0)
        savings_percentage = data.get('savings_percentage', 0)
        
        print(f"✅ Current Spend: ${current_spend:,.2f}")
        print(f"✅ Optimized Spend: ${optimized_spend:,.2f}")
        print(f"✅ Monthly Savings: ${monthly_savings:,.2f}")
        print(f"✅ Annual Savings: ${annual_savings:,.2f}")
        print(f"✅ Savings Percentage: {savings_percentage}%")
        
        # Verify calculations
        assert current_spend > 0, "Current spend should be positive"
        assert optimized_spend > 0, "Optimized spend should be positive"
        assert monthly_savings > 0, "Monthly savings should be positive"
        assert abs(annual_savings - monthly_savings * 12) < 1, "Annual savings should be 12x monthly"
        assert optimized_spend < current_spend, "Optimized spend should be less than current"
        
        # Verify savings percentage calculation
        expected_pct = (monthly_savings / current_spend) * 100
        assert abs(savings_percentage - expected_pct) < 0.5, f"Savings percentage mismatch: {savings_percentage} vs {expected_pct}"


class TestBreakdownStructure:
    """Test breakdown response structure"""
    
    def test_breakdown_has_required_fields(self):
        """Test that breakdown items have all required fields"""
        if not Path(TEST_PDF_PATH).exists():
            pytest.skip(f"Test PDF not found at {TEST_PDF_PATH}")
        
        with open(TEST_PDF_PATH, 'rb') as f:
            files = {'file': ('user_aws_bill.pdf', f, 'application/pdf')}
            response = requests.post(f"{API_BASE}/calculate-savings", files=files, timeout=60)
        
        data = response.json()
        breakdown = data.get('breakdown', [])
        
        required_fields = [
            'service', 'on_demand_cost', 'reserved_portion', 'on_demand_portion',
            'optimized_cost', 'savings', 'discount_percentage', 'coverage',
            'coverage_percentage', 'commitment_type'
        ]
        
        for item in breakdown:
            for field in required_fields:
                assert field in item, f"Missing field '{field}' in breakdown item: {item.get('service', 'unknown')}"
        
        print(f"✅ All {len(breakdown)} breakdown items have required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
