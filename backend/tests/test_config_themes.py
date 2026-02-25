"""
Test suite for Theme Configuration APIs
Tests: GET /api/config/themes, GET /api/config/theme, POST /api/config/theme, DELETE /api/config/theme
"""

import pytest
import requests
import os

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


@pytest.fixture
def cleanup_theme(api_client, admin_token):
    """Cleanup fixture to reset theme after tests"""
    yield
    # Reset to default after test
    api_client.delete(
        f"{BASE_URL}/api/config/theme",
        headers={"Authorization": f"Bearer {admin_token}"}
    )


class TestGetPredefinedThemes:
    """Tests for GET /api/config/themes"""
    
    def test_get_themes_public_endpoint(self, api_client):
        """Verify GET /api/config/themes works without authentication"""
        response = api_client.get(f"{BASE_URL}/api/config/themes")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_get_themes_returns_8_predefined(self, api_client):
        """Verify 8 predefined themes are returned"""
        response = api_client.get(f"{BASE_URL}/api/config/themes")
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("themes", [])) == 8
    
    def test_get_themes_structure(self, api_client):
        """Verify each theme has id, name, primary, accent"""
        response = api_client.get(f"{BASE_URL}/api/config/themes")
        data = response.json()
        for theme in data.get("themes", []):
            assert "id" in theme
            assert "name" in theme
            assert "primary" in theme
            assert "accent" in theme
    
    def test_get_themes_includes_expected_ids(self, api_client):
        """Verify expected theme ids are present"""
        expected_ids = ["verde", "azul", "rojo", "naranja", "morado", "teal", "marron", "gris"]
        response = api_client.get(f"{BASE_URL}/api/config/themes")
        data = response.json()
        theme_ids = [t["id"] for t in data.get("themes", [])]
        for expected_id in expected_ids:
            assert expected_id in theme_ids, f"Theme {expected_id} not found"


class TestGetCurrentTheme:
    """Tests for GET /api/config/theme"""
    
    def test_get_current_theme_public(self, api_client):
        """Verify GET /api/config/theme works without authentication"""
        response = api_client.get(f"{BASE_URL}/api/config/theme")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_get_current_theme_structure(self, api_client):
        """Verify response structure"""
        response = api_client.get(f"{BASE_URL}/api/config/theme")
        data = response.json()
        assert "theme_id" in data
        assert "primary" in data
        assert "accent" in data
        assert "is_custom" in data
    
    def test_get_current_theme_valid_hsl(self, api_client):
        """Verify primary and accent are valid HSL strings"""
        response = api_client.get(f"{BASE_URL}/api/config/theme")
        data = response.json()
        # HSL format: "H S% L%" (e.g., "122 37% 27%")
        primary = data.get("primary", "")
        accent = data.get("accent", "")
        assert primary, "Primary color should not be empty"
        assert accent, "Accent color should not be empty"
        # Validate format by checking for % signs
        assert "%" in primary, f"Primary '{primary}' should contain %"
        assert "%" in accent, f"Accent '{accent}' should contain %"


class TestSetPredefinedTheme:
    """Tests for POST /api/config/theme with theme_id"""
    
    def test_set_theme_requires_auth(self, api_client):
        """Verify setting theme requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/config/theme?theme_id=azul")
        assert response.status_code in [401, 403]
    
    def test_set_predefined_theme_success(self, api_client, admin_token, cleanup_theme):
        """Verify admin can set predefined theme"""
        response = api_client.post(
            f"{BASE_URL}/api/config/theme?theme_id=azul",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("theme_id") == "azul"
        assert data.get("is_custom") == False
    
    def test_set_theme_persists(self, api_client, admin_token, cleanup_theme):
        """Verify theme change is persisted (GET returns updated theme)"""
        # Set theme
        api_client.post(
            f"{BASE_URL}/api/config/theme?theme_id=rojo",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Verify GET returns the new theme
        response = api_client.get(f"{BASE_URL}/api/config/theme")
        data = response.json()
        assert data.get("theme_id") == "rojo"
    
    def test_set_invalid_theme_fails(self, api_client, admin_token):
        """Verify invalid theme_id returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/config/theme?theme_id=invalid_theme",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400


class TestSetCustomTheme:
    """Tests for POST /api/config/theme with custom colors"""
    
    def test_set_custom_colors_success(self, api_client, admin_token, cleanup_theme):
        """Verify admin can set custom colors"""
        response = api_client.post(
            f"{BASE_URL}/api/config/theme?primary=240%2050%25%2030%25&accent=280%2060%25%2045%25",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("theme_id") == "custom"
        assert data.get("is_custom") == True
    
    def test_custom_colors_persist(self, api_client, admin_token, cleanup_theme):
        """Verify custom colors are persisted"""
        # Set custom colors
        api_client.post(
            f"{BASE_URL}/api/config/theme?primary=200%2070%25%2040%25&accent=220%2080%25%2050%25",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Verify GET returns custom theme
        response = api_client.get(f"{BASE_URL}/api/config/theme")
        data = response.json()
        assert data.get("is_custom") == True
        assert data.get("theme_id") == "custom"


class TestResetTheme:
    """Tests for DELETE /api/config/theme"""
    
    def test_reset_theme_requires_auth(self, api_client):
        """Verify reset theme requires authentication"""
        response = api_client.delete(f"{BASE_URL}/api/config/theme")
        assert response.status_code in [401, 403]
    
    def test_reset_theme_success(self, api_client, admin_token):
        """Verify admin can reset theme to default"""
        # First set a non-default theme
        api_client.post(
            f"{BASE_URL}/api/config/theme?theme_id=naranja",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Reset
        response = api_client.delete(
            f"{BASE_URL}/api/config/theme",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_reset_restores_default(self, api_client, admin_token):
        """Verify GET returns verde (default) after reset"""
        # Set a theme
        api_client.post(
            f"{BASE_URL}/api/config/theme?theme_id=morado",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Reset
        api_client.delete(
            f"{BASE_URL}/api/config/theme",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Verify default
        response = api_client.get(f"{BASE_URL}/api/config/theme")
        data = response.json()
        assert data.get("theme_id") == "verde"
        assert data.get("is_custom") == False
