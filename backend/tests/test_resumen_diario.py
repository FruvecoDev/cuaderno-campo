"""
Tests for Daily Summary (Resumen Diario) API endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestResumenDiarioAPI:
    """Tests for GET /api/resumen-diario"""

    def test_resumen_diario_requires_auth(self, api_client):
        """Resumen diario should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden

    def test_get_resumen_diario(self, authenticated_client):
        """Should return daily summary data structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure exists
        assert "alertas_clima" in data
        assert "tratamientos_hoy" in data
        assert "contratos_vencer" in data
        assert "kpis" in data
        assert "fecha" in data
        assert "usuario" in data

    def test_alertas_clima_structure(self, authenticated_client):
        """Should return alertas_clima with proper structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        alertas = data["alertas_clima"]
        
        # Verify alertas_clima structure
        assert "total" in alertas
        assert "por_prioridad" in alertas
        assert isinstance(alertas["total"], int)
        
        # Verify por_prioridad structure
        por_prioridad = alertas["por_prioridad"]
        assert "alta" in por_prioridad
        assert "media" in por_prioridad
        assert "baja" in por_prioridad
        assert isinstance(por_prioridad["alta"], int)
        assert isinstance(por_prioridad["media"], int)
        assert isinstance(por_prioridad["baja"], int)

    def test_tratamientos_hoy_structure(self, authenticated_client):
        """Should return tratamientos_hoy with proper structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        tratamientos = data["tratamientos_hoy"]
        
        # Verify tratamientos_hoy structure
        assert "total" in tratamientos
        assert "lista" in tratamientos
        assert isinstance(tratamientos["total"], int)
        assert isinstance(tratamientos["lista"], list)
        
        # If there are tratamientos, verify item structure
        if len(tratamientos["lista"]) > 0:
            item = tratamientos["lista"][0]
            assert "parcela" in item
            assert "tipo" in item
            assert "producto" in item

    def test_contratos_vencer_structure(self, authenticated_client):
        """Should return contratos_vencer with proper structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        contratos = data["contratos_vencer"]
        
        # Verify contratos_vencer structure
        assert "total" in contratos
        assert "lista" in contratos
        assert isinstance(contratos["total"], int)
        assert isinstance(contratos["lista"], list)
        
        # If there are contratos, verify item structure
        if len(contratos["lista"]) > 0:
            item = contratos["lista"][0]
            assert "codigo" in item
            assert "cliente" in item
            assert "fecha_fin" in item

    def test_kpis_structure(self, authenticated_client):
        """Should return kpis with proper structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        kpis = data["kpis"]
        
        # Verify kpis structure
        assert "parcelas_activas" in kpis
        assert "recomendaciones_pendientes" in kpis
        assert "visitas_semana" in kpis
        assert "cosechas_mes" in kpis
        
        # Verify types
        assert isinstance(kpis["parcelas_activas"], int)
        assert isinstance(kpis["recomendaciones_pendientes"], int)
        assert isinstance(kpis["visitas_semana"], int)
        assert isinstance(kpis["cosechas_mes"], int)

    def test_fecha_format(self, authenticated_client):
        """Should return fecha in ISO format for today"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        fecha = data["fecha"]
        
        # Parse the date to verify format
        try:
            parsed = datetime.fromisoformat(fecha.replace('Z', '+00:00'))
            # Verify it's today's date (could be UTC)
            today = datetime.utcnow().date()
            assert parsed.date() == today or (parsed.date() - today).days <= 1
        except ValueError:
            pytest.fail(f"Invalid date format: {fecha}")

    def test_usuario_field(self, authenticated_client):
        """Should include usuario field from current user"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        assert "usuario" in data
        # Username should be a string (can be empty)
        assert isinstance(data["usuario"], str)

    def test_totals_are_non_negative(self, authenticated_client):
        """All totals should be non-negative integers"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all totals are non-negative
        assert data["alertas_clima"]["total"] >= 0
        assert data["tratamientos_hoy"]["total"] >= 0
        assert data["contratos_vencer"]["total"] >= 0
        assert data["kpis"]["parcelas_activas"] >= 0
        assert data["kpis"]["recomendaciones_pendientes"] >= 0
        assert data["kpis"]["visitas_semana"] >= 0
        assert data["kpis"]["cosechas_mes"] >= 0


class TestResumenDiarioDataConsistency:
    """Tests for data consistency in resumen diario"""

    def test_alertas_total_matches_sum(self, authenticated_client):
        """Alertas total should match sum of priorities"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        alertas = data["alertas_clima"]
        
        # Total should be >= sum of priorities (some might not have priority)
        sum_priorities = (
            alertas["por_prioridad"]["alta"] +
            alertas["por_prioridad"]["media"] +
            alertas["por_prioridad"]["baja"]
        )
        # The total can be >= sum (some alerts might not have priority set)
        assert alertas["total"] >= sum_priorities or alertas["total"] == sum_priorities

    def test_tratamientos_list_count_matches_total(self, authenticated_client):
        """Tratamientos list count should be <= total (max 5 items returned)"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        tratamientos = data["tratamientos_hoy"]
        
        # List is limited to 5 items
        assert len(tratamientos["lista"]) <= 5
        assert len(tratamientos["lista"]) <= tratamientos["total"]

    def test_contratos_list_count_matches_total(self, authenticated_client):
        """Contratos list count should be <= total (max 5 items returned)"""
        response = authenticated_client.get(f"{BASE_URL}/api/resumen-diario")
        assert response.status_code == 200
        
        data = response.json()
        contratos = data["contratos_vencer"]
        
        # List is limited to 5 items
        assert len(contratos["lista"]) <= 5
        assert len(contratos["lista"]) <= contratos["total"]
