"""
Routes for Visitas (Visits) - CRUD operations
Extracted from routes_main.py for better code organization
Uses simplified model: only parcela_id required, rest inherited
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime, timedelta

from models import VisitaCreate
from database import (
    visitas_collection, parcelas_collection, contratos_collection,
    serialize_doc, serialize_docs
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireVisitasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["visitas"])


@router.post("/visitas", response_model=dict)
async def create_visita(
    visita: VisitaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireVisitasAccess)
):
    # MODELO SIMPLIFICADO: parcela_id es obligatorio, el resto se hereda
    if not visita.parcela_id:
        raise HTTPException(status_code=400, detail="parcela_id es obligatorio")
    
    if not ObjectId.is_valid(visita.parcela_id):
        raise HTTPException(status_code=400, detail="parcela_id inválido")
    
    # Obtener la parcela para heredar datos
    parcela = await parcelas_collection.find_one({"_id": ObjectId(visita.parcela_id)})
    if not parcela:
        raise HTTPException(status_code=400, detail="Parcela no encontrada")
    
    # Heredar datos desde la parcela
    contrato_id = parcela.get("contrato_id", "")
    proveedor = parcela.get("proveedor", "")
    cultivo = parcela.get("cultivo", "")
    campana = parcela.get("campana", "")
    variedad = parcela.get("variedad", "")
    codigo_plantacion = parcela.get("codigo_plantacion", "")
    finca = parcela.get("finca", "")
    
    # Si la parcela tiene contrato_id, buscar cultivo_id desde el contrato
    cultivo_id = ""
    if contrato_id:
        contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
        if contrato:
            cultivo_id = contrato.get("cultivo_id", "")
            # Actualizar datos heredados si el contrato tiene más información
            if not proveedor:
                proveedor = contrato.get("proveedor", "")
            if not cultivo:
                cultivo = contrato.get("cultivo", "")
            if not campana:
                campana = contrato.get("campana", "")
    
    visita_dict = {
        "objetivo": visita.objetivo,
        "parcela_id": visita.parcela_id,
        "contrato_id": contrato_id,
        "cultivo_id": cultivo_id,
        "proveedor": proveedor,
        "cultivo": cultivo,
        "campana": campana,
        "variedad": variedad,
        "codigo_plantacion": codigo_plantacion,
        "finca": finca,
        "fecha_visita": visita.fecha_visita or "",
        "fecha_planificada": visita.fecha_planificada or "",
        "observaciones": visita.observaciones or "",
        "realizado": False,
        "planificado": bool(visita.fecha_planificada),
        "documentos": [],
        "formularios": [],
        "cuestionario_plagas": visita.cuestionario_plagas if visita.objetivo == "Plagas y Enfermedades" else None,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await visitas_collection.insert_one(visita_dict)
    created = await visitas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/visitas")
async def get_visitas(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireVisitasAccess)
):
    query = {}
    if parcela_id:
        query["parcela_id"] = parcela_id
    if campana:
        query["campana"] = campana
    
    visitas = await visitas_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"visitas": serialize_docs(visitas), "total": await visitas_collection.count_documents(query)}


@router.get("/visitas/planificadas")
async def get_visitas_planificadas(
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireVisitasAccess)
):
    """Obtener visitas planificadas (con fecha_planificada futura o reciente)"""
    # Buscar visitas con fecha_planificada en los próximos 30 días o los últimos 7 días
    hoy = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    hace_7_dias = hoy - timedelta(days=7)
    en_30_dias = hoy + timedelta(days=30)
    
    query = {
        "$or": [
            {"fecha_planificada": {"$gte": hace_7_dias.isoformat(), "$lte": en_30_dias.isoformat()}},
            {"planificado": True, "realizado": False}
        ]
    }
    
    visitas = await visitas_collection.find(query).sort("fecha_planificada", 1).to_list(50)
    
    # Filtrar las que tienen fecha_planificada válida
    visitas_filtradas = []
    for v in visitas:
        if v.get("fecha_planificada"):
            v["parcela"] = v.get("codigo_plantacion", "")
            visitas_filtradas.append(v)
    
    return {"visitas": serialize_docs(visitas_filtradas)}


@router.get("/visitas/{visita_id}")
async def get_visita(
    visita_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireVisitasAccess)
):
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    return serialize_doc(visita)


@router.put("/visitas/{visita_id}")
async def update_visita(
    visita_id: str,
    visita: VisitaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireVisitasAccess)
):
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # MODELO SIMPLIFICADO: si cambia la parcela, re-heredar datos
    update_data = {"updated_at": datetime.now()}
    
    if visita.parcela_id:
        if not ObjectId.is_valid(visita.parcela_id):
            raise HTTPException(status_code=400, detail="parcela_id inválido")
        
        parcela = await parcelas_collection.find_one({"_id": ObjectId(visita.parcela_id)})
        if not parcela:
            raise HTTPException(status_code=400, detail="Parcela no encontrada")
        
        # Heredar datos desde la parcela
        contrato_id = parcela.get("contrato_id", "")
        cultivo_id = ""
        if contrato_id:
            contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
            if contrato:
                cultivo_id = contrato.get("cultivo_id", "")
        
        update_data.update({
            "parcela_id": visita.parcela_id,
            "contrato_id": contrato_id,
            "cultivo_id": cultivo_id,
            "proveedor": parcela.get("proveedor", ""),
            "cultivo": parcela.get("cultivo", ""),
            "campana": parcela.get("campana", ""),
            "variedad": parcela.get("variedad", ""),
            "codigo_plantacion": parcela.get("codigo_plantacion", ""),
            "finca": parcela.get("finca", "")
        })
    
    # Actualizar campos editables por el usuario
    update_data["objetivo"] = visita.objetivo
    if visita.fecha_visita:
        update_data["fecha_visita"] = visita.fecha_visita
    if visita.observaciones is not None:
        update_data["observaciones"] = visita.observaciones
    
    # Actualizar cuestionario de plagas si el objetivo es "Plagas y Enfermedades"
    if visita.objetivo == "Plagas y Enfermedades" and visita.cuestionario_plagas:
        update_data["cuestionario_plagas"] = visita.cuestionario_plagas
    elif visita.objetivo != "Plagas y Enfermedades":
        # Si el objetivo cambió, eliminar el cuestionario
        update_data["cuestionario_plagas"] = None
    
    result = await visitas_collection.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    updated = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/visitas/{visita_id}")
async def delete_visita(
    visita_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireVisitasAccess)
):
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await visitas_collection.delete_one({"_id": ObjectId(visita_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    return {"success": True, "message": "Visita deleted"}
