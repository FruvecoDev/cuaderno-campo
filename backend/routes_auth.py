from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
import os
import secrets

from models_auth import UserCreate, UserLogin, UserInDB, Token, UserRole, ALL_MENU_ITEMS, DEFAULT_MENU_PERMISSIONS, PERMISSION_PROFILES
from auth_utils import (
    verify_password, get_password_hash, create_access_token,
    decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
)
from database import db, serialize_doc
from rbac_config import get_role_permissions

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
    
    # Get permissions from RBAC matrix
    role_permissions = get_role_permissions(user_data.role)
    
    user_dict = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "hashed_password": hashed_password,
        "is_active": True,
        "tipo_operacion": "ambos",  # compra, venta, ambos
        **role_permissions,
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
    # No enviar el password SMTP al cliente. Solo indicar si esta configurado.
    user_response["smtp_password_set"] = bool(user_response.pop("smtp_password", None))
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
        user_dict["smtp_password_set"] = bool(user_dict.pop("smtp_password", None))
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
    # Si se envia smtp_password vacio, no lo actualizamos (para no borrar el
    # existente cuando el Admin solo edita otros campos). Para BORRAR el
    # password hay que enviarlo como null explicito.
    if user_update.get("smtp_password") == "":
        user_update.pop("smtp_password")
    user_update.pop("smtp_password_set", None)  # campo derivado, no persistir
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


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete user permanently (requires can_manage_users permission)"""
    if not current_user.get("can_manage_users"):
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar usuarios")
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db["user_column_config"].delete_many({"user_id": user_id})
    return {"success": True, "message": "Usuario eliminado permanentemente"}



@router.put("/users/{user_id}/password")
async def change_user_password(
    user_id: str, 
    password_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Change user password (Admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    new_password = password_data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Hash the new password
    hashed_password = get_password_hash(new_password)
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": hashed_password, "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "Contraseña actualizada correctamente"}


@router.get("/menu-items")
async def get_menu_items(current_user: dict = Depends(get_current_user)):
    """Get all available menu items for permission configuration"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"menu_items": ALL_MENU_ITEMS}

@router.get("/permission-profiles")
async def get_permission_profiles(current_user: dict = Depends(get_current_user)):
    """Get all predefined permission profiles"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    profiles = []
    for key, profile in PERMISSION_PROFILES.items():
        profiles.append({
            "id": key,
            "name": profile["name"],
            "description": profile["description"],
            "icon": profile["icon"],
            "permissions": profile["permissions"]
        })
    
    return {"profiles": profiles}

@router.put("/users/{user_id}/menu-permissions")
async def update_menu_permissions(
    user_id: str, 
    permissions: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update menu permissions for a user (Admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Get current user to check if exists
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Merge with default permissions to ensure all paths are covered
    menu_permissions = {**DEFAULT_MENU_PERMISSIONS, **permissions.get("menu_permissions", {})}
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"menu_permissions": menu_permissions, "updated_at": datetime.now()}}
    )
    
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    user_response = serialize_doc(updated_user)
    user_response.pop("hashed_password", None)
    
    return {"success": True, "user": user_response}


@router.put("/users/{user_id}/tipo-operacion")
async def update_tipo_operacion(
    user_id: str, 
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update operation type permission for a user (Admin only)
    tipo_operacion: 'compra', 'venta', 'ambos'
    """
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    tipo_operacion = data.get("tipo_operacion", "ambos")
    if tipo_operacion not in ["compra", "venta", "ambos"]:
        raise HTTPException(status_code=400, detail="tipo_operacion debe ser: compra, venta o ambos")
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"tipo_operacion": tipo_operacion, "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    user_response = serialize_doc(updated_user)
    user_response.pop("hashed_password", None)
    
    return {"success": True, "user": user_response}


@router.get("/empleados-disponibles")
async def get_empleados_disponibles(current_user: dict = Depends(get_current_user)):
    """Get list of employees that can be linked to users (Admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all active employees
    empleados_collection = db['empleados']
    empleados = await empleados_collection.find({"activo": True}).to_list(500)
    
    # Get all users that have an empleado_id
    users_with_empleado = await users_collection.find(
        {"empleado_id": {"$exists": True, "$ne": None}},
        {"empleado_id": 1}
    ).to_list(500)
    
    empleados_vinculados = {u["empleado_id"] for u in users_with_empleado}
    
    result = []
    for emp in empleados:
        emp_id = str(emp["_id"])
        result.append({
            "_id": emp_id,
            "codigo": emp.get("codigo", ""),
            "nombre": emp.get("nombre", ""),
            "apellidos": emp.get("apellidos", ""),
            "dni_nie": emp.get("dni_nie", ""),
            "email": emp.get("email", ""),
            "puesto": emp.get("puesto", ""),
            "vinculado": emp_id in empleados_vinculados
        })
    
    return {"empleados": result}


@router.put("/users/{user_id}/vincular-empleado")
async def vincular_empleado(
    user_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Link a user to an employee (Admin only)"""
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    empleado_id = data.get("empleado_id")
    
    # If empleado_id is empty or None, unlink the employee
    update_data = {"updated_at": datetime.now()}
    
    if empleado_id:
        if not ObjectId.is_valid(empleado_id):
            raise HTTPException(status_code=400, detail="Invalid employee ID")
        
        # Verify employee exists
        empleados_collection = db['empleados']
        empleado = await empleados_collection.find_one({"_id": ObjectId(empleado_id)})
        if not empleado:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Check if employee is already linked to another user
        existing_link = await users_collection.find_one({
            "empleado_id": empleado_id,
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing_link:
            raise HTTPException(
                status_code=400, 
                detail=f"Este empleado ya está vinculado al usuario {existing_link.get('email')}"
            )
        
        update_data["empleado_id"] = empleado_id
    else:
        update_data["empleado_id"] = None
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    user_response = serialize_doc(updated_user)
    user_response.pop("hashed_password", None)
    
    return {"success": True, "user": user_response}


@router.post("/init-admin")
async def initialize_admin(request: Request):
    """
    Initialize first admin — SÓLO funciona si:
      1. No existe ningún usuario en la base de datos.
      2. La cabecera `X-Init-Token` coincide con `INIT_ADMIN_TOKEN` en .env.

    Requiere en .env:
      - INIT_ADMIN_TOKEN (32+ chars, secreto de un solo uso)
      - INITIAL_ADMIN_EMAIL (opcional, default: admin@fruveco.com)
      - INITIAL_ADMIN_PASSWORD (obligatorio, debe cambiarse tras primer login)

    Nunca devuelve credenciales en el body — solo confirma la creación.
    """
    # Guard 1: no debe existir ningún usuario
    user_count = await users_collection.count_documents({})
    if user_count > 0:
        raise HTTPException(status_code=403, detail="Admin ya inicializado")

    # Guard 2: token de un solo uso, distinto de SECRET_KEY
    expected_token = os.environ.get("INIT_ADMIN_TOKEN")
    if not expected_token or len(expected_token) < 32:
        raise HTTPException(
            status_code=503,
            detail="Servicio no disponible: INIT_ADMIN_TOKEN no configurado en el servidor",
        )
    provided_token = request.headers.get("X-Init-Token", "")
    if not secrets.compare_digest(provided_token, expected_token):
        raise HTTPException(status_code=403, detail="Token de inicialización inválido")

    # Guard 3: password obligatoria por env (no hardcoded)
    initial_password = os.environ.get("INITIAL_ADMIN_PASSWORD")
    if not initial_password or len(initial_password) < 8:
        raise HTTPException(
            status_code=503,
            detail="INITIAL_ADMIN_PASSWORD no configurado o demasiado corto (>=8 chars)",
        )

    admin_email = os.environ.get("INITIAL_ADMIN_EMAIL", "admin@fruveco.com")
    admin_permissions = get_role_permissions(UserRole.ADMIN)

    admin_data = {
        "email": admin_email,
        "full_name": "Administrador FRUVECO",
        "role": UserRole.ADMIN,
        "hashed_password": get_password_hash(initial_password),
        "is_active": True,
        **admin_permissions,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
    }
    await users_collection.insert_one(admin_data)

    # Respuesta minimalista — no incluye credenciales en el cuerpo
    return {
        "success": True,
        "message": f"Admin creado. Iniciar sesión con {admin_email} y cambiar la contraseña.",
    }