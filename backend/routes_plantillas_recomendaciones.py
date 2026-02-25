"""
Routes for Plantillas de Recomendaciones - Predefined recommendation templates
Allows quick creation of recommendations using templates
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/plantillas-recomendaciones", tags=["plantillas-recomendaciones"])

# Collections
plantillas_collection = db['plantillas_recomendaciones']
recomendaciones_collection = db['recomendaciones']
parcelas_collection = db['parcelas']
fitosanitarios_collection = db['fitosanitarios']


# Models
class PlantillaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo: str  # Tratamiento Fitosanitario, Fertilización, Riego, Poda, Otro
    subtipo: Optional[str] = None
    producto_id: Optional[str] = None
    producto_nombre: Optional[str] = None
    dosis: Optional[float] = None
    unidad_dosis: str = "L/ha"
    volumen_agua: Optional[float] = None
    prioridad: str = "Media"
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True


class PlantillaCreate(PlantillaBase):
    pass


class PlantillaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    subtipo: Optional[str] = None
    producto_id: Optional[str] = None
    producto_nombre: Optional[str] = None
    dosis: Optional[float] = None
    unidad_dosis: Optional[str] = None
    volumen_agua: Optional[float] = None
    prioridad: Optional[str] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None


class AplicacionMasiva(BaseModel):
    plantilla_id: str
    parcela_ids: List[str]
    campana: Optional[str] = None
    fecha_programada: Optional[str] = None
    prioridad_override: Optional[str] = None  # Override template priority


def serialize_plantilla(doc: dict) -> dict:
    """Convert ObjectId to string for JSON serialization"""
    if doc:
        doc["_id"] = str(doc["_id"])
        if doc.get("producto_id"):
            doc["producto_id"] = str(doc["producto_id"])
    return doc


def can_manage_plantillas(user: dict) -> bool:
    """Check if user can create/edit templates (Admin and Manager only)"""
    return user.get("role") in ["Admin", "Manager"]


# GET all templates
@router.get("")
async def get_plantillas(
    activo: Optional[bool] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all recommendation templates with optional filters"""
    query = {}
    
    if activo is not None:
        query["activo"] = activo
    if tipo:
        query["tipo"] = tipo
    if search:
        query["$or"] = [
            {"nombre": {"$regex": search, "$options": "i"}},
            {"descripcion": {"$regex": search, "$options": "i"}},
            {"producto_nombre": {"$regex": search, "$options": "i"}}
        ]
    
    plantillas = await plantillas_collection.find(query).sort("nombre", 1).to_list(500)
    
    return {
        "plantillas": [serialize_plantilla(p) for p in plantillas],
        "total": len(plantillas)
    }


# GET active templates for selector
@router.get("/activas")
async def get_plantillas_activas(
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get only active templates for quick selection"""
    query = {"activo": True}
    if tipo:
        query["tipo"] = tipo
    
    plantillas = await plantillas_collection.find(query).sort("nombre", 1).to_list(500)
    
    return {
        "plantillas": [serialize_plantilla(p) for p in plantillas]
    }


# GET single template
@router.get("/{plantilla_id}")
async def get_plantilla(
    plantilla_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single template by ID"""
    try:
        plantilla = await plantillas_collection.find_one({"_id": ObjectId(plantilla_id)})
        if not plantilla:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        return serialize_plantilla(plantilla)
    except HTTPException:
        raise
    except Exception as e:
        if "ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="ID inválido")
        raise HTTPException(status_code=500, detail=str(e))


# CREATE template
@router.post("")
async def create_plantilla(
    data: PlantillaCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new recommendation template (Admin/Manager only)"""
    if not can_manage_plantillas(current_user):
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden crear plantillas")
    
    # Check for duplicate name
    existing = await plantillas_collection.find_one({"nombre": data.nombre})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una plantilla con ese nombre")
    
    # Get product name if ID provided
    producto_nombre = data.producto_nombre
    if data.producto_id and not producto_nombre:
        try:
            producto = await fitosanitarios_collection.find_one({"_id": ObjectId(data.producto_id)})
            if producto:
                producto_nombre = producto.get("nombre_comercial", "")
        except:
            pass
    
    plantilla = {
        "nombre": data.nombre,
        "descripcion": data.descripcion,
        "tipo": data.tipo,
        "subtipo": data.subtipo,
        "producto_id": data.producto_id,
        "producto_nombre": producto_nombre,
        "dosis": data.dosis,
        "unidad_dosis": data.unidad_dosis,
        "volumen_agua": data.volumen_agua,
        "prioridad": data.prioridad,
        "motivo": data.motivo,
        "observaciones": data.observaciones,
        "activo": data.activo,
        "creado_por": current_user.get("username", ""),
        "created_at": datetime.utcnow(),
        "usos_count": 0  # Track how many times template has been used
    }
    
    result = await plantillas_collection.insert_one(plantilla)
    plantilla["_id"] = str(result.inserted_id)
    
    return {
        "success": True,
        "message": "Plantilla creada correctamente",
        "plantilla": serialize_plantilla(plantilla)
    }


# UPDATE template
@router.put("/{plantilla_id}")
async def update_plantilla(
    plantilla_id: str,
    data: PlantillaUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a template"""
    if not can_manage_plantillas(current_user):
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden editar plantillas")
    
    try:
        existing = await plantillas_collection.find_one({"_id": ObjectId(plantilla_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        
        # Check for duplicate name if changing
        if data.nombre and data.nombre != existing.get("nombre"):
            duplicate = await plantillas_collection.find_one({"nombre": data.nombre})
            if duplicate:
                raise HTTPException(status_code=400, detail="Ya existe una plantilla con ese nombre")
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user.get("username", "")
        
        await plantillas_collection.update_one(
            {"_id": ObjectId(plantilla_id)},
            {"$set": update_data}
        )
        
        updated = await plantillas_collection.find_one({"_id": ObjectId(plantilla_id)})
        
        return {
            "success": True,
            "message": "Plantilla actualizada",
            "plantilla": serialize_plantilla(updated)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# DELETE template
@router.delete("/{plantilla_id}")
async def delete_plantilla(
    plantilla_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a template"""
    if not can_manage_plantillas(current_user):
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden eliminar plantillas")
    
    try:
        existing = await plantillas_collection.find_one({"_id": ObjectId(plantilla_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        
        await plantillas_collection.delete_one({"_id": ObjectId(plantilla_id)})
        
        return {
            "success": True,
            "message": "Plantilla eliminada"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# TOGGLE active status
@router.patch("/{plantilla_id}/toggle-activo")
async def toggle_activo(
    plantilla_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Toggle template active status"""
    if not can_manage_plantillas(current_user):
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden modificar plantillas")
    
    try:
        existing = await plantillas_collection.find_one({"_id": ObjectId(plantilla_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        
        new_status = not existing.get("activo", True)
        
        await plantillas_collection.update_one(
            {"_id": ObjectId(plantilla_id)},
            {"$set": {"activo": new_status, "updated_at": datetime.utcnow()}}
        )
        
        return {
            "success": True,
            "message": f"Plantilla {'activada' if new_status else 'desactivada'}",
            "activo": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# APLICACIÓN MASIVA - Create recommendations for multiple parcelas
@router.post("/aplicar-masivo")
async def aplicar_masivo(
    data: AplicacionMasiva,
    current_user: dict = Depends(get_current_user)
):
    """Apply a template to multiple parcelas at once"""
    if current_user.get("role") not in ["Admin", "Manager", "Technician"]:
        raise HTTPException(status_code=403, detail="No tiene permisos para crear recomendaciones")
    
    # Get template
    try:
        plantilla = await plantillas_collection.find_one({"_id": ObjectId(data.plantilla_id)})
        if not plantilla:
            raise HTTPException(status_code=404, detail="Plantilla no encontrada")
        if not plantilla.get("activo", True):
            raise HTTPException(status_code=400, detail="La plantilla está desactivada")
    except HTTPException:
        raise
    except:
        raise HTTPException(status_code=400, detail="ID de plantilla inválido")
    
    if not data.parcela_ids or len(data.parcela_ids) == 0:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos una parcela")
    
    # Validate all parcelas exist
    parcelas_info = []
    for parcela_id in data.parcela_ids:
        try:
            parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
            if not parcela:
                raise HTTPException(status_code=404, detail=f"Parcela {parcela_id} no encontrada")
            parcelas_info.append(parcela)
        except HTTPException:
            raise
        except:
            raise HTTPException(status_code=400, detail=f"ID de parcela inválido: {parcela_id}")
    
    # Create recommendations for each parcela
    created_count = 0
    errors = []
    created_ids = []
    
    campana = data.campana or str(datetime.now().year)
    prioridad = data.prioridad_override or plantilla.get("prioridad", "Media")
    
    for parcela in parcelas_info:
        try:
            recomendacion = {
                "parcela_id": str(parcela["_id"]),
                "contrato_id": parcela.get("contrato_id"),
                "campana": campana,
                "cultivo": parcela.get("cultivo", ""),
                "variedad": parcela.get("variedad", ""),
                "tipo": plantilla.get("tipo"),
                "subtipo": plantilla.get("subtipo"),
                "producto_id": plantilla.get("producto_id"),
                "producto_nombre": plantilla.get("producto_nombre"),
                "dosis": plantilla.get("dosis"),
                "unidad_dosis": plantilla.get("unidad_dosis", "L/ha"),
                "fecha_programada": data.fecha_programada,
                "prioridad": prioridad,
                "observaciones": plantilla.get("observaciones"),
                "motivo": plantilla.get("motivo"),
                "volumen_agua": plantilla.get("volumen_agua"),
                "superficie_tratada": parcela.get("superficie_total"),
                "estado": "Pendiente",
                "creado_por": current_user.get("username", ""),
                "creado_por_id": str(current_user.get("_id", "")),
                "created_at": datetime.utcnow(),
                "plantilla_id": str(plantilla["_id"]),
                "plantilla_nombre": plantilla.get("nombre"),
                "creado_desde_plantilla": True,
                "tratamiento_generado": False
            }
            
            result = await recomendaciones_collection.insert_one(recomendacion)
            created_ids.append(str(result.inserted_id))
            created_count += 1
            
        except Exception as e:
            errors.append(f"Parcela {parcela.get('codigo_plantacion', parcela['_id'])}: {str(e)}")
    
    # Update template usage count
    await plantillas_collection.update_one(
        {"_id": ObjectId(data.plantilla_id)},
        {"$inc": {"usos_count": created_count}}
    )
    
    return {
        "success": True,
        "message": f"{created_count} recomendación(es) creada(s) correctamente",
        "created_count": created_count,
        "created_ids": created_ids,
        "errors": errors if errors else None,
        "plantilla_usada": plantilla.get("nombre")
    }


# GET template usage stats
@router.get("/stats/uso")
async def get_stats_uso(
    current_user: dict = Depends(get_current_user)
):
    """Get template usage statistics"""
    # Get all templates with usage count
    plantillas = await plantillas_collection.find().to_list(500)
    
    total = len(plantillas)
    activas = sum(1 for p in plantillas if p.get("activo", True))
    total_usos = sum(p.get("usos_count", 0) for p in plantillas)
    
    # Top 5 most used
    top_usadas = sorted(plantillas, key=lambda x: x.get("usos_count", 0), reverse=True)[:5]
    
    return {
        "total_plantillas": total,
        "activas": activas,
        "total_usos": total_usos,
        "top_usadas": [
            {
                "nombre": p.get("nombre"),
                "tipo": p.get("tipo"),
                "usos": p.get("usos_count", 0)
            }
            for p in top_usadas
        ]
    }


# SEED default templates
@router.post("/seed")
async def seed_plantillas(
    current_user: dict = Depends(get_current_user)
):
    """Seed default recommendation templates (Admin only)"""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede cargar plantillas predeterminadas")
    
    default_templates = [
        {
            "nombre": "Control preventivo de hongos",
            "descripcion": "Tratamiento preventivo para control de enfermedades fúngicas",
            "tipo": "Tratamiento Fitosanitario",
            "subtipo": "Fungicida",
            "dosis": 2.0,
            "unidad_dosis": "L/ha",
            "volumen_agua": 400,
            "prioridad": "Media",
            "motivo": "Prevención de enfermedades fúngicas por condiciones de humedad",
            "observaciones": "Aplicar en horas de menor temperatura. Respetar plazo de seguridad."
        },
        {
            "nombre": "Control de pulgón",
            "descripcion": "Tratamiento curativo para infestación de pulgón",
            "tipo": "Tratamiento Fitosanitario",
            "subtipo": "Insecticida",
            "dosis": 0.5,
            "unidad_dosis": "L/ha",
            "volumen_agua": 300,
            "prioridad": "Alta",
            "motivo": "Presencia de pulgón detectada en cultivo",
            "observaciones": "Aplicar al detectar primeras colonias. Repetir a los 7-10 días si persiste."
        },
        {
            "nombre": "Control de malas hierbas preemergencia",
            "descripcion": "Herbicida preemergente para control de adventicias",
            "tipo": "Tratamiento Fitosanitario",
            "subtipo": "Herbicida",
            "dosis": 3.0,
            "unidad_dosis": "L/ha",
            "volumen_agua": 200,
            "prioridad": "Media",
            "motivo": "Control preventivo de malas hierbas antes de emergencia",
            "observaciones": "Aplicar sobre suelo húmedo. No aplicar si se prevén lluvias intensas."
        },
        {
            "nombre": "Fertilización nitrogenada",
            "descripcion": "Aporte de nitrógeno para desarrollo vegetativo",
            "tipo": "Fertilización",
            "subtipo": "Fertilizante",
            "dosis": 150,
            "unidad_dosis": "Kg/ha",
            "prioridad": "Media",
            "motivo": "Necesidad de aporte nitrogenado para desarrollo del cultivo",
            "observaciones": "Fraccionar en 2-3 aplicaciones. Evitar exceso para prevenir problemas."
        },
        {
            "nombre": "Tratamiento araña roja",
            "descripcion": "Acaricida para control de araña roja",
            "tipo": "Tratamiento Fitosanitario",
            "subtipo": "Acaricida",
            "dosis": 0.8,
            "unidad_dosis": "L/ha",
            "volumen_agua": 500,
            "prioridad": "Alta",
            "motivo": "Detección de araña roja en envés de hojas",
            "observaciones": "Mojar bien el envés de las hojas. Rotar materias activas."
        },
        {
            "nombre": "Riego de mantenimiento",
            "descripcion": "Programación de riego estándar",
            "tipo": "Riego",
            "prioridad": "Baja",
            "motivo": "Mantenimiento de humedad del suelo",
            "observaciones": "Ajustar según condiciones climáticas y estado del cultivo."
        },
        {
            "nombre": "Poda de formación",
            "descripcion": "Poda para formación de estructura del cultivo",
            "tipo": "Poda",
            "prioridad": "Media",
            "motivo": "Necesidad de formar estructura adecuada del cultivo",
            "observaciones": "Realizar en época de reposo vegetativo si es posible."
        },
        {
            "nombre": "Control de caracoles y babosas",
            "descripcion": "Molusquicida para control de caracoles",
            "tipo": "Tratamiento Fitosanitario",
            "subtipo": "Molusquicida",
            "dosis": 5.0,
            "unidad_dosis": "Kg/ha",
            "prioridad": "Media",
            "motivo": "Presencia de caracoles y/o babosas",
            "observaciones": "Aplicar al atardecer. Renovar después de lluvias."
        }
    ]
    
    created_count = 0
    for template in default_templates:
        existing = await plantillas_collection.find_one({"nombre": template["nombre"]})
        if not existing:
            template["activo"] = True
            template["creado_por"] = current_user.get("username", "")
            template["created_at"] = datetime.utcnow()
            template["usos_count"] = 0
            await plantillas_collection.insert_one(template)
            created_count += 1
    
    return {
        "success": True,
        "message": f"{created_count} plantillas predeterminadas creadas",
        "created_count": created_count
    }
