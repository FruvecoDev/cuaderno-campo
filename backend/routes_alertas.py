from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from database import db, serialize_docs, serialize_doc, maquinaria_collection
from rbac_guards import get_current_user

router = APIRouter(prefix="/api", tags=["alertas"])

tecnicos_collection = db['tecnicos_aplicadores']
tareas_collection = db['tareas']


@router.get("/alertas/resumen")
async def get_alertas_resumen(current_user: dict = Depends(get_current_user)):
    """Get a summary of all active alerts for the dashboard"""
    hoy = datetime.now().strftime("%Y-%m-%d")
    en_30_dias = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    en_60_dias = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
    en_90_dias = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")

    alertas = []

    # --- Técnicos: certificados vencidos o próximos a vencer ---
    tecnicos = await tecnicos_collection.find(
        {"fecha_validez": {"$exists": True, "$ne": None, "$ne": ""}},
        {"_id": 0, "nombre": 1, "apellidos": 1, "num_carnet": 1, "fecha_validez": 1, "nivel_capacitacion": 1, "activo": 1}
    ).to_list(500)

    tecnicos_vencidos = []
    tecnicos_proximo_30 = []
    tecnicos_proximo_60 = []
    tecnicos_proximo_90 = []

    for t in tecnicos:
        fv = t.get("fecha_validez", "")
        if not fv:
            continue
        nombre = f"{t.get('nombre', '')} {t.get('apellidos', '')}".strip()
        carnet = t.get("num_carnet", "")
        nivel = t.get("nivel_capacitacion", "")
        item = {"nombre": nombre, "num_carnet": carnet, "nivel": nivel, "fecha_validez": fv}

        if fv < hoy:
            item["estado"] = "vencido"
            tecnicos_vencidos.append(item)
        elif fv <= en_30_dias:
            item["estado"] = "proximo_30"
            tecnicos_proximo_30.append(item)
        elif fv <= en_60_dias:
            item["estado"] = "proximo_60"
            tecnicos_proximo_60.append(item)
        elif fv <= en_90_dias:
            item["estado"] = "proximo_90"
            tecnicos_proximo_90.append(item)

    # --- Maquinaria: ITV vencida o próxima ---
    maquinaria_list = await maquinaria_collection.find(
        {"$or": [
            {"fecha_proxima_itv": {"$exists": True, "$ne": None, "$ne": ""}},
            {"fecha_ultimo_mantenimiento": {"$exists": True, "$ne": None, "$ne": ""}}
        ]},
        {"_id": 0, "nombre": 1, "tipo": 1, "matricula": 1, "estado": 1,
         "fecha_proxima_itv": 1, "fecha_ultimo_mantenimiento": 1, "intervalo_mantenimiento_dias": 1}
    ).to_list(500)

    maq_itv_vencida = []
    maq_itv_proximo_30 = []
    maq_mantenimiento_pendiente = []

    for m in maquinaria_list:
        nombre = m.get("nombre", "")
        tipo = m.get("tipo", "")
        matricula = m.get("matricula", "")

        # ITV check
        itv = m.get("fecha_proxima_itv", "")
        if itv:
            item_itv = {"nombre": nombre, "tipo": tipo, "matricula": matricula, "fecha_proxima_itv": itv}
            if itv < hoy:
                item_itv["estado"] = "vencida"
                maq_itv_vencida.append(item_itv)
            elif itv <= en_30_dias:
                item_itv["estado"] = "proximo_30"
                maq_itv_proximo_30.append(item_itv)

        # Maintenance check
        ultimo_mant = m.get("fecha_ultimo_mantenimiento", "")
        intervalo = m.get("intervalo_mantenimiento_dias")
        if ultimo_mant and intervalo:
            try:
                fecha_mant = datetime.strptime(ultimo_mant, "%Y-%m-%d")
                proxima_revision = fecha_mant + timedelta(days=int(intervalo))
                if proxima_revision.strftime("%Y-%m-%d") <= hoy:
                    maq_mantenimiento_pendiente.append({
                        "nombre": nombre, "tipo": tipo, "matricula": matricula,
                        "fecha_ultimo_mantenimiento": ultimo_mant,
                        "fecha_proxima_revision": proxima_revision.strftime("%Y-%m-%d"),
                        "dias_vencido": (datetime.now() - proxima_revision).days,
                        "estado": "pendiente"
                    })
            except (ValueError, TypeError):
                pass

    total_alertas = len(tecnicos_vencidos) + len(tecnicos_proximo_30) + len(maq_itv_vencida) + len(maq_itv_proximo_30) + len(maq_mantenimiento_pendiente)

    return {
        "total_alertas": total_alertas,
        "tecnicos": {
            "vencidos": tecnicos_vencidos,
            "proximo_30": tecnicos_proximo_30,
            "proximo_60": tecnicos_proximo_60,
            "proximo_90": tecnicos_proximo_90,
            "total_criticas": len(tecnicos_vencidos) + len(tecnicos_proximo_30),
        },
        "maquinaria": {
            "itv_vencida": maq_itv_vencida,
            "itv_proximo_30": maq_itv_proximo_30,
            "mantenimiento_pendiente": maq_mantenimiento_pendiente,
            "total_criticas": len(maq_itv_vencida) + len(maq_itv_proximo_30) + len(maq_mantenimiento_pendiente),
        }
    }



class CrearTareaAlertaRequest(BaseModel):
    tipo_alerta: str  # "certificado_tecnico", "itv_maquinaria", "mantenimiento_maquinaria"
    nombre_recurso: str  # Nombre del técnico o maquinaria
    detalle: str  # Descripción de la alerta
    fecha_vencimiento: Optional[str] = None


@router.post("/alertas/crear-tarea")
async def crear_tarea_desde_alerta(
    request: CrearTareaAlertaRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a task from an alert, avoiding duplicates"""
    # Build unique alert key to check for duplicates
    alert_key = f"alerta_{request.tipo_alerta}_{request.nombre_recurso}"

    # Check for existing active task with same alert_key
    existing = await tareas_collection.find_one({
        "alerta_origen": alert_key,
        "estado": {"$in": ["pendiente", "en_progreso"]}
    })

    if existing:
        return {
            "success": False,
            "message": "Ya existe una tarea activa para esta alerta",
            "tarea_id": str(existing["_id"])
        }

    # Build task based on alert type
    tipo_map = {
        "certificado_tecnico": {
            "nombre": f"Renovar certificado - {request.nombre_recurso}",
            "tipo_tarea": "mantenimiento",
            "prioridad": "alta",
            "descripcion": f"ALERTA: {request.detalle}. Es necesario renovar el certificado del tecnico aplicador para mantener la conformidad regulatoria.",
        },
        "itv_maquinaria": {
            "nombre": f"Pasar ITV - {request.nombre_recurso}",
            "tipo_tarea": "mantenimiento",
            "prioridad": "alta",
            "descripcion": f"ALERTA: {request.detalle}. Es necesario pasar la ITV de la maquinaria para cumplir con la normativa vigente.",
        },
        "mantenimiento_maquinaria": {
            "nombre": f"Revision mantenimiento - {request.nombre_recurso}",
            "tipo_tarea": "mantenimiento",
            "prioridad": "media",
            "descripcion": f"ALERTA: {request.detalle}. Se ha superado el intervalo de mantenimiento programado.",
        },
    }

    config = tipo_map.get(request.tipo_alerta)
    if not config:
        raise HTTPException(status_code=400, detail="Tipo de alerta no valido")

    # Set due date: 7 days from now for expired, or the expiration date if in the future
    if request.fecha_vencimiento and request.fecha_vencimiento > datetime.now().strftime("%Y-%m-%d"):
        fecha_limite = request.fecha_vencimiento
    else:
        fecha_limite = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

    tarea = {
        "nombre": config["nombre"],
        "descripcion": config["descripcion"],
        "tipo_tarea": config["tipo_tarea"],
        "prioridad": config["prioridad"],
        "estado": "pendiente",
        "fecha_inicio": datetime.now().strftime("%Y-%m-%d"),
        "fecha_vencimiento": fecha_limite,
        "superficie_tratar": 0,
        "parcelas_ids": [],
        "subtareas": [],
        "coste_estimado": 0,
        "coste_real": 0,
        "realizada": False,
        "alerta_origen": alert_key,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "created_by": str(current_user.get("_id", "")),
    }

    result = await tareas_collection.insert_one(tarea)
    created = await tareas_collection.find_one({"_id": result.inserted_id}, {"_id": 0})

    return {
        "success": True,
        "message": f"Tarea creada: {config['nombre']}",
        "tarea": serialize_doc(created) if created else None
    }


@router.get("/alertas/tareas-existentes")
async def get_tareas_alertas_existentes(
    current_user: dict = Depends(get_current_user)
):
    """Get list of alert_keys that already have active tasks"""
    tareas = await tareas_collection.find(
        {
            "alerta_origen": {"$exists": True, "$ne": None},
            "estado": {"$in": ["pendiente", "en_progreso"]}
        },
        {"_id": 0, "alerta_origen": 1}
    ).to_list(500)

    keys = [t["alerta_origen"] for t in tareas if t.get("alerta_origen")]
    return {"tareas_existentes": keys}
