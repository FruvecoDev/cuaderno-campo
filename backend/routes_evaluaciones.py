from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field
import os
import uuid
import shutil

from database import db, serialize_doc, serialize_docs, parcelas_collection
from rbac_guards import RequireCreate, RequireEdit, RequireDelete, get_current_user

router = APIRouter(prefix="/api", tags=["evaluaciones"])

# Collection
evaluaciones_collection = db['evaluaciones']
evaluaciones_config_collection = db['evaluaciones_config']

# ============================================================================
# MODELS
# ============================================================================

class SeccionRespuesta(BaseModel):
    pregunta_id: str
    pregunta: str
    respuesta: Any  # Puede ser str, int, bool, etc.
    tipo: str = "texto"  # texto, numero, si_no, fecha

class EvaluacionCreate(BaseModel):
    parcela_id: str  # OBLIGATORIO - define el contexto
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tecnico: Optional[str] = None
    
    # Secciones con respuestas
    toma_datos: Optional[List[Dict[str, Any]]] = []
    impresos: Optional[Dict[str, Any]] = {}
    analisis_suelo: Optional[List[Dict[str, Any]]] = []
    pasos_precampana: Optional[List[Dict[str, Any]]] = []
    calidad_cepellones: Optional[List[Dict[str, Any]]] = []
    inspeccion_maquinaria: Optional[List[Dict[str, Any]]] = []
    observaciones: Optional[List[Dict[str, Any]]] = []
    calibracion_mantenimiento: Optional[List[Dict[str, Any]]] = []
    # Mapa completo de respuestas por sección — espejo de los campos top-level.
    # El frontend lo usa para releer todas las respuestas en handleEdit, así que
    # debemos persistirlo aunque sea redundante con los campos top-level.
    secciones: Optional[Dict[str, Any]] = {}

class PreguntaConfig(BaseModel):
    seccion: str
    pregunta: str
    tipo: str = "texto"  # texto, numero, si_no, fecha, seleccion
    opciones: Optional[List[str]] = None
    orden: int = 0
    activa: bool = True

# ============================================================================
# PREGUNTAS POR DEFECTO
# ============================================================================

PREGUNTAS_DEFAULT = {
    "toma_datos": [
        {"id": "td_1", "pregunta": "¿Se mantiene limpia la finca?", "tipo": "si_no"},
        {"id": "td_2", "pregunta": "¿En el campo hay colocados cubos de basura permanentes o móviles?", "tipo": "si_no"},
        {"id": "td_3", "pregunta": "¿Los cubos de basura se vacían de forma regular?", "tipo": "si_no"},
        {"id": "td_4", "pregunta": "¿Se recoge la basura generada durante los procesos de plantación y recolección?", "tipo": "si_no"},
        {"id": "td_5", "pregunta": "¿En qué condiciones se mantienen los márgenes de los campos?", "tipo": "texto"},
        {"id": "td_6", "pregunta": "¿Las parcelas de cultivo se mantienen limpias de malas hierbas?", "tipo": "si_no"},
        {"id": "td_7", "pregunta": "¿Qué método se ha utilizado para eliminar las malas hierbas?", "tipo": "texto"},
        {"id": "td_8", "pregunta": "En caso de utilización de herbicida, ¿su uso está anotado en el parte de tratamientos fitosanitarios y archivado?", "tipo": "si_no"},
        {"id": "td_9", "pregunta": "¿El ganado pasa por el campo entre cultivos?", "tipo": "si_no"},
        {"id": "td_10", "pregunta": "¿La finca dispone de botiquín completo debidamente señalizado en cada caseta de riego?", "tipo": "si_no"},
    ],
    "analisis_suelo": [
        {"id": "as_1", "pregunta": "¿Se ha archivado la hoja de los resultados de análisis con este impreso?", "tipo": "si_no"},
        {"id": "as_2", "pregunta": "Medidas tomadas como consecuencia de los resultados de los análisis", "tipo": "texto"},
        {"id": "as_3", "pregunta": "¿Los paquetes/envases de semillas están archivados?", "tipo": "si_no"},
        {"id": "as_4", "pregunta": "Este lote en el momento de entrega estaba libre de síntomas de:", "tipo": "texto"},
    ],
    "calidad_cepellones": [
        {"id": "cc_1", "pregunta": "Nº de referencia de lote de cepellones", "tipo": "texto"},
        {"id": "cc_2", "pregunta": "¿Los paquetes/envases de semillas están archivados con este impreso?", "tipo": "si_no"},
        {"id": "cc_3", "pregunta": "¿El semillero ha suministrado un certificado de sanidad vegetal?", "tipo": "si_no"},
        {"id": "cc_4", "pregunta": "Si existe el certificado de sanidad, ¿está archivado con este impreso?", "tipo": "si_no"},
        {"id": "cc_5", "pregunta": "Este lote en el momento de entrega estaba libre de síntomas de:", "tipo": "texto"},
    ],
    "inspeccion_maquinaria": [
        {"id": "im_1", "pregunta": "Tipo de maquinaria", "tipo": "texto"},
        {"id": "im_2", "pregunta": "Modelo", "tipo": "texto"},
        {"id": "im_3", "pregunta": "¿Se ha realizado la limpieza de los filtros?", "tipo": "si_no"},
        {"id": "im_4", "pregunta": "¿Se ha comprobado el estado de la maquinaria?", "tipo": "si_no"},
        {"id": "im_5", "pregunta": "¿Se han cambiado los diafragmas?", "tipo": "si_no"},
        {"id": "im_6", "pregunta": "¿Se han revisado todas las conexiones?", "tipo": "si_no"},
    ],
    "calibracion_mantenimiento": [
        {"id": "cm_1", "pregunta": "Vaso", "tipo": "texto"},
        {"id": "cm_2", "pregunta": "Peso", "tipo": "texto"},
    ],
    "observaciones": [
        {"id": "obs_1", "pregunta": "Observaciones generales", "tipo": "texto"},
    ],
    "pasos_precampana": []
}

# ============================================================================
# CRUD EVALUACIONES
# ============================================================================

# ----------------------------------------------------------------------------
# Anexos (Impresos) — File uploads attached to an evaluación's impresos.
# Stored under /app/uploads/evaluaciones/anexos/<uuid>__<filename> and served
# via the global StaticFiles mount at /api/uploads.
# ----------------------------------------------------------------------------

ANEXOS_DIR = "/app/uploads/evaluaciones/anexos"
os.makedirs(ANEXOS_DIR, exist_ok=True)

ALLOWED_ANEXO_TYPES = {
    "application/pdf",
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_ANEXO_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB


@router.post("/evaluaciones/anexos/upload")
async def upload_evaluacion_anexo(
    file: UploadFile = File(...),
    current_user: dict = Depends(RequireCreate),
):
    """Subir un anexo (PDF / imagen / documento) para una hoja de evaluación.

    Devuelve metadatos `{filename, url, size, content_type, uploaded_at}` que
    el frontend debe guardar en `impresos.<seccion>.anexo` al persistir la
    evaluación.
    """
    if file.content_type not in ALLOWED_ANEXO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido ({file.content_type}). Use PDF, imagen o documento Office.",
        )

    original = file.filename or "anexo"
    safe_name = "".join(c for c in original if c.isalnum() or c in (".", "_", "-"))[-80:]
    stored_name = f"{uuid.uuid4().hex}__{safe_name}"
    file_path = os.path.join(ANEXOS_DIR, stored_name)

    size = 0
    with open(file_path, "wb") as buffer:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_ANEXO_SIZE_BYTES:
                buffer.close()
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                raise HTTPException(status_code=413, detail="El archivo supera el tamaño máximo permitido (15 MB).")
            buffer.write(chunk)

    return {
        "success": True,
        "data": {
            "filename": original,
            "stored_name": stored_name,
            "url": f"/api/uploads/evaluaciones/anexos/{stored_name}",
            "size": size,
            "content_type": file.content_type,
            "uploaded_at": datetime.now().isoformat(),
            "uploaded_by": current_user.get("username") or current_user.get("email") or "",
        },
    }


@router.delete("/evaluaciones/anexos/{stored_name}")
async def delete_evaluacion_anexo(
    stored_name: str,
    current_user: dict = Depends(RequireDelete),
):
    """Eliminar un anexo subido previamente. `stored_name` es el nombre con UUID."""
    # Defence: prevent path traversal — only basenames allowed
    if "/" in stored_name or ".." in stored_name:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")
    path = os.path.join(ANEXOS_DIR, stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Anexo no encontrado")
    try:
        os.remove(path)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar el anexo: {e}")
    return {"success": True}




@router.post("/evaluaciones", response_model=dict)
async def create_evaluacion(
    evaluacion: EvaluacionCreate,
    current_user: dict = Depends(RequireCreate)
):
    """Crear nueva hoja de evaluación"""
    if not evaluacion.parcela_id:
        raise HTTPException(status_code=400, detail="parcela_id es obligatorio")
    
    if not ObjectId.is_valid(evaluacion.parcela_id):
        raise HTTPException(status_code=400, detail="parcela_id inválido")
    
    # Obtener datos de la parcela
    parcela = await parcelas_collection.find_one({"_id": ObjectId(evaluacion.parcela_id)})
    if not parcela:
        raise HTTPException(status_code=400, detail="Parcela no encontrada")
    
    # Construir documento con datos heredados de parcela
    evaluacion_dict = {
        "parcela_id": evaluacion.parcela_id,
        "fecha_inicio": evaluacion.fecha_inicio or datetime.now().strftime("%Y-%m-%d"),
        "fecha_fin": evaluacion.fecha_fin,
        "tecnico": evaluacion.tecnico or current_user.get("full_name", current_user.get("username", "")),
        
        # Datos heredados de parcela
        "proveedor": parcela.get("proveedor", ""),
        "codigo_plantacion": parcela.get("codigo_plantacion", ""),
        "finca": parcela.get("finca", ""),
        "cultivo": parcela.get("cultivo", ""),
        "variedad": parcela.get("variedad", ""),
        "superficie": parcela.get("superficie_total", 0),
        "campana": parcela.get("campana", ""),
        "contrato_id": parcela.get("contrato_id", ""),
        
        # Secciones de cuestionarios
        "toma_datos": evaluacion.toma_datos or [],
        "impresos": evaluacion.impresos or {
            "fecha_inicio": evaluacion.fecha_inicio,
            "fecha_fin": evaluacion.fecha_fin,
            "tecnico": evaluacion.tecnico
        },
        "analisis_suelo": evaluacion.analisis_suelo or [],
        "pasos_precampana": evaluacion.pasos_precampana or [],
        "calidad_cepellones": evaluacion.calidad_cepellones or [],
        "inspeccion_maquinaria": evaluacion.inspeccion_maquinaria or [],
        "observaciones": evaluacion.observaciones or [],
        "calibracion_mantenimiento": evaluacion.calibracion_mantenimiento or [],
        # Mapa completo de respuestas — espejo de los campos top-level.
        # Persistirlo es lo que permite a handleEdit del frontend releer las
        # respuestas con un único Object.values(secciones).
        "secciones": evaluacion.secciones if evaluacion.secciones else {
            "toma_datos": evaluacion.toma_datos or [],
            "analisis_suelo": evaluacion.analisis_suelo or [],
            "pasos_precampana": evaluacion.pasos_precampana or [],
            "calidad_cepellones": evaluacion.calidad_cepellones or [],
            "inspeccion_maquinaria": evaluacion.inspeccion_maquinaria or [],
            "observaciones": evaluacion.observaciones or [],
            "calibracion_mantenimiento": evaluacion.calibracion_mantenimiento or [],
        },

        # Metadatos
        "estado": "borrador",  # borrador, completada, archivada
        "created_by": str(current_user.get("_id", "")),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await evaluaciones_collection.insert_one(evaluacion_dict)
    created = await evaluaciones_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/evaluaciones")
async def get_evaluaciones(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    campana: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar hojas de evaluación"""
    query = {}
    if parcela_id:
        query["parcela_id"] = parcela_id
    if campana:
        query["campana"] = campana
    if estado:
        query["estado"] = estado
    
    evaluaciones = await evaluaciones_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await evaluaciones_collection.count_documents(query)
    
    return {"evaluaciones": serialize_docs(evaluaciones), "total": total}


@router.get("/evaluaciones/{evaluacion_id}")
async def get_evaluacion(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una hoja de evaluación por ID"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    evaluacion = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    return serialize_doc(evaluacion)


@router.put("/evaluaciones/{evaluacion_id}")
async def update_evaluacion(
    evaluacion_id: str,
    evaluacion: EvaluacionCreate,
    current_user: dict = Depends(RequireEdit)
):
    """Actualizar hoja de evaluación"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    update_data = {
        "fecha_inicio": evaluacion.fecha_inicio,
        "fecha_fin": evaluacion.fecha_fin,
        "tecnico": evaluacion.tecnico,
        "toma_datos": evaluacion.toma_datos or [],
        "impresos": evaluacion.impresos or {},
        "analisis_suelo": evaluacion.analisis_suelo or [],
        "pasos_precampana": evaluacion.pasos_precampana or [],
        "calidad_cepellones": evaluacion.calidad_cepellones or [],
        "inspeccion_maquinaria": evaluacion.inspeccion_maquinaria or [],
        "observaciones": evaluacion.observaciones or [],
        "calibracion_mantenimiento": evaluacion.calibracion_mantenimiento or [],
        # Mapa completo {seccion: [respuestas]} — usado por el frontend en handleEdit
        # para releer todas las respuestas. Si el cliente envía un objeto vacío,
        # reconstruimos el mapa desde los campos top-level para no perder datos.
        "secciones": evaluacion.secciones if evaluacion.secciones else {
            "toma_datos": evaluacion.toma_datos or [],
            "analisis_suelo": evaluacion.analisis_suelo or [],
            "pasos_precampana": evaluacion.pasos_precampana or [],
            "calidad_cepellones": evaluacion.calidad_cepellones or [],
            "inspeccion_maquinaria": evaluacion.inspeccion_maquinaria or [],
            "observaciones": evaluacion.observaciones or [],
            "calibracion_mantenimiento": evaluacion.calibracion_mantenimiento or [],
        },
        "updated_at": datetime.now()
    }
    
    result = await evaluaciones_collection.update_one(
        {"_id": ObjectId(evaluacion_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    updated = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.patch("/evaluaciones/{evaluacion_id}/estado")
async def update_evaluacion_estado(
    evaluacion_id: str,
    estado: str,
    current_user: dict = Depends(RequireEdit)
):
    """Cambiar estado de la evaluación"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    if estado not in ["borrador", "completada", "archivada"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    result = await evaluaciones_collection.update_one(
        {"_id": ObjectId(evaluacion_id)},
        {"$set": {"estado": estado, "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    return {"success": True, "message": f"Estado actualizado a {estado}"}


@router.delete("/evaluaciones/{evaluacion_id}")
async def delete_evaluacion(
    evaluacion_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar hoja de evaluación"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await evaluaciones_collection.delete_one({"_id": ObjectId(evaluacion_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    return {"success": True, "message": "Evaluación eliminada"}


# ============================================================================
# CONFIGURACIÓN DE PREGUNTAS (Para admins)
# ============================================================================

@router.get("/evaluaciones/config/preguntas")
async def get_preguntas_config(
    current_user: dict = Depends(get_current_user)
):
    """Obtener configuración de preguntas (default + personalizadas), filtrando las ocultas
    y aplicando, si existe, un orden global plano (`orden_global`)."""
    custom_preguntas = await evaluaciones_config_collection.find_one({"tipo": "preguntas"})

    hidden_map = (custom_preguntas or {}).get("hidden", {}) if custom_preguntas else {}
    orden_global = (custom_preguntas or {}).get("orden_global", []) if custom_preguntas else []

    if custom_preguntas:
        result = {}
        for seccion, preguntas in PREGUNTAS_DEFAULT.items():
            hidden_ids = set(hidden_map.get(seccion, []))
            result[seccion] = [p for p in preguntas if p.get("id") not in hidden_ids]
            if seccion in custom_preguntas.get("secciones", {}):
                custom_list = custom_preguntas["secciones"][seccion]
                result[seccion].extend([p for p in custom_list if p.get("id") not in hidden_ids])

        # Aplicar orden_global si existe: reordena cada sección según las
        # posiciones globales. IDs no presentes en orden_global mantienen su
        # orden relativo al final de la sección.
        if orden_global:
            pos_map = {pid: idx for idx, pid in enumerate(orden_global)}
            for seccion, lst in result.items():
                result[seccion] = sorted(
                    lst,
                    key=lambda p: pos_map.get(p.get("id"), 10_000 + lst.index(p)),
                )

        return {
            "preguntas": result,
            "custom": custom_preguntas.get("secciones", {}),
            "hidden": hidden_map,
            "orden_global": orden_global,
        }

    return {"preguntas": PREGUNTAS_DEFAULT, "custom": {}, "hidden": {}, "orden_global": []}


@router.post("/evaluaciones/config/preguntas")
async def add_pregunta_config(
    payload: dict,
    current_user: dict = Depends(RequireCreate)
):
    """Agregar nueva pregunta personalizada a una sección.

    Body: { seccion: str, pregunta: str, tipo?: "texto"|"numero"|"si_no"|"fecha" }
    """
    # Verificar permisos (solo Admin o Manager)
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin o Manager pueden agregar preguntas")

    seccion = (payload or {}).get("seccion", "")
    pregunta = (payload or {}).get("pregunta", "")
    tipo = (payload or {}).get("tipo", "texto") or "texto"
    if not seccion or not isinstance(seccion, str):
        raise HTTPException(status_code=422, detail="Campo 'seccion' requerido")
    if not pregunta or not isinstance(pregunta, str) or not pregunta.strip():
        raise HTTPException(status_code=422, detail="Campo 'pregunta' requerido")
    pregunta = pregunta.strip()

    secciones_validas = list(PREGUNTAS_DEFAULT.keys())
    if seccion not in secciones_validas:
        raise HTTPException(status_code=400, detail=f"Sección inválida. Opciones: {secciones_validas}")

    tipos_validos = ["texto", "numero", "si_no", "fecha"]
    if tipo not in tipos_validos:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Opciones: {tipos_validos}")

    # Generar ID único para la pregunta
    pregunta_id = f"custom_{seccion}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    
    nueva_pregunta = {
        "id": pregunta_id,
        "pregunta": pregunta,
        "tipo": tipo,
        "created_by": str(current_user.get("_id", "")),
        "created_at": datetime.now().isoformat()
    }
    
    # Actualizar o crear configuración
    await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {
            "$push": {f"secciones.{seccion}": nueva_pregunta},
            "$set": {"updated_at": datetime.now()}
        },
        upsert=True
    )
    
    return {"success": True, "pregunta": nueva_pregunta}


@router.delete("/evaluaciones/config/preguntas/{pregunta_id}")
async def delete_pregunta_config(
    pregunta_id: str,
    seccion: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar (u ocultar) una pregunta.

    - Preguntas personalizadas (id `custom_*`): se eliminan físicamente del array.
    - Preguntas predeterminadas (default): se añaden a `hidden[seccion]` para
      excluirlas del cuestionario sin perder la definición original. Permite
      restaurarlas en el futuro vaciando la lista.
    """
    if current_user.get("role") not in ["Admin"]:
        raise HTTPException(status_code=403, detail="Solo Admin puede eliminar preguntas")

    secciones_validas = list(PREGUNTAS_DEFAULT.keys())
    if seccion not in secciones_validas:
        raise HTTPException(status_code=400, detail=f"Sección inválida. Opciones: {secciones_validas}")

    if pregunta_id.startswith("custom_"):
        # Pregunta personalizada: eliminar físicamente
        await evaluaciones_config_collection.update_one(
            {"tipo": "preguntas"},
            {"$pull": {f"secciones.{seccion}": {"id": pregunta_id}}}
        )
        return {"success": True, "message": "Pregunta personalizada eliminada"}

    # Pregunta predeterminada: añadir al listado de ocultas (idempotente)
    await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {
            "$addToSet": {f"hidden.{seccion}": pregunta_id},
            "$set": {"updated_at": datetime.now()},
        },
        upsert=True,
    )
    return {"success": True, "message": "Pregunta predeterminada ocultada"}


@router.post("/evaluaciones/config/preguntas/restore")
async def restore_pregunta_config(
    pregunta_id: str,
    seccion: str,
    current_user: dict = Depends(RequireEdit)
):
    """Restaurar una pregunta predeterminada previamente ocultada."""
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin o Manager pueden restaurar preguntas")

    secciones_validas = list(PREGUNTAS_DEFAULT.keys())
    if seccion not in secciones_validas:
        raise HTTPException(status_code=400, detail=f"Sección inválida. Opciones: {secciones_validas}")

    await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {
            "$pull": {f"hidden.{seccion}": pregunta_id},
            "$set": {"updated_at": datetime.now()},
        },
    )
    return {"success": True, "message": "Pregunta restaurada"}


@router.put("/evaluaciones/config/preguntas/reorder")
async def reorder_preguntas(
    payload: dict,
    current_user: dict = Depends(RequireEdit)
):
    """Reordena preguntas (default y custom) usando un orden global plano.

    Acepta DOS formatos para mantener compatibilidad:
      - {"orden_global": [id1, id2, ...]}  → guarda un orden plano único que se
        aplica a la lista combinada de TODAS las preguntas.
      - {"seccion": "toma_datos", "orden": [...]}  → modo antiguo, reordena
        solo customs dentro de una sección (sigue funcionando).
    """
    orden_global = (payload or {}).get("orden_global")
    if isinstance(orden_global, list) and orden_global:
        # Validar que cada id sea str
        ids = [str(i) for i in orden_global if i]
        await evaluaciones_config_collection.update_one(
            {"tipo": "preguntas"},
            {
                "$set": {
                    "orden_global": ids,
                    "updated_at": datetime.now(),
                }
            },
            upsert=True,
        )
        return {"success": True, "message": "Orden global guardado", "count": len(ids)}

    # --- Legacy mode: por sección ---
    seccion = (payload or {}).get("seccion") or ""
    orden = (payload or {}).get("orden") or []
    secciones_validas = list(PREGUNTAS_DEFAULT.keys())
    if seccion not in secciones_validas:
        raise HTTPException(status_code=400, detail="Seccion invalida")
    config = await evaluaciones_config_collection.find_one({"tipo": "preguntas"})
    if not config:
        return {"success": True, "message": "No hay preguntas personalizadas para reordenar"}
    secciones = config.get("secciones", {})
    preguntas_seccion = secciones.get(seccion, [])
    custom_preguntas = [p for p in preguntas_seccion if p.get("id", "").startswith("custom_")]
    preguntas_dict = {p["id"]: p for p in custom_preguntas}
    nuevas_preguntas = []
    for pregunta_id in orden:
        if pregunta_id in preguntas_dict:
            nuevas_preguntas.append(preguntas_dict[pregunta_id])
    ids_en_orden = set(orden)
    for p in custom_preguntas:
        if p["id"] not in ids_en_orden:
            nuevas_preguntas.append(p)
    await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {"$set": {f"secciones.{seccion}": nuevas_preguntas}}
    )
    return {"success": True, "message": "Orden actualizado", "preguntas": nuevas_preguntas}


@router.put("/evaluaciones/config/preguntas/{pregunta_id}")
async def update_pregunta_config(
    pregunta_id: str,
    data: dict,
    current_user: dict = Depends(RequireEdit)
):
    """Editar pregunta personalizada"""
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin/Manager puede editar preguntas")
    if not pregunta_id.startswith("custom_"):
        raise HTTPException(status_code=400, detail="Solo se pueden editar preguntas personalizadas")
    
    nueva_pregunta = data.get("pregunta", "").strip()
    nuevo_tipo = data.get("tipo", "texto")
    if not nueva_pregunta:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacia")
    
    config = await evaluaciones_config_collection.find_one({"tipo": "preguntas"})
    if not config:
        raise HTTPException(status_code=404, detail="Configuracion no encontrada")
    
    updated = False
    secciones = config.get("secciones", {})
    for seccion_key, preguntas in secciones.items():
        for i, p in enumerate(preguntas):
            if p.get("id") == pregunta_id:
                secciones[seccion_key][i]["pregunta"] = nueva_pregunta
                secciones[seccion_key][i]["tipo"] = nuevo_tipo
                updated = True
                break
        if updated:
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    
    await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {"$set": {"secciones": secciones}}
    )
    
    return {"success": True, "message": "Pregunta actualizada"}






@router.get("/evaluaciones/export/pdf")
async def export_evaluaciones_pdf(
    current_user: dict = Depends(get_current_user)
):
    """Export evaluaciones to PDF"""
    from fastapi.responses import StreamingResponse
    import io as _io
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    evaluaciones_list = await evaluaciones_collection.find({}).sort("created_at", -1).to_list(5000)
    evaluaciones_raw = serialize_docs(evaluaciones_list)

    output = _io.BytesIO()
    pdf = SimpleDocTemplate(output, pagesize=landscape(A4), topMargin=15*mm, bottomMargin=15*mm)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, textColor=colors.HexColor('#4A148C'), alignment=1, spaceAfter=8*mm)
    elements.append(Paragraph("Hojas de Evaluacion - FRUVECO", title_style))
    elements.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ParagraphStyle('Sub', parent=styles['Normal'], alignment=1, textColor=colors.gray)))
    elements.append(Spacer(1, 8*mm))

    table_data = [["Parcela", "Cultivo", "Proveedor", "Campana", "Estado", "Tecnico", "Fecha"]]
    for e in evaluaciones_raw:
        table_data.append([
            e.get("codigo_plantacion", "")[:20],
            e.get("cultivo", "")[:15],
            e.get("proveedor", "")[:20],
            e.get("campana", "")[:10],
            e.get("estado", "")[:12],
            e.get("tecnico", "")[:20],
            e.get("created_at", "")[:10] if e.get("created_at") else "",
        ])

    col_widths = [40*mm, 30*mm, 40*mm, 25*mm, 25*mm, 40*mm, 25*mm]
    doc_table = Table(table_data, colWidths=col_widths)
    doc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4A148C')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F3E5F5')]),
    ]))
    elements.append(doc_table)

    pdf.build(elements)
    output.seek(0)
    filename = f"evaluaciones_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(output, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


# ============================================================================
# GENERACIÓN DE PDF - CON VISITAS Y TRATAMIENTOS
# ============================================================================

@router.get("/evaluaciones/{evaluacion_id}/pdf")
async def generate_evaluacion_pdf(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generar PDF de la hoja de evaluación con visitas y tratamientos"""
    from fastapi.responses import Response
    from weasyprint import HTML
    from database import visitas_collection, tratamientos_collection, maquinaria_collection
    import io
    
    # Collection de tecnicos aplicadores
    tecnicos_aplicadores_collection = db['tecnicos_aplicadores']
    
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    evaluacion = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    parcela_id = evaluacion.get("parcela_id", "")
    
    # Ficheros temporales que se generan durante el render del PDF
    # (mapas satelitales de `staticmap`) y hay que borrar tras `write_pdf`.
    _pdf_temp_files: list[str] = []
    
    # Obtener datos completos de la parcela incluyendo geometría
    parcela_data = None
    if parcela_id and ObjectId.is_valid(parcela_id):
        parcela_data = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    
    # Resolver Variedad en vivo desde el catálogo de Cultivos cuando la parcela
    # tiene `variedad` vacía pero el cultivo asociado tiene exactamente una
    # variedad en su catálogo (replica la lógica del frontend ParcelasForm /
    # EvaluacionesImpresos). Garantiza que el PDF muestre la variedad real
    # aunque nunca se haya guardado explícitamente en la parcela.
    variedad_resuelta = ""
    if parcela_data:
        variedad_resuelta = (parcela_data.get("variedad") or "").strip()
    if not variedad_resuelta:
        cultivo_nombre = (parcela_data or {}).get("cultivo") or evaluacion.get("cultivo") or ""
        if cultivo_nombre:
            cultivo_doc = await db['cultivos'].find_one({"nombre": cultivo_nombre})
            variedades = (cultivo_doc or {}).get("variedades") or []
            if len(variedades) == 1:
                variedad_resuelta = str(variedades[0]).strip()
    # Inyectar la variedad resuelta tanto en `evaluacion` como en `impresos`
    # para que todas las plantillas (cabecera Plantación, Impresos cabecera y
    # Datos Generales) la muestren de forma consistente.
    if variedad_resuelta:
        if not (evaluacion.get("variedad") or "").strip():
            evaluacion["variedad"] = variedad_resuelta
        imp_inline = evaluacion.get("impresos")
        if isinstance(imp_inline, dict) and not (imp_inline.get("variedad") or "").strip():
            imp_inline["variedad"] = variedad_resuelta
    
    # Obtener visitas de la parcela (ordenadas por número de visita ASC,
    # con fallback a fecha_visita cuando una visita antigua no tenga número).
    visitas = []
    if parcela_id:
        visitas = await visitas_collection.find({"parcela_id": parcela_id}).sort([
            ("numero_visita", 1),
            ("fecha_visita", 1),
        ]).to_list(100)
    
    # Obtener tratamientos de la parcela (ordenados de más antiguo a más nuevo)
    tratamientos = []
    if parcela_id:
        tratamientos = await tratamientos_collection.find({"parcelas_ids": parcela_id}).sort("fecha_tratamiento", 1).to_list(100)
    
    # Para cada tratamiento, obtener los datos completos del aplicador y la máquina
    tratamientos_enriquecidos = []
    for trat in tratamientos:
        trat_data = dict(trat)
        
        # Obtener datos del aplicador (el campo es tecnico_aplicador_id)
        aplicador_id = trat.get("tecnico_aplicador_id") or trat.get("aplicador_id")
        if aplicador_id and ObjectId.is_valid(aplicador_id):
            aplicador = await tecnicos_aplicadores_collection.find_one({"_id": ObjectId(aplicador_id)})
            if aplicador:
                trat_data["aplicador_completo"] = serialize_doc(aplicador)
        
        # Obtener datos de la máquina
        maquina_id = trat.get("maquina_id")
        if maquina_id and ObjectId.is_valid(maquina_id):
            maquina = await maquinaria_collection.find_one({"_id": ObjectId(maquina_id)})
            if maquina:
                trat_data["maquina_completa"] = serialize_doc(maquina)
        
        tratamientos_enriquecidos.append(trat_data)
    
    tratamientos = tratamientos_enriquecidos
    
    # Irrigaciones y Cosechas: eliminadas del cuaderno de campo (no se incluyen
    # en el PDF según requerimientos de usuario).
    # La paginación se calcula dinámicamente con counter(page)/counter(pages) en CSS.
    
    # Función helper para formatear respuestas
    def format_respuesta(resp):
        if resp is True:
            return "Sí"
        elif resp is False:
            return "No"
        elif resp is None or resp == "":
            return "—"
        return str(resp)
    
    def format_fecha(fecha):
        if not fecha:
            return "—"
        return str(fecha)
    
    # CSS común para todas las páginas
    css_styles = """
        @page {
            size: A4;
            margin: 1.5cm;
            @bottom-center {
                content: "Página " counter(page) " de " counter(pages);
                font-size: 8pt;
                color: #888;
            }
            @bottom-right {
                content: "FRUVECO · Cuaderno de Campo";
                font-size: 8pt;
                color: #aaa;
            }
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
        }
        .page-break {
            page-break-before: always;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #2d5a27;
        }
        .header h1 {
            color: #2d5a27;
            font-size: 18pt;
            margin: 0 0 5px 0;
        }
        .header h2 {
            color: #666;
            font-size: 12pt;
            margin: 0;
            font-weight: normal;
        }
        .header h3 {
            color: #2d5a27;
            font-size: 10pt;
            margin: 5px 0 0 0;
            font-weight: normal;
        }
        .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #2d5a27;
            color: white;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 0;
        }
        .section-title-blue {
            background-color: #1a5276;
        }
        .section-title-orange {
            background-color: #b9770e;
        }
        .section-content {
            border: 1px solid #ddd;
            border-top: none;
            padding: 12px;
        }
        .question-row {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .question-row:last-child {
            border-bottom: none;
        }
        .question-num {
            font-weight: bold;
            color: #2d5a27;
        }
        .question-text {
            margin-left: 5px;
        }
        .answer {
            margin-left: 20px;
            color: #555;
            font-style: italic;
        }
        .answer-yes {
            color: #28a745;
            font-weight: bold;
        }
        .answer-no {
            color: #dc3545;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }
        .datos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .datos-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .dato-item {
            padding: 5px;
        }
        .dato-label {
            font-weight: bold;
            font-size: 9pt;
            color: #666;
        }
        .dato-value {
            font-size: 10pt;
        }
        .visita-header {
            background-color: #1a5276;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .visita-header h3 {
            margin: 0;
            color: white;
        }
        .tratamiento-header {
            background-color: #b9770e;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .tratamiento-header h3 {
            margin: 0;
            color: white;
        }
        .irrigacion-header {
            background-color: #2874a6;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .irrigacion-header h3 {
            margin: 0;
            color: white;
        }
        .cosecha-header {
            background-color: #1e8449;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .cosecha-header h3 {
            margin: 0;
            color: white;
        }
        .section-title-water {
            background-color: #2874a6;
        }
        .section-title-harvest {
            background-color: #1e8449;
        }
        .summary-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .summary-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
            color: #2d5a27;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        table.data-table th, table.data-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        table.data-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        table.data-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .index-box {
            background-color: #fff;
            border: 2px solid #2d5a27;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .index-title {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 15px;
            color: #2d5a27;
            text-align: center;
            border-bottom: 2px solid #2d5a27;
            padding-bottom: 10px;
        }
        .index-section {
            margin-bottom: 15px;
        }
        .index-section-title {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 8px;
            padding: 5px 10px;
            border-radius: 3px;
        }
        .index-section-title.visitas {
            background-color: #1a5276;
            color: white;
        }
        .index-section-title.tratamientos {
            background-color: #b9770e;
            color: white;
        }
        .index-section-title.irrigaciones {
            background-color: #2874a6;
            color: white;
        }
        .index-section-title.cosechas {
            background-color: #1e8449;
            color: white;
        }
        .index-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 10px;
            border-bottom: 1px dotted #ddd;
            font-size: 10pt;
        }
        .index-item:last-child {
            border-bottom: none;
        }
        .index-item-name {
            flex: 1;
        }
        .index-item-date {
            color: #666;
            margin-left: 10px;
        }
        .index-item-page {
            font-weight: bold;
            margin-left: 10px;
            min-width: 50px;
            text-align: right;
        }
        .index-empty {
            color: #999;
            font-style: italic;
            padding: 10px;
            text-align: center;
        }
        .aplicador-header {
            background-color: #7b2cbf;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .aplicador-header h3 {
            margin: 0;
            color: white;
        }
        .section-title-purple {
            background-color: #7b2cbf;
        }
        .maquina-header {
            background-color: #495057;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .maquina-header h3 {
            margin: 0;
            color: white;
        }
        .section-title-gray {
            background-color: #495057;
        }
        .certificate-image {
            max-width: 100%;
            max-height: 400px;
            margin: 15px auto;
            display: block;
            border: 2px solid #ddd;
            border-radius: 5px;
        }
        .placa-ce-image {
            max-width: 100%;
            max-height: 350px;
            margin: 15px auto;
            display: block;
            border: 2px solid #ddd;
            border-radius: 5px;
        }
        .ficha-datos {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .ficha-titulo {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid;
        }
        .ficha-titulo-aplicador {
            color: #7b2cbf;
            border-color: #7b2cbf;
        }
        .ficha-titulo-maquina {
            color: #495057;
            border-color: #495057;
        }
        .no-image-box {
            background-color: #f0f0f0;
            border: 2px dashed #ccc;
            border-radius: 5px;
            padding: 40px;
            text-align: center;
            color: #999;
            font-style: italic;
        }
    """
    
    # Generar HTML para el PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>{css_styles}</style>
    </head>
    <body>
        <!-- PÁGINA 1: HOJA DE EVALUACIÓN PRINCIPAL -->
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>HOJA DE EVALUACIÓN · CUADERNO DE CAMPO</h2>
            <h3 style="font-size: 11pt; color: #2d5a27;">{evaluacion.get('proveedor', '')} · {evaluacion.get('cultivo', '')} · Campaña {evaluacion.get('campana', '')}</h3>
        </div>
        
        <!-- Resumen -->
        <div class="summary-box">
            <div class="summary-title">RESUMEN DEL CUADERNO DE CAMPO</div>
            <div class="datos-grid">
                <div class="dato-item">
                    <div class="dato-label">Visitas</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold; color: #1a5276;">{len(visitas)}</div>
                </div>
                <div class="dato-item">
                    <div class="dato-label">Tratamientos</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold; color: #b9770e;">{len(tratamientos)}</div>
                </div>
                <div class="dato-item">
                    <div class="dato-label">Total Páginas</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold;">Ver pie de página</div>
                </div>
            </div>
        </div>
        
        <!-- ÍNDICE DE CONTENIDOS -->
        <div class="index-box">
            <div class="index-title">ÍNDICE DE CONTENIDOS</div>
            
            <!-- Índice de Visitas -->
            <div class="index-section">
                <div class="index-section-title visitas">VISITAS ({len(visitas)})</div>
    """
    
    if visitas:
        for idx, visita in enumerate(visitas, 1):
            page_num = 1 + idx
            fecha = format_fecha(visita.get('fecha_visita'))
            objetivo = visita.get('objetivo', 'Sin objetivo')[:40]
            n_visita = visita.get('numero_visita') or idx
            html_content += f"""
                <div class="index-item">
                    <span class="index-item-name">Visita #{n_visita} · {objetivo}</span>
                    <span class="index-item-date">{fecha}</span>
                    <span class="index-item-page">Pág. {page_num}</span>
                </div>
            """
    else:
        html_content += """
                <div class="index-empty">No hay visitas registradas</div>
        """
    
    html_content += """
            </div>
            
            <!-- Índice de Tratamientos -->
            <div class="index-section">
                <div class="index-section-title tratamientos">TRATAMIENTOS (""" + str(len(tratamientos)) + """)</div>
    """
    
    if tratamientos:
        for idx, tratamiento in enumerate(tratamientos, 1):
            page_num = 1 + len(visitas) + idx
            fecha = format_fecha(tratamiento.get('fecha_tratamiento'))
            # El backend almacena el tipo en `tipo_tratamiento` (e.g. "FITOSANITARIOS")
            # y el subtipo (e.g. "Herbicida", "Fungicida"). El campo legacy
            # `tipo` raramente está poblado, por lo que mostrábamos "Sin tipo".
            tipo_principal = (tratamiento.get('tipo_tratamiento') or tratamiento.get('tipo') or 'Tratamiento').strip()
            subtipo = (tratamiento.get('subtipo') or '').strip()
            tipo_label = f"{tipo_principal}" + (f" — {subtipo}" if subtipo else '')
            descripcion = (tratamiento.get('producto_fitosanitario_nombre') or tratamiento.get('descripcion') or '')[:30]
            html_content += f"""
                <div class="index-item">
                    <span class="index-item-name">{idx}. {tipo_label[:50]} {('· ' + descripcion) if descripcion else ''}</span>
                    <span class="index-item-date">{fecha}</span>
                    <span class="index-item-page">Pág. {page_num}</span>
                </div>
            """
    else:
        html_content += """
                <div class="index-empty">No hay tratamientos registrados</div>
        """
    
    # Índices de Irrigaciones y Cosechas: eliminados del cuaderno de campo
    # según requerimiento del usuario.
    
    html_content += f"""
            </div>
        </div>
        
        <!-- Datos Generales -->
        <div class="section">
            <div class="section-title">DATOS GENERALES</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha Inicio</div>
                        <div class="dato-value">{evaluacion.get('fecha_inicio', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Fecha Fin</div>
                        <div class="dato-value">{evaluacion.get('fecha_fin', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Técnico</div>
                        <div class="dato-value">{evaluacion.get('tecnico', '—')}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Plantación -->
        <div class="section">
            <div class="section-title">PLANTACIÓN</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Proveedor / Agricultor</div>
                        <div class="dato-value">{evaluacion.get('proveedor', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Código Plantación</div>
                        <div class="dato-value">{evaluacion.get('codigo_plantacion', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Finca</div>
                        <div class="dato-value">{evaluacion.get('finca', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Cultivo</div>
                        <div class="dato-value">{evaluacion.get('cultivo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Variedad</div>
                        <div class="dato-value">{evaluacion.get('variedad', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Superficie</div>
                        <div class="dato-value">{evaluacion.get('superficie', 0)} ha</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Campaña</div>
                        <div class="dato-value">{evaluacion.get('campana', '—')}</div>
                    </div>
                </div>
            </div>
        </div>
    """
    
    # Añadir sección de mapa de la parcela si hay geometría o imagen
    if parcela_data:
        geometria = None
        if parcela_data.get('recintos') and len(parcela_data['recintos']) > 0:
            geometria = parcela_data['recintos'][0].get('geometria', [])
        
        lat_parcela = parcela_data.get('latitud', 0)
        lng_parcela = parcela_data.get('longitud', 0)
        imagen_mapa_url = parcela_data.get('imagen_mapa_url', '')
        imagen_mapa_path = parcela_data.get('imagen_mapa_path', '')
        
        html_content += """
        <div class="section">
            <div class="section-title" style="background-color: #0d6efd;">UBICACIÓN DE LA PARCELA</div>
            <div class="section-content" style="text-align: center;">
        """
        
        # Primero intentar mostrar la imagen capturada del mapa
        if imagen_mapa_url or imagen_mapa_path:
            # Construir la ruta absoluta de la imagen
            if imagen_mapa_path and os.path.exists(imagen_mapa_path):
                img_src = f"file://{imagen_mapa_path}"
            elif imagen_mapa_url:
                # Convertir URL relativa a path absoluto
                if imagen_mapa_url.startswith('/api/uploads/'):
                    local_path = imagen_mapa_url.replace('/api/uploads/', '/app/uploads/')
                    if os.path.exists(local_path):
                        img_src = f"file://{local_path}"
                    else:
                        img_src = None
                else:
                    img_src = None
            else:
                img_src = None
            
            if img_src:
                html_content += f"""
                <div style="margin-bottom: 15px;">
                    <img src="{img_src}" style="max-width: 100%; max-height: 400px; border: 2px solid #2e7d32; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" alt="Mapa de la parcela" />
                </div>
                """
                
                # Añadir información de coordenadas si hay geometría
                if geometria and len(geometria) > 1:
                    lats = [p.get('lat', 0) for p in geometria]
                    lngs = [p.get('lng', 0) for p in geometria]
                    center_lat = sum(lats) / len(lats)
                    center_lng = sum(lngs) / len(lngs)
                    
                    html_content += f"""
                    <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; width: 50%;">
                                <strong>Centro del polígono:</strong><br/>
                                <span style="font-family: monospace;">{center_lat:.6f}, {center_lng:.6f}</span>
                            </td>
                            <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; width: 50%;">
                                <strong>Polígono:</strong><br/>
                                {len(geometria)} vértices
                            </td>
                        </tr>
                    </table>
                    """
            else:
                # No se pudo cargar la imagen, usar SVG como fallback
                pass
        
        elif geometria and len(geometria) > 1:
            # Calcular centro y bounds del polígono
            lats = [p.get('lat', 0) for p in geometria]
            lngs = [p.get('lng', 0) for p in geometria]
            center_lat = sum(lats) / len(lats)
            center_lng = sum(lngs) / len(lngs)
            
            min_lat, max_lat = min(lats), max(lats)
            min_lng, max_lng = min(lngs), max(lngs)
            
            # === Mapa satélite REAL con polígono superpuesto ===
            # Usamos `staticmap` (fetch de tiles Esri World Imagery) + Pillow
            # para renderizar la parcela sobre imagen aérea, igual que el
            # editor Leaflet Avanzado. Fallback a SVG si falla la red.
            satelite_ok = False
            try:
                from staticmap import StaticMap, Polygon as SmPolygon, CircleMarker
                import uuid as _uuid
                # Esri World Imagery (satélite gratuito)
                esri_url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                sm = StaticMap(900, 540, url_template=esri_url)
                pts = [(p.get('lng', 0), p.get('lat', 0)) for p in geometria]
                # Cerrar el anillo si no viene cerrado
                if pts and pts[0] != pts[-1]:
                    pts.append(pts[0])
                # Polígono verde translúcido con borde oscuro
                # NOTA: staticmap/PIL requieren color hex (#rrggbbaa) — no acepta rgba(..., 0.85)
                # Polygon(coords, fill_color, outline_color)
                sm.add_polygon(SmPolygon(pts, '#4CAF5066', '#2E7D32', simplify=False))
                # Marcador de centro (azul con núcleo blanco tipo Leaflet)
                sm.add_marker(CircleMarker((center_lng, center_lat), '#1565C0', 14))
                sm.add_marker(CircleMarker((center_lng, center_lat), '#FFFFFF', 8))
                img = sm.render()
                # === Overlay estilo SIGPAC: brújula N↑ y barra de escala ===
                try:
                    from PIL import ImageDraw, ImageFont
                    import math as _math
                    draw = ImageDraw.Draw(img, 'RGBA')
                    try:
                        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 16)
                        font_scale = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 12)
                    except Exception:
                        font_bold = ImageFont.load_default()
                        font_scale = ImageFont.load_default()
                    W, H = img.size

                    # --- Brújula (esquina superior derecha) ---
                    cx, cy, r = W - 45, 45, 26
                    # Halo blanco semitransparente + círculo blanco con borde
                    draw.ellipse((cx-r-2, cy-r-2, cx+r+2, cy+r+2), fill=(255, 255, 255, 220), outline=(60, 60, 60, 255), width=2)
                    # Flecha norte (roja arriba, gris abajo) — polígono romboidal
                    draw.polygon([(cx, cy-r+6), (cx+7, cy+2), (cx, cy-2), (cx-7, cy+2)], fill=(198, 40, 40, 255))
                    draw.polygon([(cx, cy+r-6), (cx+7, cy-2), (cx, cy+2), (cx-7, cy-2)], fill=(90, 90, 90, 255))
                    # Etiqueta N en negrita encima
                    draw.text((cx-5, cy-r-2), "N", fill=(20, 20, 20, 255), font=font_bold)

                    # --- Barra de escala (esquina inferior izquierda) ---
                    # metros/pixel (Web Mercator): 156543.03392 * cos(lat) / 2^zoom
                    lat_rad = _math.radians(center_lat)
                    mpp = 156543.03392 * _math.cos(lat_rad) / (2 ** sm.zoom)
                    # Elegir una distancia "bonita" ≈ 150 px
                    target_px = 150
                    target_m = target_px * mpp
                    nice_values_m = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
                    scale_m = min(nice_values_m, key=lambda v: abs(v - target_m))
                    scale_px = int(round(scale_m / mpp))
                    label = f"{scale_m/1000:.1f} km" if scale_m >= 1000 else f"{scale_m} m"

                    bx, by = 20, H - 40
                    bw, bh = scale_px, 10
                    # Fondo blanco semitransparente
                    draw.rectangle((bx-6, by-22, bx+bw+6, by+bh+6), fill=(255, 255, 255, 220), outline=(60, 60, 60, 255), width=1)
                    # Barra bicolor: mitad blanca / mitad negra
                    half = bw // 2
                    draw.rectangle((bx, by, bx+half, by+bh), fill=(255, 255, 255, 255), outline=(20, 20, 20, 255), width=1)
                    draw.rectangle((bx+half, by, bx+bw, by+bh), fill=(20, 20, 20, 255), outline=(20, 20, 20, 255), width=1)
                    # Etiquetas: 0 · mitad · total
                    draw.text((bx-3, by-16), "0", fill=(20, 20, 20, 255), font=font_scale)
                    draw.text((bx+bw-len(label)*6, by-16), label, fill=(20, 20, 20, 255), font=font_scale)
                except Exception as _ov_err:
                    print(f"[PDF] map overlay (compass/scale) failed: {_ov_err}")

                out_dir = "/app/uploads/evaluaciones/pdf_maps"
                os.makedirs(out_dir, exist_ok=True)
                out_path = os.path.join(out_dir, f"map_{_uuid.uuid4().hex}.png")
                img.save(out_path)
                _pdf_temp_files.append(out_path)
                map_html = f'''
                    <div style="border:2px solid #ccc; border-radius:8px; overflow:hidden;">
                        <img src="file://{out_path}" style="width:100%; display:block;" alt="Mapa satélite de la parcela" />
                    </div>
                    <div style="text-align:right; font-size:8pt; color:#888; margin-top:4px;">
                        Imagen satélite: Esri World Imagery · Polígono con {len(geometria)} vértices
                    </div>
                '''
                satelite_ok = True
            except Exception as _e:
                print(f"[PDF] staticmap satelite failed, falling back to SVG: {_e}")
                satelite_ok = False
            
            if not satelite_ok:
                # ---- Fallback SVG diagrama (código legacy) ----
                svg_width = 500
                svg_height = 300
                padding = 30
                lat_range = max_lat - min_lat if max_lat != min_lat else 0.001
                lng_range = max_lng - min_lng if max_lng != min_lng else 0.001
                
                def geo_to_svg(lat, lng):
                    x = padding + ((lng - min_lng) / lng_range) * (svg_width - 2 * padding)
                    y = padding + ((max_lat - lat) / lat_range) * (svg_height - 2 * padding)
                    return x, y
                
                polygon_points = ' '.join([f"{geo_to_svg(p.get('lat', 0), p.get('lng', 0))[0]:.1f},{geo_to_svg(p.get('lat', 0), p.get('lng', 0))[1]:.1f}" for p in geometria])
                map_html = f'''
                <svg width="{svg_width}" height="{svg_height}" viewBox="0 0 {svg_width} {svg_height}" style="border: 2px solid #ddd; border-radius: 8px; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);">
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#a5d6a7" stroke-width="0.5"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)"/>
                    <polygon points="{polygon_points}" fill="rgba(76, 175, 80, 0.4)" stroke="#2e7d32" stroke-width="3"/>
                    {"".join([f'<circle cx="{geo_to_svg(p.get("lat", 0), p.get("lng", 0))[0]:.1f}" cy="{geo_to_svg(p.get("lat", 0), p.get("lng", 0))[1]:.1f}" r="5" fill="#c62828" stroke="white" stroke-width="2"/>' for p in geometria])}
                    <circle cx="{geo_to_svg(center_lat, center_lng)[0]:.1f}" cy="{geo_to_svg(center_lat, center_lng)[1]:.1f}" r="8" fill="#1565c0" stroke="white" stroke-width="2"/>
                    <text x="{geo_to_svg(center_lat, center_lng)[0]:.1f}" y="{geo_to_svg(center_lat, center_lng)[1] + 25:.1f}" text-anchor="middle" font-size="11" fill="#1565c0" font-weight="bold">Centro</text>
                </svg>
                '''
            
            html_content += f"""
                <div style="margin-bottom: 15px;">
                    {map_html}
                </div>
                <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; width: 50%;">
                            <strong>Centro del polígono:</strong><br/>
                            <span style="font-family: monospace;">{center_lat:.6f}, {center_lng:.6f}</span>
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; width: 50%;">
                            <strong>Polígono:</strong><br/>
                            {len(geometria)} vértices
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 8px; border: 1px solid #ddd; font-size: 9pt;">
                            <strong>Coordenadas de los vértices:</strong><br/>
                            {' → '.join([f"({p.get('lat', 0):.5f}, {p.get('lng', 0):.5f})" for p in geometria[:6]])}
                            {'...' if len(geometria) > 6 else ''}
                        </td>
                    </tr>
                </table>
            """
        elif lat_parcela and lng_parcela:
            # Si solo hay coordenadas puntuales, mostrar un marcador
            svg_point = '''
            <svg width="300" height="200" viewBox="0 0 300 200" style="border: 2px solid #ddd; border-radius: 8px; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);">
                <defs>
                    <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#a5d6a7" stroke-width="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid2)"/>
                
                <!-- Marcador de ubicación -->
                <circle cx="150" cy="100" r="12" fill="#c62828" stroke="white" stroke-width="3"/>
                <circle cx="150" cy="100" r="25" fill="none" stroke="#c62828" stroke-width="2" stroke-dasharray="5,5"/>
                
                <!-- Etiqueta -->
                <text x="150" y="145" text-anchor="middle" font-size="12" fill="#333" font-weight="bold">Ubicación de la parcela</text>
            </svg>
            '''
            
            html_content += f"""
                <div style="margin-bottom: 15px;">
                    {svg_point}
                </div>
                <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                    <p style="font-size: 11pt; margin: 0;"><strong>Coordenadas:</strong> 
                    <span style="font-family: monospace;">{lat_parcela:.6f}, {lng_parcela:.6f}</span></p>
                    <p style="font-size: 9pt; color: #666; margin: 5px 0 0 0;">
                        (Punto de referencia - no hay polígono dibujado)
                    </p>
                </div>
            """
        else:
            html_content += """
                <div class="no-image-box">
                    <p>No hay coordenadas de ubicación disponibles para esta parcela</p>
                    <p style="font-size: 9pt; margin-top: 10px;">Añada las coordenadas o dibuje el polígono en el módulo de Mapas</p>
                </div>
            """
        
        html_content += """
            </div>
        </div>
        """
    
    # Cuestionario unificado: todas las secciones internas se muestran como
    # una única "TOMA DE DATOS" con numeración continua 1..N, respetando el
    # `orden_global` guardado en configuración (mismo orden que la vista plana
    # del frontend). Internamente los datos siguen almacenándose por sección
    # (toma_datos, analisis_suelo, calidad_cepellones, …) por compatibilidad.
    secciones_internas = [
        'toma_datos',
        'analisis_suelo',
        'pasos_precampana',
        'calidad_cepellones',
        'inspeccion_maquinaria',
        'observaciones',
        'calibracion_mantenimiento',
    ]
    todas_respuestas = []
    for _sk in secciones_internas:
        _resp = evaluacion.get(_sk, []) or []
        if isinstance(_resp, list):
            todas_respuestas.extend(_resp)
    
    # Aplicar orden_global (mismo que la UI): las preguntas con posición en
    # orden_global van primero según ese orden; las que no aparezcan mantienen
    # el orden de sección + índice original al final.
    try:
        _cfg = await evaluaciones_config_collection.find_one({"tipo": "preguntas"})
        _orden_global = (_cfg or {}).get("orden_global", []) if _cfg else []
    except Exception:
        _orden_global = []
    if _orden_global:
        _pos = {pid: i for i, pid in enumerate(_orden_global)}
        # Precompute stable fallback index (id(r) del objeto) para preguntas que
        # no aparecen en orden_global — evita `list.index()` durante sort que
        # falla porque timsort muta la lista y produce ValueError.
        _fallback = {id(r): i for i, r in enumerate(todas_respuestas)}
        todas_respuestas.sort(
            key=lambda r: _pos.get(r.get('pregunta_id'), 10_000 + _fallback[id(r)])
        )
    
    if todas_respuestas:
        html_content += """
        <div class="section">
            <div class="section-title">TOMA DE DATOS</div>
            <div class="section-content">
        """
        for idx, resp in enumerate(todas_respuestas, 1):
            pregunta = resp.get('pregunta', '')
            respuesta = resp.get('respuesta')
            respuesta_fmt = format_respuesta(respuesta)
            
            respuesta_class = ''
            if respuesta is True:
                respuesta_class = 'answer-yes'
            elif respuesta is False:
                respuesta_class = 'answer-no'
            
            html_content += f"""
                <div class="question-row">
                    <span class="question-num">{idx}.</span>
                    <span class="question-text">{pregunta}</span>
                    <div class="answer {respuesta_class}">R: {respuesta_fmt}</div>
                </div>
            """
        html_content += """
            </div>
        </div>
        """
    
    # Impresos — Cabecera + 6 secciones (esquema nuevo)
    impresos = evaluacion.get('impresos', {}) or {}
    # Mostrar Impresos siempre que haya una parcela vinculada al evaluación
    # (la cabecera se computa en vivo desde parcela/contrato; las 6 secciones
    # solo se muestran si el usuario ha rellenado algo en impresos).
    if impresos or evaluacion.get('parcela_id'):
        def _fmt_sn(v):
            """Format Sí/No tri-state (True/False/None)."""
            if v is True:
                return '<span class="answer-yes">Sí</span>'
            if v is False:
                return '<span class="answer-no">No</span>'
            return '<span style="color:#888;">—</span>'

        def _fmt_sintomas(s):
            if not s or not isinstance(s, dict):
                return '<span style="color:#888;">—</span>'
            marcados = [k.capitalize() for k in ('enfermedades', 'plagas', 'virus') if s.get(k)]
            return ', '.join(marcados) if marcados else '<span style="color:#888;">Ninguno</span>'

        def _txt(v, dash='—'):
            v = (v if v is not None else '')
            v = str(v).strip()
            return v if v else f'<span style="color:#888;">{dash}</span>'

        analisis = impresos.get('analisis_suelo', {}) or {}
        pasos = impresos.get('pasos_precampana', {}) or {}
        calibracion = impresos.get('calibracion', {}) or {}
        cepellones = impresos.get('calidad_cepellones', {}) or {}
        maquinaria = impresos.get('inspeccion_maquinaria', {}) or {}

        html_content += f"""
        <div class="page-break"></div>
        <div class="section">
            <div class="section-title">IMPRESOS — CABECERA / PLANTACIÓN</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item"><div class="dato-label">La plantación (Proveedor)</div><div class="dato-value">{_txt(impresos.get('proveedor') or evaluacion.get('proveedor'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Código Plantación</div><div class="dato-value">{_txt(impresos.get('codigo_plantacion') or evaluacion.get('codigo_plantacion'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Finca</div><div class="dato-value">{_txt(impresos.get('finca') or evaluacion.get('finca'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Cultivo</div><div class="dato-value">{_txt(impresos.get('cultivo') or evaluacion.get('cultivo'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Variedad</div><div class="dato-value">{_txt(impresos.get('variedad') or evaluacion.get('variedad'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Superficie</div><div class="dato-value">{_txt(impresos.get('superficie') if impresos.get('superficie') not in (None, '') else evaluacion.get('superficie'))}</div></div>
                </div>
                <div style="margin-top:8px;">
                    <div class="dato-label">Comentarios</div>
                    <div class="dato-value" style="white-space:pre-wrap;">{_txt(impresos.get('comentarios'))}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">1 · ANÁLISIS DE SUELO</div>
            <div class="section-content">
                <div class="question-row"><span class="question-text">¿Se ha archivado la hoja de los resultados de análisis con este impreso?</span><div class="answer">{_fmt_sn(analisis.get('hoja_archivada'))}</div></div>
                <div class="question-row"><span class="question-text">¿Los paquetes/envases de semillas están archivados?</span><div class="answer">{_fmt_sn(analisis.get('envases_archivados'))}</div></div>
                <div class="question-row"><span class="question-text">Medidas tomadas como consecuencia de los resultados de los análisis</span><div class="answer" style="white-space:pre-wrap;">{_txt(analisis.get('medidas_tomadas'))}</div></div>
                <div class="question-row"><span class="question-text">Este lote en el momento de entrega estaba libre de síntomas de:</span><div class="answer">{_fmt_sintomas(analisis.get('libre_sintomas'))}</div></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">2 · PASOS PRECAMPAÑA DESINFECCIÓN</div>
            <div class="section-content">
                <div class="question-row"><span class="question-text">Observaciones de interés</span><div class="answer" style="white-space:pre-wrap;">{_txt(pasos.get('observaciones'))}</div></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">3 · CALIBRACIÓN Y MANTENIMIENTO APARATOS MEDICIÓN FITO</div>
            <div class="section-content">
                <div class="datos-grid-2">
                    <div class="dato-item"><div class="dato-label">Vaso</div><div class="dato-value">{_txt(calibracion.get('vaso'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Peso</div><div class="dato-value">{_txt(calibracion.get('peso'))}</div></div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">4 · CALIDAD DE CEPELLONES</div>
            <div class="section-content">
                <div class="question-row"><span class="question-text">Nº de referencia de lote de cepellones</span><div class="answer">{_txt(cepellones.get('numero_lote'))}</div></div>
                <div class="question-row"><span class="question-text">Anexo adjunto</span><div class="answer">{(lambda a: f'<span style="color:#1976d2;">📎 {a.get("filename","anexo")}</span> <span style="color:#888; font-size:0.85em;">({a.get("content_type","")})</span>' if isinstance(a, dict) and a.get('filename') else '<span style="color:#888;">—</span>')(cepellones.get('anexo'))}</div></div>
                {(lambda a: (
                    (lambda local: (
                        f'<div style="margin:10px 0; padding:8px; border:1px solid #ccc; border-radius:6px; background:#fafafa; text-align:center;">'
                        f'<img src="file://{local}" style="max-width:100%; max-height:380px; border:1px solid #d4d4d4; border-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,0.08);" alt="Anexo adjunto" />'
                        f'<div style="font-size:8.5pt; color:#666; margin-top:6px; font-style:italic;">{a.get("filename", "Anexo")}</div>'
                        f'</div>'
                    ) if local and os.path.exists(local) else '')(
                        a.get('url', '').replace('/api/uploads/', '/app/uploads/') if a.get('url', '').startswith('/api/uploads/') else ''
                    )
                ) if isinstance(a, dict) and a.get('content_type', '').startswith('image/') else '')(cepellones.get('anexo') or {})}
                <div class="question-row"><span class="question-text">¿Los paquetes/envases de semillas están archivados con este impreso?</span><div class="answer">{_fmt_sn(cepellones.get('envases_archivados'))}</div></div>
                <div class="question-row"><span class="question-text">¿El semillero ha suministrado un certificado de sanidad vegetal?</span><div class="answer">{_fmt_sn(cepellones.get('certificado_sanidad'))}</div></div>
                <div class="question-row"><span class="question-text">Si existe el certificado de sanidad, ¿está archivado con este impreso?</span><div class="answer">{_fmt_sn(cepellones.get('certificado_archivado'))}</div></div>
                <div class="question-row"><span class="question-text">Este lote en el momento de entrega estaba libre de síntomas de:</span><div class="answer">{_fmt_sintomas(cepellones.get('libre_sintomas'))}</div></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">5 · INSPECCIÓN MAQUINARIA</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item"><div class="dato-label">Tipo</div><div class="dato-value">{_txt(maquinaria.get('tipo'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Modelo</div><div class="dato-value">{_txt(maquinaria.get('modelo'))}</div></div>
                    <div class="dato-item"><div class="dato-label">Nº de serie</div><div class="dato-value">{_txt(maquinaria.get('numero_serie'))}</div></div>
                </div>
                <div class="question-row"><span class="question-text">¿Se ha realizado la limpieza de los filtros?</span><div class="answer">{_fmt_sn(maquinaria.get('limpieza_filtros'))}</div></div>
                <div class="question-row"><span class="question-text">¿Se ha comprobado el estado de la manguera?</span><div class="answer">{_fmt_sn(maquinaria.get('estado_manguera'))}</div></div>
                <div class="question-row"><span class="question-text">¿Se han cambiado los diafragmas?</span><div class="answer">{_fmt_sn(maquinaria.get('diafragmas_cambiados'))}</div></div>
                <div class="question-row"><span class="question-text">¿Se han revisado todas las conexiones?</span><div class="answer">{_fmt_sn(maquinaria.get('conexiones_revisadas'))}</div></div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">6 · OBSERVACIONES GENERALES</div>
            <div class="section-content">
                <div class="dato-value" style="white-space:pre-wrap;">{_txt(impresos.get('observaciones_generales'))}</div>
            </div>
        </div>
        """
    
    # ========================================================================
    # PÁGINAS DE VISITAS - Una página por cada visita
    # ========================================================================
    for idx, visita in enumerate(visitas, 1):
        page_num = 1 + idx
        html_content += f"""
        <div class="page-break"></div>
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>REGISTRO DE VISITA</h2>
            <h3>Visita {idx} de {len(visitas)}</h3>
        </div>
        
        <div class="visita-header">
            <h3>VISITA #{visita.get('numero_visita') or idx} · {format_fecha(visita.get('fecha_visita'))}</h3>
        </div>
        
        <div class="section">
            <div class="section-title section-title-blue">DATOS DE LA VISITA</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha de Visita</div>
                        <div class="dato-value">{format_fecha(visita.get('fecha_visita'))}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Objetivo</div>
                        <div class="dato-value">{visita.get('objetivo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Código Plantación</div>
                        <div class="dato-value">{visita.get('codigo_plantacion', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Proveedor</div>
                        <div class="dato-value">{visita.get('proveedor', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Cultivo</div>
                        <div class="dato-value">{visita.get('cultivo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Variedad</div>
                        <div class="dato-value">{visita.get('variedad', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Finca</div>
                        <div class="dato-value">{visita.get('finca', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Campaña</div>
                        <div class="dato-value">{visita.get('campana', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Realizado</div>
                        <div class="dato-value">Sí</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title section-title-blue">OBSERVACIONES</div>
            <div class="section-content">
                <p>{visita.get('observaciones') or 'Sin observaciones registradas.'}</p>
            </div>
        </div>
        """
        
        # Cuestionario de Plagas y Enfermedades si existe.
        # NOTA: los valores son tri-estado 0/1/2 (Sin presencia / Baja / Alta).
        # El `if value:` original saltaba 0 → la sección salía vacía. Aquí
        # comprobamos `is not None` para incluir el 0.
        cuestionario_plagas = visita.get('cuestionario_plagas') or {}
        if isinstance(cuestionario_plagas, dict) and cuestionario_plagas:
            # Etiqueta legible para cada valor.
            def _label_presencia(v):
                try:
                    n = int(v)
                except (TypeError, ValueError):
                    return str(v) if v is not None else '—'
                if n == 0:
                    return '<span style="color:#2e7d32; font-weight:600;">0 · Sin presencia</span>'
                if n == 1:
                    return '<span style="color:#ed6c02; font-weight:600;">1 · Presencia baja</span>'
                if n == 2:
                    return '<span style="color:#c62828; font-weight:600;">2 · Presencia alta</span>'
                return str(v)
            
            html_content += """
        <div class="section">
            <div class="section-title section-title-blue">CUESTIONARIO PLAGAS Y ENFERMEDADES</div>
            <div class="section-content">
                <div style="font-size: 8.5pt; color: #666; margin-bottom: 6px;">
                    Escala: <strong>0</strong> Sin presencia · <strong>1</strong> Presencia baja · <strong>2</strong> Presencia alta
                </div>
                <table style="width:100%; border-collapse:collapse; font-size: 9.5pt;">
                    <tbody>
            """
            # Renderizamos en filas de 2 columnas (igual que la UI).
            items = list(cuestionario_plagas.items())
            for i in range(0, len(items), 2):
                pair = items[i:i + 2]
                html_content += "<tr>"
                for key, value in pair:
                    label = key.replace('_', ' ').title()
                    html_content += f"""
                        <td style="padding:6px 10px; border:1px solid #e0e0e0; width:50%;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                                <span style="font-weight:600; color:#333;">{label}</span>
                                <span>{_label_presencia(value)}</span>
                            </div>
                        </td>
                    """
                if len(pair) == 1:
                    html_content += '<td style="border:1px solid #e0e0e0;"></td>'
                html_content += "</tr>"
            html_content += """
                    </tbody>
                </table>
            </div>
        </div>
            """
    
    # ========================================================================
    # PÁGINAS DE TRATAMIENTOS - Una página por cada tratamiento
    # ========================================================================
    for idx, tratamiento in enumerate(tratamientos, 1):
        page_num = 1 + len(visitas) + idx
        html_content += f"""
        <div class="page-break"></div>
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>REGISTRO DE TRATAMIENTO</h2>
            <h3>Tratamiento {idx} de {len(tratamientos)}</h3>
        </div>
        
        <div class="tratamiento-header">
            <h3>TRATAMIENTO #{idx} - {format_fecha(tratamiento.get('fecha_tratamiento'))}</h3>
        </div>
        
        <div class="section">
            <div class="section-title section-title-orange">DATOS DEL TRATAMIENTO</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha Tratamiento</div>
                        <div class="dato-value">{format_fecha(tratamiento.get('fecha_tratamiento')) or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Fecha Aplicación</div>
                        <div class="dato-value">{format_fecha(tratamiento.get('fecha_aplicacion')) or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Tipo</div>
                        <div class="dato-value">{((tratamiento.get('tipo_tratamiento') or tratamiento.get('tipo') or '—') + ((' — ' + tratamiento.get('subtipo')) if tratamiento.get('subtipo') else ''))}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Aplicador</div>
                        <div class="dato-value">{tratamiento.get('aplicador_nombre') or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Máquina</div>
                        <div class="dato-value">{tratamiento.get('maquina_nombre') or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Campaña</div>
                        <div class="dato-value">{tratamiento.get('campana') or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Realizado</div>
                        <div class="dato-value">Sí</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Producto</div>
                        <div class="dato-value">{tratamiento.get('producto_fitosanitario_nombre') or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Dosis</div>
                        <div class="dato-value">{(f"{tratamiento.get('producto_fitosanitario_dosis')} {tratamiento.get('producto_fitosanitario_unidad') or ''}".strip()) if tratamiento.get('producto_fitosanitario_dosis') else '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Superficie a Tratar</div>
                        <div class="dato-value">{(f"{tratamiento.get('superficie_aplicacion')} ha") if tratamiento.get('superficie_aplicacion') else '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Caldo Recomendado</div>
                        <div class="dato-value">{(f"{tratamiento.get('caldo_superficie')} L/ha") if tratamiento.get('caldo_superficie') else '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Nº Registro Producto</div>
                        <div class="dato-value">{tratamiento.get('producto_fitosanitario_num_registro') or '—'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Plaga a Controlar</div>
                        <div class="dato-value">{tratamiento.get('plaga_a_controlar') or '—'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title section-title-orange">DESCRIPCIÓN / MOTIVO</div>
            <div class="section-content">
                <p>{tratamiento.get('descripcion') or tratamiento.get('motivo') or 'Sin descripción registrada.'}</p>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title section-title-orange">OBSERVACIONES</div>
            <div class="section-content">
                <p>{tratamiento.get('observaciones') or 'Sin observaciones registradas.'}</p>
            </div>
        </div>
        """
        
        # Productos utilizados si existen
        productos = tratamiento.get('productos', [])
        if productos:
            html_content += """
        <div class="section">
            <div class="section-title section-title-orange">PRODUCTOS UTILIZADOS</div>
            <div class="section-content">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Dosis</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            for prod in productos:
                html_content += f"""
                        <tr>
                            <td>{prod.get('nombre', '—')}</td>
                            <td>{prod.get('dosis', '—')}</td>
                            <td>{prod.get('cantidad', '—')}</td>
                        </tr>
                """
            html_content += """
                    </tbody>
                </table>
            </div>
        </div>
            """
    
    # ========================================================================
    # PÁGINA FINAL — FICHA DEL APLICADOR Y MAQUINARIA (consolidada)
    # Mostramos los aplicadores y máquinas únicos usados en todos los
    # tratamientos del cuaderno de campo, una sola vez al final del documento.
    # ========================================================================
    aplicadores_unicos = {}
    maquinas_unicas = {}
    for trat in tratamientos:
        ap = trat.get("aplicador_completo")
        if ap and ap.get("_id"):
            aplicadores_unicos.setdefault(str(ap["_id"]), ap)
        elif trat.get("aplicador_nombre"):
            # Fallback: aplicador asignado por nombre pero sin ficha completa.
            key = f"name:{trat['aplicador_nombre']}"
            aplicadores_unicos.setdefault(key, {"nombre": trat["aplicador_nombre"], "_minimal": True})
        mq = trat.get("maquina_completa")
        if mq and mq.get("_id"):
            maquinas_unicas.setdefault(str(mq["_id"]), mq)
        elif trat.get("maquina_nombre"):
            key = f"name:{trat['maquina_nombre']}"
            maquinas_unicas.setdefault(key, {"nombre": trat["maquina_nombre"], "_minimal": True})
    
    if aplicadores_unicos or maquinas_unicas:
        html_content += """
        <div class="page-break"></div>
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>FICHA DEL APLICADOR Y MAQUINARIA</h2>
            <h3>Resumen de aplicadores y maquinaria utilizada</h3>
        </div>
        """
        
        # Aplicadores
        if aplicadores_unicos:
            html_content += """
        <div class="section">
            <div class="section-title section-title-purple">TÉCNICOS APLICADORES</div>
            <div class="section-content">
            """
            for ap in aplicadores_unicos.values():
                nombre_completo = f"{ap.get('nombre', '')} {ap.get('apellidos', '')}".strip() or "—"
                img_path = ap.get('imagen_certificado_path', '')
                img_url = ap.get('imagen_certificado_url', '')
                if img_path:
                    img_certificado = f"file://{img_path}"
                elif img_url and img_url.startswith('/api/uploads/'):
                    local = img_url.replace('/api/uploads/', '/app/uploads/')
                    import os as _os
                    img_certificado = f"file://{local}" if _os.path.exists(local) else ''
                else:
                    img_certificado = ''
                html_content += f"""
                <div style="border:1px solid #d4cfeb; border-radius:8px; padding:12px; margin-bottom:14px; background:#faf9ff; page-break-inside:avoid;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 16px;">
                        <div class="dato-item"><div class="dato-label">Nombre Completo</div><div class="dato-value" style="font-weight:bold; font-size:11pt;">{nombre_completo}</div></div>
                        <div class="dato-item"><div class="dato-label">DNI/NIF</div><div class="dato-value">{ap.get('dni', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Nivel Capacitación</div><div class="dato-value" style="font-weight:bold; color:#7b2cbf;">{ap.get('nivel_capacitacion', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Nº Carnet</div><div class="dato-value">{ap.get('num_carnet', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Fecha Certificación</div><div class="dato-value">{format_fecha(ap.get('fecha_certificacion'))}</div></div>
                        <div class="dato-item"><div class="dato-label">Fecha Validez</div><div class="dato-value">{format_fecha(ap.get('fecha_validez'))}</div></div>
                    </div>
                """
                if img_certificado:
                    html_content += f"""
                    <div style="margin-top:10px; text-align:center;">
                        <img src="{img_certificado}" style="max-width:100%; max-height:260px; border:1px solid #ccc; border-radius:4px;" alt="Certificado de {nombre_completo}" />
                        <div style="font-size:8.5pt; color:#777; margin-top:4px;">Certificado de capacitación</div>
                    </div>
                    """
                html_content += "</div>"
            html_content += """
            </div>
        </div>
            """
        
        # Maquinaria
        if maquinas_unicas:
            html_content += """
        <div class="section">
            <div class="section-title section-title-gray">MAQUINARIA UTILIZADA</div>
            <div class="section-content">
            """
            for mq in maquinas_unicas.values():
                img_path = mq.get('imagen_placa_ce_path', '')
                img_url = mq.get('imagen_placa_ce_url', '')
                if img_path:
                    img_placa = f"file://{img_path}"
                elif img_url and img_url.startswith('/api/uploads/'):
                    local = img_url.replace('/api/uploads/', '/app/uploads/')
                    import os as _os
                    img_placa = f"file://{local}" if _os.path.exists(local) else ''
                else:
                    img_placa = ''
                html_content += f"""
                <div style="border:1px solid #d9d9d9; border-radius:8px; padding:12px; margin-bottom:14px; background:#fafafa; page-break-inside:avoid;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 16px;">
                        <div class="dato-item"><div class="dato-label">Nombre</div><div class="dato-value" style="font-weight:bold; font-size:11pt;">{mq.get('nombre', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Tipo</div><div class="dato-value">{mq.get('tipo', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Marca</div><div class="dato-value">{mq.get('marca', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Modelo</div><div class="dato-value">{mq.get('modelo', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Matrícula</div><div class="dato-value">{mq.get('matricula', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Nº Serie</div><div class="dato-value">{mq.get('num_serie', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Registro ROMA</div><div class="dato-value">{mq.get('registro_roma', '—') or '—'}</div></div>
                        <div class="dato-item"><div class="dato-label">Nº Bastidor</div><div class="dato-value">{mq.get('numero_bastidor', '—') or '—'}</div></div>
                    </div>
                """
                if img_placa:
                    html_content += f"""
                    <div style="margin-top:10px; text-align:center;">
                        <img src="{img_placa}" style="max-width:100%; max-height:200px; border:1px solid #ccc; border-radius:4px;" alt="Placa CE de {mq.get('nombre', 'Máquina')}" />
                        <div style="font-size:8.5pt; color:#777; margin-top:4px;">Placa CE (marcado CE)</div>
                    </div>
                    """
                html_content += "</div>"
            html_content += """
            </div>
        </div>
            """
    
    # Footer final
    html_content += f"""
        <div class="footer">
            <p>Documento generado automáticamente por FRUVECO - Cuaderno de Campo</p>
            <p>Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
            <p>{len(visitas)} visitas | {len(tratamientos)} tratamientos</p>
        </div>
    </body>
    </html>
    """
    
    # Generar PDF
    try:
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        filename = f"cuaderno_campo_{evaluacion.get('codigo_plantacion', 'sin_codigo')}_{evaluacion.get('campana', 'sin_campana')}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
    finally:
        # Limpieza inmediata de mapas temporales — el PNG solo hace falta
        # mientras WeasyPrint lo lee vía file://. Después se puede borrar
        # para evitar que /app/uploads/evaluaciones/pdf_maps/ crezca sin
        # control con un UUID por cada exportación.
        for _tf in _pdf_temp_files:
            try:
                if _tf and os.path.exists(_tf):
                    os.remove(_tf)
            except Exception as _cleanup_err:
                print(f"[PDF] cleanup failed for {_tf}: {_cleanup_err}")



@router.get("/evaluaciones/export/excel")
async def export_evaluaciones_excel(
    current_user: dict = Depends(get_current_user)
):
    """Export evaluaciones to Excel"""
    from fastapi.responses import StreamingResponse
    import io as _io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    evaluaciones_list = await evaluaciones_collection.find({}).sort("created_at", -1).to_list(5000)
    evaluaciones_raw = serialize_docs(evaluaciones_list)

    wb = Workbook()
    ws = wb.active
    ws.title = "Evaluaciones"

    headers = ["Titulo", "Parcela", "Cultivo", "Proveedor", "Campana", "Estado", "Puntuacion", "Fecha", "Evaluador"]
    header_fill = PatternFill(start_color="4A148C", end_color="4A148C", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border

    for idx, e in enumerate(evaluaciones_raw, 2):
        row = [
            e.get("titulo", ""), e.get("parcela_codigo", ""), e.get("cultivo", ""),
            e.get("proveedor", ""), e.get("campana", ""), e.get("estado", ""),
            e.get("puntuacion_total", 0),
            e.get("created_at", "")[:10] if e.get("created_at") else "",
            e.get("evaluador", "")
        ]
        for col, val in enumerate(row, 1):
            cell = ws.cell(row=idx, column=col, value=val)
            cell.border = thin_border

    for col in range(1, len(headers) + 1):
        ws.column_dimensions[chr(64 + col)].width = 18

    output = _io.BytesIO()
    wb.save(output)
    output.seek(0)
    filename = f"evaluaciones_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})

