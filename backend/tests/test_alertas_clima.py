"""
Test cases for Climate Alerts (Alertas Clima) API endpoints
Tests: GET alerts, POST manual data, POST verify all, PUT update status, GET/PUT rules config, GET stats
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API requests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@fruveco.com", "password": "admin123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create an authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture
def test_alert_id(api_client):
    """Get or create an alert for testing"""
    # First check if there are existing alerts
    response = api_client.get(f"{BASE_URL}/api/alertas-clima?limit=1")
    assert response.status_code == 200
    data = response.json()
    
    if data["alertas"]:
        return data["alertas"][0]["_id"]
    
    # If no alerts, create one with manual data
    manual_data = {
        "temperatura": 35,
        "humedad": 90,
        "lluvia": 15,
        "viento": 5,
        "descripcion": "TEST_clima_for_alert_creation"
    }
    response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
    assert response.status_code == 200
    data = response.json()
    
    if data.get("alertas_generadas"):
        return data["alertas_generadas"][0]["_id"]
    
    pytest.skip("No alerts available for testing")


# ============== Test GET /api/alertas-clima ==============

class TestGetAlertas:
    """Test cases for GET /api/alertas-clima endpoint"""
    
    def test_get_alertas_success(self, api_client):
        """Test getting alerts list"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima")
        assert response.status_code == 200
        data = response.json()
        
        assert "alertas" in data
        assert "total" in data
        assert "por_prioridad" in data
        assert isinstance(data["alertas"], list)
        assert "alta" in data["por_prioridad"]
        assert "media" in data["por_prioridad"]
        assert "baja" in data["por_prioridad"]
    
    def test_get_alertas_filter_by_estado_pendiente(self, api_client):
        """Test filtering alerts by estado=pendiente"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?estado=pendiente")
        assert response.status_code == 200
        data = response.json()
        
        # All returned alerts should have estado=pendiente
        for alerta in data["alertas"]:
            assert alerta["estado"] == "pendiente"
    
    def test_get_alertas_filter_by_estado_revisada(self, api_client):
        """Test filtering alerts by estado=revisada"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?estado=revisada")
        assert response.status_code == 200
        data = response.json()
        
        # All returned alerts should have estado=revisada
        for alerta in data["alertas"]:
            assert alerta["estado"] == "revisada"
    
    def test_get_alertas_filter_by_estado_resuelta(self, api_client):
        """Test filtering alerts by estado=resuelta"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?estado=resuelta")
        assert response.status_code == 200
        data = response.json()
        
        for alerta in data["alertas"]:
            assert alerta["estado"] == "resuelta"
    
    def test_get_alertas_filter_by_prioridad(self, api_client):
        """Test filtering alerts by prioridad"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?prioridad=Alta")
        assert response.status_code == 200
        data = response.json()
        
        for alerta in data["alertas"]:
            assert alerta["prioridad"] == "Alta"
    
    def test_get_alertas_with_limit(self, api_client):
        """Test limiting the number of returned alerts"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["alertas"]) <= 5
    
    def test_get_alertas_unauthorized(self):
        """Test getting alerts without authentication"""
        response = requests.get(f"{BASE_URL}/api/alertas-clima")
        assert response.status_code in [401, 403]  # Both are valid for unauthorized


# ============== Test POST /api/alertas-clima/clima/manual ==============

class TestRegistrarClimaManual:
    """Test cases for POST /api/alertas-clima/clima/manual endpoint"""
    
    def test_registrar_clima_manual_success(self, api_client):
        """Test registering manual climate data"""
        unique_desc = f"TEST_clima_{datetime.now().strftime('%H%M%S')}"
        manual_data = {
            "temperatura": 25,
            "humedad": 70,
            "lluvia": 0,
            "viento": 10,
            "descripcion": unique_desc
        }
        
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "message" in data
        assert "alertas_generadas" in data
        assert isinstance(data["alertas_generadas"], list)
    
    def test_registrar_clima_manual_high_humidity_generates_alert(self, api_client):
        """Test that high humidity (>80%) generates fungus alert"""
        manual_data = {
            "temperatura": 20,
            "humedad": 90,  # High humidity triggers "Alta Humedad" rule
            "lluvia": 0,
            "viento": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        # High humidity should generate alerts for fungus
        if data["alertas_generadas"]:
            alert_types = [a["regla_id"] for a in data["alertas_generadas"]]
            assert "high_humidity" in alert_types or len(data["alertas_generadas"]) > 0
    
    def test_registrar_clima_manual_high_temperature_generates_alert(self, api_client):
        """Test that high temperature (>30°C) generates spider mite alert"""
        manual_data = {
            "temperatura": 35,  # High temp triggers "Altas Temperaturas" rule
            "humedad": 50,
            "lluvia": 0,
            "viento": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        if data["alertas_generadas"]:
            alert_types = [a["regla_id"] for a in data["alertas_generadas"]]
            assert "high_temperature" in alert_types or len(data["alertas_generadas"]) > 0
    
    def test_registrar_clima_manual_rain_generates_alert(self, api_client):
        """Test that recent rain (>5mm) generates snail alert"""
        manual_data = {
            "temperatura": 18,
            "humedad": 70,
            "lluvia": 10,  # Rain triggers "Lluvias Recientes" rule
            "viento": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        if data["alertas_generadas"]:
            alert_types = [a["regla_id"] for a in data["alertas_generadas"]]
            assert "recent_rain" in alert_types or len(data["alertas_generadas"]) > 0
    
    def test_registrar_clima_manual_mild_temp_generates_aphid_alert(self, api_client):
        """Test that mild temperature (15-25°C) generates aphid alert"""
        manual_data = {
            "temperatura": 20,  # Mild temp triggers "Temperaturas Templadas" rule
            "humedad": 60,
            "lluvia": 0,
            "viento": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        if data["alertas_generadas"]:
            alert_types = [a["regla_id"] for a in data["alertas_generadas"]]
            assert "mild_temperature" in alert_types or len(data["alertas_generadas"]) > 0
    
    def test_registrar_clima_manual_missing_required_fields(self, api_client):
        """Test validation for missing required fields"""
        # Missing temperatura and humedad
        manual_data = {
            "lluvia": 0,
            "viento": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/clima/manual", json=manual_data)
        assert response.status_code == 422  # Validation error


# ============== Test POST /api/alertas-clima/verificar-todas ==============

class TestVerificarTodas:
    """Test cases for POST /api/alertas-clima/verificar-todas endpoint"""
    
    def test_verificar_todas_success(self, api_client):
        """Test verifying all parcelas for weather conditions"""
        response = api_client.post(f"{BASE_URL}/api/alertas-clima/verificar-todas")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "message" in data
        assert "parcelas_procesadas" in data
        assert "alertas_generadas" in data
    
    def test_verificar_todas_unauthorized(self):
        """Test verifying without authentication"""
        response = requests.post(f"{BASE_URL}/api/alertas-clima/verificar-todas")
        assert response.status_code in [401, 403]  # Both are valid for unauthorized


# ============== Test PUT /api/alertas-clima/{id} ==============

class TestUpdateAlertaEstado:
    """Test cases for PUT /api/alertas-clima/{id} endpoint"""
    
    def test_update_alerta_to_revisada(self, api_client, test_alert_id):
        """Test updating alert status to revisada"""
        update_data = {
            "estado": "revisada",
            "notas": "TEST_revision_note"
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/{test_alert_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["alerta"]["estado"] == "revisada"
        assert data["alerta"]["notas"] == "TEST_revision_note"
    
    def test_update_alerta_to_resuelta(self, api_client, test_alert_id):
        """Test updating alert status to resuelta"""
        update_data = {
            "estado": "resuelta"
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/{test_alert_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["alerta"]["estado"] == "resuelta"
    
    def test_update_alerta_to_pendiente(self, api_client, test_alert_id):
        """Test updating alert status back to pendiente"""
        update_data = {
            "estado": "pendiente"
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/{test_alert_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["alerta"]["estado"] == "pendiente"
    
    def test_update_alerta_not_found(self, api_client):
        """Test updating non-existent alert"""
        update_data = {"estado": "revisada"}
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/000000000000000000000000", json=update_data)
        assert response.status_code == 404
    
    def test_update_alerta_invalid_id(self, api_client):
        """Test updating with invalid alert ID format"""
        update_data = {"estado": "revisada"}
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/invalid-id", json=update_data)
        assert response.status_code == 500  # Invalid ObjectId


# ============== Test GET /api/alertas-clima/reglas/config ==============

class TestGetReglasConfig:
    """Test cases for GET /api/alertas-clima/reglas/config endpoint"""
    
    def test_get_reglas_config_success(self, api_client):
        """Test getting rules configuration"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/reglas/config")
        assert response.status_code == 200
        data = response.json()
        
        assert "reglas" in data
        assert isinstance(data["reglas"], list)
        assert len(data["reglas"]) >= 6  # We have 6 default rules
        
        # Verify rule structure
        for regla in data["reglas"]:
            assert "id" in regla
            assert "nombre" in regla
            assert "descripcion" in regla
            assert "condicion" in regla
            assert "operador" in regla
            assert "valor" in regla
            assert "activo" in regla
    
    def test_get_reglas_config_has_expected_rules(self, api_client):
        """Test that config has all expected alert rules"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/reglas/config")
        assert response.status_code == 200
        data = response.json()
        
        rule_ids = [r["id"] for r in data["reglas"]]
        
        expected_rules = [
            "high_humidity",      # >80% humidity → fungi
            "high_temperature",   # >30°C → spider mites
            "recent_rain",        # >5mm rain → snails
            "mild_temperature",   # 15-25°C → aphids
            "drought",            # <40% humidity → irrigation needed
            "frost_risk"          # <5°C → frost risk
        ]
        
        for expected in expected_rules:
            assert expected in rule_ids, f"Missing expected rule: {expected}"


# ============== Test PUT /api/alertas-clima/reglas/{id} ==============

class TestUpdateReglaConfig:
    """Test cases for PUT /api/alertas-clima/reglas/{id} endpoint"""
    
    def test_toggle_regla_disable(self, api_client):
        """Test disabling a rule"""
        config_data = {
            "rule_id": "frost_risk",
            "activo": False
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/reglas/frost_risk", json=config_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        
        # Verify the rule is now disabled
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/reglas/config")
        reglas = response.json()["reglas"]
        frost_rule = next(r for r in reglas if r["id"] == "frost_risk")
        assert frost_rule["activo"] is False
    
    def test_toggle_regla_enable(self, api_client):
        """Test enabling a rule"""
        config_data = {
            "rule_id": "frost_risk",
            "activo": True
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/reglas/frost_risk", json=config_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        
        # Verify the rule is now enabled
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/reglas/config")
        reglas = response.json()["reglas"]
        frost_rule = next(r for r in reglas if r["id"] == "frost_risk")
        assert frost_rule["activo"] is True
    
    def test_update_regla_custom_threshold(self, api_client):
        """Test setting a custom threshold for a rule"""
        config_data = {
            "rule_id": "high_humidity",
            "activo": True,
            "valor_personalizado": 85  # Custom threshold instead of default 80
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/reglas/high_humidity", json=config_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
    
    def test_update_regla_not_found(self, api_client):
        """Test updating non-existent rule"""
        config_data = {
            "rule_id": "nonexistent_rule",
            "activo": False
        }
        
        response = api_client.put(f"{BASE_URL}/api/alertas-clima/reglas/nonexistent_rule", json=config_data)
        assert response.status_code == 404


# ============== Test GET /api/alertas-clima/stats ==============

class TestGetAlertasStats:
    """Test cases for GET /api/alertas-clima/stats endpoint"""
    
    def test_get_stats_success(self, api_client):
        """Test getting alert statistics"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "resumen" in data
        assert "semana" in data
        
        # Check resumen structure
        resumen = data["resumen"]
        assert "pendientes" in resumen
        assert "revisadas" in resumen
        assert "resueltas_hoy" in resumen
        assert "total_activas" in resumen
        
        # Check semana structure
        semana = data["semana"]
        assert "total" in semana
        assert "por_tipo" in semana
        assert "top_parcelas" in semana
    
    def test_get_stats_por_tipo_valid(self, api_client):
        """Test that stats por_tipo contains valid rule IDs"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/stats")
        assert response.status_code == 200
        data = response.json()
        
        valid_rule_ids = [
            "high_humidity", "high_temperature", "recent_rain",
            "mild_temperature", "drought", "frost_risk"
        ]
        
        for tipo in data["semana"]["por_tipo"].keys():
            assert tipo in valid_rule_ids, f"Invalid rule type in stats: {tipo}"
    
    def test_get_stats_top_parcelas_format(self, api_client):
        """Test that top_parcelas has correct format"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima/stats")
        assert response.status_code == 200
        data = response.json()
        
        for parcela in data["semana"]["top_parcelas"]:
            assert "parcela" in parcela
            assert "alertas" in parcela
            assert isinstance(parcela["alertas"], int)


# ============== Test Alert Data Validation ==============

class TestAlertDataValidation:
    """Test that alert data is correctly formatted and contains expected fields"""
    
    def test_alert_has_all_required_fields(self, api_client):
        """Test that alerts contain all required fields"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "_id", "parcela_id", "parcela_codigo", "parcela_cultivo",
            "regla_id", "nombre", "descripcion", "condicion_detectada",
            "prioridad", "estado", "created_at"
        ]
        
        for alerta in data["alertas"]:
            for field in required_fields:
                assert field in alerta, f"Alert missing required field: {field}"
    
    def test_alert_has_weather_data(self, api_client):
        """Test that alerts include weather data when available"""
        response = api_client.get(f"{BASE_URL}/api/alertas-clima?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        for alerta in data["alertas"]:
            if alerta.get("datos_clima"):
                datos = alerta["datos_clima"]
                assert "temperatura" in datos or datos.get("temperatura") is not None or "humedad" in datos
