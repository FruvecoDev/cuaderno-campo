"""
Routes for Fincas (Farms) - CRUD operations
Extracted from routes_main.py for better code organization
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import FincaCreate
from database import fincas_collection, serialize_doc, serialize_docs
from rbac_guards import (
    RequireCreate, RequireDelete,
    RequireFincasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["fincas"])


@router.post("/fincas", response_model=dict)
async def create_finca(
    finca: FincaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireFincasAccess)
):
    finca_dict = finca.dict()
    finca_dict.update({
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await fincas_collection.insert_one(finca_dict)
    created = await fincas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/fincas")
async def get_fincas(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    
    fincas = await fincas_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"fincas": serialize_docs(fincas), "total": await fincas_collection.count_documents(query)}


@router.get("/fincas/{finca_id}")
async def get_finca(
    finca_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    finca = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca not found")
    
    return serialize_doc(finca)


@router.delete("/fincas/{finca_id}")
async def delete_finca(
    finca_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireFincasAccess)
):
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await fincas_collection.delete_one({"_id": ObjectId(finca_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Finca not found")
    
    return {"success": True, "message": "Finca deleted"}
