"""
Test suite for Logo Configuration APIs
Tests: GET /api/config/logos, POST /api/config/logo/{type}, DELETE /api/config/logo/{type}
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed — skipping admin tests")


@pytest.fixture(scope="module")
def manager_token(api_client):
    """Get manager authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "manager@fruveco.com",
        "password": "manager"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    # If manager doesn't exist, skip tests but don't fail
    return None


@pytest.fixture
def test_png_file():
    """Generate a minimal valid PNG file"""
    # Minimal 1x1 pixel PNG
    png_bytes = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # RGB
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,  # data
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,  # ...
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
        0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    return io.BytesIO(png_bytes)


class TestGetLogosEndpoint:
    """Tests for GET /api/config/logos (public endpoint)"""
    
    def test_get_logos_no_auth_required(self, api_client):
        """Verify GET /api/config/logos works without authentication"""
        response = api_client.get(f"{BASE_URL}/api/config/logos")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_get_logos_returns_correct_structure(self, api_client):
        """Verify response structure contains login_logo and dashboard_logo"""
        response = api_client.get(f"{BASE_URL}/api/config/logos")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "login_logo" in data
        assert "dashboard_logo" in data
        assert "updated_at" in data


class TestUploadLogoEndpoint:
    """Tests for POST /api/config/logo/{type}"""
    
    def test_upload_logo_requires_auth(self, api_client, test_png_file):
        """Verify upload fails without authentication"""
        files = {'file': ('test.png', test_png_file, 'image/png')}
        response = api_client.post(f"{BASE_URL}/api/config/logo/login", files=files)
        # API returns 403 when no token is provided (FastAPI pattern)
        assert response.status_code in [401, 403]
    
    def test_upload_logo_requires_admin(self, api_client, manager_token, test_png_file):
        """Verify non-admin users get 403 Forbidden"""
        if not manager_token:
            pytest.skip("Manager user not available")
        
        files = {'file': ('test.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {manager_token}'}
        response = api_client.post(
            f"{BASE_URL}/api/config/logo/login", 
            files=files, 
            headers=headers
        )
        assert response.status_code == 403
        data = response.json()
        assert "administrador" in data.get("detail", "").lower()
    
    def test_upload_login_logo_success(self, api_client, admin_token, test_png_file):
        """Test successful login logo upload by admin"""
        files = {'file': ('TEST_login_logo.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = api_client.post(
            f"{BASE_URL}/api/config/logo/login", 
            files=files, 
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("logo_type") == "login"
        assert "/api/uploads/logos/" in data.get("logo_url", "")
        
    def test_upload_dashboard_logo_success(self, api_client, admin_token, test_png_file):
        """Test successful dashboard logo upload by admin"""
        files = {'file': ('TEST_dashboard_logo.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = api_client.post(
            f"{BASE_URL}/api/config/logo/dashboard", 
            files=files, 
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("logo_type") == "dashboard"
        assert "/api/uploads/logos/" in data.get("logo_url", "")
    
    def test_upload_invalid_logo_type(self, api_client, admin_token, test_png_file):
        """Test upload with invalid logo type returns 400"""
        files = {'file': ('test.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = api_client.post(
            f"{BASE_URL}/api/config/logo/invalid_type", 
            files=files, 
            headers=headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "no válido" in data.get("detail", "").lower()
    
    def test_upload_invalid_file_format(self, api_client, admin_token):
        """Test upload with invalid file format returns 400"""
        txt_file = io.BytesIO(b"This is not an image")
        files = {'file': ('test.txt', txt_file, 'text/plain')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = api_client.post(
            f"{BASE_URL}/api/config/logo/login", 
            files=files, 
            headers=headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "formato" in data.get("detail", "").lower()
    
    def test_logos_persisted_after_upload(self, api_client, admin_token, test_png_file):
        """Verify logos are persisted and returned by GET endpoint"""
        # Upload login logo
        files = {'file': ('TEST_persist_logo.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        upload_response = api_client.post(
            f"{BASE_URL}/api/config/logo/login", 
            files=files, 
            headers=headers
        )
        assert upload_response.status_code == 200
        uploaded_url = upload_response.json().get("logo_url")
        
        # Verify GET returns the uploaded logo
        get_response = api_client.get(f"{BASE_URL}/api/config/logos")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("login_logo") == uploaded_url


class TestDeleteLogoEndpoint:
    """Tests for DELETE /api/config/logo/{type}"""
    
    def test_delete_logo_requires_auth(self, api_client):
        """Verify delete fails without authentication"""
        response = api_client.delete(f"{BASE_URL}/api/config/logo/login")
        # API returns 403 when no token is provided (FastAPI pattern)
        assert response.status_code in [401, 403]
    
    def test_delete_logo_requires_admin(self, api_client, manager_token):
        """Verify non-admin users get 403 Forbidden"""
        if not manager_token:
            pytest.skip("Manager user not available")
        
        headers = {'Authorization': f'Bearer {manager_token}'}
        response = api_client.delete(
            f"{BASE_URL}/api/config/logo/login", 
            headers=headers
        )
        assert response.status_code == 403
    
    def test_delete_login_logo_success(self, api_client, admin_token, test_png_file):
        """Test successful login logo deletion"""
        # First upload a logo to delete
        files = {'file': ('TEST_to_delete.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        api_client.post(f"{BASE_URL}/api/config/logo/login", files=files, headers=headers)
        
        # Delete the logo
        response = api_client.delete(
            f"{BASE_URL}/api/config/logo/login", 
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "eliminado" in data.get("message", "").lower()
        
        # Verify logo is removed from GET response
        get_response = api_client.get(f"{BASE_URL}/api/config/logos")
        assert get_response.status_code == 200
        assert get_response.json().get("login_logo") is None
    
    def test_delete_dashboard_logo_success(self, api_client, admin_token, test_png_file):
        """Test successful dashboard logo deletion"""
        # First upload a logo to delete
        files = {'file': ('TEST_dash_delete.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        api_client.post(f"{BASE_URL}/api/config/logo/dashboard", files=files, headers=headers)
        
        # Delete the logo
        response = api_client.delete(
            f"{BASE_URL}/api/config/logo/dashboard", 
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify logo is removed
        get_response = api_client.get(f"{BASE_URL}/api/config/logos")
        assert get_response.status_code == 200
        assert get_response.json().get("dashboard_logo") is None
    
    def test_delete_invalid_logo_type(self, api_client, admin_token):
        """Test delete with invalid logo type returns 400"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = api_client.delete(
            f"{BASE_URL}/api/config/logo/invalid_type", 
            headers=headers
        )
        assert response.status_code == 400


class TestLogoFileAccess:
    """Tests for serving uploaded logo files"""
    
    def test_uploaded_logo_file_accessible(self, api_client, admin_token, test_png_file):
        """Verify uploaded logo file can be accessed via its URL"""
        # Upload a logo
        files = {'file': ('TEST_access.png', test_png_file, 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        upload_response = api_client.post(
            f"{BASE_URL}/api/config/logo/login", 
            files=files, 
            headers=headers
        )
        assert upload_response.status_code == 200
        logo_url = upload_response.json().get("logo_url")
        
        # Try to access the logo file
        file_response = api_client.get(f"{BASE_URL}{logo_url}")
        assert file_response.status_code == 200
        assert file_response.headers.get("content-type", "").startswith("image/")
