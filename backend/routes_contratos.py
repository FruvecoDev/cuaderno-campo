"""
Routes for Contratos (Contracts) - CRUD operations
Extracted from routes_main.py for better code organization
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import ContratoCreate
from database import contratos_collection, serialize_doc, serialize_docs, db
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireContratosAccess, get_current_user
)
from services.audit_service import create_audit_log, calculate_changes

router = APIRouter(prefix="/api", tags=["contratos"])

# Collections for lookups
proveedores_collection = db['proveedores']
clientes_collection = db['clientes']
cultivos_collection = db['cultivos']


@router.post("/contratos", response_model=dict)
async def create_contrato(
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireContratosAccess)
):
    # Get next number
    last_contrato = await contratos_collection.find_one(sort=[("numero", -1)])
    next_numero = (last_contrato.get("numero", 0) if last_contrato else 0) + 1
    
    # Lookup proveedor name (para contratos de Compra)
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cliente name (para contratos de Venta)
    cliente_name = ""
    cliente_id_str = getattr(contrato, 'cliente_id', None) or ""
    if cliente_id_str:
        cli = await clientes_collection.find_one({"_id": ObjectId(cliente_id_str)})
        if cli:
            cliente_name = cli.get("nombre", "")
    
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
        "cliente": cliente_name,
        "cliente_id": cliente_id_str,
        "cultivo": cultivo_name,
        "cultivo_id": cultivo_id_str,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.insert_one(contrato_dict)
    created = await contratos_collection.find_one({"_id": result.inserted_id})
    
    # Registrar en auditoría
    await create_audit_log(
        collection_name="contratos",
        document_id=str(result.inserted_id),
        action="create",
        user_email=current_user.get("email", "unknown"),
        user_name=current_user.get("full_name", current_user.get("username", "Usuario")),
        new_data=serialize_doc(created.copy())
    )
    
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
    
    # Obtener documento anterior para auditoría
    old_doc = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not old_doc:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    # Lookup proveedor name (para contratos de Compra)
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cliente name (para contratos de Venta)
    cliente_name = ""
    cliente_id_str = getattr(contrato, 'cliente_id', None) or ""
    if cliente_id_str:
        cli = await clientes_collection.find_one({"_id": ObjectId(cliente_id_str)})
        if cli:
            cliente_name = cli.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    update_data = contrato.dict()
    update_data.update({
        "proveedor": proveedor_name,
        "cliente": cliente_name,
        "cliente_id": cliente_id_str,
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
    
    # Calcular cambios y registrar en auditoría
    changes = calculate_changes(serialize_doc(old_doc.copy()), serialize_doc(updated.copy()))
    if changes:  # Solo registrar si hay cambios reales
        await create_audit_log(
            collection_name="contratos",
            document_id=contrato_id,
            action="update",
            user_email=current_user.get("email", "unknown"),
            user_name=current_user.get("full_name", current_user.get("username", "Usuario")),
            changes=changes
        )
    
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/contratos/{contrato_id}")
async def delete_contrato(
    contrato_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Obtener documento antes de eliminar para auditoría
    old_doc = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not old_doc:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    result = await contratos_collection.delete_one({"_id": ObjectId(contrato_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    # Registrar eliminación en auditoría
    await create_audit_log(
        collection_name="contratos",
        document_id=contrato_id,
        action="delete",
        user_email=current_user.get("email", "unknown"),
        user_name=current_user.get("full_name", current_user.get("username", "Usuario")),
        previous_data=serialize_doc(old_doc.copy())
    )
    
    return {"success": True, "message": "Contrato deleted"}



@router.post("/contratos/regenerar-numeros")
async def regenerar_numeros_contratos(
    current_user: dict = Depends(RequireEdit)
):
    """
    Regenera el campo numero_contrato para todos los contratos existentes
    basándose en serie, año y numero.
    Formato: MP-{año}-{numero_6_digitos}
    """
    # Solo admin puede ejecutar esta operación
    if current_user.get('role') != 'Admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden regenerar números")
    
    # Obtener todos los contratos
    contratos = await contratos_collection.find({}).to_list(10000)
    
    actualizados = 0
    errores = []
    
    for contrato in contratos:
        try:
            serie = contrato.get("serie", "MP")
            año = contrato.get("año", datetime.now().year)
            numero = contrato.get("numero", 0)
            
            # Generar numero_contrato formateado
            numero_contrato = f"{serie}-{año}-{str(numero).zfill(6)}"
            
            # Actualizar el documento
            await contratos_collection.update_one(
                {"_id": contrato["_id"]},
                {"$set": {"numero_contrato": numero_contrato}}
            )
            actualizados += 1
        except Exception as e:
            errores.append({
                "id": str(contrato.get("_id")),
                "error": str(e)
            })
    
    return {
        "success": True,
        "message": f"Regenerados {actualizados} números de contrato",
        "actualizados": actualizados,
        "errores": errores,
        "total_contratos": len(contratos)
    }
