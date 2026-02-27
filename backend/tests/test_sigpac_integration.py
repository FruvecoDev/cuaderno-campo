"""
Tests for SIGPAC Integration - External API integration
Tests: Provincias, Usos, Consulta endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agri-tracker-25.preview.emergentagent.com').rstrip('/')

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


class TestSIGPACProvincias:
    """Test /api/sigpac/provincias endpoint"""
    
    def test_get_provincias_list(self, api_session):
        """Test GET /api/sigpac/provincias - Should return list of Spanish provinces"""
        response = api_session.get(f"{BASE_URL}/api/sigpac/provincias")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Response should indicate success"
        assert "provincias" in data, "Response should contain 'provincias' key"
        assert isinstance(data["provincias"], list), "provincias should be a list"
        assert len(data["provincias"]) >= 50, "Should have at least 50 provinces (Spain has 52)"
        
        # Verify province structure
        first_provincia = data["provincias"][0]
        assert "codigo" in first_provincia, "Province should have 'codigo'"
        assert "nombre" in first_provincia, "Province should have 'nombre'"
    
    def test_provincias_contains_known_provinces(self, api_session):
        """Test that known provinces are in the list"""
        response = api_session.get(f"{BASE_URL}/api/sigpac/provincias")
        assert response.status_code == 200
        
        data = response.json()
        provincias = {p["codigo"]: p["nombre"] for p in data["provincias"]}
        
        # Check for known provinces
        assert "41" in provincias, "Should have Sevilla (41)"
        assert "28" in provincias, "Should have Madrid (28)"
        assert "08" in provincias, "Should have Barcelona (08)"
        assert "14" in provincias, "Should have Córdoba (14)"


class TestSIGPACUsos:
    """Test /api/sigpac/usos endpoint"""
    
    def test_get_usos_list(self, api_session):
        """Test GET /api/sigpac/usos - Should return dictionary of SIGPAC land uses"""
        response = api_session.get(f"{BASE_URL}/api/sigpac/usos")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Response should indicate success"
        assert "usos" in data, "Response should contain 'usos' key"
        assert isinstance(data["usos"], list), "usos should be a list"
        assert len(data["usos"]) >= 10, "Should have at least 10 land use types"
        
        # Verify uso structure
        first_uso = data["usos"][0]
        assert "codigo" in first_uso, "Uso should have 'codigo'"
        assert "descripcion" in first_uso, "Uso should have 'descripcion'"
    
    def test_usos_contains_common_types(self, api_session):
        """Test that common land use types are in the list"""
        response = api_session.get(f"{BASE_URL}/api/sigpac/usos")
        assert response.status_code == 200
        
        data = response.json()
        usos = {u["codigo"]: u["descripcion"] for u in data["usos"]}
        
        # Check for common land use codes
        assert "TA" in usos, "Should have TA (Tierra arable)"
        assert "OV" in usos, "Should have OV (Olivar)"
        assert "VI" in usos, "Should have VI (Viñedo)"
        assert "FO" in usos, "Should have FO (Forestal)"
        assert "PA" in usos, "Should have PA (Pasto con arbolado)"


class TestSIGPACConsulta:
    """Test /api/sigpac/consulta endpoint - Integration with HubCloud API"""
    
    def test_consulta_missing_params_fails(self, api_session):
        """Test that missing required parameters fail with 422"""
        # Missing provincia
        response = api_session.get(f"{BASE_URL}/api/sigpac/consulta", params={
            "municipio": "053",
            "poligono": "5",
            "parcela": "12"
        })
        assert response.status_code == 422, "Should fail with 422 for missing provincia"
    
    def test_consulta_valid_parcela(self, api_session):
        """Test SIGPAC query with valid parcel data (Sevilla test case)"""
        # Test with Sevilla data provided by main agent
        params = {
            "provincia": "41",
            "municipio": "053",
            "poligono": "5",
            "parcela": "12",
            "agregado": "0",
            "zona": "0"
        }
        
        response = api_session.get(f"{BASE_URL}/api/sigpac/consulta", params=params)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # SIGPAC external service may or may not be available
        if data.get("success"):
            # Verify response structure when successful
            assert "sigpac" in data, "Response should contain 'sigpac' data"
            assert "superficie_ha" in data, "Response should contain 'superficie_ha'"
            assert "uso_sigpac" in data, "Response should contain 'uso_sigpac'"
            
            # Verify sigpac data structure
            sigpac = data["sigpac"]
            assert "provincia" in sigpac
            assert "municipio" in sigpac
            assert "poligono" in sigpac
            assert "parcela" in sigpac
            
            # Verify superficie is a number
            assert isinstance(data["superficie_ha"], (int, float))
        else:
            # External API may be unavailable - log but don't fail
            assert "error" in data or "message" in data, "Failed response should have error info"
            print(f"SIGPAC external API not available: {data.get('message', data.get('error'))}")
    
    def test_consulta_nonexistent_parcela(self, api_session):
        """Test SIGPAC query with non-existent parcel"""
        params = {
            "provincia": "99",  # Invalid province
            "municipio": "999",
            "poligono": "999",
            "parcela": "9999",
            "agregado": "0",
            "zona": "0"
        }
        
        response = api_session.get(f"{BASE_URL}/api/sigpac/consulta", params=params)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return success: false with error message
        assert data.get("success") is False or "error" in data or "message" in data
    
    def test_consulta_with_recinto(self, api_session):
        """Test SIGPAC query with recinto parameter"""
        params = {
            "provincia": "41",
            "municipio": "053",
            "poligono": "5",
            "parcela": "12",
            "agregado": "0",
            "zona": "0",
            "recinto": "1"
        }
        
        response = api_session.get(f"{BASE_URL}/api/sigpac/consulta", params=params)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should either succeed or fail gracefully
        if data.get("success"):
            assert "sigpac" in data
            assert data["sigpac"].get("recinto") is not None
        else:
            assert "error" in data or "message" in data


class TestSIGPACIntegrationFlow:
    """Test the complete SIGPAC integration flow"""
    
    def test_full_flow_provincias_to_consulta(self, api_session):
        """Test the flow: get provincias -> select one -> query parcel"""
        # 1. Get list of provincias
        prov_response = api_session.get(f"{BASE_URL}/api/sigpac/provincias")
        assert prov_response.status_code == 200
        
        provincias = prov_response.json().get("provincias", [])
        assert len(provincias) > 0
        
        # 2. Find Sevilla (41) in the list
        sevilla = next((p for p in provincias if p["codigo"] == "41"), None)
        assert sevilla is not None, "Sevilla (41) should be in provincias list"
        assert sevilla["nombre"] == "Sevilla", f"Got: {sevilla['nombre']}"
        
        # 3. Get usos
        usos_response = api_session.get(f"{BASE_URL}/api/sigpac/usos")
        assert usos_response.status_code == 200
        
        usos = usos_response.json().get("usos", [])
        assert len(usos) > 0
        
        # 4. Query a parcel
        consulta_response = api_session.get(f"{BASE_URL}/api/sigpac/consulta", params={
            "provincia": "41",
            "municipio": "053",
            "poligono": "5",
            "parcela": "12"
        })
        assert consulta_response.status_code == 200
        
        # The external API may or may not be available
        consulta_data = consulta_response.json()
        if consulta_data.get("success"):
            uso_codigo = consulta_data.get("uso_sigpac")
            if uso_codigo:
                # Verify uso code is in our dictionary
                uso_names = {u["codigo"]: u["descripcion"] for u in usos}
                # TA should be in our dictionary
                if uso_codigo == "TA":
                    assert uso_codigo in uso_names


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
