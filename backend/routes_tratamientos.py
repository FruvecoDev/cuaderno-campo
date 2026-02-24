"""
Routes for Tratamientos (Treatments) - CRUD and reporting operations
Extracted from routes_extended.py for better code organization
Uses simplified model: parcelas_ids required, rest inherited
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models_tratamientos import TratamientoCreate
from database import (
    tratamientos_collection, contratos_collection, 
    serialize_doc, serialize_docs, db
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireTratamientosAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["tratamientos"])

# Additional collections
parcelas_collection = db['parcelas']
maquinaria_collection = db['maquinaria']


@router.post("/tratamientos", response_model=dict)
async def create_tratamiento(
    tratamiento: TratamientoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireTratamientosAccess)
):
    # MODELO SIMPLIFICADO: parcelas_ids obligatorio, el resto se hereda
    if not tratamiento.parcelas_ids or len(tratamiento.parcelas_ids) == 0:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos una parcela")
    
    # Validar todas las parcelas existen y obtener datos de la primera
    first_parcela = None
    for parcela_id in tratamiento.parcelas_ids:
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail=f"parcela_id inválido: {parcela_id}")
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
        if not parcela:
            raise HTTPException(status_code=400, detail=f"Parcela no encontrada: {parcela_id}")
        if first_parcela is None:
            first_parcela = parcela
    
    # Heredar datos desde la primera parcela
    contrato_id = first_parcela.get("contrato_id", "")
    cultivo = first_parcela.get("cultivo", "")
    campana = first_parcela.get("campana", "")
    cultivo_id = ""
    
    # Si hay contrato, obtener cultivo_id
    if contrato_id:
        contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
        if contrato:
            cultivo_id = contrato.get("cultivo_id", "")
            if not campana:
                campana = contrato.get("campana", "")
    
    # Obtener nombre de máquina si se proporciona maquina_id
    maquina_nombre = None
    if tratamiento.maquina_id and ObjectId.is_valid(tratamiento.maquina_id):
        maquina = await maquinaria_collection.find_one({"_id": ObjectId(tratamiento.maquina_id)})
        if maquina:
            maquina_nombre = maquina.get("nombre", "")
    
    # Fecha tratamiento: si no se proporciona, usar fecha actual
    fecha_tratamiento = tratamiento.fecha_tratamiento
    if not fecha_tratamiento:
        fecha_tratamiento = datetime.now().strftime("%Y-%m-%d")
    
    tratamiento_dict = tratamiento.dict()
    tratamiento_dict.update({
        "contrato_id": contrato_id,
        "cultivo_id": cultivo_id,
        "campana": campana,
        "maquina_nombre": maquina_nombre,
        "fecha_tratamiento": fecha_tratamiento,
        "realizado": False,
        "planificado": False,
        "coste_superficie": 0.0,
        "coste_total": 0.0,
        "productos": [],
        "cuestionarios": [],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await tratamientos_collection.insert_one(tratamiento_dict)
    created = await tratamientos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/tratamientos")
async def get_tratamientos(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    campana: Optional[str] = None,
    cultivo_id: Optional[str] = None,
    contrato_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTratamientosAccess)
):
    query = {}
    if parcela_id:
        query["parcelas_ids"] = parcela_id
    if campana:
        query["campana"] = campana
    if cultivo_id:
        query["cultivo_id"] = cultivo_id
    if contrato_id:
        query["contrato_id"] = contrato_id
    
    tratamientos = await tratamientos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"tratamientos": serialize_docs(tratamientos), "total": await tratamientos_collection.count_documents(query)}


@router.get("/tratamientos/{tratamiento_id}")
async def get_tratamiento(
    tratamiento_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTratamientosAccess)
):
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    tratamiento = await tratamientos_collection.find_one({"_id": ObjectId(tratamiento_id)})
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento not found")
    
    return serialize_doc(tratamiento)


@router.put("/tratamientos/{tratamiento_id}")
async def update_tratamiento(
    tratamiento_id: str,
    tratamiento: TratamientoCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireTratamientosAccess)
):
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Obtener nombre de máquina si se proporciona maquina_id
    maquina_nombre = None
    if tratamiento.maquina_id and ObjectId.is_valid(tratamiento.maquina_id):
        maquina = await maquinaria_collection.find_one({"_id": ObjectId(tratamiento.maquina_id)})
        if maquina:
            maquina_nombre = maquina.get("nombre", "")
    
    update_data = tratamiento.dict()
    update_data["maquina_nombre"] = maquina_nombre
    update_data["updated_at"] = datetime.now()
    
    result = await tratamientos_collection.update_one(
        {"_id": ObjectId(tratamiento_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tratamiento not found")
    
    updated = await tratamientos_collection.find_one({"_id": ObjectId(tratamiento_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/tratamientos/{tratamiento_id}")
async def delete_tratamiento(
    tratamiento_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireTratamientosAccess)
):
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await tratamientos_collection.delete_one({"_id": ObjectId(tratamiento_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tratamiento not found")
    
    return {"success": True, "message": "Tratamiento deleted"}


@router.get("/tratamientos/parcela/{parcela_id}/historial")
async def get_historial_tratamientos_parcela(
    parcela_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTratamientosAccess)
):
    """
    Obtiene el historial completo de tratamientos fitosanitarios de una parcela.
    Útil para el cumplimiento normativo del cuaderno de campo.
    """
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="ID de parcela inválido")
    
    # Get all treatments that include this parcela
    tratamientos = await tratamientos_collection.find({
        "parcelas_ids": parcela_id
    }).sort("fecha_tratamiento", -1).to_list(length=500)
    
    # Enrich with additional data
    historial = []
    for t in tratamientos:
        registro = {
            "_id": str(t["_id"]),
            "fecha_tratamiento": t.get("fecha_tratamiento"),
            "fecha_aplicacion": t.get("fecha_aplicacion"),
            "tipo_tratamiento": t.get("tipo_tratamiento"),
            "subtipo": t.get("subtipo"),
            "metodo_aplicacion": t.get("metodo_aplicacion"),
            "superficie_aplicacion": t.get("superficie_aplicacion"),
            "caldo_superficie": t.get("caldo_superficie"),
            "aplicador_nombre": t.get("aplicador_nombre"),
            # Producto fitosanitario
            "producto_fitosanitario_id": t.get("producto_fitosanitario_id"),
            "producto_fitosanitario_nombre": t.get("producto_fitosanitario_nombre"),
            "producto_fitosanitario_dosis": t.get("producto_fitosanitario_dosis"),
            "producto_fitosanitario_unidad": t.get("producto_fitosanitario_unidad"),
            # Datos heredados
            "proveedor": t.get("proveedor"),
            "cultivo": t.get("cultivo"),
            "campana": t.get("campana")
        }
        historial.append(registro)
    
    # Calculate statistics
    total_tratamientos = len(historial)
    productos_usados = list(set([h["producto_fitosanitario_nombre"] for h in historial if h.get("producto_fitosanitario_nombre")]))
    tipos_aplicados = list(set([h["subtipo"] for h in historial if h.get("subtipo")]))
    
    return {
        "success": True,
        "parcela_id": parcela_id,
        "historial": historial,
        "estadisticas": {
            "total_tratamientos": total_tratamientos,
            "productos_usados": productos_usados,
            "tipos_aplicados": tipos_aplicados
        }
    }


@router.get("/tratamientos/resumen-campana/{campana}")
async def get_resumen_tratamientos_campana(
    campana: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTratamientosAccess)
):
    """
    Resumen de todos los tratamientos de una campaña.
    Útil para generar informes del cuaderno de campo.
    """
    tratamientos = await tratamientos_collection.find({
        "campana": campana
    }).sort("fecha_tratamiento", -1).to_list(length=1000)
    
    # Group by product
    productos_resumen = {}
    for t in tratamientos:
        producto = t.get("producto_fitosanitario_nombre") or "Sin producto registrado"
        if producto not in productos_resumen:
            productos_resumen[producto] = {
                "nombre": producto,
                "aplicaciones": 0,
                "superficie_total": 0,
                "fechas": []
            }
        productos_resumen[producto]["aplicaciones"] += 1
        productos_resumen[producto]["superficie_total"] += t.get("superficie_aplicacion", 0)
        if t.get("fecha_tratamiento"):
            productos_resumen[producto]["fechas"].append(t.get("fecha_tratamiento"))
    
    return {
        "success": True,
        "campana": campana,
        "total_tratamientos": len(tratamientos),
        "productos": list(productos_resumen.values()),
        "tratamientos": [serialize_doc(t) for t in tratamientos]
    }
