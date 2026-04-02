"""
AI Chat Feature Tests
Tests for the interactive agronomist chatbot with persistent sessions
Endpoints: POST /api/ai/chat, GET /api/ai/chat/sessions, GET /api/ai/chat/history/{session_id}, DELETE /api/ai/chat/session/{session_id}
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Build auth headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAIChatAuth:
    """Test authentication requirements for chat endpoints"""
    
    def test_chat_requires_auth(self):
        """POST /api/ai/chat should return 401/403 without token"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "session_id": "",
            "message": "Hola"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Chat endpoint requires auth: {response.status_code}")
    
    def test_sessions_requires_auth(self):
        """GET /api/ai/chat/sessions should return 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/ai/chat/sessions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Sessions endpoint requires auth: {response.status_code}")
    
    def test_history_requires_auth(self):
        """GET /api/ai/chat/history/{session_id} should return 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/ai/chat/history/507f1f77bcf86cd799439011")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ History endpoint requires auth: {response.status_code}")
    
    def test_delete_requires_auth(self):
        """DELETE /api/ai/chat/session/{session_id} should return 401/403 without token"""
        response = requests.delete(f"{BASE_URL}/api/ai/chat/session/507f1f77bcf86cd799439011")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Delete endpoint requires auth: {response.status_code}")


class TestAIChatSessions:
    """Test chat sessions listing"""
    
    def test_get_sessions_returns_200(self, auth_headers):
        """GET /api/ai/chat/sessions should return 200"""
        response = requests.get(f"{BASE_URL}/api/ai/chat/sessions", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "sessions" in data, "Response should have 'sessions' key"
        assert isinstance(data["sessions"], list), "Sessions should be a list"
        print(f"✓ Get sessions returns 200 with {len(data['sessions'])} sessions")
    
    def test_sessions_structure(self, auth_headers):
        """Sessions should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/ai/chat/sessions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data["sessions"]) > 0:
            session = data["sessions"][0]
            assert "id" in session, "Session should have 'id'"
            assert "title" in session, "Session should have 'title'"
            assert "message_count" in session, "Session should have 'message_count'"
            print(f"✓ Session structure verified: id={session['id'][:8]}..., title={session['title'][:30]}...")
        else:
            print("✓ No existing sessions to verify structure (will be created in later tests)")


class TestAIChatNewSession:
    """Test creating new chat session via message"""
    
    def test_send_message_creates_session(self, auth_headers):
        """POST /api/ai/chat with empty session_id should create new session"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "session_id": "",
                "message": "TEST_CHAT: ¿Cuál es el mejor momento para aplicar tratamientos preventivos en cítricos?"
            },
            timeout=60  # AI responses can take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Response should have success=True"
        assert "session_id" in data, "Response should have session_id"
        assert "response" in data, "Response should have AI response"
        assert len(data["session_id"]) > 0, "Session ID should not be empty"
        assert len(data["response"]) > 0, "AI response should not be empty"
        
        # Store session_id for cleanup
        pytest.test_session_id = data["session_id"]
        
        print(f"✓ New session created: {data['session_id']}")
        print(f"✓ AI response received ({len(data['response'])} chars)")
        if "generation_time_seconds" in data:
            print(f"✓ Generation time: {data['generation_time_seconds']}s")
    
    def test_empty_message_rejected(self, auth_headers):
        """POST /api/ai/chat with empty message should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "session_id": "",
                "message": ""
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Empty message correctly rejected with 400")
    
    def test_whitespace_message_rejected(self, auth_headers):
        """POST /api/ai/chat with whitespace-only message should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "session_id": "",
                "message": "   "
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Whitespace-only message correctly rejected with 400")


class TestAIChatHistory:
    """Test chat history retrieval"""
    
    def test_get_history_for_session(self, auth_headers):
        """GET /api/ai/chat/history/{session_id} should return messages"""
        # First get sessions to find a valid session_id
        sessions_response = requests.get(f"{BASE_URL}/api/ai/chat/sessions", headers=auth_headers)
        assert sessions_response.status_code == 200
        sessions = sessions_response.json().get("sessions", [])
        
        if len(sessions) == 0:
            pytest.skip("No sessions available to test history")
        
        session_id = sessions[0]["id"]
        response = requests.get(f"{BASE_URL}/api/ai/chat/history/{session_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data, "Response should have session_id"
        assert "messages" in data, "Response should have messages"
        assert isinstance(data["messages"], list), "Messages should be a list"
        
        print(f"✓ History retrieved for session {session_id[:8]}... with {len(data['messages'])} messages")
        
        # Verify message structure if messages exist
        if len(data["messages"]) > 0:
            msg = data["messages"][0]
            assert "role" in msg, "Message should have 'role'"
            assert "content" in msg, "Message should have 'content'"
            assert msg["role"] in ["user", "assistant"], f"Role should be user/assistant, got {msg['role']}"
            print(f"✓ Message structure verified: role={msg['role']}")
    
    def test_history_invalid_session_id(self, auth_headers):
        """GET /api/ai/chat/history with invalid session_id should return 400"""
        response = requests.get(f"{BASE_URL}/api/ai/chat/history/invalid-id", headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid session_id correctly rejected with 400")
    
    def test_history_not_found(self, auth_headers):
        """GET /api/ai/chat/history with non-existent session_id should return 404"""
        # Use a valid ObjectId format but non-existent
        response = requests.get(f"{BASE_URL}/api/ai/chat/history/507f1f77bcf86cd799439011", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent session correctly returns 404")


class TestAIChatConversationContext:
    """Test that follow-up messages maintain conversation context"""
    
    def test_followup_message_with_context(self, auth_headers):
        """POST /api/ai/chat with existing session_id should maintain context"""
        # Get an existing session
        sessions_response = requests.get(f"{BASE_URL}/api/ai/chat/sessions", headers=auth_headers)
        sessions = sessions_response.json().get("sessions", [])
        
        if len(sessions) == 0:
            pytest.skip("No sessions available to test follow-up")
        
        session_id = sessions[0]["id"]
        
        # Send follow-up message
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "session_id": session_id,
                "message": "TEST_FOLLOWUP: ¿Puedes darme más detalles sobre lo anterior?"
            },
            timeout=60
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("session_id") == session_id, "Session ID should remain the same"
        assert len(data.get("response", "")) > 0, "Should receive AI response"
        
        print(f"✓ Follow-up message sent to session {session_id[:8]}...")
        print(f"✓ AI response received ({len(data['response'])} chars)")


class TestAIChatDeleteSession:
    """Test session deletion"""
    
    def test_delete_session(self, auth_headers):
        """DELETE /api/ai/chat/session/{session_id} should delete session and messages"""
        # First create a new session to delete
        create_response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=auth_headers,
            json={
                "session_id": "",
                "message": "TEST_DELETE: Esta sesión será eliminada"
            },
            timeout=60
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create session to delete: {create_response.status_code}")
        
        session_id = create_response.json().get("session_id")
        assert session_id, "Session ID should be returned"
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/ai/chat/session/{session_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert data.get("success") == True, "Delete should return success=True"
        
        print(f"✓ Session {session_id[:8]}... deleted successfully")
        
        # Verify session is gone
        history_response = requests.get(
            f"{BASE_URL}/api/ai/chat/history/{session_id}",
            headers=auth_headers
        )
        assert history_response.status_code == 404, "Deleted session should return 404"
        print("✓ Deleted session correctly returns 404 on history request")
    
    def test_delete_invalid_session_id(self, auth_headers):
        """DELETE /api/ai/chat/session with invalid session_id should return 400"""
        response = requests.delete(
            f"{BASE_URL}/api/ai/chat/session/invalid-id",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid session_id correctly rejected with 400")
    
    def test_delete_not_found(self, auth_headers):
        """DELETE /api/ai/chat/session with non-existent session_id should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/ai/chat/session/507f1f77bcf86cd799439011",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent session correctly returns 404")


class TestAIChatCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_sessions(self, auth_headers):
        """Clean up any TEST_ prefixed sessions"""
        sessions_response = requests.get(f"{BASE_URL}/api/ai/chat/sessions", headers=auth_headers)
        if sessions_response.status_code != 200:
            return
        
        sessions = sessions_response.json().get("sessions", [])
        deleted_count = 0
        
        for session in sessions:
            if session.get("title", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/ai/chat/session/{session['id']}",
                    headers=auth_headers
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleanup: deleted {deleted_count} test sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
