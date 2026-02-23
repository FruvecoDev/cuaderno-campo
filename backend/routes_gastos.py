from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from database import (
    albaranes_collection, contratos_collection, serialize_doc, serialize_docs, db
)
from rbac_guards import RequireAlbaranesAccess, get_current_user

router = APIRouter(prefix="/api/gastos", tags=["gastos"])

def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime"""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None

# ============================================================================
# INFORMES DE GASTOS
# ============================================================================

@router.get("/resumen")
async def get_resumen_gastos(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene un resumen general de gastos con totales por proveedor, contrato, cultivo y parcela.
    """
    # Build match query
    match_query = {}
    
    if fecha_desde:
        match_query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in match_query:
            match_query["fecha"]["$lte"] = fecha_hasta
        else:
            match_query["fecha"] = {"$lte": fecha_hasta}
    if campana:
        match_query["campana"] = campana
    
    # Get all albaranes matching criteria
    albaranes = await albaranes_collection.find(match_query).to_list(1000)
    
    # Aggregate by different dimensions
    por_proveedor = {}
    por_contrato = {}
    por_cultivo = {}
    por_parcela = {}
    total_general = 0
    total_albaranes = len(albaranes)
    
    for albaran in albaranes:
        total = albaran.get("total_albaran", 0) or 0
        total_general += total
        
        # Por proveedor
        proveedor = albaran.get("proveedor") or "Sin proveedor"
        if proveedor not in por_proveedor:
            por_proveedor[proveedor] = {"total": 0, "count": 0, "albaranes": []}
        por_proveedor[proveedor]["total"] += total
        por_proveedor[proveedor]["count"] += 1
        
        # Por contrato
        contrato_id = albaran.get("contrato_id")
        if contrato_id:
            if contrato_id not in por_contrato:
                por_contrato[contrato_id] = {"total": 0, "count": 0, "proveedor": proveedor}
            por_contrato[contrato_id]["total"] += total
            por_contrato[contrato_id]["count"] += 1
        
        # Por cultivo
        cultivo = albaran.get("cultivo") or "Sin cultivo"
        if cultivo not in por_cultivo:
            por_cultivo[cultivo] = {"total": 0, "count": 0}
        por_cultivo[cultivo]["total"] += total
        por_cultivo[cultivo]["count"] += 1
        
        # Por parcela
        parcela = albaran.get("parcela_codigo") or "Sin parcela"
        if parcela not in por_parcela:
            por_parcela[parcela] = {"total": 0, "count": 0, "cultivo": cultivo}
        por_parcela[parcela]["total"] += total
        por_parcela[parcela]["count"] += 1
    
    # Enrich contract data with contract info
    contratos_enriched = []
    for contrato_id, data in por_contrato.items():
        try:
            contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
            contratos_enriched.append({
                "contrato_id": contrato_id,
                "numero_contrato": contrato.get("numero_contrato") if contrato else None,
                "proveedor": data["proveedor"],
                "cultivo": contrato.get("cultivo") if contrato else None,
                "campana": contrato.get("campana") if contrato else None,
                "total": data["total"],
                "count": data["count"]
            })
        except:
            contratos_enriched.append({
                "contrato_id": contrato_id,
                "total": data["total"],
                "count": data["count"],
                "proveedor": data["proveedor"]
            })
    
    return {
        "total_general": total_general,
        "total_albaranes": total_albaranes,
        "por_proveedor": [{"proveedor": k, **v} for k, v in sorted(por_proveedor.items(), key=lambda x: -x[1]["total"])],
        "por_contrato": sorted(contratos_enriched, key=lambda x: -x["total"]),
        "por_cultivo": [{"cultivo": k, **v} for k, v in sorted(por_cultivo.items(), key=lambda x: -x[1]["total"])],
        "por_parcela": [{"parcela": k, **v} for k, v in sorted(por_parcela.items(), key=lambda x: -x[1]["total"])]
    }


@router.get("/por-proveedor")
async def get_gastos_por_proveedor(
    proveedor: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene detalle de gastos agrupados por proveedor.
    Si se especifica proveedor, devuelve el detalle de ese proveedor.
    """
    match_query = {}
    if proveedor:
        match_query["proveedor"] = proveedor
    if fecha_desde:
        match_query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in match_query:
            match_query["fecha"]["$lte"] = fecha_hasta
        else:
            match_query["fecha"] = {"$lte": fecha_hasta}
    if campana:
        match_query["campana"] = campana
    
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$proveedor",
            "total": {"$sum": "$total_albaran"},
            "count": {"$sum": 1},
            "cultivos": {"$addToSet": "$cultivo"},
            "contratos": {"$addToSet": "$contrato_id"},
            "primer_albaran": {"$min": "$fecha"},
            "ultimo_albaran": {"$max": "$fecha"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await albaranes_collection.aggregate(pipeline).to_list(100)
    
    return {
        "gastos_por_proveedor": [
            {
                "proveedor": r["_id"] or "Sin proveedor",
                "total": r["total"],
                "count": r["count"],
                "cultivos": [c for c in r["cultivos"] if c],
                "num_contratos": len([c for c in r["contratos"] if c]),
                "primer_albaran": r["primer_albaran"],
                "ultimo_albaran": r["ultimo_albaran"]
            }
            for r in results
        ]
    }


@router.get("/por-contrato")
async def get_gastos_por_contrato(
    contrato_id: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene detalle de gastos agrupados por contrato.
    Si se especifica contrato_id, devuelve el detalle de ese contrato.
    """
    match_query = {}
    if contrato_id:
        match_query["contrato_id"] = contrato_id
    if fecha_desde:
        match_query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in match_query:
            match_query["fecha"]["$lte"] = fecha_hasta
        else:
            match_query["fecha"] = {"$lte": fecha_hasta}
    
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$contrato_id",
            "total": {"$sum": "$total_albaran"},
            "count": {"$sum": 1},
            "proveedor": {"$first": "$proveedor"},
            "cultivo": {"$first": "$cultivo"},
            "campana": {"$first": "$campana"},
            "parcela": {"$first": "$parcela_codigo"},
            "primer_albaran": {"$min": "$fecha"},
            "ultimo_albaran": {"$max": "$fecha"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await albaranes_collection.aggregate(pipeline).to_list(100)
    
    # Enrich with contract details
    enriched_results = []
    for r in results:
        contrato_info = {}
        if r["_id"]:
            try:
                contrato = await contratos_collection.find_one({"_id": ObjectId(r["_id"])})
                if contrato:
                    contrato_info = {
                        "numero_contrato": contrato.get("numero_contrato"),
                        "precio": contrato.get("precio"),
                        "superficie": contrato.get("superficie")
                    }
            except:
                pass
        
        enriched_results.append({
            "contrato_id": r["_id"],
            **contrato_info,
            "proveedor": r["proveedor"],
            "cultivo": r["cultivo"],
            "campana": r["campana"],
            "parcela": r["parcela"],
            "total": r["total"],
            "count": r["count"],
            "primer_albaran": r["primer_albaran"],
            "ultimo_albaran": r["ultimo_albaran"]
        })
    
    return {"gastos_por_contrato": enriched_results}


@router.get("/por-cultivo")
async def get_gastos_por_cultivo(
    cultivo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene detalle de gastos agrupados por cultivo.
    """
    match_query = {}
    if cultivo:
        match_query["cultivo"] = cultivo
    if fecha_desde:
        match_query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in match_query:
            match_query["fecha"]["$lte"] = fecha_hasta
        else:
            match_query["fecha"] = {"$lte": fecha_hasta}
    if campana:
        match_query["campana"] = campana
    
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$cultivo",
            "total": {"$sum": "$total_albaran"},
            "count": {"$sum": 1},
            "proveedores": {"$addToSet": "$proveedor"},
            "parcelas": {"$addToSet": "$parcela_codigo"},
            "primer_albaran": {"$min": "$fecha"},
            "ultimo_albaran": {"$max": "$fecha"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await albaranes_collection.aggregate(pipeline).to_list(100)
    
    return {
        "gastos_por_cultivo": [
            {
                "cultivo": r["_id"] or "Sin cultivo",
                "total": r["total"],
                "count": r["count"],
                "num_proveedores": len([p for p in r["proveedores"] if p]),
                "num_parcelas": len([p for p in r["parcelas"] if p]),
                "primer_albaran": r["primer_albaran"],
                "ultimo_albaran": r["ultimo_albaran"]
            }
            for r in results
        ]
    }


@router.get("/por-parcela")
async def get_gastos_por_parcela(
    parcela_codigo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene detalle de gastos agrupados por parcela.
    """
    match_query = {}
    if parcela_codigo:
        match_query["parcela_codigo"] = parcela_codigo
    if fecha_desde:
        match_query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in match_query:
            match_query["fecha"]["$lte"] = fecha_hasta
        else:
            match_query["fecha"] = {"$lte": fecha_hasta}
    if campana:
        match_query["campana"] = campana
    
    # Get parcelas info for enrichment
    parcelas_collection = db['parcelas']
    
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$parcela_codigo",
            "total": {"$sum": "$total_albaran"},
            "count": {"$sum": 1},
            "cultivo": {"$first": "$cultivo"},
            "proveedor": {"$first": "$proveedor"},
            "campana": {"$first": "$campana"},
            "parcela_id": {"$first": "$parcela_id"},
            "primer_albaran": {"$min": "$fecha"},
            "ultimo_albaran": {"$max": "$fecha"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await albaranes_collection.aggregate(pipeline).to_list(100)
    
    # Enrich with parcela details (superficie)
    enriched_results = []
    for r in results:
        parcela_info = {}
        if r.get("parcela_id"):
            try:
                parcela = await parcelas_collection.find_one({"_id": ObjectId(r["parcela_id"])})
                if parcela:
                    parcela_info = {
                        "superficie": parcela.get("superficie"),
                        "finca": parcela.get("finca")
                    }
            except:
                pass
        
        coste_por_ha = None
        if parcela_info.get("superficie") and parcela_info["superficie"] > 0:
            coste_por_ha = round(r["total"] / parcela_info["superficie"], 2)
        
        enriched_results.append({
            "parcela_codigo": r["_id"] or "Sin parcela",
            "cultivo": r["cultivo"],
            "proveedor": r["proveedor"],
            "campana": r["campana"],
            **parcela_info,
            "total": r["total"],
            "count": r["count"],
            "coste_por_ha": coste_por_ha,
            "primer_albaran": r["primer_albaran"],
            "ultimo_albaran": r["ultimo_albaran"]
        })
    
    return {"gastos_por_parcela": enriched_results}


@router.get("/detalle-albaranes")
async def get_detalle_albaranes(
    proveedor: Optional[str] = None,
    contrato_id: Optional[str] = None,
    cultivo: Optional[str] = None,
    parcela_codigo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    campana: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene el detalle de albaranes filtrados por cualquier combinación de criterios.
    Útil para ver los albaranes específicos de un proveedor, contrato, cultivo o parcela.
    """
    match_query = {}
    if proveedor:
        match_query["proveedor"] = proveedor
    if contrato_id:
        match_query["contrato_id"] = contrato_id
    if cultivo:
        match_query["cultivo"] = cultivo
    if parcela_codigo:
        match_query["parcela_codigo"] = parcela_codigo
    if fecha_desde:
        match_query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in match_query:
            match_query["fecha"]["$lte"] = fecha_hasta
        else:
            match_query["fecha"] = {"$lte": fecha_hasta}
    if campana:
        match_query["campana"] = campana
    
    albaranes = await albaranes_collection.find(match_query).sort("fecha", -1).skip(skip).limit(limit).to_list(limit)
    total = await albaranes_collection.count_documents(match_query)
    
    # Calculate total sum
    total_sum_pipeline = [
        {"$match": match_query},
        {"$group": {"_id": None, "total": {"$sum": "$total_albaran"}}}
    ]
    total_sum_result = await albaranes_collection.aggregate(total_sum_pipeline).to_list(1)
    total_sum = total_sum_result[0]["total"] if total_sum_result else 0
    
    return {
        "albaranes": serialize_docs(albaranes),
        "total_count": total,
        "total_sum": total_sum,
        "skip": skip,
        "limit": limit
    }


@router.get("/campanas")
async def get_campanas_disponibles(
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAlbaranesAccess)
):
    """
    Obtiene lista de campañas disponibles para filtrar.
    """
    pipeline = [
        {"$match": {"campana": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$campana"}},
        {"$sort": {"_id": -1}}
    ]
    results = await albaranes_collection.aggregate(pipeline).to_list(100)
    return {"campanas": [r["_id"] for r in results if r["_id"]]}
