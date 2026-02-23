from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import (
    ContratoCreate, ParcelaCreate, VisitaCreate, FincaCreate
)
from database import (
    contratos_collection, parcelas_collection, visitas_collection,
    fincas_collection, serialize_doc, serialize_docs, db
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireContratosAccess, RequireParcelasAccess, RequireVisitasAccess,
    RequireFincasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["main"])

# Collections for lookups
proveedores_collection = db['proveedores']
cultivos_collection = db['cultivos']

# ============================================================================
# CONTRATOS
# ============================================================================

@router.post("/contratos", response_model=dict)
async def create_contrato(
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireContratosAccess)
):
    # Get next number
    last_contrato = await contratos_collection.find_one(sort=[("numero", -1)])
    next_numero = (last_contrato.get("numero", 0) if last_contrato else 0) + 1
    
    # Lookup proveedor name
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    cultivo_id_str = contrato.cultivo_id or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    contrato_dict = contrato.dict()
    contrato_dict.update({
        "serie": "MP",
        "año": datetime.now().year,
        "numero": next_numero,
        "proveedor": proveedor_name,
        "cultivo": cultivo_name,
        "cultivo_id": cultivo_id_str,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.insert_one(contrato_dict)
    created = await contratos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/contratos")
async def get_contratos(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    proveedor: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    if proveedor:
        query["proveedor"] = {"$regex": proveedor, "$options": "i"}
    
    contratos = await contratos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"contratos": serialize_docs(contratos), "total": await contratos_collection.count_documents(query)}

@router.get("/contratos/{contrato_id}")
async def get_contrato(
    contrato_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    return serialize_doc(contrato)

@router.put("/contratos/{contrato_id}")
async def update_contrato(
    contrato_id: str,
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Lookup proveedor name
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    update_data = contrato.dict()
    update_data.update({
        "proveedor": proveedor_name,
        "cultivo": cultivo_name,
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.update_one(
        {"_id": ObjectId(contrato_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    updated = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    return {"success": True, "data": serialize_doc(updated)}

@router.delete("/contratos/{contrato_id}")
async def delete_contrato(
    contrato_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await contratos_collection.delete_one({"_id": ObjectId(contrato_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    return {"success": True, "message": "Contrato deleted"}

# ============================================================================
# PARCELAS
# ============================================================================

@router.post("/parcelas", response_model=dict)
async def create_parcela(
    parcela: ParcelaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireParcelasAccess)
):
    parcela_dict = parcela.dict()
    parcela_dict.update({
        "activo": True,
        "unidad_medida": "ha",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await parcelas_collection.insert_one(parcela_dict)
    created = await parcelas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/parcelas")
async def get_parcelas(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    proveedor: Optional[str] = None,
    contrato_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireParcelasAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    if proveedor:
        query["proveedor"] = {"$regex": proveedor, "$options": "i"}
    if contrato_id:
        query["contrato_id"] = contrato_id
    
    parcelas = await parcelas_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"parcelas": serialize_docs(parcelas), "total": await parcelas_collection.count_documents(query)}

@router.get("/parcelas/{parcela_id}")
async def get_parcela(
    parcela_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    return serialize_doc(parcela)

@router.put("/parcelas/{parcela_id}")
async def update_parcela(
    parcela_id: str,
    parcela: ParcelaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = parcela.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await parcelas_collection.update_one(
        {"_id": ObjectId(parcela_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    updated = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    return {"success": True, "data": serialize_doc(updated)}

@router.delete("/parcelas/{parcela_id}")
async def delete_parcela(
    parcela_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireParcelasAccess)
):
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await parcelas_collection.delete_one({"_id": ObjectId(parcela_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    return {"success": True, "message": "Parcela deleted"}

# ============================================================================
# VISITAS - MODELO SIMPLIFICADO
# Solo requiere parcela_id, el resto se hereda automáticamente
# ============================================================================

@router.post("/visitas", response_model=dict)
async def create_visita(
    visita: VisitaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireVisitasAccess)
):
    # MODELO SIMPLIFICADO: parcela_id es obligatorio, el resto se hereda
    if not visita.parcela_id:
        raise HTTPException(status_code=400, detail="parcela_id es obligatorio")
    
    if not ObjectId.is_valid(visita.parcela_id):
        raise HTTPException(status_code=400, detail="parcela_id inválido")
    
    # Obtener la parcela para heredar datos
    parcela = await parcelas_collection.find_one({"_id": ObjectId(visita.parcela_id)})
    if not parcela:
        raise HTTPException(status_code=400, detail="Parcela no encontrada")
    
    # Heredar datos desde la parcela
    contrato_id = parcela.get("contrato_id", "")
    proveedor = parcela.get("proveedor", "")
    cultivo = parcela.get("cultivo", "")
    campana = parcela.get("campana", "")
    variedad = parcela.get("variedad", "")
    codigo_plantacion = parcela.get("codigo_plantacion", "")
    finca = parcela.get("finca", "")
    
    # Si la parcela tiene contrato_id, buscar cultivo_id desde el contrato
    cultivo_id = ""
    if contrato_id:
        contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
        if contrato:
            cultivo_id = contrato.get("cultivo_id", "")
            # Actualizar datos heredados si el contrato tiene más información
            if not proveedor:
                proveedor = contrato.get("proveedor", "")
            if not cultivo:
                cultivo = contrato.get("cultivo", "")
            if not campana:
                campana = contrato.get("campana", "")
    
    visita_dict = {
        "objetivo": visita.objetivo,
        "parcela_id": visita.parcela_id,
        "contrato_id": contrato_id,
        "cultivo_id": cultivo_id,
        "proveedor": proveedor,
        "cultivo": cultivo,
        "campana": campana,
        "variedad": variedad,
        "codigo_plantacion": codigo_plantacion,
        "finca": finca,
        "fecha_visita": visita.fecha_visita or "",
        "observaciones": visita.observaciones or "",
        "realizado": False,
        "planificado": False,
        "documentos": [],
        "formularios": [],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await visitas_collection.insert_one(visita_dict)
    created = await visitas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/visitas")
async def get_visitas(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireVisitasAccess)
):
    query = {}
    if parcela_id:
        query["parcela_id"] = parcela_id
    if campana:
        query["campana"] = campana
    
    visitas = await visitas_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"visitas": serialize_docs(visitas), "total": await visitas_collection.count_documents(query)}

@router.get("/visitas/{visita_id}")
async def get_visita(
    visita_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireVisitasAccess)
):
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    visita = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    if not visita:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    return serialize_doc(visita)

@router.put("/visitas/{visita_id}")
async def update_visita(
    visita_id: str,
    visita: VisitaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireVisitasAccess)
):
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # MODELO SIMPLIFICADO: si cambia la parcela, re-heredar datos
    update_data = {"updated_at": datetime.now()}
    
    if visita.parcela_id:
        if not ObjectId.is_valid(visita.parcela_id):
            raise HTTPException(status_code=400, detail="parcela_id inválido")
        
        parcela = await parcelas_collection.find_one({"_id": ObjectId(visita.parcela_id)})
        if not parcela:
            raise HTTPException(status_code=400, detail="Parcela no encontrada")
        
        # Heredar datos desde la parcela
        contrato_id = parcela.get("contrato_id", "")
        cultivo_id = ""
        if contrato_id:
            contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
            if contrato:
                cultivo_id = contrato.get("cultivo_id", "")
        
        update_data.update({
            "parcela_id": visita.parcela_id,
            "contrato_id": contrato_id,
            "cultivo_id": cultivo_id,
            "proveedor": parcela.get("proveedor", ""),
            "cultivo": parcela.get("cultivo", ""),
            "campana": parcela.get("campana", ""),
            "variedad": parcela.get("variedad", ""),
            "codigo_plantacion": parcela.get("codigo_plantacion", ""),
            "finca": parcela.get("finca", "")
        })
    
    # Actualizar campos editables por el usuario
    update_data["objetivo"] = visita.objetivo
    if visita.fecha_visita:
        update_data["fecha_visita"] = visita.fecha_visita
    if visita.observaciones is not None:
        update_data["observaciones"] = visita.observaciones
    
    result = await visitas_collection.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    updated = await visitas_collection.find_one({"_id": ObjectId(visita_id)})
    return {"success": True, "data": serialize_doc(updated)}

@router.delete("/visitas/{visita_id}")
async def delete_visita(
    visita_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireVisitasAccess)
):
    if not ObjectId.is_valid(visita_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await visitas_collection.delete_one({"_id": ObjectId(visita_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    return {"success": True, "message": "Visita deleted"}

# ============================================================================
# FINCAS
# ============================================================================

@router.post("/fincas", response_model=dict)
async def create_finca(
    finca: FincaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireFincasAccess)
):
    finca_dict = finca.dict()
    finca_dict.update({
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await fincas_collection.insert_one(finca_dict)
    created = await fincas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/fincas")
async def get_fincas(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    
    fincas = await fincas_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"fincas": serialize_docs(fincas), "total": await fincas_collection.count_documents(query)}

@router.get("/fincas/{finca_id}")
async def get_finca(
    finca_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    finca = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca not found")
    
    return serialize_doc(finca)

@router.delete("/fincas/{finca_id}")
async def delete_finca(
    finca_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireFincasAccess)
):
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await fincas_collection.delete_one({"_id": ObjectId(finca_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Finca not found")
    
    return {"success": True, "message": "Finca deleted"}
