"""
Test suite for Visitas Photo Upload endpoints.
Tests:
- POST /api/visitas/{visita_id}/fotos - Upload photos
- GET /api/visitas/{visita_id}/fotos - Get photos for a visit
- DELETE /api/visitas/{visita_id}/fotos/{foto_index} - Delete a photo
"""
import pytest
import requests
import os
import tempfile
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://agri-tracker-25.preview.emergentagent.com"


def create_test_image(filename="test_image.jpg", size_kb=5):
    """Create a simple test image file (minimal JPEG)"""
    # Minimal valid JPEG header
    jpeg_bytes = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
        0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
        0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
        0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
        0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
        0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04,
        0x00, 0x00, 0x01, 0x7D, 0x01, 0x02, 0x03, 0x00,
        0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
        0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1,
        0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A,
        0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35,
        0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55,
        0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65,
        0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85,
        0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94,
        0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2,
        0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA,
        0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
        0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8,
        0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6,
        0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
        0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA,
        0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
        0xFB, 0xD2, 0x8A, 0x28, 0xAF, 0xFF, 0xD9
    ])
    return jpeg_bytes


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@fruveco.com",
        "password": "admin123"
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    data = response.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip("No token in auth response")
    return token


@pytest.fixture
def headers(auth_token):
    """Return headers with auth token for JSON requests"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def headers_upload(auth_token):
    """Return headers for file upload (no Content-Type)"""
    return {
        "Authorization": f"Bearer {auth_token}"
    }


@pytest.fixture
def test_parcela_id(headers):
    """Get a valid parcela ID from the system"""
    response = requests.get(f"{BASE_URL}/api/parcelas", headers=headers)
    if response.status_code != 200:
        pytest.skip("Could not fetch parcelas")
    
    data = response.json()
    parcelas = data.get("parcelas", [])
    if not parcelas:
        pytest.skip("No parcelas available for testing")
    
    return parcelas[0]["_id"]


@pytest.fixture
def test_visita(headers, test_parcela_id):
    """Create a test visita for photo upload tests"""
    unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    payload = {
        "objetivo": "Control Rutinario",
        "parcela_id": test_parcela_id,
        "fecha_visita": "2026-02-26",
        "observaciones": f"TEST_foto_upload_{unique_id}"
    }
    
    response = requests.post(f"{BASE_URL}/api/visitas", json=payload, headers=headers)
    assert response.status_code == 200, f"Failed to create test visita: {response.text}"
    
    data = response.json()
    visita = data.get("data", {})
    visita_id = visita.get("_id")
    
    yield visita_id
    
    # Cleanup: delete the test visita after test
    try:
        requests.delete(f"{BASE_URL}/api/visitas/{visita_id}", headers=headers)
    except Exception as e:
        print(f"Cleanup warning: Could not delete test visita: {e}")


class TestVisitasFotosAPI:
    """Test photo upload/download/delete endpoints for Visitas"""
    
    def test_upload_single_photo(self, headers_upload, test_visita):
        """Test uploading a single photo to a visita"""
        visita_id = test_visita
        
        # Create test image
        image_bytes = create_test_image()
        files = [('files', ('test_photo.jpg', io.BytesIO(image_bytes), 'image/jpeg'))]
        
        response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Response should have success=True"
        assert data.get("uploaded") == 1, "Should have uploaded 1 file"
        assert "fotos" in data, "Response should contain fotos array"
        assert len(data["fotos"]) == 1, "Should have 1 photo"
        
        foto = data["fotos"][0]
        assert "url" in foto, "Photo should have url"
        assert "filename" in foto, "Photo should have filename"
        assert "uploaded_at" in foto, "Photo should have uploaded_at"
        assert foto["url"].startswith("/api/uploads/visitas/"), f"Photo URL should start with /api/uploads/visitas/, got {foto['url']}"
        
        print(f"✓ Single photo uploaded successfully: {foto['url']}")
    
    def test_upload_multiple_photos(self, headers_upload, test_visita):
        """Test uploading multiple photos to a visita"""
        visita_id = test_visita
        
        # Create multiple test images
        files = []
        for i in range(3):
            image_bytes = create_test_image()
            files.append(('files', (f'test_photo_{i}.jpg', io.BytesIO(image_bytes), 'image/jpeg')))
        
        response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("uploaded") == 3, "Should have uploaded 3 files"
        
        print(f"✓ Multiple photos uploaded successfully: {data.get('uploaded')} files")
    
    def test_upload_invalid_format(self, headers_upload, test_visita):
        """Test that invalid file formats are rejected"""
        visita_id = test_visita
        
        # Create a text file instead of image
        text_content = b"This is not an image"
        files = [('files', ('test.txt', io.BytesIO(text_content), 'text/plain'))]
        
        response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        
        # Should return 400 with error about invalid format
        assert response.status_code == 400, f"Expected 400 for invalid format, got {response.status_code}"
        
        print("✓ Invalid file format correctly rejected")
    
    def test_get_visita_fotos(self, headers, headers_upload, test_visita):
        """Test getting photos for a visita"""
        visita_id = test_visita
        
        # First upload a photo
        image_bytes = create_test_image()
        files = [('files', ('get_test_photo.jpg', io.BytesIO(image_bytes), 'image/jpeg'))]
        
        upload_response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        # Now get the photos
        response = requests.get(f"{BASE_URL}/api/visitas/{visita_id}/fotos", headers=headers)
        
        assert response.status_code == 200, f"Get fotos failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "fotos" in data, "Response should contain fotos array"
        assert len(data["fotos"]) >= 1, "Should have at least 1 photo"
        
        print(f"✓ GET /api/visitas/{visita_id}/fotos returns {len(data['fotos'])} photo(s)")
    
    def test_delete_visita_foto(self, headers, headers_upload, test_visita):
        """Test deleting a photo from a visita"""
        visita_id = test_visita
        
        # First upload a photo
        image_bytes = create_test_image()
        files = [('files', ('delete_test_photo.jpg', io.BytesIO(image_bytes), 'image/jpeg'))]
        
        upload_response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        initial_fotos = upload_response.json().get("fotos", [])
        initial_count = len(initial_fotos)
        
        # Delete the last photo (index = initial_count - 1)
        delete_index = initial_count - 1
        delete_response = requests.delete(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos/{delete_index}",
            headers=headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code} - {delete_response.text}"
        data = delete_response.json()
        
        assert data.get("success") == True, "Response should have success=True"
        assert "fotos" in data, "Response should contain updated fotos array"
        assert len(data["fotos"]) == initial_count - 1, f"Should have {initial_count - 1} photos after delete"
        
        print(f"✓ Photo deleted successfully. Photos remaining: {len(data['fotos'])}")
    
    def test_delete_invalid_foto_index(self, headers, test_visita):
        """Test that deleting with invalid index returns error"""
        visita_id = test_visita
        
        # Try to delete a photo with invalid index
        response = requests.delete(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos/9999",
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid index, got {response.status_code}"
        
        print("✓ Invalid foto index correctly rejected")
    
    def test_upload_to_nonexistent_visita(self, headers_upload):
        """Test that uploading to non-existent visita returns 404"""
        fake_id = "000000000000000000000000"
        
        image_bytes = create_test_image()
        files = [('files', ('test_photo.jpg', io.BytesIO(image_bytes), 'image/jpeg'))]
        
        response = requests.post(
            f"{BASE_URL}/api/visitas/{fake_id}/fotos",
            headers=headers_upload,
            files=files
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent visita, got {response.status_code}"
        
        print("✓ Upload to non-existent visita correctly returns 404")
    
    def test_upload_invalid_visita_id(self, headers_upload):
        """Test that uploading with invalid visita ID returns 400"""
        invalid_id = "invalid_id"
        
        image_bytes = create_test_image()
        files = [('files', ('test_photo.jpg', io.BytesIO(image_bytes), 'image/jpeg'))]
        
        response = requests.post(
            f"{BASE_URL}/api/visitas/{invalid_id}/fotos",
            headers=headers_upload,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid visita ID, got {response.status_code}"
        
        print("✓ Invalid visita ID correctly rejected with 400")
    
    def test_photo_persists_in_visita(self, headers, headers_upload, test_visita):
        """Test that uploaded photo persists when fetching the visita"""
        visita_id = test_visita
        
        # Upload a photo
        image_bytes = create_test_image()
        files = [('files', ('persist_test_photo.jpg', io.BytesIO(image_bytes), 'image/jpeg'))]
        
        upload_response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        
        # Fetch the visita directly and check fotos field
        visita_response = requests.get(f"{BASE_URL}/api/visitas/{visita_id}", headers=headers)
        assert visita_response.status_code == 200, f"Get visita failed: {visita_response.text}"
        
        visita = visita_response.json()
        assert "fotos" in visita, "Visita should have fotos field"
        assert len(visita["fotos"]) >= 1, "Visita should have at least 1 photo"
        
        print(f"✓ Photos persist in visita record: {len(visita['fotos'])} photo(s)")


class TestVisitasFotosLimits:
    """Test photo upload limits and validation"""
    
    def test_upload_max_10_photos(self, headers_upload, test_visita):
        """Test that max 10 photos per upload is enforced"""
        visita_id = test_visita
        
        # Try to upload 11 photos at once
        files = []
        for i in range(11):
            image_bytes = create_test_image()
            files.append(('files', (f'photo_{i}.jpg', io.BytesIO(image_bytes), 'image/jpeg')))
        
        response = requests.post(
            f"{BASE_URL}/api/visitas/{visita_id}/fotos",
            headers=headers_upload,
            files=files
        )
        
        assert response.status_code == 400, f"Expected 400 for >10 files, got {response.status_code}"
        
        print("✓ Max 10 photos per upload limit enforced")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
