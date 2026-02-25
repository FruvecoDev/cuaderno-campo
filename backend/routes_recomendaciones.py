"""
Routes for Recomendaciones - Technical recommendations for parcels/contracts
Only Technicians and Managers can create recommendations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/recomendaciones", tags=["recomendaciones"])

# Collections
recomendaciones_collection = db['recomendaciones']
tratamientos_collection = db['tratamientos']
parcelas_collection = db['parcelas']
contratos_collection = db['contratos']
fitosanitarios_collection = db['fitosanitarios']

# Types
TIPOS_RECOMENDACION = [
    'Tratamiento Fitosanitario',
    'Fertilización',
    'Riego',
    'Poda',
    'Otro'
]

SUBTIPOS_TRATAMIENTO = [
    'Herbicida',
    'Insecticida',
    'Fungicida',
    'Acaricida',
    'Nematicida',
    'Molusquicida',
    'Fertilizante',
    'Regulador',
    'Otro'
]

PRIORIDADES = ['Alta', 'Media', 'Baja']

ESTADOS = ['Pendiente', 'Programada', 'Aplicada', 'Cancelada']


# Models
class RecomendacionBase(BaseModel):
    parcela_id: str
    contrato_id: Optional[str] = None
    campana: str
    cultivo: Optional[str] = None
    variedad: Optional[str] = None
    tipo: str  # Tratamiento Fitosanitario, Fertilización, Riego, Poda, Otro
    subtipo: Optional[str] = None  # For Tratamiento: Herbicida, Insecticida, etc.
    producto_id: Optional[str] = None  # Reference to fitosanitarios
    producto_nombre: Optional[str] = None
    dosis: Optional[float] = None
    unidad_dosis: str = "L/ha"
    fecha_programada: Optional[str] = None
    prioridad: str = "Media"
    observaciones: Optional[str] = None
    motivo: Optional[str] = None  # Reason for the recommendation
    # Calculator fields
    volumen_agua: Optional[float] = None
    superficie_tratada: Optional[float] = None
    cantidad_total_producto: Optional[float] = None
    volumen_total_agua: Optional[float] = None
    tiene_alertas: Optional[bool] = False
    alertas_bloqueantes: Optional[bool] = False


class RecomendacionCreate(RecomendacionBase):
    pass


class RecomendacionUpdate(BaseModel):
    tipo: Optional[str] = None
    subtipo: Optional[str] = None
    cultivo: Optional[str] = None
    variedad: Optional[str] = None
    producto_id: Optional[str] = None
    producto_nombre: Optional[str] = None
    dosis: Optional[float] = None
    unidad_dosis: Optional[str] = None
    fecha_programada: Optional[str] = None
    prioridad: Optional[str] = None
    observaciones: Optional[str] = None
    motivo: Optional[str] = None
    estado: Optional[str] = None


def serialize_recomendacion(rec: dict) -> dict:
    """Convert ObjectId to string for JSON serialization"""
    if rec:
        rec["_id"] = str(rec["_id"])
        if rec.get("parcela_id"):
            rec["parcela_id"] = str(rec["parcela_id"])
        if rec.get("contrato_id"):
            rec["contrato_id"] = str(rec["contrato_id"])
        if rec.get("producto_id"):
            rec["producto_id"] = str(rec["producto_id"])
        if rec.get("tratamiento_generado_id"):
            rec["tratamiento_generado_id"] = str(rec["tratamiento_generado_id"])
    return rec


def can_manage_recomendaciones(user: dict) -> bool:
    """Check if user can create/edit recommendations"""
    return user.get("role") in ["Admin", "Manager", "Technician"]


# GET all recommendations
@router.get("")
async def get_recomendaciones(
    parcela_id: Optional[str] = None,
    contrato_id: Optional[str] = None,
    campana: Optional[str] = None,
    tipo: Optional[str] = None,
    prioridad: Optional[str] = None,
    estado: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all recommendations with optional filters"""
    query = {}
    
    if parcela_id:
        query["parcela_id"] = parcela_id
    if contrato_id:
        query["contrato_id"] = contrato_id
    if campana:
        query["campana"] = campana
    if tipo:
        query["tipo"] = tipo
    if prioridad:
        query["prioridad"] = prioridad
    if estado:
        query["estado"] = estado
    if fecha_desde:
        query["fecha_programada"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha_programada" in query:
            query["fecha_programada"]["$lte"] = fecha_hasta
        else:
            query["fecha_programada"] = {"$lte": fecha_hasta}
    
    recomendaciones = await recomendaciones_collection.find(query).sort("fecha_programada", 1).to_list(1000)
    
    # Enrich with parcela and contrato info
    for rec in recomendaciones:
        rec = serialize_recomendacion(rec)
        
        # Get parcela info
        if rec.get("parcela_id"):
            try:
                parcela = await parcelas_collection.find_one({"_id": ObjectId(rec["parcela_id"])})
                if parcela:
                    rec["parcela_codigo"] = parcela.get("codigo_plantacion", "")
                    rec["parcela_cultivo"] = parcela.get("cultivo", "")
                    rec["parcela_proveedor"] = parcela.get("proveedor", "")
            except:
                pass
    
    return {
        "recomendaciones": recomendaciones,
        "total": len(recomendaciones)
    }


# GET single recommendation
@router.get("/{recomendacion_id}")
async def get_recomendacion(
    recomendacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single recommendation by ID"""
    try:
        rec = await recomendaciones_collection.find_one({"_id": ObjectId(recomendacion_id)})
        if not rec:
            raise HTTPException(status_code=404, detail="Recomendación no encontrada")
        return serialize_recomendacion(rec)
    except HTTPException:
        raise
    except Exception as e:
        if "ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="ID inválido")
        raise HTTPException(status_code=500, detail=str(e))


# CREATE recommendation
@router.post("")
async def create_recomendacion(
    data: RecomendacionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new recommendation (Technicians and Managers only)"""
    if not can_manage_recomendaciones(current_user):
        raise HTTPException(status_code=403, detail="Solo técnicos y managers pueden crear recomendaciones")
    
    # Validate parcela exists
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(data.parcela_id)})
        if not parcela:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")
    except:
        raise HTTPException(status_code=400, detail="ID de parcela inválido")
    
    # Get product info if provided
    producto_nombre = data.producto_nombre
    if data.producto_id and not producto_nombre:
        try:
            producto = await fitosanitarios_collection.find_one({"_id": ObjectId(data.producto_id)})
            if producto:
                producto_nombre = producto.get("nombre_comercial", "")
        except:
            pass
    
    recomendacion = {
        "parcela_id": data.parcela_id,
        "contrato_id": data.contrato_id,
        "campana": data.campana,
        "tipo": data.tipo,
        "subtipo": data.subtipo,
        "producto_id": data.producto_id,
        "producto_nombre": producto_nombre,
        "dosis": data.dosis,
        "unidad_dosis": data.unidad_dosis,
        "fecha_programada": data.fecha_programada,
        "prioridad": data.prioridad,
        "observaciones": data.observaciones,
        "motivo": data.motivo,
        "estado": "Pendiente",
        "creado_por": current_user.get("username", ""),
        "creado_por_id": str(current_user.get("_id", "")),
        "created_at": datetime.utcnow(),
        "tratamiento_generado": False,
        "tratamiento_generado_id": None
    }
    
    result = await recomendaciones_collection.insert_one(recomendacion)
    recomendacion["_id"] = str(result.inserted_id)
    
    return {
        "success": True,
        "message": "Recomendación creada correctamente",
        "recomendacion": serialize_recomendacion(recomendacion)
    }


# UPDATE recommendation
@router.put("/{recomendacion_id}")
async def update_recomendacion(
    recomendacion_id: str,
    data: RecomendacionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a recommendation"""
    if not can_manage_recomendaciones(current_user):
        raise HTTPException(status_code=403, detail="Solo técnicos y managers pueden editar recomendaciones")
    
    try:
        existing = await recomendaciones_collection.find_one({"_id": ObjectId(recomendacion_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Recomendación no encontrada")
        
        # Can't edit if already converted to treatment
        if existing.get("tratamiento_generado"):
            raise HTTPException(status_code=400, detail="No se puede editar una recomendación que ya generó un tratamiento")
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user.get("username", "")
        
        await recomendaciones_collection.update_one(
            {"_id": ObjectId(recomendacion_id)},
            {"$set": update_data}
        )
        
        updated = await recomendaciones_collection.find_one({"_id": ObjectId(recomendacion_id)})
        
        return {
            "success": True,
            "message": "Recomendación actualizada",
            "recomendacion": serialize_recomendacion(updated)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# DELETE recommendation
@router.delete("/{recomendacion_id}")
async def delete_recomendacion(
    recomendacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a recommendation"""
    if not can_manage_recomendaciones(current_user):
        raise HTTPException(status_code=403, detail="Solo técnicos y managers pueden eliminar recomendaciones")
    
    try:
        existing = await recomendaciones_collection.find_one({"_id": ObjectId(recomendacion_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Recomendación no encontrada")
        
        await recomendaciones_collection.delete_one({"_id": ObjectId(recomendacion_id)})
        
        return {
            "success": True,
            "message": "Recomendación eliminada"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GENERATE TREATMENT from recommendation
@router.post("/{recomendacion_id}/generar-tratamiento")
async def generar_tratamiento(
    recomendacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate a treatment from a recommendation"""
    if not can_manage_recomendaciones(current_user):
        raise HTTPException(status_code=403, detail="Solo técnicos y managers pueden generar tratamientos")
    
    try:
        rec = await recomendaciones_collection.find_one({"_id": ObjectId(recomendacion_id)})
        if not rec:
            raise HTTPException(status_code=404, detail="Recomendación no encontrada")
        
        if rec.get("tratamiento_generado"):
            raise HTTPException(status_code=400, detail="Esta recomendación ya generó un tratamiento")
        
        # Get parcela info
        parcela = await parcelas_collection.find_one({"_id": ObjectId(rec["parcela_id"])})
        if not parcela:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")
        
        # Create treatment based on recommendation
        tratamiento = {
            "parcela_id": rec["parcela_id"],
            "parcela_codigo": parcela.get("codigo_plantacion", ""),
            "contrato_id": rec.get("contrato_id"),
            "campana": rec.get("campana"),
            "tipo_tratamiento": rec.get("tipo", "Tratamiento Fitosanitario"),
            "subtipo": rec.get("subtipo"),
            "producto_fitosanitario_id": rec.get("producto_id"),
            "producto_fitosanitario_nombre": rec.get("producto_nombre"),
            "producto_fitosanitario_dosis": rec.get("dosis"),
            "producto_fitosanitario_unidad": rec.get("unidad_dosis", "L/ha"),
            "fecha_tratamiento": rec.get("fecha_programada") or datetime.utcnow().strftime("%Y-%m-%d"),
            "estado": "Programado",
            "observaciones": rec.get("observaciones", ""),
            "motivo": rec.get("motivo", ""),
            "recomendacion_id": str(rec["_id"]),
            "generado_desde_recomendacion": True,
            "creado_por": current_user.get("username", ""),
            "created_at": datetime.utcnow()
        }
        
        # Insert treatment
        result = await tratamientos_collection.insert_one(tratamiento)
        tratamiento_id = str(result.inserted_id)
        
        # Update recommendation
        await recomendaciones_collection.update_one(
            {"_id": ObjectId(recomendacion_id)},
            {"$set": {
                "tratamiento_generado": True,
                "tratamiento_generado_id": tratamiento_id,
                "estado": "Aplicada",
                "fecha_generacion_tratamiento": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {
            "success": True,
            "message": "Tratamiento generado correctamente",
            "tratamiento_id": tratamiento_id,
            "recomendacion_id": recomendacion_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GET statistics
@router.get("/stats/resumen")
async def get_estadisticas(
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get recommendation statistics"""
    query = {}
    if campana:
        query["campana"] = campana
    
    total = await recomendaciones_collection.count_documents(query)
    
    pendientes = await recomendaciones_collection.count_documents({**query, "estado": "Pendiente"})
    programadas = await recomendaciones_collection.count_documents({**query, "estado": "Programada"})
    aplicadas = await recomendaciones_collection.count_documents({**query, "tratamiento_generado": True})
    
    # By priority
    alta = await recomendaciones_collection.count_documents({**query, "prioridad": "Alta", "estado": {"$ne": "Aplicada"}})
    media = await recomendaciones_collection.count_documents({**query, "prioridad": "Media", "estado": {"$ne": "Aplicada"}})
    baja = await recomendaciones_collection.count_documents({**query, "prioridad": "Baja", "estado": {"$ne": "Aplicada"}})
    
    # By type
    por_tipo = {}
    for tipo in TIPOS_RECOMENDACION:
        por_tipo[tipo] = await recomendaciones_collection.count_documents({**query, "tipo": tipo})
    
    return {
        "total": total,
        "pendientes": pendientes,
        "programadas": programadas,
        "aplicadas": aplicadas,
        "por_prioridad": {
            "alta": alta,
            "media": media,
            "baja": baja
        },
        "por_tipo": por_tipo
    }


# GET types and subtypes
@router.get("/config/tipos")
async def get_tipos():
    """Get available types and subtypes for recommendations"""
    return {
        "tipos": TIPOS_RECOMENDACION,
        "subtipos_tratamiento": SUBTIPOS_TRATAMIENTO,
        "prioridades": PRIORIDADES,
        "estados": ESTADOS
    }
