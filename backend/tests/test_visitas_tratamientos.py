"""
Test suite for Visitas and Tratamientos simplified model.
Tests:
- Create Visita with only parcela_id - verify data inheritance
- Create Tratamiento with only parcelas_ids - verify data inheritance
- Edit Visita - verify correct functionality
- Delete Visita - verify correct functionality
- List Visitas - verify inherited data (proveedor, cultivo, campaña)
- List Tratamientos - verify inherited data (campaña)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://farm-companion-20.preview.emergentagent.com"

# Test data - known parcela with contrato_id
TEST_PARCELA_ID = "699c66b30212bdd0ecbc6f5e"
TEST_CONTRATO_ID = "699c66aa0212bdd0ecbc6f5d"
EXPECTED_PROVEEDOR = "AgroTest"
EXPECTED_CULTIVO = "Tomate"
EXPECTED_CAMPANA = "2025/26"
EXPECTED_VARIEDAD = "Cherry"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@agrogest.com",
            "password": "Test123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test admin login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Admin login successful, token received")


class TestVisitasSimplifiedModel:
    """Test Visitas CRUD with simplified model - only parcela_id required"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@agrogest.com",
            "password": "Test123!"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_visita_with_only_parcela_id(self, headers):
        """
        Test creating Visita with only parcela_id
        Backend should automatically inherit: contrato_id, proveedor, cultivo, campana, variedad
        """
        # SIMPLIFIED PAYLOAD - only parcela_id and objetivo required
        payload = {
            "objetivo": "Control Rutinario",
            "parcela_id": TEST_PARCELA_ID,
            "fecha_visita": "2026-02-23",
            "observaciones": "TEST_visita_automated_test"
        }
        
        response = requests.post(f"{BASE_URL}/api/visitas", json=payload, headers=headers)
        assert response.status_code == 200, f"Create visita failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        visita = data.get("data", {})
        assert "_id" in visita, "Created visita should have _id"
        
        # Verify data inheritance from parcela
        assert visita.get("proveedor") == EXPECTED_PROVEEDOR, f"Expected proveedor '{EXPECTED_PROVEEDOR}', got '{visita.get('proveedor')}'"
        assert visita.get("cultivo") == EXPECTED_CULTIVO, f"Expected cultivo '{EXPECTED_CULTIVO}', got '{visita.get('cultivo')}'"
        assert visita.get("campana") == EXPECTED_CAMPANA, f"Expected campana '{EXPECTED_CAMPANA}', got '{visita.get('campana')}'"
        assert visita.get("variedad") == EXPECTED_VARIEDAD, f"Expected variedad '{EXPECTED_VARIEDAD}', got '{visita.get('variedad')}'"
        assert visita.get("contrato_id") == TEST_CONTRATO_ID, f"Expected contrato_id '{TEST_CONTRATO_ID}', got '{visita.get('contrato_id')}'"
        
        print(f"✓ Visita created successfully with inherited data:")
        print(f"  - proveedor: {visita.get('proveedor')}")
        print(f"  - cultivo: {visita.get('cultivo')}")
        print(f"  - campana: {visita.get('campana')}")
        print(f"  - contrato_id: {visita.get('contrato_id')}")
        
        # Store visita_id for later tests
        return visita["_id"]
    
    def test_list_visitas_shows_inherited_data(self, headers):
        """Test that listing visitas shows inherited data (proveedor, cultivo, campaña)"""
        response = requests.get(f"{BASE_URL}/api/visitas", headers=headers)
        assert response.status_code == 200, f"Get visitas failed: {response.text}"
        
        data = response.json()
        assert "visitas" in data, "Response should have 'visitas' key"
        
        visitas = data["visitas"]
        print(f"✓ Found {len(visitas)} visitas")
        
        # Check if any visita has inherited data
        for visita in visitas:
            if visita.get("parcela_id") == TEST_PARCELA_ID:
                assert visita.get("proveedor"), "Visita should have proveedor"
                assert visita.get("cultivo"), "Visita should have cultivo"
                assert visita.get("campana"), "Visita should have campana"
                print(f"  ✓ Visita {visita.get('_id')} has inherited data:")
                print(f"    proveedor={visita.get('proveedor')}, cultivo={visita.get('cultivo')}, campaña={visita.get('campana')}")
                break
    
    def test_edit_visita(self, headers):
        """Test editing an existing Visita"""
        # First create a visita
        create_payload = {
            "objetivo": "Evaluación",
            "parcela_id": TEST_PARCELA_ID,
            "fecha_visita": "2026-02-24",
            "observaciones": "TEST_visita_to_edit"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/visitas", json=create_payload, headers=headers)
        assert create_response.status_code == 200, f"Create visita for edit test failed: {create_response.text}"
        
        visita_id = create_response.json()["data"]["_id"]
        print(f"✓ Created visita {visita_id} for edit test")
        
        # Edit the visita
        edit_payload = {
            "objetivo": "Informe",
            "parcela_id": TEST_PARCELA_ID,
            "fecha_visita": "2026-02-25",
            "observaciones": "TEST_visita_edited_successfully"
        }
        
        edit_response = requests.put(f"{BASE_URL}/api/visitas/{visita_id}", json=edit_payload, headers=headers)
        assert edit_response.status_code == 200, f"Edit visita failed: {edit_response.text}"
        
        edited_data = edit_response.json()
        assert edited_data.get("success") == True, "Edit should return success=True"
        
        edited_visita = edited_data.get("data", {})
        assert edited_visita.get("objetivo") == "Informe", f"Objetivo should be 'Informe', got '{edited_visita.get('objetivo')}'"
        assert edited_visita.get("observaciones") == "TEST_visita_edited_successfully"
        
        # Verify inherited data is preserved after edit
        assert edited_visita.get("proveedor") == EXPECTED_PROVEEDOR
        assert edited_visita.get("cultivo") == EXPECTED_CULTIVO
        assert edited_visita.get("campana") == EXPECTED_CAMPANA
        
        print(f"✓ Visita edited successfully")
        print(f"  - objetivo: {edited_visita.get('objetivo')}")
        print(f"  - Inherited data preserved: proveedor={edited_visita.get('proveedor')}")
        
        return visita_id
    
    def test_delete_visita(self, headers):
        """Test deleting a Visita"""
        # First create a visita to delete
        create_payload = {
            "objetivo": "Control Rutinario",
            "parcela_id": TEST_PARCELA_ID,
            "observaciones": "TEST_visita_to_delete"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/visitas", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        
        visita_id = create_response.json()["data"]["_id"]
        print(f"✓ Created visita {visita_id} for delete test")
        
        # Delete the visita
        delete_response = requests.delete(f"{BASE_URL}/api/visitas/{visita_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete visita failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") == True
        
        # Verify visita is deleted (GET should return 404)
        get_response = requests.get(f"{BASE_URL}/api/visitas/{visita_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted visita should return 404"
        
        print(f"✓ Visita {visita_id} deleted successfully")
    
    def test_create_visita_without_parcela_id_fails(self, headers):
        """Test that creating visita without parcela_id fails with proper error"""
        payload = {
            "objetivo": "Control Rutinario"
            # parcela_id is missing
        }
        
        response = requests.post(f"{BASE_URL}/api/visitas", json=payload, headers=headers)
        # Should return 400 or 422 validation error
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print(f"✓ Creating visita without parcela_id correctly fails with status {response.status_code}")


class TestTratamientosSimplifiedModel:
    """Test Tratamientos CRUD with simplified model - only parcelas_ids required"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@agrogest.com",
            "password": "Test123!"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_tratamiento_with_only_parcelas_ids(self, headers):
        """
        Test creating Tratamiento with only parcelas_ids
        Backend should automatically inherit: contrato_id, cultivo_id, campana
        """
        # SIMPLIFIED PAYLOAD - only parcelas_ids required
        payload = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Insecticida",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 5.5,
            "caldo_superficie": 500,
            "parcelas_ids": [TEST_PARCELA_ID]  # Only required field for context
        }
        
        response = requests.post(f"{BASE_URL}/api/tratamientos", json=payload, headers=headers)
        assert response.status_code == 200, f"Create tratamiento failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        tratamiento = data.get("data", {})
        assert "_id" in tratamiento, "Created tratamiento should have _id"
        
        # Verify data inheritance from parcela
        assert tratamiento.get("campana") == EXPECTED_CAMPANA, f"Expected campana '{EXPECTED_CAMPANA}', got '{tratamiento.get('campana')}'"
        assert tratamiento.get("contrato_id") == TEST_CONTRATO_ID, f"Expected contrato_id '{TEST_CONTRATO_ID}', got '{tratamiento.get('contrato_id')}'"
        
        print(f"✓ Tratamiento created successfully with inherited data:")
        print(f"  - campana: {tratamiento.get('campana')}")
        print(f"  - contrato_id: {tratamiento.get('contrato_id')}")
        print(f"  - cultivo_id: {tratamiento.get('cultivo_id')}")
        
        return tratamiento["_id"]
    
    def test_list_tratamientos_shows_inherited_campana(self, headers):
        """Test that listing tratamientos shows inherited campaña"""
        response = requests.get(f"{BASE_URL}/api/tratamientos", headers=headers)
        assert response.status_code == 200, f"Get tratamientos failed: {response.text}"
        
        data = response.json()
        assert "tratamientos" in data, "Response should have 'tratamientos' key"
        
        tratamientos = data["tratamientos"]
        print(f"✓ Found {len(tratamientos)} tratamientos")
        
        # Check if any tratamiento has inherited campana
        for tratamiento in tratamientos:
            if TEST_PARCELA_ID in tratamiento.get("parcelas_ids", []):
                assert tratamiento.get("campana"), "Tratamiento should have campana"
                print(f"  ✓ Tratamiento {tratamiento.get('_id')} has inherited campana: {tratamiento.get('campana')}")
                break
    
    def test_edit_tratamiento(self, headers):
        """Test editing an existing Tratamiento"""
        # First create a tratamiento
        create_payload = {
            "tipo_tratamiento": "NUTRICIÓN",
            "subtipo": "Fertilizante",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Quimigación",
            "superficie_aplicacion": 3.0,
            "caldo_superficie": 300,
            "parcelas_ids": [TEST_PARCELA_ID]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/tratamientos", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        
        tratamiento_id = create_response.json()["data"]["_id"]
        print(f"✓ Created tratamiento {tratamiento_id} for edit test")
        
        # Edit the tratamiento
        edit_payload = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Fungicida",
            "aplicacion_numero": 2,
            "metodo_aplicacion": "Aplicación Foliar",
            "superficie_aplicacion": 4.0,
            "caldo_superficie": 400,
            "parcelas_ids": [TEST_PARCELA_ID]
        }
        
        edit_response = requests.put(f"{BASE_URL}/api/tratamientos/{tratamiento_id}", json=edit_payload, headers=headers)
        assert edit_response.status_code == 200, f"Edit tratamiento failed: {edit_response.text}"
        
        edited_data = edit_response.json()
        assert edited_data.get("success") == True
        
        edited_tratamiento = edited_data.get("data", {})
        assert edited_tratamiento.get("tipo_tratamiento") == "FITOSANITARIOS"
        assert edited_tratamiento.get("subtipo") == "Fungicida"
        assert edited_tratamiento.get("aplicacion_numero") == 2
        
        print(f"✓ Tratamiento edited successfully")
        print(f"  - tipo: {edited_tratamiento.get('tipo_tratamiento')}")
        print(f"  - subtipo: {edited_tratamiento.get('subtipo')}")
        
        return tratamiento_id
    
    def test_delete_tratamiento(self, headers):
        """Test deleting a Tratamiento"""
        # First create a tratamiento to delete
        create_payload = {
            "tipo_tratamiento": "ENMIENDAS",
            "subtipo": "Bioestimulante",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Aplicación al Suelo",
            "superficie_aplicacion": 2.0,
            "caldo_superficie": 200,
            "parcelas_ids": [TEST_PARCELA_ID]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/tratamientos", json=create_payload, headers=headers)
        assert create_response.status_code == 200
        
        tratamiento_id = create_response.json()["data"]["_id"]
        print(f"✓ Created tratamiento {tratamiento_id} for delete test")
        
        # Delete the tratamiento
        delete_response = requests.delete(f"{BASE_URL}/api/tratamientos/{tratamiento_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete tratamiento failed: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("success") == True
        
        # Verify tratamiento is deleted (GET should return 404)
        get_response = requests.get(f"{BASE_URL}/api/tratamientos/{tratamiento_id}", headers=headers)
        assert get_response.status_code == 404, "Deleted tratamiento should return 404"
        
        print(f"✓ Tratamiento {tratamiento_id} deleted successfully")
    
    def test_create_tratamiento_without_parcelas_fails(self, headers):
        """Test that creating tratamiento without parcelas_ids fails with proper error"""
        payload = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Insecticida",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 5.0,
            "caldo_superficie": 500,
            "parcelas_ids": []  # Empty array should fail
        }
        
        response = requests.post(f"{BASE_URL}/api/tratamientos", json=payload, headers=headers)
        # Should return 400 validation error
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Creating tratamiento without parcelas correctly fails with status {response.status_code}")


class TestCleanup:
    """Clean up test data created during tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@agrogest.com",
            "password": "Test123!"
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_visitas(self, headers):
        """Clean up TEST_ prefixed visitas"""
        response = requests.get(f"{BASE_URL}/api/visitas", headers=headers)
        if response.status_code == 200:
            visitas = response.json().get("visitas", [])
            deleted_count = 0
            for visita in visitas:
                if "TEST_" in str(visita.get("observaciones", "")):
                    delete_response = requests.delete(f"{BASE_URL}/api/visitas/{visita['_id']}", headers=headers)
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test visitas")
    
    def test_cleanup_test_tratamientos(self, headers):
        """Clean up TEST_ prefixed tratamientos (if any)"""
        response = requests.get(f"{BASE_URL}/api/tratamientos", headers=headers)
        if response.status_code == 200:
            tratamientos = response.json().get("tratamientos", [])
            # Tratamientos don't have observaciones, so we'll skip detailed cleanup
            print(f"✓ Found {len(tratamientos)} tratamientos (cleanup based on test run)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
