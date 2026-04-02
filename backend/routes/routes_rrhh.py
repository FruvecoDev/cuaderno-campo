"""
Rutas para el modulo de Recursos Humanos (RRHH)
- Gestion de empleados
- Portal del empleado

Modulos extraidos a archivos separados:
- Prenominas: rrhh_prenominas.py
- Ausencias: rrhh_ausencias.py
- Fichajes/Control Horario: rrhh_fichajes.py
- Productividad: rrhh_productividad.py
- Documentos: rrhh_documentos.py
"""

from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId
import qrcode
import io
import base64

# Import email service for notifications
from email_service import send_ausencia_notification, send_documento_notification

# Import sub-routers
from routes.rrhh_ausencias import router as ausencias_router, set_database as set_ausencias_db, set_email_service as set_ausencias_email
from routes.rrhh_prenominas import router as prenominas_router, set_database as set_prenominas_db
from routes.rrhh_fichajes import router as fichajes_router, set_database as set_fichajes_db
from routes.rrhh_productividad import router as productividad_router, set_database as set_productividad_db
from routes.rrhh_documentos import router as documentos_router, set_database as set_documentos_db, set_email_service as set_documentos_email

router = APIRouter(prefix="/api/rrhh", tags=["RRHH"])

# Database will be injected
db = None

def set_database(database):
    global db
    db = database
    # Set database for all sub-routers
    set_ausencias_db(database)
    set_prenominas_db(database)
    set_fichajes_db(database)
    set_productividad_db(database)
    set_documentos_db(database)
    # Set email services
    set_ausencias_email(send_ausencia_notification)
    set_documentos_email(send_documento_notification)

def get_db():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db

# ============================================================================
# EMPLEADOS
# ============================================================================

@router.get("/empleados")
async def get_empleados(
    search: Optional[str] = None,
    departamento: Optional[str] = None,
    activo: Optional[bool] = None
):
    database = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"nombre": {"$regex": search, "$options": "i"}},
            {"apellidos": {"$regex": search, "$options": "i"}},
            {"dni_nie": {"$regex": search, "$options": "i"}}
        ]
    if departamento:
        query["departamento"] = departamento
    if activo is not None:
        query["activo"] = activo
    
    empleados = []
    cursor = database.empleados.find(query).sort("apellidos", 1)
    async for emp in cursor:
        emp["_id"] = str(emp["_id"])
        empleados.append(emp)
    return {"success": True, "empleados": empleados, "total": len(empleados)}


@router.get("/empleados/stats")
async def get_empleados_stats():
    database = get_db()
    total = await database.empleados.count_documents({})
    activos = await database.empleados.count_documents({"activo": True})
    inactivos = total - activos
    
    pipeline = [{"$match": {"activo": True}}, {"$group": {"_id": "$departamento", "count": {"$sum": 1}}}]
    por_departamento = {}
    async for doc in database.empleados.aggregate(pipeline):
        por_departamento[doc["_id"] or "Sin departamento"] = doc["count"]
    
    pipeline = [{"$match": {"activo": True}}, {"$group": {"_id": "$tipo_contrato", "count": {"$sum": 1}}}]
    por_contrato = {}
    async for doc in database.empleados.aggregate(pipeline):
        por_contrato[doc["_id"] or "Sin definir"] = doc["count"]
    
    return {
        "success": True,
        "stats": {
            "total": total, "activos": activos, "inactivos": inactivos,
            "por_departamento": por_departamento, "por_tipo_contrato": por_contrato
        }
    }


@router.get("/empleados/{empleado_id}")
async def get_empleado(empleado_id: str):
    database = get_db()
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    empleado["_id"] = str(empleado["_id"])
    return {"success": True, "empleado": empleado}


@router.post("/empleados")
async def create_empleado(empleado: dict):
    database = get_db()
    empleado["activo"] = True
    empleado["created_at"] = datetime.now()
    empleado["qr_code"] = f"EMP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    result = await database.empleados.insert_one(empleado)
    empleado["_id"] = str(result.inserted_id)
    return {"success": True, "data": empleado}


@router.put("/empleados/{empleado_id}")
async def update_empleado(empleado_id: str, empleado: dict):
    database = get_db()
    empleado.pop("_id", None)
    empleado["updated_at"] = datetime.now()
    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": empleado}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"success": True}


@router.delete("/empleados/{empleado_id}")
async def delete_empleado(empleado_id: str):
    database = get_db()
    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": {"activo": False, "fecha_baja": datetime.now().strftime("%Y-%m-%d")}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"success": True}


@router.put("/empleados/{empleado_id}/nfc")
async def assign_nfc_to_empleado(empleado_id: str, data: dict):
    """Assign or update NFC ID for an employee"""
    database = get_db()
    nfc_id = data.get("nfc_id", "").strip()
    if not nfc_id:
        raise HTTPException(status_code=400, detail="NFC ID es requerido")

    # Check if NFC ID is already assigned to another employee
    existing = await database.empleados.find_one({"nfc_id": nfc_id, "_id": {"$ne": ObjectId(empleado_id)}})
    if existing:
        raise HTTPException(status_code=409, detail=f"NFC ya asignado a {existing.get('nombre', '')} {existing.get('apellidos', '')}")

    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": {"nfc_id": nfc_id, "updated_at": datetime.now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"success": True, "nfc_id": nfc_id}


@router.delete("/empleados/{empleado_id}/nfc")
async def remove_nfc_from_empleado(empleado_id: str):
    """Remove NFC ID from an employee"""
    database = get_db()
    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$unset": {"nfc_id": ""}, "$set": {"updated_at": datetime.now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"success": True}


@router.get("/empleados/nfc-lookup/{nfc_id}")
async def lookup_empleado_by_nfc(nfc_id: str):
    """Look up an employee by NFC ID"""
    database = get_db()
    empleado = await database.empleados.find_one({"nfc_id": nfc_id, "activo": True})
    if not empleado:
        raise HTTPException(status_code=404, detail="NFC no registrado")
    empleado["_id"] = str(empleado["_id"])
    return {"success": True, "empleado": empleado}


@router.delete("/empleados/{empleado_id}/permanente")
async def delete_empleado_permanente(empleado_id: str):
    database = get_db()
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    emp_id = str(empleado["_id"])
    await database.fichajes.delete_many({"empleado_id": emp_id})
    await database.productividad.delete_many({"empleado_id": emp_id})
    await database.documentos_empleados.delete_many({"empleado_id": emp_id})
    await database.ausencias.delete_many({"empleado_id": emp_id})
    await database.empleados.delete_one({"_id": ObjectId(empleado_id)})
    
    return {"success": True, "message": "Empleado y datos relacionados eliminados permanentemente"}


@router.put("/empleados/{empleado_id}/reactivar")
async def reactivar_empleado(empleado_id: str):
    database = get_db()
    result = await database.empleados.update_one(
        {"_id": ObjectId(empleado_id)},
        {"$set": {"activo": True, "fecha_baja": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"success": True}


@router.get("/empleados/{empleado_id}/qr")
async def get_empleado_qr(empleado_id: str):
    database = get_db()
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    qr_data = empleado.get("qr_code", f"EMP-{empleado_id}")
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    qr_image.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "success": True,
        "qr_code": qr_data,
        "qr_image_base64": f"data:image/png;base64,{qr_base64}",
        "empleado_nombre": f"{empleado.get('nombre', '')} {empleado.get('apellidos', '')}"
    }

# ============================================================================
# PORTAL DEL EMPLEADO
# ============================================================================

@router.get("/portal/mi-perfil")
async def get_mi_perfil(empleado_id: str):
    database = get_db()
    empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    empleado["_id"] = str(empleado["_id"])
    empleado.pop("salario_hora", None)
    empleado.pop("salario_hora_extra", None)
    empleado.pop("iban", None)
    return {"success": True, "empleado": empleado}


@router.get("/portal/mis-fichajes")
async def get_mis_fichajes(empleado_id: str, mes: Optional[int] = None, ano: Optional[int] = None):
    database = get_db()
    if not mes:
        mes = datetime.now().month
    if not ano:
        ano = datetime.now().year
    
    fecha_desde = f"{ano}-{str(mes).zfill(2)}-01"
    fecha_hasta = f"{ano + 1}-01-01" if mes == 12 else f"{ano}-{str(mes + 1).zfill(2)}-01"
    
    fichajes = []
    cursor = database.fichajes.find({
        "empleado_id": empleado_id,
        "fecha": {"$gte": fecha_desde, "$lt": fecha_hasta}
    }).sort([("fecha", -1), ("hora", -1)])
    async for f in cursor:
        f["_id"] = str(f["_id"])
        fichajes.append(f)
    return {"success": True, "fichajes": fichajes, "periodo": {"mes": mes, "ano": ano}}


@router.get("/portal/mis-documentos")
async def get_mis_documentos(empleado_id: str):
    database = get_db()
    documentos = []
    cursor = database.documentos_empleados.find({"empleado_id": empleado_id, "activo": True}).sort("created_at", -1)
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        documentos.append(doc)
    return {"success": True, "documentos": documentos}


@router.get("/portal/mis-ausencias")
async def get_mis_ausencias(empleado_id: str):
    database = get_db()
    ausencias = []
    cursor = database.ausencias.find({"empleado_id": empleado_id}).sort("fecha_inicio", -1)
    async for a in cursor:
        a["_id"] = str(a["_id"])
        ausencias.append(a)
    return {"success": True, "ausencias": ausencias}
