"""
Test configuration - loads credentials from environment variables.
"""
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = os.environ.get('TEST_EMAIL', '')
TEST_PASSWORD = os.environ.get('TEST_PASSWORD', '')
ADMIN_EMAIL = os.environ.get('TEST_EMAIL', '')
ADMIN_PASSWORD = os.environ.get('TEST_PASSWORD', '')
