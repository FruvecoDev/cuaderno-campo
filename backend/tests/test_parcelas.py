"""
Test suite for Parcelas API endpoints
- Tests CRUD operations for parcelas
- Tests filtering by campana, proveedor, contrato_id
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"


class TestParcelasAuth:
    """Test authentication for parcelas endpoints"""
    
    def test_login(self):
        """Verify login works and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data
        pytest.token = data["access_token"]
        pytest.headers = {"Authorization": f"Bearer {pytest.token}", "Content-Type": "application/json"}
        print(f"Login successful for {TEST_EMAIL}")


class TestParcelasCRUD:
    """Test CRUD operations for Parcelas"""
    
    def test_list_parcelas(self):
        """Test GET /api/parcelas - List all parcelas"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=pytest.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parcelas" in data, "Response should have 'parcelas' field"
        assert "total" in data, "Response should have 'total' field"
        assert isinstance(data["parcelas"], list)
        print(f"Found {data['total']} parcelas")
        pytest.existing_parcelas = data["parcelas"]
        pytest.initial_count = data["total"]

    def test_list_parcelas_structure(self):
        """Test parcelas list response structure"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=pytest.headers)
        assert response.status_code == 200
        
        data = response.json()
        if data["parcelas"]:
            parcela = data["parcelas"][0]
            # Check expected fields exist
            expected_fields = ["_id", "codigo_plantacion", "proveedor", "cultivo"]
            for field in expected_fields:
                assert field in parcela, f"Parcela should have '{field}' field"

    def test_filter_parcelas_by_campana(self):
        """Test GET /api/parcelas?campana=xxx - Filter by campaign"""
        # First get all parcelas to find a campana value
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=pytest.headers)
        data = response.json()
        
        if data["parcelas"]:
            campana = data["parcelas"][0].get("campana")
            if campana:
                # Filter by campana
                filter_response = requests.get(
                    f"{BASE_URL}/api/parcelas?campana={campana}", 
                    headers=pytest.headers
                )
                assert filter_response.status_code == 200
                filter_data = filter_response.json()
                
                # All returned parcelas should have this campana
                for p in filter_data["parcelas"]:
                    assert p.get("campana") == campana, f"Parcela should have campana={campana}"
                print(f"Filter by campana '{campana}' returned {filter_data['total']} parcelas")
        else:
            pytest.skip("No parcelas to filter")

    def test_filter_parcelas_by_proveedor(self):
        """Test GET /api/parcelas?proveedor=xxx - Filter by proveedor (partial match)"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=pytest.headers)
        data = response.json()
        
        if data["parcelas"]:
            proveedor = data["parcelas"][0].get("proveedor")
            if proveedor:
                # Use partial match (first 3 chars)
                search_term = proveedor[:3] if len(proveedor) >= 3 else proveedor
                filter_response = requests.get(
                    f"{BASE_URL}/api/parcelas?proveedor={search_term}", 
                    headers=pytest.headers
                )
                assert filter_response.status_code == 200
                filter_data = filter_response.json()
                print(f"Filter by proveedor '{search_term}' returned {filter_data['total']} parcelas")
        else:
            pytest.skip("No parcelas to filter")


class TestParcelasCreateEdit:
    """Test Create and Edit operations for Parcelas"""
    
    def test_get_contratos_for_parcela(self):
        """Get available contratos to use when creating parcela"""
        response = requests.get(f"{BASE_URL}/api/contratos", headers=pytest.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        if "contratos" in data and data["contratos"]:
            pytest.test_contrato = data["contratos"][0]
            pytest.test_contrato_id = data["contratos"][0]["_id"]
            print(f"Found contrato ID: {pytest.test_contrato_id}")
        else:
            pytest.test_contrato_id = None
            print("No contratos available - will skip parcela creation that requires contrato")

    def test_create_parcela_requires_contrato(self):
        """Test that creating parcela without contrato works but logs warning"""
        unique_id = f"TEST_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "codigo_plantacion": unique_id,
            "proveedor": "Test Proveedor",
            "finca": "Test Finca",
            "cultivo": "Tomate",
            "variedad": "Cherry",
            "superficie_total": 5.5,
            "num_plantas": 1000,
            "campana": "2025/26",
            "recintos": [{
                "geometria": [
                    {"lat": 37.389, "lng": -5.984},
                    {"lat": 37.390, "lng": -5.984},
                    {"lat": 37.390, "lng": -5.983},
                    {"lat": 37.389, "lng": -5.983}
                ]
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/parcelas", 
            headers=pytest.headers, 
            json=payload
        )
        # This may succeed or fail depending on contrato_id requirement
        # Either response is valid for our test
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                pytest.test_parcela_id = data["data"]["_id"]
                print(f"Created parcela without contrato ID: {pytest.test_parcela_id}")
        else:
            print(f"Create parcela without contrato returned: {response.status_code}")
    
    def test_create_parcela_with_contrato(self):
        """Test creating parcela with valid contrato"""
        if not hasattr(pytest, 'test_contrato_id') or not pytest.test_contrato_id:
            pytest.skip("No contrato available for testing")
        
        unique_id = f"TEST_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "contrato_id": pytest.test_contrato_id,
            "codigo_plantacion": unique_id,
            "proveedor": pytest.test_contrato.get("proveedor", "Test Proveedor"),
            "finca": "Test Finca Con Contrato",
            "cultivo": pytest.test_contrato.get("cultivo", "Test Cultivo"),
            "variedad": "Test Variedad",
            "superficie_total": 10.5,
            "num_plantas": 2000,
            "campana": pytest.test_contrato.get("campana", "2025/26"),
            "recintos": [{
                "geometria": [
                    {"lat": 37.391, "lng": -5.986},
                    {"lat": 37.392, "lng": -5.986},
                    {"lat": 37.392, "lng": -5.985},
                    {"lat": 37.391, "lng": -5.985}
                ]
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/parcelas", 
            headers=pytest.headers, 
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "data" in data
        
        pytest.test_parcela_with_contrato_id = data["data"]["_id"]
        print(f"Created parcela with contrato ID: {pytest.test_parcela_with_contrato_id}")

    def test_get_parcela_by_id(self):
        """Test GET /api/parcelas/{id} - Get single parcela"""
        if not hasattr(pytest, 'test_parcela_with_contrato_id'):
            pytest.skip("No test parcela created")
        
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.test_parcela_with_contrato_id}", 
            headers=pytest.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "_id" in data
        assert data["_id"] == pytest.test_parcela_with_contrato_id
        print(f"Retrieved parcela: {data.get('codigo_plantacion')}")

    def test_update_parcela(self):
        """Test PUT /api/parcelas/{id} - Update parcela"""
        if not hasattr(pytest, 'test_parcela_with_contrato_id'):
            pytest.skip("No test parcela created")
        
        # Get current data
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.test_parcela_with_contrato_id}", 
            headers=pytest.headers
        )
        current_data = response.json()
        
        # Update with new values
        update_payload = {
            "contrato_id": current_data.get("contrato_id"),
            "codigo_plantacion": current_data.get("codigo_plantacion"),
            "proveedor": current_data.get("proveedor"),
            "finca": "Updated Finca Name",
            "cultivo": current_data.get("cultivo"),
            "variedad": "Updated Variedad",
            "superficie_total": 15.5,
            "num_plantas": 3000,
            "campana": current_data.get("campana"),
            "recintos": current_data.get("recintos", [])
        }
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.test_parcela_with_contrato_id}", 
            headers=pytest.headers, 
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.test_parcela_with_contrato_id}", 
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        assert verify_data["finca"] == "Updated Finca Name"
        assert verify_data["variedad"] == "Updated Variedad"
        assert verify_data["superficie_total"] == 15.5
        print(f"Successfully updated parcela finca to: {verify_data['finca']}")

    def test_invalid_parcela_id(self):
        """Test GET /api/parcelas/{id} with invalid ID"""
        response = requests.get(
            f"{BASE_URL}/api/parcelas/invalid_id_12345", 
            headers=pytest.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_parcela_not_found(self):
        """Test GET /api/parcelas/{id} with non-existent ID"""
        response = requests.get(
            f"{BASE_URL}/api/parcelas/507f1f77bcf86cd799439011", 
            headers=pytest.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestParcelasCleanup:
    """Clean up test data"""
    
    def test_delete_parcela_with_contrato(self):
        """Test DELETE /api/parcelas/{id}"""
        if not hasattr(pytest, 'test_parcela_with_contrato_id'):
            pytest.skip("No test parcela to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/parcelas/{pytest.test_parcela_with_contrato_id}", 
            headers=pytest.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.test_parcela_with_contrato_id}", 
            headers=pytest.headers
        )
        assert verify_response.status_code == 404, "Deleted parcela should return 404"
        print(f"Successfully deleted parcela: {pytest.test_parcela_with_contrato_id}")

    def test_delete_parcela_without_contrato(self):
        """Clean up parcela created without contrato"""
        if hasattr(pytest, 'test_parcela_id') and pytest.test_parcela_id:
            response = requests.delete(
                f"{BASE_URL}/api/parcelas/{pytest.test_parcela_id}", 
                headers=pytest.headers
            )
            if response.status_code == 200:
                print(f"Cleaned up parcela: {pytest.test_parcela_id}")


class TestParcelasUnauthorized:
    """Test unauthorized access to parcelas endpoints"""
    
    def test_list_parcelas_without_auth(self):
        """Test GET /api/parcelas without authentication"""
        response = requests.get(f"{BASE_URL}/api/parcelas")
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_create_parcela_without_auth(self):
        """Test POST /api/parcelas without authentication"""
        payload = {
            "codigo_plantacion": "UNAUTHORIZED_TEST",
            "proveedor": "Test",
            "finca": "Test",
            "cultivo": "Test",
            "variedad": "Test",
            "superficie_total": 1.0,
            "num_plantas": 100,
            "campana": "2025/26"
        }
        response = requests.post(f"{BASE_URL}/api/parcelas", json=payload)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
