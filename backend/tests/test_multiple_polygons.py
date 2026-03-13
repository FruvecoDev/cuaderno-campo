"""
Test suite for Multiple Polygons (Zonas) per Parcela feature
Tests:
- Create parcela with multiple recintos
- Update parcela with array of recintos
- Delete specific zona while keeping others
- API endpoint PUT /api/parcelas/{id} accepts array of recintos
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"


class TestMultiplePolygonsSetup:
    """Setup authentication for multiple polygon tests"""
    
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


class TestMultiplePolygonsCreate:
    """Test creating parcelas with multiple zones (recintos)"""
    
    def test_get_contrato_for_parcela(self):
        """Get a contrato to associate with test parcela"""
        response = requests.get(f"{BASE_URL}/api/contratos", headers=pytest.headers)
        assert response.status_code == 200
        data = response.json()
        if "contratos" in data and data["contratos"]:
            pytest.test_contrato = data["contratos"][0]
            pytest.test_contrato_id = data["contratos"][0]["_id"]
            print(f"Using contrato ID: {pytest.test_contrato_id}")
        else:
            pytest.test_contrato_id = None
            print("No contratos available")
    
    def test_create_parcela_with_multiple_recintos(self):
        """Create a parcela with multiple recintos (zones)"""
        if not hasattr(pytest, 'test_contrato_id') or not pytest.test_contrato_id:
            pytest.skip("No contrato available for testing")
        
        unique_id = f"TEST_MULTI_{uuid.uuid4().hex[:8]}"
        
        # Create parcela with 2 zones (recintos)
        payload = {
            "contrato_id": pytest.test_contrato_id,
            "codigo_plantacion": unique_id,
            "proveedor": pytest.test_contrato.get("proveedor", "Test Proveedor"),
            "finca": "Test Finca Multiple Zones",
            "cultivo": pytest.test_contrato.get("cultivo", "Test Cultivo"),
            "variedad": "Test Variedad",
            "superficie_total": 20.0,
            "num_plantas": 4000,
            "campana": pytest.test_contrato.get("campana", "2025/26"),
            "recintos": [
                {
                    "geometria": [
                        {"lat": 37.400, "lng": -5.990},
                        {"lat": 37.401, "lng": -5.990},
                        {"lat": 37.401, "lng": -5.989},
                        {"lat": 37.400, "lng": -5.989}
                    ],
                    "superficie_recinto": 5.0
                },
                {
                    "geometria": [
                        {"lat": 37.402, "lng": -5.988},
                        {"lat": 37.403, "lng": -5.988},
                        {"lat": 37.403, "lng": -5.987},
                        {"lat": 37.402, "lng": -5.987}
                    ],
                    "superficie_recinto": 6.0
                }
            ]
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
        
        pytest.multi_parcela_id = data["data"]["_id"]
        print(f"Created parcela with multiple zones ID: {pytest.multi_parcela_id}")
        
        # Verify the parcela has 2 recintos
        assert "recintos" in data["data"]
        assert len(data["data"]["recintos"]) == 2, f"Expected 2 recintos, got {len(data['data']['recintos'])}"
        print(f"Verified parcela has {len(data['data']['recintos'])} zones")

    def test_verify_multiple_recintos_persisted(self):
        """Verify multiple recintos are correctly retrieved"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "recintos" in data
        assert len(data["recintos"]) == 2, f"Expected 2 recintos, got {len(data['recintos'])}"
        
        # Verify each recinto has geometria
        for i, recinto in enumerate(data["recintos"]):
            assert "geometria" in recinto, f"Recinto {i} missing geometria"
            assert len(recinto["geometria"]) >= 3, f"Recinto {i} should have at least 3 points"
        
        print(f"Verified GET returns {len(data['recintos'])} zones with correct structure")


class TestMultiplePolygonsUpdate:
    """Test updating parcelas with multiple zones"""
    
    def test_add_third_recinto(self):
        """Add a third zone to an existing parcela with 2 zones"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        # Get current parcela
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        current = response.json()
        
        # Add a third recinto
        new_recintos = current.get("recintos", []) + [{
            "geometria": [
                {"lat": 37.404, "lng": -5.986},
                {"lat": 37.405, "lng": -5.986},
                {"lat": 37.405, "lng": -5.985},
                {"lat": 37.404, "lng": -5.985}
            ],
            "superficie_recinto": 4.5
        }]
        
        update_payload = {
            "recintos": new_recintos
        }
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify 3 recintos now
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        assert len(verify_data["recintos"]) == 3, f"Expected 3 recintos, got {len(verify_data['recintos'])}"
        print(f"Successfully added third zone - now has {len(verify_data['recintos'])} zones")

    def test_update_specific_recinto(self):
        """Update geometry of specific zone while keeping others"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        # Get current parcela
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        current = response.json()
        
        # Update second recinto's geometry
        updated_recintos = current.get("recintos", [])
        if len(updated_recintos) >= 2:
            updated_recintos[1] = {
                "geometria": [
                    {"lat": 37.410, "lng": -5.980},
                    {"lat": 37.411, "lng": -5.980},
                    {"lat": 37.411, "lng": -5.979},
                    {"lat": 37.410, "lng": -5.979}
                ],
                "superficie_recinto": 7.5
            }
        
        update_payload = {"recintos": updated_recintos}
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        
        # Check second recinto was updated
        second_recinto = verify_data["recintos"][1]
        assert second_recinto["geometria"][0]["lat"] == 37.410, "Second recinto should have updated lat"
        print("Successfully updated specific zone geometry")

    def test_delete_one_recinto(self):
        """Delete one zone while keeping others"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        # Get current parcela
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        current = response.json()
        original_count = len(current.get("recintos", []))
        
        if original_count < 2:
            pytest.skip("Need at least 2 recintos to test deletion")
        
        # Remove first recinto (index 0)
        remaining_recintos = current["recintos"][1:]  # Keep all except first
        
        update_payload = {"recintos": remaining_recintos}
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        # Verify count reduced
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        new_count = len(verify_data["recintos"])
        
        assert new_count == original_count - 1, f"Expected {original_count - 1} recintos, got {new_count}"
        print(f"Successfully deleted one zone - reduced from {original_count} to {new_count} zones")

    def test_replace_all_recintos(self):
        """Replace all recintos with new ones"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        # Replace with 4 new recintos
        new_recintos = [
            {
                "geometria": [
                    {"lat": 37.500, "lng": -5.900},
                    {"lat": 37.501, "lng": -5.900},
                    {"lat": 37.501, "lng": -5.899},
                    {"lat": 37.500, "lng": -5.899}
                ],
                "superficie_recinto": 2.0
            },
            {
                "geometria": [
                    {"lat": 37.502, "lng": -5.898},
                    {"lat": 37.503, "lng": -5.898},
                    {"lat": 37.503, "lng": -5.897},
                    {"lat": 37.502, "lng": -5.897}
                ],
                "superficie_recinto": 2.5
            },
            {
                "geometria": [
                    {"lat": 37.504, "lng": -5.896},
                    {"lat": 37.505, "lng": -5.896},
                    {"lat": 37.505, "lng": -5.895},
                    {"lat": 37.504, "lng": -5.895}
                ],
                "superficie_recinto": 3.0
            },
            {
                "geometria": [
                    {"lat": 37.506, "lng": -5.894},
                    {"lat": 37.507, "lng": -5.894},
                    {"lat": 37.507, "lng": -5.893},
                    {"lat": 37.506, "lng": -5.893}
                ],
                "superficie_recinto": 3.5
            }
        ]
        
        update_payload = {"recintos": new_recintos}
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        assert len(verify_data["recintos"]) == 4, f"Expected 4 recintos, got {len(verify_data['recintos'])}"
        print(f"Successfully replaced all zones - now has 4 zones")


class TestMultiplePolygonsRecintoStructure:
    """Test recinto structure and validation"""
    
    def test_recinto_fields_preserved(self):
        """Test that recinto fields like superficie_recinto are preserved"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        # Update with detailed recinto data
        detailed_recinto = [{
            "geometria": [
                {"lat": 37.600, "lng": -5.800},
                {"lat": 37.601, "lng": -5.800},
                {"lat": 37.601, "lng": -5.799},
                {"lat": 37.600, "lng": -5.799}
            ],
            "superficie_recinto": 8.75,
            "sigpac": "11-029-0001-00001-0001",
            "superficie_sigpac": 9.0
        }]
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers,
            json={"recintos": detailed_recinto}
        )
        assert response.status_code == 200
        
        # Verify fields preserved
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        recinto = verify_data["recintos"][0]
        
        assert recinto.get("superficie_recinto") == 8.75, "superficie_recinto should be preserved"
        assert recinto.get("sigpac") == "11-029-0001-00001-0001", "sigpac should be preserved"
        print("Verified recinto fields are preserved after update")

    def test_empty_recintos_allowed(self):
        """Test that parcela can have empty recintos array"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela created")
        
        # Set empty recintos
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers,
            json={"recintos": []}
        )
        assert response.status_code == 200
        
        # Verify empty
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        verify_data = verify_response.json()
        assert verify_data["recintos"] == [], "recintos should be empty array"
        print("Verified parcela can have empty recintos array")


class TestMultiplePolygonsCleanup:
    """Clean up test data"""
    
    def test_delete_test_parcela(self):
        """Delete test parcela created for multiple polygon tests"""
        if not hasattr(pytest, 'multi_parcela_id'):
            pytest.skip("No test parcela to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        assert response.status_code == 200
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_parcela_id}",
            headers=pytest.headers
        )
        assert verify_response.status_code == 404, "Deleted parcela should return 404"
        print(f"Successfully cleaned up test parcela: {pytest.multi_parcela_id}")
