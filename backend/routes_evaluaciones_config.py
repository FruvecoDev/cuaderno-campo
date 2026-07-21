"""
Endpoints de configuracion de preguntas para el modulo de Evaluaciones.
Extraidos de routes_evaluaciones.py para reducir el tamano del router
principal. Gestionan las preguntas por defecto + custom + orden global.
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends

from database import db
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    get_current_user,
)
from models_evaluaciones import PREGUNTAS_DEFAULT

router = APIRouter(prefix="/api", tags=["evaluaciones_config"])

evaluaciones_config_collection = db['evaluaciones_config']


@router.get("/evaluaciones/config/preguntas")
async def get_preguntas_config(
    current_user: dict = Depends(get_current_user)
):
    """Obtener configuracion de preguntas (default + personalizadas), filtrando las ocultas
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

        # Aplicar orden_global si existe: reordena cada seccion segun las
        # posiciones globales. IDs no presentes en orden_global mantienen su
        # orden relativo al final de la seccion.
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
    """Agregar nueva pregunta personalizada a una seccion.

    Body: { seccion: str, pregunta: str, tipo?: "texto"|"numero"|"si_no"|"fecha" }
    """
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
        raise HTTPException(status_code=400, detail=f"Seccion invalida. Opciones: {secciones_validas}")

    tipos_validos = ["texto", "numero", "si_no", "fecha"]
    if tipo not in tipos_validos:
        raise HTTPException(status_code=400, detail=f"Tipo invalido. Opciones: {tipos_validos}")

    pregunta_id = f"custom_{seccion}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

    nueva_pregunta = {
        "id": pregunta_id,
        "pregunta": pregunta,
        "tipo": tipo,
        "created_by": str(current_user.get("_id", "")),
        "created_at": datetime.now().isoformat()
    }

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

    - Preguntas personalizadas (id `custom_*`): se eliminan fisicamente del array.
    - Preguntas predeterminadas (default): se agregan a `hidden[seccion]` para
      excluirlas del cuestionario sin perder la definicion original.
    """
    if current_user.get("role") not in ["Admin"]:
        raise HTTPException(status_code=403, detail="Solo Admin puede eliminar preguntas")

    secciones_validas = list(PREGUNTAS_DEFAULT.keys())
    if seccion not in secciones_validas:
        raise HTTPException(status_code=400, detail=f"Seccion invalida. Opciones: {secciones_validas}")

    if pregunta_id.startswith("custom_"):
        await evaluaciones_config_collection.update_one(
            {"tipo": "preguntas"},
            {"$pull": {f"secciones.{seccion}": {"id": pregunta_id}}}
        )
        return {"success": True, "message": "Pregunta personalizada eliminada"}

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
        raise HTTPException(status_code=400, detail=f"Seccion invalida. Opciones: {secciones_validas}")

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
      - {"orden_global": [id1, id2, ...]} -> guarda un orden plano unico que se
        aplica a la lista combinada de TODAS las preguntas.
      - {"seccion": "toma_datos", "orden": [...]} -> modo antiguo, reordena
        solo customs dentro de una seccion.
    """
    orden_global = (payload or {}).get("orden_global")
    if isinstance(orden_global, list) and orden_global:
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

    # --- Legacy mode: por seccion ---
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
