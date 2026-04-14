"""
Test P2 Export Endpoints - Evaluaciones, Técnicos Aplicadores, Maquinaria
Tests for Excel and PDF export functionality for P2 modules
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestP2ExportEndpoints:
    """Test export endpoints for P2 modules: Evaluaciones, Técnicos Aplicadores, Maquinaria"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.token = None
        try:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": os.environ.get("TEST_EMAIL", ""), "password": os.environ.get("TEST_PASSWORD", "")},
                timeout=10
            )
            if login_response.status_code == 200:
                data = login_response.json()
                self.token = data.get("access_token")
        except Exception as e:
            print(f"Login failed: {e}")
        
        if not self.token:
            pytest.skip("Authentication failed - skipping tests")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    # ============================================================================
    # EVALUACIONES EXPORT TESTS
    # ============================================================================
    
    def test_evaluaciones_export_excel(self):
        """Test GET /api/evaluaciones/export/excel returns 200 with xlsx file"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/export/excel",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is Excel
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Verify content disposition has xlsx filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'evaluaciones' in content_disp.lower() and '.xlsx' in content_disp.lower(), \
            f"Expected xlsx filename in Content-Disposition, got: {content_disp}"
        
        # Verify response has content
        assert len(response.content) > 0, "Response content is empty"
        print(f"✓ Evaluaciones Excel export: {len(response.content)} bytes")
    
    def test_evaluaciones_export_pdf(self):
        """Test GET /api/evaluaciones/export/pdf returns 200 with pdf file"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/export/pdf",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition has pdf filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'evaluaciones' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected pdf filename in Content-Disposition, got: {content_disp}"
        
        # Verify response has content
        assert len(response.content) > 0, "Response content is empty"
        
        # Verify PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response does not start with PDF magic bytes"
        print(f"✓ Evaluaciones PDF export: {len(response.content)} bytes")
    
    # ============================================================================
    # TÉCNICOS APLICADORES EXPORT TESTS
    # ============================================================================
    
    def test_tecnicos_aplicadores_export_excel(self):
        """Test GET /api/tecnicos-aplicadores/export/excel returns 200 with xlsx file"""
        response = requests.get(
            f"{BASE_URL}/api/tecnicos-aplicadores/export/excel",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is Excel
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Verify content disposition has xlsx filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'tecnicos' in content_disp.lower() and '.xlsx' in content_disp.lower(), \
            f"Expected xlsx filename in Content-Disposition, got: {content_disp}"
        
        # Verify response has content
        assert len(response.content) > 0, "Response content is empty"
        print(f"✓ Técnicos Aplicadores Excel export: {len(response.content)} bytes")
    
    def test_tecnicos_aplicadores_export_pdf(self):
        """Test GET /api/tecnicos-aplicadores/export/pdf returns 200 with pdf file"""
        response = requests.get(
            f"{BASE_URL}/api/tecnicos-aplicadores/export/pdf",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition has pdf filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'tecnicos' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected pdf filename in Content-Disposition, got: {content_disp}"
        
        # Verify response has content
        assert len(response.content) > 0, "Response content is empty"
        
        # Verify PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response does not start with PDF magic bytes"
        print(f"✓ Técnicos Aplicadores PDF export: {len(response.content)} bytes")
    
    # ============================================================================
    # MAQUINARIA EXPORT TESTS
    # ============================================================================
    
    def test_maquinaria_export_excel(self):
        """Test GET /api/maquinaria/export/excel returns 200 with xlsx file"""
        response = requests.get(
            f"{BASE_URL}/api/maquinaria/export/excel",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is Excel
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Verify content disposition has xlsx filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'maquinaria' in content_disp.lower() and '.xlsx' in content_disp.lower(), \
            f"Expected xlsx filename in Content-Disposition, got: {content_disp}"
        
        # Verify response has content
        assert len(response.content) > 0, "Response content is empty"
        print(f"✓ Maquinaria Excel export: {len(response.content)} bytes")
    
    def test_maquinaria_export_pdf(self):
        """Test GET /api/maquinaria/export/pdf returns 200 with pdf file"""
        response = requests.get(
            f"{BASE_URL}/api/maquinaria/export/pdf",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition has pdf filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'maquinaria' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected pdf filename in Content-Disposition, got: {content_disp}"
        
        # Verify response has content
        assert len(response.content) > 0, "Response content is empty"
        
        # Verify PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response does not start with PDF magic bytes"
        print(f"✓ Maquinaria PDF export: {len(response.content)} bytes")


class TestExportEndpointsWithoutAuth:
    """Test that export endpoints require authentication"""
    
    def test_evaluaciones_export_requires_auth(self):
        """Test that evaluaciones export endpoints require authentication"""
        # Excel
        response = requests.get(f"{BASE_URL}/api/evaluaciones/export/excel", timeout=10)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # PDF
        response = requests.get(f"{BASE_URL}/api/evaluaciones/export/pdf", timeout=10)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Evaluaciones export endpoints require authentication")
    
    def test_tecnicos_export_requires_auth(self):
        """Test that tecnicos-aplicadores export endpoints require authentication"""
        # Excel
        response = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/export/excel", timeout=10)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # PDF
        response = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/export/pdf", timeout=10)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Técnicos Aplicadores export endpoints require authentication")
    
    def test_maquinaria_export_requires_auth(self):
        """Test that maquinaria export endpoints require authentication"""
        # Excel
        response = requests.get(f"{BASE_URL}/api/maquinaria/export/excel", timeout=10)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # PDF
        response = requests.get(f"{BASE_URL}/api/maquinaria/export/pdf", timeout=10)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Maquinaria export endpoints require authentication")
