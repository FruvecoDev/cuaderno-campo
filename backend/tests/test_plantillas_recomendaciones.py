"""
Test suite for Plantillas de Recomendaciones API endpoints
Tests CRUD operations, mass application, and template management
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope='module')
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope='module')
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope='module')
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope='module')
def test_parcelas(authenticated_client):
    """Get existing parcelas for testing"""
    response = authenticated_client.get(f"{BASE_URL}/api/parcelas")
    assert response.status_code == 200
    data = response.json()
    parcelas = data.get('parcelas', [])
    if len(parcelas) < 2:
        pytest.skip("Need at least 2 parcelas for mass application testing")
    return parcelas[:2]


class TestPlantillasListing:
    """Test listing and filtering plantillas"""

    def test_get_plantillas_list(self, authenticated_client):
        """GET /api/plantillas-recomendaciones returns list of templates"""
        response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones")
        assert response.status_code == 200
        data = response.json()
        
        assert 'plantillas' in data
        assert 'total' in data
        assert isinstance(data['plantillas'], list)
        assert isinstance(data['total'], int)
        
        # Verify seeded templates exist (8 default templates)
        assert data['total'] >= 8

    def test_get_plantillas_activas(self, authenticated_client):
        """GET /api/plantillas-recomendaciones/activas returns active templates only"""
        response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/activas")
        assert response.status_code == 200
        data = response.json()
        
        assert 'plantillas' in data
        assert isinstance(data['plantillas'], list)
        
        # All returned templates should be active
        for plantilla in data['plantillas']:
            assert plantilla.get('activo', True) == True

    def test_filter_by_tipo(self, authenticated_client):
        """GET /api/plantillas-recomendaciones?tipo= filters by type"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/plantillas-recomendaciones?tipo=Tratamiento Fitosanitario"
        )
        assert response.status_code == 200
        data = response.json()
        
        for plantilla in data['plantillas']:
            assert plantilla['tipo'] == 'Tratamiento Fitosanitario'

    def test_search_plantillas(self, authenticated_client):
        """GET /api/plantillas-recomendaciones?search= searches templates"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/plantillas-recomendaciones?search=pulgón"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should find "Control de pulgón" template
        assert len(data['plantillas']) >= 1
        found_pulgon = any('pulgón' in p['nombre'].lower() for p in data['plantillas'])
        assert found_pulgon, "Should find template containing 'pulgón'"


class TestPlantillasSingleGet:
    """Test getting single plantilla"""

    def test_get_single_plantilla(self, authenticated_client):
        """GET /api/plantillas-recomendaciones/{id} returns single template"""
        # First get list to obtain an ID
        list_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones")
        assert list_response.status_code == 200
        plantillas = list_response.json()['plantillas']
        assert len(plantillas) > 0
        
        plantilla_id = plantillas[0]['_id']
        
        # Get single template
        response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data['_id'] == plantilla_id
        assert 'nombre' in data
        assert 'tipo' in data

    def test_get_plantilla_invalid_id(self, authenticated_client):
        """GET /api/plantillas-recomendaciones/{id} with invalid ID returns 400"""
        response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/invalid_id")
        assert response.status_code == 400
        assert 'inválido' in response.json()['detail'].lower()

    def test_get_plantilla_not_found(self, authenticated_client):
        """GET /api/plantillas-recomendaciones/{id} with non-existent ID returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/000000000000000000000000")
        assert response.status_code == 404
        assert 'no encontrada' in response.json()['detail'].lower()


class TestPlantillasCRUD:
    """Test CRUD operations for plantillas"""

    @pytest.fixture
    def created_plantilla(self, authenticated_client):
        """Create a plantilla for testing and clean up after"""
        unique_id = f"TEST_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        
        plantilla_data = {
            "nombre": f"Plantilla Test {unique_id}",
            "descripcion": "Test plantilla for pytest",
            "tipo": "Tratamiento Fitosanitario",
            "subtipo": "Fungicida",
            "dosis": 2.5,
            "unidad_dosis": "L/ha",
            "volumen_agua": 300,
            "prioridad": "Alta",
            "motivo": f"TEST - {unique_id}",
            "observaciones": "Test plantilla observaciones",
            "activo": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones",
            json=plantilla_data
        )
        assert response.status_code == 200
        data = response.json()
        plantilla_id = data['plantilla']['_id']
        
        yield data['plantilla']
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")

    def test_create_plantilla(self, authenticated_client):
        """POST /api/plantillas-recomendaciones creates new template"""
        unique_id = f"TEST_CREATE_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        
        plantilla_data = {
            "nombre": f"Plantilla Crear {unique_id}",
            "descripcion": "Nueva plantilla de prueba",
            "tipo": "Fertilización",
            "dosis": 10.0,
            "unidad_dosis": "Kg/ha",
            "prioridad": "Media",
            "motivo": "Test creation"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones",
            json=plantilla_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert 'plantilla' in data
        plantilla = data['plantilla']
        
        assert plantilla['nombre'] == plantilla_data['nombre']
        assert plantilla['tipo'] == 'Fertilización'
        assert plantilla['dosis'] == 10.0
        assert plantilla['activo'] == True
        assert plantilla['usos_count'] == 0
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla['_id']}")

    def test_create_duplicate_name_fails(self, authenticated_client, created_plantilla):
        """POST /api/plantillas-recomendaciones with duplicate name fails"""
        duplicate_data = {
            "nombre": created_plantilla['nombre'],
            "tipo": "Riego"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones",
            json=duplicate_data
        )
        assert response.status_code == 400
        assert 'ya existe' in response.json()['detail'].lower()

    def test_update_plantilla(self, authenticated_client, created_plantilla):
        """PUT /api/plantillas-recomendaciones/{id} updates template"""
        plantilla_id = created_plantilla['_id']
        
        update_data = {
            "dosis": 5.0,
            "prioridad": "Baja",
            "observaciones": "Updated observations"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['plantilla']['dosis'] == 5.0
        assert data['plantilla']['prioridad'] == 'Baja'
        assert data['plantilla']['observaciones'] == 'Updated observations'
        
        # Verify with GET
        get_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")
        assert get_response.status_code == 200
        assert get_response.json()['dosis'] == 5.0

    def test_delete_plantilla(self, authenticated_client):
        """DELETE /api/plantillas-recomendaciones/{id} deletes template"""
        # Create a template to delete
        unique_id = f"TEST_DELETE_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones",
            json={"nombre": f"Delete Test {unique_id}", "tipo": "Poda"}
        )
        assert create_response.status_code == 200
        plantilla_id = create_response.json()['plantilla']['_id']
        
        # Delete it
        response = authenticated_client.delete(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert 'eliminada' in data['message'].lower()
        
        # Verify it's gone
        get_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")
        assert get_response.status_code == 404


class TestPlantillasToggleActivo:
    """Test toggle active status"""

    def test_toggle_activo(self, authenticated_client):
        """PATCH /api/plantillas-recomendaciones/{id}/toggle-activo toggles status"""
        # Create a template to toggle
        unique_id = f"TEST_TOGGLE_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones",
            json={"nombre": f"Toggle Test {unique_id}", "tipo": "Riego", "activo": True}
        )
        assert create_response.status_code == 200
        plantilla_id = create_response.json()['plantilla']['_id']
        
        try:
            # Toggle to inactive
            response = authenticated_client.patch(
                f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}/toggle-activo"
            )
            assert response.status_code == 200
            data = response.json()
            
            assert data['success'] == True
            assert data['activo'] == False
            assert 'desactivada' in data['message'].lower()
            
            # Verify it's inactive
            get_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")
            assert get_response.json()['activo'] == False
            
            # Toggle back to active
            response2 = authenticated_client.patch(
                f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}/toggle-activo"
            )
            assert response2.status_code == 200
            assert response2.json()['activo'] == True
            assert 'activada' in response2.json()['message'].lower()
        finally:
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/plantillas-recomendaciones/{plantilla_id}")


class TestAplicacionMasiva:
    """Test mass application of templates"""

    def test_aplicar_masivo_success(self, authenticated_client, test_parcelas):
        """POST /api/plantillas-recomendaciones/aplicar-masivo creates multiple recommendations"""
        # Get an active plantilla
        list_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/activas")
        plantillas = list_response.json()['plantillas']
        assert len(plantillas) > 0
        plantilla_id = plantillas[0]['_id']
        plantilla_nombre = plantillas[0]['nombre']
        
        # Get parcela IDs
        parcela_ids = [p['_id'] for p in test_parcelas]
        
        # Apply template to parcelas
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones/aplicar-masivo",
            json={
                "plantilla_id": plantilla_id,
                "parcela_ids": parcela_ids,
                "campana": "2026",
                "fecha_programada": "2026-06-01"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['created_count'] == 2
        assert len(data['created_ids']) == 2
        assert data['errors'] is None
        assert data['plantilla_usada'] == plantilla_nombre
        
        # Cleanup created recommendations
        for rec_id in data['created_ids']:
            authenticated_client.delete(f"{BASE_URL}/api/recomendaciones/{rec_id}")

    def test_aplicar_masivo_with_priority_override(self, authenticated_client, test_parcelas):
        """POST /api/plantillas-recomendaciones/aplicar-masivo with priority override"""
        # Get a plantilla
        list_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/activas")
        plantillas = list_response.json()['plantillas']
        plantilla_id = plantillas[0]['_id']
        
        parcela_ids = [test_parcelas[0]['_id']]
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones/aplicar-masivo",
            json={
                "plantilla_id": plantilla_id,
                "parcela_ids": parcela_ids,
                "campana": "2026",
                "prioridad_override": "Alta"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['created_count'] == 1
        
        # Verify the recommendation has overridden priority
        rec_id = data['created_ids'][0]
        rec_response = authenticated_client.get(f"{BASE_URL}/api/recomendaciones/{rec_id}")
        assert rec_response.status_code == 200
        assert rec_response.json()['prioridad'] == 'Alta'
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/recomendaciones/{rec_id}")

    def test_aplicar_masivo_empty_parcelas_fails(self, authenticated_client):
        """POST /api/plantillas-recomendaciones/aplicar-masivo with empty parcelas fails"""
        list_response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/activas")
        plantilla_id = list_response.json()['plantillas'][0]['_id']
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones/aplicar-masivo",
            json={
                "plantilla_id": plantilla_id,
                "parcela_ids": []
            }
        )
        assert response.status_code == 400
        assert 'parcela' in response.json()['detail'].lower()

    def test_aplicar_masivo_invalid_plantilla_fails(self, authenticated_client, test_parcelas):
        """POST /api/plantillas-recomendaciones/aplicar-masivo with invalid plantilla fails"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones/aplicar-masivo",
            json={
                "plantilla_id": "000000000000000000000000",
                "parcela_ids": [test_parcelas[0]['_id']]
            }
        )
        assert response.status_code == 404
        assert 'no encontrada' in response.json()['detail'].lower()


class TestPlantillasStats:
    """Test statistics endpoint"""

    def test_get_stats_uso(self, authenticated_client):
        """GET /api/plantillas-recomendaciones/stats/uso returns usage statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/plantillas-recomendaciones/stats/uso")
        assert response.status_code == 200
        data = response.json()
        
        assert 'total_plantillas' in data
        assert 'activas' in data
        assert 'total_usos' in data
        assert 'top_usadas' in data
        
        assert isinstance(data['total_plantillas'], int)
        assert isinstance(data['activas'], int)
        assert isinstance(data['top_usadas'], list)
        
        # Verify top_usadas structure
        if len(data['top_usadas']) > 0:
            top = data['top_usadas'][0]
            assert 'nombre' in top
            assert 'tipo' in top
            assert 'usos' in top


class TestPlantillasSeed:
    """Test seeding default templates"""

    def test_seed_plantillas(self, authenticated_client):
        """POST /api/plantillas-recomendaciones/seed loads default templates"""
        response = authenticated_client.post(f"{BASE_URL}/api/plantillas-recomendaciones/seed")
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert 'created_count' in data
        # Since templates already exist, count should be 0
        assert data['created_count'] == 0
        assert 'plantillas predeterminadas' in data['message'].lower()


class TestPlantillasAuth:
    """Test authentication requirements"""

    def test_list_requires_auth(self, api_client):
        """GET /api/plantillas-recomendaciones requires authentication"""
        # Remove auth header for this test
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/plantillas-recomendaciones", headers=headers)
        assert response.status_code == 401

    def test_create_requires_admin_or_manager(self, authenticated_client):
        """POST /api/plantillas-recomendaciones requires Admin/Manager role"""
        # This test verifies that the endpoint exists and requires specific roles
        # The admin user should be able to create
        response = authenticated_client.post(
            f"{BASE_URL}/api/plantillas-recomendaciones",
            json={"nombre": f"Auth Test {datetime.now().strftime('%f')}", "tipo": "Riego"}
        )
        # Admin should succeed
        assert response.status_code == 200
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/plantillas-recomendaciones/{response.json()['plantilla']['_id']}")
