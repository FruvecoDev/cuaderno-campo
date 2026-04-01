"""
Test suite for refactored RRHH routes
Tests: routes_rrhh.py, rrhh_fichajes.py, rrhh_productividad.py, rrhh_documentos.py
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@fruveco.com", "password": "admin123"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}

class TestRRHHEmpleados:
    """Test empleados endpoints from routes_rrhh.py"""
    
    def test_get_empleados(self):
        """GET /api/rrhh/empleados returns employees list"""
        response = requests.get(f"{BASE_URL}/api/rrhh/empleados")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "empleados" in data
        assert "total" in data
        assert isinstance(data["empleados"], list)
        print(f"Found {data['total']} empleados")
    
    def test_get_empleados_stats(self):
        """GET /api/rrhh/empleados/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/rrhh/empleados/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        stats = data["stats"]
        assert "total" in stats
        assert "activos" in stats
        assert "inactivos" in stats
        assert "por_departamento" in stats
        assert "por_tipo_contrato" in stats
        print(f"Stats: {stats['total']} total, {stats['activos']} activos")


class TestRRHHFichajes:
    """Test fichajes endpoints from rrhh_fichajes.py"""
    
    def test_get_fichajes(self):
        """GET /api/rrhh/fichajes returns fichajes list"""
        response = requests.get(f"{BASE_URL}/api/rrhh/fichajes")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "fichajes" in data
        assert "total" in data
        assert isinstance(data["fichajes"], list)
        print(f"Found {data['total']} fichajes")
    
    def test_get_fichajes_hoy(self):
        """GET /api/rrhh/fichajes/hoy returns today's fichajes"""
        response = requests.get(f"{BASE_URL}/api/rrhh/fichajes/hoy")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "fichajes" in data
        assert "estadisticas" in data
        estadisticas = data["estadisticas"]
        assert "empleados_activos" in estadisticas
        assert "empleados_fichados" in estadisticas
        assert "pendientes_fichar" in estadisticas
        print(f"Today: {estadisticas['empleados_fichados']} fichados de {estadisticas['empleados_activos']} activos")
    
    def test_get_fichajes_with_filters(self):
        """GET /api/rrhh/fichajes with date filters"""
        response = requests.get(
            f"{BASE_URL}/api/rrhh/fichajes",
            params={"fecha_desde": "2026-01-01", "fecha_hasta": "2026-12-31"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestRRHHProductividad:
    """Test productividad endpoints from rrhh_productividad.py"""
    
    def test_get_productividad(self):
        """GET /api/rrhh/productividad returns productivity records"""
        response = requests.get(f"{BASE_URL}/api/rrhh/productividad")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "registros" in data
        assert "total" in data
        assert isinstance(data["registros"], list)
        print(f"Found {data['total']} productividad records")
    
    def test_get_productividad_stats(self):
        """GET /api/rrhh/productividad/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/rrhh/productividad/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "periodo" in data
        assert "totales" in data
        assert "top_empleados" in data
        assert "por_tipo_trabajo" in data
        print(f"Productividad stats: {data['totales']}")
    
    def test_get_productividad_tiempo_real(self):
        """GET /api/rrhh/productividad/tiempo-real returns real-time data"""
        response = requests.get(f"{BASE_URL}/api/rrhh/productividad/tiempo-real")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "fecha" in data
        assert "empleados_trabajando" in data
        assert "total_empleados_trabajando" in data
        assert "totales_hoy" in data
        print(f"Real-time: {data['total_empleados_trabajando']} empleados trabajando")


class TestRRHHDocumentos:
    """Test documentos endpoints from rrhh_documentos.py"""
    
    def test_get_documentos(self):
        """GET /api/rrhh/documentos returns documents list"""
        response = requests.get(f"{BASE_URL}/api/rrhh/documentos")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "documentos" in data
        assert "total" in data
        assert isinstance(data["documentos"], list)
        print(f"Found {data['total']} documentos")
    
    def test_get_documentos_with_filters(self):
        """GET /api/rrhh/documentos with type filter"""
        response = requests.get(
            f"{BASE_URL}/api/rrhh/documentos",
            params={"tipo": "contrato"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_get_documentos_estado_filter(self):
        """GET /api/rrhh/documentos with estado filter"""
        response = requests.get(
            f"{BASE_URL}/api/rrhh/documentos",
            params={"estado": "firmado"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestDashboardWidgets:
    """Test dashboard endpoints used by extracted widgets"""
    
    def test_dashboard_kpis(self, auth_headers):
        """GET /api/dashboard/kpis returns KPI data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "totales" in data
        assert "superficie" in data
        assert "produccion" in data
        assert "costes" in data
        assert "rentabilidad" in data
        # Check for fincas data (used by DashboardFincasWidget)
        if "fincas" in data:
            assert "total" in data["fincas"]
            assert "propias" in data["fincas"]
            assert "alquiladas" in data["fincas"]
        # Check for contratos_stats (used by DashboardContratosWidget)
        if "contratos_stats" in data:
            assert "total_activos" in data["contratos_stats"]
        print("Dashboard KPIs loaded successfully")
    
    def test_dashboard_config(self, auth_headers):
        """GET /api/dashboard/config returns widget configuration"""
        response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "available_widgets" in data
        widgets = data["available_widgets"]
        assert isinstance(widgets, list)
        assert len(widgets) > 0
        # Check widget structure
        for widget in widgets:
            assert "widget_id" in widget
            assert "name" in widget
        print(f"Found {len(widgets)} available widgets")
    
    def test_parcelas_for_map(self, auth_headers):
        """GET /api/parcelas returns parcelas for map widget"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "parcelas" in data
        parcelas = data["parcelas"]
        assert isinstance(parcelas, list)
        # Check for recintos (multi-zone feature)
        for parcela in parcelas:
            if "recintos" in parcela:
                assert isinstance(parcela["recintos"], list)
        print(f"Found {len(parcelas)} parcelas for map")
    
    def test_visitas_planificadas(self, auth_headers):
        """GET /api/visitas/planificadas returns planned visits for calendar"""
        response = requests.get(f"{BASE_URL}/api/visitas/planificadas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "visitas" in data
        visitas = data["visitas"]
        assert isinstance(visitas, list)
        print(f"Found {len(visitas)} planned visitas")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
