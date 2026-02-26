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
    documentos_collection, serialize_doc, serialize_docs
)
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireRecetasAccess, RequireAlbaranesAccess,
    get_current_user
)

router = APIRouter(prefix="/api", tags=["extended"])


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
        {"$match": {"proveedor": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$proveedor", "count": {"$sum": 1}, "total": {"$sum": "$total_albaran"}}},
        {"$sort": {"total": -1}},
        {"$limit": 5}
    ]
    por_proveedor = await albaranes_collection.aggregate(pipeline_proveedor).to_list(5)
    
    # Por cultivo (top 5)
    pipeline_cultivo = [
        {"$match": {"cultivo": {"$ne": None, "$ne": ""}}},
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
