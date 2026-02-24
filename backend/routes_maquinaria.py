from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
from bson import ObjectId
from datetime import datetime
import os
import uuid

from models_tratamientos import MaquinariaCreate, MaquinariaInDB
from database import maquinaria_collection, serialize_doc, serialize_docs
from rbac_guards import RequireCreate, RequireEdit, RequireDelete, get_current_user

router = APIRouter(prefix="/api", tags=["maquinaria"])

# ============================================================================
# MAQUINARIA CRUD
# ============================================================================

@router.post("/maquinaria", response_model=dict)
async def create_maquinaria(
    maquinaria: MaquinariaCreate,
    current_user: dict = Depends(RequireCreate)
):
    """Crear nueva maquinaria en el catálogo"""
    maquinaria_dict = maquinaria.dict()
    maquinaria_dict["created_at"] = datetime.now()
    maquinaria_dict["updated_at"] = datetime.now()
    
    result = await maquinaria_collection.insert_one(maquinaria_dict)
    created = await maquinaria_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/maquinaria")
async def get_maquinaria_list(
    skip: int = 0,
    limit: int = 100,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar toda la maquinaria con filtros opcionales"""
    query = {}
    if tipo:
        query["tipo"] = tipo
    if estado:
        query["estado"] = estado
    
    maquinaria = await maquinaria_collection.find(query).skip(skip).limit(limit).to_list(limit)
    total = await maquinaria_collection.count_documents(query)
    
    return {"maquinaria": serialize_docs(maquinaria), "total": total}


@router.get("/maquinaria/{maquinaria_id}")
async def get_maquinaria(
    maquinaria_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una maquinaria por ID"""
    if not ObjectId.is_valid(maquinaria_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    maquinaria = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    if not maquinaria:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    return serialize_doc(maquinaria)


@router.put("/maquinaria/{maquinaria_id}")
async def update_maquinaria(
    maquinaria_id: str,
    maquinaria: MaquinariaCreate,
    current_user: dict = Depends(RequireEdit)
):
    """Actualizar una maquinaria existente"""
    if not ObjectId.is_valid(maquinaria_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    update_data = maquinaria.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await maquinaria_collection.update_one(
        {"_id": ObjectId(maquinaria_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    updated = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/maquinaria/{maquinaria_id}")
async def delete_maquinaria(
    maquinaria_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar una maquinaria del catálogo"""
    if not ObjectId.is_valid(maquinaria_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    # Eliminar imagen si existe
    maquinaria = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    if maquinaria:
        file_path = maquinaria.get("imagen_placa_ce_url")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    
    result = await maquinaria_collection.delete_one({"_id": ObjectId(maquinaria_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    return {"success": True, "message": "Maquinaria eliminada correctamente"}


# ============================================================================
# IMAGEN PLACA CE
# ============================================================================

@router.post("/maquinaria/{maquinaria_id}/imagen-placa-ce")
async def upload_imagen_placa_ce(
    maquinaria_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(RequireEdit)
):
    """Subir imagen de la placa CE de la maquinaria"""
    if not ObjectId.is_valid(maquinaria_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    maquinaria = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    if not maquinaria:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    # Validar tipo de archivo
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Tipo de archivo no permitido. Permitidos: JPEG, PNG, WEBP"
        )
    
    # Validar tamaño (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo de 10MB")
    
    # Crear directorio si no existe - usando directorio persistente
    upload_dir = "/app/uploads/maquinaria_placas"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Eliminar imagen anterior si existe
    old_file_path = maquinaria.get("imagen_placa_ce_path")
    if old_file_path and os.path.exists(old_file_path):
        os.remove(old_file_path)
    
    # Guardar archivo
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{file_ext}"
    file_path = f"{upload_dir}/{filename}"
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Guardar URL relativa para acceso web
    web_url = f"/api/uploads/maquinaria_placas/{filename}"
    
    # Actualizar URL en la base de datos
    await maquinaria_collection.update_one(
        {"_id": ObjectId(maquinaria_id)},
        {"$set": {
            "imagen_placa_ce_url": web_url,
            "imagen_placa_ce_path": file_path,
            "imagen_placa_ce_nombre": file.filename,
            "updated_at": datetime.now()
        }}
    )
    
    updated = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/maquinaria/{maquinaria_id}/imagen-placa-ce")
async def delete_imagen_placa_ce(
    maquinaria_id: str,
    current_user: dict = Depends(RequireEdit)
):
    """Eliminar imagen de la placa CE"""
    if not ObjectId.is_valid(maquinaria_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    maquinaria = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    if not maquinaria:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    # Eliminar archivo si existe
    file_path = maquinaria.get("imagen_placa_ce_url")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # Actualizar base de datos
    await maquinaria_collection.update_one(
        {"_id": ObjectId(maquinaria_id)},
        {"$set": {
            "imagen_placa_ce_url": None,
            "imagen_placa_ce_nombre": None,
            "updated_at": datetime.now()
        }}
    )
    
    return {"success": True, "message": "Imagen de placa CE eliminada"}


@router.get("/maquinaria/{maquinaria_id}/imagen-placa-ce")
async def get_imagen_placa_ce(
    maquinaria_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener la imagen de la placa CE"""
    from fastapi.responses import FileResponse
    
    if not ObjectId.is_valid(maquinaria_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    maquinaria = await maquinaria_collection.find_one({"_id": ObjectId(maquinaria_id)})
    if not maquinaria:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    file_path = maquinaria.get("imagen_placa_ce_url")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="No hay imagen de placa CE")
    
    return FileResponse(file_path)
