"""
Bulk operations endpoints - Mass deletion with permission control
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from rbac_guards import get_current_user
from database import db

router = APIRouter(tags=["bulk-operations"])

ALLOWED_COLLECTIONS = {
    "parcelas": "parcelas",
    "contratos": "contratos",
    "proveedores": "proveedores",
    "clientes": "clientes",
    "cultivos": "cultivos",
    "agentes": "agentes",
    "albaranes": "albaranes",
    "cosechas": "cosechas",
    "recetas": "recetas",
    "visitas": "visitas",
    "tareas": "tareas",
    "tratamientos": "tratamientos",
    "irrigaciones": "irrigaciones",
    "maquinaria": "maquinaria",
    "articulos": "articulos_explotacion",
    "fitosanitarios": "fitosanitarios",
    "evaluaciones": "evaluaciones",
    "fincas": "fincas",
    "empleados": "empleados",
    "tecnicos": "tecnicos_aplicadores",
}


@router.post("/bulk-delete/{module}")
async def bulk_delete(module: str, data: dict, current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_bulk_delete"):
        raise HTTPException(status_code=403, detail="No tienes permiso de eliminacion masiva")

    if module not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Modulo '{module}' no soportado")

    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No se proporcionaron IDs")

    collection_name = ALLOWED_COLLECTIONS[module]
    collection = db[collection_name]

    object_ids = []
    for id_str in ids:
        if ObjectId.is_valid(id_str):
            object_ids.append(ObjectId(id_str))

    if not object_ids:
        raise HTTPException(status_code=400, detail="No se encontraron IDs validos")

    result = await collection.delete_many({"_id": {"$in": object_ids}})

    return {
        "success": True,
        "deleted_count": result.deleted_count,
        "message": f"{result.deleted_count} registros eliminados de {module}"
    }
