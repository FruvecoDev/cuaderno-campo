"""
ERP Sync Bidireccional - Exportación, Webhooks, API Keys, Historial
Complementa routes_erp_integration.py (que maneja ERP → FRUVECO)
Este módulo maneja FRUVECO → ERP (export, webhooks, sync tracking)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import secrets
import hashlib
import httpx

from database import db, serialize_doc, serialize_docs
from routes_auth import get_current_user

router = APIRouter(prefix="/api/erp/sync", tags=["erp-sync"])

# Collections
erp_api_keys_collection = db["erp_api_keys"]
erp_webhooks_collection = db["erp_webhooks"]
erp_sync_log_collection = db["erp_sync_log"]

# Module → collection mapping
MODULE_COLLECTIONS = {
    "contratos": db["contratos"],
    "parcelas": db["parcelas"],
    "fincas": db["fincas"],
    "proveedores": db["proveedores"],
    "clientes": db["clientes"],
    "cultivos": db["cultivos"],
    "visitas": db["visitas"],
    "tareas": db["tareas"],
    "cosechas": db["cosechas"],
    "tratamientos": db["tratamientos"],
    "irrigaciones": db["irrigaciones"],
    "recetas": db["recetas"],
    "albaranes": db["albaranes"],
    "maquinaria": db["maquinaria"],
    "tecnicos_aplicadores": db["tecnicos_aplicadores"],
    "evaluaciones": db["evaluaciones"],
    "agentes": db["agentes"],
}


# === MODELS ===

class APIKeyCreate(BaseModel):
    nombre: str = Field(..., description="Nombre descriptivo de la conexion ERP")
    descripcion: Optional[str] = None
    permisos: List[str] = Field(default=["read", "write"], description="Permisos: read, write, webhook")

class WebhookCreate(BaseModel):
    url: str = Field(..., description="URL del webhook (HTTPS recomendado)")
    nombre: str = Field(..., description="Nombre descriptivo")
    eventos: List[str] = Field(..., description="Eventos: create, update, delete")
    modulos: List[str] = Field(..., description="Modulos a monitorear")
    activo: bool = True
    secret: Optional[str] = Field(None, description="Secret para firma HMAC (se genera automaticamente si no se proporciona)")


# === API KEYS MANAGEMENT ===

@router.get("/api-keys")
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar API keys")
    keys = await erp_api_keys_collection.find({"revocada": {"$ne": True}}).to_list(100)
    result = []
    for k in keys:
        result.append({
            "id": str(k["_id"]),
            "nombre": k.get("nombre"),
            "descripcion": k.get("descripcion"),
            "key_preview": k.get("key_preview"),
            "permisos": k.get("permisos", []),
            "created_at": k.get("created_at", "").isoformat() if isinstance(k.get("created_at"), datetime) else str(k.get("created_at", "")),
            "last_used": k.get("last_used", "").isoformat() if isinstance(k.get("last_used"), datetime) else None,
            "uso_count": k.get("uso_count", 0),
        })
    return {"success": True, "data": result}


@router.post("/api-keys")
async def create_api_key(data: APIKeyCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear API keys")
    
    raw_key = f"fruveco_{secrets.token_urlsafe(32)}"
    hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
    
    doc = {
        "nombre": data.nombre,
        "descripcion": data.descripcion,
        "key_hash": hashed_key,
        "key_preview": raw_key[:12] + "..." + raw_key[-4:],
        "permisos": data.permisos,
        "revocada": False,
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("email"),
        "uso_count": 0,
    }
    result = await erp_api_keys_collection.insert_one(doc)
    
    return {
        "success": True,
        "message": "API Key creada. Guarda la clave, no se mostrara de nuevo.",
        "data": {
            "id": str(result.inserted_id),
            "api_key": raw_key,
            "nombre": data.nombre,
            "permisos": data.permisos,
        }
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden revocar API keys")
    from bson import ObjectId
    result = await erp_api_keys_collection.update_one(
        {"_id": ObjectId(key_id)},
        {"$set": {"revocada": True, "revocada_at": datetime.now(timezone.utc), "revocada_by": current_user.get("email")}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="API Key no encontrada")
    return {"success": True, "message": "API Key revocada"}


# === WEBHOOKS MANAGEMENT ===

@router.get("/webhooks")
async def list_webhooks(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    webhooks = await erp_webhooks_collection.find().to_list(100)
    result = []
    for w in webhooks:
        result.append({
            "id": str(w["_id"]),
            "url": w.get("url"),
            "nombre": w.get("nombre"),
            "eventos": w.get("eventos", []),
            "modulos": w.get("modulos", []),
            "activo": w.get("activo", True),
            "secret_preview": (w.get("secret", "")[:8] + "...") if w.get("secret") else None,
            "created_at": w.get("created_at", "").isoformat() if isinstance(w.get("created_at"), datetime) else str(w.get("created_at", "")),
            "last_triggered": w.get("last_triggered", "").isoformat() if isinstance(w.get("last_triggered"), datetime) else None,
            "trigger_count": w.get("trigger_count", 0),
            "last_status": w.get("last_status"),
        })
    return {"success": True, "data": result}


@router.post("/webhooks")
async def create_webhook(data: WebhookCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    
    webhook_secret = data.secret or secrets.token_urlsafe(24)
    
    doc = {
        "url": data.url,
        "nombre": data.nombre,
        "eventos": data.eventos,
        "modulos": data.modulos,
        "activo": data.activo,
        "secret": webhook_secret,
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("email"),
        "trigger_count": 0,
    }
    result = await erp_webhooks_collection.insert_one(doc)
    
    return {
        "success": True,
        "message": "Webhook registrado",
        "data": {
            "id": str(result.inserted_id),
            "nombre": data.nombre,
            "url": data.url,
            "secret": webhook_secret,
        }
    }


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    from bson import ObjectId
    result = await erp_webhooks_collection.delete_one({"_id": ObjectId(webhook_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook no encontrado")
    return {"success": True, "message": "Webhook eliminado"}


@router.post("/webhooks/{webhook_id}/toggle")
async def toggle_webhook(webhook_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    from bson import ObjectId
    webhook = await erp_webhooks_collection.find_one({"_id": ObjectId(webhook_id)})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook no encontrado")
    new_state = not webhook.get("activo", True)
    await erp_webhooks_collection.update_one(
        {"_id": ObjectId(webhook_id)},
        {"$set": {"activo": new_state}}
    )
    return {"success": True, "activo": new_state}


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(webhook_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    from bson import ObjectId
    webhook = await erp_webhooks_collection.find_one({"_id": ObjectId(webhook_id)})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook no encontrado")
    
    test_payload = {
        "event": "test",
        "module": "system",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {"message": "Test webhook desde FRUVECO"},
    }
    
    signature = hashlib.sha256(
        (webhook.get("secret", "") + str(test_payload)).encode()
    ).hexdigest()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                webhook["url"],
                json=test_payload,
                headers={
                    "X-Webhook-Signature": signature,
                    "X-Webhook-Event": "test",
                    "Content-Type": "application/json",
                }
            )
        status = resp.status_code
        success = 200 <= status < 300
    except Exception as e:
        status = 0
        success = False
    
    await erp_webhooks_collection.update_one(
        {"_id": ObjectId(webhook_id)},
        {"$set": {"last_triggered": datetime.now(timezone.utc), "last_status": status},
         "$inc": {"trigger_count": 1}}
    )
    
    return {
        "success": success,
        "status_code": status,
        "message": "Webhook enviado correctamente" if success else f"Error al enviar webhook (status: {status})",
    }


# === BULK EXPORT (FRUVECO → ERP) ===

@router.get("/export/{module}")
async def export_module_data(
    module: str,
    desde: Optional[str] = Query(None, description="Fecha desde (YYYY-MM-DD)"),
    hasta: Optional[str] = Query(None, description="Fecha hasta (YYYY-MM-DD)"),
    modificados_desde: Optional[str] = Query(None, description="Solo registros modificados desde (YYYY-MM-DD)"),
    limite: int = Query(1000, le=5000),
    pagina: int = Query(1, ge=1),
    current_user: dict = Depends(get_current_user),
):
    if module not in MODULE_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Modulo no valido. Disponibles: {list(MODULE_COLLECTIONS.keys())}")
    
    collection = MODULE_COLLECTIONS[module]
    query = {}
    
    if desde or hasta:
        date_filter = {}
        if desde:
            date_filter["$gte"] = desde
        if hasta:
            date_filter["$lte"] = hasta
        date_field = "fecha_contrato" if module == "contratos" else "fecha_visita" if module == "visitas" else "created_at"
        query[date_field] = date_filter
    
    if modificados_desde:
        query["updated_at"] = {"$gte": datetime.fromisoformat(modificados_desde)}
    
    skip = (pagina - 1) * limite
    total = await collection.count_documents(query)
    docs = await collection.find(query, {"_id": 0}).skip(skip).limit(limite).to_list(limite)
    
    # Serializar ObjectId en subdocumentos
    for doc in docs:
        for key, val in list(doc.items()):
            if hasattr(val, '__str__') and type(val).__name__ == 'ObjectId':
                doc[key] = str(val)
            elif isinstance(val, datetime):
                doc[key] = val.isoformat()
    
    # Log de sync
    await erp_sync_log_collection.insert_one({
        "tipo": "export",
        "modulo": module,
        "registros": len(docs),
        "total_disponible": total,
        "filtros": {"desde": desde, "hasta": hasta, "modificados_desde": modificados_desde},
        "usuario": current_user.get("email"),
        "timestamp": datetime.now(timezone.utc),
    })
    
    return {
        "success": True,
        "module": module,
        "total": total,
        "pagina": pagina,
        "limite": limite,
        "paginas_total": (total + limite - 1) // limite,
        "data": docs,
    }


@router.get("/export-modules")
async def list_export_modules(current_user: dict = Depends(get_current_user)):
    modules = []
    for name, coll in MODULE_COLLECTIONS.items():
        count = await coll.count_documents({})
        modules.append({"module": name, "registros": count})
    return {"success": True, "modules": modules}


# === SYNC HISTORY ===

@router.get("/history")
async def get_sync_history(
    tipo: Optional[str] = Query(None, description="Filtrar por tipo: export, webhook, import"),
    modulo: Optional[str] = Query(None, description="Filtrar por modulo"),
    limite: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user),
):
    query = {}
    if tipo:
        query["tipo"] = tipo
    if modulo:
        query["modulo"] = modulo
    
    logs = await erp_sync_log_collection.find(query).sort("timestamp", -1).limit(limite).to_list(limite)
    result = []
    for log in logs:
        result.append({
            "id": str(log["_id"]),
            "tipo": log.get("tipo"),
            "modulo": log.get("modulo"),
            "registros": log.get("registros"),
            "usuario": log.get("usuario"),
            "estado": log.get("estado", "completado"),
            "detalle": log.get("detalle"),
            "timestamp": log.get("timestamp", "").isoformat() if isinstance(log.get("timestamp"), datetime) else str(log.get("timestamp", "")),
        })
    return {"success": True, "data": result}


@router.get("/stats")
async def get_sync_stats(current_user: dict = Depends(get_current_user)):
    total_keys = await erp_api_keys_collection.count_documents({"revocada": {"$ne": True}})
    total_webhooks = await erp_webhooks_collection.count_documents({})
    webhooks_activos = await erp_webhooks_collection.count_documents({"activo": True})
    total_syncs = await erp_sync_log_collection.count_documents({})
    
    recent = await erp_sync_log_collection.find().sort("timestamp", -1).limit(1).to_list(1)
    last_sync = recent[0].get("timestamp", "").isoformat() if recent and isinstance(recent[0].get("timestamp"), datetime) else None
    
    return {
        "success": True,
        "stats": {
            "api_keys_activas": total_keys,
            "webhooks_total": total_webhooks,
            "webhooks_activos": webhooks_activos,
            "sincronizaciones_total": total_syncs,
            "ultima_sincronizacion": last_sync,
        }
    }


# === WEBHOOK DISPATCHER (utility function) ===

async def dispatch_webhook(event: str, module: str, data: dict):
    """Fire webhooks for a given event. Called from other routes after CRUD ops."""
    webhooks = await erp_webhooks_collection.find({
        "activo": True,
        "eventos": event,
        "modulos": module,
    }).to_list(50)
    
    for wh in webhooks:
        payload = {
            "event": event,
            "module": module,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        signature = hashlib.sha256(
            (wh.get("secret", "") + str(payload)).encode()
        ).hexdigest()
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    wh["url"],
                    json=payload,
                    headers={
                        "X-Webhook-Signature": signature,
                        "X-Webhook-Event": event,
                    }
                )
            status = resp.status_code
        except Exception:
            status = 0
        
        await erp_webhooks_collection.update_one(
            {"_id": wh["_id"]},
            {"$set": {"last_triggered": datetime.now(timezone.utc), "last_status": status},
             "$inc": {"trigger_count": 1}}
        )
        
        await erp_sync_log_collection.insert_one({
            "tipo": "webhook",
            "modulo": module,
            "evento": event,
            "webhook_url": wh["url"],
            "estado": "ok" if 200 <= status < 300 else "error",
            "status_code": status,
            "timestamp": datetime.now(timezone.utc),
        })
