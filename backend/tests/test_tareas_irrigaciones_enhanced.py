"""
Tests for enhanced Tareas and Irrigaciones modules
Tests: KPIs, calendar, filters, subtasks, status changes, Excel export, 
consumption calculator, parcel history
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def parcela_id(auth_headers):
    """Get a parcela ID for testing"""
    response = requests.get(f"{BASE_URL}/api/parcelas?limit=1", headers=auth_headers)
    assert response.status_code == 200
    parcelas = response.json().get("parcelas", [])
    if not parcelas:
        pytest.skip("No parcelas available for testing")
    return parcelas[0]["_id"]


class TestTareasStats:
    """Test Tareas KPIs/Stats endpoint"""
    
    def test_get_tareas_stats(self, auth_headers):
        """Test GET /api/tareas/stats returns valid statistics"""
        response = requests.get(f"{BASE_URL}/api/tareas/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "total" in data
        assert "pendientes" in data
        assert "en_progreso" in data
        assert "completadas" in data
        assert "canceladas" in data
        assert "prioridad" in data
        assert "vencidas" in data
        assert "esta_semana" in data
        assert "costes" in data
        
        # Check prioridad structure
        assert "alta" in data["prioridad"]
        assert "media" in data["prioridad"]
        assert "baja" in data["prioridad"]
        
        # Check costes structure
        assert "estimado" in data["costes"]
        assert "real" in data["costes"]


class TestTareasTipos:
    """Test Tareas tipos/priorities endpoint"""
    
    def test_get_tareas_tipos(self, auth_headers):
        """Test GET /api/tareas/tipos returns task types"""
        response = requests.get(f"{BASE_URL}/api/tareas/tipos", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check tipos
        assert "tipos" in data
        assert len(data["tipos"]) > 0
        tipo = data["tipos"][0]
        assert "id" in tipo
        assert "nombre" in tipo
        
        # Check prioridades
        assert "prioridades" in data
        assert len(data["prioridades"]) == 3  # alta, media, baja
        
        # Check estados
        assert "estados" in data
        assert len(data["estados"]) >= 4


class TestTareasCalendario:
    """Test Tareas calendar endpoint"""
    
    def test_get_tareas_calendario(self, auth_headers):
        """Test GET /api/tareas/calendario returns calendar data"""
        mes = datetime.now().month
        ano = datetime.now().year
        
        response = requests.get(
            f"{BASE_URL}/api/tareas/calendario?mes={mes}&ano={ano}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "calendario" in data
        assert "mes" in data
        assert "ano" in data
        assert data["mes"] == mes
        assert data["ano"] == ano


class TestTareasCRUD:
    """Test Tareas CRUD with priorities and subtasks"""
    
    @pytest.fixture
    def created_tarea(self, auth_headers):
        """Create a tarea for testing and clean up after"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        tarea_data = {
            "nombre": f"TEST_Tarea_{timestamp}",
            "descripcion": "Test tarea for automated testing",
            "prioridad": "alta",
            "tipo_tarea": "tratamiento",
            "fecha_inicio": datetime.now().strftime("%Y-%m-%d"),
            "fecha_vencimiento": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "estado": "pendiente",
            "subtareas": [
                {"id": "st1", "descripcion": "Subtarea Test 1", "completada": False},
                {"id": "st2", "descripcion": "Subtarea Test 2", "completada": False}
            ],
            "coste_estimado": 100,
            "coste_real": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/tareas", headers=auth_headers, json=tarea_data)
        assert response.status_code == 200
        created = response.json()["data"]
        
        yield created
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tareas/{created['_id']}", headers=auth_headers)
    
    def test_create_tarea_with_priority(self, auth_headers, created_tarea):
        """Test creating tarea with priority"""
        assert created_tarea["prioridad"] == "alta"
        assert created_tarea["tipo_tarea"] == "tratamiento"
    
    def test_create_tarea_with_subtasks(self, auth_headers, created_tarea):
        """Test creating tarea with subtasks"""
        assert len(created_tarea["subtareas"]) == 2
        assert created_tarea["subtareas"][0]["id"] == "st1"
        assert created_tarea["subtareas"][0]["completada"] == False
    
    def test_toggle_subtask(self, auth_headers, created_tarea):
        """Test toggling subtask completion"""
        tarea_id = created_tarea["_id"]
        
        # Mark subtask as complete
        response = requests.patch(
            f"{BASE_URL}/api/tareas/{tarea_id}/subtarea/st1?completada=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert any(st["id"] == "st1" and st["completada"] == True for st in data["subtareas"])
        
        # Verify by getting the tarea
        response = requests.get(f"{BASE_URL}/api/tareas/{tarea_id}", headers=auth_headers)
        assert response.status_code == 200
        tarea = response.json()["data"]
        assert any(st["id"] == "st1" and st["completada"] == True for st in tarea["subtareas"])
    
    def test_change_estado(self, auth_headers, created_tarea):
        """Test changing tarea status"""
        tarea_id = created_tarea["_id"]
        
        # Change to en_progreso
        response = requests.patch(
            f"{BASE_URL}/api/tareas/{tarea_id}/estado?estado=en_progreso",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/tareas/{tarea_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["data"]["estado"] == "en_progreso"
        
        # Change to completada
        response = requests.patch(
            f"{BASE_URL}/api/tareas/{tarea_id}/estado?estado=completada",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify realizada is True when completada
        response = requests.get(f"{BASE_URL}/api/tareas/{tarea_id}", headers=auth_headers)
        assert response.status_code == 200
        tarea = response.json()["data"]
        assert tarea["estado"] == "completada"
        assert tarea["realizada"] == True


class TestTareasFilters:
    """Test Tareas filtering"""
    
    def test_filter_by_estado(self, auth_headers):
        """Test filtering tareas by estado"""
        response = requests.get(f"{BASE_URL}/api/tareas?estado=pendiente", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tareas" in data
        assert "total" in data
    
    def test_filter_by_prioridad(self, auth_headers):
        """Test filtering tareas by prioridad"""
        response = requests.get(f"{BASE_URL}/api/tareas?prioridad=alta", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tareas" in data


class TestTareasExport:
    """Test Tareas Excel export"""
    
    def test_export_excel(self, auth_headers):
        """Test exporting tareas to Excel"""
        response = requests.get(f"{BASE_URL}/api/tareas/export/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")


class TestIrrigacionesStats:
    """Test Irrigaciones KPIs/Stats endpoint"""
    
    def test_get_irrigaciones_stats(self, auth_headers):
        """Test GET /api/irrigaciones/stats returns valid statistics"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "total" in data
        assert "completados" in data
        assert "planificados" in data
        assert "en_curso" in data
        assert "proximos_7_dias" in data
        assert "totales" in data
        assert "por_sistema" in data
        assert "por_mes" in data
        
        # Check totales structure
        assert "volumen" in data["totales"]
        assert "horas" in data["totales"]
        assert "coste" in data["totales"]
        assert "superficie" in data["totales"]


class TestIrrigacionesSistemas:
    """Test Irrigaciones sistemas endpoint"""
    
    def test_get_sistemas(self, auth_headers):
        """Test GET /api/irrigaciones/sistemas returns system types"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/sistemas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "sistemas" in data
        assert len(data["sistemas"]) > 0
        
        assert "fuentes_agua" in data
        assert len(data["fuentes_agua"]) > 0
        
        assert "estados" in data
        assert len(data["estados"]) >= 4


class TestIrrigacionesHistorial:
    """Test Irrigaciones parcel history endpoint"""
    
    def test_get_historial(self, auth_headers, parcela_id):
        """Test GET /api/irrigaciones/historial/{parcela_id}"""
        response = requests.get(
            f"{BASE_URL}/api/irrigaciones/historial/{parcela_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check parcela info
        assert "parcela" in data
        assert "id" in data["parcela"]
        assert "codigo" in data["parcela"]
        
        # Check historial
        assert "historial" in data
        
        # Check totales
        assert "totales" in data
        assert "riegos" in data["totales"]
        assert "volumen_total" in data["totales"]
        assert "horas_total" in data["totales"]
        assert "coste_total" in data["totales"]
        assert "volumen_por_ha" in data["totales"]
        
        # Check por_sistema
        assert "por_sistema" in data


class TestIrrigacionesCalculadora:
    """Test Irrigaciones consumption calculator"""
    
    def test_calcular_consumo(self, auth_headers, parcela_id):
        """Test GET /api/irrigaciones/calcular-consumo"""
        volumen = 100  # m³
        response = requests.get(
            f"{BASE_URL}/api/irrigaciones/calcular-consumo?parcela_id={parcela_id}&volumen={volumen}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "parcela_codigo" in data
        assert "superficie_ha" in data
        assert "volumen_m3" in data
        assert "consumo_por_ha" in data
        assert "cultivo" in data
        
        # Verify calculation: consumo_por_ha = volumen / superficie
        if data["superficie_ha"] > 0:
            expected_consumo = round(volumen / data["superficie_ha"], 2)
            assert data["consumo_por_ha"] == expected_consumo


class TestIrrigacionesFilters:
    """Test Irrigaciones filtering"""
    
    def test_filter_by_sistema(self, auth_headers):
        """Test filtering irrigaciones by sistema"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones?sistema=Goteo", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "irrigaciones" in data
        assert "total" in data
    
    def test_filter_by_estado(self, auth_headers):
        """Test filtering irrigaciones by estado"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones?estado=completado", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "irrigaciones" in data


class TestIrrigacionesExport:
    """Test Irrigaciones Excel export"""
    
    def test_export_excel(self, auth_headers):
        """Test exporting irrigaciones to Excel"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/export/excel", headers=auth_headers)
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers.get("content-type", "")


class TestIrrigacionesPlanificadas:
    """Test Irrigaciones planned/scheduled endpoint"""
    
    def test_get_planificadas(self, auth_headers):
        """Test GET /api/irrigaciones/planificadas"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/planificadas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "planificadas" in data
        assert "dias" in data
        assert data["dias"] == 14  # default


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
