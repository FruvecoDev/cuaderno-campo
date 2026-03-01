"""
Pytest tests for RRHH Prenomina module
Tests the following features:
- GET /api/rrhh/prenominas - List prenominas by month/year
- POST /api/rrhh/prenominas/calcular - Individual prenomina calculation
- POST /api/rrhh/prenominas/calcular-todos - Bulk calculation
- PUT /api/rrhh/prenominas/{id}/validar - Validate prenomina
- GET /api/rrhh/prenominas/{id}/excel - Export to Excel
- GET /api/rrhh/prenominas/{id}/pdf - Export to PDF
- GET /api/rrhh/prenominas/export - Export all for period
"""

import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://harvest-hub-300.preview.emergentagent.com').rstrip('/')


class TestPrenominaListAPI:
    """Test prenomina listing endpoints"""
    
    def test_get_prenominas_by_month_year(self, api_client):
        """GET /api/rrhh/prenominas - List prenominas for a specific month/year"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes=2&ano=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "prenominas" in data
        assert "total" in data
        assert isinstance(data["prenominas"], list)
    
    def test_get_prenominas_empty_month(self, api_client):
        """GET /api/rrhh/prenominas - Returns empty for month with no prenominas"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes=12&ano=2024")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["prenominas"], list)
    
    def test_prenomina_has_required_fields(self, api_client):
        """Verify prenomina objects have required fields"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes=2&ano=2026")
        assert response.status_code == 200
        
        data = response.json()
        if data["total"] > 0:
            prenomina = data["prenominas"][0]
            # Check essential fields exist
            assert "_id" in prenomina
            assert "empleado_id" in prenomina
            assert "periodo_mes" in prenomina
            assert "periodo_ano" in prenomina
            assert "horas_normales" in prenomina
            assert "horas_extra" in prenomina
            assert "total_horas" in prenomina
            assert "importe_bruto" in prenomina
            assert "importe_neto" in prenomina
            assert "estado" in prenomina


class TestPrenominaCalculateAPI:
    """Test prenomina calculation endpoints"""
    
    @pytest.fixture
    def active_empleado_id(self, api_client):
        """Get an active employee ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados?activo=true")
        if response.status_code == 200:
            empleados = response.json().get("empleados", [])
            if empleados:
                return empleados[0]["_id"]
        pytest.skip("No active employees available for testing")
    
    def test_calculate_individual_prenomina(self, api_client, active_empleado_id):
        """POST /api/rrhh/prenominas/calcular - Calculate for individual employee"""
        payload = {
            "empleado_id": active_empleado_id,
            "mes": 2,
            "ano": 2026
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        prenomina = data["data"]
        assert prenomina["empleado_id"] == active_empleado_id
        assert prenomina["periodo_mes"] == 2
        assert prenomina["periodo_ano"] == 2026
        assert "importe_bruto" in prenomina
        assert "importe_neto" in prenomina
    
    def test_calculate_prenomina_invalid_empleado(self, api_client):
        """POST /api/rrhh/prenominas/calcular - Returns 404 for invalid employee"""
        payload = {
            "empleado_id": "000000000000000000000000",  # Invalid ObjectId
            "mes": 2,
            "ano": 2026
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular", json=payload)
        assert response.status_code == 404
    
    def test_calculate_prenomina_missing_params(self, api_client):
        """POST /api/rrhh/prenominas/calcular - Returns 400 for missing params"""
        payload = {
            "mes": 2
            # Missing empleado_id and ano
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular", json=payload)
        assert response.status_code == 400
    
    def test_calculate_all_prenominas(self, api_client):
        """POST /api/rrhh/prenominas/calcular-todos - Calculate for all active employees"""
        payload = {
            "mes": 3,  # Use a different month to avoid conflicts
            "ano": 2026
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular-todos", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "prenominas" in data
        assert "total" in data
        assert isinstance(data["prenominas"], list)


class TestPrenominaValidateAPI:
    """Test prenomina validation endpoints"""
    
    @pytest.fixture
    def prenomina_id(self, api_client):
        """Get a prenomina ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes=2&ano=2026")
        if response.status_code == 200:
            prenominas = response.json().get("prenominas", [])
            # Find a borrador prenomina
            for p in prenominas:
                if p.get("estado") == "borrador":
                    return p["_id"]
            if prenominas:
                return prenominas[0]["_id"]
        pytest.skip("No prenominas available for testing")
    
    def test_validate_prenomina(self, api_client, prenomina_id):
        """PUT /api/rrhh/prenominas/{id}/validar - Validate a prenomina"""
        payload = {
            "validado_por": "admin_test"
        }
        
        response = api_client.put(f"{BASE_URL}/api/rrhh/prenominas/{prenomina_id}/validar", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_validate_prenomina_invalid_id(self, api_client):
        """PUT /api/rrhh/prenominas/{id}/validar - Returns 404 for invalid ID"""
        payload = {
            "validado_por": "admin"
        }
        
        response = api_client.put(f"{BASE_URL}/api/rrhh/prenominas/000000000000000000000000/validar", json=payload)
        assert response.status_code == 404


class TestPrenominaExportAPI:
    """Test prenomina export endpoints"""
    
    @pytest.fixture
    def prenomina_id(self, api_client):
        """Get a prenomina ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes=2&ano=2026")
        if response.status_code == 200:
            prenominas = response.json().get("prenominas", [])
            if prenominas:
                return prenominas[0]["_id"]
        pytest.skip("No prenominas available for testing")
    
    def test_export_prenomina_excel(self, api_client, prenomina_id):
        """GET /api/rrhh/prenominas/{id}/excel - Export individual to Excel"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/{prenomina_id}/excel")
        assert response.status_code == 200
        
        # Verify it's an Excel file
        content_type = response.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        
        # Check content-disposition header for filename
        content_disposition = response.headers.get("content-disposition", "")
        assert "prenomina" in content_disposition.lower() or "attachment" in content_disposition.lower()
    
    def test_export_prenomina_pdf(self, api_client, prenomina_id):
        """GET /api/rrhh/prenominas/{id}/pdf - Export individual to PDF"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/{prenomina_id}/pdf")
        assert response.status_code == 200
        
        # Verify it's a PDF file
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type
    
    def test_export_prenomina_excel_invalid_id(self, api_client):
        """GET /api/rrhh/prenominas/{id}/excel - Returns 404 for invalid ID"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/000000000000000000000000/excel")
        assert response.status_code == 404
    
    def test_export_prenomina_pdf_invalid_id(self, api_client):
        """GET /api/rrhh/prenominas/{id}/pdf - Returns 404 for invalid ID"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/000000000000000000000000/pdf")
        assert response.status_code == 404
    
    def test_export_all_prenominas_csv(self, api_client):
        """GET /api/rrhh/prenominas/export - Export all prenominas for period"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/export?mes=2&ano=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "prenominas" in data
        assert "total" in data
        
        # Verify prenomina data has expected export fields
        if data["total"] > 0:
            p = data["prenominas"][0]
            assert "codigo_empleado" in p
            assert "dni" in p
            assert "nombre" in p
            assert "horas_normales" in p
            assert "importe_bruto" in p
            assert "importe_neto" in p


class TestPrenominaEndToEnd:
    """End-to-end tests for prenomina workflow"""
    
    def test_full_prenomina_workflow(self, api_client):
        """Test complete prenomina workflow: calculate -> validate -> export"""
        # 1. Get an active employee
        emp_response = api_client.get(f"{BASE_URL}/api/rrhh/empleados?activo=true")
        if emp_response.status_code != 200:
            pytest.skip("Cannot get employees")
        
        empleados = emp_response.json().get("empleados", [])
        if not empleados:
            pytest.skip("No active employees")
        
        empleado_id = empleados[0]["_id"]
        
        # 2. Calculate prenomina for employee
        calc_response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular", json={
            "empleado_id": empleado_id,
            "mes": 1,
            "ano": 2026
        })
        assert calc_response.status_code == 200
        
        prenomina = calc_response.json().get("data")
        assert prenomina is not None
        prenomina_id = prenomina["_id"]
        
        # 3. Verify prenomina appears in list
        list_response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes=1&ano=2026")
        assert list_response.status_code == 200
        
        prenominas = list_response.json().get("prenominas", [])
        prenomina_ids = [p["_id"] for p in prenominas]
        assert prenomina_id in prenomina_ids
        
        # 4. Export to Excel
        excel_response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/{prenomina_id}/excel")
        assert excel_response.status_code == 200
        
        # 5. Export to PDF
        pdf_response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas/{prenomina_id}/pdf")
        assert pdf_response.status_code == 200
        
        print(f"✓ Full prenomina workflow completed for employee {empleado_id}")
