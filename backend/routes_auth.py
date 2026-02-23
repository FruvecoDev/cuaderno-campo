from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId

from models_auth import UserCreate, UserLogin, UserInDB, Token, UserRole
from auth_utils import (
    verify_password, get_password_hash, create_access_token,
    decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import db, serialize_doc

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

# Users collection
users_collection = db['users']

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return serialize_doc(user)

# Optional auth (for public endpoints that can use auth)
async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """Optional authentication - returns None if not authenticated"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """Register a new user (Admin only)"""
    # Check if current user is admin
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    
    # Set permissions based on role
    permissions = {
        UserRole.ADMIN: {"can_create": True, "can_edit": True, "can_delete": True, "can_export": True},
        UserRole.MANAGER: {"can_create": True, "can_edit": True, "can_delete": False, "can_export": True},
        UserRole.TECHNICIAN: {"can_create": True, "can_edit": True, "can_delete": False, "can_export": False},
        UserRole.VIEWER: {"can_create": False, "can_edit": False, "can_delete": False, "can_export": True}
    }
    
    user_dict = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "hashed_password": hashed_password,
        "is_active": True,
        **permissions.get(user_data.role, permissions[UserRole.VIEWER]),
        "modules_access": [
            "dashboard", "contratos", "parcelas", "fincas",
            "visitas", "tareas", "tratamientos", "irrigaciones",
            "recetas", "albaranes", "cosechas", "documentos"
        ],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await users_collection.insert_one(user_dict)
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    
    # Create token
    access_token = create_access_token(
        data={"sub": created_user["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user_response = serialize_doc(created_user)
    user_response.pop("hashed_password", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    # Find user
    user = await users_collection.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is disabled")
    
    # Create token
    access_token = create_access_token(
        data={"sub": user["email"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user_response = serialize_doc(user)
    user_response.pop("hashed_password", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    user_response = current_user.copy()
    user_response.pop("hashed_password", None)
    return user_response

@router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (Admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await users_collection.find().to_list(100)
    users_response = []
    for user in users:
        user_dict = serialize_doc(user)
        user_dict.pop("hashed_password", None)
        users_response.append(user_dict)
    
    return {"users": users_response}

@router.put("/users/{user_id}")
async def update_user(user_id: str, user_update: dict, current_user: dict = Depends(get_current_user)):
    """Update user (Admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Remove sensitive fields from update
    user_update.pop("hashed_password", None)
    user_update.pop("_id", None)
    user_update["updated_at"] = datetime.now()
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": user_update}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    user_response = serialize_doc(updated_user)
    user_response.pop("hashed_password", None)
    
    return {"success": True, "user": user_response}

@router.post("/init-admin")
async def initialize_admin():
    """Initialize first admin user - only works if no users exist"""
    # Check if any users exist
    user_count = await users_collection.count_documents({})
    if user_count > 0:
        raise HTTPException(status_code=400, detail="Admin already exists")
    
    # Create default admin
    admin_data = {
        "email": "admin@agrogest.com",
        "full_name": "Administrator",
        "role": UserRole.ADMIN,
        "hashed_password": get_password_hash("admin123"),
        "is_active": True,
        "can_create": True,
        "can_edit": True,
        "can_delete": True,
        "can_export": True,
        "modules_access": [
            "dashboard", "contratos", "parcelas", "fincas",
            "visitas", "tareas", "tratamientos", "irrigaciones",
            "recetas", "albaranes", "cosechas", "documentos"
        ],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await users_collection.insert_one(admin_data)
    
    return {
        "success": True,
        "message": "Admin user created",
        "credentials": {
            "email": "admin@agrogest.com",
            "password": "admin123",
            "note": "Please change password after first login"
        }
    }