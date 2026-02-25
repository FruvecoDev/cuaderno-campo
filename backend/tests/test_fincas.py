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


class TestGeometriaManual:
    """Test geometria_manual field for manually drawn polygons"""
    
    def test_create_finca_with_geometria_manual(self, api_session, test_finca_data):
        """Test POST /api/fincas with geometria_manual data"""
        # Add geometria_manual to test data
        test_data = test_finca_data.copy()
        test_data["geometria_manual"] = {
            "wkt": "POLYGON((-5.8 37.0, -5.7 37.0, -5.7 37.1, -5.8 37.1, -5.8 37.0))",
            "coords": [[37.0, -5.8], [37.0, -5.7], [37.1, -5.7], [37.1, -5.8], [37.0, -5.8]],
            "centroide": {"lat": 37.05, "lon": -5.75},
            "area_ha": 12.5
        }
        
        response = api_session.post(f"{BASE_URL}/api/fincas", json=test_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Response should indicate success"
        
        finca = data["data"]
        assert "geometria_manual" in finca, "Response should contain geometria_manual"
        
        geom = finca.get("geometria_manual", {})
        assert geom.get("wkt") is not None, "geometria_manual should have wkt"
        assert geom.get("coords") is not None, "geometria_manual should have coords"
        assert geom.get("centroide") is not None, "geometria_manual should have centroide"
        assert geom.get("area_ha") == 12.5, "geometria_manual should have correct area_ha"
        
        # Cleanup
        finca_id = finca.get("_id")
        if finca_id:
            api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")
    
    def test_get_finca_with_geometria_manual(self, api_session, test_finca_data):
        """Test GET /api/fincas/{id} returns geometria_manual correctly"""
        # Create finca with geometria_manual
        test_data = test_finca_data.copy()
        test_data["denominacion"] = f"Geom Test {datetime.now().strftime('%Y%m%d%H%M%S')}"
        test_data["geometria_manual"] = {
            "wkt": "POLYGON((-5.9 37.2, -5.8 37.2, -5.8 37.3, -5.9 37.3, -5.9 37.2))",
            "coords": [[37.2, -5.9], [37.2, -5.8], [37.3, -5.8], [37.3, -5.9], [37.2, -5.9]],
            "centroide": {"lat": 37.25, "lon": -5.85},
            "area_ha": 8.75
        }
        
        create_response = api_session.post(f"{BASE_URL}/api/fincas", json=test_data)
        assert create_response.status_code == 200
        
        finca_id = create_response.json().get("data", {}).get("_id")
        
        # GET the finca and verify geometria_manual is returned
        get_response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert get_response.status_code == 200
        
        finca = get_response.json()
        geom = finca.get("geometria_manual", {})
        
        assert geom.get("wkt") is not None, "GET should return geometria_manual with wkt"
        assert geom.get("area_ha") == 8.75, "GET should return correct area_ha"
        assert len(geom.get("coords", [])) == 5, "GET should return correct coords count"
        
        # Cleanup
        api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")
    
    def test_update_finca_geometria_manual(self, api_session, created_finca):
        """Test PUT /api/fincas/{id} to add/update geometria_manual"""
        finca_id = created_finca["_id"]
        
        # Update with geometria_manual
        update_data = {
            "geometria_manual": {
                "wkt": "POLYGON((-6.0 38.0, -5.9 38.0, -5.9 38.1, -6.0 38.1, -6.0 38.0))",
                "coords": [[38.0, -6.0], [38.0, -5.9], [38.1, -5.9], [38.1, -6.0], [38.0, -6.0]],
                "centroide": {"lat": 38.05, "lon": -5.95},
                "area_ha": 15.25
            }
        }
        
        response = api_session.put(f"{BASE_URL}/api/fincas/{finca_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify with GET
        get_response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert get_response.status_code == 200
        
        finca = get_response.json()
        geom = finca.get("geometria_manual", {})
        
        assert geom.get("area_ha") == 15.25, "Updated geometria_manual should have new area_ha"
        assert geom.get("centroide", {}).get("lat") == 38.05, "Updated geometria_manual should have new centroide"
    
    def test_update_finca_clear_geometria_manual(self, api_session, test_finca_data):
        """Test clearing geometria_manual by setting to None"""
        # Create finca with geometria_manual
        test_data = test_finca_data.copy()
        test_data["denominacion"] = f"Clear Geom Test {datetime.now().strftime('%Y%m%d%H%M%S')}"
        test_data["geometria_manual"] = {
            "wkt": "POLYGON((-5.5 36.5, -5.4 36.5, -5.4 36.6, -5.5 36.6, -5.5 36.5))",
            "coords": [[36.5, -5.5], [36.5, -5.4], [36.6, -5.4], [36.6, -5.5], [36.5, -5.5]],
            "centroide": {"lat": 36.55, "lon": -5.45},
            "area_ha": 5.0
        }
        
        create_response = api_session.post(f"{BASE_URL}/api/fincas", json=test_data)
        assert create_response.status_code == 200
        
        finca_id = create_response.json().get("data", {}).get("_id")
        
        # Clear geometria_manual
        update_response = api_session.put(f"{BASE_URL}/api/fincas/{finca_id}", json={
            "geometria_manual": None
        })
        assert update_response.status_code == 200
        
        # Verify it's cleared
        get_response = api_session.get(f"{BASE_URL}/api/fincas/{finca_id}")
        assert get_response.status_code == 200
        
        finca = get_response.json()
        # geometria_manual should be None or not present
        assert finca.get("geometria_manual") is None or finca.get("geometria_manual") == {}
        
        # Cleanup
        api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")
    
    def test_fincas_list_includes_geometria_manual(self, api_session, test_finca_data):
        """Test GET /api/fincas returns geometria_manual in list"""
        # Create finca with geometria_manual
        test_data = test_finca_data.copy()
        test_data["denominacion"] = f"List Geom Test {datetime.now().strftime('%Y%m%d%H%M%S')}"
        test_data["geometria_manual"] = {
            "wkt": "POLYGON((-5.6 37.5, -5.5 37.5, -5.5 37.6, -5.6 37.6, -5.6 37.5))",
            "coords": [[37.5, -5.6], [37.5, -5.5], [37.6, -5.5], [37.6, -5.6], [37.5, -5.6]],
            "centroide": {"lat": 37.55, "lon": -5.55},
            "area_ha": 10.0
        }
        
        create_response = api_session.post(f"{BASE_URL}/api/fincas", json=test_data)
        assert create_response.status_code == 200
        
        finca_id = create_response.json().get("data", {}).get("_id")
        
        # Get fincas list and find our finca
        list_response = api_session.get(f"{BASE_URL}/api/fincas")
        assert list_response.status_code == 200
        
        fincas = list_response.json().get("fincas", [])
        our_finca = next((f for f in fincas if f.get("_id") == finca_id), None)
        
        assert our_finca is not None, "Our finca should be in the list"
        assert "geometria_manual" in our_finca, "Finca in list should have geometria_manual"
        assert our_finca.get("geometria_manual", {}).get("area_ha") == 10.0
        
        # Cleanup
        api_session.delete(f"{BASE_URL}/api/fincas/{finca_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
