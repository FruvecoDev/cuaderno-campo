"""
Test suite for Parcelas Multi-Zone (Multiple Recintos) functionality
- Tests CRUD operations for parcelas with multiple zones/recintos
- Verifies that multiple polygons can be stored and retrieved
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"


class TestMultiZoneAuth:
    """Test authentication for multi-zone parcelas tests"""
    
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


class TestMultiZoneCreate:
    """Test creating parcelas with multiple zones/recintos"""
    
    def test_get_contrato_for_parcela(self):
        """Get a contrato ID to use for creating parcela"""
        response = requests.get(f"{BASE_URL}/api/contratos", headers=pytest.headers)
        assert response.status_code == 200
        data = response.json()
        if "contratos" in data and data["contratos"]:
            pytest.test_contrato = data["contratos"][0]
            pytest.test_contrato_id = data["contratos"][0]["_id"]
            print(f"Using contrato ID: {pytest.test_contrato_id}")
        else:
            pytest.skip("No contratos available")
    
    def test_create_parcela_with_single_zone(self):
        """Test creating parcela with 1 zone (recinto)"""
        unique_id = f"TEST_SINGLE_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "contrato_id": pytest.test_contrato_id,
            "codigo_plantacion": unique_id,
            "proveedor": pytest.test_contrato.get("proveedor", "Test Proveedor"),
            "finca": "Test Finca Single Zone",
            "cultivo": pytest.test_contrato.get("cultivo", "Test Cultivo"),
            "variedad": "Test Variedad",
            "superficie_total": 5.0,
            "num_plantas": 1000,
            "campana": pytest.test_contrato.get("campana", "2025/26"),
            "recintos": [{
                "geometria": [
                    {"lat": 37.389, "lng": -5.984},
                    {"lat": 37.390, "lng": -5.984},
                    {"lat": 37.390, "lng": -5.983},
                    {"lat": 37.389, "lng": -5.983}
                ]
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/parcelas", headers=pytest.headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "recintos" in data["data"]
        assert len(data["data"]["recintos"]) == 1, "Should have exactly 1 recinto"
        assert len(data["data"]["recintos"][0]["geometria"]) == 4, "First recinto should have 4 points"
        
        pytest.single_zone_parcela_id = data["data"]["_id"]
        print(f"Created single-zone parcela: {pytest.single_zone_parcela_id}")
    
    def test_create_parcela_with_multiple_zones(self):
        """Test creating parcela with 3 zones (recintos)"""
        unique_id = f"TEST_MULTI_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "contrato_id": pytest.test_contrato_id,
            "codigo_plantacion": unique_id,
            "proveedor": pytest.test_contrato.get("proveedor", "Test Proveedor"),
            "finca": "Test Finca Multi Zone",
            "cultivo": pytest.test_contrato.get("cultivo", "Test Cultivo"),
            "variedad": "Test Variedad Multi",
            "superficie_total": 15.0,
            "num_plantas": 3000,
            "campana": pytest.test_contrato.get("campana", "2025/26"),
            "recintos": [
                {
                    "geometria": [
                        {"lat": 37.389, "lng": -5.984},
                        {"lat": 37.390, "lng": -5.984},
                        {"lat": 37.390, "lng": -5.983},
                        {"lat": 37.389, "lng": -5.983}
                    ]
                },
                {
                    "geometria": [
                        {"lat": 37.391, "lng": -5.986},
                        {"lat": 37.392, "lng": -5.986},
                        {"lat": 37.392, "lng": -5.985},
                        {"lat": 37.391, "lng": -5.985}
                    ]
                },
                {
                    "geometria": [
                        {"lat": 37.393, "lng": -5.988},
                        {"lat": 37.394, "lng": -5.988},
                        {"lat": 37.394, "lng": -5.987},
                        {"lat": 37.393, "lng": -5.987}
                    ]
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/parcelas", headers=pytest.headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "recintos" in data["data"]
        assert len(data["data"]["recintos"]) == 3, "Should have exactly 3 recintos"
        
        # Verify each recinto has correct geometry
        for i, recinto in enumerate(data["data"]["recintos"]):
            assert "geometria" in recinto, f"Recinto {i} should have geometria"
            assert len(recinto["geometria"]) == 4, f"Recinto {i} should have 4 points"
        
        pytest.multi_zone_parcela_id = data["data"]["_id"]
        print(f"Created multi-zone parcela with 3 zones: {pytest.multi_zone_parcela_id}")
    
    def test_create_parcela_with_complex_polygon(self):
        """Test creating parcela with a zone that has many points (complex polygon)"""
        unique_id = f"TEST_COMPLEX_{uuid.uuid4().hex[:8]}"
        
        # Create a polygon with 8 points (octagon-like)
        complex_geometry = [
            {"lat": 37.400, "lng": -5.990},
            {"lat": 37.401, "lng": -5.989},
            {"lat": 37.402, "lng": -5.989},
            {"lat": 37.403, "lng": -5.990},
            {"lat": 37.403, "lng": -5.991},
            {"lat": 37.402, "lng": -5.992},
            {"lat": 37.401, "lng": -5.992},
            {"lat": 37.400, "lng": -5.991}
        ]
        
        payload = {
            "contrato_id": pytest.test_contrato_id,
            "codigo_plantacion": unique_id,
            "proveedor": pytest.test_contrato.get("proveedor", "Test Proveedor"),
            "finca": "Test Finca Complex",
            "cultivo": pytest.test_contrato.get("cultivo", "Test Cultivo"),
            "variedad": "Test Variedad Complex",
            "superficie_total": 8.0,
            "num_plantas": 1500,
            "campana": pytest.test_contrato.get("campana", "2025/26"),
            "recintos": [{
                "geometria": complex_geometry
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/parcelas", headers=pytest.headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert len(data["data"]["recintos"]) == 1
        assert len(data["data"]["recintos"][0]["geometria"]) == 8, "Should have 8 points"
        
        pytest.complex_parcela_id = data["data"]["_id"]
        print(f"Created complex polygon parcela with 8 points: {pytest.complex_parcela_id}")


class TestMultiZoneRead:
    """Test reading parcelas with multiple zones"""
    
    def test_get_multi_zone_parcela_by_id(self):
        """Test GET /api/parcelas/{id} returns all recintos"""
        if not hasattr(pytest, 'multi_zone_parcela_id'):
            pytest.skip("No multi-zone parcela created")
        
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_zone_parcela_id}",
            headers=pytest.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "_id" in data
        assert "recintos" in data
        assert len(data["recintos"]) == 3, "Should return all 3 recintos"
        
        # Verify geometry is preserved
        for i, recinto in enumerate(data["recintos"]):
            assert "geometria" in recinto
            assert len(recinto["geometria"]) == 4
            for point in recinto["geometria"]:
                assert "lat" in point
                assert "lng" in point
        
        print(f"Retrieved parcela with {len(data['recintos'])} zones")
    
    def test_list_parcelas_includes_recintos(self):
        """Test GET /api/parcelas returns recintos array for each parcela"""
        response = requests.get(f"{BASE_URL}/api/parcelas", headers=pytest.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "parcelas" in data
        
        # Find our test parcela
        test_parcela = None
        for p in data["parcelas"]:
            if p.get("_id") == pytest.multi_zone_parcela_id:
                test_parcela = p
                break
        
        if test_parcela:
            assert "recintos" in test_parcela
            assert len(test_parcela["recintos"]) == 3
            print(f"List endpoint returns parcela with {len(test_parcela['recintos'])} recintos")
        else:
            print("Test parcela not found in list (may have been cleaned up)")


class TestMultiZoneUpdate:
    """Test updating parcelas with multiple zones"""
    
    def test_update_parcela_add_zone(self):
        """Test adding a new zone to existing parcela"""
        if not hasattr(pytest, 'multi_zone_parcela_id'):
            pytest.skip("No multi-zone parcela created")
        
        # Get current parcela
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_zone_parcela_id}",
            headers=pytest.headers
        )
        current_data = response.json()
        current_recintos = current_data.get("recintos", [])
        
        # Add a 4th zone
        new_recintos = current_recintos + [{
            "geometria": [
                {"lat": 37.395, "lng": -5.990},
                {"lat": 37.396, "lng": -5.990},
                {"lat": 37.396, "lng": -5.989},
                {"lat": 37.395, "lng": -5.989}
            ]
        }]
        
        update_payload = {"recintos": new_recintos}
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_zone_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert len(data["data"]["recintos"]) == 4, "Should now have 4 recintos"
        
        print(f"Updated parcela to have 4 zones")
    
    def test_update_parcela_remove_zone(self):
        """Test removing a zone from existing parcela"""
        if not hasattr(pytest, 'multi_zone_parcela_id'):
            pytest.skip("No multi-zone parcela created")
        
        # Get current parcela
        response = requests.get(
            f"{BASE_URL}/api/parcelas/{pytest.multi_zone_parcela_id}",
            headers=pytest.headers
        )
        current_data = response.json()
        current_recintos = current_data.get("recintos", [])
        
        # Remove the last zone (keep first 3)
        new_recintos = current_recintos[:3]
        
        update_payload = {"recintos": new_recintos}
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.multi_zone_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert len(data["data"]["recintos"]) == 3, "Should now have 3 recintos"
        
        print(f"Updated parcela back to 3 zones")
    
    def test_update_parcela_replace_all_zones(self):
        """Test replacing all zones with new ones"""
        if not hasattr(pytest, 'single_zone_parcela_id'):
            pytest.skip("No single-zone parcela created")
        
        # Replace single zone with 2 new zones
        new_recintos = [
            {
                "geometria": [
                    {"lat": 37.410, "lng": -5.995},
                    {"lat": 37.411, "lng": -5.995},
                    {"lat": 37.411, "lng": -5.994},
                    {"lat": 37.410, "lng": -5.994}
                ]
            },
            {
                "geometria": [
                    {"lat": 37.412, "lng": -5.997},
                    {"lat": 37.413, "lng": -5.997},
                    {"lat": 37.413, "lng": -5.996},
                    {"lat": 37.412, "lng": -5.996}
                ]
            }
        ]
        
        update_payload = {"recintos": new_recintos}
        
        response = requests.put(
            f"{BASE_URL}/api/parcelas/{pytest.single_zone_parcela_id}",
            headers=pytest.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert len(data["data"]["recintos"]) == 2, "Should now have 2 recintos"
        
        # Verify the new coordinates
        first_recinto = data["data"]["recintos"][0]
        assert first_recinto["geometria"][0]["lat"] == 37.410
        
        print(f"Replaced zones - parcela now has 2 zones")


class TestMultiZoneCleanup:
    """Clean up test data"""
    
    def test_delete_single_zone_parcela(self):
        """Delete single-zone test parcela"""
        if hasattr(pytest, 'single_zone_parcela_id'):
            response = requests.delete(
                f"{BASE_URL}/api/parcelas/{pytest.single_zone_parcela_id}",
                headers=pytest.headers
            )
            assert response.status_code == 200
            print(f"Deleted single-zone parcela: {pytest.single_zone_parcela_id}")
    
    def test_delete_multi_zone_parcela(self):
        """Delete multi-zone test parcela"""
        if hasattr(pytest, 'multi_zone_parcela_id'):
            response = requests.delete(
                f"{BASE_URL}/api/parcelas/{pytest.multi_zone_parcela_id}",
                headers=pytest.headers
            )
            assert response.status_code == 200
            print(f"Deleted multi-zone parcela: {pytest.multi_zone_parcela_id}")
    
    def test_delete_complex_parcela(self):
        """Delete complex polygon test parcela"""
        if hasattr(pytest, 'complex_parcela_id'):
            response = requests.delete(
                f"{BASE_URL}/api/parcelas/{pytest.complex_parcela_id}",
                headers=pytest.headers
            )
            assert response.status_code == 200
            print(f"Deleted complex parcela: {pytest.complex_parcela_id}")
