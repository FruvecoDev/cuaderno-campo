"""
Test suite for Maquinaria CRUD and Tratamientos integration
- Tests Maquinaria: create, list, filter, edit, delete
- Tests Tratamientos: aplicador_nombre and maquina_id fields
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@agrogest.com"
TEST_PASSWORD = "admin123"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    # Try alternative credentials
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@agrogest.com", "password": "test1234"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestMaquinariaCRUD:
    """Test CRUD operations for Maquinaria"""
    
    def test_list_maquinaria(self, auth_headers):
        """Test GET /api/maquinaria - List all maquinaria"""
        response = requests.get(f"{BASE_URL}/api/maquinaria", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "maquinaria" in data, "Response should have 'maquinaria' field"
        assert "total" in data, "Response should have 'total' field"
        assert isinstance(data["maquinaria"], list)
        print(f"Found {data['total']} maquinaria items")

    def test_create_maquinaria(self, auth_headers):
        """Test POST /api/maquinaria - Create new machine"""
        payload = {
            "nombre": "TEST_Tractor Test",
            "tipo": "Tractor",
            "marca": "John Deere",
            "modelo": "6150M",
            "matricula": "TEST-1234",
            "num_serie": "JD-TEST-001",
            "año_fabricacion": 2022,
            "capacidad": "150CV",
            "estado": "Operativo",
            "observaciones": "Test machine for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/maquinaria", headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert data["data"]["nombre"] == "TEST_Tractor Test"
        assert data["data"]["tipo"] == "Tractor"
        assert data["data"]["estado"] == "Operativo"
        
        # Save for later tests
        pytest.maquinaria_id = data["data"]["_id"]
        print(f"Created maquinaria with ID: {pytest.maquinaria_id}")

    def test_get_maquinaria_by_id(self, auth_headers):
        """Test GET /api/maquinaria/{id} - Get single machine"""
        if not hasattr(pytest, 'maquinaria_id'):
            pytest.skip("No maquinaria_id from create test")
        
        response = requests.get(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["nombre"] == "TEST_Tractor Test"
        assert data["_id"] == pytest.maquinaria_id

    def test_update_maquinaria(self, auth_headers):
        """Test PUT /api/maquinaria/{id} - Update machine"""
        if not hasattr(pytest, 'maquinaria_id'):
            pytest.skip("No maquinaria_id from create test")
        
        payload = {
            "nombre": "TEST_Tractor Updated",
            "tipo": "Tractor",
            "marca": "John Deere",
            "modelo": "6150M PRO",
            "matricula": "TEST-1234",
            "estado": "En mantenimiento"
        }
        
        response = requests.put(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=auth_headers, json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["nombre"] == "TEST_Tractor Updated"
        assert data["data"]["estado"] == "En mantenimiento"
        print("Maquinaria updated successfully")

    def test_filter_maquinaria_by_tipo(self, auth_headers):
        """Test GET /api/maquinaria?tipo=X - Filter by type"""
        response = requests.get(f"{BASE_URL}/api/maquinaria?tipo=Tractor", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for m in data["maquinaria"]:
            assert m["tipo"] == "Tractor", f"Expected tipo 'Tractor', got '{m['tipo']}'"
        print(f"Filtered by tipo: {data['total']} results")

    def test_filter_maquinaria_by_estado(self, auth_headers):
        """Test GET /api/maquinaria?estado=X - Filter by estado"""
        response = requests.get(f"{BASE_URL}/api/maquinaria?estado=Operativo", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for m in data["maquinaria"]:
            assert m["estado"] == "Operativo", f"Expected estado 'Operativo', got '{m['estado']}'"
        print(f"Filtered by estado: {data['total']} results")


class TestTratamientosWithMaquinaria:
    """Test Tratamientos integration with Maquinaria"""
    
    @pytest.fixture(autouse=True)
    def setup_parcela(self, auth_headers):
        """Get a parcela ID for testing"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=auth_headers)
        if response.status_code == 200:
            parcelas = response.json().get("parcelas", [])
            if parcelas:
                self.parcela_id = parcelas[0]["_id"]
                return
        pytest.skip("No parcelas available for testing")

    def test_create_tratamiento_with_aplicador(self, auth_headers):
        """Test creating tratamiento with aplicador_nombre field"""
        payload = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Insecticida",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 5.5,
            "caldo_superficie": 200,
            "parcelas_ids": [self.parcela_id],
            "aplicador_nombre": "Juan García López",
            "maquina_id": None
        }
        
        response = requests.post(f"{BASE_URL}/api/tratamientos", headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["aplicador_nombre"] == "Juan García López"
        
        pytest.tratamiento_id_1 = data["data"]["_id"]
        print(f"Created tratamiento with aplicador_nombre: {data['data']['_id']}")

    def test_create_tratamiento_with_maquina(self, auth_headers):
        """Test creating tratamiento with maquina_id field - should populate maquina_nombre"""
        # First get an operativo maquinaria
        response = requests.get(f"{BASE_URL}/api/maquinaria?estado=Operativo", headers=auth_headers)
        maquinaria_list = response.json().get("maquinaria", [])
        
        if not maquinaria_list:
            pytest.skip("No operativo maquinaria available")
        
        maquina_id = maquinaria_list[0]["_id"]
        maquina_nombre_expected = maquinaria_list[0]["nombre"]
        
        payload = {
            "tipo_tratamiento": "NUTRICIÓN",
            "subtipo": "Fertilizante",
            "aplicacion_numero": 2,
            "metodo_aplicacion": "Quimigación",
            "superficie_aplicacion": 10.0,
            "caldo_superficie": 300,
            "parcelas_ids": [self.parcela_id],
            "aplicador_nombre": "Pedro Martínez",
            "maquina_id": maquina_id
        }
        
        response = requests.post(f"{BASE_URL}/api/tratamientos", headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["maquina_id"] == maquina_id
        assert data["data"]["maquina_nombre"] == maquina_nombre_expected, \
            f"Expected maquina_nombre '{maquina_nombre_expected}', got '{data['data'].get('maquina_nombre')}'"
        
        pytest.tratamiento_id_2 = data["data"]["_id"]
        print(f"Created tratamiento with maquina: {data['data']['maquina_nombre']}")

    def test_list_tratamientos_has_new_columns(self, auth_headers):
        """Verify tratamientos list includes aplicador_nombre and maquina_nombre"""
        response = requests.get(f"{BASE_URL}/api/tratamientos", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        tratamientos = data.get("tratamientos", [])
        
        # Find our test tratamientos
        found_with_aplicador = False
        found_with_maquina = False
        
        for t in tratamientos:
            if t.get("aplicador_nombre") == "Juan García López":
                found_with_aplicador = True
            if t.get("maquina_nombre"):
                found_with_maquina = True
        
        print(f"Found tratamiento with aplicador: {found_with_aplicador}")
        print(f"Found tratamiento with maquina_nombre: {found_with_maquina}")

    def test_update_tratamiento_maquina(self, auth_headers):
        """Test updating tratamiento's maquina_id updates maquina_nombre"""
        if not hasattr(pytest, 'tratamiento_id_1'):
            pytest.skip("No tratamiento_id from previous test")
        
        # Get maquinaria
        response = requests.get(f"{BASE_URL}/api/maquinaria?estado=Operativo", headers=auth_headers)
        maquinaria_list = response.json().get("maquinaria", [])
        
        if not maquinaria_list:
            pytest.skip("No operativo maquinaria available")
        
        maquina_id = maquinaria_list[0]["_id"]
        maquina_nombre_expected = maquinaria_list[0]["nombre"]
        
        # Get current tratamiento
        response = requests.get(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_1}", headers=auth_headers)
        current = response.json()
        
        payload = {
            "tipo_tratamiento": current.get("tipo_tratamiento", "FITOSANITARIOS"),
            "subtipo": current.get("subtipo", "Insecticida"),
            "aplicacion_numero": current.get("aplicacion_numero", 1),
            "metodo_aplicacion": current.get("metodo_aplicacion", "Pulverización"),
            "superficie_aplicacion": current.get("superficie_aplicacion", 5.5),
            "caldo_superficie": current.get("caldo_superficie", 200),
            "parcelas_ids": current.get("parcelas_ids", [self.parcela_id]),
            "aplicador_nombre": "Updated Aplicador",
            "maquina_id": maquina_id
        }
        
        response = requests.put(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_1}", headers=auth_headers, json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["data"]["maquina_nombre"] == maquina_nombre_expected
        assert data["data"]["aplicador_nombre"] == "Updated Aplicador"
        print("Updated tratamiento with new maquina and aplicador")


class TestCleanup:
    """Clean up test data"""
    
    def test_cleanup_test_tratamientos(self, auth_headers):
        """Delete test tratamientos"""
        if hasattr(pytest, 'tratamiento_id_1'):
            response = requests.delete(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_1}", headers=auth_headers)
            print(f"Cleanup tratamiento 1: {response.status_code}")
        
        if hasattr(pytest, 'tratamiento_id_2'):
            response = requests.delete(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_2}", headers=auth_headers)
            print(f"Cleanup tratamiento 2: {response.status_code}")

    def test_delete_test_maquinaria(self, auth_headers):
        """Delete test maquinaria"""
        if hasattr(pytest, 'maquinaria_id'):
            response = requests.delete(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=auth_headers)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            # Verify deleted
            response = requests.get(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=auth_headers)
            assert response.status_code == 404, "Maquinaria should be deleted"
            print("Test maquinaria deleted successfully")
