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
        "fincas_recoleccion_semana": fincas_recoleccion_list
    }
