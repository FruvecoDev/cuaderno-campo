"""
Test Combined Export Panel - Centralized Export Functionality
Tests for:
- GET /api/exports/modules - Returns list of available modules with record counts
- POST /api/exports/combined - Combined export with multiple modules (Excel/PDF)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCombinedExportEndpoints:
    """Tests for the centralized export panel endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_export_modules(self):
        """Test GET /api/exports/modules returns list of available modules with record counts"""
        response = self.session.get(f"{BASE_URL}/api/exports/modules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "modules" in data, "Response should contain 'modules' key"
        modules = data["modules"]
        assert isinstance(modules, list), "modules should be a list"
        assert len(modules) > 0, "Should have at least one module"
        
        # Check module structure
        for module in modules:
            assert "key" in module, "Module should have 'key'"
            assert "label" in module, "Module should have 'label'"
            assert "count" in module, "Module should have 'count'"
            assert isinstance(module["count"], int), "count should be an integer"
        
        # Check expected modules exist
        module_keys = [m["key"] for m in modules]
        expected_modules = ["contratos", "parcelas", "fincas", "visitas", "tareas", 
                          "cosechas", "tratamientos", "irrigaciones", "recetas", 
                          "albaranes", "evaluaciones", "tecnicos_aplicadores", "maquinaria"]
        for expected in expected_modules:
            assert expected in module_keys, f"Expected module '{expected}' not found"
        
        print(f"✓ GET /api/exports/modules returned {len(modules)} modules")
    
    def test_combined_export_excel_two_modules(self):
        """Test POST /api/exports/combined with modules=['contratos','parcelas'] and format='excel'"""
        response = self.session.post(f"{BASE_URL}/api/exports/combined", json={
            "modules": ["contratos", "parcelas"],
            "format": "excel"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "excel" in content_type.lower(), \
            f"Expected Excel content type, got: {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert ".xlsx" in content_disp, "Filename should have .xlsx extension"
        
        # Check file content starts with xlsx magic bytes (PK)
        content = response.content
        assert len(content) > 0, "File should not be empty"
        assert content[:2] == b'PK', "Excel file should start with PK (zip format)"
        
        print(f"✓ POST /api/exports/combined (excel, 2 modules) returned {len(content)} bytes")
    
    def test_combined_export_pdf_two_modules(self):
        """Test POST /api/exports/combined with modules=['contratos','parcelas'] and format='pdf'"""
        response = self.session.post(f"{BASE_URL}/api/exports/combined", json={
            "modules": ["contratos", "parcelas"],
            "format": "pdf"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "pdf" in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
        
        # Check file content starts with PDF magic bytes
        content = response.content
        assert len(content) > 0, "File should not be empty"
        assert content[:4] == b'%PDF', "PDF file should start with %PDF"
        
        print(f"✓ POST /api/exports/combined (pdf, 2 modules) returned {len(content)} bytes")
    
    def test_combined_export_all_13_modules(self):
        """Test POST /api/exports/combined with all 13 modules returns 200"""
        all_modules = ["contratos", "parcelas", "fincas", "visitas", "tareas", 
                      "cosechas", "tratamientos", "irrigaciones", "recetas", 
                      "albaranes", "evaluaciones", "tecnicos_aplicadores", "maquinaria"]
        
        response = self.session.post(f"{BASE_URL}/api/exports/combined", json={
            "modules": all_modules,
            "format": "excel"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content
        content = response.content
        assert len(content) > 0, "File should not be empty"
        assert content[:2] == b'PK', "Excel file should start with PK"
        
        print(f"✓ POST /api/exports/combined (all 13 modules) returned {len(content)} bytes")
    
    def test_combined_export_empty_modules_returns_400(self):
        """Test POST /api/exports/combined with empty modules returns 400"""
        response = self.session.post(f"{BASE_URL}/api/exports/combined", json={
            "modules": [],
            "format": "excel"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✓ POST /api/exports/combined (empty modules) returned 400 as expected")
    
    def test_combined_export_invalid_modules_returns_400(self):
        """Test POST /api/exports/combined with invalid modules returns 400"""
        response = self.session.post(f"{BASE_URL}/api/exports/combined", json={
            "modules": ["invalid_module", "another_invalid"],
            "format": "excel"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✓ POST /api/exports/combined (invalid modules) returned 400 as expected")


class TestCombinedExportWithoutAuth:
    """Tests to verify authentication is required for export endpoints"""
    
    def test_get_modules_requires_auth(self):
        """Test GET /api/exports/modules requires authentication"""
        response = requests.get(f"{BASE_URL}/api/exports/modules")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ GET /api/exports/modules requires authentication")
    
    def test_combined_export_requires_auth(self):
        """Test POST /api/exports/combined requires authentication"""
        response = requests.post(f"{BASE_URL}/api/exports/combined", json={
            "modules": ["contratos"],
            "format": "excel"
        })
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ POST /api/exports/combined requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
