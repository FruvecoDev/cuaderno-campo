"""
Dashboard Routes for FRUVECO
Contains KPIs and dashboard-related endpoints.
"""

from fastapi import APIRouter
from database import (
    contratos_collection, parcelas_collection, fincas_collection,
    visitas_collection, tratamientos_collection, irrigaciones_collection,
    cosechas_collection, tareas_collection, serialize_docs
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpis")
async def get_dashboard_kpis():
    """Get all KPIs for the dashboard"""
    # Count documents
    total_contratos = await contratos_collection.count_documents({})
    contratos_venta = await contratos_collection.count_documents({"tipo": "Venta"})
    contratos_compra = await contratos_collection.count_documents({"tipo": {"$ne": "Venta"}})  # Compra o sin tipo
    total_parcelas = await parcelas_collection.count_documents({})
    parcelas_activas = await parcelas_collection.count_documents({"activo": True})
    total_fincas = await fincas_collection.count_documents({})
    total_tratamientos = await tratamientos_collection.count_documents({})
    total_riegos = await irrigaciones_collection.count_documents({})
    total_visitas = await visitas_collection.count_documents({})
    total_cosechas = await cosechas_collection.count_documents({})
    
    # Calculate production
    cosechas = await cosechas_collection.find().to_list(1000)
    total_produccion = sum(c.get("cosecha_total", 0) for c in cosechas)
    total_ingresos = sum(c.get("ingreso_total", 0) for c in cosechas)
    
    # Calculate costs
    tratamientos = await tratamientos_collection.find().to_list(1000)
    total_coste_tratamientos = sum(t.get("coste_total", 0) for t in tratamientos)
    
    riegos = await irrigaciones_collection.find().to_list(1000)
    total_coste_riegos = sum(r.get("coste", 0) for r in riegos)
    
    tareas = await tareas_collection.find().to_list(1000)
    total_coste_tareas = sum(t.get("coste_total", 0) for t in tareas)
    
    total_costes = total_coste_tratamientos + total_coste_riegos + total_coste_tareas
    
    # Calculate surface from parcelas
    parcelas = await parcelas_collection.find().to_list(1000)
    total_superficie = sum(p.get("superficie_total", 0) for p in parcelas)
    
    # =============================================
    # FINCAS KPIs
    # =============================================
    fincas = await fincas_collection.find().to_list(1000)
    fincas_propias = sum(1 for f in fincas if f.get("finca_propia", False))
    fincas_alquiladas = total_fincas - fincas_propias
    
    # Total hectáreas de fincas
    total_hectareas_fincas = sum(f.get("hectareas", 0) for f in fincas)
    
    # Producción esperada de fincas
    total_produccion_esperada = sum(f.get("produccion_esperada", 0) for f in fincas)
    total_produccion_disponible = sum(f.get("produccion_disponible", 0) for f in fincas)
    
    # Fincas por provincia
    fincas_por_provincia = {}
    for finca in fincas:
        provincia = finca.get("provincia") or "Sin provincia"
        if provincia not in fincas_por_provincia:
            fincas_por_provincia[provincia] = {
                "count": 0,
                "hectareas": 0,
                "produccion_esperada": 0,
                "propias": 0,
                "alquiladas": 0
            }
        fincas_por_provincia[provincia]["count"] += 1
        fincas_por_provincia[provincia]["hectareas"] += finca.get("hectareas", 0)
        fincas_por_provincia[provincia]["produccion_esperada"] += finca.get("produccion_esperada", 0)
        if finca.get("finca_propia", False):
            fincas_por_provincia[provincia]["propias"] += 1
        else:
            fincas_por_provincia[provincia]["alquiladas"] += 1
    
    # Parcelas sin asignar a fincas
    parcelas_asignadas_ids = set()
    for finca in fincas:
        parcelas_asignadas_ids.update(finca.get("parcelas_ids", []))
    
    parcelas_sin_asignar = sum(1 for p in parcelas if str(p.get("_id")) not in parcelas_asignadas_ids)
    
    # Production by crop
    produccion_por_cultivo = {}
    for parcela in parcelas:
        cultivo = parcela.get("cultivo", "Unknown")
        if cultivo not in produccion_por_cultivo:
            produccion_por_cultivo[cultivo] = {
                "superficie": 0,
                "parcelas": 0,
                "produccion": 0
            }
        produccion_por_cultivo[cultivo]["superficie"] += parcela.get("superficie_total", 0)
        produccion_por_cultivo[cultivo]["parcelas"] += 1
    
    # Recent activity
    recent_visitas = await visitas_collection.find().sort("created_at", -1).limit(5).to_list(5)
    recent_tratamientos = await tratamientos_collection.find().sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "totales": {
            "contratos": total_contratos,
            "contratos_venta": contratos_venta,
            "contratos_compra": contratos_compra,
            "parcelas": total_parcelas,
            "parcelas_activas": parcelas_activas,
            "fincas": total_fincas,
            "tratamientos": total_tratamientos,
            "riegos": total_riegos,
            "visitas": total_visitas,
            "cosechas": total_cosechas
        },
        "fincas": {
            "total": total_fincas,
            "propias": fincas_propias,
            "alquiladas": fincas_alquiladas,
            "hectareas_total": total_hectareas_fincas,
            "produccion_esperada": total_produccion_esperada,
            "produccion_disponible": total_produccion_disponible,
            "por_provincia": fincas_por_provincia,
            "parcelas_sin_asignar": parcelas_sin_asignar
        },
        "produccion": {
            "total_kg": total_produccion,
            "total_ingresos": total_ingresos,
            "por_cultivo": produccion_por_cultivo
        },
        "costes": {
            "tratamientos": total_coste_tratamientos,
            "riegos": total_coste_riegos,
            "tareas": total_coste_tareas,
            "total": total_costes
        },
        "superficie": {
            "total_ha": total_superficie,
            "promedio_ha_parcela": total_superficie / total_parcelas if total_parcelas > 0 else 0
        },
        "rentabilidad": {
            "margen_bruto": total_ingresos - total_costes,
            "margen_por_ha": (total_ingresos - total_costes) / total_superficie if total_superficie > 0 else 0
        },
        "actividad_reciente": {
            "visitas": serialize_docs(recent_visitas),
            "tratamientos": serialize_docs(recent_tratamientos)
        }
    }
