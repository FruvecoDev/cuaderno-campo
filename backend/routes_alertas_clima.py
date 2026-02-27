"""
Routes for Climate Alerts - Automatic alerts based on weather conditions
Integrates with OpenWeatherMap API and supports manual data entry
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, timedelta
import httpx
import os

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/alertas-clima", tags=["alertas-clima"])

# Collections
alertas_collection = db['alertas_clima']
parcelas_collection = db['parcelas']
plantillas_collection = db['plantillas_recomendaciones']
datos_clima_collection = db['datos_clima']
config_alertas_collection = db['config_alertas']

# OpenWeatherMap API - Free tier (1000 calls/day)
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')  # Set in .env file
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

# Default alert rules - maps conditions to plantilla suggestions
DEFAULT_ALERT_RULES = [
    {
        "id": "high_humidity",
        "nombre": "Alta Humedad",
        "descripcion": "Condiciones favorables para enfermedades fúngicas",
        "condicion": "humidity",
        "operador": ">",
        "valor": 80,
        "unidad": "%",
        "plantilla_sugerida": "Control preventivo de hongos",
        "prioridad": "Alta",
        "icono": "droplets",
        "color": "#3b82f6"
    },
    {
        "id": "high_temperature",
        "nombre": "Altas Temperaturas",
        "descripcion": "Riesgo de araña roja y estrés hídrico",
        "condicion": "temperature",
        "operador": ">",
        "valor": 30,
        "unidad": "°C",
        "plantilla_sugerida": "Tratamiento araña roja",
        "prioridad": "Alta",
        "icono": "thermometer",
        "color": "#ef4444"
    },
    {
        "id": "recent_rain",
        "nombre": "Lluvias Recientes",
        "descripcion": "Condiciones favorables para caracoles y babosas",
        "condicion": "rain",
        "operador": ">",
        "valor": 5,
        "unidad": "mm",
        "plantilla_sugerida": "Control de caracoles y babosas",
        "prioridad": "Media",
        "icono": "cloud-rain",
        "color": "#6366f1"
    },
    {
        "id": "drought",
        "nombre": "Sequía / Baja Humedad",
        "descripcion": "Necesidad de riego adicional",
        "condicion": "humidity",
        "operador": "<",
        "valor": 40,
        "unidad": "%",
        "plantilla_sugerida": "Riego de mantenimiento",
        "prioridad": "Media",
        "icono": "sun",
        "color": "#f59e0b"
    },
    {
        "id": "mild_temperature",
        "nombre": "Temperaturas Templadas",
        "descripcion": "Condiciones favorables para pulgón",
        "condicion": "temperature",
        "operador": "between",
        "valor": [15, 25],
        "unidad": "°C",
        "plantilla_sugerida": "Control de pulgón",
        "prioridad": "Media",
        "icono": "bug",
        "color": "#22c55e"
    },
    {
        "id": "frost_risk",
        "nombre": "Riesgo de Heladas",
        "descripcion": "Temperaturas cercanas a 0°C",
        "condicion": "temperature",
        "operador": "<",
        "valor": 5,
        "unidad": "°C",
        "plantilla_sugerida": None,
        "prioridad": "Alta",
        "icono": "snowflake",
        "color": "#06b6d4"
    }
]


# Models
class DatosClimaManual(BaseModel):
    parcela_id: Optional[str] = None
    temperatura: float = Field(..., description="Temperatura en °C")
    humedad: float = Field(..., description="Humedad relativa en %")
    lluvia: float = Field(0, description="Lluvia en mm (últimas 24h)")
    viento: float = Field(0, description="Velocidad del viento en km/h")
    descripcion: Optional[str] = None
    ubicacion: Optional[str] = None


class ConfigAlerta(BaseModel):
    rule_id: str
    activo: bool = True
    valor_personalizado: Optional[float] = None


class AlertaUpdate(BaseModel):
    estado: str  # 'pendiente', 'revisada', 'resuelta', 'ignorada'
    notas: Optional[str] = None


def serialize_doc(doc: dict) -> dict:
    """Convert ObjectId to string for JSON serialization"""
    if not doc:
        return doc
    
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["_id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    
    return result


def evaluar_condicion(regla: dict, datos_clima: dict) -> bool:
    """Evaluate if a weather condition triggers an alert"""
    condicion = regla["condicion"]
    operador = regla["operador"]
    valor_umbral = regla["valor"]
    
    # Map condition names to data keys
    valor_actual = None
    if condicion == "temperature":
        valor_actual = datos_clima.get("temperatura")
    elif condicion == "humidity":
        valor_actual = datos_clima.get("humedad")
    elif condicion == "rain":
        valor_actual = datos_clima.get("lluvia", 0)
    elif condicion == "wind":
        valor_actual = datos_clima.get("viento", 0)
    
    if valor_actual is None:
        return False
    
    # Evaluate based on operator
    if operador == ">":
        return valor_actual > valor_umbral
    elif operador == "<":
        return valor_actual < valor_umbral
    elif operador == ">=":
        return valor_actual >= valor_umbral
    elif operador == "<=":
        return valor_actual <= valor_umbral
    elif operador == "==":
        return valor_actual == valor_umbral
    elif operador == "between":
        if isinstance(valor_umbral, list) and len(valor_umbral) == 2:
            return valor_umbral[0] <= valor_actual <= valor_umbral[1]
    
    return False


async def obtener_clima_api(lat: float, lon: float) -> Optional[dict]:
    """Get weather data from OpenWeatherMap API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {
                "lat": lat,
                "lon": lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",
                "lang": "es"
            }
            response = await client.get(OPENWEATHER_BASE_URL, params=params)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "temperatura": data["main"]["temp"],
                    "humedad": data["main"]["humidity"],
                    "lluvia": data.get("rain", {}).get("1h", 0),
                    "viento": data["wind"]["speed"] * 3.6,  # Convert m/s to km/h
                    "descripcion": data["weather"][0]["description"],
                    "icono": data["weather"][0]["icon"],
                    "ubicacion": data.get("name", ""),
                    "fuente": "openweathermap",
                    "timestamp": datetime.utcnow()
                }
            else:
                print(f"OpenWeatherMap API error: {response.status_code}")
                return None
    except Exception as e:
        print(f"Error fetching weather data: {e}")
        return None


async def generar_alertas_para_parcela(parcela: dict, datos_clima: dict, user: dict) -> List[dict]:
    """Generate alerts for a parcela based on weather data"""
    alertas_generadas = []
    
    # Get active rules config
    config = await config_alertas_collection.find_one({"tipo": "reglas_activas"})
    reglas_desactivadas = config.get("desactivadas", []) if config else []
    
    for regla in DEFAULT_ALERT_RULES:
        # Skip disabled rules
        if regla["id"] in reglas_desactivadas:
            continue
        
        # Check custom threshold
        custom_config = await config_alertas_collection.find_one({
            "tipo": "umbral_personalizado",
            "rule_id": regla["id"]
        })
        if custom_config and custom_config.get("valor"):
            regla = {**regla, "valor": custom_config["valor"]}
        
        # Evaluate condition
        if evaluar_condicion(regla, datos_clima):
            # Check if similar alert already exists (not resolved) in last 24h
            existing = await alertas_collection.find_one({
                "parcela_id": str(parcela["_id"]),
                "regla_id": regla["id"],
                "estado": {"$nin": ["resuelta", "ignorada"]},
                "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
            })
            
            if not existing:
                # Find matching plantilla
                plantilla = None
                if regla.get("plantilla_sugerida"):
                    plantilla = await plantillas_collection.find_one({
                        "nombre": {"$regex": regla["plantilla_sugerida"], "$options": "i"},
                        "activo": True
                    })
                
                alerta = {
                    "parcela_id": str(parcela["_id"]),
                    "parcela_codigo": parcela.get("codigo_plantacion", ""),
                    "parcela_cultivo": parcela.get("cultivo", ""),
                    "regla_id": regla["id"],
                    "nombre": regla["nombre"],
                    "descripcion": regla["descripcion"],
                    "condicion_detectada": f"{regla['condicion']} {regla['operador']} {regla['valor']} {regla['unidad']}",
                    "valor_actual": datos_clima.get(
                        "temperatura" if regla["condicion"] == "temperature" else
                        "humedad" if regla["condicion"] == "humidity" else
                        "lluvia" if regla["condicion"] == "rain" else
                        "viento"
                    ),
                    "plantilla_id": str(plantilla["_id"]) if plantilla else None,
                    "plantilla_nombre": plantilla.get("nombre") if plantilla else regla.get("plantilla_sugerida"),
                    "prioridad": regla["prioridad"],
                    "icono": regla["icono"],
                    "color": regla["color"],
                    "datos_clima": datos_clima,
                    "estado": "pendiente",
                    "created_at": datetime.utcnow(),
                    "created_by": user.get("username", "sistema"),
                    "created_by_id": str(user.get("_id", ""))
                }
                
                result = await alertas_collection.insert_one(alerta)
                alerta["_id"] = str(result.inserted_id)
                alertas_generadas.append(alerta)
    
    return alertas_generadas


# ==================== ENDPOINTS ====================

# GET active alerts
@router.get("")
async def get_alertas(
    estado: Optional[str] = None,
    parcela_id: Optional[str] = None,
    prioridad: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all active climate alerts"""
    query = {}
    
    if estado:
        query["estado"] = estado
    else:
        # By default, show non-resolved alerts
        query["estado"] = {"$nin": ["resuelta", "ignorada"]}
    
    if parcela_id:
        query["parcela_id"] = parcela_id
    
    if prioridad:
        query["prioridad"] = prioridad
    
    alertas = await alertas_collection.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Count by priority
    total_alta = await alertas_collection.count_documents({**query, "prioridad": "Alta"})
    total_media = await alertas_collection.count_documents({**query, "prioridad": "Media"})
    total_baja = await alertas_collection.count_documents({**query, "prioridad": "Baja"})
    
    return {
        "alertas": [serialize_doc(a) for a in alertas],
        "total": len(alertas),
        "por_prioridad": {
            "alta": total_alta,
            "media": total_media,
            "baja": total_baja
        }
    }


# GET weather data for parcela (API or manual)
@router.get("/clima/{parcela_id}")
async def get_clima_parcela(
    parcela_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current weather data for a parcela"""
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
        if not parcela:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")
        
        # Try to get from API if parcela has coordinates
        datos_clima = None
        if parcela.get("latitud") and parcela.get("longitud"):
            datos_clima = await obtener_clima_api(parcela["latitud"], parcela["longitud"])
        
        # Fallback to manual data
        if not datos_clima:
            manual = await datos_clima_collection.find_one(
                {"parcela_id": parcela_id},
                sort=[("timestamp", -1)]
            )
            if manual:
                datos_clima = {
                    "temperatura": manual.get("temperatura"),
                    "humedad": manual.get("humedad"),
                    "lluvia": manual.get("lluvia", 0),
                    "viento": manual.get("viento", 0),
                    "descripcion": manual.get("descripcion", "Datos manuales"),
                    "fuente": "manual",
                    "timestamp": manual.get("timestamp")
                }
        
        if not datos_clima:
            return {
                "success": False,
                "message": "No hay datos climáticos disponibles. Configure coordenadas o introduzca datos manualmente.",
                "parcela": serialize_doc(parcela)
            }
        
        return {
            "success": True,
            "parcela": serialize_doc(parcela),
            "clima": datos_clima
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# POST manual weather data
@router.post("/clima/manual")
async def registrar_clima_manual(
    datos: DatosClimaManual,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Register manual weather data and trigger alert evaluation"""
    registro = {
        "parcela_id": datos.parcela_id,
        "temperatura": datos.temperatura,
        "humedad": datos.humedad,
        "lluvia": datos.lluvia,
        "viento": datos.viento,
        "descripcion": datos.descripcion,
        "ubicacion": datos.ubicacion,
        "fuente": "manual",
        "timestamp": datetime.utcnow(),
        "registrado_por": current_user.get("username", "")
    }
    
    await datos_clima_collection.insert_one(registro)
    
    # Generate alerts for affected parcelas
    alertas_generadas = []
    
    if datos.parcela_id:
        # Single parcela
        parcela = await parcelas_collection.find_one({"_id": ObjectId(datos.parcela_id)})
        if parcela:
            alertas = await generar_alertas_para_parcela(parcela, registro, current_user)
            alertas_generadas.extend(alertas)
    else:
        # All parcelas
        parcelas = await parcelas_collection.find().to_list(500)
        for parcela in parcelas:
            alertas = await generar_alertas_para_parcela(parcela, registro, current_user)
            alertas_generadas.extend(alertas)
    
    return {
        "success": True,
        "message": f"Datos climáticos registrados. {len(alertas_generadas)} alerta(s) generada(s).",
        "alertas_generadas": [serialize_doc(a) for a in alertas_generadas]
    }


# POST check weather for all parcelas (batch)
@router.post("/verificar-todas")
async def verificar_clima_todas_parcelas(
    current_user: dict = Depends(get_current_user)
):
    """Check weather conditions for all parcelas and generate alerts"""
    parcelas = await parcelas_collection.find().to_list(500)
    
    alertas_generadas = []
    parcelas_procesadas = 0
    errores = []
    
    for parcela in parcelas:
        datos_clima = None
        
        # Try API first
        if parcela.get("latitud") and parcela.get("longitud"):
            datos_clima = await obtener_clima_api(parcela["latitud"], parcela["longitud"])
        
        # Fallback to latest manual data
        if not datos_clima:
            manual = await datos_clima_collection.find_one(
                {"parcela_id": str(parcela["_id"])},
                sort=[("timestamp", -1)]
            )
            if manual:
                datos_clima = {
                    "temperatura": manual.get("temperatura"),
                    "humedad": manual.get("humedad"),
                    "lluvia": manual.get("lluvia", 0),
                    "viento": manual.get("viento", 0),
                    "fuente": "manual"
                }
        
        if datos_clima:
            try:
                alertas = await generar_alertas_para_parcela(parcela, datos_clima, current_user)
                alertas_generadas.extend(alertas)
                parcelas_procesadas += 1
            except Exception as e:
                errores.append(f"Parcela {parcela.get('codigo_plantacion')}: {str(e)}")
    
    return {
        "success": True,
        "message": f"{parcelas_procesadas} parcela(s) verificada(s). {len(alertas_generadas)} alerta(s) generada(s).",
        "parcelas_procesadas": parcelas_procesadas,
        "alertas_generadas": len(alertas_generadas),
        "errores": errores if errores else None
    }


# PUT update alert status
@router.put("/{alerta_id}")
async def update_alerta(
    alerta_id: str,
    data: AlertaUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update alert status"""
    try:
        existing = await alertas_collection.find_one({"_id": ObjectId(alerta_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
        
        update_data = {
            "estado": data.estado,
            "updated_at": datetime.utcnow(),
            "updated_by": current_user.get("username", "")
        }
        
        if data.notas:
            update_data["notas"] = data.notas
        
        if data.estado == "resuelta":
            update_data["resuelto_at"] = datetime.utcnow()
        
        await alertas_collection.update_one(
            {"_id": ObjectId(alerta_id)},
            {"$set": update_data}
        )
        
        updated = await alertas_collection.find_one({"_id": ObjectId(alerta_id)})
        
        return {
            "success": True,
            "message": f"Alerta marcada como '{data.estado}'",
            "alerta": serialize_doc(updated)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# DELETE alert (mark as resolved)
@router.delete("/{alerta_id}")
async def delete_alerta(
    alerta_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete/dismiss an alert"""
    try:
        result = await alertas_collection.delete_one({"_id": ObjectId(alerta_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
        
        return {
            "success": True,
            "message": "Alerta eliminada"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GET alert rules configuration
@router.get("/reglas/config")
async def get_reglas_config(
    current_user: dict = Depends(get_current_user)
):
    """Get alert rules with their current configuration"""
    # Get disabled rules
    config = await config_alertas_collection.find_one({"tipo": "reglas_activas"})
    desactivadas = config.get("desactivadas", []) if config else []
    
    # Get custom thresholds
    custom_thresholds = {}
    async for doc in config_alertas_collection.find({"tipo": "umbral_personalizado"}):
        custom_thresholds[doc["rule_id"]] = doc.get("valor")
    
    reglas = []
    for regla in DEFAULT_ALERT_RULES:
        regla_config = {
            **regla,
            "activo": regla["id"] not in desactivadas,
            "valor_personalizado": custom_thresholds.get(regla["id"])
        }
        reglas.append(regla_config)
    
    return {
        "reglas": reglas
    }


# PUT update rule configuration
@router.put("/reglas/{rule_id}")
async def update_regla_config(
    rule_id: str,
    config: ConfigAlerta,
    current_user: dict = Depends(get_current_user)
):
    """Update alert rule configuration (enable/disable, custom threshold)"""
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin y Manager pueden configurar reglas")
    
    # Validate rule exists
    rule_exists = any(r["id"] == rule_id for r in DEFAULT_ALERT_RULES)
    if not rule_exists:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    
    # Update active status
    if not config.activo:
        await config_alertas_collection.update_one(
            {"tipo": "reglas_activas"},
            {"$addToSet": {"desactivadas": rule_id}},
            upsert=True
        )
    else:
        await config_alertas_collection.update_one(
            {"tipo": "reglas_activas"},
            {"$pull": {"desactivadas": rule_id}},
            upsert=True
        )
    
    # Update custom threshold
    if config.valor_personalizado is not None:
        await config_alertas_collection.update_one(
            {"tipo": "umbral_personalizado", "rule_id": rule_id},
            {"$set": {"valor": config.valor_personalizado, "updated_at": datetime.utcnow()}},
            upsert=True
        )
    
    return {
        "success": True,
        "message": f"Configuración de regla '{rule_id}' actualizada"
    }


# GET stats/summary
@router.get("/stats")
async def get_alertas_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get alert statistics"""
    # Active alerts
    pendientes = await alertas_collection.count_documents({"estado": "pendiente"})
    revisadas = await alertas_collection.count_documents({"estado": "revisada"})
    resueltas_hoy = await alertas_collection.count_documents({
        "estado": "resuelta",
        "resuelto_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0)}
    })
    
    # By type (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    alertas_semana = await alertas_collection.find({
        "created_at": {"$gte": week_ago}
    }).to_list(1000)
    
    por_tipo = {}
    for a in alertas_semana:
        tipo = a.get("regla_id", "otro")
        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
    
    # Parcelas with most alerts
    parcelas_alertas = {}
    for a in alertas_semana:
        parcela = a.get("parcela_codigo", "Desconocida")
        parcelas_alertas[parcela] = parcelas_alertas.get(parcela, 0) + 1
    
    top_parcelas = sorted(parcelas_alertas.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "resumen": {
            "pendientes": pendientes,
            "revisadas": revisadas,
            "resueltas_hoy": resueltas_hoy,
            "total_activas": pendientes + revisadas
        },
        "semana": {
            "total": len(alertas_semana),
            "por_tipo": por_tipo,
            "top_parcelas": [{"parcela": p, "alertas": c} for p, c in top_parcelas]
        }
    }
