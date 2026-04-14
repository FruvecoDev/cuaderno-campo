"""
Test ERP Sync Bidirectional and SIGPAC Integration APIs
Tests for:
- ERP API Keys management (CRUD)
- ERP Webhooks management (CRUD, toggle, test)
- ERP Export functionality (modules, data export)
- ERP Sync History and Stats
- SIGPAC Consulta (parcel search)
- SIGPAC Import (import parcel to system)
- SIGPAC Reference data (provincias, usos)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ==================== ERP API KEYS TESTS ====================

class TestERPApiKeys:
    """Tests for ERP API Keys management"""
    
    created_key_id = None
    
    def test_list_api_keys_returns_200(self, auth_headers):
        """GET /api/erp/sync/api-keys returns 200"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/api-keys", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        print(f"API Keys count: {len(data['data'])}")
    
    def test_list_api_keys_structure(self, auth_headers):
        """API keys list has correct structure"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/api-keys", headers=auth_headers)
        data = response.json()
        if data["data"]:
            key = data["data"][0]
            assert "id" in key
            assert "nombre" in key
            assert "key_preview" in key
            assert "permisos" in key
            print(f"First key: {key['nombre']} - {key['key_preview']}")
    
    def test_create_api_key(self, auth_headers):
        """POST /api/erp/sync/api-keys creates new key"""
        payload = {
            "nombre": "TEST_ERP_Key",
            "descripcion": "Test API key for pytest",
            "permisos": ["read", "write"]
        }
        response = requests.post(f"{BASE_URL}/api/erp/sync/api-keys", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "api_key" in data["data"]
        assert data["data"]["api_key"].startswith("fruveco_")
        TestERPApiKeys.created_key_id = data["data"]["id"]
        print(f"Created API key: {data['data']['id']} - {data['data']['api_key'][:20]}...")
    
    def test_revoke_api_key(self, auth_headers):
        """DELETE /api/erp/sync/api-keys/{id} revokes key"""
        if not TestERPApiKeys.created_key_id:
            pytest.skip("No key to revoke")
        response = requests.delete(
            f"{BASE_URL}/api/erp/sync/api-keys/{TestERPApiKeys.created_key_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Revoked API key: {TestERPApiKeys.created_key_id}")
    
    def test_api_keys_requires_admin(self):
        """API keys endpoints require admin role"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/api-keys")
        assert response.status_code in [401, 403]


# ==================== ERP WEBHOOKS TESTS ====================

class TestERPWebhooks:
    """Tests for ERP Webhooks management"""
    
    created_webhook_id = None
    
    def test_list_webhooks_returns_200(self, auth_headers):
        """GET /api/erp/sync/webhooks returns 200"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/webhooks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        print(f"Webhooks count: {len(data['data'])}")
    
    def test_create_webhook(self, auth_headers):
        """POST /api/erp/sync/webhooks creates new webhook"""
        payload = {
            "url": "https://example.com/webhook/test",
            "nombre": "TEST_Webhook",
            "eventos": ["create", "update"],
            "modulos": ["contratos", "parcelas"],
            "activo": True
        }
        response = requests.post(f"{BASE_URL}/api/erp/sync/webhooks", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "secret" in data["data"]
        TestERPWebhooks.created_webhook_id = data["data"]["id"]
        print(f"Created webhook: {data['data']['id']} - {data['data']['nombre']}")
    
    def test_toggle_webhook(self, auth_headers):
        """POST /api/erp/sync/webhooks/{id}/toggle toggles active state"""
        if not TestERPWebhooks.created_webhook_id:
            pytest.skip("No webhook to toggle")
        response = requests.post(
            f"{BASE_URL}/api/erp/sync/webhooks/{TestERPWebhooks.created_webhook_id}/toggle",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "activo" in data
        print(f"Toggled webhook, new state: activo={data['activo']}")
    
    def test_delete_webhook(self, auth_headers):
        """DELETE /api/erp/sync/webhooks/{id} deletes webhook"""
        if not TestERPWebhooks.created_webhook_id:
            pytest.skip("No webhook to delete")
        response = requests.delete(
            f"{BASE_URL}/api/erp/sync/webhooks/{TestERPWebhooks.created_webhook_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Deleted webhook: {TestERPWebhooks.created_webhook_id}")


# ==================== ERP EXPORT TESTS ====================

class TestERPExport:
    """Tests for ERP Export functionality"""
    
    def test_list_export_modules(self, auth_headers):
        """GET /api/erp/sync/export-modules returns module list with counts"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/export-modules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "modules" in data
        assert len(data["modules"]) > 0
        # Check structure
        module = data["modules"][0]
        assert "module" in module
        assert "registros" in module
        print(f"Export modules: {len(data['modules'])} modules available")
        for m in data["modules"][:5]:
            print(f"  - {m['module']}: {m['registros']} records")
    
    def test_export_contratos_module(self, auth_headers):
        """GET /api/erp/sync/export/contratos returns paginated data"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/export/contratos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("module") == "contratos"
        assert "total" in data
        assert "pagina" in data
        assert "data" in data
        print(f"Exported contratos: {len(data['data'])} of {data['total']} total (page {data['pagina']})")
    
    def test_export_parcelas_module(self, auth_headers):
        """GET /api/erp/sync/export/parcelas returns paginated data"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/export/parcelas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("module") == "parcelas"
        print(f"Exported parcelas: {len(data['data'])} of {data['total']} total")
    
    def test_export_invalid_module(self, auth_headers):
        """GET /api/erp/sync/export/invalid returns 400"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/export/invalid_module", headers=auth_headers)
        assert response.status_code == 400


# ==================== ERP HISTORY & STATS TESTS ====================

class TestERPHistoryStats:
    """Tests for ERP Sync History and Statistics"""
    
    def test_get_sync_history(self, auth_headers):
        """GET /api/erp/sync/history returns sync logs"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        print(f"Sync history: {len(data['data'])} entries")
        if data["data"]:
            entry = data["data"][0]
            print(f"  Latest: {entry.get('tipo')} - {entry.get('modulo')} at {entry.get('timestamp')}")
    
    def test_get_sync_history_filter_by_type(self, auth_headers):
        """GET /api/erp/sync/history?tipo=export filters by type"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/history?tipo=export", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # All entries should be export type
        for entry in data["data"]:
            assert entry.get("tipo") == "export"
        print(f"Export history entries: {len(data['data'])}")
    
    def test_get_sync_stats(self, auth_headers):
        """GET /api/erp/sync/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/erp/sync/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        stats = data["stats"]
        assert "api_keys_activas" in stats
        assert "webhooks_total" in stats
        assert "webhooks_activos" in stats
        assert "sincronizaciones_total" in stats
        print(f"Stats: {stats['api_keys_activas']} API keys, {stats['webhooks_activos']}/{stats['webhooks_total']} webhooks, {stats['sincronizaciones_total']} syncs")


# ==================== SIGPAC TESTS ====================

class TestSIGPAC:
    """Tests for SIGPAC Integration"""
    
    def test_get_provincias(self, auth_headers):
        """GET /api/sigpac/provincias returns 52 Spanish provinces"""
        response = requests.get(f"{BASE_URL}/api/sigpac/provincias", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "provincias" in data
        assert len(data["provincias"]) == 52
        # Check structure
        prov = data["provincias"][0]
        assert "codigo" in prov
        assert "nombre" in prov
        print(f"Provincias: {len(data['provincias'])} (first: {prov['codigo']} - {prov['nombre']})")
    
    def test_get_usos(self, auth_headers):
        """GET /api/sigpac/usos returns SIGPAC land use codes"""
        response = requests.get(f"{BASE_URL}/api/sigpac/usos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "usos" in data
        assert len(data["usos"]) > 0
        # Check structure
        uso = data["usos"][0]
        assert "codigo" in uso
        assert "descripcion" in uso
        print(f"Usos SIGPAC: {len(data['usos'])} codes (first: {uso['codigo']} - {uso['descripcion']})")
    
    def test_get_wms_config(self, auth_headers):
        """GET /api/sigpac/wms-config returns WMS configuration"""
        response = requests.get(f"{BASE_URL}/api/sigpac/wms-config", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "wms" in data
        wms = data["wms"]
        assert "url" in wms
        assert "layers" in wms
        assert "format" in wms
        print(f"WMS config: {wms['url']} - layer: {wms['layers']}")
    
    def test_consulta_sigpac_murcia(self, auth_headers):
        """GET /api/sigpac/consulta searches parcel in Murcia (30/038/15/120)"""
        params = {
            "provincia": "30",
            "municipio": "038",
            "agregado": "0",
            "zona": "0",
            "poligono": "15",
            "parcela": "120"
        }
        response = requests.get(f"{BASE_URL}/api/sigpac/consulta", params=params, headers=auth_headers, timeout=20)
        assert response.status_code == 200
        data = response.json()
        # SIGPAC external API may timeout or return no data
        if data.get("success"):
            assert "data" in data
            assert "referencia" in data
            print(f"SIGPAC consulta: {data.get('total_recintos', 0)} recintos found for {data.get('referencia')}")
            if data["data"]:
                recinto = data["data"][0]
                print(f"  First recinto: uso={recinto.get('uso_sigpac')}, superficie={recinto.get('superficie_ha')} ha")
        else:
            print(f"SIGPAC consulta returned: {data.get('message')} (external API may be slow)")
    
    def test_consulta_sigpac_missing_params(self, auth_headers):
        """GET /api/sigpac/consulta without required params returns 422"""
        response = requests.get(f"{BASE_URL}/api/sigpac/consulta", headers=auth_headers)
        assert response.status_code == 422  # Validation error
    
    def test_importar_sigpac_parcela(self, auth_headers):
        """POST /api/sigpac/importar creates parcela from SIGPAC data"""
        # Use unique reference to avoid duplicate error
        timestamp = datetime.now().strftime("%H%M%S")
        payload = {
            "sigpac_ref": {
                "provincia": "30",
                "municipio": "038",
                "agregado": "0",
                "zona": "0",
                "poligono": "99",  # Use unlikely poligono to avoid duplicates
                "parcela": timestamp[-3:]  # Use timestamp for uniqueness
            },
            "nombre": f"TEST_SIGPAC_Parcela_{timestamp}",
            "cultivo": "Guisante",
            "campana": "2025/26"
        }
        response = requests.post(f"{BASE_URL}/api/sigpac/importar", json=payload, headers=auth_headers, timeout=20)
        # May return 200 (success) or 409 (duplicate)
        assert response.status_code in [200, 409]
        data = response.json()
        if response.status_code == 200:
            assert data.get("success") == True
            assert "data" in data
            assert data["data"].get("codigo", "").startswith("SIGPAC-")
            print(f"Imported SIGPAC parcela: {data['data']['codigo']} - {data['data']['sigpac_referencia']}")
        else:
            print(f"Import returned 409 (duplicate): {data.get('detail')}")


# ==================== SIDEBAR NAVIGATION TESTS ====================

class TestSidebarLinks:
    """Tests to verify sidebar links are accessible"""
    
    def test_integracion_erp_page_accessible(self, auth_headers):
        """Verify /integracion-erp route is accessible (via API check)"""
        # We test the backend endpoints that the page uses
        response = requests.get(f"{BASE_URL}/api/erp/sync/stats", headers=auth_headers)
        assert response.status_code == 200
        print("ERP Integration page backend accessible")
    
    def test_consulta_sigpac_page_accessible(self, auth_headers):
        """Verify /consulta-sigpac route is accessible (via API check)"""
        # We test the backend endpoints that the page uses
        response = requests.get(f"{BASE_URL}/api/sigpac/provincias", headers=auth_headers)
        assert response.status_code == 200
        print("SIGPAC Consulta page backend accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
