"""
Routes for Daily Summary (Resumen Diario)
Provides a morning briefing with key information for the day
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from bson import ObjectId

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/resumen-diario", tags=["resumen-diario"])

# Collections
alertas_collection = db['alertas_clima']
tratamientos_collection = db['tratamientos']
contratos_collection = db['contratos']
parcelas_collection = db['parcelas']
recomendaciones_collection = db['recomendaciones']
visitas_collection = db['visitas']
cosechas_collection = db['cosechas']


@router.get("")
async def get_resumen_diario(
    current_user: dict = Depends(get_current_user)
):
    """Get daily summary/briefing with key information"""
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    week_ago = today - timedelta(days=7)
    week_ahead = today + timedelta(days=7)
    month_start = today.replace(day=1)
    
    # 1. Alertas Climáticas Activas
    alertas_query = {"estado": {"$nin": ["resuelta", "ignorada"]}}
    total_alertas = await alertas_collection.count_documents(alertas_query)
    alertas_alta = await alertas_collection.count_documents({**alertas_query, "prioridad": "Alta"})
    alertas_media = await alertas_collection.count_documents({**alertas_query, "prioridad": "Media"})
    alertas_baja = await alertas_collection.count_documents({**alertas_query, "prioridad": "Baja"})
    
    alertas_clima = {
        "total": total_alertas,
        "por_prioridad": {
            "alta": alertas_alta,
            "media": alertas_media,
            "baja": alertas_baja
        }
    }
    
    # 2. Tratamientos Programados para Hoy
    # Try different date field names
    tratamientos_hoy_count = 0
    tratamientos_hoy_list = []
    
    try:
        # Check for fecha_aplicacion field
        tratamientos_hoy_count = await tratamientos_collection.count_documents({
            "$or": [
                {"fecha_aplicacion": {"$gte": today, "$lt": tomorrow}},
                {"fecha_programada": {"$gte": today, "$lt": tomorrow}},
                {"fecha": {"$gte": today, "$lt": tomorrow}}
            ]
        })
        
        if tratamientos_hoy_count > 0:
            tratamientos_cursor = tratamientos_collection.find({
                "$or": [
                    {"fecha_aplicacion": {"$gte": today, "$lt": tomorrow}},
                    {"fecha_programada": {"$gte": today, "$lt": tomorrow}},
                    {"fecha": {"$gte": today, "$lt": tomorrow}}
                ]
            }).limit(5)
            
            async for t in tratamientos_cursor:
                tratamientos_hoy_list.append({
                    "parcela": t.get("parcela_codigo", t.get("parcela", "N/A")),
                    "tipo": t.get("tipo", "Tratamiento"),
                    "producto": t.get("producto_nombre", t.get("producto", ""))
                })
    except Exception as e:
        print(f"Error getting tratamientos: {e}")
    
    tratamientos_hoy = {
        "total": tratamientos_hoy_count,
        "lista": tratamientos_hoy_list
    }
    
    # 3. Contratos Próximos a Vencer (7 días)
    contratos_vencer_count = 0
    contratos_vencer_list = []
    
    try:
        contratos_vencer_count = await contratos_collection.count_documents({
            "$or": [
                {"fecha_fin": {"$gte": today, "$lte": week_ahead}},
                {"fecha_vencimiento": {"$gte": today, "$lte": week_ahead}}
            ],
            "estado": {"$nin": ["Finalizado", "Cancelado"]}
        })
        
        if contratos_vencer_count > 0:
            contratos_cursor = contratos_collection.find({
                "$or": [
                    {"fecha_fin": {"$gte": today, "$lte": week_ahead}},
                    {"fecha_vencimiento": {"$gte": today, "$lte": week_ahead}}
                ],
                "estado": {"$nin": ["Finalizado", "Cancelado"]}
            }).limit(5)
            
            async for c in contratos_cursor:
                contratos_vencer_list.append({
                    "codigo": c.get("codigo", c.get("numero", "N/A")),
                    "cliente": c.get("cliente_nombre", c.get("cliente", "")),
                    "fecha_fin": c.get("fecha_fin", c.get("fecha_vencimiento", "")).isoformat() if isinstance(c.get("fecha_fin", c.get("fecha_vencimiento")), datetime) else str(c.get("fecha_fin", c.get("fecha_vencimiento", "")))
                })
    except Exception as e:
        print(f"Error getting contratos: {e}")
    
    contratos_vencer = {
        "total": contratos_vencer_count,
        "lista": contratos_vencer_list
    }
    
    # 4. KPIs Generales
    try:
        parcelas_activas = await parcelas_collection.count_documents({"activo": {"$ne": False}})
    except:
        parcelas_activas = await parcelas_collection.count_documents({})
    
    try:
        recomendaciones_pendientes = await recomendaciones_collection.count_documents({"estado": "Pendiente"})
    except:
        recomendaciones_pendientes = 0
    
    try:
        visitas_semana = await visitas_collection.count_documents({
            "$or": [
                {"fecha": {"$gte": week_ago}},
                {"fecha_visita": {"$gte": week_ago}},
                {"created_at": {"$gte": week_ago}}
            ]
        })
    except:
        visitas_semana = 0
    
    try:
        cosechas_mes = await cosechas_collection.count_documents({
            "$or": [
                {"fecha": {"$gte": month_start}},
                {"fecha_cosecha": {"$gte": month_start}},
                {"created_at": {"$gte": month_start}}
            ]
        })
    except:
        cosechas_mes = 0
    
    kpis = {
        "parcelas_activas": parcelas_activas,
        "recomendaciones_pendientes": recomendaciones_pendientes,
        "visitas_semana": visitas_semana,
        "cosechas_mes": cosechas_mes
    }
    
    return {
        "alertas_clima": alertas_clima,
        "tratamientos_hoy": tratamientos_hoy,
        "contratos_vencer": contratos_vencer,
        "kpis": kpis,
        "fecha": today.isoformat(),
        "usuario": current_user.get("username", "")
    }
