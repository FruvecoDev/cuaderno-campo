"""
Dashboard Routes for FRUVECO
Contains KPIs and dashboard-related endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import (
    contratos_collection, parcelas_collection, fincas_collection,
    visitas_collection, tratamientos_collection, irrigaciones_collection,
    cosechas_collection, tareas_collection, serialize_docs, users_collection
)
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# Modelo para configuración del dashboard
class DashboardWidgetConfig(BaseModel):
    widget_id: str
    visible: bool = True
    order: int = 0

class DashboardConfig(BaseModel):
    widgets: List[DashboardWidgetConfig]
    layout: Optional[str] = "default"  # "default", "compact", "expanded"


# Widgets disponibles por defecto
DEFAULT_WIDGETS = [
    {"widget_id": "kpis_principales", "visible": True, "order": 0, "name": "KPIs Principales", "description": "Contratos, parcelas, superficie, costes, ingresos"},
    {"widget_id": "resumen_fincas", "visible": True, "order": 1, "name": "Resumen de Fincas", "description": "KPIs y gráficos de fincas por provincia"},
    {"widget_id": "proximas_cosechas", "visible": True, "order": 2, "name": "Próximas Cosechas", "description": "Cosechas planificadas y fincas en recolección"},
    {"widget_id": "tratamientos_pendientes", "visible": True, "order": 3, "name": "Tratamientos Pendientes", "description": "Tratamientos programados y vencidos"},
    {"widget_id": "contratos_activos", "visible": True, "order": 4, "name": "Contratos Activos", "description": "Balance de compra/venta y contratos vigentes"},
    {"widget_id": "proximas_visitas", "visible": True, "order": 5, "name": "Próximas Visitas", "description": "Visitas planificadas y estadísticas"},
    {"widget_id": "graficos_cultivos", "visible": True, "order": 6, "name": "Gráficos de Cultivos", "description": "Superficie por cultivo y distribución de costes"},
    {"widget_id": "mapa_parcelas", "visible": True, "order": 7, "name": "Mapa de Parcelas", "description": "Mapa interactivo con ubicación de parcelas"},
    {"widget_id": "calendario", "visible": True, "order": 8, "name": "Calendario", "description": "Eventos y actividades programadas"},
    {"widget_id": "actividad_reciente", "visible": True, "order": 9, "name": "Actividad Reciente", "description": "Últimas visitas y tratamientos"}
]


@router.get("/config")
async def get_dashboard_config(current_user: dict = Depends(get_current_user)):
    """Get user's dashboard configuration"""
    user = await users_collection.find_one({"email": current_user["email"]})
    
    if user and "dashboard_config" in user:
        return {
            "success": True,
            "config": user["dashboard_config"],
            "available_widgets": DEFAULT_WIDGETS
        }
    
    # Return default config
    return {
        "success": True,
        "config": {
            "widgets": DEFAULT_WIDGETS,
            "layout": "default"
        },
        "available_widgets": DEFAULT_WIDGETS
    }


@router.post("/config")
async def save_dashboard_config(config: DashboardConfig, current_user: dict = Depends(get_current_user)):
    """Save user's dashboard configuration"""
    try:
        result = await users_collection.update_one(
            {"email": current_user["email"]},
            {"$set": {"dashboard_config": config.dict()}}
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            return {"success": True, "message": "Configuración guardada"}
        else:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config/reset")
async def reset_dashboard_config(current_user: dict = Depends(get_current_user)):
    """Reset user's dashboard configuration to default"""
    try:
        default_config = {
            "widgets": DEFAULT_WIDGETS,
            "layout": "default"
        }
        
        await users_collection.update_one(
            {"email": current_user["email"]},
            {"$set": {"dashboard_config": default_config}}
        )
        
        return {"success": True, "message": "Configuración restaurada", "config": default_config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    
    # =============================================
    # PRÓXIMAS COSECHAS (planificadas)
    # =============================================
    from datetime import datetime, timedelta
    
    hoy = datetime.now().strftime("%Y-%m-%d")
    proximas_cosechas = []
    
    cosechas_all = await cosechas_collection.find({
        "estado": {"$in": ["planificada", "en_curso"]}
    }).to_list(100)
    
    for cosecha in cosechas_all:
        for planif in cosecha.get("planificaciones", []):
            fecha_plan = planif.get("fecha_planificada", "")
            if fecha_plan and fecha_plan >= hoy:
                proximas_cosechas.append({
                    "cosecha_id": str(cosecha.get("_id")),
                    "contrato_id": cosecha.get("contrato_id"),
                    "proveedor": cosecha.get("proveedor", ""),
                    "cultivo": cosecha.get("cultivo", ""),
                    "variedad": cosecha.get("variedad", ""),
                    "fecha_planificada": fecha_plan,
                    "kilos_estimados": planif.get("kilos_estimados", 0),
                    "estado": cosecha.get("estado", "planificada"),
                    "parcela": cosecha.get("parcela", "")
                })
    
    # Ordenar por fecha más próxima
    proximas_cosechas.sort(key=lambda x: x["fecha_planificada"])
    proximas_cosechas = proximas_cosechas[:10]  # Top 10
    
    # También buscar parcelas con fecha de siega planificada
    parcelas_con_siega = await parcelas_collection.find({
        "fecha_prevista_siega": {"$gte": hoy}
    }).sort("fecha_prevista_siega", 1).limit(10).to_list(10)
    
    for p in parcelas_con_siega:
        existe = any(c["parcela"] == p.get("codigo_plantacion") for c in proximas_cosechas)
        if not existe:
            proximas_cosechas.append({
                "cosecha_id": None,
                "contrato_id": p.get("contrato_id"),
                "proveedor": p.get("proveedor", ""),
                "cultivo": p.get("cultivo", ""),
                "variedad": p.get("variedad", ""),
                "fecha_planificada": p.get("fecha_prevista_siega", ""),
                "kilos_estimados": 0,
                "estado": "siega_planificada",
                "parcela": p.get("codigo_plantacion", "")
            })
    
    proximas_cosechas.sort(key=lambda x: x["fecha_planificada"])
    proximas_cosechas = proximas_cosechas[:10]
    
    # =============================================
    # TRATAMIENTOS PENDIENTES
    # =============================================
    tratamientos_pendientes = await tratamientos_collection.find({
        "$or": [
            {"estado": "pendiente"},
            {"estado": "programado"},
            {"realizado": False}
        ]
    }).sort("fecha_tratamiento", 1).limit(10).to_list(10)
    
    tratamientos_pendientes_list = []
    for t in tratamientos_pendientes:
        tratamientos_pendientes_list.append({
            "id": str(t.get("_id")),
            "tipo_tratamiento": t.get("tipo_tratamiento", ""),
            "parcela": t.get("parcela", ""),
            "cultivo": t.get("cultivo", ""),
            "fecha_tratamiento": t.get("fecha_tratamiento", ""),
            "superficie_aplicacion": t.get("superficie_aplicacion", 0),
            "estado": t.get("estado", "pendiente"),
            "prioridad": t.get("prioridad", "normal")
        })
    
    # También buscar fincas con recolección planificada esta semana
    semana_actual = datetime.now().isocalendar()[1]
    ano_actual = datetime.now().year
    
    fincas_recoleccion = await fincas_collection.find({
        "recoleccion_semana": semana_actual,
        "recoleccion_ano": ano_actual
    }).to_list(20)
    
    fincas_recoleccion_list = []
    for f in fincas_recoleccion:
        fincas_recoleccion_list.append({
            "id": str(f.get("_id")),
            "denominacion": f.get("denominacion", f.get("nombre", "")),
            "provincia": f.get("provincia", ""),
            "hectareas": f.get("hectareas", 0),
            "produccion_esperada": f.get("produccion_esperada", 0),
            "semana": f.get("recoleccion_semana"),
            "ano": f.get("recoleccion_ano")
        })
    
    # =============================================
    # CONTRATOS ACTIVOS (dentro del periodo actual)
    # =============================================
    contratos_activos = []
    all_contratos = await contratos_collection.find({}).to_list(1000)
    
    for contrato in all_contratos:
        periodo_desde = contrato.get("periodo_desde", "")
        periodo_hasta = contrato.get("periodo_hasta", "")
        
        # Verificar si está en periodo activo
        es_activo = True
        if periodo_desde and periodo_hasta:
            es_activo = periodo_desde <= hoy <= periodo_hasta
        
        if es_activo:
            contratos_activos.append({
                "id": str(contrato.get("_id")),
                "numero": f"{contrato.get('serie', 'MP')}-{contrato.get('año', '')}-{str(contrato.get('numero', 0)).zfill(3)}",
                "tipo": contrato.get("tipo", "Compra"),
                "proveedor": contrato.get("proveedor", ""),
                "cliente": contrato.get("cliente", ""),
                "cultivo": contrato.get("cultivo", ""),
                "cantidad": contrato.get("cantidad", 0),
                "precio": contrato.get("precio", 0),
                "valor_total": (contrato.get("cantidad", 0) or 0) * (contrato.get("precio", 0) or 0),
                "periodo_desde": periodo_desde,
                "periodo_hasta": periodo_hasta,
                "campana": contrato.get("campana", "")
            })
    
    # Estadísticas de contratos
    contratos_compra = [c for c in contratos_activos if c["tipo"] == "Compra"]
    contratos_venta = [c for c in contratos_activos if c["tipo"] == "Venta"]
    
    contratos_stats = {
        "total_activos": len(contratos_activos),
        "compra": {
            "count": len(contratos_compra),
            "cantidad_total": sum(c["cantidad"] for c in contratos_compra),
            "valor_total": sum(c["valor_total"] for c in contratos_compra)
        },
        "venta": {
            "count": len(contratos_venta),
            "cantidad_total": sum(c["cantidad"] for c in contratos_venta),
            "valor_total": sum(c["valor_total"] for c in contratos_venta)
        },
        "por_cultivo": {}
    }
    
    # Agrupar por cultivo
    for c in contratos_activos:
        cultivo = c["cultivo"] or "Sin cultivo"
        if cultivo not in contratos_stats["por_cultivo"]:
            contratos_stats["por_cultivo"][cultivo] = {"count": 0, "cantidad": 0, "valor": 0}
        contratos_stats["por_cultivo"][cultivo]["count"] += 1
        contratos_stats["por_cultivo"][cultivo]["cantidad"] += c["cantidad"]
        contratos_stats["por_cultivo"][cultivo]["valor"] += c["valor_total"]
    
    # =============================================
    # PRÓXIMAS VISITAS PLANIFICADAS
    # =============================================
    visitas_proximas = []
    
    # Buscar visitas con fecha en los próximos 14 días
    en_14_dias = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
    
    visitas_query = {
        "$or": [
            {"fecha_planificada": {"$gte": hoy, "$lte": en_14_dias}},
            {"fecha_visita": {"$gte": hoy, "$lte": en_14_dias}, "realizado": False}
        ]
    }
    
    visitas_planificadas = await visitas_collection.find(visitas_query).sort("fecha_visita", 1).limit(10).to_list(10)
    
    for v in visitas_planificadas:
        fecha = v.get("fecha_planificada") or v.get("fecha_visita")
        visitas_proximas.append({
            "id": str(v.get("_id")),
            "objetivo": v.get("objetivo", ""),
            "parcela": v.get("codigo_plantacion", ""),
            "proveedor": v.get("proveedor", ""),
            "cultivo": v.get("cultivo", ""),
            "fecha": fecha,
            "realizado": v.get("realizado", False)
        })
    
    # Estadísticas de visitas
    total_visitas_mes = await visitas_collection.count_documents({
        "fecha_visita": {"$gte": (datetime.now().replace(day=1)).strftime("%Y-%m-%d")}
    })
    visitas_realizadas_mes = await visitas_collection.count_documents({
        "fecha_visita": {"$gte": (datetime.now().replace(day=1)).strftime("%Y-%m-%d")},
        "realizado": True
    })
    visitas_pendientes = await visitas_collection.count_documents({
        "realizado": False
    })
    
    visitas_stats = {
        "total_mes": total_visitas_mes,
        "realizadas_mes": visitas_realizadas_mes,
        "pendientes": visitas_pendientes,
        "proximas_14_dias": len(visitas_proximas)
    }
    
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
        },
        "proximas_cosechas": proximas_cosechas,
        "tratamientos_pendientes": tratamientos_pendientes_list,
        "fincas_recoleccion_semana": fincas_recoleccion_list,
        "contratos_activos": contratos_activos[:10],  # Top 10
        "contratos_stats": contratos_stats,
        "visitas_proximas": visitas_proximas,
        "visitas_stats": visitas_stats
    }
