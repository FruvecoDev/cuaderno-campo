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
    
    # Calculate surface
    parcelas = await parcelas_collection.find().to_list(1000)
    total_superficie = sum(p.get("superficie_total", 0) for p in parcelas)
    
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
            "parcelas": total_parcelas,
            "parcelas_activas": parcelas_activas,
            "fincas": total_fincas,
            "tratamientos": total_tratamientos,
            "riegos": total_riegos,
            "visitas": total_visitas,
            "cosechas": total_cosechas
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
