"""
Routes para el historial de emails enviados.
Cada envio (Evaluacion, Cuaderno de Campo, etc.) queda registrado en la
coleccion `email_logs` para consulta posterior.
"""
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query

from database import db, serialize_docs
from rbac_guards import get_current_user

router = APIRouter(prefix="/api", tags=["email_logs"])

email_logs_collection = db["email_logs"]


async def log_email_sent(
    *,
    entity_type: str,
    entity_id: str,
    parcela_id: Optional[str],
    proveedor_id: Optional[str],
    proveedor_nombre: Optional[str],
    recipients: List[str],
    cc: Optional[List[str]],
    subject: str,
    filename: Optional[str],
    status: str,
    error_message: Optional[str],
    sent_by_id: Optional[str],
    sent_by_email: Optional[str],
    sent_by_name: Optional[str],
) -> None:
    """Registra un envio de email en la coleccion email_logs.
    Nunca lanza excepcion; solo registra un warning si falla.
    """
    import logging
    log = logging.getLogger(__name__)
    try:
        await email_logs_collection.insert_one({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "parcela_id": parcela_id,
            "proveedor_id": proveedor_id,
            "proveedor_nombre": proveedor_nombre,
            "recipients": list(recipients or []),
            "cc": list(cc or []),
            "subject": subject,
            "filename": filename,
            "status": status,
            "error_message": error_message,
            "sent_by_id": sent_by_id,
            "sent_by_email": sent_by_email,
            "sent_by_name": sent_by_name,
            "sent_at": datetime.now(timezone.utc),
        })
    except Exception as exc:
        log.warning("No se pudo registrar email_log: %s", exc)


@router.get("/email-logs")
async def get_email_logs(
    entity_type: Optional[str] = Query(None, description="evaluacion | cuaderno_campo | ..."),
    entity_id: Optional[str] = Query(None, description="ID de la evaluacion o cuaderno"),
    parcela_id: Optional[str] = Query(None, description="Filtrar por parcela"),
    limit: int = Query(200, ge=1, le=2000),
    current_user: dict = Depends(get_current_user),
):
    """Lista los emails enviados. Filtros opcionales por entidad o parcela."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if parcela_id:
        query["parcela_id"] = parcela_id

    docs = await email_logs_collection.find(query).sort("sent_at", -1).to_list(limit)
    return {"logs": serialize_docs(docs), "total": len(docs)}
