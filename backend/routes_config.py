"""
Routes for App Configuration - Logo and Settings
Only accessible by Admin users
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional
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


def is_admin(user: dict) -> bool:
    """Check if user is admin"""
    return user.get('role') == 'Admin'


@router.get("/config/logo")
async def get_logo():
    """
    Get the current logo URL (public endpoint)
    """
    settings = await settings_collection.find_one({"key": "logo"})
    
    if settings and settings.get("logo_url"):
        return {
            "success": True,
            "logo_url": settings["logo_url"],
            "updated_at": settings.get("updated_at")
        }
    
    # Return default logo if no custom logo is set
    return {
        "success": True,
        "logo_url": None,  # Frontend will use default
        "updated_at": None
    }


@router.post("/config/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a new logo (Admin only)
    """
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
        filename = f"logo_{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(LOGOS_DIR, filename)
        
        # Delete old logo if exists
        old_settings = await settings_collection.find_one({"key": "logo"})
        if old_settings and old_settings.get("file_path"):
            old_path = old_settings["file_path"]
            if os.path.exists(old_path):
                os.remove(old_path)
        
        # Save new file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate web URL
        web_url = f"/api/uploads/logos/{filename}"
        
        # Update settings in database
        await settings_collection.update_one(
            {"key": "logo"},
            {
                "$set": {
                    "key": "logo",
                    "logo_url": web_url,
                    "file_path": file_path,
                    "original_filename": file.filename,
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": current_user.get("username", "admin")
                }
            },
            upsert=True
        )
        
        return {
            "success": True,
            "message": "Logo actualizado correctamente",
            "logo_url": web_url
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el logo: {str(e)}")


@router.delete("/config/logo")
async def delete_logo(
    current_user: dict = Depends(get_current_user)
):
    """
    Delete custom logo and restore default (Admin only)
    """
    # Check admin permission
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo el administrador puede cambiar el logo")
    
    try:
        # Get current settings
        settings = await settings_collection.find_one({"key": "logo"})
        
        if settings and settings.get("file_path"):
            # Delete file
            file_path = settings["file_path"]
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Remove from database
        await settings_collection.delete_one({"key": "logo"})
        
        return {
            "success": True,
            "message": "Logo eliminado. Se usará el logo por defecto."
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
            result[key] = {
                "value": s.get("logo_url") if key == "logo" else s.get("value"),
                "updated_at": s.get("updated_at"),
                "updated_by": s.get("updated_by")
            }
    
    return {"success": True, "settings": result}
