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

class TestAuth:
    """Test authentication first"""
    
    def test_login(self):
        """Verify login works and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data
        pytest.token = data["access_token"]
        pytest.headers = {"Authorization": f"Bearer {pytest.token}", "Content-Type": "application/json"}
        print(f"Login successful for {TEST_EMAIL}")


class TestMaquinariaCRUD:
    """Test CRUD operations for Maquinaria"""
    
    def test_list_maquinaria(self):
        """Test GET /api/maquinaria - List all maquinaria"""
        response = requests.get(f"{BASE_URL}/api/maquinaria", headers=pytest.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "maquinaria" in data, "Response should have 'maquinaria' field"
        assert "total" in data, "Response should have 'total' field"
        assert isinstance(data["maquinaria"], list)
        print(f"Found {data['total']} maquinaria items")
        pytest.existing_maquinaria = data["maquinaria"]

    def test_create_maquinaria(self):
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
        
        response = requests.post(f"{BASE_URL}/api/maquinaria", headers=pytest.headers, json=payload)
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

    def test_get_maquinaria_by_id(self):
        """Test GET /api/maquinaria/{id} - Get single machine"""
        response = requests.get(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=pytest.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["nombre"] == "TEST_Tractor Test"
        assert data["_id"] == pytest.maquinaria_id
        print("Get by ID successful")

    def test_update_maquinaria(self):
        """Test PUT /api/maquinaria/{id} - Update machine"""
        payload = {
            "nombre": "TEST_Tractor Updated",
            "tipo": "Tractor",
            "marca": "John Deere",
            "modelo": "6150M PRO",
            "matricula": "TEST-1234",
            "estado": "En mantenimiento"
        }
        
        response = requests.put(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=pytest.headers, json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["nombre"] == "TEST_Tractor Updated"
        assert data["data"]["estado"] == "En mantenimiento"
        print("Maquinaria updated successfully")
        
        # Update back to Operativo for tratamientos tests
        payload["estado"] = "Operativo"
        payload["nombre"] = "TEST_Tractor Test"
        requests.put(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=pytest.headers, json=payload)

    def test_filter_maquinaria_by_tipo(self):
        """Test GET /api/maquinaria?tipo=X - Filter by type"""
        response = requests.get(f"{BASE_URL}/api/maquinaria?tipo=Tractor", headers=pytest.headers)
        assert response.status_code == 200
        
        data = response.json()
        for m in data["maquinaria"]:
            assert m["tipo"] == "Tractor", f"Expected tipo 'Tractor', got '{m['tipo']}'"
        print(f"Filtered by tipo: {data['total']} results")

    def test_filter_maquinaria_by_estado(self):
        """Test GET /api/maquinaria?estado=X - Filter by estado"""
        response = requests.get(f"{BASE_URL}/api/maquinaria?estado=Operativo", headers=pytest.headers)
        assert response.status_code == 200
        
        data = response.json()
        for m in data["maquinaria"]:
            assert m["estado"] == "Operativo", f"Expected estado 'Operativo', got '{m['estado']}'"
        print(f"Filtered by estado Operativo: {data['total']} results")


class TestTratamientosWithMaquinaria:
    """Test Tratamientos integration with Maquinaria"""
    
    def test_get_parcela_for_testing(self):
        """Get a parcela ID for testing"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=pytest.headers)
        assert response.status_code == 200
        parcelas = response.json().get("parcelas", [])
        assert len(parcelas) > 0, "No parcelas available for testing"
        pytest.test_parcela_id = parcelas[0]["_id"]
        print(f"Using parcela: {pytest.test_parcela_id}")

    def test_create_tratamiento_with_aplicador(self):
        """Test creating tratamiento with aplicador_nombre field"""
        payload = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Insecticida",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 5.5,
            "caldo_superficie": 200,
            "parcelas_ids": [pytest.test_parcela_id],
            "aplicador_nombre": "Juan García López",
            "maquina_id": None
        }
        
        response = requests.post(f"{BASE_URL}/api/tratamientos", headers=pytest.headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["aplicador_nombre"] == "Juan García López"
        
        pytest.tratamiento_id_1 = data["data"]["_id"]
        print(f"Created tratamiento with aplicador_nombre: {data['data']['aplicador_nombre']}")

    def test_create_tratamiento_with_maquina(self):
        """Test creating tratamiento with maquina_id field - should populate maquina_nombre"""
        # Use our test maquinaria (which is Operativo)
        payload = {
            "tipo_tratamiento": "NUTRICIÓN",
            "subtipo": "Fertilizante",
            "aplicacion_numero": 2,
            "metodo_aplicacion": "Quimigación",
            "superficie_aplicacion": 10.0,
            "caldo_superficie": 300,
            "parcelas_ids": [pytest.test_parcela_id],
            "aplicador_nombre": "Pedro Martínez",
            "maquina_id": pytest.maquinaria_id
        }
        
        response = requests.post(f"{BASE_URL}/api/tratamientos", headers=pytest.headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["maquina_id"] == pytest.maquinaria_id
        assert data["data"]["maquina_nombre"] == "TEST_Tractor Test", \
            f"Expected maquina_nombre 'TEST_Tractor Test', got '{data['data'].get('maquina_nombre')}'"
        
        pytest.tratamiento_id_2 = data["data"]["_id"]
        print(f"Created tratamiento with maquina_nombre: {data['data']['maquina_nombre']}")

    def test_list_tratamientos_has_new_columns(self):
        """Verify tratamientos list includes aplicador_nombre and maquina_nombre"""
        response = requests.get(f"{BASE_URL}/api/tratamientos", headers=pytest.headers)
        assert response.status_code == 200
        
        data = response.json()
        tratamientos = data.get("tratamientos", [])
        
        # Find our test tratamientos
        found_with_aplicador = False
        found_with_maquina = False
        
        for t in tratamientos:
            if t.get("aplicador_nombre") == "Juan García López":
                found_with_aplicador = True
            if t.get("maquina_nombre") == "TEST_Tractor Test":
                found_with_maquina = True
        
        assert found_with_aplicador, "Tratamiento with aplicador_nombre not found in list"
        assert found_with_maquina, "Tratamiento with maquina_nombre not found in list"
        print("Tratamientos list includes aplicador_nombre and maquina_nombre columns")

    def test_update_tratamiento_maquina(self):
        """Test updating tratamiento's maquina_id updates maquina_nombre"""
        # Get an existing operativo maquinaria (not our test one)
        response = requests.get(f"{BASE_URL}/api/maquinaria?estado=Operativo", headers=pytest.headers)
        maquinaria_list = response.json().get("maquinaria", [])
        
        # Find a different maquinaria if available
        other_maquina = None
        other_maquina_nombre = None
        for m in maquinaria_list:
            if m["_id"] != pytest.maquinaria_id:
                other_maquina = m["_id"]
                other_maquina_nombre = m["nombre"]
                break
        
        # If no other maquinaria, use the same one
        if not other_maquina:
            other_maquina = pytest.maquinaria_id
            other_maquina_nombre = "TEST_Tractor Test"
        
        # Update tratamiento_id_1 to have a maquina
        payload = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Insecticida",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 5.5,
            "caldo_superficie": 200,
            "parcelas_ids": [pytest.test_parcela_id],
            "aplicador_nombre": "Updated Aplicador",
            "maquina_id": other_maquina
        }
        
        response = requests.put(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_1}", headers=pytest.headers, json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["data"]["maquina_nombre"] == other_maquina_nombre
        assert data["data"]["aplicador_nombre"] == "Updated Aplicador"
        print(f"Updated tratamiento: maquina_nombre={other_maquina_nombre}, aplicador=Updated Aplicador")


class TestCleanup:
    """Clean up test data"""
    
    def test_cleanup_test_tratamientos(self):
        """Delete test tratamientos"""
        if hasattr(pytest, 'tratamiento_id_1'):
            response = requests.delete(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_1}", headers=pytest.headers)
            print(f"Cleanup tratamiento 1: {response.status_code}")
        
        if hasattr(pytest, 'tratamiento_id_2'):
            response = requests.delete(f"{BASE_URL}/api/tratamientos/{pytest.tratamiento_id_2}", headers=pytest.headers)
            print(f"Cleanup tratamiento 2: {response.status_code}")

    def test_delete_test_maquinaria(self):
        """Delete test maquinaria"""
        if hasattr(pytest, 'maquinaria_id'):
            response = requests.delete(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=pytest.headers)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            # Verify deleted
            response = requests.get(f"{BASE_URL}/api/maquinaria/{pytest.maquinaria_id}", headers=pytest.headers)
            assert response.status_code == 404, "Maquinaria should be deleted"
            print("Test maquinaria deleted successfully")
