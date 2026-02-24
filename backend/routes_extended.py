"""
Routes for Extended modules - Smaller CRUD operations
Includes: Irrigaciones, Recetas, Albaranes, Tareas, Documentos
These modules are kept together as they are relatively small.
Refactored: Tratamientos and Cosechas moved to dedicated router files.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models_tratamientos import (
    IrrigacionCreate, RecetaCreate, AlbaranCreate
)
from models import TareaCreate
from database import (
    irrigaciones_collection, recetas_collection,
    albaranes_collection, tareas_collection,
    documentos_collection, serialize_doc, serialize_docs
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireIrrigacionesAccess, RequireRecetasAccess,
    RequireAlbaranesAccess, RequireTareasAccess,
    get_current_user
)

router = APIRouter(prefix="/api", tags=["extended"])


# ============================================================================
# IRRIGACIONES
# ============================================================================

@router.post("/irrigaciones", response_model=dict)
async def create_irrigacion(
    irrigacion: IrrigacionCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireIrrigacionesAccess)
):
    irrigacion_dict = irrigacion.dict()
    irrigacion_dict.update({
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await irrigaciones_collection.insert_one(irrigacion_dict)
    created = await irrigaciones_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/irrigaciones")
async def get_irrigaciones(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireIrrigacionesAccess)
):
    query = {}
    if parcela_id:
        query["parcela_id"] = parcela_id
    
    irrigaciones = await irrigaciones_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"irrigaciones": serialize_docs(irrigaciones), "total": await irrigaciones_collection.count_documents(query)}


@router.get("/irrigaciones/{irrigacion_id}")
async def get_irrigacion(
    irrigacion_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireIrrigacionesAccess)
):
    if not ObjectId.is_valid(irrigacion_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    irrigacion = await irrigaciones_collection.find_one({"_id": ObjectId(irrigacion_id)})
    if not irrigacion:
        raise HTTPException(status_code=404, detail="Irrigacion not found")
    
    return serialize_doc(irrigacion)


@router.delete("/irrigaciones/{irrigacion_id}")
async def delete_irrigacion(
    irrigacion_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireIrrigacionesAccess)
):
    if not ObjectId.is_valid(irrigacion_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await irrigaciones_collection.delete_one({"_id": ObjectId(irrigacion_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Irrigacion not found")
    
    return {"success": True, "message": "Irrigacion deleted"}


@router.put("/irrigaciones/{irrigacion_id}")
async def update_irrigacion(
    irrigacion_id: str,
    irrigacion: IrrigacionCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireIrrigacionesAccess)
):
    if not ObjectId.is_valid(irrigacion_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = irrigacion.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await irrigaciones_collection.update_one(
        {"_id": ObjectId(irrigacion_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Irrigacion not found")
    
    updated = await irrigaciones_collection.find_one({"_id": ObjectId(irrigacion_id)})
    return {"success": True, "data": serialize_doc(updated)}


# ============================================================================
# RECETAS
# ============================================================================

@router.post("/recetas", response_model=dict)
async def create_receta(
    receta: RecetaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireRecetasAccess)
):
    receta_dict = receta.dict()
    receta_dict.update({
        "productos": [],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await recetas_collection.insert_one(receta_dict)
    created = await recetas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/recetas")
async def get_recetas(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireRecetasAccess)
):
    recetas = await recetas_collection.find().skip(skip).limit(limit).to_list(limit)
    return {"recetas": serialize_docs(recetas)}


@router.get("/recetas/{receta_id}")
async def get_receta(
    receta_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireRecetasAccess)
):
    if not ObjectId.is_valid(receta_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    receta = await recetas_collection.find_one({"_id": ObjectId(receta_id)})
    if not receta:
        raise HTTPException(status_code=404, detail="Receta not found")
    
    return serialize_doc(receta)


@router.delete("/recetas/{receta_id}")
async def delete_receta(
    receta_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireRecetasAccess)
):
    if not ObjectId.is_valid(receta_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await recetas_collection.delete_one({"_id": ObjectId(receta_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receta not found")
    
    return {"success": True, "message": "Receta deleted"}


@router.put("/recetas/{receta_id}")
async def update_receta(
    receta_id: str,
    receta: RecetaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireRecetasAccess)
):
    if not ObjectId.is_valid(receta_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = receta.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await recetas_collection.update_one(
        {"_id": ObjectId(receta_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Receta not found")
    
    updated = await recetas_collection.find_one({"_id": ObjectId(receta_id)})
    return {"success": True, "data": serialize_doc(updated)}


# ============================================================================
# ALBARANES (Delivery Notes)
# ============================================================================

@router.post("/albaranes", response_model=dict)
async def create_albaran(
    albaran: AlbaranCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    albaran_dict = albaran.dict()
    albaran_dict.update({
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await albaranes_collection.insert_one(albaran_dict)
    created = await albaranes_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/albaranes")
async def get_albaranes(
    skip: int = 0,
    limit: int = 100,
    contrato_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    query = {}
    if contrato_id:
        query["contrato_id"] = contrato_id
    
    albaranes = await albaranes_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"albaranes": serialize_docs(albaranes), "total": await albaranes_collection.count_documents(query)}


@router.get("/albaranes/{albaran_id}")
async def get_albaran(
    albaran_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    if not ObjectId.is_valid(albaran_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    albaran = await albaranes_collection.find_one({"_id": ObjectId(albaran_id)})
    if not albaran:
        raise HTTPException(status_code=404, detail="Albaran not found")
    
    return serialize_doc(albaran)


@router.delete("/albaranes/{albaran_id}")
async def delete_albaran(
    albaran_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    if not ObjectId.is_valid(albaran_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await albaranes_collection.delete_one({"_id": ObjectId(albaran_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Albaran not found")
    
    return {"success": True, "message": "Albaran deleted"}


@router.put("/albaranes/{albaran_id}")
async def update_albaran(
    albaran_id: str,
    albaran: AlbaranCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    if not ObjectId.is_valid(albaran_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = albaran.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await albaranes_collection.update_one(
        {"_id": ObjectId(albaran_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Albaran not found")
    
    updated = await albaranes_collection.find_one({"_id": ObjectId(albaran_id)})
    return {"success": True, "data": serialize_doc(updated)}


# ============================================================================
# TAREAS (Tasks)
# ============================================================================

@router.post("/tareas", response_model=dict)
async def create_tarea(
    tarea: TareaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireTareasAccess)
):
    tarea_dict = tarea.dict()
    tarea_dict.update({
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await tareas_collection.insert_one(tarea_dict)
    created = await tareas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/tareas")
async def get_tareas(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTareasAccess)
):
    tareas = await tareas_collection.find().skip(skip).limit(limit).to_list(limit)
    return {"tareas": serialize_docs(tareas)}


@router.get("/tareas/{tarea_id}")
async def get_tarea(
    tarea_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTareasAccess)
):
    if not ObjectId.is_valid(tarea_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    tarea = await tareas_collection.find_one({"_id": ObjectId(tarea_id)})
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea not found")
    
    return serialize_doc(tarea)


@router.delete("/tareas/{tarea_id}")
async def delete_tarea(
    tarea_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireTareasAccess)
):
    if not ObjectId.is_valid(tarea_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await tareas_collection.delete_one({"_id": ObjectId(tarea_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarea not found")
    
    return {"success": True, "message": "Tarea deleted"}


# ============================================================================
# DOCUMENTOS - File Upload
# ============================================================================

@router.post("/documentos/upload")
async def upload_documento(
    file: UploadFile = File(...),
    entidad_tipo: str = "parcela",
    entidad_id: str = ""
):
    import uuid
    file_id = str(uuid.uuid4())
    file_path = f"/tmp/{file_id}_{file.filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    documento = {
        "nombre": file.filename,
        "tipo": file.content_type,
        "size": len(content),
        "url": file_path,
        "tags": [],
        "entidad_tipo": entidad_tipo,
        "entidad_id": entidad_id,
        "created_at": datetime.now()
    }
    
    result = await documentos_collection.insert_one(documento)
    created = await documentos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/documentos")
async def get_documentos(
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[str] = None
):
    query = {}
    if entidad_tipo:
        query["entidad_tipo"] = entidad_tipo
    if entidad_id:
        query["entidad_id"] = entidad_id
    
    documentos = await documentos_collection.find(query).to_list(100)
    return {"documentos": serialize_docs(documentos)}


@router.delete("/documentos/{documento_id}")
async def delete_documento(documento_id: str):
    if not ObjectId.is_valid(documento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Get document to delete file
    documento = await documentos_collection.find_one({"_id": ObjectId(documento_id)})
    if documento and "url" in documento:
        import os
        if os.path.exists(documento["url"]):
            os.remove(documento["url"])
    
    result = await documentos_collection.delete_one({"_id": ObjectId(documento_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento not found")
    
    return {"success": True, "message": "Documento deleted"}
