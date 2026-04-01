"""
RRHH - Productividad
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/api/rrhh", tags=["RRHH - Productividad"])

db = None

def set_database(database):
    global db
    db = database

def get_db():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db


@router.get("/productividad")
async def get_registros_productividad(
    empleado_id: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    parcela_id: Optional[str] = None,
    tipo_trabajo: Optional[str] = None
):
    database = get_db()
    query = {}
    if empleado_id:
        query["empleado_id"] = empleado_id
    if fecha_desde:
        query["fecha"] = {"$gte": fecha_desde}
    if fecha_hasta:
        if "fecha" in query:
            query["fecha"]["$lte"] = fecha_hasta
        else:
            query["fecha"] = {"$lte": fecha_hasta}
    if parcela_id:
        query["parcela_id"] = parcela_id
    if tipo_trabajo:
        query["tipo_trabajo"] = tipo_trabajo
    
    registros = []
    cursor = database.productividad.find(query).sort("fecha", -1)
    async for r in cursor:
        r["_id"] = str(r["_id"])
        emp_id = r.get("empleado_id")
        if emp_id:
            try:
                emp = await database.empleados.find_one({"_id": ObjectId(emp_id)})
                if emp:
                    r["empleado_nombre"] = f"{emp.get('nombre', '')} {emp.get('apellidos', '')}"
            except Exception:
                pass
        registros.append(r)
    return {"success": True, "registros": registros, "total": len(registros)}


@router.get("/productividad/stats")
async def get_productividad_stats(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None
):
    database = get_db()
    if not fecha_desde:
        fecha_desde = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    if not fecha_hasta:
        fecha_hasta = datetime.now().strftime("%Y-%m-%d")
    
    query = {"fecha": {"$gte": fecha_desde, "$lte": fecha_hasta}}
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_kilos": {"$sum": {"$ifNull": ["$kilos_recogidos", 0]}},
            "total_hectareas": {"$sum": {"$ifNull": ["$hectareas_trabajadas", 0]}},
            "total_horas": {"$sum": {"$ifNull": ["$horas_trabajadas", 0]}},
            "total_registros": {"$sum": 1}
        }}
    ]
    totales = {"total_kilos": 0, "total_hectareas": 0, "total_horas": 0, "total_registros": 0}
    async for doc in database.productividad.aggregate(pipeline):
        totales = {k: doc.get(k, 0) for k in totales}
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$empleado_id", "total_kilos": {"$sum": {"$ifNull": ["$kilos_recogidos", 0]}}, "total_horas": {"$sum": {"$ifNull": ["$horas_trabajadas", 0]}}}},
        {"$sort": {"total_kilos": -1}}, {"$limit": 10}
    ]
    top_empleados = []
    async for doc in database.productividad.aggregate(pipeline):
        emp = await database.empleados.find_one({"_id": ObjectId(doc["_id"])})
        if emp:
            top_empleados.append({
                "empleado_id": doc["_id"],
                "empleado_nombre": f"{emp.get('nombre', '')} {emp.get('apellidos', '')}",
                "total_kilos": doc["total_kilos"], "total_horas": doc["total_horas"],
                "kilos_hora": round(doc["total_kilos"] / doc["total_horas"], 2) if doc["total_horas"] > 0 else 0
            })
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$tipo_trabajo", "count": {"$sum": 1}, "horas": {"$sum": {"$ifNull": ["$horas_trabajadas", 0]}}}}
    ]
    por_tipo = {}
    async for doc in database.productividad.aggregate(pipeline):
        por_tipo[doc["_id"] or "otros"] = {"registros": doc["count"], "horas": doc["horas"]}
    
    return {"success": True, "periodo": {"desde": fecha_desde, "hasta": fecha_hasta}, "totales": totales, "top_empleados": top_empleados, "por_tipo_trabajo": por_tipo}


@router.get("/productividad/tiempo-real")
async def get_productividad_tiempo_real():
    database = get_db()
    hoy = datetime.now().strftime("%Y-%m-%d")
    
    pipeline = [
        {"$match": {"fecha": hoy}}, {"$sort": {"hora": -1}},
        {"$group": {"_id": "$empleado_id", "ultimo_fichaje": {"$first": "$tipo"}, "hora_entrada": {"$last": "$hora"}}},
        {"$match": {"ultimo_fichaje": "entrada"}}
    ]
    empleados_trabajando = []
    async for doc in database.fichajes.aggregate(pipeline):
        emp = await database.empleados.find_one({"_id": ObjectId(doc["_id"])})
        if emp:
            prod = await database.productividad.find_one({"empleado_id": doc["_id"], "fecha": hoy})
            empleados_trabajando.append({
                "empleado_id": doc["_id"],
                "empleado_nombre": f"{emp.get('nombre', '')} {emp.get('apellidos', '')}",
                "empleado_foto": emp.get("foto_url"), "puesto": emp.get("puesto"),
                "hora_entrada": doc["hora_entrada"],
                "kilos_hoy": prod.get("kilos_recogidos", 0) if prod else 0,
                "horas_hoy": prod.get("horas_trabajadas", 0) if prod else 0
            })
    
    pipeline = [{"$match": {"fecha": hoy}}, {"$group": {"_id": None, "total_kilos": {"$sum": {"$ifNull": ["$kilos_recogidos", 0]}}, "total_horas": {"$sum": {"$ifNull": ["$horas_trabajadas", 0]}}}}]
    totales_hoy = {"total_kilos": 0, "total_horas": 0}
    async for doc in database.productividad.aggregate(pipeline):
        totales_hoy = {"total_kilos": doc.get("total_kilos", 0), "total_horas": doc.get("total_horas", 0)}
    
    return {"success": True, "fecha": hoy, "empleados_trabajando": empleados_trabajando, "total_empleados_trabajando": len(empleados_trabajando), "totales_hoy": totales_hoy}


@router.post("/productividad")
async def create_registro_productividad(registro: dict):
    database = get_db()
    if registro.get("hora_inicio") and registro.get("hora_fin"):
        h_inicio = datetime.strptime(registro["hora_inicio"], "%H:%M")
        h_fin = datetime.strptime(registro["hora_fin"], "%H:%M")
        diff = (h_fin - h_inicio).seconds / 3600
        descanso = registro.get("minutos_descanso", 0) / 60
        registro["horas_trabajadas"] = round(diff - descanso, 2)
    
    registro["created_at"] = datetime.now()
    registro["validado"] = False
    result = await database.productividad.insert_one(registro)
    registro["_id"] = str(result.inserted_id)
    
    empleado_id = registro.get("empleado_id")
    if empleado_id:
        empleado = await database.empleados.find_one({"_id": ObjectId(empleado_id)})
        if empleado and empleado.get("email"):
            notificacion = {
                "tipo": "productividad", "titulo": "Nuevo registro de productividad",
                "mensaje": f"Se ha registrado tu actividad: {registro.get('kilos', 0)} kg en {registro.get('tipo_trabajo', 'trabajo')}",
                "destinatarios": [empleado["email"]], "leida_por": [],
                "datos": {"kilos": registro.get("kilos", 0), "tipo_trabajo": registro.get("tipo_trabajo", ""), "fecha": registro.get("fecha", "")},
                "created_at": datetime.now()
            }
            await database.notificaciones.insert_one(notificacion)
    return {"success": True, "data": registro}


@router.put("/productividad/{registro_id}")
async def update_registro_productividad(registro_id: str, registro: dict):
    database = get_db()
    registro.pop("_id", None)
    if registro.get("hora_inicio") and registro.get("hora_fin"):
        h_inicio = datetime.strptime(registro["hora_inicio"], "%H:%M")
        h_fin = datetime.strptime(registro["hora_fin"], "%H:%M")
        diff = (h_fin - h_inicio).seconds / 3600
        descanso = registro.get("minutos_descanso", 0) / 60
        registro["horas_trabajadas"] = round(diff - descanso, 2)
    result = await database.productividad.update_one({"_id": ObjectId(registro_id)}, {"$set": registro})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"success": True}


@router.delete("/productividad/{registro_id}")
async def delete_registro_productividad(registro_id: str):
    database = get_db()
    result = await database.productividad.delete_one({"_id": ObjectId(registro_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"success": True}
