from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import json

from models_tratamientos import (
    TratamientoBase, TratamientoCreate, TratamientoInDB,
    IrrigacionBase, IrrigacionCreate, IrrigacionInDB,
    RecetaBase, RecetaCreate, RecetaInDB,
    AlbaranBase, AlbaranCreate, AlbaranInDB
)
from models import TareaCreate, CosechaCreate
from database import (
    tratamientos_collection, irrigaciones_collection, recetas_collection,
    albaranes_collection, tareas_collection, cosechas_collection,
    documentos_collection, serialize_doc, serialize_docs
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete, RequireExport,
    RequireTratamientosAccess, RequireIrrigacionesAccess, RequireRecetasAccess,
    RequireAlbaranesAccess, RequireTareasAccess, RequireCosechasAccess,
    get_current_user
)

router = APIRouter(prefix="/api", tags=["extended"])

# ============================================================================
# TRATAMIENTOS
# ============================================================================

@router.post("/tratamientos", response_model=dict)
async def create_tratamiento(
    tratamiento: TratamientoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireTratamientosAccess)
):
    from database import db, contratos_collection, parcelas_collection
    from bson import ObjectId
    
    # MODELO SIMPLIFICADO: parcelas_ids obligatorio, el resto se hereda
    if not tratamiento.parcelas_ids or len(tratamiento.parcelas_ids) == 0:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos una parcela")
    
    # Validar todas las parcelas existen y obtener datos de la primera
    parcelas_collection_ref = db['parcelas']
    first_parcela = None
    for parcela_id in tratamiento.parcelas_ids:
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail=f"parcela_id inválido: {parcela_id}")
        parcela = await parcelas_collection_ref.find_one({"_id": ObjectId(parcela_id)})
        if not parcela:
            raise HTTPException(status_code=400, detail=f"Parcela no encontrada: {parcela_id}")
        if first_parcela is None:
            first_parcela = parcela
    
    # Heredar datos desde la primera parcela
    contrato_id = first_parcela.get("contrato_id", "")
    cultivo = first_parcela.get("cultivo", "")
    campana = first_parcela.get("campana", "")
    cultivo_id = ""
    
    # Si hay contrato, obtener cultivo_id
    if contrato_id:
        contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
        if contrato:
            cultivo_id = contrato.get("cultivo_id", "")
            if not campana:
                campana = contrato.get("campana", "")
    
    tratamiento_dict = tratamiento.dict()
    tratamiento_dict.update({
        "contrato_id": contrato_id,
        "cultivo_id": cultivo_id,
        "campana": campana,
        "realizado": False,
        "planificado": False,
        "coste_superficie": 0.0,
        "coste_total": 0.0,
        "productos": [],
        "cuestionarios": [],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await tratamientos_collection.insert_one(tratamiento_dict)
    created = await tratamientos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/tratamientos")
async def get_tratamientos(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    campana: Optional[str] = None,
    cultivo_id: Optional[str] = None,
    contrato_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTratamientosAccess)
):
    query = {}
    if parcela_id:
        query["parcelas_ids"] = parcela_id
    if campana:
        query["campana"] = campana
    if cultivo_id:
        query["cultivo_id"] = cultivo_id
    if contrato_id:
        query["contrato_id"] = contrato_id
    
    tratamientos = await tratamientos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"tratamientos": serialize_docs(tratamientos), "total": await tratamientos_collection.count_documents(query)}

@router.get("/tratamientos/{tratamiento_id}")
async def get_tratamiento(
    tratamiento_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireTratamientosAccess)
):
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    tratamiento = await tratamientos_collection.find_one({"_id": ObjectId(tratamiento_id)})
    if not tratamiento:
        raise HTTPException(status_code=404, detail="Tratamiento not found")
    
    return serialize_doc(tratamiento)

@router.put("/tratamientos/{tratamiento_id}")
async def update_tratamiento(
    tratamiento_id: str,
    tratamiento: TratamientoCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireTratamientosAccess)
):
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = tratamiento.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await tratamientos_collection.update_one(
        {"_id": ObjectId(tratamiento_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tratamiento not found")
    
    updated = await tratamientos_collection.find_one({"_id": ObjectId(tratamiento_id)})
    return {"success": True, "data": serialize_doc(updated)}

@router.delete("/tratamientos/{tratamiento_id}")
async def delete_tratamiento(
    tratamiento_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireTratamientosAccess)
):
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await tratamientos_collection.delete_one({"_id": ObjectId(tratamiento_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tratamiento not found")
    
    return {"success": True, "message": "Tratamiento deleted"}

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
    return {"recetas": serialize_docs(recetas), "total": await recetas_collection.count_documents({})}

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
# ALBARANES
# ============================================================================

@router.post("/albaranes", response_model=dict)
async def create_albaran(
    albaran: AlbaranCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    albaran_dict = albaran.dict()
    # Calculate total
    total = sum(item["total"] for item in albaran_dict.get("items", []))
    albaran_dict.update({
        "total_general": total,
        "adjuntos": [],
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
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    query = {}
    if tipo:
        query["tipo"] = tipo
    
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

# ============================================================================
# TAREAS
# ============================================================================

@router.post("/tareas", response_model=dict)
async def create_tarea(
    tarea: TareaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireTareasAccess)
):
    tarea_dict = tarea.dict()
    tarea_dict.update({
        "realizada": False,
        "planificada": False,
        "materiales": [],
        "coste_tareas": 0.0,
        "coste_materiales": 0.0,
        "coste_personas": 0.0,
        "coste_maquinaria": 0.0,
        "coste_total": 0.0,
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
    return {"tareas": serialize_docs(tareas), "total": await tareas_collection.count_documents({})}

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
# COSECHAS
# ============================================================================

@router.post("/cosechas", response_model=dict)
async def create_cosecha(
    cosecha: CosechaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireCosechasAccess)
):
    cosecha_dict = cosecha.dict()
    cosecha_dict.update({
        "realizado": False,
        "planificado": False,
        "cosechas": [],
        "cosecha_total": 0.0,
        "ingreso_total": 0.0,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await cosechas_collection.insert_one(cosecha_dict)
    created = await cosechas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/cosechas")
async def get_cosechas(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireCosechasAccess)
):
    cosechas = await cosechas_collection.find().skip(skip).limit(limit).to_list(limit)
    return {"cosechas": serialize_docs(cosechas), "total": await cosechas_collection.count_documents({})}

@router.get("/cosechas/{cosecha_id}")
async def get_cosecha(
    cosecha_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireCosechasAccess)
):
    if not ObjectId.is_valid(cosecha_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cosecha = await cosechas_collection.find_one({"_id": ObjectId(cosecha_id)})
    if not cosecha:
        raise HTTPException(status_code=404, detail="Cosecha not found")
    
    return serialize_doc(cosecha)

@router.delete("/cosechas/{cosecha_id}")
async def delete_cosecha(
    cosecha_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireCosechasAccess)
):
    if not ObjectId.is_valid(cosecha_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await cosechas_collection.delete_one({"_id": ObjectId(cosecha_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cosecha not found")
    
    return {"success": True, "message": "Cosecha deleted"}

# ============================================================================
# DOCUMENTOS - File Upload
# ============================================================================

@router.post("/documentos/upload")
async def upload_documento(
    file: UploadFile = File(...),
    entidad_tipo: str = "parcela",
    entidad_id: str = ""
):
    # Save file (simplified - in production use GridFS for large files)
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