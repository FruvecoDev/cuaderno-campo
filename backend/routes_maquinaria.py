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
    
    result = await maquinaria_collection.delete_one({"_id": ObjectId(maquinaria_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Maquinaria no encontrada")
    
    return {"success": True, "message": "Maquinaria eliminada correctamente"}
