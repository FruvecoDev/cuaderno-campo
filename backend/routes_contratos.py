"""
Routes for Contratos (Contracts) - CRUD operations
Extracted from routes_main.py for better code organization
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import ContratoCreate
from database import contratos_collection, serialize_doc, serialize_docs, db
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireContratosAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["contratos"])

# Collections for lookups
proveedores_collection = db['proveedores']
clientes_collection = db['clientes']
cultivos_collection = db['cultivos']


@router.post("/contratos", response_model=dict)
async def create_contrato(
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireContratosAccess)
):
    # Get next number
    last_contrato = await contratos_collection.find_one(sort=[("numero", -1)])
    next_numero = (last_contrato.get("numero", 0) if last_contrato else 0) + 1
    
    # Lookup proveedor name (para contratos de Compra)
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cliente name (para contratos de Venta)
    cliente_name = ""
    cliente_id_str = getattr(contrato, 'cliente_id', None) or ""
    if cliente_id_str:
        cli = await clientes_collection.find_one({"_id": ObjectId(cliente_id_str)})
        if cli:
            cliente_name = cli.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    cultivo_id_str = contrato.cultivo_id or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    contrato_dict = contrato.dict()
    contrato_dict.update({
        "serie": "MP",
        "año": datetime.now().year,
        "numero": next_numero,
        "proveedor": proveedor_name,
        "cliente": cliente_name,
        "cliente_id": cliente_id_str,
        "cultivo": cultivo_name,
        "cultivo_id": cultivo_id_str,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.insert_one(contrato_dict)
    created = await contratos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/contratos")
async def get_contratos(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    proveedor: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    if proveedor:
        query["proveedor"] = {"$regex": proveedor, "$options": "i"}
    
    contratos = await contratos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"contratos": serialize_docs(contratos), "total": await contratos_collection.count_documents(query)}


@router.get("/contratos/{contrato_id}")
async def get_contrato(
    contrato_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    return serialize_doc(contrato)


@router.put("/contratos/{contrato_id}")
async def update_contrato(
    contrato_id: str,
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Lookup proveedor name (para contratos de Compra)
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cliente name (para contratos de Venta)
    cliente_name = ""
    cliente_id_str = getattr(contrato, 'cliente_id', None) or ""
    if cliente_id_str:
        cli = await clientes_collection.find_one({"_id": ObjectId(cliente_id_str)})
        if cli:
            cliente_name = cli.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    update_data = contrato.dict()
    update_data.update({
        "proveedor": proveedor_name,
        "cliente": cliente_name,
        "cliente_id": cliente_id_str,
        "cultivo": cultivo_name,
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.update_one(
        {"_id": ObjectId(contrato_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    updated = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/contratos/{contrato_id}")
async def delete_contrato(
    contrato_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await contratos_collection.delete_one({"_id": ObjectId(contrato_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    return {"success": True, "message": "Contrato deleted"}
