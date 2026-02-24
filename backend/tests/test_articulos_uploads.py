"""
Backend API Tests for Artículos de Explotación and File Upload endpoints
Tests CRUD operations for artículos and image upload for maquinaria/técnicos
"""

import pytest
import requests
import os
import json
import tempfile
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://farm-hub-15.preview.emergentagent.com')


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
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def headers_file_upload(auth_token):
    """Return headers for file upload (no Content-Type)"""
    return {
        "Authorization": f"Bearer {auth_token}"
    }


# ============================================================================
# ARTÍCULOS DE EXPLOTACIÓN - CRUD Tests
# ============================================================================

class TestArticulosCRUD:
    """Test CRUD operations for Artículos de Explotación"""
    
    @pytest.fixture
    def test_articulo_data(self):
        """Generate unique test articulo data"""
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S")
        return {
            "codigo": f"TEST_{unique_id}",
            "nombre": f"Artículo Test {unique_id}",
            "descripcion": "Artículo creado para testing",
            "categoria": "Fertilizantes",
            "unidad_medida": "Kg",
            "precio_unitario": 25.50,
            "iva": 21,
            "stock_actual": 100,
            "stock_minimo": 10,
            "proveedor_habitual": "Test Proveedor",
            "observaciones": "Test observaciones",
            "activo": True
        }
    
    def test_get_articulos_list(self, headers):
        """Test getting list of artículos"""
        response = requests.get(f"{BASE_URL}/api/articulos", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "articulos" in data
        assert "total" in data
        print(f"✓ GET /api/articulos returns {data['total']} artículos")
    
    def test_get_articulos_activos(self, headers):
        """Test getting only active artículos"""
        response = requests.get(f"{BASE_URL}/api/articulos/activos", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "articulos" in data
        print(f"✓ GET /api/articulos/activos returns {len(data['articulos'])} active artículos")
    
    def test_get_categorias(self, headers):
        """Test getting available categories"""
        response = requests.get(f"{BASE_URL}/api/articulos/categorias", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "categorias" in data
        assert len(data["categorias"]) > 0
        expected_cats = ["Fertilizantes", "Fitosanitarios", "Semillas", "Materiales"]
        for cat in expected_cats:
            assert cat in data["categorias"], f"Missing category: {cat}"
        print(f"✓ GET /api/articulos/categorias returns {len(data['categorias'])} categories")
    
    def test_create_articulo(self, headers, test_articulo_data):
        """Test creating a new artículo"""
        response = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert data["data"]["codigo"] == test_articulo_data["codigo"]
        assert data["data"]["nombre"] == test_articulo_data["nombre"]
        assert data["data"]["precio_unitario"] == test_articulo_data["precio_unitario"]
        
        # Cleanup
        articulo_id = data["data"]["_id"]
        requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        
        print(f"✓ POST /api/articulos creates artículo successfully")
    
    def test_create_duplicate_articulo_fails(self, headers, test_articulo_data):
        """Test that creating duplicate código fails"""
        # Create first articulo
        response1 = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert response1.status_code == 200
        articulo_id = response1.json()["data"]["_id"]
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        assert "Ya existe" in response2.json().get("detail", "")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        print(f"✓ Duplicate código correctly rejected")
    
    def test_get_articulo_by_id(self, headers, test_articulo_data):
        """Test getting an artículo by ID"""
        # Create articulo first
        create_resp = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert create_resp.status_code == 200
        articulo_id = create_resp.json()["data"]["_id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["success"] == True
        assert data["data"]["_id"] == articulo_id
        assert data["data"]["codigo"] == test_articulo_data["codigo"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        print(f"✓ GET /api/articulos/{{id}} retrieves artículo correctly")
    
    def test_update_articulo(self, headers, test_articulo_data):
        """Test updating an artículo"""
        # Create articulo first
        create_resp = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert create_resp.status_code == 200
        articulo_id = create_resp.json()["data"]["_id"]
        
        # Update articulo
        updated_data = test_articulo_data.copy()
        updated_data["nombre"] = "Artículo Actualizado"
        updated_data["precio_unitario"] = 35.99
        
        response = requests.put(
            f"{BASE_URL}/api/articulos/{articulo_id}",
            headers=headers,
            json=updated_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["success"] == True
        assert data["data"]["nombre"] == "Artículo Actualizado"
        assert data["data"]["precio_unitario"] == 35.99
        
        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        assert get_resp.json()["data"]["nombre"] == "Artículo Actualizado"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        print(f"✓ PUT /api/articulos/{{id}} updates artículo correctly")
    
    def test_toggle_articulo_activo(self, headers, test_articulo_data):
        """Test toggling articulo activo status"""
        # Create articulo (activo=True)
        create_resp = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert create_resp.status_code == 200
        articulo_id = create_resp.json()["data"]["_id"]
        
        # Toggle to inactive
        toggle_resp = requests.patch(
            f"{BASE_URL}/api/articulos/{articulo_id}/toggle-activo",
            headers=headers
        )
        
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["data"]["activo"] == False
        
        # Toggle back to active
        toggle_resp2 = requests.patch(
            f"{BASE_URL}/api/articulos/{articulo_id}/toggle-activo",
            headers=headers
        )
        assert toggle_resp2.json()["data"]["activo"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        print(f"✓ PATCH /api/articulos/{{id}}/toggle-activo works correctly")
    
    def test_delete_articulo(self, headers, test_articulo_data):
        """Test deleting an artículo"""
        # Create articulo first
        create_resp = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert create_resp.status_code == 200
        articulo_id = create_resp.json()["data"]["_id"]
        
        # Delete articulo
        response = requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json()["success"] == True
        
        # Verify deletion with GET (should return 404)
        get_resp = requests.get(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        assert get_resp.status_code == 404
        
        print(f"✓ DELETE /api/articulos/{{id}} deletes artículo correctly")
    
    def test_filter_by_categoria(self, headers):
        """Test filtering artículos by categoria"""
        response = requests.get(
            f"{BASE_URL}/api/articulos?categoria=Fertilizantes",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned articulos should have categoria=Fertilizantes
        for art in data["articulos"]:
            assert art["categoria"] == "Fertilizantes"
        print(f"✓ Filtering by categoria works correctly")
    
    def test_search_articulos(self, headers, test_articulo_data):
        """Test searching artículos"""
        # Create articulo with unique name
        create_resp = requests.post(
            f"{BASE_URL}/api/articulos",
            headers=headers,
            json=test_articulo_data
        )
        assert create_resp.status_code == 200
        articulo_id = create_resp.json()["data"]["_id"]
        
        # Search by codigo
        response = requests.get(
            f"{BASE_URL}/api/articulos?search={test_articulo_data['codigo']}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["articulos"]) >= 1
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/articulos/{articulo_id}", headers=headers)
        print(f"✓ Search functionality works correctly")


# ============================================================================
# MAQUINARIA IMAGE UPLOAD Tests
# ============================================================================

class TestMaquinariaImageUpload:
    """Test image upload for Maquinaria Placa CE"""
    
    @pytest.fixture
    def test_maquinaria_data(self):
        """Generate unique test maquinaria data"""
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S")
        return {
            "nombre": f"Maquinaria Test {unique_id}",
            "tipo": "Tractor",
            "marca": "Test Marca",
            "modelo": "Test Modelo",
            "matricula": f"TEST-{unique_id}",
            "estado": "Operativo"
        }
    
    def test_get_maquinaria_list(self, headers):
        """Test getting list of maquinaria"""
        response = requests.get(f"{BASE_URL}/api/maquinaria", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "maquinaria" in data
        print(f"✓ GET /api/maquinaria returns {len(data['maquinaria'])} items")
    
    def test_create_maquinaria(self, headers, test_maquinaria_data):
        """Test creating maquinaria"""
        response = requests.post(
            f"{BASE_URL}/api/maquinaria",
            headers=headers,
            json=test_maquinaria_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        
        # Cleanup
        maquinaria_id = data["data"]["_id"]
        requests.delete(f"{BASE_URL}/api/maquinaria/{maquinaria_id}", headers=headers)
        print(f"✓ POST /api/maquinaria creates maquinaria successfully")
    
    def test_upload_placa_ce_image(self, headers, headers_file_upload, test_maquinaria_data):
        """Test uploading Placa CE image - verifies save to /app/uploads/maquinaria_placas/"""
        # Create maquinaria first
        create_resp = requests.post(
            f"{BASE_URL}/api/maquinaria",
            headers=headers,
            json=test_maquinaria_data
        )
        assert create_resp.status_code == 200
        maquinaria_id = create_resp.json()["data"]["_id"]
        
        # Create a test image file
        test_image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100  # Minimal PNG header
        
        files = {
            'file': ('test_placa.png', test_image_content, 'image/png')
        }
        
        # Upload image
        response = requests.post(
            f"{BASE_URL}/api/maquinaria/{maquinaria_id}/imagen-placa-ce",
            headers=headers_file_upload,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "imagen_placa_ce_url" in data["data"]
        
        # Verify the path is /app/uploads/maquinaria_placas/ (not /tmp/)
        image_url = data["data"]["imagen_placa_ce_url"]
        assert "/app/uploads/maquinaria_placas/" in image_url, f"Image saved to wrong path: {image_url}"
        assert "/tmp/" not in image_url, f"Image incorrectly saved to /tmp/: {image_url}"
        
        # Verify we can retrieve the image
        get_image_resp = requests.get(
            f"{BASE_URL}/api/maquinaria/{maquinaria_id}/imagen-placa-ce",
            headers=headers_file_upload
        )
        assert get_image_resp.status_code == 200, f"Cannot retrieve uploaded image: {get_image_resp.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/maquinaria/{maquinaria_id}", headers=headers)
        print(f"✓ Image upload to /app/uploads/maquinaria_placas/ works correctly")
    
    def test_delete_placa_ce_image(self, headers, headers_file_upload, test_maquinaria_data):
        """Test deleting Placa CE image"""
        # Create maquinaria
        create_resp = requests.post(
            f"{BASE_URL}/api/maquinaria",
            headers=headers,
            json=test_maquinaria_data
        )
        assert create_resp.status_code == 200
        maquinaria_id = create_resp.json()["data"]["_id"]
        
        # Upload image
        test_image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        files = {'file': ('test_placa.png', test_image_content, 'image/png')}
        upload_resp = requests.post(
            f"{BASE_URL}/api/maquinaria/{maquinaria_id}/imagen-placa-ce",
            headers=headers_file_upload,
            files=files
        )
        assert upload_resp.status_code == 200
        
        # Delete image
        delete_resp = requests.delete(
            f"{BASE_URL}/api/maquinaria/{maquinaria_id}/imagen-placa-ce",
            headers=headers_file_upload
        )
        
        assert delete_resp.status_code == 200
        assert delete_resp.json()["success"] == True
        
        # Verify image is deleted (should return 404)
        get_resp = requests.get(
            f"{BASE_URL}/api/maquinaria/{maquinaria_id}/imagen-placa-ce",
            headers=headers_file_upload
        )
        assert get_resp.status_code == 404
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/maquinaria/{maquinaria_id}", headers=headers)
        print(f"✓ DELETE /api/maquinaria/{{id}}/imagen-placa-ce works correctly")


# ============================================================================
# TÉCNICOS APLICADORES CERTIFICADO UPLOAD Tests  
# ============================================================================

class TestTecnicosCertificadoUpload:
    """Test certificate upload for Técnicos Aplicadores"""
    
    @pytest.fixture
    def test_tecnico_data(self):
        """Generate unique test técnico data"""
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S")
        return {
            "nombre": "Test",
            "apellidos": f"Técnico {unique_id}",
            "dni": f"{unique_id[-8:]}A",
            "nivel_capacitacion": "Básico",
            "num_carnet": f"CARNET-{unique_id}",
            "fecha_certificacion": "2024-01-15",
            "observaciones": "Test técnico"
        }
    
    def test_get_tecnicos_list(self, headers):
        """Test getting list of técnicos aplicadores"""
        response = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "tecnicos" in data
        print(f"✓ GET /api/tecnicos-aplicadores returns {len(data['tecnicos'])} técnicos")
    
    def test_get_niveles_capacitacion(self, headers):
        """Test getting niveles de capacitación"""
        response = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/niveles", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "niveles" in data
        expected_niveles = ["Básico", "Cualificado", "Fumigador", "Piloto Aplicador"]
        for nivel in expected_niveles:
            assert nivel in data["niveles"], f"Missing nivel: {nivel}"
        print(f"✓ GET /api/tecnicos-aplicadores/niveles returns correct niveles")
    
    def test_create_tecnico(self, headers, test_tecnico_data):
        """Test creating técnico aplicador"""
        response = requests.post(
            f"{BASE_URL}/api/tecnicos-aplicadores",
            headers=headers,
            json=test_tecnico_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "fecha_validez" in data["data"]  # Auto-calculated
        
        # Cleanup
        tecnico_id = data["data"]["_id"]
        requests.delete(f"{BASE_URL}/api/tecnicos-aplicadores/{tecnico_id}", headers=headers)
        print(f"✓ POST /api/tecnicos-aplicadores creates técnico successfully")
    
    def test_upload_certificado(self, headers, headers_file_upload, test_tecnico_data):
        """Test uploading certificado - verifies save to /app/uploads/certificados/"""
        # Create técnico first
        create_resp = requests.post(
            f"{BASE_URL}/api/tecnicos-aplicadores",
            headers=headers,
            json=test_tecnico_data
        )
        assert create_resp.status_code == 200
        tecnico_id = create_resp.json()["data"]["_id"]
        
        # Create a test image file
        test_image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100  # Minimal PNG header
        
        files = {
            'file': ('certificado.png', test_image_content, 'image/png')
        }
        
        # Upload certificado
        response = requests.post(
            f"{BASE_URL}/api/tecnicos-aplicadores/{tecnico_id}/certificado",
            headers=headers_file_upload,
            files=files
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "imagen_certificado_url" in data["data"]
        
        # Verify the path is /app/uploads/certificados/ (not /tmp/)
        cert_url = data["data"]["imagen_certificado_url"]
        assert "/app/uploads/certificados/" in cert_url, f"Certificate saved to wrong path: {cert_url}"
        assert "/tmp/" not in cert_url, f"Certificate incorrectly saved to /tmp/: {cert_url}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tecnicos-aplicadores/{tecnico_id}", headers=headers)
        print(f"✓ Certificate upload to /app/uploads/certificados/ works correctly")
    
    def test_delete_certificado(self, headers, headers_file_upload, test_tecnico_data):
        """Test deleting certificado"""
        # Create técnico
        create_resp = requests.post(
            f"{BASE_URL}/api/tecnicos-aplicadores",
            headers=headers,
            json=test_tecnico_data
        )
        assert create_resp.status_code == 200
        tecnico_id = create_resp.json()["data"]["_id"]
        
        # Upload certificado
        test_image_content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        files = {'file': ('certificado.png', test_image_content, 'image/png')}
        upload_resp = requests.post(
            f"{BASE_URL}/api/tecnicos-aplicadores/{tecnico_id}/certificado",
            headers=headers_file_upload,
            files=files
        )
        assert upload_resp.status_code == 200
        
        # Delete certificado
        delete_resp = requests.delete(
            f"{BASE_URL}/api/tecnicos-aplicadores/{tecnico_id}/certificado",
            headers=headers_file_upload
        )
        
        assert delete_resp.status_code == 200
        assert delete_resp.json()["success"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tecnicos-aplicadores/{tecnico_id}", headers=headers)
        print(f"✓ DELETE /api/tecnicos-aplicadores/{{id}}/certificado works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
