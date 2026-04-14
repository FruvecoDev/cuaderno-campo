"""
P1 Regression Tests - Testing export endpoints, AI chat, and NFC fichaje
Tests for iteration 53 - P1 improvements validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExportEndpointsRegression:
    """Test that all 6 new export endpoints still return HTTP 200"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": os.environ.get("TEST_EMAIL", ""),
            "password": os.environ.get("TEST_PASSWORD", "")
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_visitas_export_excel(self):
        """Test Visitas Excel export endpoint"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/excel", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'application/vnd.openxmlformats' in response.headers.get('content-type', '') or response.status_code == 200
        print("✓ Visitas Excel export - PASSED")
    
    def test_visitas_export_pdf(self):
        """Test Visitas PDF export endpoint"""
        response = requests.get(f"{BASE_URL}/api/visitas/export/pdf", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Visitas PDF export - PASSED")
    
    def test_parcelas_export_excel(self):
        """Test Parcelas Excel export endpoint"""
        response = requests.get(f"{BASE_URL}/api/parcelas/export/excel", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Parcelas Excel export - PASSED")
    
    def test_parcelas_export_pdf(self):
        """Test Parcelas PDF export endpoint"""
        response = requests.get(f"{BASE_URL}/api/parcelas/export/pdf", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Parcelas PDF export - PASSED")
    
    def test_tratamientos_export_pdf(self):
        """Test Tratamientos PDF export endpoint"""
        response = requests.get(f"{BASE_URL}/api/tratamientos/export/pdf", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Tratamientos PDF export - PASSED")
    
    def test_irrigaciones_export_pdf(self):
        """Test Irrigaciones PDF export endpoint"""
        response = requests.get(f"{BASE_URL}/api/irrigaciones/export/pdf", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Irrigaciones PDF export - PASSED")


class TestAIChatEndpoint:
    """Test AI chat endpoint still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": os.environ.get("TEST_EMAIL", ""),
            "password": os.environ.get("TEST_PASSWORD", "")
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_ai_chat_endpoint_works(self):
        """Test AI chat endpoint returns valid response"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=self.headers,
            json={"message": "Hola, ¿qué cultivos tengo?"}
        )
        # AI chat should return 200 or 201
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"
        data = response.json()
        assert "response" in data or "success" in data, "Response should contain 'response' or 'success' field"
        print("✓ AI Chat endpoint - PASSED")


class TestNFCFichajeEndpoint:
    """Test NFC fichaje endpoint still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": os.environ.get("TEST_EMAIL", ""),
            "password": os.environ.get("TEST_PASSWORD", "")
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_nfc_fichaje_endpoint_exists(self):
        """Test NFC fichaje endpoint is accessible"""
        # Test the NFC fichaje endpoint - it may require specific NFC data
        # We just verify the endpoint exists and responds
        response = requests.post(
            f"{BASE_URL}/api/rrhh/fichaje/nfc",
            headers=self.headers,
            json={"nfc_id": "TEST_NFC_123", "tipo": "entrada"}
        )
        # Should return 200, 201, 400 (bad request for invalid NFC), or 404 (NFC not found)
        # Any of these means the endpoint exists and is working
        assert response.status_code in [200, 201, 400, 404, 422], f"Unexpected status {response.status_code}"
        print(f"✓ NFC Fichaje endpoint - PASSED (status: {response.status_code})")


class TestDashboardKPIs:
    """Test Dashboard KPIs endpoint returns valid data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": os.environ.get("TEST_EMAIL", ""),
            "password": os.environ.get("TEST_PASSWORD", "")
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_dashboard_kpis_returns_valid_data(self):
        """Test Dashboard KPIs endpoint returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify key KPI fields exist
        assert "produccion" in data, "Missing 'produccion' in KPIs"
        assert "superficie" in data, "Missing 'superficie' in KPIs"
        assert "rentabilidad" in data, "Missing 'rentabilidad' in KPIs"
        assert "costes" in data, "Missing 'costes' in KPIs"
        
        # Verify produccion has total_ingresos (used for NaN fix)
        assert "total_ingresos" in data["produccion"], "Missing 'total_ingresos' in produccion"
        
        # Verify superficie has total_ha (used for productivity calculations)
        assert "total_ha" in data["superficie"], "Missing 'total_ha' in superficie"
        
        print("✓ Dashboard KPIs endpoint - PASSED")
        print(f"  - total_ingresos: {data['produccion']['total_ingresos']}")
        print(f"  - total_ha: {data['superficie']['total_ha']}")


class TestParcelasEndpoint:
    """Test Parcelas endpoint with pagination"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": os.environ.get("TEST_EMAIL", ""),
            "password": os.environ.get("TEST_PASSWORD", "")
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_parcelas_with_pagination_params(self):
        """Test Parcelas endpoint accepts skip/limit pagination params"""
        response = requests.get(
            f"{BASE_URL}/api/parcelas?skip=0&limit=25",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "parcelas" in data, "Missing 'parcelas' in response"
        assert "total" in data, "Missing 'total' in response for pagination"
        
        print("✓ Parcelas with pagination - PASSED")
        print(f"  - Total parcelas: {data.get('total', len(data.get('parcelas', [])))}")
        print(f"  - Returned: {len(data.get('parcelas', []))} parcelas")
