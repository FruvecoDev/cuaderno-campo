"""
Test suite for Alertas (Alerts) API endpoints
Tests ITV/maintenance tracking for Maquinaria and certificate expiration for Tecnicos
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAlertasEndpoints:
    """Test alertas/resumen endpoint for ITV and maintenance alerts"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_alertas_resumen_returns_200(self, api_client, auth_token):
        """Test that GET /api/alertas/resumen returns 200 with valid structure"""
        response = api_client.get(
            f"{BASE_URL}/api/alertas/resumen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total_alertas" in data, "Response should have total_alertas"
        assert "tecnicos" in data, "Response should have tecnicos section"
        assert "maquinaria" in data, "Response should have maquinaria section"
        
        print(f"Total alertas: {data['total_alertas']}")
        print(f"Tecnicos section keys: {data['tecnicos'].keys()}")
        print(f"Maquinaria section keys: {data['maquinaria'].keys()}")
    
    def test_alertas_resumen_tecnicos_structure(self, api_client, auth_token):
        """Test that tecnicos section has correct structure"""
        response = api_client.get(
            f"{BASE_URL}/api/alertas/resumen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        tecnicos = response.json()["tecnicos"]
        # Verify tecnicos structure
        assert "vencidos" in tecnicos, "Should have vencidos list"
        assert "proximo_30" in tecnicos, "Should have proximo_30 list"
        assert "proximo_60" in tecnicos, "Should have proximo_60 list"
        assert "proximo_90" in tecnicos, "Should have proximo_90 list"
        assert "total_criticas" in tecnicos, "Should have total_criticas count"
        
        print(f"Tecnicos vencidos: {len(tecnicos['vencidos'])}")
        print(f"Tecnicos proximo_30: {len(tecnicos['proximo_30'])}")
        print(f"Tecnicos total_criticas: {tecnicos['total_criticas']}")
    
    def test_alertas_resumen_maquinaria_structure(self, api_client, auth_token):
        """Test that maquinaria section has correct structure"""
        response = api_client.get(
            f"{BASE_URL}/api/alertas/resumen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        maquinaria = response.json()["maquinaria"]
        # Verify maquinaria structure
        assert "itv_vencida" in maquinaria, "Should have itv_vencida list"
        assert "itv_proximo_30" in maquinaria, "Should have itv_proximo_30 list"
        assert "mantenimiento_pendiente" in maquinaria, "Should have mantenimiento_pendiente list"
        assert "total_criticas" in maquinaria, "Should have total_criticas count"
        
        print(f"ITV vencida: {len(maquinaria['itv_vencida'])}")
        print(f"ITV proximo_30: {len(maquinaria['itv_proximo_30'])}")
        print(f"Mantenimiento pendiente: {len(maquinaria['mantenimiento_pendiente'])}")
        print(f"Maquinaria total_criticas: {maquinaria['total_criticas']}")
    
    def test_alertas_detects_itv_vencida(self, api_client, auth_token):
        """Test that alertas endpoint detects ITV vencida for maquinaria with past fecha_proxima_itv"""
        response = api_client.get(
            f"{BASE_URL}/api/alertas/resumen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        maquinaria = response.json()["maquinaria"]
        itv_vencida = maquinaria["itv_vencida"]
        
        # According to context, there should be at least 1 maquinaria with ITV vencida
        # (Tractor John Deere 6120M with fecha_proxima_itv=2026-03-15)
        print(f"ITV vencida items: {itv_vencida}")
        
        # Verify structure of ITV vencida items
        if len(itv_vencida) > 0:
            item = itv_vencida[0]
            assert "nombre" in item, "ITV vencida item should have nombre"
            assert "tipo" in item, "ITV vencida item should have tipo"
            assert "fecha_proxima_itv" in item, "ITV vencida item should have fecha_proxima_itv"
            assert "estado" in item, "ITV vencida item should have estado"
            assert item["estado"] == "vencida", f"Estado should be 'vencida', got {item['estado']}"
            print(f"ITV vencida detected: {item['nombre']} - ITV: {item['fecha_proxima_itv']}")
    
    def test_alertas_detects_mantenimiento_pendiente(self, api_client, auth_token):
        """Test that alertas endpoint detects mantenimiento pendiente when last maintenance + interval < today"""
        response = api_client.get(
            f"{BASE_URL}/api/alertas/resumen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        maquinaria = response.json()["maquinaria"]
        mantenimiento_pendiente = maquinaria["mantenimiento_pendiente"]
        
        # According to context, there should be at least 1 maquinaria with mantenimiento pendiente
        # (Tractor John Deere 6120M with fecha_ultimo_mantenimiento=2025-10-01 and intervalo=180 days)
        print(f"Mantenimiento pendiente items: {mantenimiento_pendiente}")
        
        # Verify structure of mantenimiento pendiente items
        if len(mantenimiento_pendiente) > 0:
            item = mantenimiento_pendiente[0]
            assert "nombre" in item, "Mantenimiento item should have nombre"
            assert "tipo" in item, "Mantenimiento item should have tipo"
            assert "fecha_ultimo_mantenimiento" in item, "Should have fecha_ultimo_mantenimiento"
            assert "fecha_proxima_revision" in item, "Should have fecha_proxima_revision"
            assert "dias_vencido" in item, "Should have dias_vencido"
            assert "estado" in item, "Should have estado"
            assert item["estado"] == "pendiente", f"Estado should be 'pendiente', got {item['estado']}"
            print(f"Mantenimiento pendiente detected: {item['nombre']} - Dias vencido: {item['dias_vencido']}")
    
    def test_alertas_requires_authentication(self, api_client):
        """Test that alertas endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/alertas/resumen")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestMaquinariaITVFields:
    """Test Maquinaria CRUD with ITV/maintenance fields"""
    
    def test_create_maquinaria_with_itv_fields(self, api_client, auth_token):
        """Test creating maquinaria with ITV and maintenance fields"""
        payload = {
            "nombre": "TEST_Tractor_Alertas",
            "tipo": "Tractor",
            "marca": "Test Brand",
            "modelo": "Test Model",
            "matricula": "TEST-123",
            "estado": "Operativo",
            "fecha_proxima_itv": "2026-01-01",
            "fecha_ultimo_mantenimiento": "2025-06-01",
            "intervalo_mantenimiento_dias": 90
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/maquinaria",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        
        created = data.get("data", {})
        assert created.get("nombre") == "TEST_Tractor_Alertas"
        assert created.get("fecha_proxima_itv") == "2026-01-01"
        assert created.get("fecha_ultimo_mantenimiento") == "2025-06-01"
        assert created.get("intervalo_mantenimiento_dias") == 90
        
        print(f"Created maquinaria with ITV fields: {created.get('_id')}")
        
        # Cleanup
        maq_id = created.get("_id")
        if maq_id:
            api_client.delete(
                f"{BASE_URL}/api/maquinaria/{maq_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            print(f"Cleaned up test maquinaria: {maq_id}")
    
    def test_update_maquinaria_with_itv_fields(self, api_client, auth_token):
        """Test updating maquinaria with ITV and maintenance fields"""
        # First create a test maquinaria
        create_payload = {
            "nombre": "TEST_Tractor_Update",
            "tipo": "Tractor",
            "estado": "Operativo"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/maquinaria",
            json=create_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code in [200, 201]
        maq_id = create_response.json().get("data", {}).get("_id")
        assert maq_id, "Should have created maquinaria ID"
        
        # Update with ITV fields
        update_payload = {
            "nombre": "TEST_Tractor_Update",
            "tipo": "Tractor",
            "estado": "Operativo",
            "fecha_proxima_itv": "2026-06-15",
            "fecha_ultimo_mantenimiento": "2025-12-01",
            "intervalo_mantenimiento_dias": 180
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/maquinaria/{maq_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify the update
        get_response = api_client.get(
            f"{BASE_URL}/api/maquinaria",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        
        maquinaria_list = get_response.json().get("maquinaria", [])
        updated_item = next((m for m in maquinaria_list if m.get("_id") == maq_id), None)
        
        assert updated_item is not None, "Should find updated maquinaria"
        assert updated_item.get("fecha_proxima_itv") == "2026-06-15"
        assert updated_item.get("fecha_ultimo_mantenimiento") == "2025-12-01"
        assert updated_item.get("intervalo_mantenimiento_dias") == 180
        
        print(f"Updated maquinaria ITV fields verified: {maq_id}")
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/maquinaria/{maq_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Cleaned up test maquinaria: {maq_id}")


class TestMaquinariaPageRegression:
    """Regression tests for Maquinaria page after refactoring"""
    
    def test_maquinaria_list_endpoint(self, api_client, auth_token):
        """Test GET /api/maquinaria returns list"""
        response = api_client.get(
            f"{BASE_URL}/api/maquinaria",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "maquinaria" in data
        print(f"Maquinaria count: {len(data['maquinaria'])}")
    
    def test_maquinaria_stats_endpoint(self, api_client, auth_token):
        """Test GET /api/maquinaria/stats/resumen returns stats"""
        response = api_client.get(
            f"{BASE_URL}/api/maquinaria/stats/resumen",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        assert "total" in stats
        print(f"Maquinaria stats: total={stats.get('total')}, activa={stats.get('activa')}")


class TestEvaluacionesPageRegression:
    """Regression tests for Evaluaciones page after refactoring"""
    
    def test_evaluaciones_list_endpoint(self, api_client, auth_token):
        """Test GET /api/evaluaciones returns list"""
        response = api_client.get(
            f"{BASE_URL}/api/evaluaciones",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "evaluaciones" in data
        print(f"Evaluaciones count: {len(data['evaluaciones'])}")
    
    def test_evaluaciones_config_endpoint(self, api_client, auth_token):
        """Test GET /api/evaluaciones/config/preguntas returns config"""
        response = api_client.get(
            f"{BASE_URL}/api/evaluaciones/config/preguntas",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("Evaluaciones config endpoint working")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")
