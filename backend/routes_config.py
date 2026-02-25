"""
Routes for App Configuration - Logos and Settings
Only accessible by Admin users
Supports two logos: login_logo and dashboard_logo
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from typing import Optional, Literal
from bson import ObjectId
from datetime import datetime
import os
import uuid
import shutil

from database import db
from rbac_guards import get_current_user

router = APIRouter(prefix="/api", tags=["config"])

# Collection for app settings
settings_collection = db['app_settings']

# Directory for uploaded logos
LOGOS_DIR = "/app/uploads/logos"
os.makedirs(LOGOS_DIR, exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}

# Valid logo types
LOGO_TYPES = {'login', 'dashboard'}


def is_admin(user: dict) -> bool:
    """Check if user is admin"""
    return user.get('role') == 'Admin'


@router.get("/config/logos")
async def get_logos():
    """
    Get all logo URLs (public endpoint)
    Returns both login and dashboard logos
    """
    settings = await settings_collection.find_one({"key": "logos"})
    
    if settings:
        return {
            "success": True,
            "login_logo": settings.get("login_logo"),
            "dashboard_logo": settings.get("dashboard_logo"),
            "updated_at": settings.get("updated_at")
        }
    
    # Return defaults if no custom logos are set
    return {
        "success": True,
        "login_logo": None,
        "dashboard_logo": None,
        "updated_at": None
    }


@router.post("/config/logo/{logo_type}")
async def upload_logo(
    logo_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a logo (Admin only)
    logo_type: 'login' or 'dashboard'
    """
    # Validate logo type
    if logo_type not in LOGO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de logo no válido. Use: {', '.join(LOGO_TYPES)}"
        )
    
    # Check admin permission
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo el administrador puede cambiar el logo")
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Formato no permitido. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate file size (max 5MB)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="El archivo es demasiado grande. Máximo 5MB")
    
    try:
        # Generate unique filename
        filename = f"logo_{logo_type}_{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(LOGOS_DIR, filename)
        
        # Get current settings
        old_settings = await settings_collection.find_one({"key": "logos"})
        
        # Delete old logo file if exists
        if old_settings:
            old_file_key = f"{logo_type}_file_path"
            old_path = old_settings.get(old_file_key)
            if old_path and os.path.exists(old_path):
                os.remove(old_path)
        
        # Save new file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate web URL
        web_url = f"/api/uploads/logos/{filename}"
        
        # Prepare update data
        logo_key = f"{logo_type}_logo"
        file_path_key = f"{logo_type}_file_path"
        original_name_key = f"{logo_type}_original_filename"
        
        update_data = {
            "key": "logos",
            logo_key: web_url,
            file_path_key: file_path,
            original_name_key: file.filename,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user.get("username", "admin")
        }
        
        # Update settings in database (preserve other logo if exists)
        await settings_collection.update_one(
            {"key": "logos"},
            {"$set": update_data},
            upsert=True
        )
        
        logo_name = "Login" if logo_type == "login" else "Dashboard"
        return {
            "success": True,
            "message": f"Logo de {logo_name} actualizado correctamente",
            "logo_url": web_url,
            "logo_type": logo_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el logo: {str(e)}")


@router.delete("/config/logo/{logo_type}")
async def delete_logo(
    logo_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific logo and restore default (Admin only)
    logo_type: 'login' or 'dashboard'
    """
    # Validate logo type
    if logo_type not in LOGO_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de logo no válido. Use: {', '.join(LOGO_TYPES)}"
        )
    
    # Check admin permission
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo el administrador puede cambiar el logo")
    
    try:
        # Get current settings
        settings = await settings_collection.find_one({"key": "logos"})
        
        if settings:
            # Delete file if exists
            file_path_key = f"{logo_type}_file_path"
            file_path = settings.get(file_path_key)
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
            
            # Remove logo fields from database
            logo_key = f"{logo_type}_logo"
            original_name_key = f"{logo_type}_original_filename"
            
            await settings_collection.update_one(
                {"key": "logos"},
                {
                    "$unset": {
                        logo_key: "",
                        file_path_key: "",
                        original_name_key: ""
                    },
                    "$set": {
                        "updated_at": datetime.utcnow().isoformat(),
                        "updated_by": current_user.get("username", "admin")
                    }
                }
            )
        
        logo_name = "Login" if logo_type == "login" else "Dashboard"
        return {
            "success": True,
            "message": f"Logo de {logo_name} eliminado. Se usará el logo por defecto."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar el logo: {str(e)}")


@router.get("/config/settings")
async def get_app_settings(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all app settings (Admin only)
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo el administrador puede ver la configuración")
    
    settings = await settings_collection.find({}).to_list(100)
    
    result = {}
    for s in settings:
        key = s.get("key")
        if key:
            if key == "logos":
                result[key] = {
                    "login_logo": s.get("login_logo"),
                    "dashboard_logo": s.get("dashboard_logo"),
                    "updated_at": s.get("updated_at"),
                    "updated_by": s.get("updated_by")
                }
            else:
                result[key] = {
                    "value": s.get("value"),
                    "updated_at": s.get("updated_at"),
                    "updated_by": s.get("updated_by")
                }
    
    return {"success": True, "settings": result}
