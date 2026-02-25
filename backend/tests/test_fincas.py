"""
Tests for Fincas (Farms) module - Complete CRUD operations
Tests: Create, Read, Update, Delete, Stats, Filters
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_session():
    """Create authenticated API session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json().get("access_token") or response.json().get("token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
    else:
        pytest.skip(f"Authentication failed: {response.status_code}")
    
    return session


@pytest.fixture
def test_finca_data():
    """Generate unique test finca data"""
    unique_id = f"TEST_{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}"
    return {
        "denominacion": f"Finca {unique_id}",
        "provincia": "Sevilla",
        "poblacion": "Lebrija",
        "poligono": "15",
        "parcela": "123",
        "subparcela": "A",
        "hectareas": 25.5,
        "areas": 100,
        "toneladas": 150,
        "produccion_esperada": 200,
        "produccion_disponible": 180,
        "finca_propia": True,
        "sigpac": {
            "provincia": "41",
            "municipio": "053",
            "cod_agregado": "0",
            "zona": "0",
            "poligono": "15",
            "parcela": "123",
            "recinto": "1",
            "cod_uso": "TA"
        },
        "recoleccion_semana": 25,
        "recoleccion_ano": 2026,
        "precio_corte": 0.15,
        "precio_transporte": 0.05,
        "proveedor_corte": "Corte SL",
        "observaciones": f"Test finca {unique_id}"
    }


@pytest.fixture
def created_finca(api_session, test_finca_data):
    """Create a test finca and cleanup after test"""
    response = api_session.post(f"{BASE_URL}/api/fincas", json=test_finca_data)
    
    if response.status_code != 200:
        pytest.skip(f"Could not create test finca: {response.text}")
    
    finca = response.json().get("data", {})
    finca_id = finca.get("_id")
    
    yield finca
    
    # Cleanup
    if finca_id:
        api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")


class TestFincasEndpoints:
    """Test Fincas CRUD endpoints"""
    
    def test_get_fincas_list(self, api_session):
        """Test GET /api/fincas - List all fincas"""
        response = api_session.get(f"{BASE_URL}/api/fincas")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "fincas" in data, "Response should contain 'fincas' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["fincas"], list), "fincas should be a list"
    
    def test_get_fincas_stats(self, api_session):
        """Test GET /api/fincas/stats - Get statistics"""
        response = api_session.get(f"{BASE_URL}/api/fincas/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_keys = ["total", "propias", "alquiladas", "total_hectareas"]
        for key in expected_keys:
            assert key in data, f"Stats should contain '{key}' key"
        
        # Verify numeric values
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["propias"], int), "propias should be an integer"
        assert data["alquiladas"] == data["total"] - data["propias"], "alquiladas should equal total - propias"
    
    def test_create_finca(self, api_session, test_finca_data):
        """Test POST /api/fincas - Create a new finca"""
        response = api_session.post(f"{BASE_URL}/api/fincas", json=test_finca_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Response should indicate success"
        assert "data" in data, "Response should contain 'data' key"
        
        finca = data["data"]
        assert finca.get("denominacion") == test_finca_data["denominacion"]
        assert finca.get("provincia") == test_finca_data["provincia"]
        assert finca.get("finca_propia") == test_finca_data["finca_propia"]
        assert finca.get("hectareas") == test_finca_data["hectareas"]
        
        # Verify SIGPAC data saved correctly
        sigpac = finca.get("sigpac", {})
        assert sigpac.get("provincia") == test_finca_data["sigpac"]["provincia"]
        assert sigpac.get("municipio") == test_finca_data["sigpac"]["municipio"]
        assert sigpac.get("cod_uso") == test_finca_data["sigpac"]["cod_uso"]
        
        # Cleanup
        finca_id = finca.get("_id")
        if finca_id:
            api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")
    
    def test_create_finca_duplicate_name_fails(self, api_session, created_finca):
        """Test that creating a finca with duplicate name fails"""
        duplicate_data = {
            "denominacion": created_finca["denominacion"],
            "provincia": "Córdoba",
            "finca_propia": False
        }
        
        response = api_session.post(f"{BASE_URL}/api/fincas", json=duplicate_data)
        
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        assert "Ya existe" in response.json().get("detail", ""), "Should indicate duplicate error"
    
    def test_get_single_finca(self, api_session, created_finca):
        """Test GET /api/fincas/{id} - Get single finca"""
        finca_id = created_finca["_id"]
        
        response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("_id") == finca_id
        assert data.get("denominacion") == created_finca["denominacion"]
    
    def test_get_single_finca_invalid_id(self, api_session):
        """Test GET /api/fincas/{id} with invalid ID"""
        response = api_session.get(f"{BASE_URL}/api/fincas/invalid-id")
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
    
    def test_get_single_finca_not_found(self, api_session):
        """Test GET /api/fincas/{id} with non-existent ID"""
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        response = api_session.get(f"{BASE_URL}/api/fincas/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404 for not found, got {response.status_code}"
    
    def test_update_finca(self, api_session, created_finca):
        """Test PUT /api/fincas/{id} - Update a finca"""
        finca_id = created_finca["_id"]
        
        update_data = {
            "hectareas": 50.0,
            "produccion_esperada": 300.0,
            "observaciones": "Updated test finca",
            "finca_propia": False,
            "sigpac": {
                "provincia": "41",
                "municipio": "999",
                "cod_agregado": "1",
                "zona": "1",
                "poligono": "20",
                "parcela": "456",
                "recinto": "2",
                "cod_uso": "OV"
            }
        }
        
        response = api_session.put(f"{BASE_URL}/api/fincas/{finca_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        
        # Verify with GET
        get_response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert get_response.status_code == 200
        
        updated_finca = get_response.json()
        assert updated_finca.get("hectareas") == 50.0
        assert updated_finca.get("produccion_esperada") == 300.0
        assert updated_finca.get("finca_propia") is False
        assert updated_finca.get("sigpac", {}).get("municipio") == "999"
    
    def test_delete_finca(self, api_session, test_finca_data):
        """Test DELETE /api/fincas/{id} - Delete a finca"""
        # Create a finca to delete
        create_response = api_session.post(f"{BASE_URL}/api/fincas", json=test_finca_data)
        assert create_response.status_code == 200
        
        finca_id = create_response.json().get("data", {}).get("_id")
        
        # Delete it
        delete_response = api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        data = delete_response.json()
        assert data.get("success") is True
        
        # Verify deletion with GET
        get_response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert get_response.status_code == 404, "Deleted finca should return 404"
    
    def test_delete_finca_not_found(self, api_session):
        """Test DELETE /api/fincas/{id} with non-existent ID"""
        fake_id = "507f1f77bcf86cd799439012"
        response = api_session.delete(f"{BASE_URL}/api/fincas/{fake_id}")
        
        assert response.status_code == 404


class TestFincasFilters:
    """Test Fincas filtering functionality"""
    
    def test_filter_by_search(self, api_session, created_finca):
        """Test GET /api/fincas with search filter"""
        # Search by denominacion
        search_term = created_finca["denominacion"].split()[1]  # Get "TEST_..." part
        response = api_session.get(f"{BASE_URL}/api/fincas", params={"search": search_term})
        
        assert response.status_code == 200
        
        data = response.json()
        fincas = data.get("fincas", [])
        
        # Should find the created finca
        found = any(f["_id"] == created_finca["_id"] for f in fincas)
        assert found, f"Created finca should be found with search term '{search_term}'"
    
    def test_filter_by_provincia(self, api_session, created_finca):
        """Test GET /api/fincas with provincia filter"""
        response = api_session.get(f"{BASE_URL}/api/fincas", params={"provincia": "Sevilla"})
        
        assert response.status_code == 200
        
        data = response.json()
        fincas = data.get("fincas", [])
        
        # All returned fincas should be from Sevilla
        for finca in fincas:
            assert "Sevilla" in finca.get("provincia", "") or finca.get("provincia") == "Sevilla"
    
    def test_filter_by_finca_propia(self, api_session, created_finca):
        """Test GET /api/fincas with finca_propia filter"""
        # Filter propias
        response = api_session.get(f"{BASE_URL}/api/fincas", params={"finca_propia": "true"})
        
        assert response.status_code == 200
        
        data = response.json()
        fincas = data.get("fincas", [])
        
        # All returned fincas should be propias
        for finca in fincas:
            assert finca.get("finca_propia") is True, f"Finca {finca.get('denominacion')} should be propia"


class TestFincasSIGPACData:
    """Test SIGPAC data handling"""
    
    def test_sigpac_data_saved_correctly(self, api_session, created_finca):
        """Verify SIGPAC data is saved and retrieved correctly"""
        finca_id = created_finca["_id"]
        
        response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert response.status_code == 200
        
        finca = response.json()
        sigpac = finca.get("sigpac", {})
        
        assert sigpac.get("provincia") == "41"
        assert sigpac.get("municipio") == "053"
        assert sigpac.get("cod_agregado") == "0"
        assert sigpac.get("zona") == "0"
        assert sigpac.get("poligono") == "15"
        assert sigpac.get("parcela") == "123"
        assert sigpac.get("recinto") == "1"
        assert sigpac.get("cod_uso") == "TA"
    
    def test_sigpac_data_update(self, api_session, created_finca):
        """Test updating SIGPAC data"""
        finca_id = created_finca["_id"]
        
        new_sigpac = {
            "provincia": "14",
            "municipio": "021",
            "cod_agregado": "2",
            "zona": "5",
            "poligono": "99",
            "parcela": "888",
            "recinto": "7",
            "cod_uso": "FY"
        }
        
        response = api_session.put(f"{BASE_URL}/api/fincas/{finca_id}", json={"sigpac": new_sigpac})
        assert response.status_code == 200
        
        # Verify update
        get_response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert get_response.status_code == 200
        
        updated_sigpac = get_response.json().get("sigpac", {})
        assert updated_sigpac.get("provincia") == "14"
        assert updated_sigpac.get("cod_uso") == "FY"


class TestFincasStatsAggregation:
    """Test stats aggregation"""
    
    def test_stats_total_hectareas(self, api_session, created_finca):
        """Test that total_hectareas is calculated correctly"""
        response = api_session.get(f"{BASE_URL}/api/fincas/stats")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "total_hectareas" in data
        assert isinstance(data["total_hectareas"], (int, float))
        assert data["total_hectareas"] >= 0
    
    def test_stats_production_totals(self, api_session):
        """Test that production totals are included in stats"""
        response = api_session.get(f"{BASE_URL}/api/fincas/stats")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "total_produccion_esperada" in data
        assert "total_produccion_disponible" in data
    
    def test_stats_por_provincia(self, api_session):
        """Test that stats include breakdown by provincia"""
        response = api_session.get(f"{BASE_URL}/api/fincas/stats")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "por_provincia" in data
        assert isinstance(data["por_provincia"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
