"""
Backend integration tests for RRHH module.
Tests Employee CRUD, Time Clock (Fichajes), Productivity, Documents, and Prenomina endpoints.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = f"TEST_{datetime.now().strftime('%Y%m%d%H%M%S')}"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def test_empleado_data():
    """Generate unique test employee data"""
    unique_id = uuid.uuid4().hex[:8]
    return {
        "nombre": f"{TEST_PREFIX}_Juan",
        "apellidos": f"García_{unique_id}",
        "dni_nie": f"TEST{unique_id}",
        "fecha_nacimiento": "1990-05-15",
        "direccion": "Calle Test 123",
        "codigo_postal": "30820",
        "localidad": "Test City",
        "provincia": "Test Province",
        "telefono": "666123456",
        "email": f"test_{unique_id}@test.com",
        "fecha_alta": datetime.now().strftime("%Y-%m-%d"),
        "tipo_contrato": "Temporal",
        "puesto": "Operario",
        "departamento": "Test Department",
        "salario_hora": 12.5
    }


@pytest.fixture
def created_empleado(api_client, test_empleado_data):
    """Create an employee and yield it for testing, then clean up"""
    response = api_client.post(f"{BASE_URL}/api/rrhh/empleados", json=test_empleado_data)
    assert response.status_code == 200, f"Failed to create test employee: {response.text}"
    data = response.json()
    assert data.get("success") is True
    empleado = data.get("data")
    assert empleado is not None
    
    yield empleado
    
    # Cleanup - soft delete
    try:
        api_client.delete(f"{BASE_URL}/api/rrhh/empleados/{empleado['_id']}")
    except:
        pass


class TestEmpleadosAPI:
    """Tests for employee CRUD endpoints"""
    
    def test_get_empleados_list(self, api_client):
        """GET /api/rrhh/empleados - should return list of employees"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "empleados" in data
        assert isinstance(data["empleados"], list)
        assert "total" in data
    
    def test_get_empleados_with_filters(self, api_client):
        """GET /api/rrhh/empleados with filters"""
        # Filter by puesto
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados?puesto=Operario")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        
        # Filter by activo
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados?activo=true")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_get_empleados_stats(self, api_client):
        """GET /api/rrhh/empleados/stats - should return employee statistics"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "total" in data
        assert "activos" in data
        assert "inactivos" in data
        assert "por_puesto" in data
    
    def test_create_empleado(self, api_client, test_empleado_data):
        """POST /api/rrhh/empleados - should create new employee"""
        response = api_client.post(f"{BASE_URL}/api/rrhh/empleados", json=test_empleado_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        
        empleado = data["data"]
        assert "_id" in empleado
        assert "codigo" in empleado  # Auto-generated code
        assert "qr_code" in empleado  # Auto-generated QR
        assert empleado["nombre"] == test_empleado_data["nombre"]
        assert empleado["activo"] is True
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/rrhh/empleados/{empleado['_id']}")
    
    def test_get_single_empleado(self, api_client, created_empleado):
        """GET /api/rrhh/empleados/{id} - should return single employee"""
        emp_id = created_empleado["_id"]
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/{emp_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "empleado" in data
        assert data["empleado"]["_id"] == emp_id
    
    def test_get_empleado_not_found(self, api_client):
        """GET /api/rrhh/empleados/{invalid_id} - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/000000000000000000000000")
        assert response.status_code == 404
    
    def test_update_empleado(self, api_client, created_empleado):
        """PUT /api/rrhh/empleados/{id} - should update employee"""
        emp_id = created_empleado["_id"]
        update_data = {"puesto": "Encargado", "salario_hora": 15.0}
        
        response = api_client.put(f"{BASE_URL}/api/rrhh/empleados/{emp_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        
        # Verify update
        verify_response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/{emp_id}")
        verify_data = verify_response.json()
        assert verify_data["empleado"]["puesto"] == "Encargado"
        assert verify_data["empleado"]["salario_hora"] == 15.0
    
    def test_delete_empleado_soft_delete(self, api_client, test_empleado_data):
        """DELETE /api/rrhh/empleados/{id} - should soft delete (set activo=False)"""
        # Create employee first
        response = api_client.post(f"{BASE_URL}/api/rrhh/empleados", json=test_empleado_data)
        empleado = response.json()["data"]
        emp_id = empleado["_id"]
        
        # Delete (soft)
        response = api_client.delete(f"{BASE_URL}/api/rrhh/empleados/{emp_id}")
        assert response.status_code == 200
        
        # Verify soft delete
        verify_response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/{emp_id}")
        verify_data = verify_response.json()
        assert verify_data["empleado"]["activo"] is False
        assert "fecha_baja" in verify_data["empleado"]


class TestEmpleadosQR:
    """Tests for employee QR code generation"""
    
    def test_get_empleado_qr(self, api_client, created_empleado):
        """GET /api/rrhh/empleados/{id}/qr - should return QR code"""
        emp_id = created_empleado["_id"]
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/{emp_id}/qr")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "qr_image" in data
        assert data["qr_image"].startswith("data:image/png;base64,")
        assert "qr_code" in data
        assert "empleado_nombre" in data
    
    def test_get_qr_invalid_empleado(self, api_client):
        """GET /api/rrhh/empleados/{invalid_id}/qr - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/empleados/000000000000000000000000/qr")
        assert response.status_code == 404


class TestFichajesAPI:
    """Tests for time clock (fichajes) endpoints"""
    
    def test_get_fichajes_today(self, api_client):
        """GET /api/rrhh/fichajes/hoy - should return today's time entries"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/fichajes/hoy")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "fichajes" in data
        assert "estadisticas" in data
        assert "empleados_activos" in data["estadisticas"]
        assert "empleados_fichados" in data["estadisticas"]
    
    def test_get_fichajes_list(self, api_client):
        """GET /api/rrhh/fichajes - should return list of time entries"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/fichajes")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "fichajes" in data
    
    def test_create_fichaje_manual(self, api_client, created_empleado):
        """POST /api/rrhh/fichajes - should create manual time entry"""
        emp_id = created_empleado["_id"]
        now = datetime.now()
        fichaje_data = {
            "empleado_id": emp_id,
            "tipo": "entrada",
            "fecha": now.strftime("%Y-%m-%d"),
            "hora": now.strftime("%H:%M:%S"),
            "metodo_identificacion": "manual"
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/fichajes", json=fichaje_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        assert data["data"]["tipo"] == "entrada"
        assert data["data"]["metodo_identificacion"] == "manual"
    
    def test_create_fichaje_invalid_empleado(self, api_client):
        """POST /api/rrhh/fichajes with invalid empleado_id - should return 404"""
        now = datetime.now()
        fichaje_data = {
            "empleado_id": "000000000000000000000000",
            "tipo": "entrada",
            "fecha": now.strftime("%Y-%m-%d"),
            "hora": now.strftime("%H:%M:%S"),
            "metodo_identificacion": "manual"
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/fichajes", json=fichaje_data)
        assert response.status_code == 404
    
    def test_fichaje_qr_success(self, api_client, created_empleado):
        """POST /api/rrhh/fichajes/qr - should create time entry via QR"""
        qr_code = created_empleado["qr_code"]
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/fichajes/qr", json={
            "qr_code": qr_code,
            "tipo": "entrada"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data["data"]["metodo_identificacion"] == "qr"
    
    def test_fichaje_qr_invalid(self, api_client):
        """POST /api/rrhh/fichajes/qr with invalid QR - should return 404"""
        response = api_client.post(f"{BASE_URL}/api/rrhh/fichajes/qr", json={
            "qr_code": "INVALID_QR_CODE",
            "tipo": "entrada"
        })
        assert response.status_code == 404


class TestProductividadAPI:
    """Tests for productivity endpoints"""
    
    def test_get_productividad_stats(self, api_client):
        """GET /api/rrhh/productividad/stats - should return productivity statistics"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/productividad/stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "periodo" in data
        assert "totales" in data
        assert "top_empleados" in data
    
    def test_get_productividad_tiempo_real(self, api_client):
        """GET /api/rrhh/productividad/tiempo-real - should return real-time productivity"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/productividad/tiempo-real")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "fecha" in data
        assert "empleados_trabajando" in data
        assert "totales_hoy" in data
    
    def test_get_productividad_list(self, api_client):
        """GET /api/rrhh/productividad - should return list of productivity records"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/productividad")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "registros" in data
    
    def test_create_productividad_record(self, api_client, created_empleado):
        """POST /api/rrhh/productividad - should create productivity record"""
        emp_id = created_empleado["_id"]
        prod_data = {
            "empleado_id": emp_id,
            "fecha": datetime.now().strftime("%Y-%m-%d"),
            "tipo_trabajo": "recoleccion",
            "hora_inicio": "08:00",
            "hora_fin": "16:00",
            "minutos_descanso": 30,
            "kilos_recogidos": 150,
            "parcela_id": None
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/productividad", json=prod_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        # Verify hours calculated
        assert "horas_trabajadas" in data["data"]
        # 8 hours - 0.5 hours = 7.5 hours
        assert data["data"]["horas_trabajadas"] == 7.5
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/rrhh/productividad/{data['data']['_id']}")


class TestDocumentosAPI:
    """Tests for employee documents endpoints"""
    
    def test_get_documentos_list(self, api_client):
        """GET /api/rrhh/documentos - should return list of documents"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/documentos")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "documentos" in data
    
    def test_create_documento(self, api_client, created_empleado):
        """POST /api/rrhh/documentos - should create document"""
        emp_id = created_empleado["_id"]
        unique_id = uuid.uuid4().hex[:8]
        doc_data = {
            "empleado_id": emp_id,
            "nombre": f"TEST_Contrato_{unique_id}",
            "tipo": "contrato",
            "descripcion": "Test contract document",
            "requiere_firma": True,
            "fecha_creacion": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/documentos", json=doc_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        assert data["data"]["firmado"] is False
        assert data["data"]["activo"] is True
        
        doc_id = data["data"]["_id"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/rrhh/documentos/{doc_id}")
    
    def test_sign_documento(self, api_client, created_empleado):
        """PUT /api/rrhh/documentos/{id}/firmar - should sign document"""
        emp_id = created_empleado["_id"]
        unique_id = uuid.uuid4().hex[:8]
        
        # Create document first
        doc_data = {
            "empleado_id": emp_id,
            "nombre": f"TEST_Contrato_{unique_id}",
            "tipo": "contrato",
            "requiere_firma": True
        }
        create_response = api_client.post(f"{BASE_URL}/api/rrhh/documentos", json=doc_data)
        doc = create_response.json()["data"]
        doc_id = doc["_id"]
        
        # Sign document
        firma_data = {
            "firma_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        response = api_client.put(f"{BASE_URL}/api/rrhh/documentos/{doc_id}/firmar", json=firma_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        
        # Verify signature
        verify_response = api_client.get(f"{BASE_URL}/api/rrhh/documentos?empleado_id={emp_id}")
        verify_data = verify_response.json()
        signed_doc = next((d for d in verify_data["documentos"] if d["_id"] == doc_id), None)
        assert signed_doc is not None
        assert signed_doc["firmado"] is True
        assert "fecha_firma" in signed_doc
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/rrhh/documentos/{doc_id}")
    
    def test_delete_documento(self, api_client, created_empleado):
        """DELETE /api/rrhh/documentos/{id} - should delete document"""
        emp_id = created_empleado["_id"]
        unique_id = uuid.uuid4().hex[:8]
        
        # Create document
        doc_data = {
            "empleado_id": emp_id,
            "nombre": f"TEST_ToDelete_{unique_id}",
            "tipo": "certificado"
        }
        create_response = api_client.post(f"{BASE_URL}/api/rrhh/documentos", json=doc_data)
        doc_id = create_response.json()["data"]["_id"]
        
        # Delete
        response = api_client.delete(f"{BASE_URL}/api/rrhh/documentos/{doc_id}")
        assert response.status_code == 200
        
        # Verify deletion
        list_response = api_client.get(f"{BASE_URL}/api/rrhh/documentos?empleado_id={emp_id}")
        docs = list_response.json()["documentos"]
        assert not any(d["_id"] == doc_id for d in docs)


class TestPrenominaAPI:
    """Tests for pre-payroll endpoints"""
    
    def test_get_prenominas_list(self, api_client):
        """GET /api/rrhh/prenominas - should return list of pre-payrolls"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "prenominas" in data
    
    def test_get_prenominas_with_period(self, api_client):
        """GET /api/rrhh/prenominas with period filter"""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        response = api_client.get(f"{BASE_URL}/api/rrhh/prenominas?mes={current_month}&ano={current_year}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_calculate_prenomina_single(self, api_client, created_empleado):
        """POST /api/rrhh/prenominas/calcular - should calculate pre-payroll for one employee"""
        emp_id = created_empleado["_id"]
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        calc_data = {
            "empleado_id": emp_id,
            "mes": current_month,
            "ano": current_year
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular", json=calc_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        
        prenomina = data["data"]
        assert "horas_normales" in prenomina
        assert "horas_extra" in prenomina
        assert "total_horas" in prenomina
        assert "dias_trabajados" in prenomina
        assert "importe_bruto" in prenomina
        assert "estado" in prenomina
        assert prenomina["estado"] == "borrador"
    
    def test_calculate_prenomina_missing_params(self, api_client):
        """POST /api/rrhh/prenominas/calcular with missing params - should return 400"""
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular", json={
            "empleado_id": "some_id"
            # Missing mes and ano
        })
        assert response.status_code == 400
    
    def test_calculate_prenominas_all(self, api_client):
        """POST /api/rrhh/prenominas/calcular-todos - should calculate for all employees"""
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        calc_data = {
            "mes": current_month,
            "ano": current_year
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/prenominas/calcular-todos", json=calc_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "prenominas" in data
        assert "total" in data


class TestAusenciasAPI:
    """Tests for absences/vacations endpoints"""
    
    def test_get_ausencias_list(self, api_client):
        """GET /api/rrhh/ausencias - should return list of absences"""
        response = api_client.get(f"{BASE_URL}/api/rrhh/ausencias")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "ausencias" in data
    
    def test_create_ausencia(self, api_client, created_empleado):
        """POST /api/rrhh/ausencias - should create absence request"""
        emp_id = created_empleado["_id"]
        start_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
        
        ausencia_data = {
            "empleado_id": emp_id,
            "tipo": "vacaciones",
            "fecha_inicio": start_date,
            "fecha_fin": end_date,
            "motivo": "Test vacation request"
        }
        
        response = api_client.post(f"{BASE_URL}/api/rrhh/ausencias", json=ausencia_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "data" in data
        assert data["data"]["estado"] == "pendiente"
        assert data["data"]["dias_totales"] == 6  # 10th to 15th = 6 days
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/rrhh/ausencias/{data['data']['_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
