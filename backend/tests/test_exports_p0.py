"""
Test suite for P0 Export Endpoints - Iteration 52
Tests new export endpoints for Visitas, Parcelas, Tratamientos, Irrigaciones
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for export tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestVisitasExport(TestAuth):
    """Test Visitas export endpoints - NEW"""
    
    def test_visitas_export_excel_returns_200(self, auth_headers):
        """GET /api/visitas/export/excel - Should return Excel file"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/excel", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        # Check content type is Excel
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        # Check content disposition has filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'visitas' in content_disp.lower() and '.xlsx' in content_disp.lower(), \
            f"Expected visitas.xlsx filename, got: {content_disp}"
        print("✓ Visitas Excel export working")
    
    def test_visitas_export_pdf_returns_200(self, auth_headers):
        """GET /api/visitas/export/pdf - Should return PDF file"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        # Check content type is PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        # Check content disposition has filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'visitas' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected visitas.pdf filename, got: {content_disp}"
        print("✓ Visitas PDF export working")
    
    def test_visitas_export_excel_with_campana_filter(self, auth_headers):
        """GET /api/visitas/export/excel?campana=2024/25 - Should accept filter"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/excel?campana=2024/25", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Visitas Excel export with campana filter working")
    
    def test_visitas_export_pdf_with_campana_filter(self, auth_headers):
        """GET /api/visitas/export/pdf?campana=2024/25 - Should accept filter"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/pdf?campana=2024/25", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Visitas PDF export with campana filter working")


class TestParcelasExport(TestAuth):
    """Test Parcelas export endpoints - NEW"""
    
    def test_parcelas_export_excel_returns_200(self, auth_headers):
        """GET /api/parcelas/export/excel - Should return Excel file"""
        response = requests.get(f"{BASE_URL}/api/parcelas/export/excel", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        # Check filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'parcelas' in content_disp.lower() and '.xlsx' in content_disp.lower(), \
            f"Expected parcelas.xlsx filename, got: {content_disp}"
        print("✓ Parcelas Excel export working")
    
    def test_parcelas_export_pdf_returns_200(self, auth_headers):
        """GET /api/parcelas/export/pdf - Should return PDF file"""
        response = requests.get(f"{BASE_URL}/api/parcelas/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        # Check filename
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'parcelas' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected parcelas.pdf filename, got: {content_disp}"
        print("✓ Parcelas PDF export working")
    
    def test_parcelas_export_excel_with_campana_filter(self, auth_headers):
        """GET /api/parcelas/export/excel?campana=2024/25 - Should accept filter"""
        response = requests.get(f"{BASE_URL}/api/parcelas/export/excel?campana=2024/25", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Parcelas Excel export with campana filter working")


class TestTratamientosExport(TestAuth):
    """Test Tratamientos export endpoints - PDF is NEW, Excel existed"""
    
    def test_tratamientos_export_excel_returns_200(self, auth_headers):
        """GET /api/tratamientos/export/excel - Regression: Should still work"""
        response = requests.get(f"{BASE_URL}/api/tratamientos/export/excel", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        print("✓ Tratamientos Excel export working (regression)")
    
    def test_tratamientos_export_pdf_returns_200(self, auth_headers):
        """GET /api/tratamientos/export/pdf - NEW: Should return PDF file"""
        response = requests.get(f"{BASE_URL}/api/tratamientos/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'tratamientos' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected tratamientos.pdf filename, got: {content_disp}"
        print("✓ Tratamientos PDF export working (NEW)")
    
    def test_tratamientos_export_pdf_with_campana_filter(self, auth_headers):
        """GET /api/tratamientos/export/pdf?campana=2024/25 - Should accept filter"""
        response = requests.get(f"{BASE_URL}/api/tratamientos/export/pdf?campana=2024/25", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Tratamientos PDF export with campana filter working")


class TestIrrigacionesExport(TestAuth):
    """Test Irrigaciones export endpoints - PDF is NEW, Excel existed"""
    
    def test_irrigaciones_export_excel_returns_200(self, auth_headers):
        """GET /api/irrigaciones/export/excel - Regression: Should still work"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/export/excel", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower() or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        print("✓ Irrigaciones Excel export working (regression)")
    
    def test_irrigaciones_export_pdf_returns_200(self, auth_headers):
        """GET /api/irrigaciones/export/pdf - NEW: Should return PDF file"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'irrigaciones' in content_disp.lower() and '.pdf' in content_disp.lower(), \
            f"Expected irrigaciones.pdf filename, got: {content_disp}"
        print("✓ Irrigaciones PDF export working (NEW)")


class TestRegressionExports(TestAuth):
    """Regression tests for existing export endpoints"""
    
    def test_cosechas_export_pdf_still_works(self, auth_headers):
        """GET /api/cosechas/export/pdf - Regression: Should still work"""
        response = requests.get(f"{BASE_URL}/api/cosechas/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        print("✓ Cosechas PDF export still working (regression)")
    
    def test_recetas_export_pdf_still_works(self, auth_headers):
        """GET /api/recetas/export/pdf - Regression: Should still work"""
        response = requests.get(f"{BASE_URL}/api/recetas/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        print("✓ Recetas PDF export still working (regression)")
    
    def test_tareas_export_pdf_still_works(self, auth_headers):
        """GET /api/tareas/export/pdf - Regression: Should still work"""
        response = requests.get(f"{BASE_URL}/api/tareas/export/pdf", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        content_type = response.headers.get('Content-Type', '')
        assert 'pdf' in content_type.lower(), f"Expected PDF content type, got: {content_type}"
        print("✓ Tareas PDF export still working (regression)")


class TestExportAuthRequired(TestAuth):
    """Test that export endpoints require authentication"""
    
    def test_visitas_export_requires_auth(self):
        """Export endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/excel")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Visitas export requires auth")
    
    def test_parcelas_export_requires_auth(self):
        """Export endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/parcelas/export/pdf")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Parcelas export requires auth")
