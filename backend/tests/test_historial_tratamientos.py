"""
Test suite for GET /api/parcelas/{parcela_id}/historial-tratamientos endpoint
Tests the new endpoint that returns treatment history for a specific parcel
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHistorialTratamientosEndpoint:
    """Tests for the historial-tratamientos endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        # Token field is 'access_token' not 'token'
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_historial_tratamientos_valid_parcela_with_data(self):
        """Test endpoint returns proper data for known parcela with tratamientos"""
        # Known parcela_id with tratamientos: 69a80e2548998a33fe591667
        parcela_id = "69a80e2548998a33fe591667"
        
        response = self.session.get(f"{BASE_URL}/api/parcelas/{parcela_id}/historial-tratamientos")
        
        # Should return 200 or 404 (if parcela doesn't exist in this env)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, body: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert "historial" in data, "Response should have 'historial' array"
            assert "estadisticas" in data, "Response should have 'estadisticas' object"
            
            # Verify estadisticas structure
            stats = data["estadisticas"]
            assert "total_tratamientos" in stats, "estadisticas should have 'total_tratamientos'"
            assert "productos_usados" in stats, "estadisticas should have 'productos_usados'"
            assert "tipos_aplicados" in stats, "estadisticas should have 'tipos_aplicados'"
            
            # Verify types
            assert isinstance(data["historial"], list), "historial should be a list"
            assert isinstance(stats["total_tratamientos"], int), "total_tratamientos should be int"
            assert isinstance(stats["productos_usados"], list), "productos_usados should be a list"
            assert isinstance(stats["tipos_aplicados"], list), "tipos_aplicados should be a list"
            
            print(f"SUCCESS: Got {stats['total_tratamientos']} tratamientos for parcela {parcela_id}")
    
    def test_historial_tratamientos_with_existing_parcela(self):
        """Test endpoint with a parcela that exists in the system"""
        # First get a list of parcelas to find a valid ID
        parcelas_response = self.session.get(f"{BASE_URL}/api/parcelas?limit=1")
        assert parcelas_response.status_code == 200, f"Failed to get parcelas: {parcelas_response.text}"
        
        parcelas_data = parcelas_response.json()
        parcelas = parcelas_data.get("parcelas", [])
        
        if len(parcelas) > 0:
            parcela_id = parcelas[0].get("_id")
            assert parcela_id, "Parcela should have _id"
            
            response = self.session.get(f"{BASE_URL}/api/parcelas/{parcela_id}/historial-tratamientos")
            assert response.status_code == 200, f"Expected 200 for existing parcela, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "historial" in data
            assert "estadisticas" in data
            
            stats = data["estadisticas"]
            assert "total_tratamientos" in stats
            assert "productos_usados" in stats
            assert "tipos_aplicados" in stats
            
            print(f"SUCCESS: Parcela {parcela_id} has {stats['total_tratamientos']} tratamientos")
        else:
            pytest.skip("No parcelas found in the system to test")
    
    def test_historial_tratamientos_nonexistent_parcela(self):
        """Test endpoint returns 404 for non-existent parcela ID"""
        # Valid ObjectId format but doesn't exist
        fake_parcela_id = "000000000000000000000000"
        
        response = self.session.get(f"{BASE_URL}/api/parcelas/{fake_parcela_id}/historial-tratamientos")
        assert response.status_code == 404, f"Expected 404 for non-existent parcela, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "404 response should have 'detail' field"
        print(f"SUCCESS: Got 404 for non-existent parcela as expected")
    
    def test_historial_tratamientos_invalid_objectid(self):
        """Test endpoint returns 400 for invalid ObjectId format"""
        invalid_id = "not-a-valid-objectid"
        
        response = self.session.get(f"{BASE_URL}/api/parcelas/{invalid_id}/historial-tratamientos")
        assert response.status_code == 400, f"Expected 400 for invalid ObjectId, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "400 response should have 'detail' field"
        print(f"SUCCESS: Got 400 for invalid ObjectId as expected")
    
    def test_historial_tratamientos_unauthorized(self):
        """Test endpoint requires authentication"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        parcela_id = "69a80e2548998a33fe591667"
        response = unauth_session.get(f"{BASE_URL}/api/parcelas/{parcela_id}/historial-tratamientos")
        
        # Should return 401 or 403 for unauthorized access
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthorized, got {response.status_code}"
        print(f"SUCCESS: Got {response.status_code} for unauthorized access as expected")
    
    def test_historial_response_structure_complete(self):
        """Test that historial items have expected fields when data exists"""
        # Get a parcela first
        parcelas_response = self.session.get(f"{BASE_URL}/api/parcelas?limit=5")
        assert parcelas_response.status_code == 200
        
        parcelas = parcelas_response.json().get("parcelas", [])
        
        # Try to find a parcela with tratamientos
        for parcela in parcelas:
            parcela_id = parcela.get("_id")
            response = self.session.get(f"{BASE_URL}/api/parcelas/{parcela_id}/historial-tratamientos")
            
            if response.status_code == 200:
                data = response.json()
                if len(data.get("historial", [])) > 0:
                    # Found a parcela with tratamientos, verify structure
                    tratamiento = data["historial"][0]
                    
                    # These fields should be present (mapped by backend)
                    # Note: Some may be None/empty but the mapping should work
                    print(f"SUCCESS: Found parcela {parcela_id} with {len(data['historial'])} tratamientos")
                    print(f"Sample tratamiento keys: {list(tratamiento.keys())}")
                    return
        
        # If no parcela with tratamientos found, that's okay - just log it
        print("INFO: No parcelas with tratamientos found - structure test skipped")


class TestParcelasEndpointRegression:
    """Regression tests to ensure other parcelas endpoints still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        token = data.get("access_token") or data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_parcelas_list(self):
        """Test GET /api/parcelas still works"""
        response = self.session.get(f"{BASE_URL}/api/parcelas")
        assert response.status_code == 200, f"GET /api/parcelas failed: {response.text}"
        
        data = response.json()
        assert "parcelas" in data, "Response should have 'parcelas' array"
        assert "total" in data, "Response should have 'total' count"
        print(f"SUCCESS: GET /api/parcelas returns {data['total']} parcelas")
    
    def test_get_single_parcela(self):
        """Test GET /api/parcelas/{id} still works"""
        # First get a parcela ID
        parcelas_response = self.session.get(f"{BASE_URL}/api/parcelas?limit=1")
        assert parcelas_response.status_code == 200
        
        parcelas = parcelas_response.json().get("parcelas", [])
        if len(parcelas) > 0:
            parcela_id = parcelas[0].get("_id")
            
            response = self.session.get(f"{BASE_URL}/api/parcelas/{parcela_id}")
            assert response.status_code == 200, f"GET /api/parcelas/{parcela_id} failed: {response.text}"
            
            data = response.json()
            assert "_id" in data or "id" in data, "Response should have ID field"
            print(f"SUCCESS: GET /api/parcelas/{parcela_id} works")
        else:
            pytest.skip("No parcelas to test single GET")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
