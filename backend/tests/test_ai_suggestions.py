"""
Test AI Suggestions Routes - Treatment suggestions and yield predictions
Tests for /api/ai/parcelas-for-suggestions, /api/ai/contratos-for-predictions,
/api/ai/suggest-treatments/{parcela_id}, /api/ai/predict-yield/{contrato_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAISuggestionsEndpoints:
    """AI Suggestions endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - get authentication token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token_obtained = True
        else:
            self.token_obtained = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_parcelas_for_suggestions(self):
        """Test GET /api/ai/parcelas-for-suggestions returns list of parcelas"""
        response = self.session.get(f"{BASE_URL}/api/ai/parcelas-for-suggestions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parcelas" in data, "Response should contain 'parcelas' key"
        assert isinstance(data["parcelas"], list), "parcelas should be a list"
        
        # Check structure if parcelas exist
        if len(data["parcelas"]) > 0:
            parcela = data["parcelas"][0]
            assert "_id" in parcela, "Parcela should have _id"
            assert "codigo_plantacion" in parcela, "Parcela should have codigo_plantacion"
            assert "cultivo" in parcela, "Parcela should have cultivo"
        
        print(f"Found {len(data['parcelas'])} parcelas for suggestions")
    
    def test_get_contratos_for_predictions(self):
        """Test GET /api/ai/contratos-for-predictions returns list of contratos"""
        response = self.session.get(f"{BASE_URL}/api/ai/contratos-for-predictions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contratos" in data, "Response should contain 'contratos' key"
        assert isinstance(data["contratos"], list), "contratos should be a list"
        
        # Check structure if contratos exist
        if len(data["contratos"]) > 0:
            contrato = data["contratos"][0]
            assert "_id" in contrato, "Contrato should have _id"
            assert "proveedor" in contrato, "Contrato should have proveedor"
            assert "cultivo" in contrato, "Contrato should have cultivo"
            assert "campana" in contrato, "Contrato should have campana"
        
        print(f"Found {len(data['contratos'])} contratos for predictions")
    
    def test_suggest_treatments_with_valid_parcela(self):
        """Test POST /api/ai/suggest-treatments/{parcela_id} with valid data"""
        # First get a valid parcela ID
        parcelas_response = self.session.get(f"{BASE_URL}/api/ai/parcelas-for-suggestions")
        assert parcelas_response.status_code == 200
        
        parcelas = parcelas_response.json().get("parcelas", [])
        if len(parcelas) == 0:
            pytest.skip("No parcelas available for testing")
        
        parcela_id = parcelas[0]["_id"]
        cultivo = parcelas[0].get("cultivo", "Test Cultivo")
        
        # Test suggest treatments
        response = self.session.post(
            f"{BASE_URL}/api/ai/suggest-treatments/{parcela_id}",
            params={"problema": "hojas amarillas", "cultivo": cultivo}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "suggestions" in data, "Response should contain 'suggestions'"
        assert "metadata" in data, "Response should contain 'metadata'"
        
        # Check suggestions structure
        suggestions = data["suggestions"]
        assert "problema_identificado" in suggestions, "Should have problema_identificado"
        assert "severidad_estimada" in suggestions, "Should have severidad_estimada"
        assert "sugerencias" in suggestions, "Should have sugerencias list"
        
        # Check metadata
        metadata = data["metadata"]
        assert metadata.get("parcela_id") == parcela_id, "Metadata should contain correct parcela_id"
        assert "generation_time_seconds" in metadata, "Should have generation time"
        
        print(f"Successfully generated treatment suggestions in {metadata['generation_time_seconds']}s")
    
    def test_suggest_treatments_with_invalid_parcela_id(self):
        """Test POST /api/ai/suggest-treatments with invalid parcela ID"""
        response = self.session.post(
            f"{BASE_URL}/api/ai/suggest-treatments/invalid_id",
            params={"problema": "test problem"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
    
    def test_suggest_treatments_with_nonexistent_parcela(self):
        """Test POST /api/ai/suggest-treatments with non-existent parcela"""
        # Use a valid ObjectId format that doesn't exist
        fake_id = "000000000000000000000000"
        response = self.session.post(
            f"{BASE_URL}/api/ai/suggest-treatments/{fake_id}",
            params={"problema": "test problem"}
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent parcela, got {response.status_code}"
    
    def test_predict_yield_with_valid_contrato(self):
        """Test POST /api/ai/predict-yield/{contrato_id} with valid data"""
        # First get a valid contrato ID
        contratos_response = self.session.get(f"{BASE_URL}/api/ai/contratos-for-predictions")
        assert contratos_response.status_code == 200
        
        contratos = contratos_response.json().get("contratos", [])
        if len(contratos) == 0:
            pytest.skip("No contratos available for testing")
        
        contrato_id = contratos[0]["_id"]
        
        # Test predict yield
        response = self.session.post(f"{BASE_URL}/api/ai/predict-yield/{contrato_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "prediction" in data, "Response should contain 'prediction'"
        assert "metadata" in data, "Response should contain 'metadata'"
        
        # Check prediction structure
        prediction = data["prediction"]
        assert "prediccion_rendimiento" in prediction, "Should have prediccion_rendimiento"
        assert "factores_positivos" in prediction, "Should have factores_positivos"
        assert "factores_riesgo" in prediction, "Should have factores_riesgo"
        assert "recomendaciones" in prediction, "Should have recomendaciones"
        
        # Check metadata
        metadata = data["metadata"]
        assert metadata.get("contrato_id") == contrato_id, "Metadata should contain correct contrato_id"
        assert "generation_time_seconds" in metadata, "Should have generation time"
        
        print(f"Successfully generated yield prediction in {metadata['generation_time_seconds']}s")
    
    def test_predict_yield_with_invalid_contrato_id(self):
        """Test POST /api/ai/predict-yield with invalid contrato ID"""
        response = self.session.post(f"{BASE_URL}/api/ai/predict-yield/invalid_id")
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
    
    def test_predict_yield_with_nonexistent_contrato(self):
        """Test POST /api/ai/predict-yield with non-existent contrato"""
        # Use a valid ObjectId format that doesn't exist
        fake_id = "000000000000000000000000"
        response = self.session.post(f"{BASE_URL}/api/ai/predict-yield/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404 for non-existent contrato, got {response.status_code}"
    
    def test_endpoints_require_authentication(self):
        """Test that endpoints require authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # Test parcelas endpoint
        response = no_auth_session.get(f"{BASE_URL}/api/ai/parcelas-for-suggestions")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Test contratos endpoint
        response = no_auth_session.get(f"{BASE_URL}/api/ai/contratos-for-predictions")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("Endpoints properly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
