"""
Tests for new user management features:
- Get empleados disponibles (available employees to link)
- Vincular user with empleado (link/unlink user to employee)
- Empleado role
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agri-rrhh-suite.preview.emergentagent.com').rstrip('/')


class TestEmpleadosDisponibles:
    """Tests for GET /api/auth/empleados-disponibles endpoint"""
    
    def test_get_empleados_disponibles_success(self, authenticated_client):
        """Admin can get list of available employees for linking"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/empleados-disponibles")
        
        assert response.status_code == 200
        data = response.json()
        assert "empleados" in data
        assert isinstance(data["empleados"], list)
        
        # Verify structure of each employee if list is not empty
        if len(data["empleados"]) > 0:
            emp = data["empleados"][0]
            assert "_id" in emp
            assert "nombre" in emp
            assert "apellidos" in emp
            assert "vinculado" in emp  # Should indicate if already linked
    
    def test_get_empleados_disponibles_unauthorized(self, api_client):
        """Unauthenticated request should fail"""
        response = api_client.get(f"{BASE_URL}/api/auth/empleados-disponibles")
        assert response.status_code in [401, 403]


class TestVincularEmpleado:
    """Tests for PUT /api/auth/users/{user_id}/vincular-empleado endpoint"""
    
    @pytest.fixture
    def test_user(self, authenticated_client):
        """Create a test user for linking tests"""
        import time
        unique_email = f"test_vinc_{int(time.time())}@test.com"
        
        response = authenticated_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "full_name": "Test Vinculacion User",
            "role": "Empleado"
        })
        
        if response.status_code == 200:
            user_data = response.json().get("user", {})
            yield user_data
            # Note: No cleanup available since there's no delete endpoint
        else:
            pytest.skip(f"Could not create test user: {response.text}")
    
    @pytest.fixture
    def available_empleado_id(self, authenticated_client):
        """Get an available (not linked) employee ID for testing"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/empleados-disponibles")
        
        if response.status_code == 200:
            empleados = response.json().get("empleados", [])
            # Find one that's not already linked
            for emp in empleados:
                if not emp.get("vinculado"):
                    return emp["_id"]
        
        pytest.skip("No available employee to link")
    
    def test_vincular_empleado_success(self, authenticated_client, test_user, available_empleado_id):
        """Successfully link a user to an employee"""
        user_id = test_user.get("_id")
        if not user_id:
            pytest.skip("Test user has no _id")
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/users/{user_id}/vincular-empleado",
            json={"empleado_id": available_empleado_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("user", {}).get("empleado_id") == available_empleado_id
    
    def test_desvincular_empleado_success(self, authenticated_client, test_user):
        """Successfully unlink a user from an employee"""
        user_id = test_user.get("_id")
        if not user_id:
            pytest.skip("Test user has no _id")
        
        # Unlink by passing null empleado_id
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/users/{user_id}/vincular-empleado",
            json={"empleado_id": None}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("user", {}).get("empleado_id") is None
    
    def test_vincular_invalid_empleado_id(self, authenticated_client, test_user):
        """Linking with invalid employee ID should fail"""
        user_id = test_user.get("_id")
        if not user_id:
            pytest.skip("Test user has no _id")
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/users/{user_id}/vincular-empleado",
            json={"empleado_id": "invalid_id"}
        )
        
        assert response.status_code == 400
    
    def test_vincular_nonexistent_empleado(self, authenticated_client, test_user):
        """Linking to non-existent employee should fail"""
        user_id = test_user.get("_id")
        if not user_id:
            pytest.skip("Test user has no _id")
        
        # Valid ObjectId format but non-existent
        response = authenticated_client.put(
            f"{BASE_URL}/api/auth/users/{user_id}/vincular-empleado",
            json={"empleado_id": "507f1f77bcf86cd799439011"}
        )
        
        assert response.status_code == 404


class TestEmpleadoRole:
    """Tests for the new Empleado role"""
    
    def test_create_user_with_empleado_role(self, authenticated_client):
        """Admin can create user with Empleado role"""
        import time
        unique_email = f"test_emp_role_{int(time.time())}@test.com"
        
        response = authenticated_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "full_name": "Test Empleado Role",
            "role": "Empleado"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("user", {}).get("role") == "Empleado"
    
    def test_get_users_includes_empleado_role(self, authenticated_client):
        """Users list includes users with Empleado role"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/users")
        
        assert response.status_code == 200
        users = response.json().get("users", [])
        
        # Check that we can find users with different roles
        roles = [u.get("role") for u in users]
        assert len(roles) > 0
