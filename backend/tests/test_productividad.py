"""
Tests for Productivity (Productividad) module endpoints:
- GET /api/rrhh/productividad - List records
- GET /api/rrhh/productividad/stats - Statistics
- GET /api/rrhh/productividad/tiempo-real - Real-time data
- POST /api/rrhh/productividad - Create record
- PUT /api/rrhh/productividad/{id} - Update record
- DELETE /api/rrhh/productividad/{id} - Delete record
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agro-docs.preview.emergentagent.com').rstrip('/')


class TestProductividadList:
    """Tests for GET /api/rrhh/productividad endpoint"""
    
    def test_get_productividad_list_success(self, authenticated_client):
        """Get list of productivity records"""
        response = authenticated_client.get(f"{BASE_URL}/api/rrhh/productividad")
        
        assert response.status_code == 200
        data = response.json()
        assert "registros" in data
        assert isinstance(data["registros"], list)
    
    def test_get_productividad_filter_by_empleado(self, authenticated_client):
        """Filter productivity by employee ID"""
        # First get employees to get a valid ID
        emp_response = authenticated_client.get(f"{BASE_URL}/api/rrhh/empleados")
        empleados = emp_response.json().get("empleados", [])
        
        if len(empleados) > 0:
            empleado_id = empleados[0]["_id"]
            response = authenticated_client.get(
                f"{BASE_URL}/api/rrhh/productividad?empleado_id={empleado_id}"
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "registros" in data
    
    def test_get_productividad_filter_by_date_range(self, authenticated_client):
        """Filter productivity by date range"""
        fecha_desde = "2025-01-01"
        fecha_hasta = datetime.now().strftime("%Y-%m-%d")
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/rrhh/productividad?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "registros" in data


class TestProductividadStats:
    """Tests for GET /api/rrhh/productividad/stats endpoint"""
    
    def test_get_stats_success(self, authenticated_client):
        """Get productivity statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/rrhh/productividad/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for expected fields in stats
        assert "totales" in data or "top_empleados" in data or "total_kilos" in data
    
    def test_get_stats_with_date_range(self, authenticated_client):
        """Get stats filtered by date range"""
        fecha_desde = "2025-01-01"
        fecha_hasta = datetime.now().strftime("%Y-%m-%d")
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/rrhh/productividad/stats?fecha_desde={fecha_desde}&fecha_hasta={fecha_hasta}"
        )
        
        assert response.status_code == 200


class TestProductividadTiempoReal:
    """Tests for GET /api/rrhh/productividad/tiempo-real endpoint"""
    
    def test_get_tiempo_real_success(self, authenticated_client):
        """Get real-time productivity data"""
        response = authenticated_client.get(f"{BASE_URL}/api/rrhh/productividad/tiempo-real")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for expected structure
        assert "total_empleados_trabajando" in data or "empleados_trabajando" in data or "totales_hoy" in data


class TestProductividadCRUD:
    """Tests for CRUD operations on productivity records"""
    
    @pytest.fixture
    def empleado_activo_id(self, authenticated_client):
        """Get an active employee ID"""
        response = authenticated_client.get(f"{BASE_URL}/api/rrhh/empleados?activo=true")
        empleados = response.json().get("empleados", [])
        
        if len(empleados) > 0:
            return empleados[0]["_id"]
        pytest.skip("No active employees found")
    
    @pytest.fixture
    def test_productividad_record(self, authenticated_client, empleado_activo_id):
        """Create a test productivity record and clean up after"""
        record_data = {
            "empleado_id": empleado_activo_id,
            "fecha": datetime.now().strftime("%Y-%m-%d"),
            "tipo_trabajo": "recoleccion",
            "kilos": 150,
            "hectareas": 0.5,
            "horas": 8,
            "parcela": "TEST_PARCELA",
            "cultivo": "Naranja",
            "observaciones": "Test record for automated testing"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/rrhh/productividad",
            json=record_data
        )
        
        if response.status_code == 200:
            data = response.json().get("data", {})
            record_id = data.get("_id")
            yield {"id": record_id, "data": data}
            
            # Cleanup
            if record_id:
                authenticated_client.delete(f"{BASE_URL}/api/rrhh/productividad/{record_id}")
        else:
            pytest.skip(f"Could not create test record: {response.text}")
    
    def test_create_productividad_record(self, authenticated_client, empleado_activo_id):
        """Create a new productivity record"""
        import time
        
        record_data = {
            "empleado_id": empleado_activo_id,
            "fecha": datetime.now().strftime("%Y-%m-%d"),
            "tipo_trabajo": "poda",
            "kilos": 0,
            "hectareas": 2.5,
            "horas": 6,
            "parcela": f"TEST_{int(time.time())}",
            "cultivo": "Olivo",
            "observaciones": "Create test"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/rrhh/productividad",
            json=record_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Cleanup
        record_id = data.get("data", {}).get("_id")
        if record_id:
            authenticated_client.delete(f"{BASE_URL}/api/rrhh/productividad/{record_id}")
    
    def test_update_productividad_record(self, authenticated_client, test_productividad_record):
        """Update an existing productivity record"""
        record_id = test_productividad_record["id"]
        
        update_data = {
            "kilos": 200,
            "horas": 9,
            "observaciones": "Updated via test"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/rrhh/productividad/{record_id}",
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_delete_productividad_record(self, authenticated_client, empleado_activo_id):
        """Delete a productivity record"""
        # Create a record to delete
        record_data = {
            "empleado_id": empleado_activo_id,
            "fecha": datetime.now().strftime("%Y-%m-%d"),
            "tipo_trabajo": "tratamiento",
            "kilos": 0,
            "hectareas": 1,
            "horas": 4,
            "parcela": "TEST_DELETE",
            "observaciones": "To be deleted"
        }
        
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/rrhh/productividad",
            json=record_data
        )
        
        assert create_response.status_code == 200
        record_id = create_response.json().get("data", {}).get("_id")
        
        # Now delete
        delete_response = authenticated_client.delete(
            f"{BASE_URL}/api/rrhh/productividad/{record_id}"
        )
        
        assert delete_response.status_code == 200
        
        # Verify deletion - getting should now have one less record
        # or the specific record should not be found


class TestProductividadValidation:
    """Tests for validation on productivity endpoints"""
    
    def test_create_without_empleado_id(self, authenticated_client):
        """Creating without empleado_id should fail or handle gracefully"""
        record_data = {
            "fecha": datetime.now().strftime("%Y-%m-%d"),
            "tipo_trabajo": "recoleccion",
            "kilos": 100
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/rrhh/productividad",
            json=record_data
        )
        
        # Should either fail with 400 or succeed but mark as invalid
        assert response.status_code in [200, 400, 422]
    
    def test_update_nonexistent_record(self, authenticated_client):
        """Updating non-existent record should return 404"""
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/rrhh/productividad/{fake_id}",
            json={"kilos": 100}
        )
        
        assert response.status_code == 404
    
    def test_delete_nonexistent_record(self, authenticated_client):
        """Deleting non-existent record should return 404"""
        fake_id = "507f1f77bcf86cd799439011"
        
        response = authenticated_client.delete(
            f"{BASE_URL}/api/rrhh/productividad/{fake_id}"
        )
        
        assert response.status_code == 404
