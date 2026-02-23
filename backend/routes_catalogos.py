"""
Rutas para gestión de catálogos maestros: Proveedores y Cultivos
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models_catalogos import (
    ProveedorCreate, ProveedorInDB,
    CultivoCreate, CultivoInDB
)
from database import db, serialize_doc, serialize_docs
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    get_current_user
)

router = APIRouter()

# Collections
proveedores_collection = db['proveedores']
cultivos_collection = db['cultivos']


# ============================================================================
# PROVEEDORES
# ============================================================================

@router.post("/proveedores", response_model=dict)
async def create_proveedor(
    proveedor: ProveedorCreate,
    current_user: dict = Depends(RequireCreate)
):
    proveedor_dict = proveedor.dict()
    proveedor_dict['created_at'] = datetime.now()
    proveedor_dict['updated_at'] = datetime.now()
    
    result = await proveedores_collection.insert_one(proveedor_dict)
    created = await proveedores_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "proveedor": serialize_doc(created)}


@router.get("/proveedores")
async def get_proveedores(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if activo is not None:
        query['activo'] = activo
    
    proveedores = await proveedores_collection.find(query).skip(skip).limit(limit).to_list(limit)
    total = await proveedores_collection.count_documents(query)
    
    return {
        "proveedores": serialize_docs(proveedores),
        "total": total
    }


@router.get("/proveedores/{proveedor_id}")
async def get_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    proveedor = await proveedores_collection.find_one({"_id": ObjectId(proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    return {"proveedor": serialize_doc(proveedor)}


@router.put("/proveedores/{proveedor_id}")
async def update_proveedor(
    proveedor_id: str,
    proveedor: ProveedorCreate,
    current_user: dict = Depends(RequireEdit)
):
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    proveedor_dict = proveedor.dict()
    proveedor_dict['updated_at'] = datetime.now()
    
    result = await proveedores_collection.update_one(
        {"_id": ObjectId(proveedor_id)},
        {"$set": proveedor_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    updated = await proveedores_collection.find_one({"_id": ObjectId(proveedor_id)})
    return {"success": True, "proveedor": serialize_doc(updated)}


@router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(RequireDelete)
):
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await proveedores_collection.delete_one({"_id": ObjectId(proveedor_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    return {"success": True, "message": "Proveedor deleted"}


# ============================================================================
# CULTIVOS
# ============================================================================

@router.post("/cultivos", response_model=dict)
async def create_cultivo(
    cultivo: CultivoCreate,
    current_user: dict = Depends(RequireCreate)
):
    cultivo_dict = cultivo.dict()
    cultivo_dict['created_at'] = datetime.now()
    cultivo_dict['updated_at'] = datetime.now()
    
    result = await cultivos_collection.insert_one(cultivo_dict)
    created = await cultivos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "cultivo": serialize_doc(created)}


@router.get("/cultivos")
async def get_cultivos(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = None,
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if activo is not None:
        query['activo'] = activo
    if tipo:
        query['tipo'] = tipo
    
    cultivos = await cultivos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    total = await cultivos_collection.count_documents(query)
    
    return {
        "cultivos": serialize_docs(cultivos),
        "total": total
    }


@router.get("/cultivos/{cultivo_id}")
async def get_cultivo(
    cultivo_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(cultivo_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cultivo = await cultivos_collection.find_one({"_id": ObjectId(cultivo_id)})
    if not cultivo:
        raise HTTPException(status_code=404, detail="Cultivo not found")
    
    return {"cultivo": serialize_doc(cultivo)}


@router.put("/cultivos/{cultivo_id}")
async def update_cultivo(
    cultivo_id: str,
    cultivo: CultivoCreate,
    current_user: dict = Depends(RequireEdit)
):
    if not ObjectId.is_valid(cultivo_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cultivo_dict = cultivo.dict()
    cultivo_dict['updated_at'] = datetime.now()
    
    result = await cultivos_collection.update_one(
        {"_id": ObjectId(cultivo_id)},
        {"$set": cultivo_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cultivo not found")
    
    updated = await cultivos_collection.find_one({"_id": ObjectId(cultivo_id)})
    return {"success": True, "cultivo": serialize_doc(updated)}


@router.delete("/cultivos/{cultivo_id}")
async def delete_cultivo(
    cultivo_id: str,
    current_user: dict = Depends(RequireDelete)
):
    if not ObjectId.is_valid(cultivo_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await cultivos_collection.delete_one({"_id": ObjectId(cultivo_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cultivo not found")
    
    return {"success": True, "message": "Cultivo deleted"}
