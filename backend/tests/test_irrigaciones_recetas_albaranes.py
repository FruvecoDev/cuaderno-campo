"""
Test suite for Irrigaciones, Recetas, and Albaranes CRUD operations.
Tests:
- Irrigaciones: Create, List, Edit, Delete, Filters
- Recetas: Create, List, Edit, Delete, Filters  
- Albaranes: Create with line items, List, Edit, Delete, Filters, total calculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://cultivo-log.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "testadmin@agrogest.com"
TEST_PASSWORD = "Test123!"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test admin login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Admin login successful")


# ============================================================================
# IRRIGACIONES TESTS
# ============================================================================
class TestIrrigacionesCRUD:
    """Test Irrigaciones CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_irrigacion(self, headers):
        """Test creating a new irrigacion"""
        payload = {
            "fecha": "2026-01-20",
            "sistema": "Goteo",
            "duracion": 2.5,
            "volumen": 150.0,
            "coste": 45.50,
            "parcela_id": ""  # Optional field - can be empty
        }
        
        response = requests.post(f"{BASE_URL}/api/irrigaciones", json=payload, headers=headers)
        assert response.status_code == 200, f"Create irrigacion failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        irrigacion = data.get("data", {})
        assert "_id" in irrigacion, "Created irrigacion should have _id"
        assert irrigacion.get("sistema") == "Goteo"
        assert irrigacion.get("duracion") == 2.5
        assert irrigacion.get("volumen") == 150.0
        assert irrigacion.get("coste") == 45.50
        
        print(f"✓ Irrigacion created successfully: {irrigacion.get('_id')}")
    
    def test_list_irrigaciones(self, headers):
        """Test listing irrigaciones"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones", headers=headers)
        assert response.status_code == 200, f"Get irrigaciones failed: {response.text}"
        
        data = response.json()
        assert "irrigaciones" in data, "Response should have 'irrigaciones' key"
        assert "total" in data, "Response should have 'total' key"
        
        irrigaciones = data["irrigaciones"]
        print(f"✓ Found {len(irrigaciones)} irrigaciones")
        return irrigaciones
    
    def test_get_single_irrigacion(self, headers):
        """Test getting a single irrigacion by ID"""
        # First create one
        payload = {
            "fecha": "2026-01-21",
            "sistema": "Aspersión",
            "duracion": 1.5,
            "volumen": 200.0,
            "coste": 60.00
        }
        create_response = requests.post(f"{BASE_URL}/api/irrigaciones", json=payload, headers=headers)
        irrigacion_id = create_response.json()["data"]["_id"]
        
        # Get single
        response = requests.get(f"{BASE_URL}/api/irrigaciones/{irrigacion_id}", headers=headers)
        assert response.status_code == 200, f"Get single irrigacion failed: {response.text}"
        
        irrigacion = response.json()
        assert irrigacion.get("_id") == irrigacion_id
        assert irrigacion.get("sistema") == "Aspersión"
        
        print(f"✓ Got single irrigacion: {irrigacion_id}")
        return irrigacion_id
    
    def test_edit_irrigacion(self, headers):
        """Test editing an existing irrigacion"""
        # First create
        create_payload = {
            "fecha": "2026-01-22",
            "sistema": "Inundación",
            "duracion": 3.0,
            "volumen": 500.0,
            "coste": 100.00
        }
        create_response = requests.post(f"{BASE_URL}/api/irrigaciones", json=create_payload, headers=headers)
        irrigacion_id = create_response.json()["data"]["_id"]
        
        # Edit
        edit_payload = {
            "fecha": "2026-01-23",
            "sistema": "Microaspersión",
            "duracion": 4.0,
            "volumen": 600.0,
            "coste": 120.00
        }
        
        edit_response = requests.put(f"{BASE_URL}/api/irrigaciones/{irrigacion_id}", json=edit_payload, headers=headers)
        assert edit_response.status_code == 200, f"Edit irrigacion failed: {edit_response.text}"
        
        edited_data = edit_response.json()
        assert edited_data.get("success") == True
        
        edited_irrigacion = edited_data.get("data", {})
        assert edited_irrigacion.get("sistema") == "Microaspersión"
        assert edited_irrigacion.get("duracion") == 4.0
        assert edited_irrigacion.get("volumen") == 600.0
        assert edited_irrigacion.get("coste") == 120.00
        
        print(f"✓ Irrigacion edited successfully")
        return irrigacion_id
    
    def test_delete_irrigacion(self, headers):
        """Test deleting an irrigacion"""
        # First create
        create_payload = {
            "fecha": "2026-01-24",
            "sistema": "Goteo",
            "duracion": 1.0,
            "volumen": 50.0,
            "coste": 20.00
        }
        create_response = requests.post(f"{BASE_URL}/api/irrigaciones", json=create_payload, headers=headers)
        irrigacion_id = create_response.json()["data"]["_id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/irrigaciones/{irrigacion_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete irrigacion failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") == True
        
        # Verify deleted (GET should return 404)
        get_response = requests.get(f"{BASE_URL}/api/irrigaciones/{irrigacion_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted irrigacion should return 404"
        
        print(f"✓ Irrigacion deleted successfully")


# ============================================================================
# RECETAS TESTS
# ============================================================================
class TestRecetasCRUD:
    """Test Recetas CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_receta(self, headers):
        """Test creating a new receta"""
        payload = {
            "nombre": "TEST_Receta Fungicida",
            "cultivo_objetivo": "Tomate",
            "plazo_seguridad": 14,
            "instrucciones": "Aplicar 2ml/L en fase vegetativa"
        }
        
        response = requests.post(f"{BASE_URL}/api/recetas", json=payload, headers=headers)
        assert response.status_code == 200, f"Create receta failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        receta = data.get("data", {})
        assert "_id" in receta, "Created receta should have _id"
        assert receta.get("nombre") == "TEST_Receta Fungicida"
        assert receta.get("cultivo_objetivo") == "Tomate"
        assert receta.get("plazo_seguridad") == 14
        
        print(f"✓ Receta created successfully: {receta.get('_id')}")
        return receta["_id"]
    
    def test_list_recetas(self, headers):
        """Test listing recetas"""
        response = requests.get(f"{BASE_URL}/api/recetas", headers=headers)
        assert response.status_code == 200, f"Get recetas failed: {response.text}"
        
        data = response.json()
        assert "recetas" in data, "Response should have 'recetas' key"
        assert "total" in data, "Response should have 'total' key"
        
        recetas = data["recetas"]
        print(f"✓ Found {len(recetas)} recetas")
        return recetas
    
    def test_get_single_receta(self, headers):
        """Test getting a single receta by ID"""
        # First create one
        payload = {
            "nombre": "TEST_Receta Insecticida",
            "cultivo_objetivo": "Pimiento",
            "plazo_seguridad": 7,
            "instrucciones": "Aplicar en las primeras horas del día"
        }
        create_response = requests.post(f"{BASE_URL}/api/recetas", json=payload, headers=headers)
        receta_id = create_response.json()["data"]["_id"]
        
        # Get single
        response = requests.get(f"{BASE_URL}/api/recetas/{receta_id}", headers=headers)
        assert response.status_code == 200, f"Get single receta failed: {response.text}"
        
        receta = response.json()
        assert receta.get("_id") == receta_id
        assert receta.get("nombre") == "TEST_Receta Insecticida"
        
        print(f"✓ Got single receta: {receta_id}")
        return receta_id
    
    def test_edit_receta(self, headers):
        """Test editing an existing receta"""
        # First create
        create_payload = {
            "nombre": "TEST_Receta Original",
            "cultivo_objetivo": "Melón",
            "plazo_seguridad": 21,
            "instrucciones": "Instrucciones originales"
        }
        create_response = requests.post(f"{BASE_URL}/api/recetas", json=create_payload, headers=headers)
        receta_id = create_response.json()["data"]["_id"]
        
        # Edit
        edit_payload = {
            "nombre": "TEST_Receta Editada",
            "cultivo_objetivo": "Sandía",
            "plazo_seguridad": 28,
            "instrucciones": "Instrucciones actualizadas con mayor detalle"
        }
        
        edit_response = requests.put(f"{BASE_URL}/api/recetas/{receta_id}", json=edit_payload, headers=headers)
        assert edit_response.status_code == 200, f"Edit receta failed: {edit_response.text}"
        
        edited_data = edit_response.json()
        assert edited_data.get("success") == True
        
        edited_receta = edited_data.get("data", {})
        assert edited_receta.get("nombre") == "TEST_Receta Editada"
        assert edited_receta.get("cultivo_objetivo") == "Sandía"
        assert edited_receta.get("plazo_seguridad") == 28
        
        print(f"✓ Receta edited successfully")
        return receta_id
    
    def test_delete_receta(self, headers):
        """Test deleting a receta"""
        # First create
        create_payload = {
            "nombre": "TEST_Receta To Delete",
            "cultivo_objetivo": "Calabacín",
            "plazo_seguridad": 10,
            "instrucciones": "Esta receta será eliminada"
        }
        create_response = requests.post(f"{BASE_URL}/api/recetas", json=create_payload, headers=headers)
        receta_id = create_response.json()["data"]["_id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/recetas/{receta_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete receta failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") == True
        
        # Verify deleted (GET should return 404)
        get_response = requests.get(f"{BASE_URL}/api/recetas/{receta_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted receta should return 404"
        
        print(f"✓ Receta deleted successfully")


# ============================================================================
# ALBARANES TESTS
# ============================================================================
class TestAlbaranesCRUD:
    """Test Albaranes CRUD operations with line items"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_albaran_with_items(self, headers):
        """Test creating a new albaran with line items"""
        payload = {
            "tipo": "Entrada",
            "fecha": "2026-01-20",
            "proveedor_cliente": "TEST_Proveedor ABC",
            "items": [
                {"descripcion": "Fertilizante NPK", "cantidad": 10, "precio_unitario": 25.00, "total": 250.00},
                {"descripcion": "Insecticida Bio", "cantidad": 5, "precio_unitario": 40.00, "total": 200.00}
            ],
            "observaciones": "TEST_albaran_items"
        }
        
        response = requests.post(f"{BASE_URL}/api/albaranes", json=payload, headers=headers)
        assert response.status_code == 200, f"Create albaran failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        albaran = data.get("data", {})
        assert "_id" in albaran, "Created albaran should have _id"
        assert albaran.get("tipo") == "Entrada"
        assert albaran.get("proveedor_cliente") == "TEST_Proveedor ABC"
        assert len(albaran.get("items", [])) == 2
        
        # Verify total_general calculation (250 + 200 = 450)
        assert albaran.get("total_general") == 450.00, f"Expected total 450.00, got {albaran.get('total_general')}"
        
        print(f"✓ Albaran created successfully: {albaran.get('_id')}")
        print(f"  - Items: {len(albaran.get('items', []))}, Total: €{albaran.get('total_general')}")
        return albaran["_id"]
    
    def test_list_albaranes(self, headers):
        """Test listing albaranes"""
        response = requests.get(f"{BASE_URL}/api/albaranes", headers=headers)
        assert response.status_code == 200, f"Get albaranes failed: {response.text}"
        
        data = response.json()
        assert "albaranes" in data, "Response should have 'albaranes' key"
        assert "total" in data, "Response should have 'total' key"
        
        albaranes = data["albaranes"]
        print(f"✓ Found {len(albaranes)} albaranes")
        return albaranes
    
    def test_list_albaranes_filter_by_tipo(self, headers):
        """Test filtering albaranes by tipo"""
        # Create one Salida type
        payload = {
            "tipo": "Salida",
            "fecha": "2026-01-21",
            "proveedor_cliente": "TEST_Cliente XYZ",
            "items": [
                {"descripcion": "Tomates", "cantidad": 100, "precio_unitario": 2.50, "total": 250.00}
            ],
            "observaciones": "TEST_albaran_salida"
        }
        requests.post(f"{BASE_URL}/api/albaranes", json=payload, headers=headers)
        
        # Filter by tipo=Salida
        response = requests.get(f"{BASE_URL}/api/albaranes?tipo=Salida", headers=headers)
        assert response.status_code == 200, f"Filter albaranes failed: {response.text}"
        
        data = response.json()
        albaranes = data["albaranes"]
        
        # All results should be Salida type
        for albaran in albaranes:
            assert albaran.get("tipo") == "Salida", f"Expected tipo 'Salida', got '{albaran.get('tipo')}'"
        
        print(f"✓ Filter by tipo 'Salida' working: {len(albaranes)} results")
    
    def test_get_single_albaran(self, headers):
        """Test getting a single albaran by ID"""
        # First create one
        payload = {
            "tipo": "Entrada",
            "fecha": "2026-01-22",
            "proveedor_cliente": "TEST_Proveedor Single",
            "items": [
                {"descripcion": "Producto Test", "cantidad": 1, "precio_unitario": 100.00, "total": 100.00}
            ],
            "observaciones": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/albaranes", json=payload, headers=headers)
        albaran_id = create_response.json()["data"]["_id"]
        
        # Get single
        response = requests.get(f"{BASE_URL}/api/albaranes/{albaran_id}", headers=headers)
        assert response.status_code == 200, f"Get single albaran failed: {response.text}"
        
        albaran = response.json()
        assert albaran.get("_id") == albaran_id
        assert albaran.get("proveedor_cliente") == "TEST_Proveedor Single"
        
        print(f"✓ Got single albaran: {albaran_id}")
        return albaran_id
    
    def test_edit_albaran_with_new_items(self, headers):
        """Test editing an albaran with updated line items"""
        # First create
        create_payload = {
            "tipo": "Entrada",
            "fecha": "2026-01-23",
            "proveedor_cliente": "TEST_Proveedor Edit",
            "items": [
                {"descripcion": "Item Original", "cantidad": 5, "precio_unitario": 10.00, "total": 50.00}
            ],
            "observaciones": "Original"
        }
        create_response = requests.post(f"{BASE_URL}/api/albaranes", json=create_payload, headers=headers)
        albaran_id = create_response.json()["data"]["_id"]
        
        # Edit with more items
        edit_payload = {
            "tipo": "Salida",
            "fecha": "2026-01-24",
            "proveedor_cliente": "TEST_Cliente Editado",
            "items": [
                {"descripcion": "Item Editado 1", "cantidad": 10, "precio_unitario": 15.00, "total": 150.00},
                {"descripcion": "Item Editado 2", "cantidad": 20, "precio_unitario": 5.00, "total": 100.00},
                {"descripcion": "Item Editado 3", "cantidad": 3, "precio_unitario": 50.00, "total": 150.00}
            ],
            "observaciones": "Editado con más items"
        }
        
        edit_response = requests.put(f"{BASE_URL}/api/albaranes/{albaran_id}", json=edit_payload, headers=headers)
        assert edit_response.status_code == 200, f"Edit albaran failed: {edit_response.text}"
        
        edited_data = edit_response.json()
        assert edited_data.get("success") == True
        
        edited_albaran = edited_data.get("data", {})
        assert edited_albaran.get("tipo") == "Salida"
        assert edited_albaran.get("proveedor_cliente") == "TEST_Cliente Editado"
        assert len(edited_albaran.get("items", [])) == 3
        
        # Verify total_general recalculation (150 + 100 + 150 = 400)
        assert edited_albaran.get("total_general") == 400.00, f"Expected total 400.00, got {edited_albaran.get('total_general')}"
        
        print(f"✓ Albaran edited successfully")
        print(f"  - New items: {len(edited_albaran.get('items', []))}, New total: €{edited_albaran.get('total_general')}")
        return albaran_id
    
    def test_delete_albaran(self, headers):
        """Test deleting an albaran"""
        # First create
        create_payload = {
            "tipo": "Entrada",
            "fecha": "2026-01-25",
            "proveedor_cliente": "TEST_Proveedor Delete",
            "items": [
                {"descripcion": "Item to Delete", "cantidad": 1, "precio_unitario": 10.00, "total": 10.00}
            ],
            "observaciones": "To be deleted"
        }
        create_response = requests.post(f"{BASE_URL}/api/albaranes", json=create_payload, headers=headers)
        albaran_id = create_response.json()["data"]["_id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/albaranes/{albaran_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete albaran failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") == True
        
        # Verify deleted (GET should return 404)
        get_response = requests.get(f"{BASE_URL}/api/albaranes/{albaran_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted albaran should return 404"
        
        print(f"✓ Albaran deleted successfully")
    
    def test_albaran_total_calculation(self, headers):
        """Test that albaran total_general is correctly calculated from items"""
        payload = {
            "tipo": "Entrada",
            "fecha": "2026-01-26",
            "proveedor_cliente": "TEST_Proveedor Total Test",
            "items": [
                {"descripcion": "Item A", "cantidad": 2, "precio_unitario": 100.00, "total": 200.00},
                {"descripcion": "Item B", "cantidad": 5, "precio_unitario": 50.00, "total": 250.00},
                {"descripcion": "Item C", "cantidad": 1, "precio_unitario": 75.50, "total": 75.50}
            ],
            "observaciones": "TEST_total_calculation"
        }
        
        response = requests.post(f"{BASE_URL}/api/albaranes", json=payload, headers=headers)
        assert response.status_code == 200
        
        albaran = response.json()["data"]
        expected_total = 200.00 + 250.00 + 75.50  # = 525.50
        
        assert albaran.get("total_general") == expected_total, f"Expected total {expected_total}, got {albaran.get('total_general')}"
        
        print(f"✓ Total calculation correct: €{albaran.get('total_general')}")


# ============================================================================
# CLEANUP TESTS
# ============================================================================
class TestCleanup:
    """Clean up test data created during tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_recetas(self, headers):
        """Clean up TEST_ prefixed recetas"""
        response = requests.get(f"{BASE_URL}/api/recetas", headers=headers)
        if response.status_code == 200:
            recetas = response.json().get("recetas", [])
            deleted_count = 0
            for receta in recetas:
                if "TEST_" in str(receta.get("nombre", "")):
                    delete_response = requests.delete(f"{BASE_URL}/api/recetas/{receta['_id']}", headers=headers)
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test recetas")
    
    def test_cleanup_test_albaranes(self, headers):
        """Clean up TEST_ prefixed albaranes"""
        response = requests.get(f"{BASE_URL}/api/albaranes", headers=headers)
        if response.status_code == 200:
            albaranes = response.json().get("albaranes", [])
            deleted_count = 0
            for albaran in albaranes:
                if "TEST_" in str(albaran.get("proveedor_cliente", "")) or "TEST_" in str(albaran.get("observaciones", "")):
                    delete_response = requests.delete(f"{BASE_URL}/api/albaranes/{albaran['_id']}", headers=headers)
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test albaranes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
