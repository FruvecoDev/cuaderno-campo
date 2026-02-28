"""
Rutas para gestión de catálogos maestros: Proveedores y Cultivos
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from models_catalogos import (
    ProveedorCreate, ProveedorInDB,
    CultivoCreate, CultivoInDB
)
from database import db, serialize_doc, serialize_docs
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    get_current_user
)

router = APIRouter(prefix="/api", tags=["catalogos"])

# Collections
proveedores_collection = db['proveedores']
cultivos_collection = db['cultivos']


# ============================================================================
# PROVEEDORES
# ============================================================================

@router.post("/proveedores", response_model=dict)
async def create_proveedor(
    proveedor: ProveedorCreate,
    current_user: dict = Depends(RequireCreate)
):
    proveedor_dict = proveedor.dict()
    proveedor_dict['created_at'] = datetime.now()
    proveedor_dict['updated_at'] = datetime.now()
    
    result = await proveedores_collection.insert_one(proveedor_dict)
    created = await proveedores_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "proveedor": serialize_doc(created)}


@router.get("/proveedores")
async def get_proveedores(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if activo is not None:
        query['activo'] = activo
    
    proveedores = await proveedores_collection.find(query).skip(skip).limit(limit).to_list(limit)
    total = await proveedores_collection.count_documents(query)
    
    return {
        "proveedores": serialize_docs(proveedores),
        "total": total
    }


@router.get("/proveedores/{proveedor_id}")
async def get_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    proveedor = await proveedores_collection.find_one({"_id": ObjectId(proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    return {"proveedor": serialize_doc(proveedor)}


@router.put("/proveedores/{proveedor_id}")
async def update_proveedor(
    proveedor_id: str,
    proveedor: ProveedorCreate,
    current_user: dict = Depends(RequireEdit)
):
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    proveedor_dict = proveedor.dict()
    proveedor_dict['updated_at'] = datetime.now()
    
    result = await proveedores_collection.update_one(
        {"_id": ObjectId(proveedor_id)},
        {"$set": proveedor_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    updated = await proveedores_collection.find_one({"_id": ObjectId(proveedor_id)})
    return {"success": True, "proveedor": serialize_doc(updated)}


@router.delete("/proveedores/{proveedor_id}")
async def delete_proveedor(
    proveedor_id: str,
    current_user: dict = Depends(RequireDelete)
):
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await proveedores_collection.delete_one({"_id": ObjectId(proveedor_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    return {"success": True, "message": "Proveedor deleted"}


@router.get("/proveedores/stats/resumen")
async def get_proveedores_stats(current_user: dict = Depends(get_current_user)):
    """Obtener estadísticas de proveedores"""
    total = await proveedores_collection.count_documents({})
    activos = await proveedores_collection.count_documents({"activo": True})
    
    # Proveedores por provincia
    pipeline = [
        {"$match": {"activo": True}},
        {"$group": {"_id": "$provincia", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    por_provincia = []
    async for doc in proveedores_collection.aggregate(pipeline):
        por_provincia.append({"provincia": doc["_id"] or "Sin especificar", "count": doc["count"]})
    
    # Últimos proveedores añadidos
    ultimos = await proveedores_collection.find({"activo": True}).sort("created_at", -1).limit(5).to_list(5)
    
    # Volumen de compras por proveedor (si existe la colección de gastos)
    gastos_collection = db.get_collection('gastos')
    volumen_compras = []
    try:
        pipeline_gastos = [
            {"$match": {"proveedor_id": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": "$proveedor_id", "total": {"$sum": "$importe"}, "count": {"$sum": 1}}},
            {"$sort": {"total": -1}},
            {"$limit": 10}
        ]
        async for doc in gastos_collection.aggregate(pipeline_gastos):
            prov = await proveedores_collection.find_one({"_id": ObjectId(doc["_id"])}) if ObjectId.is_valid(doc["_id"]) else None
            volumen_compras.append({
                "proveedor_id": doc["_id"],
                "proveedor_nombre": prov.get("nombre") if prov else "Desconocido",
                "total_compras": round(doc["total"], 2),
                "num_operaciones": doc["count"]
            })
    except Exception:
        pass
    
    return {
        "success": True,
        "stats": {
            "total": total,
            "activos": activos,
            "inactivos": total - activos,
            "por_provincia": por_provincia,
            "ultimos_agregados": serialize_docs(ultimos),
            "top_proveedores_compras": volumen_compras
        }
    }


@router.get("/proveedores/{proveedor_id}/historial")
async def get_proveedor_historial(
    proveedor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener historial de compras de un proveedor"""
    if not ObjectId.is_valid(proveedor_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    proveedor = await proveedores_collection.find_one({"_id": ObjectId(proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor not found")
    
    # Buscar gastos/compras asociadas
    gastos_collection = db.get_collection('gastos')
    gastos = []
    try:
        cursor = gastos_collection.find({"proveedor_id": proveedor_id}).sort("fecha", -1).limit(50)
        async for g in cursor:
            gastos.append(serialize_doc(g))
    except Exception:
        pass
    
    # Buscar albaranes de compra
    albaranes_collection = db.get_collection('albaranes')
    albaranes = []
    try:
        cursor = albaranes_collection.find({
            "$or": [
                {"proveedor_id": proveedor_id},
                {"proveedor": proveedor.get("nombre")}
            ],
            "tipo": "compra"
        }).sort("fecha", -1).limit(50)
        async for a in cursor:
            albaranes.append(serialize_doc(a))
    except Exception:
        pass
    
    # Calcular totales
    total_compras = sum(g.get("importe", 0) for g in gastos)
    
    return {
        "success": True,
        "proveedor": serialize_doc(proveedor),
        "historial": {
            "gastos": gastos,
            "albaranes": albaranes,
            "total_compras": round(total_compras, 2),
            "num_operaciones": len(gastos) + len(albaranes)
        }
    }


@router.get("/proveedores/export/excel")
async def export_proveedores_excel(
    activo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Exportar proveedores a Excel"""
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    import io
    
    query = {}
    if activo is not None:
        query['activo'] = activo
    
    proveedores = await proveedores_collection.find(query).sort("nombre", 1).to_list(1000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Proveedores"
    
    # Estilos
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2E7D32", end_color="2E7D32", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    # Encabezados
    headers = ["Nombre", "CIF/NIF", "Dirección", "Población", "Provincia", "C.P.", "Teléfono", "Email", "Contacto", "Estado"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border
    
    # Datos
    for row_idx, prov in enumerate(proveedores, 2):
        data = [
            prov.get("nombre", ""),
            prov.get("cif_nif", ""),
            prov.get("direccion", ""),
            prov.get("poblacion", ""),
            prov.get("provincia", ""),
            prov.get("codigo_postal", ""),
            prov.get("telefono", ""),
            prov.get("email", ""),
            prov.get("persona_contacto", ""),
            "Activo" if prov.get("activo", True) else "Inactivo"
        ]
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
    
    # Ajustar anchos
    column_widths = [25, 15, 30, 20, 15, 10, 15, 25, 20, 10]
    for col, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=proveedores_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )


# ============================================================================
# CULTIVOS
# ============================================================================

@router.post("/cultivos", response_model=dict)
async def create_cultivo(
    cultivo: CultivoCreate,
    current_user: dict = Depends(RequireCreate)
):
    cultivo_dict = cultivo.dict()
    cultivo_dict['created_at'] = datetime.now()
    cultivo_dict['updated_at'] = datetime.now()
    
    result = await cultivos_collection.insert_one(cultivo_dict)
    created = await cultivos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "cultivo": serialize_doc(created)}


@router.get("/cultivos")
async def get_cultivos(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = None,
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if activo is not None:
        query['activo'] = activo
    if tipo:
        query['tipo'] = tipo
    
    cultivos = await cultivos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    total = await cultivos_collection.count_documents(query)
    
    return {
        "cultivos": serialize_docs(cultivos),
        "total": total
    }


@router.get("/cultivos/{cultivo_id}")
async def get_cultivo(
    cultivo_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(cultivo_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cultivo = await cultivos_collection.find_one({"_id": ObjectId(cultivo_id)})
    if not cultivo:
        raise HTTPException(status_code=404, detail="Cultivo not found")
    
    return {"cultivo": serialize_doc(cultivo)}


@router.put("/cultivos/{cultivo_id}")
async def update_cultivo(
    cultivo_id: str,
    cultivo: CultivoCreate,
    current_user: dict = Depends(RequireEdit)
):
    if not ObjectId.is_valid(cultivo_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    cultivo_dict = cultivo.dict()
    cultivo_dict['updated_at'] = datetime.now()
    
    result = await cultivos_collection.update_one(
        {"_id": ObjectId(cultivo_id)},
        {"$set": cultivo_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cultivo not found")
    
    updated = await cultivos_collection.find_one({"_id": ObjectId(cultivo_id)})
    return {"success": True, "cultivo": serialize_doc(updated)}


@router.delete("/cultivos/{cultivo_id}")
async def delete_cultivo(
    cultivo_id: str,
    current_user: dict = Depends(RequireDelete)
):
    if not ObjectId.is_valid(cultivo_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    result = await cultivos_collection.delete_one({"_id": ObjectId(cultivo_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cultivo not found")
    
    return {"success": True, "message": "Cultivo deleted"}
