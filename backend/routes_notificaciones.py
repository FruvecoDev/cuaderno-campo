"""
Routes for Notifications and Scheduled Tasks
Handles in-app notifications and scheduled climate checks
Prepared for future email integration with Resend
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timedelta
import asyncio
import os

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/notificaciones", tags=["notificaciones"])

# Collections
notificaciones_collection = db['notificaciones']
config_scheduler_collection = db['config_scheduler']
alertas_collection = db['alertas_clima']
parcelas_collection = db['parcelas']
usuarios_collection = db['usuarios']

# Email config (prepared for Resend integration)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
EMAIL_ENABLED = bool(RESEND_API_KEY)


# Models
class NotificacionCreate(BaseModel):
    titulo: str
    mensaje: str
    tipo: str = "info"  # info, warning, success, error, alert
    enlace: Optional[str] = None
    destinatarios: Optional[List[str]] = None  # user IDs, None = all users
    prioridad: str = "normal"  # low, normal, high


class SchedulerConfig(BaseModel):
    verificacion_clima_activa: bool = True
    hora_verificacion: str = "07:00"  # HH:MM format
    frecuencia: str = "diaria"  # diaria, cada_12h, cada_6h
    notificar_app: bool = True
    notificar_email: bool = False
    roles_notificar: List[str] = ["Admin", "Manager", "Technician"]


class NotificacionUpdate(BaseModel):
    leida: bool


def serialize_doc(doc: dict) -> dict:
    """Convert ObjectId and datetime for JSON serialization"""
    if not doc:
        return doc
    
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["_id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    
    return result


async def crear_notificacion_interna(
    titulo: str,
    mensaje: str,
    tipo: str = "info",
    enlace: str = None,
    destinatarios: List[str] = None,
    prioridad: str = "normal",
    datos_extra: dict = None
):
    """Create an in-app notification"""
    notificacion = {
        "titulo": titulo,
        "mensaje": mensaje,
        "tipo": tipo,
        "enlace": enlace,
        "destinatarios": destinatarios,  # None means all users
        "prioridad": prioridad,
        "datos_extra": datos_extra or {},
        "created_at": datetime.utcnow(),
        "leida_por": []  # List of user IDs who have read it
    }
    
    result = await notificaciones_collection.insert_one(notificacion)
    return str(result.inserted_id)


async def enviar_email_resumen(destinatarios: List[str], resumen: dict):
    """
    Send email summary using Resend (when API key is available)
    This function is prepared but will only work when RESEND_API_KEY is set
    """
    if not EMAIL_ENABLED:
        print("Email notifications disabled - RESEND_API_KEY not configured")
        return False
    
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        
        # Get user emails
        usuarios = await usuarios_collection.find({"_id": {"$in": [ObjectId(uid) for uid in destinatarios]}}).to_list(100)
        emails = [u.get("email") for u in usuarios if u.get("email")]
        
        if not emails:
            return False
        
        html_content = f"""
        <h2>Resumen de Alertas Climáticas</h2>
        <p>Se han generado <strong>{resumen['total_alertas']}</strong> nuevas alertas:</p>
        <ul>
            <li>🔴 Alta prioridad: {resumen['por_prioridad'].get('alta', 0)}</li>
            <li>🟡 Media prioridad: {resumen['por_prioridad'].get('media', 0)}</li>
            <li>🟢 Baja prioridad: {resumen['por_prioridad'].get('baja', 0)}</li>
        </ul>
        <p><a href="{resumen.get('enlace', '#')}">Ver alertas en la aplicación</a></p>
        """
        
        resend.Emails.send({
            "from": "alertas@fruveco.com",
            "to": emails,
            "subject": f"[FRUVECO] {resumen['total_alertas']} nuevas alertas climáticas",
            "html": html_content
        })
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


async def ejecutar_verificacion_clima_programada():
    """
    Execute scheduled climate verification
    This function is called by the scheduler
    """
    from routes_alertas_clima import obtener_clima_api, generar_alertas_para_parcela, datos_clima_collection
    
    print(f"[{datetime.utcnow()}] Executing scheduled climate check...")
    
    # Get scheduler config
    config = await config_scheduler_collection.find_one({"tipo": "verificacion_clima"})
    if not config or not config.get("activa", True):
        print("Scheduled climate check is disabled")
        return
    
    # Get all parcelas
    parcelas = await parcelas_collection.find().to_list(500)
    
    alertas_generadas = []
    parcelas_procesadas = 0
    
    # Create a system user context for the operation
    system_user = {"username": "sistema", "_id": "sistema", "role": "Admin"}
    
    for parcela in parcelas:
        datos_clima = None
        
        # Try API first if parcela has coordinates
        if parcela.get("latitud") and parcela.get("longitud"):
            datos_clima = await obtener_clima_api(parcela["latitud"], parcela["longitud"])
        
        # Fallback to latest manual data
        if not datos_clima:
            manual = await datos_clima_collection.find_one(
                {"parcela_id": str(parcela["_id"])},
                sort=[("timestamp", -1)]
            )
            if manual:
                datos_clima = {
                    "temperatura": manual.get("temperatura"),
                    "humedad": manual.get("humedad"),
                    "lluvia": manual.get("lluvia", 0),
                    "viento": manual.get("viento", 0),
                    "fuente": "manual"
                }
        
        if datos_clima:
            try:
                alertas = await generar_alertas_para_parcela(parcela, datos_clima, system_user)
                alertas_generadas.extend(alertas)
                parcelas_procesadas += 1
            except Exception as e:
                print(f"Error processing parcela {parcela.get('codigo_plantacion')}: {e}")
    
    # Generate summary
    resumen = {
        "total_alertas": len(alertas_generadas),
        "parcelas_procesadas": parcelas_procesadas,
        "por_prioridad": {
            "alta": sum(1 for a in alertas_generadas if a.get("prioridad") == "Alta"),
            "media": sum(1 for a in alertas_generadas if a.get("prioridad") == "Media"),
            "baja": sum(1 for a in alertas_generadas if a.get("prioridad") == "Baja")
        },
        "timestamp": datetime.utcnow().isoformat(),
        "enlace": "/alertas-clima"
    }
    
    # Create in-app notification if there are new alerts
    if len(alertas_generadas) > 0:
        # Get users to notify based on config
        roles_notificar = config.get("roles_notificar", ["Admin", "Manager", "Technician"])
        usuarios = await usuarios_collection.find({"role": {"$in": roles_notificar}}).to_list(100)
        destinatarios = [str(u["_id"]) for u in usuarios]
        
        # Determine notification priority
        prioridad = "high" if resumen["por_prioridad"]["alta"] > 0 else "normal"
        
        # Create in-app notification
        if config.get("notificar_app", True):
            await crear_notificacion_interna(
                titulo=f"🌡️ {len(alertas_generadas)} nuevas alertas climáticas",
                mensaje=f"Se detectaron {resumen['por_prioridad']['alta']} alertas de alta prioridad, {resumen['por_prioridad']['media']} de media y {resumen['por_prioridad']['baja']} de baja.",
                tipo="alert",
                enlace="/alertas-clima",
                destinatarios=destinatarios,
                prioridad=prioridad,
                datos_extra=resumen
            )
        
        # Send email if enabled
        if config.get("notificar_email", False) and EMAIL_ENABLED:
            await enviar_email_resumen(destinatarios, resumen)
    
    # Log execution
    await config_scheduler_collection.update_one(
        {"tipo": "verificacion_clima"},
        {"$set": {
            "ultima_ejecucion": datetime.utcnow(),
            "ultimo_resultado": resumen
        }}
    )
    
    print(f"Scheduled check complete: {parcelas_procesadas} parcelas, {len(alertas_generadas)} alerts generated")
    return resumen


# ==================== ENDPOINTS ====================

# GET user notifications
@router.get("")
async def get_notificaciones(
    solo_no_leidas: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for the current user"""
    user_id = str(current_user.get("_id", ""))
    
    query = {
        "$or": [
            {"destinatarios": None},  # Notifications for all users
            {"destinatarios": user_id}  # Notifications for this user
        ]
    }
    
    if solo_no_leidas:
        query["leida_por"] = {"$ne": user_id}
    
    notificaciones = await notificaciones_collection.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark which ones are read by this user
    for n in notificaciones:
        n["leida"] = user_id in n.get("leida_por", [])
    
    # Count unread
    no_leidas = await notificaciones_collection.count_documents({
        **query,
        "leida_por": {"$ne": user_id}
    })
    
    return {
        "notificaciones": [serialize_doc(n) for n in notificaciones],
        "total": len(notificaciones),
        "no_leidas": no_leidas
    }


# GET unread count (for badge)
@router.get("/count")
async def get_notificaciones_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of unread notifications"""
    user_id = str(current_user.get("_id", ""))
    
    query = {
        "$or": [
            {"destinatarios": None},
            {"destinatarios": user_id}
        ],
        "leida_por": {"$ne": user_id}
    }
    
    count = await notificaciones_collection.count_documents(query)
    
    return {"no_leidas": count}


# PUT mark notification as read
@router.put("/{notificacion_id}/leer")
async def marcar_leida(
    notificacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    user_id = str(current_user.get("_id", ""))
    
    try:
        result = await notificaciones_collection.update_one(
            {"_id": ObjectId(notificacion_id)},
            {"$addToSet": {"leida_por": user_id}}
        )
        
        if result.modified_count == 0:
            # Check if already read or not found
            notif = await notificaciones_collection.find_one({"_id": ObjectId(notificacion_id)})
            if not notif:
                raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        return {"success": True, "message": "Notificación marcada como leída"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# PUT mark all as read
@router.put("/leer-todas")
async def marcar_todas_leidas(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read for current user"""
    user_id = str(current_user.get("_id", ""))
    
    query = {
        "$or": [
            {"destinatarios": None},
            {"destinatarios": user_id}
        ],
        "leida_por": {"$ne": user_id}
    }
    
    result = await notificaciones_collection.update_many(
        query,
        {"$addToSet": {"leida_por": user_id}}
    )
    
    return {
        "success": True,
        "message": f"{result.modified_count} notificación(es) marcada(s) como leídas"
    }


# DELETE notification
@router.delete("/{notificacion_id}")
async def eliminar_notificacion(
    notificacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification (Admin only)"""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede eliminar notificaciones")
    
    try:
        result = await notificaciones_collection.delete_one({"_id": ObjectId(notificacion_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        return {"success": True, "message": "Notificación eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# POST create notification (Admin/Manager only)
@router.post("")
async def crear_notificacion(
    data: NotificacionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new notification"""
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden crear notificaciones")
    
    notif_id = await crear_notificacion_interna(
        titulo=data.titulo,
        mensaje=data.mensaje,
        tipo=data.tipo,
        enlace=data.enlace,
        destinatarios=data.destinatarios,
        prioridad=data.prioridad
    )
    
    return {
        "success": True,
        "message": "Notificación creada",
        "notificacion_id": notif_id
    }


# ==================== SCHEDULER CONFIG ====================

# GET scheduler config
@router.get("/scheduler/config")
async def get_scheduler_config(
    current_user: dict = Depends(get_current_user)
):
    """Get scheduler configuration"""
    config = await config_scheduler_collection.find_one({"tipo": "verificacion_clima"})
    
    if not config:
        # Return default config
        config = {
            "tipo": "verificacion_clima",
            "activa": True,
            "hora_verificacion": "07:00",
            "frecuencia": "diaria",
            "notificar_app": True,
            "notificar_email": False,
            "roles_notificar": ["Admin", "Manager", "Technician"],
            "ultima_ejecucion": None,
            "ultimo_resultado": None
        }
    
    return {
        "config": serialize_doc(config),
        "email_disponible": EMAIL_ENABLED
    }


# PUT update scheduler config
@router.put("/scheduler/config")
async def update_scheduler_config(
    data: SchedulerConfig,
    current_user: dict = Depends(get_current_user)
):
    """Update scheduler configuration (Admin only)"""
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede configurar la programación")
    
    # Validate time format
    try:
        datetime.strptime(data.hora_verificacion, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de hora inválido. Use HH:MM")
    
    config_data = {
        "tipo": "verificacion_clima",
        "activa": data.verificacion_clima_activa,
        "hora_verificacion": data.hora_verificacion,
        "frecuencia": data.frecuencia,
        "notificar_app": data.notificar_app,
        "notificar_email": data.notificar_email and EMAIL_ENABLED,  # Only enable if API key exists
        "roles_notificar": data.roles_notificar,
        "updated_at": datetime.utcnow(),
        "updated_by": current_user.get("username", "")
    }
    
    await config_scheduler_collection.update_one(
        {"tipo": "verificacion_clima"},
        {"$set": config_data},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Configuración de programación actualizada"
    }


# POST execute manual check (trigger scheduled task manually)
@router.post("/scheduler/ejecutar")
async def ejecutar_verificacion_manual(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger the scheduled climate verification"""
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden ejecutar verificación manual")
    
    # Run in background
    background_tasks.add_task(ejecutar_verificacion_clima_programada)
    
    return {
        "success": True,
        "message": "Verificación climática iniciada en segundo plano"
    }


# GET scheduler status
@router.get("/scheduler/status")
async def get_scheduler_status(
    current_user: dict = Depends(get_current_user)
):
    """Get current scheduler status"""
    config = await config_scheduler_collection.find_one({"tipo": "verificacion_clima"})
    
    return {
        "activo": config.get("activa", False) if config else False,
        "ultima_ejecucion": config.get("ultima_ejecucion").isoformat() if config and config.get("ultima_ejecucion") else None,
        "ultimo_resultado": config.get("ultimo_resultado") if config else None,
        "proxima_ejecucion": calcular_proxima_ejecucion(config) if config else None
    }


def calcular_proxima_ejecucion(config: dict) -> Optional[str]:
    """Calculate next execution time based on config"""
    if not config or not config.get("activa"):
        return None
    
    hora = config.get("hora_verificacion", "07:00")
    frecuencia = config.get("frecuencia", "diaria")
    
    try:
        hora_parts = hora.split(":")
        hora_int = int(hora_parts[0])
        minuto_int = int(hora_parts[1])
        
        ahora = datetime.utcnow()
        proxima = ahora.replace(hour=hora_int, minute=minuto_int, second=0, microsecond=0)
        
        if proxima <= ahora:
            if frecuencia == "diaria":
                proxima += timedelta(days=1)
            elif frecuencia == "cada_12h":
                proxima += timedelta(hours=12)
            elif frecuencia == "cada_6h":
                proxima += timedelta(hours=6)
        
        return proxima.isoformat()
    except:
        return None
