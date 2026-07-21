"""
Email Routes for FRUVECO
Handles email notification endpoints and scheduled tasks.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from email_service import (
    send_email, 
    send_visit_reminder, 
    send_daily_visit_summary,
    send_test_email,
    get_email_template,
    _is_smtp_configured,
    _smtp_config_from_user,
)
from database import visitas_collection, users_collection
from routes_auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class TestEmailRequest(BaseModel):
    email: EmailStr


class NotificationSettings(BaseModel):
    email: EmailStr
    visits_reminder: bool = True
    daily_summary: bool = False
    reminder_days_before: int = 2  # Days before visit to send reminder


# Helper function to serialize MongoDB documents
def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/status")
async def get_notification_status(current_user: dict = Depends(get_current_user)):
    """Estado del servicio de email.
    Prioriza la configuracion SMTP del usuario actual sobre la global (.env).
    """
    user_cfg = _smtp_config_from_user(current_user)
    global_ok = _is_smtp_configured()
    configured = bool(user_cfg) or global_ok
    if user_cfg:
        source = f"Usuario ({user_cfg['from_email']})"
    elif global_ok:
        source = "Global (.env)"
    else:
        source = None
    return {
        "configured": configured,
        "service": "SMTP (Office 365)" if configured else None,
        "source": source,
        "message": (
            f"SMTP configurado via {source}"
            if configured
            else "SMTP no configurado. Configura tus credenciales en tu perfil de usuario."
        ),
    }


@router.post("/test")
async def send_test_notification(
    request: TestEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Envio de email de prueba. Usa la config SMTP del usuario actual
    (si tiene) o hace fallback a la config global .env.
    """
    user_cfg = _smtp_config_from_user(current_user)
    if not user_cfg and not _is_smtp_configured():
        raise HTTPException(
            status_code=503, 
            detail="Servicio de email no configurado. Añade tus credenciales SMTP en tu perfil de usuario o pide al Admin que configure el envío global."
        )

    # Delegate a send_email pasando user para que use su config
    html = get_email_template(
        title="Test de envío",
        content=(
            "<p>Este es un email de prueba enviado desde <b>FRUVECO - Cuaderno de Campo</b>.</p>"
            "<p>Si lo has recibido, la configuración SMTP funciona correctamente.</p>"
        ),
    )
    result = await send_email(
        recipient_email=request.email,
        subject="[FRUVECO] Test de envío SMTP",
        html_content=html,
        user=current_user,
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    
    return {
        "success": True,
        "message": f"Email de prueba enviado a {request.email}",
        "details": result,
    }


@router.post("/send-visit-reminders")
async def trigger_visit_reminders(
    background_tasks: BackgroundTasks,
    days_ahead: int = 3,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger visit reminder emails.
    Sends reminders for visits planned within the next N days.
    """
    if not _is_smtp_configured():
        raise HTTPException(
            status_code=503, 
            detail="Servicio de email no configurado"
        )
    
    # Get visits in the next N days
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = today + timedelta(days=days_ahead)
    
    query = {
        "fecha_planificada": {
            "$gte": today.isoformat(),
            "$lte": end_date.isoformat()
        },
        "realizado": {"$ne": True}
    }
    
    visitas = await visitas_collection.find(query).to_list(100)
    
    if not visitas:
        return {
            "success": True,
            "message": "No hay visitas planificadas en los próximos días",
            "reminders_sent": 0
        }
    
    # For now, send to admin user (in production, you'd send to assigned users)
    admin_user = await users_collection.find_one({"role": "Admin"}, {"_id": 0, "email": 1})
    
    if not admin_user or not admin_user.get("email"):
        return {
            "success": False,
            "message": "No se encontró email de administrador para enviar notificaciones",
            "reminders_sent": 0
        }
    
    admin_email = admin_user["email"]
    sent_count = 0
    errors = []
    
    for visita in visitas:
        fecha_visita = datetime.fromisoformat(visita["fecha_planificada"].replace('Z', '+00:00'))
        dias_restantes = (fecha_visita.date() - today.date()).days
        
        try:
            result = await send_visit_reminder(
                admin_email,
                serialize_doc(visita),
                dias_restantes
            )
            if result["status"] == "success":
                sent_count += 1
            else:
                errors.append(result.get("message", "Unknown error"))
        except Exception as e:
            errors.append(str(e))
    
    return {
        "success": True,
        "message": f"Proceso completado: {sent_count} recordatorios enviados",
        "reminders_sent": sent_count,
        "total_visits": len(visitas),
        "recipient": admin_email,
        "errors": errors if errors else None
    }


@router.post("/send-daily-summary")
async def trigger_daily_summary(
    target_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a daily summary of planned visits.
    If target_date not provided, uses today.
    """
    if not _is_smtp_configured():
        raise HTTPException(
            status_code=503, 
            detail="Servicio de email no configurado"
        )
    
    # Parse date
    if target_date:
        try:
            fecha = datetime.fromisoformat(target_date)
        except:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    else:
        fecha = datetime.now()
    
    fecha_str = fecha.strftime("%Y-%m-%d")
    fecha_display = fecha.strftime("%d/%m/%Y")
    
    # Get visits for that date
    start_of_day = fecha.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = fecha.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    query = {
        "fecha_planificada": {
            "$gte": start_of_day.isoformat(),
            "$lte": end_of_day.isoformat()
        }
    }
    
    visitas = await visitas_collection.find(query).to_list(100)
    visitas_serialized = [serialize_doc(v) for v in visitas]
    
    # Get admin email
    admin_user = await users_collection.find_one({"role": "Admin"}, {"_id": 0, "email": 1})
    
    if not admin_user or not admin_user.get("email"):
        raise HTTPException(
            status_code=404, 
            detail="No se encontró email de administrador"
        )
    
    result = await send_daily_visit_summary(
        admin_user["email"],
        visitas_serialized,
        fecha_display
    )
    
    return {
        "success": result["status"] != "error",
        "message": result.get("message", "Resumen enviado"),
        "date": fecha_display,
        "visits_count": len(visitas),
        "recipient": admin_user["email"]
    }


@router.get("/upcoming-visits")
async def get_upcoming_visits_for_notification(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """Get a preview of visits that would receive notifications"""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = today + timedelta(days=days)
    
    query = {
        "fecha_planificada": {
            "$gte": today.isoformat(),
            "$lte": end_date.isoformat()
        },
        "realizado": {"$ne": True}
    }
    
    visitas = await visitas_collection.find(query, {"_id": 0}).sort("fecha_planificada", 1).to_list(50)
    
    # Add days remaining to each visit
    for v in visitas:
        if v.get("fecha_planificada"):
            fecha_visita = datetime.fromisoformat(v["fecha_planificada"].replace('Z', '+00:00'))
            v["dias_restantes"] = (fecha_visita.date() - today.date()).days
    
    return {
        "visitas": visitas,
        "total": len(visitas),
        "periodo": f"{today.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}"
    }
