"""
Backend API tests for Iteration 66 - Cultivos tabbed modal, Formas de Pago, Tipos IVA
Tests: tipos-cultivo, cultivo changelog, formas-pago, tipos-iva CRUD endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Get auth token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestTiposCultivo(TestAuth):
    """Tests for /api/tipos-cultivo CRUD"""
    
    def test_get_tipos_cultivo(self, auth_headers):
        """GET /api/tipos-cultivo - should return list of tipos"""
        response = requests.get(f"{BASE_URL}/api/tipos-cultivo", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "tipos" in data
        assert isinstance(data["tipos"], list)
        print(f"✓ GET /api/tipos-cultivo returned {len(data['tipos'])} tipos")
    
    def test_create_tipo_cultivo(self, auth_headers):
        """POST /api/tipos-cultivo - create new tipo"""
        test_nombre = "TEST_TipoCultivo_Iteration66"
        response = requests.post(f"{BASE_URL}/api/tipos-cultivo", 
            headers=auth_headers,
            json={"nombre": test_nombre}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "tipo" in data
        assert data["tipo"]["nombre"] == test_nombre
        print(f"✓ POST /api/tipos-cultivo created: {test_nombre}")
        return data["tipo"]["_id"]
    
    def test_create_duplicate_tipo_cultivo_fails(self, auth_headers):
        """POST /api/tipos-cultivo - duplicate should fail"""
        # First create
        requests.post(f"{BASE_URL}/api/tipos-cultivo", 
            headers=auth_headers,
            json={"nombre": "TEST_DuplicateTipo"}
        )
        # Try duplicate
        response = requests.post(f"{BASE_URL}/api/tipos-cultivo", 
            headers=auth_headers,
            json={"nombre": "TEST_DuplicateTipo"}
        )
        assert response.status_code == 400, "Duplicate should fail"
        print("✓ Duplicate tipo cultivo correctly rejected")
    
    def test_delete_tipo_cultivo(self, auth_headers):
        """DELETE /api/tipos-cultivo/{id} - delete tipo"""
        # Create one to delete
        create_resp = requests.post(f"{BASE_URL}/api/tipos-cultivo", 
            headers=auth_headers,
            json={"nombre": "TEST_ToDelete_TipoCultivo"}
        )
        if create_resp.status_code == 200:
            tipo_id = create_resp.json()["tipo"]["_id"]
            response = requests.delete(f"{BASE_URL}/api/tipos-cultivo/{tipo_id}", headers=auth_headers)
            assert response.status_code == 200, f"Delete failed: {response.text}"
            assert response.json().get("success") == True
            print(f"✓ DELETE /api/tipos-cultivo/{tipo_id} succeeded")


class TestFormasPago(TestAuth):
    """Tests for /api/formas-pago CRUD"""
    
    def test_get_formas_pago(self, auth_headers):
        """GET /api/formas-pago - should return list"""
        response = requests.get(f"{BASE_URL}/api/formas-pago", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        print(f"✓ GET /api/formas-pago returned {len(data['items'])} items")
    
    def test_create_forma_pago(self, auth_headers):
        """POST /api/formas-pago - create new forma de pago"""
        test_nombre = "TEST_FormaPago_Iteration66"
        response = requests.post(f"{BASE_URL}/api/formas-pago", 
            headers=auth_headers,
            json={"nombre": test_nombre}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "item" in data
        assert data["item"]["nombre"] == test_nombre
        print(f"✓ POST /api/formas-pago created: {test_nombre}")
    
    def test_delete_forma_pago(self, auth_headers):
        """DELETE /api/formas-pago/{id} - delete forma de pago"""
        # Create one to delete
        create_resp = requests.post(f"{BASE_URL}/api/formas-pago", 
            headers=auth_headers,
            json={"nombre": "TEST_ToDelete_FormaPago"}
        )
        if create_resp.status_code == 200:
            item_id = create_resp.json()["item"]["_id"]
            response = requests.delete(f"{BASE_URL}/api/formas-pago/{item_id}", headers=auth_headers)
            assert response.status_code == 200, f"Delete failed: {response.text}"
            assert response.json().get("success") == True
            print(f"✓ DELETE /api/formas-pago/{item_id} succeeded")


class TestTiposIva(TestAuth):
    """Tests for /api/tipos-iva CRUD"""
    
    def test_get_tipos_iva(self, auth_headers):
        """GET /api/tipos-iva - should return list"""
        response = requests.get(f"{BASE_URL}/api/tipos-iva", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        print(f"✓ GET /api/tipos-iva returned {len(data['items'])} items")
    
    def test_create_tipo_iva(self, auth_headers):
        """POST /api/tipos-iva - create new tipo IVA"""
        test_data = {"nombre": "TEST_IVA_21%", "valor": "21"}
        response = requests.post(f"{BASE_URL}/api/tipos-iva", 
            headers=auth_headers,
            json=test_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "item" in data
        assert data["item"]["nombre"] == test_data["nombre"]
        assert data["item"]["valor"] == test_data["valor"]
        print(f"✓ POST /api/tipos-iva created: {test_data['nombre']}")
    
    def test_delete_tipo_iva(self, auth_headers):
        """DELETE /api/tipos-iva/{id} - delete tipo IVA"""
        # Create one to delete
        create_resp = requests.post(f"{BASE_URL}/api/tipos-iva", 
            headers=auth_headers,
            json={"nombre": "TEST_ToDelete_IVA", "valor": "10"}
        )
        if create_resp.status_code == 200:
            item_id = create_resp.json()["item"]["_id"]
            response = requests.delete(f"{BASE_URL}/api/tipos-iva/{item_id}", headers=auth_headers)
            assert response.status_code == 200, f"Delete failed: {response.text}"
            assert response.json().get("success") == True
            print(f"✓ DELETE /api/tipos-iva/{item_id} succeeded")


class TestCultivos(TestAuth):
    """Tests for /api/cultivos CRUD and changelog"""
    
    def test_get_cultivos(self, auth_headers):
        """GET /api/cultivos - should return list"""
        response = requests.get(f"{BASE_URL}/api/cultivos", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "cultivos" in data
        assert isinstance(data["cultivos"], list)
        print(f"✓ GET /api/cultivos returned {len(data['cultivos'])} cultivos")
    
    def test_create_cultivo_with_auto_codigo(self, auth_headers):
        """POST /api/cultivos - create with auto-incremental codigo"""
        test_data = {
            "nombre": "TEST_Cultivo_Iteration66",
            "variedad": "Test Variedad",
            "tipo": "Hortaliza",
            "unidad_medida": "kg",
            "ciclo_cultivo": "Corto",
            "temporada": "Primavera-Verano",
            "familia_botanica": "Solanaceae",
            "nombre_cientifico": "Testus plantus",
            "activo": True
        }
        response = requests.post(f"{BASE_URL}/api/cultivos", 
            headers=auth_headers,
            json=test_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "cultivo" in data
        cultivo = data["cultivo"]
        assert cultivo["nombre"] == test_data["nombre"]
        assert "codigo_cultivo" in cultivo
        assert len(cultivo["codigo_cultivo"]) == 6  # Should be 6-digit padded
        print(f"✓ POST /api/cultivos created with codigo: {cultivo['codigo_cultivo']}")
        return cultivo["_id"]
    
    def test_update_cultivo_generates_changelog(self, auth_headers):
        """PUT /api/cultivos/{id} - update should generate changelog"""
        # First create a cultivo
        create_resp = requests.post(f"{BASE_URL}/api/cultivos", 
            headers=auth_headers,
            json={"nombre": "TEST_Cultivo_ForChangelog", "variedad": "Original", "activo": True}
        )
        assert create_resp.status_code == 200
        cultivo_id = create_resp.json()["cultivo"]["_id"]
        
        # Update it
        update_resp = requests.put(f"{BASE_URL}/api/cultivos/{cultivo_id}", 
            headers=auth_headers,
            json={"nombre": "TEST_Cultivo_ForChangelog", "variedad": "Updated", "activo": True}
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        # Check changelog
        changelog_resp = requests.get(f"{BASE_URL}/api/cultivos/{cultivo_id}/changelog", headers=auth_headers)
        assert changelog_resp.status_code == 200, f"Changelog failed: {changelog_resp.text}"
        changelog = changelog_resp.json().get("changelog", [])
        assert len(changelog) >= 1, "Changelog should have at least 1 entry"
        print(f"✓ PUT /api/cultivos/{cultivo_id} generated changelog with {len(changelog)} entries")
    
    def test_get_cultivo_changelog(self, auth_headers):
        """GET /api/cultivos/{id}/changelog - should return changelog"""
        # Get any existing cultivo
        cultivos_resp = requests.get(f"{BASE_URL}/api/cultivos", headers=auth_headers)
        cultivos = cultivos_resp.json().get("cultivos", [])
        if cultivos:
            cultivo_id = cultivos[0]["_id"]
            response = requests.get(f"{BASE_URL}/api/cultivos/{cultivo_id}/changelog", headers=auth_headers)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert "changelog" in data
            assert isinstance(data["changelog"], list)
            print(f"✓ GET /api/cultivos/{cultivo_id}/changelog returned {len(data['changelog'])} entries")
        else:
            pytest.skip("No cultivos to test changelog")
    
    def test_delete_cultivo(self, auth_headers):
        """DELETE /api/cultivos/{id} - delete cultivo"""
        # Create one to delete
        create_resp = requests.post(f"{BASE_URL}/api/cultivos", 
            headers=auth_headers,
            json={"nombre": "TEST_ToDelete_Cultivo", "activo": True}
        )
        if create_resp.status_code == 200:
            cultivo_id = create_resp.json()["cultivo"]["_id"]
            response = requests.delete(f"{BASE_URL}/api/cultivos/{cultivo_id}", headers=auth_headers)
            assert response.status_code == 200, f"Delete failed: {response.text}"
            assert response.json().get("success") == True
            print(f"✓ DELETE /api/cultivos/{cultivo_id} succeeded")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fruveco.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        return {}
    
    def test_cleanup_test_data(self, auth_headers):
        """Clean up TEST_ prefixed data"""
        # Cleanup tipos-cultivo
        tipos_resp = requests.get(f"{BASE_URL}/api/tipos-cultivo", headers=auth_headers)
        if tipos_resp.status_code == 200:
            for tipo in tipos_resp.json().get("tipos", []):
                if tipo.get("nombre", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/tipos-cultivo/{tipo['_id']}", headers=auth_headers)
        
        # Cleanup formas-pago
        formas_resp = requests.get(f"{BASE_URL}/api/formas-pago", headers=auth_headers)
        if formas_resp.status_code == 200:
            for item in formas_resp.json().get("items", []):
                if item.get("nombre", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/formas-pago/{item['_id']}", headers=auth_headers)
        
        # Cleanup tipos-iva
        iva_resp = requests.get(f"{BASE_URL}/api/tipos-iva", headers=auth_headers)
        if iva_resp.status_code == 200:
            for item in iva_resp.json().get("items", []):
                if item.get("nombre", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/tipos-iva/{item['_id']}", headers=auth_headers)
        
        # Cleanup cultivos
        cultivos_resp = requests.get(f"{BASE_URL}/api/cultivos", headers=auth_headers)
        if cultivos_resp.status_code == 200:
            for cultivo in cultivos_resp.json().get("cultivos", []):
                if cultivo.get("nombre", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/cultivos/{cultivo['_id']}", headers=auth_headers)
        
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
