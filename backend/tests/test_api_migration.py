"""
API Migration Integration Tests

Tests key endpoints after the fetch() to api.js migration
to verify backend APIs are still working correctly.
"""

import pytest
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://harvest-hub-300.preview.emergentagent.com').rstrip('/')


class TestAuthAPI:
    """Test authentication endpoints"""
    
    def test_login_success(self, api_client):
        """Test login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@fruveco.com"
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpass"
        })
        assert response.status_code in [401, 400]


class TestDashboardAPI:
    """Test dashboard KPI endpoints"""
    
    def test_dashboard_kpis(self, authenticated_client):
        """Test dashboard KPIs load correctly"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/kpis")
        assert response.status_code == 200
        data = response.json()
        assert "totales" in data
        assert "fincas" in data


class TestContratosAPI:
    """Test contratos endpoints"""
    
    def test_get_contratos_list(self, authenticated_client):
        """Test contratos list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/contratos")
        assert response.status_code == 200
        data = response.json()
        assert "contratos" in data
        assert isinstance(data["contratos"], list)
    
    def test_get_single_contrato(self, authenticated_client):
        """Test getting a single contrato if any exist"""
        # First get list
        response = authenticated_client.get(f"{BASE_URL}/api/contratos")
        data = response.json()
        
        if data.get("contratos") and len(data["contratos"]) > 0:
            contrato_id = data["contratos"][0]["_id"]
            response = authenticated_client.get(f"{BASE_URL}/api/contratos/{contrato_id}")
            assert response.status_code == 200


class TestParcelasAPI:
    """Test parcelas endpoints"""
    
    def test_get_parcelas_list(self, authenticated_client):
        """Test parcelas list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/parcelas")
        assert response.status_code == 200
        data = response.json()
        assert "parcelas" in data
        assert isinstance(data["parcelas"], list)


class TestTareasAPI:
    """Test tareas endpoints"""
    
    def test_get_tareas_list(self, authenticated_client):
        """Test tareas list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/tareas")
        assert response.status_code == 200
        data = response.json()
        assert "tareas" in data
    
    def test_get_tareas_stats(self, authenticated_client):
        """Test tareas stats endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/tareas/stats")
        assert response.status_code == 200


class TestIrrigacionesAPI:
    """Test irrigaciones endpoints"""
    
    def test_get_irrigaciones_list(self, authenticated_client):
        """Test irrigaciones list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/irrigaciones")
        assert response.status_code == 200
        data = response.json()
        assert "irrigaciones" in data
    
    def test_get_irrigaciones_stats(self, authenticated_client):
        """Test irrigaciones stats endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/irrigaciones/stats")
        assert response.status_code == 200


class TestRRHHAPI:
    """Test RRHH endpoints"""
    
    def test_get_empleados_list(self, authenticated_client):
        """Test empleados list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/rrhh/empleados")
        assert response.status_code == 200
        data = response.json()
        assert "empleados" in data
    
    def test_get_empleados_stats(self, authenticated_client):
        """Test empleados stats endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/rrhh/empleados/stats")
        assert response.status_code == 200


class TestInformesAPI:
    """Test informes (reports) endpoints"""
    
    def test_get_ingresos_resumen(self, authenticated_client):
        """Test ingresos resumen endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/ingresos/resumen")
        assert response.status_code == 200
        data = response.json()
        assert "total_general" in data
    
    def test_get_gastos_resumen(self, authenticated_client):
        """Test gastos resumen endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/gastos/resumen")
        assert response.status_code == 200
        data = response.json()
        assert "total_general" in data


class TestNotificacionesAPI:
    """Test notificaciones endpoints"""
    
    def test_get_notificaciones_count(self, authenticated_client):
        """Test notificaciones count endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/notificaciones/count")
        assert response.status_code == 200
        data = response.json()
        assert "no_leidas" in data
    
    def test_get_notificaciones_list(self, authenticated_client):
        """Test notificaciones list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/notificaciones?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "notificaciones" in data


class TestConfigAPI:
    """Test configuration endpoints"""
    
    def test_get_config_settings(self, authenticated_client):
        """Test config settings endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/config/settings")
        assert response.status_code == 200
        data = response.json()
        assert "settings" in data
    
    def test_get_config_logos(self, authenticated_client):
        """Test config logos endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/config/logos")
        assert response.status_code == 200


class TestTratamientosAPI:
    """Test tratamientos endpoints"""
    
    def test_get_tratamientos_list(self, authenticated_client):
        """Test tratamientos list endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/tratamientos")
        assert response.status_code == 200
        data = response.json()
        assert "tratamientos" in data
