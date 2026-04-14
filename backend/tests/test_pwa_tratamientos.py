"""
Test PWA assets and Tratamientos module after refactoring
Tests: PWA manifest, service-worker, icons, Tratamientos CRUD and stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": os.environ.get("TEST_EMAIL", ""),
        "password": os.environ.get("TEST_PASSWORD", "")
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")

@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestPWAAssets:
    """PWA manifest, service-worker, and icons accessibility tests"""
    
    def test_manifest_json_accessible(self):
        """manifest.json should be accessible at /manifest.json"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        assert data["short_name"] == "FRUVECO"
        assert data["name"] == "FRUVECO - Cuaderno de Campo"
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#1565c0"
        assert len(data["icons"]) >= 8
        print("PASSED: manifest.json accessible with correct content")
    
    def test_service_worker_accessible(self):
        """service-worker.js should be accessible"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "javascript" in content_type  # Can be text/javascript or application/javascript
        assert "CACHE_NAME" in response.text or "fruveco-pwa" in response.text
        print("PASSED: service-worker.js accessible")
    
    def test_icon_192x192_accessible(self):
        """PWA icon 192x192 should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-192x192.png")
        assert response.status_code == 200
        assert "image/png" in response.headers.get("content-type", "")
        print("PASSED: icon-192x192.png accessible")
    
    def test_icon_512x512_accessible(self):
        """PWA icon 512x512 should be accessible"""
        response = requests.get(f"{BASE_URL}/icons/icon-512x512.png")
        assert response.status_code == 200
        assert "image/png" in response.headers.get("content-type", "")
        print("PASSED: icon-512x512.png accessible")


class TestTratamientosAPI:
    """Tratamientos CRUD and stats API tests"""
    
    def test_get_tratamientos_list(self, auth_headers):
        """GET /api/tratamientos should return list"""
        response = requests.get(f"{BASE_URL}/api/tratamientos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tratamientos" in data
        assert isinstance(data["tratamientos"], list)
        print(f"PASSED: GET /api/tratamientos returns {len(data['tratamientos'])} tratamientos")
    
    def test_get_tratamientos_stats(self, auth_headers):
        """GET /api/tratamientos/stats/dashboard should return KPI statistics"""
        response = requests.get(f"{BASE_URL}/api/tratamientos/stats/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        assert "total" in stats
        assert "realizados" in stats
        assert "pendientes" in stats
        assert "superficie_total" in stats
        print(f"PASSED: Stats - Total: {stats['total']}, Realizados: {stats['realizados']}, Pendientes: {stats['pendientes']}")
    
    def test_get_parcelas_for_tratamientos(self, auth_headers):
        """GET /api/parcelas should return parcelas for tratamiento form"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "parcelas" in data
        print(f"PASSED: GET /api/parcelas returns {len(data['parcelas'])} parcelas")
    
    def test_get_maquinaria_for_tratamientos(self, auth_headers):
        """GET /api/maquinaria should return maquinaria for tratamiento form"""
        response = requests.get(f"{BASE_URL}/api/maquinaria", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "maquinaria" in data
        print(f"PASSED: GET /api/maquinaria returns {len(data['maquinaria'])} items")
    
    def test_get_tecnicos_aplicadores(self, auth_headers):
        """GET /api/tecnicos-aplicadores/activos should return active technicians"""
        response = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/activos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tecnicos" in data
        print(f"PASSED: GET /api/tecnicos-aplicadores/activos returns {len(data['tecnicos'])} tecnicos")
    
    def test_get_fitosanitarios_for_calculadora(self, auth_headers):
        """GET /api/fitosanitarios should return products for calculadora"""
        response = requests.get(f"{BASE_URL}/api/fitosanitarios?tipo=Insecticida&activo=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "productos" in data
        print(f"PASSED: GET /api/fitosanitarios returns {len(data['productos'])} productos")


class TestOtherPagesRegression:
    """Regression tests for other pages that should still work"""
    
    def test_dashboard_loads(self, auth_headers):
        """Dashboard KPIs endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=auth_headers)
        assert response.status_code == 200
        print("PASSED: Dashboard KPIs endpoint working")
    
    def test_erp_integration_page(self, auth_headers):
        """ERP Integration endpoints should work"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/stats", headers=auth_headers)
        assert response.status_code == 200
        print("PASSED: ERP Integration stats endpoint working")
    
    def test_sigpac_provincias(self, auth_headers):
        """SIGPAC provincias endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/sigpac/provincias", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "provincias" in data
        print(f"PASSED: SIGPAC provincias returns {len(data['provincias'])} provinces")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
