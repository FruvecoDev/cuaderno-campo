"""
RRHH - Gestión de Ausencias y Vacaciones
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/rrhh", tags=["RRHH - Ausencias"])

db = None
send_ausencia_notification = None

def set_database(database):
    global db
    db = database

def set_email_service(email_func):
    global send_ausencia_notification
    send_ausencia_notification = email_func

def get_db():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db


@router.get("/ausencias")
async def get_ausencias(
    empleado_id: Optional[str] = None,
    estado: Optional[str] = None,
    tipo: Optional[str] = None
):
    """Obtener ausencias"""
    database = get_db()
    
    query = {}
    if empleado_id:
        query["empleado_id"] = empleado_id
    if estado:
        query["estado"] = estado
    if tipo:
        query["tipo"] = tipo
    
    ausencias = []
    cursor = database.ausencias.find(query).sort("fecha_inicio", -1)
    
    async for a in cursor:
        a["_id"] = str(a["_id"])
        emp = await database.empleados.find_one({"_id": ObjectId(a["empleado_id"])})
        if emp:
            a["empleado_nombre"] = f"{emp.get('nombre', '')} {emp.get('apellidos', '')}"
        ausencias.append(a)
    
    return {"success": True, "ausencias": ausencias, "total": len(ausencias)}


@router.post("/ausencias")
async def create_ausencia(ausencia: dict):
    """Crear solicitud de ausencia"""
    database = get_db()
    
    # Calcular días totales
    fecha_inicio = datetime.strptime(ausencia["fecha_inicio"], "%Y-%m-%d")
    fecha_fin = datetime.strptime(ausencia["fecha_fin"], "%Y-%m-%d")
    ausencia["dias_totales"] = (fecha_fin - fecha_inicio).days + 1
    
    ausencia["estado"] = "pendiente"
    ausencia["created_at"] = datetime.now()
    
    result = await database.ausencias.insert_one(ausencia)
    ausencia["_id"] = str(result.inserted_id)
    
    return {"success": True, "data": ausencia}


@router.put("/ausencias/{ausencia_id}/aprobar")
async def aprobar_ausencia(ausencia_id: str, aprobador: dict):
    """Aprobar o rechazar una ausencia"""
    database = get_db()
    
    estado = aprobador.get("estado", "aprobada")
    
    ausencia = await database.ausencias.find_one({"_id": ObjectId(ausencia_id)})
    if not ausencia:
        raise HTTPException(status_code=404, detail="Ausencia no encontrada")
    
    await database.ausencias.update_one(
        {"_id": ObjectId(ausencia_id)},
        {"$set": {
            "estado": estado,
            "aprobada_por": aprobador.get("aprobada_por"),
            "fecha_aprobacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "comentario_aprobador": aprobador.get("comentario", "")
        }}
    )
    
    # Crear notificación para el empleado
    empleado = await database.empleados.find_one({"_id": ObjectId(ausencia["empleado_id"])})
    if empleado and empleado.get("email"):
        tipo_ausencia = ausencia.get("tipo", "ausencia").replace("_", " ").capitalize()
        fecha_inicio = ausencia.get("fecha_inicio", "")
        fecha_fin = ausencia.get("fecha_fin", "")
        empleado_nombre = f"{empleado.get('nombre', '')} {empleado.get('apellidos', '')}"
        comentario = aprobador.get("comentario", "")
        
        if estado == "aprobada":
            titulo = f"Solicitud de {tipo_ausencia} Aprobada"
            mensaje = f"Tu solicitud de {tipo_ausencia} del {fecha_inicio} al {fecha_fin} ha sido aprobada."
            tipo_notif = "success"
        else:
            titulo = f"Solicitud de {tipo_ausencia} Rechazada"
            mensaje = f"Tu solicitud de {tipo_ausencia} del {fecha_inicio} al {fecha_fin} ha sido rechazada."
            if comentario:
                mensaje += f" Motivo: {comentario}"
            tipo_notif = "warning"
        
        notificacion = {
            "titulo": titulo,
            "mensaje": mensaje,
            "tipo": tipo_notif,
            "enlace": "/portal-empleado",
            "destinatarios": [empleado.get("email")],
            "prioridad": "alta",
            "datos_extra": {"ausencia_id": ausencia_id, "tipo": "ausencia"},
            "created_at": datetime.now(),
            "leida_por": []
        }
        await database.notificaciones.insert_one(notificacion)
        
        # Enviar email de notificación
        if send_ausencia_notification:
            try:
                await send_ausencia_notification(
                    recipient_email=empleado.get("email"),
                    empleado_nombre=empleado_nombre,
                    tipo_ausencia=ausencia.get("tipo", "ausencia"),
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    estado=estado,
                    comentario=comentario
                )
            except Exception as e:
                print(f"Error sending ausencia email: {e}")
    
    return {"success": True}


@router.delete("/ausencias/{ausencia_id}")
async def delete_ausencia(ausencia_id: str):
    """Eliminar solicitud de ausencia"""
    database = get_db()
    
    result = await database.ausencias.delete_one({"_id": ObjectId(ausencia_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ausencia no encontrada")
    
    return {"success": True}
