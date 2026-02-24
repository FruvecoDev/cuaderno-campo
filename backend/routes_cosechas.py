"""
Routes for Cosechas (Harvests) - CRUD operations with contract integration
Extracted from routes_extended.py for better code organization
Associated with contracts, includes load management and quality pricing
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import CosechaCreate, CargaCosechaCreate
from database import (
    cosechas_collection, contratos_collection,
    serialize_doc, serialize_docs
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireCosechasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["cosechas"])


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
    
    # Obtener precio base del contrato
    precio = cosecha.get("precio_contrato", 0.0)
    cultivo = (cosecha.get("cultivo") or "").lower()
    
    # Si es guisante y tiene valor de tenderometría, buscar precio en tabla del contrato
    valor_tenderometria = carga.valor_tenderometria
    if "guisante" in cultivo and valor_tenderometria is not None and not carga.es_descuento:
        # Obtener el contrato para buscar la tabla de precios por tenderometría
        contrato_id = cosecha.get("contrato_id")
        if contrato_id and ObjectId.is_valid(contrato_id):
            contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
            if contrato:
                precios_calidad = contrato.get("precios_calidad", [])
                # Buscar el precio que corresponde al valor de tenderometría
                for pc in precios_calidad:
                    min_tend = pc.get("min_tenderometria")
                    max_tend = pc.get("max_tenderometria")
                    if min_tend is not None and max_tend is not None:
                        if min_tend <= valor_tenderometria <= max_tend:
                            precio = pc.get("precio", precio)
                            break
    
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
        "valor_tenderometria": valor_tenderometria,
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
