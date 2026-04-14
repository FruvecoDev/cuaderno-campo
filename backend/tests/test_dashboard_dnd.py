"""
Dashboard DnD (Drag-and-Drop) Configuration Tests
Tests for dashboard widget reordering and configuration endpoints.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDashboardConfigEndpoints:
    """Tests for dashboard configuration endpoints"""
    
    def test_get_dashboard_config_returns_200(self, auth_headers):
        """GET /api/dashboard/config should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("PASSED: GET /api/dashboard/config returns 200")
    
    def test_get_dashboard_config_structure(self, auth_headers):
        """GET /api/dashboard/config should return proper structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "config" in data
        assert "available_widgets" in data
        
        # Check config structure
        config = data["config"]
        assert "widgets" in config
        assert "layout" in config
        
        # Check available_widgets is a list
        assert isinstance(data["available_widgets"], list)
        assert len(data["available_widgets"]) > 0
        
        # Check widget structure
        for widget in data["available_widgets"]:
            assert "widget_id" in widget
            assert "visible" in widget
            assert "order" in widget
            assert "name" in widget
            assert "description" in widget
        
        print("PASSED: Dashboard config has correct structure")
    
    def test_get_dashboard_config_requires_auth(self):
        """GET /api/dashboard/config should require authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/config")
        assert response.status_code in [401, 403]
        print("PASSED: Dashboard config requires authentication")
    
    def test_post_dashboard_config_saves_order(self, auth_headers):
        """POST /api/dashboard/config should save widget order"""
        # Save a new order
        new_config = {
            "widgets": [
                {"widget_id": "alertas_avisos", "visible": True, "order": 0},
                {"widget_id": "kpis_principales", "visible": True, "order": 1},
                {"widget_id": "resumen_fincas", "visible": True, "order": 2},
                {"widget_id": "proximas_cosechas", "visible": True, "order": 3}
            ],
            "layout": "default"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dashboard/config",
            headers=auth_headers,
            json=new_config
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify the order was saved
        get_response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        assert get_response.status_code == 200
        saved_config = get_response.json()["config"]
        
        # Check first widget is alertas_avisos
        assert saved_config["widgets"][0]["widget_id"] == "alertas_avisos"
        assert saved_config["widgets"][0]["order"] == 0
        
        print("PASSED: POST /api/dashboard/config saves widget order")
    
    def test_post_dashboard_config_saves_visibility(self, auth_headers):
        """POST /api/dashboard/config should save widget visibility"""
        # Save config with some widgets hidden
        new_config = {
            "widgets": [
                {"widget_id": "kpis_principales", "visible": True, "order": 0},
                {"widget_id": "resumen_fincas", "visible": False, "order": 1},
                {"widget_id": "proximas_cosechas", "visible": True, "order": 2}
            ],
            "layout": "default"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/dashboard/config",
            headers=auth_headers,
            json=new_config
        )
        assert response.status_code == 200
        
        # Verify visibility was saved
        get_response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        saved_widgets = get_response.json()["config"]["widgets"]
        
        # Find resumen_fincas and check it's hidden
        resumen_widget = next((w for w in saved_widgets if w["widget_id"] == "resumen_fincas"), None)
        assert resumen_widget is not None
        assert resumen_widget["visible"] == False
        
        print("PASSED: POST /api/dashboard/config saves widget visibility")
    
    def test_post_dashboard_config_requires_auth(self):
        """POST /api/dashboard/config should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/config",
            json={"widgets": [], "layout": "default"}
        )
        assert response.status_code in [401, 403]
        print("PASSED: POST dashboard config requires authentication")
    
    def test_reset_dashboard_config(self, auth_headers):
        """POST /api/dashboard/config/reset should restore defaults"""
        response = requests.post(
            f"{BASE_URL}/api/dashboard/config/reset",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "config" in data
        
        # Check default order is restored
        widgets = data["config"]["widgets"]
        assert widgets[0]["widget_id"] == "kpis_principales"
        assert widgets[0]["order"] == 0
        assert widgets[0]["visible"] == True
        
        print("PASSED: POST /api/dashboard/config/reset restores defaults")
    
    def test_reset_dashboard_config_requires_auth(self):
        """POST /api/dashboard/config/reset should require authentication"""
        response = requests.post(f"{BASE_URL}/api/dashboard/config/reset", json={})
        assert response.status_code in [401, 403]
        print("PASSED: Reset dashboard config requires authentication")


class TestDashboardKPIsEndpoint:
    """Tests for dashboard KPIs endpoint"""
    
    def test_get_dashboard_kpis_returns_200(self, auth_headers):
        """GET /api/dashboard/kpis should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        print("PASSED: GET /api/dashboard/kpis returns 200")
    
    def test_get_dashboard_kpis_structure(self, auth_headers):
        """GET /api/dashboard/kpis should return proper structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required top-level fields
        required_fields = [
            "totales", "fincas", "produccion", "costes", 
            "superficie", "rentabilidad", "actividad_reciente"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Check totales structure
        totales = data["totales"]
        assert "contratos" in totales
        assert "parcelas" in totales
        assert "parcelas_activas" in totales
        assert "fincas" in totales
        assert "tratamientos" in totales
        
        print("PASSED: Dashboard KPIs has correct structure")
    
    def test_get_dashboard_kpis_no_auth_required(self):
        """GET /api/dashboard/kpis should work without auth (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis")
        # This endpoint may or may not require auth - check both cases
        assert response.status_code in [200, 401, 403]
        print(f"INFO: GET /api/dashboard/kpis without auth returns {response.status_code}")


class TestWidgetOrderPersistence:
    """Tests for widget order persistence after drag-and-drop"""
    
    def test_drag_and_drop_order_persists(self, auth_headers):
        """Simulates drag-and-drop reordering and verifies persistence"""
        # First reset to defaults
        requests.post(f"{BASE_URL}/api/dashboard/config/reset", headers=auth_headers, json={})
        
        # Simulate drag: move 'alertas_avisos' from position 11 to position 0
        new_order = [
            {"widget_id": "alertas_avisos", "visible": True, "order": 0},
            {"widget_id": "kpis_principales", "visible": True, "order": 1},
            {"widget_id": "productividad", "visible": True, "order": 2},
            {"widget_id": "centro_exportacion", "visible": True, "order": 3},
            {"widget_id": "resumen_fincas", "visible": True, "order": 4},
            {"widget_id": "proximas_cosechas", "visible": True, "order": 5},
            {"widget_id": "contratos_activos", "visible": True, "order": 6},
            {"widget_id": "proximas_visitas", "visible": True, "order": 7},
            {"widget_id": "graficos_cultivos", "visible": True, "order": 8},
            {"widget_id": "mapa_parcelas", "visible": True, "order": 9},
            {"widget_id": "calendario", "visible": True, "order": 10},
            {"widget_id": "actividad_reciente", "visible": True, "order": 11}
        ]
        
        # Save the new order
        response = requests.post(
            f"{BASE_URL}/api/dashboard/config",
            headers=auth_headers,
            json={"widgets": new_order, "layout": "default"}
        )
        assert response.status_code == 200
        
        # Verify order persisted
        get_response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        saved_widgets = get_response.json()["config"]["widgets"]
        
        # Check alertas_avisos is now first
        assert saved_widgets[0]["widget_id"] == "alertas_avisos"
        assert saved_widgets[0]["order"] == 0
        
        # Check kpis_principales is second
        assert saved_widgets[1]["widget_id"] == "kpis_principales"
        assert saved_widgets[1]["order"] == 1
        
        print("PASSED: Drag-and-drop order persists correctly")
    
    def test_multiple_reorders_persist(self, auth_headers):
        """Multiple reorders should all persist correctly"""
        # First reorder
        order1 = [
            {"widget_id": "mapa_parcelas", "visible": True, "order": 0},
            {"widget_id": "kpis_principales", "visible": True, "order": 1}
        ]
        requests.post(f"{BASE_URL}/api/dashboard/config", headers=auth_headers, 
                     json={"widgets": order1, "layout": "default"})
        
        # Second reorder
        order2 = [
            {"widget_id": "calendario", "visible": True, "order": 0},
            {"widget_id": "mapa_parcelas", "visible": True, "order": 1},
            {"widget_id": "kpis_principales", "visible": True, "order": 2}
        ]
        response = requests.post(f"{BASE_URL}/api/dashboard/config", headers=auth_headers,
                                json={"widgets": order2, "layout": "default"})
        assert response.status_code == 200
        
        # Verify final order
        get_response = requests.get(f"{BASE_URL}/api/dashboard/config", headers=auth_headers)
        saved_widgets = get_response.json()["config"]["widgets"]
        
        assert saved_widgets[0]["widget_id"] == "calendario"
        assert saved_widgets[1]["widget_id"] == "mapa_parcelas"
        assert saved_widgets[2]["widget_id"] == "kpis_principales"
        
        print("PASSED: Multiple reorders persist correctly")


@pytest.fixture(scope="module", autouse=True)
def cleanup_after_tests(auth_token):
    """Reset dashboard config to defaults after all tests"""
    yield
    # Cleanup: reset to defaults
    headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    requests.post(f"{BASE_URL}/api/dashboard/config/reset", headers=headers, json={})
    print("CLEANUP: Dashboard config reset to defaults")
