"""
RRHH - Gestión de Empleados
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
import uuid
import qrcode
import io
import base64

router = APIRouter(tags=["RRHH - Empleados"])

db = None

def set_database(database):
    global db
    db = database

def get_db():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db


@router.get("/empleados")
async def get_empleados(
    activo: Optional[bool] = None,
    puesto: Optional[str] = None,
    departamento: Optional[str] = None
):
    """Obtener lista de empleados con filtros opcionales"""
    database = get_db()
    
    query = {}
    if activo is not None:
        query["activo"] = activo
    if puesto:
        query["puesto"] = puesto
    if departamento:
        query["departamento"] = departamento
    
    empleados = []
    cursor = database.empleados.find(query).sort("apellidos", 1)
    
    async for emp in cursor:
        emp["_id"] = str(emp["_id"])
        empleados.append(emp)
    
    return {"success": True, "empleados": empleados, "total": len(empleados)}


@router.get("/empleados/stats")
async def get_empleados_stats():
    """Estadísticas de empleados"""
    database = get_db()
    
    total = await database.empleados.count_documents({})
    activos = await database.empleados.count_documents({"activo": True})
    
    # Por puesto
    pipeline = [
        {"$match": {"activo": True}},
        {"$group": {"_id": "$puesto", "count": {"$sum": 1}}}
    ]
    por_puesto = {}
    async for doc in database.empleados.aggregate(pipeline):
        por_puesto[doc["_id"] or "Sin asignar"] = doc["count"]
    
    # Por tipo de contrato
    pipeline = [
        {"$match": {"activo": True}},
        {"$group": {"_id": "$tipo_contrato", "count": {"$sum": 1}}}
    ]
    por_contrato = {}
    async for doc in database.empleados.aggregate(pipeline):
        por_contrato[doc["_id"] or "Sin asignar"] = doc["count"]
    
    return {
        "success": True,
        "total": total,
        "activos": activos,
        "inactivos": total - activos,
        "por_puesto": por_puesto,
        "por_contrato": por_contrato
    }


@router.get("/empleados/{empleado_id}")
async def get_empleado(empleado_id: str):
    """Obtener un empleado por ID"""
    database = get_db()
    
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    empleado["_id"] = str(empleado["_id"])
    return {"success": True, "empleado": empleado}


@router.post("/empleados")
async def create_empleado(empleado: dict):
    """Crear un nuevo empleado"""
    database = get_db()
    
    # Generar código único
    count = await database.empleados.count_documents({})
    empleado["codigo"] = f"EMP-{str(count + 1).zfill(4)}"
    
    # Generar QR único
    qr_data = f"EMP:{empleado['codigo']}:{uuid.uuid4().hex[:8]}"
    empleado["qr_code"] = qr_data
    
    # Timestamps
    empleado["created_at"] = datetime.now()
    empleado["updated_at"] = datetime.now()
    empleado["activo"] = True
    
    result = await database.empleados.insert_one(empleado)
    empleado["_id"] = str(result.inserted_id)
    
    return {"success": True, "data": empleado}


@router.put("/empleados/{empleado_id}")
async def update_empleado(empleado_id: str, empleado: dict):
    """Actualizar un empleado"""
    database = get_db()
    
    empleado["updated_at"] = datetime.now()
    
    # No permitir cambiar código ni qr_code
    empleado.pop("codigo", None)
    empleado.pop("qr_code", None)
    empleado.pop("_id", None)
    
    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": empleado}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    return {"success": True}


@router.delete("/empleados/{empleado_id}")
async def delete_empleado(empleado_id: str):
    """Dar de baja un empleado (soft delete)"""
    database = get_db()
    
    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": {
            "activo": False,
            "fecha_baja": datetime.now().strftime("%Y-%m-%d"),
            "updated_at": datetime.now()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    return {"success": True}


@router.delete("/empleados/{empleado_id}/permanente")
async def delete_empleado_permanente(empleado_id: str):
    """Eliminar permanentemente un empleado (solo si está en baja)"""
    database = get_db()
    
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    if empleado.get("activo", True):
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar empleados en baja")
    
    result = await database.empleados.delete_one({"_id": ObjectId(empleado_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Error al eliminar empleado")
    
    # También eliminar datos relacionados
    await database.fichajes.delete_many({"empleado_id": empleado_id})
    await database.productividad.delete_many({"empleado_id": empleado_id})
    await database.documentos_empleado.delete_many({"empleado_id": empleado_id})
    await database.prenominas.delete_many({"empleado_id": empleado_id})
    
    return {"success": True, "message": "Empleado eliminado permanentemente"}


@router.put("/empleados/{empleado_id}/reactivar")
async def reactivar_empleado(empleado_id: str):
    """Reactivar un empleado que estaba en baja"""
    database = get_db()
    
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    if empleado.get("activo", True):
        raise HTTPException(status_code=400, detail="El empleado ya está activo")
    
    await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": {
            "activo": True,
            "fecha_baja": None,
            "updated_at": datetime.now()
        }}
    )
    
    return {"success": True, "message": "Empleado reactivado"}


@router.get("/empleados/{empleado_id}/qr")
async def get_empleado_qr(empleado_id: str):
    """Generar imagen QR para un empleado"""
    database = get_db()
    
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(empleado.get("qr_code", f"EMP:{empleado.get('codigo', 'UNKNOWN')}"))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "success": True,
        "qr_image": f"data:image/png;base64,{img_str}",
        "qr_code": empleado.get("qr_code"),
        "empleado_nombre": f"{empleado.get('nombre', '')} {empleado.get('apellidos', '')}"
    }
