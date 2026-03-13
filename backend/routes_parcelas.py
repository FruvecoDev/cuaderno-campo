"""
Routes for Parcelas (Parcels) - CRUD operations
Extracted from routes_main.py for better code organization
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime
import re

from models import ParcelaCreate, ParcelaUpdate
from database import parcelas_collection, serialize_doc, serialize_docs
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireParcelasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["parcelas"])

# Regex para validar formato del código de plantación: XXX-XXX-NN-NNN (con variantes)
# Ejemplos válidos: AZE-BON-25-001, AGR-BRO-25-002, AZE-BON-25-001-1234 (con timestamp)
CODIGO_PLANTACION_REGEX = re.compile(r'^[A-Z]{2,4}-[A-Z]{2,4}-\d{2}-\d{3}(-\d+)?$')

def validar_codigo_plantacion(codigo: str) -> bool:
    """Valida el formato del código de plantación."""
    if not codigo:
        return True  # Permitir vacío
    return bool(CODIGO_PLANTACION_REGEX.match(codigo))


@router.post("/parcelas", response_model=dict)
async def create_parcela(
    parcela: ParcelaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireParcelasAccess)
):
    parcela_dict = parcela.dict()
    
    # Validar formato del código de plantación
    codigo = parcela_dict.get("codigo_plantacion")
    if codigo and not validar_codigo_plantacion(codigo):
        raise HTTPException(
            status_code=400,
            detail=f"Formato de código inválido: '{codigo}'. Formato esperado: XXX-XXX-NN-NNN (ej: AZE-BON-25-001)"
        )
    
    # Validar que el código de plantación sea único
    if codigo:
        existing = await parcelas_collection.find_one({
            "codigo_plantacion": codigo
        })
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"El código de plantación '{codigo}' ya existe. Debe ser único."
            )
    
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
    parcela: ParcelaUpdate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Only include fields that were actually provided
    update_data = {k: v for k, v in parcela.dict().items() if v is not None}
    
    # Validar formato del código de plantación si se intenta modificar
    codigo = update_data.get("codigo_plantacion")
    if codigo and not validar_codigo_plantacion(codigo):
        raise HTTPException(
            status_code=400,
            detail=f"Formato de código inválido: '{codigo}'. Formato esperado: XXX-XXX-NN-NNN (ej: AZE-BON-25-001)"
        )
    
    # Validar que el código de plantación siga siendo único si se intenta modificar
    if codigo:
        existing = await parcelas_collection.find_one({
            "codigo_plantacion": codigo,
            "_id": {"$ne": ObjectId(parcela_id)}  # Excluir la parcela actual
        })
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"El código de plantación '{codigo}' ya existe en otra parcela."
            )
    
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
