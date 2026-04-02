"""
Test NFC RRHH Feature - Iteration 51
Tests for NFC employee identification and fichaje (time tracking) functionality

Endpoints tested:
- PUT /api/rrhh/empleados/{id}/nfc - Assign NFC ID to employee
- DELETE /api/rrhh/empleados/{id}/nfc - Remove NFC ID from employee
- GET /api/rrhh/empleados/nfc-lookup/{nfc_id} - Lookup employee by NFC ID
- POST /api/rrhh/fichajes/nfc - Create fichaje via NFC
- GET /api/rrhh/fichajes/hoy - Get today's fichajes (should show NFC method)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test NFC ID - unique for this test run
TEST_NFC_ID = f"TEST-NFC-{datetime.now().strftime('%H%M%S')}"
TEST_NFC_ID_2 = f"TEST-NFC-2-{datetime.now().strftime('%H%M%S')}"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_empleado(api_client):
    """Get first active employee for testing"""
    response = api_client.get(f"{BASE_URL}/api/rrhh/empleados?activo=true")
    assert response.status_code == 200
    data = response.json()
    empleados = data.get("empleados", [])
    assert len(empleados) > 0, "No active employees found for testing"
    return empleados[0]


@pytest.fixture(scope="module")
def second_empleado(api_client):
    """Get second active employee for duplicate NFC test"""
    response = api_client.get(f"{BASE_URL}/api/rrhh/empleados?activo=true")
    assert response.status_code == 200
    data = response.json()
    empleados = data.get("empleados", [])
    assert len(empleados) > 1, "Need at least 2 employees for duplicate test"
    return empleados[1]


class TestNFCAssignment:
    """Test NFC ID assignment to employees"""
    
    def test_assign_nfc_to_employee(self, api_client, test_empleado):
        """PUT /api/rrhh/empleados/{id}/nfc - Assign NFC ID"""
        empleado_id = test_empleado["_id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/rrhh/empleados/{empleado_id}/nfc",
            json={"nfc_id": TEST_NFC_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("nfc_id") == TEST_NFC_ID
        print(f"✓ Assigned NFC ID '{TEST_NFC_ID}' to employee {test_empleado.get('nombre')}")
    
    def test_assign_nfc_empty_id_rejected(self, api_client, test_empleado):
        """PUT /api/rrhh/empleados/{id}/nfc - Reject empty NFC ID"""
        empleado_id = test_empleado["_id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/rrhh/empleados/{empleado_id}/nfc",
            json={"nfc_id": ""}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty NFC ID, got {response.status_code}"
        print("✓ Empty NFC ID correctly rejected with 400")
    
    def test_assign_nfc_whitespace_rejected(self, api_client, test_empleado):
        """PUT /api/rrhh/empleados/{id}/nfc - Reject whitespace-only NFC ID"""
        empleado_id = test_empleado["_id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/rrhh/empleados/{empleado_id}/nfc",
            json={"nfc_id": "   "}
        )
        
        assert response.status_code == 400, f"Expected 400 for whitespace NFC ID, got {response.status_code}"
        print("✓ Whitespace-only NFC ID correctly rejected with 400")
    
    def test_assign_duplicate_nfc_rejected(self, api_client, test_empleado, second_empleado):
        """PUT /api/rrhh/empleados/{id}/nfc - Reject duplicate NFC ID (409)"""
        # First employee already has TEST_NFC_ID assigned from previous test
        second_empleado_id = second_empleado["_id"]
        
        response = api_client.put(
            f"{BASE_URL}/api/rrhh/empleados/{second_empleado_id}/nfc",
            json={"nfc_id": TEST_NFC_ID}
        )
        
        assert response.status_code == 409, f"Expected 409 for duplicate NFC, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ya asignado" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        print(f"✓ Duplicate NFC ID correctly rejected with 409")
    
    def test_assign_nfc_invalid_employee(self, api_client):
        """PUT /api/rrhh/empleados/{id}/nfc - 404 for invalid employee"""
        response = api_client.put(
            f"{BASE_URL}/api/rrhh/empleados/000000000000000000000000/nfc",
            json={"nfc_id": "INVALID-TEST"}
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid employee, got {response.status_code}"
        print("✓ Invalid employee ID correctly returns 404")


class TestNFCLookup:
    """Test NFC ID lookup functionality"""
    
    def test_lookup_employee_by_nfc(self, api_client, test_empleado):
        """GET /api/rrhh/empleados/nfc-lookup/{nfc_id} - Find employee by NFC"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/nfc-lookup/{TEST_NFC_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "empleado" in data
        
        empleado = data["empleado"]
        assert empleado.get("_id") == test_empleado["_id"]
        assert empleado.get("nfc_id") == TEST_NFC_ID
        print(f"✓ NFC lookup returned correct employee: {empleado.get('nombre')} {empleado.get('apellidos')}")
    
    def test_lookup_unknown_nfc_returns_404(self, api_client):
        """GET /api/rrhh/empleados/nfc-lookup/{nfc_id} - 404 for unknown NFC"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/nfc-lookup/UNKNOWN-NFC-12345")
        
        assert response.status_code == 404, f"Expected 404 for unknown NFC, got {response.status_code}"
        data = response.json()
        assert "no registrado" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
        print("✓ Unknown NFC ID correctly returns 404")


class TestNFCFichaje:
    """Test NFC-based time tracking (fichaje)"""
    
    def test_fichaje_nfc_entrada(self, api_client):
        """POST /api/rrhh/fichajes/nfc - Create entrada fichaje via NFC"""
        response = api_client.post(
            f"{BASE_URL}/api/rrhh/fichajes/nfc",
            json={
                "nfc_id": TEST_NFC_ID,
                "tipo": "entrada"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        fichaje = data.get("data", {})
        assert fichaje.get("tipo") == "entrada"
        assert fichaje.get("metodo_identificacion") == "nfc"
        assert fichaje.get("fecha") == datetime.now().strftime("%Y-%m-%d")
        assert "empleado_nombre" in fichaje
        print(f"✓ NFC entrada fichaje created for {fichaje.get('empleado_nombre')}")
    
    def test_fichaje_nfc_salida(self, api_client):
        """POST /api/rrhh/fichajes/nfc - Create salida fichaje via NFC"""
        response = api_client.post(
            f"{BASE_URL}/api/rrhh/fichajes/nfc",
            json={
                "nfc_id": TEST_NFC_ID,
                "tipo": "salida"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        fichaje = data.get("data", {})
        assert fichaje.get("tipo") == "salida"
        assert fichaje.get("metodo_identificacion") == "nfc"
        print(f"✓ NFC salida fichaje created for {fichaje.get('empleado_nombre')}")
    
    def test_fichaje_nfc_invalid_card(self, api_client):
        """POST /api/rrhh/fichajes/nfc - 404 for invalid NFC card"""
        response = api_client.post(
            f"{BASE_URL}/api/rrhh/fichajes/nfc",
            json={
                "nfc_id": "INVALID-NFC-CARD-999",
                "tipo": "entrada"
            }
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid NFC, got {response.status_code}"
        data = response.json()
        assert "no registrada" in data.get("detail", "").lower() or "not found" in data.get("detail", "").lower()
        print("✓ Invalid NFC card correctly returns 404")
    
    def test_fichaje_nfc_default_tipo_entrada(self, api_client):
        """POST /api/rrhh/fichajes/nfc - Default tipo is entrada"""
        response = api_client.post(
            f"{BASE_URL}/api/rrhh/fichajes/nfc",
            json={"nfc_id": TEST_NFC_ID}  # No tipo specified
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        fichaje = data.get("data", {})
        assert fichaje.get("tipo") == "entrada", "Default tipo should be 'entrada'"
        print("✓ Default fichaje tipo is 'entrada'")


class TestFichajesHoy:
    """Test today's fichajes endpoint shows NFC method"""
    
    def test_fichajes_hoy_shows_nfc_method(self, api_client):
        """GET /api/rrhh/fichajes/hoy - Shows NFC fichajes in today's list"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/fichajes/hoy")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        
        fichajes = data.get("fichajes", [])
        assert len(fichajes) > 0, "Expected at least one fichaje today"
        
        # Find NFC fichajes
        nfc_fichajes = [f for f in fichajes if f.get("metodo_identificacion") == "nfc"]
        assert len(nfc_fichajes) > 0, "Expected at least one NFC fichaje in today's list"
        
        # Verify NFC fichaje structure
        nfc_fichaje = nfc_fichajes[0]
        assert "empleado_nombre" in nfc_fichaje
        assert "tipo" in nfc_fichaje
        assert "hora" in nfc_fichaje
        assert "fecha" in nfc_fichaje
        print(f"✓ Found {len(nfc_fichajes)} NFC fichajes in today's list")
        
        # Check estadisticas
        estadisticas = data.get("estadisticas", {})
        assert "empleados_activos" in estadisticas
        assert "empleados_fichados" in estadisticas
        print(f"✓ Estadisticas: {estadisticas.get('empleados_fichados')} fichados de {estadisticas.get('empleados_activos')} activos")


class TestNFCRemoval:
    """Test NFC ID removal from employees"""
    
    def test_remove_nfc_from_employee(self, api_client, test_empleado):
        """DELETE /api/rrhh/empleados/{id}/nfc - Remove NFC ID"""
        empleado_id = test_empleado["_id"]
        
        response = api_client.delete(f"{BASE_URL}/api/rrhh/empleados/{empleado_id}/nfc")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Removed NFC ID from employee {test_empleado.get('nombre')}")
    
    def test_verify_nfc_removed(self, api_client, test_empleado):
        """Verify NFC ID was removed from employee"""
        empleado_id = test_empleado["_id"]
        
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/{empleado_id}")
        
        assert response.status_code == 200
        data = response.json()
        empleado = data.get("empleado", {})
        assert empleado.get("nfc_id") is None or empleado.get("nfc_id") == ""
        print("✓ Verified NFC ID was removed from employee record")
    
    def test_lookup_removed_nfc_returns_404(self, api_client):
        """GET /api/rrhh/empleados/nfc-lookup/{nfc_id} - 404 after removal"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/nfc-lookup/{TEST_NFC_ID}")
        
        assert response.status_code == 404, f"Expected 404 after NFC removal, got {response.status_code}"
        print("✓ NFC lookup returns 404 after removal")
    
    def test_remove_nfc_invalid_employee(self, api_client):
        """DELETE /api/rrhh/empleados/{id}/nfc - 404 for invalid employee"""
        response = api_client.delete(f"{BASE_URL}/api/rrhh/empleados/000000000000000000000000/nfc")
        
        assert response.status_code == 404, f"Expected 404 for invalid employee, got {response.status_code}"
        print("✓ Invalid employee ID correctly returns 404 on NFC removal")


class TestNFCCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_nfc_assignments(self, api_client):
        """Clean up any remaining test NFC assignments"""
        # Get all employees
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados")
        if response.status_code == 200:
            empleados = response.json().get("empleados", [])
            for emp in empleados:
                nfc_id = emp.get("nfc_id", "")
                if nfc_id and nfc_id.startswith("TEST-NFC"):
                    api_client.delete(f"{BASE_URL}/api/rrhh/empleados/{emp['_id']}/nfc")
                    print(f"  Cleaned up NFC '{nfc_id}' from {emp.get('nombre')}")
        print("✓ Test NFC cleanup completed")
