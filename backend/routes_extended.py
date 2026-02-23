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
    from database import db, contratos_collection, parcelas_collection, maquinaria_collection
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
    
    # Obtener nombre de máquina si se proporciona maquina_id
    maquina_nombre = None
    if tratamiento.maquina_id and ObjectId.is_valid(tratamiento.maquina_id):
        maquina = await maquinaria_collection.find_one({"_id": ObjectId(tratamiento.maquina_id)})
        if maquina:
            maquina_nombre = maquina.get("nombre", "")
    
    # Fecha tratamiento: si no se proporciona, usar fecha actual
    fecha_tratamiento = tratamiento.fecha_tratamiento
    if not fecha_tratamiento:
        fecha_tratamiento = datetime.now().strftime("%Y-%m-%d")
    
    tratamiento_dict = tratamiento.dict()
    tratamiento_dict.update({
        "contrato_id": contrato_id,
        "cultivo_id": cultivo_id,
        "campana": campana,
        "maquina_nombre": maquina_nombre,
        "fecha_tratamiento": fecha_tratamiento,
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
    from database import maquinaria_collection
    
    if not ObjectId.is_valid(tratamiento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Obtener nombre de máquina si se proporciona maquina_id
    maquina_nombre = None
    if tratamiento.maquina_id and ObjectId.is_valid(tratamiento.maquina_id):
        maquina = await maquinaria_collection.find_one({"_id": ObjectId(tratamiento.maquina_id)})
        if maquina:
            maquina_nombre = maquina.get("nombre", "")
    
    update_data = tratamiento.dict()
    update_data["maquina_nombre"] = maquina_nombre
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
    # Recalculate total
    total = sum(item["total"] for item in update_data.get("items", []))
    update_data["total_general"] = total
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
# COSECHAS - Asociadas a Contratos
# ============================================================================

from models import CosechaCreate, CargaCosechaCreate, PlanificacionRecoleccion

@router.post("/cosechas", response_model=dict)
async def create_cosecha(
    cosecha: CosechaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireCosechasAccess)
):
    """Crear una cosecha asociada a un contrato"""
    # Obtener datos del contrato
    if not ObjectId.is_valid(cosecha.contrato_id):
        raise HTTPException(status_code=400, detail="ID de contrato inválido")
    
    contrato = await contratos_collection.find_one({"_id": ObjectId(cosecha.contrato_id)})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    # Calcular kilos estimados totales
    kilos_estimados = sum(p.kilos_estimados for p in cosecha.planificaciones)
    
    cosecha_dict = {
        "contrato_id": cosecha.contrato_id,
        # Datos denormalizados del contrato
        "proveedor": contrato.get("proveedor"),
        "cultivo": contrato.get("cultivo"),
        "variedad": contrato.get("variedad"),
        "parcela": contrato.get("parcela") or contrato.get("codigo_parcela"),
        "campana": contrato.get("campana"),
        "precio_contrato": contrato.get("precio", 0.0),
        # Estado
        "estado": "planificada",
        # Planificación
        "planificaciones": [p.dict() for p in cosecha.planificaciones],
        "kilos_totales_estimados": kilos_estimados,
        # Cargas (vacío inicialmente)
        "cargas": [],
        # Totales
        "kilos_totales_reales": 0.0,
        "kilos_descuentos": 0.0,
        "kilos_netos": 0.0,
        "importe_bruto": 0.0,
        "importe_descuentos": 0.0,
        "importe_neto": 0.0,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await cosechas_collection.insert_one(cosecha_dict)
    created = await cosechas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/cosechas")
async def get_cosechas(
    skip: int = 0,
    limit: int = 100,
    contrato_id: Optional[str] = None,
    proveedor: Optional[str] = None,
    campana: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireCosechasAccess)
):
    """Listar cosechas con filtros opcionales"""
    query = {}
    if contrato_id:
        query["contrato_id"] = contrato_id
    if proveedor:
        query["proveedor"] = {"$regex": proveedor, "$options": "i"}
    if campana:
        query["campana"] = campana
    if estado:
        query["estado"] = estado
    
    cosechas = await cosechas_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"cosechas": serialize_docs(cosechas), "total": await cosechas_collection.count_documents(query)}

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

@router.put("/cosechas/{cosecha_id}")
async def update_cosecha(
    cosecha_id: str,
    data: dict,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireCosechasAccess)
):
    """Actualizar datos de la cosecha (planificaciones, estado)"""
    if not ObjectId.is_valid(cosecha_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Campos permitidos para actualizar
    allowed_fields = ["planificaciones", "estado", "kilos_totales_estimados"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now()
    
    # Recalcular kilos estimados si se actualizan planificaciones
    if "planificaciones" in update_data:
        kilos = sum(p.get("kilos_estimados", 0) for p in update_data["planificaciones"])
        update_data["kilos_totales_estimados"] = kilos
    
    result = await cosechas_collection.update_one(
        {"_id": ObjectId(cosecha_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cosecha not found")
    
    updated = await cosechas_collection.find_one({"_id": ObjectId(cosecha_id)})
    return {"success": True, "data": serialize_doc(updated)}

@router.post("/cosechas/{cosecha_id}/cargas")
async def add_carga_cosecha(
    cosecha_id: str,
    carga: CargaCosechaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireCosechasAccess)
):
    """Añadir una carga de cosecha (positiva o descuento)"""
    if not ObjectId.is_valid(cosecha_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cosecha = await cosechas_collection.find_one({"_id": ObjectId(cosecha_id)})
    if not cosecha:
        raise HTTPException(status_code=404, detail="Cosecha not found")
    
    # Obtener precio del contrato
    precio = cosecha.get("precio_contrato", 0.0)
    
    # Calcular importe (negativo si es descuento)
    kilos = carga.kilos_reales
    if carga.es_descuento:
        kilos = -abs(kilos)  # Asegurar que es negativo
    
    importe = kilos * precio
    
    # Crear registro de carga
    carga_dict = {
        "id_carga": carga.id_carga,
        "fecha": carga.fecha,
        "kilos_reales": kilos,
        "precio": precio,
        "importe": importe,
        "es_descuento": carga.es_descuento,
        "tipo_descuento": carga.tipo_descuento,
        "num_albaran": carga.num_albaran,
        "observaciones": carga.observaciones
    }
    
    # Añadir a la lista de cargas
    cargas = cosecha.get("cargas", [])
    cargas.append(carga_dict)
    
    # Recalcular totales
    kilos_positivos = sum(c["kilos_reales"] for c in cargas if not c.get("es_descuento"))
    kilos_descuentos = abs(sum(c["kilos_reales"] for c in cargas if c.get("es_descuento")))
    kilos_netos = kilos_positivos - kilos_descuentos
    
    importe_bruto = sum(c["importe"] for c in cargas if not c.get("es_descuento"))
    importe_descuentos = abs(sum(c["importe"] for c in cargas if c.get("es_descuento")))
    importe_neto = importe_bruto - importe_descuentos
    
    # Actualizar estado si hay cargas
    estado = "en_curso" if cargas else "planificada"
    
    # Actualizar cosecha
    await cosechas_collection.update_one(
        {"_id": ObjectId(cosecha_id)},
        {"$set": {
            "cargas": cargas,
            "kilos_totales_reales": kilos_positivos,
            "kilos_descuentos": kilos_descuentos,
            "kilos_netos": kilos_netos,
            "importe_bruto": importe_bruto,
            "importe_descuentos": importe_descuentos,
            "importe_neto": importe_neto,
            "estado": estado,
            "updated_at": datetime.now()
        }}
    )
    
    updated = await cosechas_collection.find_one({"_id": ObjectId(cosecha_id)})
    return {"success": True, "data": serialize_doc(updated)}

@router.delete("/cosechas/{cosecha_id}/cargas/{id_carga}")
async def delete_carga_cosecha(
    cosecha_id: str,
    id_carga: str,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireCosechasAccess)
):
    """Eliminar una carga de cosecha"""
    if not ObjectId.is_valid(cosecha_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cosecha = await cosechas_collection.find_one({"_id": ObjectId(cosecha_id)})
    if not cosecha:
        raise HTTPException(status_code=404, detail="Cosecha not found")
    
    # Filtrar la carga a eliminar
    cargas = [c for c in cosecha.get("cargas", []) if c.get("id_carga") != id_carga]
    
    # Recalcular totales
    kilos_positivos = sum(c["kilos_reales"] for c in cargas if not c.get("es_descuento"))
    kilos_descuentos = abs(sum(c["kilos_reales"] for c in cargas if c.get("es_descuento")))
    kilos_netos = kilos_positivos - kilos_descuentos
    
    importe_bruto = sum(c["importe"] for c in cargas if not c.get("es_descuento"))
    importe_descuentos = abs(sum(c["importe"] for c in cargas if c.get("es_descuento")))
    importe_neto = importe_bruto - importe_descuentos
    
    estado = "en_curso" if cargas else "planificada"
    
    await cosechas_collection.update_one(
        {"_id": ObjectId(cosecha_id)},
        {"$set": {
            "cargas": cargas,
            "kilos_totales_reales": kilos_positivos,
            "kilos_descuentos": kilos_descuentos,
            "kilos_netos": kilos_netos,
            "importe_bruto": importe_bruto,
            "importe_descuentos": importe_descuentos,
            "importe_neto": importe_neto,
            "estado": estado,
            "updated_at": datetime.now()
        }}
    )
    
    return {"success": True, "message": "Carga eliminada"}

@router.put("/cosechas/{cosecha_id}/completar")
async def completar_cosecha(
    cosecha_id: str,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireCosechasAccess)
):
    """Marcar cosecha como completada"""
    if not ObjectId.is_valid(cosecha_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await cosechas_collection.update_one(
        {"_id": ObjectId(cosecha_id)},
        {"$set": {"estado": "completada", "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cosecha not found")
    
    updated = await cosechas_collection.find_one({"_id": ObjectId(cosecha_id)})
    return {"success": True, "data": serialize_doc(updated)}

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