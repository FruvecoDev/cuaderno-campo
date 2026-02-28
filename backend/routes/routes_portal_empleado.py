"""
Portal del Empleado - Endpoints
Acceso limitado para empleados: ver sus fichajes, documentos, prenóminas y solicitar ausencias
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional
from database import db, serialize_doc
from routes_auth import get_current_user

router = APIRouter(prefix="/api/portal-empleado", tags=["portal-empleado"])

def get_db():
    return db

async def get_empleado_vinculado(user: dict):
    """Obtiene el empleado vinculado al usuario actual"""
    database = get_db()
    
    # Buscar por email o por empleado_id en el usuario
    empleado = None
    
    if user.get("empleado_id"):
        empleado = await database.empleados.find_one({"_id": ObjectId(user["empleado_id"])})
    
    if not empleado and user.get("email"):
        empleado = await database.empleados.find_one({"email": user["email"]})
    
    if not empleado:
        raise HTTPException(status_code=404, detail="No tienes un perfil de empleado vinculado. Contacta con RRHH.")
    
    return serialize_doc(empleado)

@router.get("/mi-perfil")
async def get_mi_perfil(current_user: dict = Depends(get_current_user)):
    """Obtiene el perfil del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    
    # Ocultar información sensible
    empleado.pop("salario_hora", None)
    empleado.pop("precio_hora_extra", None)
    
    return {
        "success": True,
        "empleado": empleado
    }

@router.get("/mis-fichajes")
async def get_mis_fichajes(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene los fichajes del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    # Filtrar por fechas
    query = {"empleado_id": empleado["_id"]}
    
    if fecha_desde:
        query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in query:
            query["fecha"]["$lte"] = fecha_hasta
        else:
            query["fecha"] = {"$lte": fecha_hasta}
    
    # Obtener fichajes ordenados por fecha descendente
    fichajes = await database.fichajes.find(query).sort("fecha", -1).limit(100).to_list(100)
    
    # Calcular resumen del mes actual
    now = datetime.now()
    primer_dia_mes = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    
    fichajes_mes = await database.fichajes.find({
        "empleado_id": empleado["_id"],
        "fecha": {"$gte": primer_dia_mes}
    }).to_list(1000)
    
    # Calcular horas del mes
    horas_mes = 0
    dias_fichados = set()
    for f in fichajes_mes:
        dias_fichados.add(f.get("fecha"))
        if f.get("horas_trabajadas"):
            horas_mes += f["horas_trabajadas"]
    
    return {
        "success": True,
        "fichajes": [serialize_doc(f) for f in fichajes],
        "resumen_mes": {
            "mes": now.strftime("%B %Y"),
            "dias_fichados": len(dias_fichados),
            "horas_trabajadas": round(horas_mes, 2)
        }
    }

@router.get("/mis-documentos")
async def get_mis_documentos(current_user: dict = Depends(get_current_user)):
    """Obtiene los documentos del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    documentos = await database.documentos_empleado.find({
        "empleado_id": empleado["_id"]
    }).sort("fecha_registro", -1).to_list(100)
    
    return {
        "success": True,
        "documentos": [serialize_doc(d) for d in documentos]
    }

@router.get("/mis-prenominas")
async def get_mis_prenominas(
    ano: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene las prenóminas del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    query = {"empleado_id": empleado["_id"]}
    if ano:
        query["periodo_ano"] = ano
    
    prenominas = await database.prenominas.find(query).sort([
        ("periodo_ano", -1),
        ("periodo_mes", -1)
    ]).to_list(24)
    
    return {
        "success": True,
        "prenominas": [serialize_doc(p) for p in prenominas]
    }

@router.get("/mis-ausencias")
async def get_mis_ausencias(current_user: dict = Depends(get_current_user)):
    """Obtiene las ausencias del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    ausencias = await database.ausencias.find({
        "empleado_id": empleado["_id"]
    }).sort("fecha_inicio", -1).to_list(50)
    
    return {
        "success": True,
        "ausencias": [serialize_doc(a) for a in ausencias]
    }

@router.post("/solicitar-ausencia")
async def solicitar_ausencia(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Solicita una ausencia (vacaciones, permiso, etc.)"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    ausencia = {
        "empleado_id": empleado["_id"],
        "empleado_nombre": f"{empleado['nombre']} {empleado['apellidos']}",
        "tipo": data.get("tipo", "vacaciones"),  # vacaciones, permiso, baja_medica, otros
        "fecha_inicio": data.get("fecha_inicio"),
        "fecha_fin": data.get("fecha_fin"),
        "motivo": data.get("motivo", ""),
        "estado": "pendiente",  # pendiente, aprobada, rechazada
        "solicitado_por": current_user.get("email"),
        "fecha_solicitud": datetime.now(),
        "created_at": datetime.now()
    }
    
    result = await database.ausencias.insert_one(ausencia)
    ausencia["_id"] = str(result.inserted_id)
    
    return {
        "success": True,
        "message": "Solicitud de ausencia enviada correctamente",
        "ausencia": ausencia
    }

@router.get("/resumen-dashboard")
async def get_resumen_dashboard(current_user: dict = Depends(get_current_user)):
    """Obtiene un resumen para el dashboard del portal"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    now = datetime.now()
    hoy = now.strftime("%Y-%m-%d")
    primer_dia_mes = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    
    # Fichajes de hoy
    fichajes_hoy = await database.fichajes.find({
        "empleado_id": empleado["_id"],
        "fecha": hoy
    }).to_list(10)
    
    # Último fichaje
    ultimo_fichaje = await database.fichajes.find_one(
        {"empleado_id": empleado["_id"]},
        sort=[("fecha", -1), ("hora", -1)]
    )
    
    # Horas del mes
    fichajes_mes = await database.fichajes.find({
        "empleado_id": empleado["_id"],
        "fecha": {"$gte": primer_dia_mes}
    }).to_list(1000)
    
    horas_mes = sum(f.get("horas_trabajadas", 0) for f in fichajes_mes)
    
    # Documentos pendientes de firma
    docs_pendientes = await database.documentos_empleado.count_documents({
        "empleado_id": empleado["_id"],
        "requiere_firma": True,
        "firmado": {"$ne": True}
    })
    
    # Ausencias pendientes
    ausencias_pendientes = await database.ausencias.count_documents({
        "empleado_id": empleado["_id"],
        "estado": "pendiente"
    })
    
    # Próximas ausencias aprobadas
    proximas_ausencias = await database.ausencias.find({
        "empleado_id": empleado["_id"],
        "estado": "aprobada",
        "fecha_inicio": {"$gte": hoy}
    }).sort("fecha_inicio", 1).limit(3).to_list(3)
    
    # Última prenómina
    ultima_prenomina = await database.prenominas.find_one(
        {"empleado_id": empleado["_id"]},
        sort=[("periodo_ano", -1), ("periodo_mes", -1)]
    )
    
    return {
        "success": True,
        "empleado": {
            "nombre": f"{empleado['nombre']} {empleado['apellidos']}",
            "codigo": empleado.get("codigo"),
            "puesto": empleado.get("puesto"),
            "departamento": empleado.get("departamento"),
            "foto_url": empleado.get("foto_url")
        },
        "fichajes_hoy": [serialize_doc(f) for f in fichajes_hoy],
        "ultimo_fichaje": serialize_doc(ultimo_fichaje) if ultimo_fichaje else None,
        "horas_mes": round(horas_mes, 2),
        "documentos_pendientes_firma": docs_pendientes,
        "ausencias_pendientes": ausencias_pendientes,
        "proximas_ausencias": [serialize_doc(a) for a in proximas_ausencias],
        "ultima_prenomina": serialize_doc(ultima_prenomina) if ultima_prenomina else None
    }

@router.post("/fichar")
async def fichar(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Permite al empleado fichar entrada/salida"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    now = datetime.now()
    
    fichaje = {
        "empleado_id": empleado["_id"],
        "empleado_nombre": f"{empleado['nombre']} {empleado['apellidos']}",
        "empleado_codigo": empleado.get("codigo"),
        "tipo": data.get("tipo", "entrada"),  # entrada, salida
        "fecha": now.strftime("%Y-%m-%d"),
        "hora": now.strftime("%H:%M:%S"),
        "metodo_identificacion": "portal",
        "ubicacion": data.get("ubicacion"),
        "notas": data.get("notas"),
        "created_at": now
    }
    
    result = await database.fichajes.insert_one(fichaje)
    fichaje["_id"] = str(result.inserted_id)
    
    return {
        "success": True,
        "message": f"Fichaje de {fichaje['tipo']} registrado correctamente",
        "fichaje": fichaje
    }

@router.put("/firmar-documento/{documento_id}")
async def firmar_documento(
    documento_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Permite al empleado firmar un documento"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    # Verificar que el documento pertenece al empleado
    documento = await database.documentos_empleado.find_one({
        "_id": ObjectId(documento_id),
        "empleado_id": empleado["_id"]
    })
    
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Actualizar con la firma
    await database.documentos_empleado.update_one(
        {"_id": ObjectId(documento_id)},
        {"$set": {
            "firmado": True,
            "firma_empleado": data.get("firma"),
            "fecha_firma": datetime.now(),
            "firmado_por": current_user.get("email")
        }}
    )
    
    return {
        "success": True,
        "message": "Documento firmado correctamente"
    }



@router.get("/mis-notificaciones")
async def get_mis_notificaciones(current_user: dict = Depends(get_current_user)):
    """Obtiene las notificaciones del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    email = current_user.get("email")
    
    # Buscar notificaciones para este empleado o para todos
    notificaciones = await database.notificaciones.find({
        "$or": [
            {"destinatarios": email},
            {"destinatarios": None}
        ]
    }).sort("created_at", -1).limit(50).to_list(50)
    
    # Marcar cuáles han sido leídas por este usuario
    for n in notificaciones:
        n["_id"] = str(n["_id"])
        n["leida"] = email in n.get("leida_por", [])
        n.pop("leida_por", None)  # No exponer esta info
        if n.get("created_at"):
            n["created_at"] = n["created_at"].isoformat()
    
    # Contar no leídas
    no_leidas = sum(1 for n in notificaciones if not n.get("leida"))
    
    return {
        "success": True,
        "notificaciones": notificaciones,
        "no_leidas": no_leidas
    }

@router.put("/notificaciones/{notificacion_id}/leer")
async def marcar_notificacion_leida(
    notificacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marcar una notificación como leída"""
    database = get_db()
    email = current_user.get("email")
    
    await database.notificaciones.update_one(
        {"_id": ObjectId(notificacion_id)},
        {"$addToSet": {"leida_por": email}}
    )
    
    return {"success": True}

@router.put("/notificaciones/leer-todas")
async def marcar_todas_leidas(current_user: dict = Depends(get_current_user)):
    """Marcar todas las notificaciones como leídas"""
    database = get_db()
    email = current_user.get("email")
    
    await database.notificaciones.update_many(
        {"$or": [
            {"destinatarios": email},
            {"destinatarios": None}
        ]},
        {"$addToSet": {"leida_por": email}}
    )
    
    return {"success": True}


# ============================================================================
# Productividad del Empleado
# ============================================================================

@router.get("/mi-productividad")
async def get_mi_productividad(
    periodo: Optional[str] = "mes",  # dia, semana, mes, ano
    current_user: dict = Depends(get_current_user)
):
    """Obtiene la productividad del empleado actual"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    # Calcular fechas según el periodo
    now = datetime.now()
    if periodo == "dia":
        fecha_desde = now.strftime("%Y-%m-%d")
    elif periodo == "semana":
        fecha_desde = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    elif periodo == "mes":
        fecha_desde = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    else:  # ano
        fecha_desde = datetime(now.year, 1, 1).strftime("%Y-%m-%d")
    
    fecha_hasta = now.strftime("%Y-%m-%d")
    
    # Obtener registros de productividad del empleado
    registros = await database.productividad.find({
        "empleado_id": empleado["_id"],
        "fecha": {"$gte": fecha_desde, "$lte": fecha_hasta}
    }).sort("fecha", -1).to_list(500)
    
    # Calcular totales
    total_kilos = sum(r.get("kilos", 0) for r in registros)
    total_horas = sum(r.get("horas", 0) for r in registros)
    total_hectareas = sum(r.get("hectareas", 0) for r in registros)
    
    # Calcular productividad media (kg/hora)
    productividad_media = total_kilos / total_horas if total_horas > 0 else 0
    
    # Obtener el ranking del empleado
    ranking_info = await get_ranking_empleado(database, empleado["_id"], fecha_desde, fecha_hasta)
    
    return {
        "success": True,
        "periodo": {
            "tipo": periodo,
            "desde": fecha_desde,
            "hasta": fecha_hasta
        },
        "totales": {
            "kilos": round(total_kilos, 2),
            "horas": round(total_horas, 2),
            "hectareas": round(total_hectareas, 2),
            "registros": len(registros),
            "productividad_media": round(productividad_media, 2)
        },
        "ranking": ranking_info,
        "registros": [serialize_doc(r) for r in registros[:20]]  # Últimos 20 registros
    }


async def get_ranking_empleado(database, empleado_id: str, fecha_desde: str, fecha_hasta: str):
    """Calcula el ranking del empleado dentro del periodo"""
    
    # Agregar productividad de todos los empleados
    pipeline = [
        {"$match": {"fecha": {"$gte": fecha_desde, "$lte": fecha_hasta}}},
        {"$group": {
            "_id": "$empleado_id",
            "total_kilos": {"$sum": "$kilos"},
            "total_horas": {"$sum": "$horas"}
        }},
        {"$addFields": {
            "kilos_hora": {
                "$cond": [
                    {"$gt": ["$total_horas", 0]},
                    {"$divide": ["$total_kilos", "$total_horas"]},
                    0
                ]
            }
        }},
        {"$sort": {"total_kilos": -1}}
    ]
    
    resultados = await database.productividad.aggregate(pipeline).to_list(100)
    
    # Encontrar posición del empleado
    posicion = 0
    total_empleados = len(resultados)
    empleado_stats = None
    
    for idx, r in enumerate(resultados):
        if r["_id"] == empleado_id:
            posicion = idx + 1
            empleado_stats = r
            break
    
    # Obtener top 3
    top_3 = []
    for r in resultados[:3]:
        emp = await database.empleados.find_one({"_id": ObjectId(r["_id"])}) if ObjectId.is_valid(r["_id"]) else None
        if emp:
            top_3.append({
                "nombre": f"{emp.get('nombre', '')} {emp.get('apellidos', '')}".strip(),
                "kilos": round(r["total_kilos"], 0),
                "kilos_hora": round(r["kilos_hora"], 1)
            })
    
    return {
        "posicion": posicion,
        "total_empleados": total_empleados,
        "top_3": top_3,
        "percentil": round((1 - posicion / total_empleados) * 100, 0) if total_empleados > 0 else 0
    }


@router.get("/productividad-hoy")
async def get_productividad_hoy(current_user: dict = Depends(get_current_user)):
    """Obtiene la productividad del día actual con comparativa"""
    empleado = await get_empleado_vinculado(current_user)
    database = get_db()
    
    hoy = datetime.now().strftime("%Y-%m-%d")
    ayer = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Productividad de hoy
    registros_hoy = await database.productividad.find({
        "empleado_id": empleado["_id"],
        "fecha": hoy
    }).to_list(100)
    
    # Productividad de ayer
    registros_ayer = await database.productividad.find({
        "empleado_id": empleado["_id"],
        "fecha": ayer
    }).to_list(100)
    
    kilos_hoy = sum(r.get("kilos", 0) for r in registros_hoy)
    kilos_ayer = sum(r.get("kilos", 0) for r in registros_ayer)
    horas_hoy = sum(r.get("horas", 0) for r in registros_hoy)
    
    # Calcular variación
    variacion = 0
    if kilos_ayer > 0:
        variacion = ((kilos_hoy - kilos_ayer) / kilos_ayer) * 100
    
    return {
        "success": True,
        "hoy": {
            "fecha": hoy,
            "kilos": round(kilos_hoy, 0),
            "horas": round(horas_hoy, 1),
            "registros": len(registros_hoy)
        },
        "ayer": {
            "fecha": ayer,
            "kilos": round(kilos_ayer, 0)
        },
        "variacion_porcentaje": round(variacion, 1),
        "tendencia": "subiendo" if variacion > 0 else "bajando" if variacion < 0 else "estable"
    }

