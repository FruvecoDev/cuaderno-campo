"""
Tests for Evaluaciones CRUD and Filter functionality
Tests the filter implementation for: parcela, cultivo, proveedor, campaña, contrato, estado
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agri-tracker-25.preview.emergentagent.com')

class TestEvaluacionesAPI:
    """Test Evaluaciones API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fruveco.com", "password": "admin123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fruveco.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print("✓ Login success")
    
    def test_list_evaluaciones(self):
        """Test GET /api/evaluaciones returns list"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "evaluaciones" in data
        assert "total" in data
        assert isinstance(data["evaluaciones"], list)
        print(f"✓ List evaluaciones: {data['total']} total")
    
    def test_get_evaluaciones_with_campana_filter(self):
        """Test filtering evaluaciones by campaña"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones?campana=2025/26",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "evaluaciones" in data
        # If there are results, verify they match the filter
        for eval in data["evaluaciones"]:
            assert eval.get("campana") == "2025/26", f"Expected campana '2025/26', got '{eval.get('campana')}'"
        print(f"✓ Filter by campaña: {len(data['evaluaciones'])} results")
    
    def test_get_evaluaciones_with_estado_filter(self):
        """Test filtering evaluaciones by estado"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones?estado=borrador",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "evaluaciones" in data
        # If there are results, verify they match the filter
        for eval in data["evaluaciones"]:
            assert eval.get("estado") == "borrador", f"Expected estado 'borrador', got '{eval.get('estado')}'"
        print(f"✓ Filter by estado: {len(data['evaluaciones'])} results")
    
    def test_get_evaluaciones_with_parcela_filter(self):
        """Test filtering evaluaciones by parcela_id"""
        # First, get an evaluacion to get its parcela_id
        list_response = requests.get(
            f"{BASE_URL}/api/evaluaciones",
            headers=self.headers
        )
        assert list_response.status_code == 200
        evaluaciones = list_response.json()["evaluaciones"]
        
        if evaluaciones:
            parcela_id = evaluaciones[0].get("parcela_id")
            if parcela_id:
                response = requests.get(
                    f"{BASE_URL}/api/evaluaciones?parcela_id={parcela_id}",
                    headers=self.headers
                )
                assert response.status_code == 200
                data = response.json()
                # All results should have the same parcela_id
                for eval in data["evaluaciones"]:
                    assert eval.get("parcela_id") == parcela_id
                print(f"✓ Filter by parcela_id: {len(data['evaluaciones'])} results")
            else:
                print("⚠ No parcela_id in test data, skipping")
        else:
            print("⚠ No evaluaciones to test, skipping")
    
    def test_get_single_evaluacion(self):
        """Test GET /api/evaluaciones/{id} returns single evaluacion"""
        # First, get list
        list_response = requests.get(
            f"{BASE_URL}/api/evaluaciones",
            headers=self.headers
        )
        assert list_response.status_code == 200
        evaluaciones = list_response.json()["evaluaciones"]
        
        if evaluaciones:
            eval_id = evaluaciones[0]["_id"]
            response = requests.get(
                f"{BASE_URL}/api/evaluaciones/{eval_id}",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["_id"] == eval_id
            print(f"✓ Get single evaluacion by ID")
        else:
            print("⚠ No evaluaciones to test")
    
    def test_evaluacion_has_expected_fields(self):
        """Test that evaluacion has all expected fields for filtering"""
        list_response = requests.get(
            f"{BASE_URL}/api/evaluaciones",
            headers=self.headers
        )
        assert list_response.status_code == 200
        evaluaciones = list_response.json()["evaluaciones"]
        
        if evaluaciones:
            eval = evaluaciones[0]
            # Fields needed for filtering
            expected_fields = ["codigo_plantacion", "cultivo", "proveedor", "campana", "estado"]
            for field in expected_fields:
                assert field in eval, f"Missing field: {field}"
                print(f"  ✓ Field '{field}': {eval[field]}")
            print("✓ Evaluacion has all expected filter fields")
        else:
            print("⚠ No evaluaciones to test")
    
    def test_create_evaluacion(self):
        """Test creating a new evaluacion"""
        # First get a parcela to create evaluacion for
        parcelas_response = requests.get(
            f"{BASE_URL}/api/parcelas",
            headers=self.headers
        )
        assert parcelas_response.status_code == 200
        parcelas = parcelas_response.json().get("parcelas", [])
        
        if parcelas:
            parcela_id = parcelas[0]["_id"]
            
            new_evaluacion = {
                "parcela_id": parcela_id,
                "fecha_inicio": "2026-02-23",
                "tecnico": "Test Técnico",
                "toma_datos": [],
                "analisis_suelo": [],
                "observaciones": []
            }
            
            response = requests.post(
                f"{BASE_URL}/api/evaluaciones",
                headers=self.headers,
                json=new_evaluacion
            )
            assert response.status_code == 200, f"Create failed: {response.text}"
            data = response.json()
            assert data.get("success") == True
            assert "data" in data
            
            # Store ID for cleanup
            self.created_eval_id = data["data"]["_id"]
            print(f"✓ Created evaluacion: {self.created_eval_id}")
            
            # Cleanup - delete created evaluacion
            delete_response = requests.delete(
                f"{BASE_URL}/api/evaluaciones/{self.created_eval_id}",
                headers=self.headers
            )
            assert delete_response.status_code == 200
            print("✓ Cleaned up test evaluacion")
        else:
            print("⚠ No parcelas available to create evaluacion")
    
    def test_evaluacion_inherits_parcela_data(self):
        """Test that evaluacion inherits data from parcela"""
        list_response = requests.get(
            f"{BASE_URL}/api/evaluaciones",
            headers=self.headers
        )
        assert list_response.status_code == 200
        evaluaciones = list_response.json()["evaluaciones"]
        
        if evaluaciones:
            eval = evaluaciones[0]
            # These fields should be inherited from parcela
            inherited_fields = ["proveedor", "codigo_plantacion", "cultivo", "variedad", "campana"]
            for field in inherited_fields:
                assert field in eval, f"Missing inherited field: {field}"
            print("✓ Evaluacion inherits parcela data correctly")
        else:
            print("⚠ No evaluaciones to test")


class TestEvaluacionesConfig:
    """Test Evaluaciones configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fruveco.com", "password": "admin123"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_preguntas_config(self):
        """Test GET /api/evaluaciones/config/preguntas"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/config/preguntas",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "preguntas" in data or "custom" in data
        print("✓ Get preguntas config")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
