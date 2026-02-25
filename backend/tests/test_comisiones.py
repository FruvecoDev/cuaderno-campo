"""
Test suite for Commission System APIs
Tests: /api/comisiones/resumen, /api/comisiones/agentes, /api/comisiones/campanas, /api/comisiones/liquidacion/pdf
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed — skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestComisionesResumen:
    """Tests for /api/comisiones/resumen endpoint"""
    
    def test_get_resumen_returns_success(self, authenticated_client):
        """Test that resumen endpoint returns success"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "comisiones" in data
        assert "totales" in data
    
    def test_resumen_totales_structure(self, authenticated_client):
        """Test that totales has correct structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen")
        assert response.status_code == 200
        data = response.json()
        totales = data.get("totales", {})
        assert "total_comision_compra" in totales
        assert "total_comision_venta" in totales
        assert "total_general" in totales
    
    def test_resumen_filter_by_campana(self, authenticated_client):
        """Test filtering by campaign"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen?campana=2025/26")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # All returned commissions should be from the filtered campaign
        for com in data.get("comisiones", []):
            for contrato in com.get("contratos", []):
                assert contrato.get("campana") == "2025/26"
    
    def test_resumen_filter_by_tipo_agente(self, authenticated_client):
        """Test filtering by agent type (compra/venta)"""
        # Test compra filter
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen?tipo_agente=compra")
        assert response.status_code == 200
        data = response.json()
        for com in data.get("comisiones", []):
            assert com.get("tipo") == "compra"
        
        # Test venta filter
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen?tipo_agente=venta")
        assert response.status_code == 200
        data = response.json()
        for com in data.get("comisiones", []):
            assert com.get("tipo") == "venta"
    
    def test_resumen_comision_calculation(self, authenticated_client):
        """Test that commission calculations are correct"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen")
        assert response.status_code == 200
        data = response.json()
        
        for com in data.get("comisiones", []):
            calculated_total = 0
            for contrato in com.get("contratos", []):
                cantidad = contrato.get("cantidad_kg", 0)
                precio = contrato.get("precio_kg", 0)
                com_tipo = contrato.get("comision_tipo")
                com_valor = contrato.get("comision_valor", 0) or 0
                
                if com_tipo == "porcentaje":
                    expected_comision = round(cantidad * precio * (com_valor / 100), 2)
                elif com_tipo == "euro_kilo":
                    expected_comision = round(cantidad * com_valor, 2)
                else:
                    expected_comision = 0
                
                assert abs(contrato.get("importe_comision", 0) - expected_comision) < 0.01, \
                    f"Commission calculation error: {contrato.get('importe_comision')} != {expected_comision}"
                calculated_total += contrato.get("importe_comision", 0)
            
            assert abs(com.get("total_comision", 0) - calculated_total) < 0.01


class TestComisionesAgentes:
    """Tests for /api/comisiones/agentes endpoint"""
    
    def test_get_agentes_returns_success(self, authenticated_client):
        """Test that agentes endpoint returns success"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/agentes")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "agentes" in data
    
    def test_agentes_have_required_fields(self, authenticated_client):
        """Test that each agent has required fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/agentes")
        assert response.status_code == 200
        data = response.json()
        
        for agente in data.get("agentes", []):
            assert "id" in agente
            assert "nombre" in agente
            assert "tipo" in agente
            assert agente.get("tipo") in ["compra", "venta"]
    
    def test_agentes_filter_by_campana(self, authenticated_client):
        """Test filtering agents by campaign"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/agentes?campana=2025/26")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestComisionesCampanas:
    """Tests for /api/comisiones/campanas endpoint"""
    
    def test_get_campanas_returns_success(self, authenticated_client):
        """Test that campanas endpoint returns success"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/campanas")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "campanas" in data
    
    def test_campanas_is_list(self, authenticated_client):
        """Test that campanas returns a list"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/campanas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("campanas"), list)


class TestLiquidacionPdf:
    """Tests for /api/comisiones/liquidacion/pdf endpoint"""
    
    def test_pdf_requires_agente_id(self, authenticated_client):
        """Test that PDF endpoint requires agente_id"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/liquidacion/pdf?tipo_agente=compra")
        assert response.status_code == 422  # Validation error
    
    def test_pdf_requires_tipo_agente(self, authenticated_client):
        """Test that PDF endpoint requires tipo_agente"""
        response = authenticated_client.get(f"{BASE_URL}/api/comisiones/liquidacion/pdf?agente_id=123")
        assert response.status_code == 422  # Validation error
    
    def test_pdf_invalid_agente_returns_404(self, authenticated_client):
        """Test that invalid agent ID returns 404"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/comisiones/liquidacion/pdf?agente_id=000000000000000000000000&tipo_agente=compra"
        )
        assert response.status_code == 404
    
    def test_pdf_generation_valid_agent(self, authenticated_client):
        """Test PDF generation with a valid agent"""
        # First get a valid agent ID
        agents_response = authenticated_client.get(f"{BASE_URL}/api/comisiones/agentes")
        agents = agents_response.json().get("agentes", [])
        
        if not agents:
            pytest.skip("No agents with commissions available")
        
        agent = agents[0]
        response = authenticated_client.get(
            f"{BASE_URL}/api/comisiones/liquidacion/pdf?agente_id={agent['id']}&tipo_agente={agent['tipo']}"
        )
        
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000  # PDF should have reasonable size


class TestContratoComisiones:
    """Tests for contract commission fields"""
    
    @pytest.fixture
    def test_data_ids(self, authenticated_client):
        """Get IDs for test data"""
        # Get a provider
        prov_response = authenticated_client.get(f"{BASE_URL}/api/proveedores?activo=true")
        proveedores = prov_response.json().get("proveedores", [])
        proveedor_id = proveedores[0]["_id"] if proveedores else None
        
        # Get a cultivo
        cultivo_response = authenticated_client.get(f"{BASE_URL}/api/cultivos?activo=true")
        cultivos = cultivo_response.json().get("cultivos", [])
        cultivo_id = cultivos[0]["_id"] if cultivos else None
        
        # Get a compra agent
        agent_response = authenticated_client.get(f"{BASE_URL}/api/agentes/activos?tipo=Compra")
        agentes = agent_response.json().get("agentes", [])
        agente_compra_id = agentes[0]["_id"] if agentes else None
        
        if not all([proveedor_id, cultivo_id, agente_compra_id]):
            pytest.skip("Required test data not available")
        
        return {
            "proveedor_id": proveedor_id,
            "cultivo_id": cultivo_id,
            "agente_compra_id": agente_compra_id
        }
    
    def test_create_contract_with_percentage_commission(self, authenticated_client, test_data_ids):
        """Test creating a contract with percentage commission"""
        unique_id = str(uuid.uuid4())[:8]
        
        contract_data = {
            "tipo": "Compra",
            "campana": "2025/26",
            "procedencia": "Campo",
            "fecha_contrato": datetime.now().strftime("%Y-%m-%d"),
            "proveedor_id": test_data_ids["proveedor_id"],
            "cultivo_id": test_data_ids["cultivo_id"],
            "cantidad": 1000,
            "precio": 0.5,
            "periodo_desde": "2025-01-01",
            "periodo_hasta": "2025-12-31",
            "agente_compra": test_data_ids["agente_compra_id"],
            "comision_compra_tipo": "porcentaje",
            "comision_compra_valor": 3.0,
            "observaciones": f"TEST_{unique_id}"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/contratos", json=contract_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify in resumen
        contract_id = data["data"]["_id"]
        resumen = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen").json()
        
        found = False
        for com in resumen.get("comisiones", []):
            for contrato in com.get("contratos", []):
                if contrato.get("contrato_id") == contract_id:
                    found = True
                    # Check commission calculation: 1000 * 0.5 * 3/100 = 15
                    expected_commission = 1000 * 0.5 * (3.0 / 100)
                    assert abs(contrato.get("importe_comision", 0) - expected_commission) < 0.01
                    break
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/contratos/{contract_id}")
        assert found, "Contract not found in commission summary"
    
    def test_create_contract_with_euro_kilo_commission(self, authenticated_client, test_data_ids):
        """Test creating a contract with €/kilo commission"""
        unique_id = str(uuid.uuid4())[:8]
        
        contract_data = {
            "tipo": "Compra",
            "campana": "2025/26",
            "procedencia": "Campo",
            "fecha_contrato": datetime.now().strftime("%Y-%m-%d"),
            "proveedor_id": test_data_ids["proveedor_id"],
            "cultivo_id": test_data_ids["cultivo_id"],
            "cantidad": 2000,
            "precio": 0.45,
            "periodo_desde": "2025-01-01",
            "periodo_hasta": "2025-12-31",
            "agente_compra": test_data_ids["agente_compra_id"],
            "comision_compra_tipo": "euro_kilo",
            "comision_compra_valor": 0.02,
            "observaciones": f"TEST_{unique_id}"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/contratos", json=contract_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify in resumen
        contract_id = data["data"]["_id"]
        resumen = authenticated_client.get(f"{BASE_URL}/api/comisiones/resumen").json()
        
        found = False
        for com in resumen.get("comisiones", []):
            for contrato in com.get("contratos", []):
                if contrato.get("contrato_id") == contract_id:
                    found = True
                    # Check commission calculation: 2000 * 0.02 = 40
                    expected_commission = 2000 * 0.02
                    assert abs(contrato.get("importe_comision", 0) - expected_commission) < 0.01
                    break
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/contratos/{contract_id}")
        assert found, "Contract not found in commission summary"
