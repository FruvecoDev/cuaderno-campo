"""
Routes for Extended modules - Smaller CRUD operations
Includes: Recetas, Albaranes, Documentos
Refactored: Irrigaciones and Tareas moved to dedicated router files.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models_tratamientos import RecetaCreate, AlbaranCreate
from database import (
    recetas_collection, albaranes_collection,
    documentos_collection, serialize_doc, serialize_docs, db
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireRecetasAccess, RequireAlbaranesAccess,
    get_current_user
)

router = APIRouter(prefix="/api", tags=["extended"])

# Collection for contracts (to get descuento_destare)
contratos_collection = db['contratos']


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
    
    # Calcular plazo de seguridad máximo de los productos
    if update_data.get("productos"):
        max_plazo = max([p.get("plazo_seguridad", 0) or 0 for p in update_data["productos"]], default=0)
        if max_plazo > update_data.get("plazo_seguridad", 0):
            update_data["plazo_seguridad"] = max_plazo
    
    result = await recetas_collection.update_one(
        {"_id": ObjectId(receta_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Receta not found")
    
    updated = await recetas_collection.find_one({"_id": ObjectId(receta_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.get("/recetas/stats/dashboard")
async def get_recetas_stats(
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireRecetasAccess)
):
    """Obtener estadísticas del módulo de recetas"""
    total = await recetas_collection.count_documents({})
    activas = await recetas_collection.count_documents({"activa": {"$ne": False}})
    
    # Recetas por tipo de tratamiento
    por_tipo = await recetas_collection.aggregate([
        {"$group": {"_id": "$tipo_tratamiento", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)
    
    # Recetas por cultivo
    por_cultivo = await recetas_collection.aggregate([
        {"$group": {"_id": "$cultivo_objetivo", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # Promedio de productos por receta
    avg_productos = await recetas_collection.aggregate([
        {"$project": {"num_productos": {"$size": {"$ifNull": ["$productos", []]}}}},
        {"$group": {"_id": None, "avg": {"$avg": "$num_productos"}}}
    ]).to_list(1)
    
    return {
        "total": total,
        "activas": activas,
        "inactivas": total - activas,
        "por_tipo": {item["_id"] or "Sin tipo": item["count"] for item in por_tipo},
        "por_cultivo": {item["_id"] or "Sin cultivo": item["count"] for item in por_cultivo},
        "promedio_productos": round(avg_productos[0]["avg"], 1) if avg_productos else 0
    }


@router.post("/recetas/{receta_id}/calcular-dosis")
async def calcular_dosis_receta(
    receta_id: str,
    superficie: float,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireRecetasAccess)
):
    """Calcular cantidades de productos para una superficie dada"""
    if not ObjectId.is_valid(receta_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    receta = await recetas_collection.find_one({"_id": ObjectId(receta_id)})
    if not receta:
        raise HTTPException(status_code=404, detail="Receta not found")
    
    productos_calculados = []
    for producto in receta.get("productos", []):
        dosis = producto.get("dosis", 0)
        unidad = producto.get("unidad", "")
        
        # Calcular cantidad total
        cantidad_total = dosis * superficie
        
        productos_calculados.append({
            "nombre_comercial": producto.get("nombre_comercial", ""),
            "materia_activa": producto.get("materia_activa", ""),
            "dosis_por_ha": dosis,
            "unidad": unidad,
            "superficie_ha": superficie,
            "cantidad_total": round(cantidad_total, 2),
            "plazo_seguridad": producto.get("plazo_seguridad", 0)
        })
    
    return {
        "receta": receta.get("nombre"),
        "superficie_ha": superficie,
        "productos": productos_calculados,
        "plazo_seguridad_max": receta.get("plazo_seguridad", 0)
    }


# ============================================================================
# ALBARANES
# ============================================================================

# Collection for commission records
comisiones_collection = db['comisiones_generadas']
agentes_collection = db['agentes']


def calcular_comision_agente(tipo_comision: str, valor_comision: float, kilos_netos: float, precio_kg: float) -> float:
    """
    Calcula el importe de la comisión según el tipo
    - porcentaje: (kilos_netos * precio * valor / 100)
    - euro_kilo: (kilos_netos * valor)
    """
    if not valor_comision or valor_comision <= 0:
        return 0.0
    
    if tipo_comision == 'porcentaje':
        return round(kilos_netos * precio_kg * (valor_comision / 100), 2)
    elif tipo_comision == 'euro_kilo':
        return round(kilos_netos * valor_comision, 2)
    return 0.0


@router.post("/albaranes", response_model=dict)
async def create_albaran(
    albaran: AlbaranCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    albaran_dict = albaran.dict()
    
    # Variables para el cálculo
    kilos_brutos = 0
    kilos_destare = 0
    kilos_netos = 0
    descuento_aplicado = None
    comision_generada = None
    contrato = None
    
    # Calcular kilos brutos de las líneas existentes (solo items con kg)
    for item in albaran_dict.get("items", []):
        if item.get("unidad", "kg").lower() in ["kg", "kilos", "kilogramos"]:
            kilos_brutos += item.get("cantidad", 0)
    
    # Si el albarán tiene contrato_id, buscar datos del contrato
    if albaran.contrato_id:
        contrato = await contratos_collection.find_one({"_id": ObjectId(albaran.contrato_id)})
    
    # Aplicar descuento destare si corresponde (solo para compras/entradas)
    # Aceptar tanto "Entrada" como "Albarán de compra"
    es_compra = albaran.tipo in ["Entrada", "Albarán de compra", "entrada", "compra"]
    if contrato and es_compra and contrato.get("tipo") == "Compra":
        descuento_porcentaje = float(contrato.get("descuento_destare", 0) or 0)
        
        if descuento_porcentaje > 0 and kilos_brutos > 0:
            # Calcular kilos de descuento
            kilos_destare = round(kilos_brutos * (descuento_porcentaje / 100), 2)
            
            # Obtener el precio de la primera línea (o del contrato)
            precio_unitario = albaran_dict.get("items", [{}])[0].get("precio_unitario", 0)
            if not precio_unitario and contrato.get("precio"):
                precio_unitario = float(contrato.get("precio", 0))
            
            # Crear línea de descuento destare con precio=0 e importe=0
            # La línea solo muestra los kilos descontados, pero el cálculo real 
            # se hace en el total del albarán: (kilos_brutos - kilos_destare) * precio
            linea_destare = {
                "descripcion": f"Descuento Destare ({descuento_porcentaje}%)",
                "producto": "DESTARE",
                "lote": "",
                "cantidad": kilos_destare,  # Positivo para mostrar los kilos descontados
                "unidad": "kg",
                "precio_unitario": 0,  # Precio cero
                "total": 0,  # Importe cero
                "es_destare": True  # Marcador para identificar línea de destare
            }
            
            # Añadir línea de destare a los items
            albaran_dict["items"].append(linea_destare)
            
            # Calcular total del albarán: (kilos_brutos - kilos_destare) * precio
            # El total NO se calcula sumando las líneas, sino con la fórmula de kilos netos
            kilos_netos = kilos_brutos - kilos_destare
            albaran_dict["total_albaran"] = round(kilos_netos * precio_unitario, 2)
            
            descuento_aplicado = {
                "porcentaje": descuento_porcentaje,
                "kilos_descontados": kilos_destare,
                "importe_descontado": round(kilos_destare * precio_unitario, 2)
            }
    
    # Calcular kilos netos
    kilos_netos = round(kilos_brutos - kilos_destare, 2)
    
    # Guardar datos de kilos en el albarán
    albaran_dict["kilos_brutos"] = kilos_brutos
    albaran_dict["kilos_destare"] = kilos_destare
    albaran_dict["kilos_netos"] = kilos_netos
    
    albaran_dict.update({
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    # Insertar albarán
    result = await albaranes_collection.insert_one(albaran_dict)
    albaran_id = str(result.inserted_id)
    
    # Generar registro de comisión si el contrato tiene agente
    if contrato and kilos_netos > 0:
        agente_id = None
        tipo_comision = None
        valor_comision = 0
        tipo_agente = None
        
        # Aceptar tanto "Entrada" como "Albarán de compra"
        es_compra = albaran.tipo in ["Entrada", "Albarán de compra", "entrada", "compra"]
        es_venta = albaran.tipo in ["Salida", "Albarán de venta", "salida", "venta"]
        
        if es_compra and contrato.get("agente_compra"):
            # Albarán de compra -> comisión de compra
            agente_id = contrato.get("agente_compra")
            tipo_comision = contrato.get("comision_compra_tipo") or contrato.get("comision_tipo")
            valor_comision = contrato.get("comision_compra_valor") or contrato.get("comision_valor") or 0
            tipo_agente = "compra"
        elif es_venta and contrato.get("agente_venta"):
            # Albarán de venta -> comisión de venta
            agente_id = contrato.get("agente_venta")
            tipo_comision = contrato.get("comision_venta_tipo")
            valor_comision = contrato.get("comision_venta_valor") or 0
            tipo_agente = "venta"
        
        if agente_id and valor_comision > 0:
            # Obtener precio promedio del albarán para calcular comisión
            precio_kg = albaran_dict.get("total_albaran", 0) / kilos_netos if kilos_netos > 0 else 0
            # Ajustar precio si hay destare (usar precio sin destare)
            if kilos_destare > 0:
                total_sin_destare = sum(
                    item.get("total", 0) for item in albaran_dict["items"] 
                    if not item.get("es_destare")
                )
                precio_kg = total_sin_destare / kilos_brutos if kilos_brutos > 0 else 0
            
            # Calcular importe de comisión basado en kilos netos
            importe_comision = calcular_comision_agente(tipo_comision, valor_comision, kilos_netos, precio_kg)
            
            if importe_comision > 0:
                # Obtener datos del agente
                agente_doc = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
                agente_nombre = agente_doc.get("nombre", "Agente") if agente_doc else "Agente"
                
                # Crear registro de comisión
                comision_record = {
                    "albaran_id": albaran_id,
                    "contrato_id": albaran.contrato_id,
                    "agente_id": agente_id,
                    "agente_nombre": agente_nombre,
                    "tipo_agente": tipo_agente,
                    "fecha_albaran": albaran.fecha,
                    "campana": albaran.campana or contrato.get("campana"),
                    "proveedor": albaran.proveedor if tipo_agente == "compra" else None,
                    "cliente": albaran.cliente if tipo_agente == "venta" else None,
                    "cultivo": albaran.cultivo or contrato.get("cultivo"),
                    # Kilos
                    "kilos_brutos": kilos_brutos,
                    "kilos_destare": kilos_destare,
                    "kilos_netos": kilos_netos,
                    "precio_kg": round(precio_kg, 4),
                    # Comisión
                    "comision_tipo": tipo_comision,
                    "comision_valor": valor_comision,
                    "comision_importe": importe_comision,
                    # Metadata
                    "estado": "pendiente",  # pendiente, pagada, anulada
                    "created_at": datetime.now(),
                    "created_by": current_user.get("email", "unknown")
                }
                
                comision_result = await comisiones_collection.insert_one(comision_record)
                
                comision_generada = {
                    "comision_id": str(comision_result.inserted_id),
                    "agente": agente_nombre,
                    "tipo_agente": tipo_agente,
                    "kilos_netos": kilos_netos,
                    "comision_tipo": tipo_comision,
                    "comision_valor": valor_comision,
                    "importe": importe_comision
                }
    
    created = await albaranes_collection.find_one({"_id": result.inserted_id})
    
    response = {"success": True, "data": serialize_doc(created)}
    if descuento_aplicado:
        response["descuento_destare_aplicado"] = descuento_aplicado
    if comision_generada:
        response["comision_generada"] = comision_generada
    
    return response


@router.get("/albaranes")
async def get_albaranes(
    skip: int = 0,
    limit: int = 100,
    tipo: Optional[str] = None,
    contrato_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    query = {}
    if tipo:
        query["tipo"] = tipo
    if contrato_id:
        query["contrato_id"] = contrato_id
    
    albaranes = await albaranes_collection.find(query).sort("fecha", -1).skip(skip).limit(limit).to_list(limit)
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
    
    # Variables para el cálculo (similar a create)
    kilos_brutos = 0
    kilos_destare = 0
    kilos_netos = 0
    contrato = None
    
    # Calcular kilos brutos de las líneas existentes (solo items con kg)
    for item in update_data.get("items", []):
        if item.get("unidad", "kg").lower() in ["kg", "kilos", "kilogramos"]:
            kilos_brutos += item.get("cantidad", 0)
    
    # Si el albarán tiene contrato_id, buscar datos del contrato
    if albaran.contrato_id:
        contrato = await contratos_collection.find_one({"_id": ObjectId(albaran.contrato_id)})
    
    # Aplicar descuento destare si corresponde (solo para compras/entradas)
    es_compra = albaran.tipo in ["Entrada", "Albarán de compra", "entrada", "compra"]
    if contrato and es_compra and contrato.get("tipo") == "Compra":
        descuento_porcentaje = float(contrato.get("descuento_destare", 0) or 0)
        
        if descuento_porcentaje > 0 and kilos_brutos > 0:
            # Calcular kilos de descuento
            kilos_destare = round(kilos_brutos * (descuento_porcentaje / 100), 2)
            
            # Obtener el precio de la primera línea (o del contrato)
            precio_unitario = update_data.get("items", [{}])[0].get("precio_unitario", 0)
            if not precio_unitario and contrato.get("precio"):
                precio_unitario = float(contrato.get("precio", 0))
            
            # Crear línea de descuento destare con precio=0 e importe=0
            linea_destare = {
                "descripcion": f"Descuento Destare ({descuento_porcentaje}%)",
                "producto": "DESTARE",
                "lote": "",
                "cantidad": kilos_destare,  # Positivo para mostrar los kilos descontados
                "unidad": "kg",
                "precio_unitario": 0,
                "total": 0,
                "es_destare": True
            }
            
            # Añadir línea de destare a los items
            update_data["items"].append(linea_destare)
            
            # Calcular total del albarán: (kilos_brutos - kilos_destare) * precio
            kilos_netos = kilos_brutos - kilos_destare
            update_data["total_albaran"] = round(kilos_netos * precio_unitario, 2)
    
    # Calcular kilos netos si no hay destare
    if kilos_netos == 0:
        kilos_netos = kilos_brutos
    
    # Guardar datos de kilos en el albarán
    update_data["kilos_brutos"] = kilos_brutos
    update_data["kilos_destare"] = kilos_destare
    update_data["kilos_netos"] = kilos_netos
    
    update_data["updated_at"] = datetime.now()
    
    result = await albaranes_collection.update_one(
        {"_id": ObjectId(albaran_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Albaran not found")
    
    updated = await albaranes_collection.find_one({"_id": ObjectId(albaran_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.get("/albaranes/stats/dashboard")
async def get_albaranes_stats(
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """Obtener estadísticas del módulo de albaranes"""
    total = await albaranes_collection.count_documents({})
    
    # Por tipo
    entradas = await albaranes_collection.count_documents({"tipo": "Entrada"})
    salidas = await albaranes_collection.count_documents({"tipo": "Salida"})
    
    # Totales de importes
    pipeline_totales = [
        {"$group": {
            "_id": "$tipo",
            "total_importe": {"$sum": "$total_albaran"},
            "count": {"$sum": 1}
        }}
    ]
    totales_tipo = await albaranes_collection.aggregate(pipeline_totales).to_list(10)
    
    total_entradas = next((t["total_importe"] for t in totales_tipo if t["_id"] == "Entrada"), 0)
    total_salidas = next((t["total_importe"] for t in totales_tipo if t["_id"] == "Salida"), 0)
    
    # Por proveedor (top 5)
    pipeline_proveedor = [
        {"$match": {"proveedor": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$proveedor", "count": {"$sum": 1}, "total": {"$sum": "$total_albaran"}}},
        {"$sort": {"total": -1}},
        {"$limit": 5}
    ]
    por_proveedor = await albaranes_collection.aggregate(pipeline_proveedor).to_list(5)
    
    # Por cultivo (top 5)
    pipeline_cultivo = [
        {"$match": {"cultivo": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$cultivo", "count": {"$sum": 1}, "total": {"$sum": "$total_albaran"}}},
        {"$sort": {"total": -1}},
        {"$limit": 5}
    ]
    por_cultivo = await albaranes_collection.aggregate(pipeline_cultivo).to_list(5)
    
    # Promedio de líneas por albarán
    avg_items = await albaranes_collection.aggregate([
        {"$project": {"num_items": {"$size": {"$ifNull": ["$items", []]}}}},
        {"$group": {"_id": None, "avg": {"$avg": "$num_items"}}}
    ]).to_list(1)
    
    return {
        "total": total,
        "entradas": entradas,
        "salidas": salidas,
        "total_entradas": round(total_entradas, 2),
        "total_salidas": round(total_salidas, 2),
        "balance": round(total_entradas - total_salidas, 2),
        "por_proveedor": [{
            "proveedor": p["_id"],
            "count": p["count"],
            "total": round(p["total"], 2)
        } for p in por_proveedor],
        "por_cultivo": [{
            "cultivo": c["_id"],
            "count": c["count"],
            "total": round(c["total"], 2)
        } for c in por_cultivo],
        "promedio_items": round(avg_items[0]["avg"], 1) if avg_items else 0
    }


@router.get("/albaranes/export/excel")
async def export_albaranes_excel(
    tipo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """Exportar albaranes a formato Excel (JSON preparado para frontend)"""
    query = {}
    if tipo:
        query["tipo"] = tipo
    if fecha_desde or fecha_hasta:
        query["fecha"] = {}
        if fecha_desde:
            query["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            query["fecha"]["$lte"] = fecha_hasta
    
    albaranes = await albaranes_collection.find(query).sort("fecha", -1).to_list(1000)
    
    # Preparar datos para Excel
    rows = []
    for a in albaranes:
        # Una fila por cada línea del albarán
        items = a.get("items", [])
        if items:
            for item in items:
                rows.append({
                    "id": str(a.get("_id", "")),
                    "tipo": a.get("tipo", ""),
                    "fecha": a.get("fecha", ""),
                    "proveedor": a.get("proveedor", ""),
                    "cultivo": a.get("cultivo", ""),
                    "parcela": a.get("parcela_codigo", ""),
                    "campana": a.get("campana", ""),
                    "producto": item.get("descripcion") or item.get("producto", ""),
                    "lote": item.get("lote", ""),
                    "cantidad": item.get("cantidad", 0),
                    "unidad": item.get("unidad", "kg"),
                    "precio_unitario": item.get("precio_unitario", 0),
                    "total_linea": item.get("total", 0),
                    "total_albaran": a.get("total_albaran", 0),
                    "observaciones": a.get("observaciones", "")
                })
        else:
            # Albarán sin líneas
            rows.append({
                "id": str(a.get("_id", "")),
                "tipo": a.get("tipo", ""),
                "fecha": a.get("fecha", ""),
                "proveedor": a.get("proveedor", ""),
                "cultivo": a.get("cultivo", ""),
                "parcela": a.get("parcela_codigo", ""),
                "campana": a.get("campana", ""),
                "producto": "",
                "lote": "",
                "cantidad": 0,
                "unidad": "",
                "precio_unitario": 0,
                "total_linea": 0,
                "total_albaran": a.get("total_albaran", 0),
                "observaciones": a.get("observaciones", "")
            })
    
    return {
        "data": rows,
        "columns": [
            {"key": "tipo", "header": "Tipo"},
            {"key": "fecha", "header": "Fecha"},
            {"key": "proveedor", "header": "Proveedor"},
            {"key": "cultivo", "header": "Cultivo"},
            {"key": "parcela", "header": "Parcela"},
            {"key": "campana", "header": "Campaña"},
            {"key": "producto", "header": "Producto"},
            {"key": "lote", "header": "Lote"},
            {"key": "cantidad", "header": "Cantidad"},
            {"key": "unidad", "header": "Unidad"},
            {"key": "precio_unitario", "header": "Precio Unit."},
            {"key": "total_linea", "header": "Total Línea"},
            {"key": "total_albaran", "header": "Total Albarán"},
            {"key": "observaciones", "header": "Observaciones"}
        ],
        "total_rows": len(rows),
        "filename": f"albaranes_export_{datetime.now().strftime('%Y%m%d')}"
    }


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
    entidad_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if entidad_tipo:
        query["entidad_tipo"] = entidad_tipo
    if entidad_id:
        query["entidad_id"] = entidad_id
    
    documentos = await documentos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"documentos": serialize_docs(documentos), "total": await documentos_collection.count_documents(query)}


@router.delete("/documentos/{documento_id}")
async def delete_documento(
    documento_id: str,
    current_user: dict = Depends(RequireDelete)
):
    if not ObjectId.is_valid(documento_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await documentos_collection.delete_one({"_id": ObjectId(documento_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento not found")
    
    return {"success": True, "message": "Documento deleted"}



# ============================================================================
# COMISIONES GENERADAS (Auto-generadas desde albaranes)
# ============================================================================

@router.get("/comisiones-generadas")
async def get_comisiones_generadas(
    agente_id: Optional[str] = None,
    tipo_agente: Optional[str] = None,
    campana: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene las comisiones generadas automáticamente desde albaranes.
    """
    query = {}
    if agente_id:
        query["agente_id"] = agente_id
    if tipo_agente:
        query["tipo_agente"] = tipo_agente
    if campana:
        query["campana"] = campana
    if estado:
        query["estado"] = estado
    
    comisiones = await comisiones_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await comisiones_collection.count_documents(query)
    
    # Calcular totales
    totales = {
        "total_kilos_netos": sum(c.get("kilos_netos", 0) for c in comisiones),
        "total_comision": sum(c.get("comision_importe", 0) for c in comisiones),
        "count_pendientes": sum(1 for c in comisiones if c.get("estado") == "pendiente"),
        "count_pagadas": sum(1 for c in comisiones if c.get("estado") == "pagada")
    }
    
    return {
        "success": True,
        "comisiones": serialize_docs(comisiones),
        "total": total,
        "totales": totales
    }


@router.get("/comisiones-generadas/resumen-agente/{agente_id}")
async def get_resumen_comisiones_agente(
    agente_id: str,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Resumen de comisiones para un agente específico.
    """
    query = {"agente_id": agente_id}
    if campana:
        query["campana"] = campana
    
    comisiones = await comisiones_collection.find(query).to_list(1000)
    
    # Obtener info del agente
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    
    pendientes = [c for c in comisiones if c.get("estado") == "pendiente"]
    pagadas = [c for c in comisiones if c.get("estado") == "pagada"]
    
    return {
        "success": True,
        "agente": {
            "id": agente_id,
            "nombre": agente.get("nombre") if agente else "Desconocido",
            "nif": agente.get("nif") if agente else None
        },
        "resumen": {
            "total_albaranes": len(comisiones),
            "total_kilos_netos": sum(c.get("kilos_netos", 0) for c in comisiones),
            "total_kilos_destare": sum(c.get("kilos_destare", 0) for c in comisiones),
            "comision_pendiente": round(sum(c.get("comision_importe", 0) for c in pendientes), 2),
            "comision_pagada": round(sum(c.get("comision_importe", 0) for c in pagadas), 2),
            "comision_total": round(sum(c.get("comision_importe", 0) for c in comisiones), 2)
        },
        "detalle": serialize_docs(comisiones)
    }


@router.patch("/comisiones-generadas/{comision_id}/estado")
async def update_comision_estado(
    comision_id: str,
    estado: str,  # "pendiente", "pagada", "anulada"
    current_user: dict = Depends(RequireEdit)
):
    """
    Actualiza el estado de una comisión (marcar como pagada, anular, etc.)
    """
    if not ObjectId.is_valid(comision_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    if estado not in ["pendiente", "pagada", "anulada"]:
        raise HTTPException(status_code=400, detail="Estado inválido. Use: pendiente, pagada, anulada")
    
    result = await comisiones_collection.update_one(
        {"_id": ObjectId(comision_id)},
        {
            "$set": {
                "estado": estado,
                "updated_at": datetime.now(),
                "updated_by": current_user.get("email", "unknown")
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
    
    updated = await comisiones_collection.find_one({"_id": ObjectId(comision_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/comisiones-generadas/{comision_id}")
async def delete_comision_generada(
    comision_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """
    Elimina una comisión generada (solo si está anulada o es admin).
    """
    if not ObjectId.is_valid(comision_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    comision = await comisiones_collection.find_one({"_id": ObjectId(comision_id)})
    if not comision:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
    
    # Solo permitir eliminar si está anulada o el usuario es admin
    if comision.get("estado") != "anulada" and current_user.get("role") != "Admin":
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar comisiones anuladas")
    
    await comisiones_collection.delete_one({"_id": ObjectId(comision_id)})
    return {"success": True, "message": "Comisión eliminada"}


# ============================================================================
# ALBARANES PDF
# ============================================================================

def format_number_spanish(value, decimals=2):
    """Formatea un número al estilo español (. miles, , decimales)"""
    if value is None:
        return "0"
    try:
        num = float(value)
        if decimals == 0:
            formatted = f"{num:,.0f}"
        else:
            formatted = f"{num:,.{decimals}f}"
        # Convertir formato americano a español
        formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
        return formatted
    except (ValueError, TypeError):
        return str(value)


@router.get("/albaranes/{albaran_id}/pdf")
async def generate_albaran_pdf(
    albaran_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Genera un PDF del albarán con el detalle de líneas y totales.
    La línea de destare muestra los kilos pero con precio e importe = 0.
    El total se calcula como: (kilos_brutos - kilos_destare) * precio
    """
    from fastapi.responses import Response
    from weasyprint import HTML
    from io import BytesIO
    
    if not ObjectId.is_valid(albaran_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    albaran = await albaranes_collection.find_one({"_id": ObjectId(albaran_id)})
    if not albaran:
        raise HTTPException(status_code=404, detail="Albarán no encontrado")
    
    # Obtener contrato si existe
    contrato = None
    if albaran.get("contrato_id"):
        contrato = await contratos_collection.find_one({"_id": ObjectId(albaran["contrato_id"])})
    
    # Preparar datos
    tipo = albaran.get("tipo", "Albarán")
    fecha = albaran.get("fecha", "")
    proveedor = albaran.get("proveedor", "-")
    cliente = albaran.get("cliente", "-")
    cultivo = albaran.get("cultivo", "-")
    # Obtener parcela del albarán o del contrato (manejar strings vacíos)
    parcela = albaran.get("parcela_codigo") or albaran.get("parcela") or ""
    if not parcela and contrato:
        parcela = contrato.get("parcela_codigo") or contrato.get("parcela") or ""
    parcela = parcela if parcela else "-"
    campana = albaran.get("campana", "-")
    observaciones = albaran.get("observaciones", "")
    
    # Contrato info
    numero_contrato = "-"
    if contrato:
        numero_contrato = contrato.get("numero_contrato", f"CON-{str(contrato['_id'])[-6:]}")
    
    # Kilos info
    kilos_brutos = albaran.get("kilos_brutos", 0)
    kilos_destare = albaran.get("kilos_destare", 0)
    kilos_netos = albaran.get("kilos_netos", kilos_brutos - kilos_destare)
    
    # Items
    items = albaran.get("items", [])
    
    # Separar líneas normales de la línea de destare
    lineas_normales = [item for item in items if not item.get("es_destare")]
    
    # Calcular precio unitario (de las líneas normales)
    precio_unitario = 0
    if lineas_normales:
        precio_unitario = lineas_normales[0].get("precio_unitario", 0)
    
    # Total del albarán
    total_albaran = albaran.get("total_albaran", 0)
    
    # Generar filas de la tabla
    rows_html = ""
    for idx, item in enumerate(items, 1):
        es_destare = item.get("es_destare", False)
        descripcion = item.get("descripcion", item.get("producto", "-"))
        cantidad = item.get("cantidad", 0)
        unidad = item.get("unidad", "kg")
        precio = item.get("precio_unitario", 0)
        total = item.get("total", 0)
        
        row_style = 'background-color: #fef2f2; color: #dc2626;' if es_destare else ''
        
        rows_html += f"""
        <tr style="{row_style}">
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">{idx}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{descripcion}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">{format_number_spanish(cantidad, 2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">{unidad}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">{format_number_spanish(precio, 4)} €</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">{format_number_spanish(total, 2)} €</td>
        </tr>
        """
    
    # Determinar si es compra o venta para mostrar proveedor o cliente
    es_venta = "venta" in tipo.lower()
    entidad_label = "Cliente" if es_venta else "Proveedor"
    entidad_valor = cliente if es_venta else proveedor
    
    # Generar HTML del PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @page {{
                size: A4;
                margin: 15mm;
            }}
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 10pt;
                color: #1f2937;
                line-height: 1.4;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #3b82f6;
            }}
            .logo {{
                font-size: 20pt;
                font-weight: bold;
                color: #1e40af;
            }}
            .albaran-info {{
                text-align: right;
            }}
            .albaran-numero {{
                font-size: 16pt;
                font-weight: bold;
                color: #1e40af;
            }}
            .albaran-tipo {{
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 9pt;
                font-weight: 600;
                background-color: {'#dcfce7' if not es_venta else '#fee2e2'};
                color: {'#166534' if not es_venta else '#991b1b'};
                margin-top: 5px;
            }}
            .datos-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }}
            .datos-grid-3 {{
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }}
            .datos-box {{
                background-color: #f8fafc;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
            }}
            .datos-box h3 {{
                margin: 0 0 8px 0;
                font-size: 10pt;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            .datos-box p {{
                margin: 4px 0;
                font-size: 10pt;
            }}
            .datos-box .valor {{
                font-weight: 600;
                color: #1e293b;
            }}
            .table-container {{
                margin-top: 20px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th {{
                background-color: #1e40af;
                color: white;
                padding: 10px 8px;
                text-align: left;
                font-size: 9pt;
                font-weight: 600;
            }}
            th:nth-child(3), th:nth-child(5), th:nth-child(6) {{
                text-align: right;
            }}
            th:nth-child(4) {{
                text-align: center;
            }}
            .totales-box {{
                margin-top: 20px;
                margin-left: auto;
                width: 300px;
                background-color: #f0fdf4;
                border: 2px solid #86efac;
                border-radius: 8px;
                padding: 15px;
            }}
            .totales-row {{
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                font-size: 10pt;
            }}
            .totales-row.destare {{
                color: #dc2626;
            }}
            .totales-row.total {{
                border-top: 2px solid #16a34a;
                margin-top: 8px;
                padding-top: 10px;
                font-size: 14pt;
                font-weight: bold;
                color: #166534;
            }}
            .observaciones {{
                margin-top: 20px;
                padding: 12px;
                background-color: #fffbeb;
                border: 1px solid #fcd34d;
                border-radius: 6px;
            }}
            .observaciones h4 {{
                margin: 0 0 5px 0;
                font-size: 9pt;
                color: #92400e;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
                font-size: 8pt;
                color: #6b7280;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">FRUVECO</div>
            <div class="albaran-info">
                <div class="albaran-numero">ALB-{str(albaran['_id'])[-6:].upper()}</div>
                <div class="albaran-tipo">{tipo}</div>
                <div style="margin-top: 8px; font-size: 10pt;">Fecha: <strong>{fecha}</strong></div>
            </div>
        </div>
        
        <div class="datos-grid">
            <div class="datos-box">
                <h3>{entidad_label}</h3>
                <p class="valor">{entidad_valor}</p>
            </div>
            <div class="datos-box">
                <h3>Contrato</h3>
                <p class="valor">{numero_contrato}</p>
            </div>
        </div>
        
        <div class="datos-grid-3">
            <div class="datos-box">
                <h3>Cultivo</h3>
                <p class="valor">{cultivo}</p>
            </div>
            <div class="datos-box">
                <h3>Parcela</h3>
                <p class="valor">{parcela}</p>
            </div>
            <div class="datos-box">
                <h3>Campaña</h3>
                <p class="valor">{campana}</p>
            </div>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>Descripción</th>
                        <th style="width: 100px;">Cantidad</th>
                        <th style="width: 60px;">Ud.</th>
                        <th style="width: 100px;">Precio</th>
                        <th style="width: 100px;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
        
        <div class="totales-box">
            <div class="totales-row">
                <span>Kilos Brutos:</span>
                <span>{format_number_spanish(kilos_brutos, 2)} kg</span>
            </div>
            {'<div class="totales-row destare"><span>Kilos Destare:</span><span>- ' + format_number_spanish(kilos_destare, 2) + ' kg</span></div>' if kilos_destare > 0 else ''}
            <div class="totales-row" style="font-weight: 600;">
                <span>Kilos Netos:</span>
                <span>{format_number_spanish(kilos_netos, 2)} kg</span>
            </div>
            <div class="totales-row">
                <span>Precio/kg:</span>
                <span>{format_number_spanish(precio_unitario, 4)} €</span>
            </div>
            <div class="totales-row total">
                <span>TOTAL:</span>
                <span>{format_number_spanish(total_albaran, 2)} €</span>
            </div>
        </div>
        
        {f'<div class="observaciones"><h4>Observaciones</h4><p>{observaciones}</p></div>' if observaciones else ''}
        
        <div class="footer">
            Documento generado el {datetime.now().strftime("%d/%m/%Y %H:%M")} · FRUVECO - Sistema de Gestión Agrícola
        </div>
    </body>
    </html>
    """
    
    # Generar PDF
    pdf_buffer = BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    filename = f"albaran_{str(albaran['_id'])[-6:]}_{fecha.replace('-', '')}.pdf"
    
    return Response(
        content=pdf_buffer.read(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}"
        }
    )
