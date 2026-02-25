"""
Test suite for Notifications and Scheduler APIs
Tests all notification endpoints and scheduler configuration
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


class TestNotificacionesAPI:
    """Test notifications API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.user_id = data.get("user", {}).get("_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Track created notifications for cleanup
        self.created_notifications = []
        
        yield
        
        # Cleanup: Delete created notifications
        for notif_id in self.created_notifications:
            try:
                self.session.delete(f"{BASE_URL}/api/notificaciones/{notif_id}")
            except Exception:
                pass
    
    def test_get_notificaciones_empty(self):
        """Test GET /api/notificaciones returns proper structure"""
        response = self.session.get(f"{BASE_URL}/api/notificaciones")
        assert response.status_code == 200
        data = response.json()
        
        assert "notificaciones" in data
        assert "total" in data
        assert "no_leidas" in data
        assert isinstance(data["notificaciones"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["no_leidas"], int)
    
    def test_get_notificaciones_count(self):
        """Test GET /api/notificaciones/count returns unread count"""
        response = self.session.get(f"{BASE_URL}/api/notificaciones/count")
        assert response.status_code == 200
        data = response.json()
        
        assert "no_leidas" in data
        assert isinstance(data["no_leidas"], int)
        assert data["no_leidas"] >= 0
    
    def test_create_notification_success(self):
        """Test POST /api/notificaciones creates notification"""
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        payload = {
            "titulo": f"TEST_Notificación_{unique_id}",
            "mensaje": "Test message for notification",
            "tipo": "info",
            "prioridad": "normal"
        }
        
        response = self.session.post(f"{BASE_URL}/api/notificaciones", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "notificacion_id" in data
        self.created_notifications.append(data["notificacion_id"])
        
        # Verify notification exists
        list_response = self.session.get(f"{BASE_URL}/api/notificaciones")
        notifications = list_response.json().get("notificaciones", [])
        notification_ids = [n.get("_id") for n in notifications]
        assert data["notificacion_id"] in notification_ids
    
    def test_create_notification_all_types(self):
        """Test creating notifications with different types"""
        types = ["info", "warning", "success", "error", "alert"]
        
        for tipo in types:
            unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
            payload = {
                "titulo": f"TEST_{tipo.upper()}_{unique_id}",
                "mensaje": f"Test message for {tipo} notification",
                "tipo": tipo,
                "prioridad": "normal"
            }
            
            response = self.session.post(f"{BASE_URL}/api/notificaciones", json=payload)
            assert response.status_code == 200, f"Failed to create {tipo} notification"
            data = response.json()
            assert data.get("success") == True
            self.created_notifications.append(data["notificacion_id"])
    
    def test_create_notification_with_priority(self):
        """Test creating notifications with different priorities"""
        priorities = ["low", "normal", "high"]
        
        for priority in priorities:
            unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
            payload = {
                "titulo": f"TEST_Priority_{priority}_{unique_id}",
                "mensaje": f"Test message with {priority} priority",
                "tipo": "info",
                "prioridad": priority
            }
            
            response = self.session.post(f"{BASE_URL}/api/notificaciones", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            self.created_notifications.append(data["notificacion_id"])
    
    def test_create_notification_with_link(self):
        """Test creating notification with an external link"""
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        payload = {
            "titulo": f"TEST_WithLink_{unique_id}",
            "mensaje": "Notification with a link",
            "tipo": "alert",
            "enlace": "/alertas-clima",
            "prioridad": "high"
        }
        
        response = self.session.post(f"{BASE_URL}/api/notificaciones", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        self.created_notifications.append(data["notificacion_id"])
        
        # Verify link was saved
        list_response = self.session.get(f"{BASE_URL}/api/notificaciones")
        notifications = list_response.json().get("notificaciones", [])
        created_notif = next((n for n in notifications if n["_id"] == data["notificacion_id"]), None)
        assert created_notif is not None
        assert created_notif.get("enlace") == "/alertas-clima"
    
    def test_mark_notification_as_read(self):
        """Test PUT /api/notificaciones/{id}/leer marks as read"""
        # Create a notification first
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        create_response = self.session.post(f"{BASE_URL}/api/notificaciones", json={
            "titulo": f"TEST_ToMarkRead_{unique_id}",
            "mensaje": "Test notification to mark as read",
            "tipo": "info"
        })
        notif_id = create_response.json().get("notificacion_id")
        self.created_notifications.append(notif_id)
        
        # Get initial unread count
        count_before = self.session.get(f"{BASE_URL}/api/notificaciones/count").json().get("no_leidas")
        
        # Mark as read
        response = self.session.put(f"{BASE_URL}/api/notificaciones/{notif_id}/leer")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify unread count decreased
        count_after = self.session.get(f"{BASE_URL}/api/notificaciones/count").json().get("no_leidas")
        assert count_after == count_before - 1
    
    def test_mark_all_as_read(self):
        """Test PUT /api/notificaciones/leer-todas marks all as read"""
        # Create multiple notifications
        for i in range(2):
            unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
            create_response = self.session.post(f"{BASE_URL}/api/notificaciones", json={
                "titulo": f"TEST_BulkRead_{i}_{unique_id}",
                "mensaje": f"Test notification {i} for bulk read",
                "tipo": "info"
            })
            self.created_notifications.append(create_response.json().get("notificacion_id"))
        
        # Get initial count (should be at least 2)
        count_before = self.session.get(f"{BASE_URL}/api/notificaciones/count").json().get("no_leidas")
        assert count_before >= 2
        
        # Mark all as read
        response = self.session.put(f"{BASE_URL}/api/notificaciones/leer-todas")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify all marked as read
        count_after = self.session.get(f"{BASE_URL}/api/notificaciones/count").json().get("no_leidas")
        assert count_after == 0
    
    def test_mark_invalid_notification_as_read(self):
        """Test marking non-existent notification returns 404"""
        fake_id = "000000000000000000000000"
        response = self.session.put(f"{BASE_URL}/api/notificaciones/{fake_id}/leer")
        assert response.status_code == 404
    
    def test_filter_unread_notifications(self):
        """Test GET /api/notificaciones with solo_no_leidas filter"""
        # Create and mark one as read
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        create_response = self.session.post(f"{BASE_URL}/api/notificaciones", json={
            "titulo": f"TEST_FilterUnread_{unique_id}",
            "mensaje": "To be marked as read",
            "tipo": "info"
        })
        notif_id = create_response.json().get("notificacion_id")
        self.created_notifications.append(notif_id)
        self.session.put(f"{BASE_URL}/api/notificaciones/{notif_id}/leer")
        
        # Create another unread notification
        unique_id2 = datetime.now().strftime("%Y%m%d%H%M%S%f")
        create_response2 = self.session.post(f"{BASE_URL}/api/notificaciones", json={
            "titulo": f"TEST_FilterUnread2_{unique_id2}",
            "mensaje": "Remains unread",
            "tipo": "warning"
        })
        notif_id2 = create_response2.json().get("notificacion_id")
        self.created_notifications.append(notif_id2)
        
        # Get only unread
        response = self.session.get(f"{BASE_URL}/api/notificaciones?solo_no_leidas=true")
        assert response.status_code == 200
        data = response.json()
        
        # All returned notifications should be unread
        for notif in data.get("notificaciones", []):
            assert notif.get("leida") == False
    
    def test_delete_notification_admin(self):
        """Test DELETE /api/notificaciones/{id} works for admin"""
        # Create a notification
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        create_response = self.session.post(f"{BASE_URL}/api/notificaciones", json={
            "titulo": f"TEST_ToDelete_{unique_id}",
            "mensaje": "This will be deleted",
            "tipo": "info"
        })
        notif_id = create_response.json().get("notificacion_id")
        
        # Delete it
        response = self.session.delete(f"{BASE_URL}/api/notificaciones/{notif_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify deletion
        list_response = self.session.get(f"{BASE_URL}/api/notificaciones")
        notification_ids = [n.get("_id") for n in list_response.json().get("notificaciones", [])]
        assert notif_id not in notification_ids


class TestSchedulerAPI:
    """Test scheduler configuration API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_get_scheduler_config(self):
        """Test GET /api/notificaciones/scheduler/config returns config"""
        response = self.session.get(f"{BASE_URL}/api/notificaciones/scheduler/config")
        assert response.status_code == 200
        data = response.json()
        
        assert "config" in data
        assert "email_disponible" in data
        
        config = data["config"]
        assert "activa" in config or "verificacion_clima_activa" in config or config.get("tipo") == "verificacion_clima"
        assert "hora_verificacion" in config
        assert "frecuencia" in config
        assert "notificar_app" in config
        assert "notificar_email" in config
        assert "roles_notificar" in config
    
    def test_get_scheduler_status(self):
        """Test GET /api/notificaciones/scheduler/status returns status"""
        response = self.session.get(f"{BASE_URL}/api/notificaciones/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "activo" in data
        assert isinstance(data["activo"], bool)
    
    def test_update_scheduler_config(self):
        """Test PUT /api/notificaciones/scheduler/config updates settings"""
        new_config = {
            "verificacion_clima_activa": True,
            "hora_verificacion": "09:00",
            "frecuencia": "cada_6h",
            "notificar_app": True,
            "notificar_email": False,
            "roles_notificar": ["Admin", "Manager", "Technician"]
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/notificaciones/scheduler/config",
            json=new_config
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify changes
        get_response = self.session.get(f"{BASE_URL}/api/notificaciones/scheduler/config")
        config = get_response.json().get("config", {})
        assert config.get("hora_verificacion") == "09:00"
        assert config.get("frecuencia") == "cada_6h"
    
    def test_update_scheduler_invalid_time_format(self):
        """Test PUT /api/notificaciones/scheduler/config rejects invalid time"""
        invalid_config = {
            "verificacion_clima_activa": True,
            "hora_verificacion": "invalid_time",
            "frecuencia": "diaria",
            "notificar_app": True,
            "notificar_email": False,
            "roles_notificar": ["Admin"]
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/notificaciones/scheduler/config",
            json=invalid_config
        )
        assert response.status_code == 400
    
    def test_update_scheduler_valid_frequencies(self):
        """Test updating scheduler with valid frequency options"""
        frequencies = ["diaria", "cada_12h", "cada_6h"]
        
        for freq in frequencies:
            config = {
                "verificacion_clima_activa": True,
                "hora_verificacion": "07:00",
                "frecuencia": freq,
                "notificar_app": True,
                "notificar_email": False,
                "roles_notificar": ["Admin"]
            }
            
            response = self.session.put(
                f"{BASE_URL}/api/notificaciones/scheduler/config",
                json=config
            )
            assert response.status_code == 200, f"Failed for frequency: {freq}"
    
    def test_execute_manual_verification(self):
        """Test POST /api/notificaciones/scheduler/ejecutar triggers execution"""
        response = self.session.post(f"{BASE_URL}/api/notificaciones/scheduler/ejecutar")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "iniciada" in data.get("message", "").lower() or "background" in data.get("message", "").lower()
    
    def test_email_disabled_without_api_key(self):
        """Test that email is disabled when RESEND_API_KEY is not set"""
        response = self.session.get(f"{BASE_URL}/api/notificaciones/scheduler/config")
        data = response.json()
        
        # Since RESEND_API_KEY is empty, email should be disabled
        assert data.get("email_disponible") == False


class TestNotificacionesPermissions:
    """Test permission controls for notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup sessions for different users"""
        self.admin_session = requests.Session()
        self.admin_session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.admin_session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        
        self.created_notifications = []
        
        yield
        
        # Cleanup
        for notif_id in self.created_notifications:
            try:
                self.admin_session.delete(f"{BASE_URL}/api/notificaciones/{notif_id}")
            except Exception:
                pass
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are rejected"""
        session = requests.Session()
        
        response = session.get(f"{BASE_URL}/api/notificaciones")
        assert response.status_code in [401, 403]
        
        response = session.get(f"{BASE_URL}/api/notificaciones/count")
        assert response.status_code in [401, 403]
        
        response = session.get(f"{BASE_URL}/api/notificaciones/scheduler/config")
        assert response.status_code in [401, 403]
    
    def test_admin_can_create_notifications(self):
        """Test that admin can create notifications"""
        unique_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        response = self.admin_session.post(f"{BASE_URL}/api/notificaciones", json={
            "titulo": f"TEST_AdminCreate_{unique_id}",
            "mensaje": "Created by admin",
            "tipo": "info"
        })
        assert response.status_code == 200
        self.created_notifications.append(response.json().get("notificacion_id"))
    
    def test_admin_can_update_scheduler_config(self):
        """Test that admin can update scheduler config"""
        response = self.admin_session.put(
            f"{BASE_URL}/api/notificaciones/scheduler/config",
            json={
                "verificacion_clima_activa": True,
                "hora_verificacion": "10:00",
                "frecuencia": "diaria",
                "notificar_app": True,
                "notificar_email": False,
                "roles_notificar": ["Admin"]
            }
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
