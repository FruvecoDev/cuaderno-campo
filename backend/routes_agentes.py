"""
Routes for Agentes (Compra/Venta) - Sales and Purchase Agents Management
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
import uuid

from database import db, serialize_doc
from routes_auth import get_current_user
from rbac_config import RequireView, RequireCreate, RequireEdit, RequireDelete

router = APIRouter(prefix="/api", tags=["agentes"])

# Collections
agentes_collection = db['agentes']
comisiones_collection = db['comisiones_agentes']


class AgenteBase(BaseModel):
    tipo: str  # "Compra" o "Venta"
    codigo: Optional[str] = None  # Auto-generated
    nombre: str
    razon_social: Optional[str] = None
    denominacion: Optional[str] = None
    nif: Optional[str] = None
    direccion: Optional[str] = None
    direccion2: Optional[str] = None
    telefonos: Optional[str] = None
    fax: Optional[str] = None
    pais: Optional[str] = "España"
    codigo_postal: Optional[str] = None
    poblacion: Optional[str] = None
    provincia: Optional[str] = None
    persona_contacto: Optional[str] = None
    email: Optional[str] = None
    web: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True


class ComisionBase(BaseModel):
    agente_id: str
    tipo_comision: str  # "porcentaje" o "euro_kilo"
    valor: float  # Porcentaje (0-100) o €/kg
    aplicar_a: str  # "contrato", "cultivo", "parcela"
    referencia_id: Optional[str] = None  # ID del contrato, cultivo o parcela
    referencia_nombre: Optional[str] = None  # Nombre para mostrar
    fecha_desde: Optional[str] = None
    fecha_hasta: Optional[str] = None
    activa: bool = True


# ============================================================================
# AGENTES ENDPOINTS
# ============================================================================

@router.get("/agentes")
async def get_agentes(
    tipo: Optional[str] = None,
    activo: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de agentes con filtros opcionales"""
    query = {}
    
    if tipo:
        query["tipo"] = tipo
    if activo is not None:
        query["activo"] = activo
    if search:
        query["$or"] = [
            {"nombre": {"$regex": search, "$options": "i"}},
            {"codigo": {"$regex": search, "$options": "i"}},
            {"nif": {"$regex": search, "$options": "i"}}
        ]
    
    agentes = await agentes_collection.find(query).sort("codigo", 1).to_list(500)
    return {
        "agentes": [serialize_doc(a) for a in agentes],
        "total": len(agentes)
    }


@router.get("/agentes/activos")
async def get_agentes_activos(
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener agentes activos para selectores"""
    query = {"activo": True}
    if tipo:
        query["tipo"] = tipo
    
    agentes = await agentes_collection.find(query).sort("nombre", 1).to_list(200)
    return {"agentes": [serialize_doc(a) for a in agentes]}


@router.get("/agentes/{agente_id}")
async def get_agente(
    agente_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un agente por ID"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    return {"agente": serialize_doc(agente)}


async def generate_codigo_agente(tipo: str) -> str:
    """Genera código único para el agente: AC-001 (Compra) o AV-001 (Venta)"""
    prefix = "AC" if tipo == "Compra" else "AV"
    
    last_agente = await agentes_collection.find_one(
        {"codigo": {"$regex": f"^{prefix}-"}},
        sort=[("codigo", -1)]
    )
    
    if last_agente:
        try:
            last_num = int(last_agente["codigo"].split("-")[1])
            next_num = last_num + 1
        except (IndexError, ValueError):
            next_num = 1
    else:
        next_num = 1
    
    return f"{prefix}-{next_num:03d}"


@router.post("/agentes")
async def create_agente(
    agente: AgenteBase,
    current_user: dict = Depends(RequireCreate)
):
    """Crear un nuevo agente"""
    agente_dict = agente.model_dump()
    
    # Auto-generar código
    if not agente_dict.get("codigo"):
        agente_dict["codigo"] = await generate_codigo_agente(agente_dict["tipo"])
    
    agente_dict["created_at"] = datetime.now()
    agente_dict["updated_at"] = datetime.now()
    agente_dict["foto_url"] = None
    
    result = await agentes_collection.insert_one(agente_dict)
    created = await agentes_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.put("/agentes/{agente_id}")
async def update_agente(
    agente_id: str,
    agente: AgenteBase,
    current_user: dict = Depends(RequireEdit)
):
    """Actualizar un agente existente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    existing = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    update_data = agente.model_dump()
    update_data["updated_at"] = datetime.now()
    # Mantener código existente
    update_data["codigo"] = existing.get("codigo")
    
    await agentes_collection.update_one(
        {"_id": ObjectId(agente_id)},
        {"$set": update_data}
    )
    
    updated = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.patch("/agentes/{agente_id}/toggle-activo")
async def toggle_agente_activo(
    agente_id: str,
    current_user: dict = Depends(RequireEdit)
):
    """Activar/Desactivar un agente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    new_status = not agente.get("activo", True)
    await agentes_collection.update_one(
        {"_id": ObjectId(agente_id)},
        {"$set": {"activo": new_status, "updated_at": datetime.now()}}
    )
    
    return {"success": True, "activo": new_status}


@router.delete("/agentes/{agente_id}")
async def delete_agente(
    agente_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar un agente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await agentes_collection.delete_one({"_id": ObjectId(agente_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    # También eliminar sus comisiones
    await comisiones_collection.delete_many({"agente_id": agente_id})
    
    return {"success": True, "message": "Agente eliminado"}


@router.post("/agentes/{agente_id}/upload-foto")
async def upload_foto_agente(
    agente_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(RequireEdit)
):
    """Subir foto del agente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    # Validar tipo de archivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    
    # Crear directorio
    upload_dir = "/app/uploads/agentes_fotos"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Guardar archivo
    extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{extension}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Actualizar agente
    await agentes_collection.update_one(
        {"_id": ObjectId(agente_id)},
        {"$set": {
            "foto_url": filepath,
            "foto_nombre": file.filename,
            "updated_at": datetime.now()
        }}
    )
    
    return {"success": True, "foto_url": filepath}


@router.get("/agentes/{agente_id}/foto")
async def get_foto_agente(
    agente_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener foto del agente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente or not agente.get("foto_url"):
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    
    if not os.path.exists(agente["foto_url"]):
        raise HTTPException(status_code=404, detail="Archivo de foto no encontrado")
    
    return FileResponse(agente["foto_url"])


# ============================================================================
# COMISIONES ENDPOINTS
# ============================================================================

@router.get("/agentes/{agente_id}/comisiones")
async def get_comisiones_agente(
    agente_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener comisiones de un agente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    comisiones = await comisiones_collection.find({"agente_id": agente_id}).to_list(100)
    return {"comisiones": [serialize_doc(c) for c in comisiones]}


@router.post("/agentes/{agente_id}/comisiones")
async def create_comision(
    agente_id: str,
    comision: ComisionBase,
    current_user: dict = Depends(RequireCreate)
):
    """Crear una comisión para un agente"""
    if not ObjectId.is_valid(agente_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    comision_dict = comision.model_dump()
    comision_dict["agente_id"] = agente_id
    comision_dict["created_at"] = datetime.now()
    comision_dict["updated_at"] = datetime.now()
    
    result = await comisiones_collection.insert_one(comision_dict)
    created = await comisiones_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.put("/comisiones/{comision_id}")
async def update_comision(
    comision_id: str,
    comision: ComisionBase,
    current_user: dict = Depends(RequireEdit)
):
    """Actualizar una comisión"""
    if not ObjectId.is_valid(comision_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    update_data = comision.model_dump()
    update_data["updated_at"] = datetime.now()
    
    result = await comisiones_collection.update_one(
        {"_id": ObjectId(comision_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
    
    updated = await comisiones_collection.find_one({"_id": ObjectId(comision_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/comisiones/{comision_id}")
async def delete_comision(
    comision_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar una comisión"""
    if not ObjectId.is_valid(comision_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await comisiones_collection.delete_one({"_id": ObjectId(comision_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
    
    return {"success": True, "message": "Comisión eliminada"}
