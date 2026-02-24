"""
Routes for Parcelas (Parcels) - CRUD operations
Extracted from routes_main.py for better code organization
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import ParcelaCreate
from database import parcelas_collection, serialize_doc, serialize_docs
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireParcelasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["parcelas"])


@router.post("/parcelas", response_model=dict)
async def create_parcela(
    parcela: ParcelaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireParcelasAccess)
):
    parcela_dict = parcela.dict()
    parcela_dict.update({
        "activo": True,
        "unidad_medida": "ha",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await parcelas_collection.insert_one(parcela_dict)
    created = await parcelas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/parcelas")
async def get_parcelas(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    proveedor: Optional[str] = None,
    contrato_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireParcelasAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    if proveedor:
        query["proveedor"] = {"$regex": proveedor, "$options": "i"}
    if contrato_id:
        query["contrato_id"] = contrato_id
    
    parcelas = await parcelas_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"parcelas": serialize_docs(parcelas), "total": await parcelas_collection.count_documents(query)}


@router.get("/parcelas/{parcela_id}")
async def get_parcela(
    parcela_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    return serialize_doc(parcela)


@router.put("/parcelas/{parcela_id}")
async def update_parcela(
    parcela_id: str,
    parcela: ParcelaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = parcela.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await parcelas_collection.update_one(
        {"_id": ObjectId(parcela_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    updated = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/parcelas/{parcela_id}")
async def delete_parcela(
    parcela_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await parcelas_collection.delete_one({"_id": ObjectId(parcela_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    return {"success": True, "message": "Parcela deleted"}
