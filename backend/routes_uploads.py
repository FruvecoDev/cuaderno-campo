"""
Routes for File Uploads - Handle image uploads for visits and other modules
Includes AI-powered pest and disease analysis
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import os
import uuid
import aiofiles
import base64

from database import visitas_collection, serialize_doc
from rbac_guards import RequireEdit, get_current_user
from services.pest_analysis_service import analyze_image_for_pests, analyze_image_base64

router = APIRouter(prefix="/api", tags=["uploads"])

# Configuration
UPLOAD_DIR = "/app/uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB per file

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/visitas", exist_ok=True)


def validate_file(file: UploadFile) -> bool:
    """Validate file extension"""
    ext = os.path.splitext(file.filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


@router.post("/visitas/{visita_id}/fotos")
async def upload_visita_fotos(
    visita_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(RequireEdit)
):
    """Upload photos to a visit"""
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="ID de visita inválido")
    
    # Check visit exists
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    
    # Validate files
    if not files:
        raise HTTPException(status_code=400, detail="No se han proporcionado archivos")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Máximo 10 fotos por subida")
    
    uploaded_files = []
    errors = []
    
    for file in files:
        # Validate extension
        if not validate_file(file):
            errors.append(f"{file.filename}: Formato no permitido. Use JPG, PNG, GIF o WebP")
            continue
        
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = f"{UPLOAD_DIR}/visitas/{unique_filename}"
        
        try:
            # Read and validate file size
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                errors.append(f"{file.filename}: El archivo excede el tamaño máximo de 10MB")
                continue
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Build URL (relative to API)
            file_url = f"/api/uploads/visitas/{unique_filename}"
            
            uploaded_files.append({
                "filename": file.filename,
                "url": file_url,
                "size": len(content),
                "uploaded_at": datetime.now().isoformat()
            })
            
        except Exception as e:
            errors.append(f"{file.filename}: Error al guardar - {str(e)}")
    
    if not uploaded_files and errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    
    # Update visit with new photos
    existing_fotos = visita.get("fotos", [])
    new_fotos = existing_fotos + uploaded_files
    
    await visitas_collection.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": {"fotos": new_fotos, "updated_at": datetime.now()}}
    )
    
    # Fetch updated visit
    updated_visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    
    return {
        "success": True,
        "uploaded": len(uploaded_files),
        "errors": errors if errors else None,
        "fotos": new_fotos,
        "visita": serialize_doc(updated_visita)
    }


@router.delete("/visitas/{visita_id}/fotos/{foto_index}")
async def delete_visita_foto(
    visita_id: str,
    foto_index: int,
    current_user: dict = Depends(RequireEdit)
):
    """Delete a photo from a visit"""
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="ID de visita inválido")
    
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    
    fotos = visita.get("fotos", [])
    
    if foto_index < 0 or foto_index >= len(fotos):
        raise HTTPException(status_code=400, detail="Índice de foto inválido")
    
    # Get file path and try to delete from disk
    foto = fotos[foto_index]
    file_url = foto.get("url", "")
    if file_url.startswith("/api/uploads/"):
        file_path = file_url.replace("/api/uploads/", f"{UPLOAD_DIR}/")
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {file_path}: {e}")
    
    # Remove from list
    fotos.pop(foto_index)
    
    await visitas_collection.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": {"fotos": fotos, "updated_at": datetime.now()}}
    )
    
    return {"success": True, "message": "Foto eliminada", "fotos": fotos}


@router.get("/visitas/{visita_id}/fotos")
async def get_visita_fotos(
    visita_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all photos for a visit"""
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="ID de visita inválido")
    
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    
    return {"fotos": visita.get("fotos", [])}



# ============================================================================
# AI PEST AND DISEASE ANALYSIS ENDPOINTS
# ============================================================================

@router.post("/visitas/{visita_id}/fotos/{foto_index}/analizar")
async def analyze_visita_foto(
    visita_id: str,
    foto_index: int,
    current_user: dict = Depends(get_current_user)
):
    """Analyze a specific photo for pests and diseases using AI"""
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="ID de visita inválido")
    
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    
    fotos = visita.get("fotos", [])
    
    if foto_index < 0 or foto_index >= len(fotos):
        raise HTTPException(status_code=400, detail="Índice de foto inválido")
    
    foto = fotos[foto_index]
    file_url = foto.get("url", "")
    
    if not file_url.startswith("/api/uploads/"):
        raise HTTPException(status_code=400, detail="URL de foto inválida")
    
    # Get file path
    file_path = file_url.replace("/api/uploads/", f"{UPLOAD_DIR}/")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo de foto no encontrado")
    
    # Get crop type from visita if available
    crop_type = visita.get("cultivo", None)
    
    # Analyze image
    analysis_result = await analyze_image_for_pests(file_path, crop_type)
    
    # Save analysis result to the photo
    fotos[foto_index]["ai_analysis"] = {
        **analysis_result,
        "analyzed_at": datetime.now().isoformat(),
        "analyzed_by": current_user.get("email", "unknown")
    }
    
    await visitas_collection.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": {"fotos": fotos, "updated_at": datetime.now()}}
    )
    
    return {
        "success": True,
        "analysis": analysis_result,
        "foto": fotos[foto_index]
    }


@router.post("/analizar-imagen")
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    crop_type: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Analyze an uploaded image for pests and diseases (standalone endpoint)"""
    # Validate file
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Formato de imagen no permitido")
    
    # Read file content
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo de 10MB")
    
    # Convert to base64
    image_base64 = base64.b64encode(content).decode("utf-8")
    
    # Analyze
    analysis_result = await analyze_image_base64(image_base64, crop_type)
    
    return {
        "success": True,
        "analysis": analysis_result
    }


@router.post("/visitas/{visita_id}/fotos/analizar-todas")
async def analyze_all_visita_fotos(
    visita_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Analyze all photos in a visit for pests and diseases"""
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="ID de visita inválido")
    
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita no encontrada")
    
    fotos = visita.get("fotos", [])
    
    if not fotos:
        raise HTTPException(status_code=400, detail="La visita no tiene fotos")
    
    crop_type = visita.get("cultivo", None)
    results = []
    
    for i, foto in enumerate(fotos):
        file_url = foto.get("url", "")
        
        if not file_url.startswith("/api/uploads/"):
            results.append({"index": i, "error": True, "message": "URL inválida"})
            continue
        
        file_path = file_url.replace("/api/uploads/", f"{UPLOAD_DIR}/")
        
        if not os.path.exists(file_path):
            results.append({"index": i, "error": True, "message": "Archivo no encontrado"})
            continue
        
        # Analyze image
        analysis_result = await analyze_image_for_pests(file_path, crop_type)
        
        # Save analysis result
        fotos[i]["ai_analysis"] = {
            **analysis_result,
            "analyzed_at": datetime.now().isoformat(),
            "analyzed_by": current_user.get("email", "unknown")
        }
        
        results.append({
            "index": i,
            "filename": foto.get("filename", ""),
            "analysis": analysis_result
        })
    
    # Update visita with all analyses
    await visitas_collection.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": {"fotos": fotos, "updated_at": datetime.now()}}
    )
    
    return {
        "success": True,
        "total_analyzed": len(results),
        "results": results,
        "fotos": fotos
    }
