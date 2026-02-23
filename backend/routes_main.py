from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import json

from models import (
    ContratoBase, ContratoCreate, ContratoInDB,
    ParcelaBase, ParcelaCreate, ParcelaInDB,
    FincaBase, FincaCreate, FincaInDB,
    VisitaBase, VisitaCreate, VisitaInDB,
    TareaBase, TareaCreate, TareaInDB,
    CosechaBase, CosechaCreate, CosechaInDB
)
from database import (
    contratos_collection, parcelas_collection, fincas_collection,
    visitas_collection, tareas_collection, cosechas_collection,
    serialize_doc, serialize_docs, db
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireContratosAccess, RequireParcelasAccess, RequireFincasAccess,
    RequireVisitasAccess, RequireTareasAccess, RequireCosechasAccess,
    get_current_user
)

router = APIRouter(prefix="/api", tags=["main"])

# ============================================================================
# CONTRATOS
# ============================================================================

@router.post("/contratos", response_model=dict)
async def create_contrato(
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireContratosAccess)
):
    # Validar referencias a catálogos
    proveedores_collection = db['proveedores']
    cultivos_collection = db['cultivos']
    
    proveedor = None
    cultivo = None
    
    # Validar proveedor existe
    if contrato.proveedor_id:
        proveedor = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if not proveedor:
            raise HTTPException(status_code=400, detail="Proveedor no encontrado")
    
    # Validar cultivo existe
    if contrato.cultivo_id:
        cultivo = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if not cultivo:
            raise HTTPException(status_code=400, detail="Cultivo no encontrado")
    
    # Get next numero
    last_contrato = await contratos_collection.find_one(
        {"año": datetime.now().year},
        sort=[("numero", -1)]
    )
    numero = (last_contrato["numero"] + 1) if last_contrato else 1
    
    contrato_dict = contrato.dict()
    contrato_dict.update({
        "serie": "MP",
        "año": datetime.now().year,
        "numero": numero,
        "tipo_contrato": "Por Kilos",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    # Poblar nombres para compatibilidad/reportes
    if proveedor:
        contrato_dict['proveedor'] = proveedor['nombre']
    if cultivo:
        contrato_dict['cultivo'] = f"{cultivo['nombre']} {cultivo.get('variedad', '')}".strip()
    
    result = await contratos_collection.insert_one(contrato_dict)
    created = await contratos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/contratos")
async def get_contratos(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    contratos = await contratos_collection.find().skip(skip).limit(limit).to_list(limit)
    
    # Poblar datos de proveedor y cultivo
    proveedores_collection = db['proveedores']
    cultivos_collection = db['cultivos']
    
    for contrato in contratos:
        # Poblar proveedor
        if contrato.get('proveedor_id'):
            proveedor = await proveedores_collection.find_one({"_id": ObjectId(contrato['proveedor_id'])})
            if proveedor:
                contrato['proveedor_data'] = serialize_doc(proveedor)
        
        # Poblar cultivo
        if contrato.get('cultivo_id'):
            cultivo = await cultivos_collection.find_one({"_id": ObjectId(contrato['cultivo_id'])})
            if cultivo:
                contrato['cultivo_data'] = serialize_doc(cultivo)
    
    return {"contratos": serialize_docs(contratos), "total": await contratos_collection.count_documents({})}

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
    
    update_data = contrato.dict()
    update_data["updated_at"] = datetime.now()
    
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
    activo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireParcelasAccess)
):
    query = {}
    if activo is not None:
        query["activo"] = activo
    
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
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    fincas = await fincas_collection.find().skip(skip).limit(limit).to_list(limit)
    return {"fincas": serialize_docs(fincas), "total": await fincas_collection.count_documents({})}

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

@router.put("/fincas/{finca_id}")
async def update_finca(
    finca_id: str,
    finca: FincaCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireFincasAccess)
):
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = finca.dict()
    update_data["updated_at"] = datetime.now()
    
    result = await fincas_collection.update_one(
        {"_id": ObjectId(finca_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Finca not found")
    
    updated = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    return {"success": True, "data": serialize_doc(updated)}

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

# ============================================================================
# VISITAS
# ============================================================================

@router.post("/visitas", response_model=dict)
async def create_visita(
    visita: VisitaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireVisitasAccess)
):
    visita_dict = visita.dict()
    visita_dict.update({
        "realizado": False,
        "planificado": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await visitas_collection.insert_one(visita_dict)
    created = await visitas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}

@router.get("/visitas")
async def get_visitas(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireVisitasAccess)
):
    query = {}
    if parcela_id:
        query["parcela_id"] = parcela_id
    
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
    
    update_data = visita.dict()
    update_data["updated_at"] = datetime.now()
    
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