"""
Routes for Audit Logs - Historial de cambios
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from rbac_guards import get_current_user
from services.audit_service import get_audit_history, get_recent_activity

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/history/{collection}/{document_id}")
async def get_document_history(
    collection: str,
    document_id: str,
    limit: int = Query(default=50, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el historial de cambios de un documento específico.
    """
    allowed_collections = ['contratos', 'parcelas', 'tratamientos', 'visitas', 'albaranes']
    
    if collection not in allowed_collections:
        raise HTTPException(status_code=400, detail=f"Colección no permitida: {collection}")
    
    history = await get_audit_history(collection, document_id, limit)
    
    return {
        "success": True,
        "collection": collection,
        "document_id": document_id,
        "history": history,
        "total": len(history)
    }


@router.get("/recent")
async def get_recent_audit_activity(
    collection: Optional[str] = None,
    limit: int = Query(default=20, le=50),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene la actividad reciente de auditoría.
    Solo accesible para administradores.
    """
    if current_user.get('role') != 'Admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver actividad global")
    
    activity = await get_recent_activity(
        collection_name=collection,
        limit=limit
    )
    
    return {
        "success": True,
        "activity": activity,
        "total": len(activity)
    }
