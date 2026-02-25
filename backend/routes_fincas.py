"""
Routes for Fincas (Farms) - Complete CRUD operations
A finca can have multiple parcelas associated
Includes SIGPAC data for parcel location
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from models import FincaCreate, FincaUpdate, DatosSIGPAC
from database import db
from rbac_guards import (
    RequireCreate, RequireDelete,
    RequireFincasAccess, get_current_user
)

router = APIRouter(prefix="/api", tags=["fincas"])

# Collections
fincas_collection = db['fincas']
parcelas_collection = db['parcelas']


def serialize_doc(doc: dict) -> dict:
    """Convert ObjectId and nested objects for JSON serialization"""
    if not doc:
        return doc
    
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["_id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [
                serialize_doc(item) if isinstance(item, dict) 
                else str(item) if isinstance(item, ObjectId) 
                else item 
                for item in value
            ]
        else:
            result[key] = value
    
    return result


# ==================== CRUD ENDPOINTS ====================

@router.post("/fincas", response_model=dict)
async def create_finca(
    finca: FincaCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireFincasAccess)
):
    """Create a new finca"""
    # Check for duplicate name
    existing = await fincas_collection.find_one({"denominacion": finca.denominacion})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una finca con esa denominación")
    
    finca_dict = finca.dict()
    
    # Handle sigpac as dict
    if finca_dict.get("sigpac"):
        if hasattr(finca_dict["sigpac"], "dict"):
            finca_dict["sigpac"] = finca_dict["sigpac"].dict()
    
    finca_dict.update({
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": current_user.get("username", ""),
        "created_by_id": str(current_user.get("_id", ""))
    })
    
    result = await fincas_collection.insert_one(finca_dict)
    
    # Update parcelas to reference this finca
    if finca.parcelas_ids:
        try:
            await parcelas_collection.update_many(
                {"_id": {"$in": [ObjectId(pid) for pid in finca.parcelas_ids if pid]}},
                {"$set": {"finca_id": str(result.inserted_id)}}
            )
        except:
            pass
    
    created = await fincas_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created), "message": "Finca creada correctamente"}


@router.get("/fincas")
async def get_fincas(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    provincia: Optional[str] = None,
    poblacion: Optional[str] = None,
    activo: Optional[bool] = None,
    finca_propia: Optional[bool] = None,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    """Get all fincas with optional filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"denominacion": {"$regex": search, "$options": "i"}},
            {"nombre": {"$regex": search, "$options": "i"}},
            {"provincia": {"$regex": search, "$options": "i"}},
            {"poblacion": {"$regex": search, "$options": "i"}}
        ]
    
    if provincia:
        query["provincia"] = {"$regex": provincia, "$options": "i"}
    
    if poblacion:
        query["poblacion"] = {"$regex": poblacion, "$options": "i"}
    
    if activo is not None:
        query["activo"] = activo
    
    if finca_propia is not None:
        query["finca_propia"] = finca_propia
    
    if campana:
        query["campana"] = campana
    
    total = await fincas_collection.count_documents(query)
    fincas = await fincas_collection.find(query).sort([("denominacion", 1), ("nombre", 1)]).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with parcelas info
    for finca in fincas:
        parcelas_ids = finca.get("parcelas_ids", [])
        if parcelas_ids:
            try:
                object_ids = [ObjectId(pid) for pid in parcelas_ids if pid]
                parcelas = await parcelas_collection.find({"_id": {"$in": object_ids}}).to_list(100)
                finca["parcelas_info"] = [
                    {
                        "_id": str(p["_id"]),
                        "codigo_plantacion": p.get("codigo_plantacion", ""),
                        "cultivo": p.get("cultivo", ""),
                        "superficie_total": p.get("superficie_total", 0)
                    }
                    for p in parcelas
                ]
                finca["num_parcelas"] = len(parcelas)
            except:
                finca["parcelas_info"] = []
                finca["num_parcelas"] = 0
        else:
            finca["parcelas_info"] = []
            finca["num_parcelas"] = 0
    
    return {
        "fincas": [serialize_doc(f) for f in fincas],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/fincas/stats")
async def get_fincas_stats(
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    """Get fincas statistics"""
    total = await fincas_collection.count_documents({})
    activas = await fincas_collection.count_documents({"activo": {"$ne": False}})
    propias = await fincas_collection.count_documents({"finca_propia": True})
    
    # Sum hectareas
    pipeline = [
        {"$group": {
            "_id": None,
            "total_hectareas": {"$sum": {"$ifNull": ["$hectareas", 0]}},
            "total_produccion_esperada": {"$sum": {"$ifNull": ["$produccion_esperada", 0]}},
            "total_produccion_disponible": {"$sum": {"$ifNull": ["$produccion_disponible", 0]}}
        }}
    ]
    
    totals = await fincas_collection.aggregate(pipeline).to_list(1)
    totals_data = totals[0] if totals else {
        "total_hectareas": 0,
        "total_produccion_esperada": 0,
        "total_produccion_disponible": 0
    }
    
    # By provincia
    by_provincia = await fincas_collection.aggregate([
        {"$group": {"_id": "$provincia", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    return {
        "total": total,
        "activas": activas,
        "propias": propias,
        "alquiladas": total - propias,
        "total_hectareas": round(totals_data.get("total_hectareas", 0), 2),
        "total_produccion_esperada": round(totals_data.get("total_produccion_esperada", 0), 2),
        "total_produccion_disponible": round(totals_data.get("total_produccion_disponible", 0), 2),
        "por_provincia": [{"provincia": p["_id"] or "Sin provincia", "count": p["count"]} for p in by_provincia]
    }


@router.get("/fincas/parcelas-disponibles")
async def get_parcelas_disponibles(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get parcelas that are not assigned to any finca"""
    query = {
        "$or": [
            {"finca_id": {"$exists": False}},
            {"finca_id": None},
            {"finca_id": ""}
        ]
    }
    
    if search:
        base_query = query.pop("$or")
        query["$and"] = [
            {"$or": base_query},
            {"$or": [
                {"codigo_plantacion": {"$regex": search, "$options": "i"}},
                {"cultivo": {"$regex": search, "$options": "i"}}
            ]}
        ]
    
    parcelas = await parcelas_collection.find(query).sort("codigo_plantacion", 1).limit(100).to_list(100)
    
    return {
        "parcelas": [
            {
                "_id": str(p["_id"]),
                "codigo_plantacion": p.get("codigo_plantacion", ""),
                "cultivo": p.get("cultivo", ""),
                "variedad": p.get("variedad", ""),
                "superficie_total": p.get("superficie_total", 0),
                "provincia": p.get("provincia", ""),
                "poblacion": p.get("poblacion", "")
            }
            for p in parcelas
        ]
    }


@router.get("/fincas/{finca_id}")
async def get_finca(
    finca_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    """Get a single finca by ID"""
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    finca = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    # Get associated parcelas
    parcelas_ids = finca.get("parcelas_ids", [])
    if parcelas_ids:
        try:
            object_ids = [ObjectId(pid) for pid in parcelas_ids if pid]
            parcelas = await parcelas_collection.find({"_id": {"$in": object_ids}}).to_list(100)
            finca["parcelas_detalle"] = [serialize_doc(p) for p in parcelas]
        except:
            finca["parcelas_detalle"] = []
    else:
        finca["parcelas_detalle"] = []
    
    return serialize_doc(finca)


@router.put("/fincas/{finca_id}")
async def update_finca(
    finca_id: str,
    data: FincaUpdate,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    """Update a finca"""
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    existing = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    # Check for duplicate name if changing
    if data.denominacion and data.denominacion != existing.get("denominacion"):
        duplicate = await fincas_collection.find_one({"denominacion": data.denominacion})
        if duplicate:
            raise HTTPException(status_code=400, detail="Ya existe una finca con esa denominación")
    
    update_data = {}
    for key, value in data.dict(exclude_unset=True).items():
        if value is not None:
            if key == "sigpac" and isinstance(value, dict):
                update_data["sigpac"] = value
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_user.get("username", "")
    
    # Handle parcelas_ids changes
    old_parcelas = set(existing.get("parcelas_ids", []))
    new_parcelas = set(data.parcelas_ids) if data.parcelas_ids is not None else old_parcelas
    
    # Remove finca_id from parcelas no longer associated
    removed = old_parcelas - new_parcelas
    if removed:
        try:
            await parcelas_collection.update_many(
                {"_id": {"$in": [ObjectId(pid) for pid in removed if pid]}},
                {"$unset": {"finca_id": ""}}
            )
        except:
            pass
    
    # Add finca_id to newly associated parcelas
    added = new_parcelas - old_parcelas
    if added:
        try:
            await parcelas_collection.update_many(
                {"_id": {"$in": [ObjectId(pid) for pid in added if pid]}},
                {"$set": {"finca_id": finca_id}}
            )
        except:
            pass
    
    await fincas_collection.update_one(
        {"_id": ObjectId(finca_id)},
        {"$set": update_data}
    )
    
    updated = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    
    return {
        "success": True,
        "message": "Finca actualizada",
        "data": serialize_doc(updated)
    }


@router.delete("/fincas/{finca_id}")
async def delete_finca(
    finca_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireFincasAccess)
):
    """Delete a finca"""
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    existing = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    # Remove finca_id from associated parcelas
    parcelas_ids = existing.get("parcelas_ids", [])
    if parcelas_ids:
        try:
            await parcelas_collection.update_many(
                {"_id": {"$in": [ObjectId(pid) for pid in parcelas_ids if pid]}},
                {"$unset": {"finca_id": ""}}
            )
        except:
            pass
    
    await fincas_collection.delete_one({"_id": ObjectId(finca_id)})
    
    return {"success": True, "message": "Finca eliminada"}


# ==================== PARCELA ASSOCIATION ENDPOINTS ====================

@router.post("/fincas/{finca_id}/parcelas/{parcela_id}")
async def add_parcela_to_finca(
    finca_id: str,
    parcela_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    """Add a parcela to a finca"""
    if not ObjectId.is_valid(finca_id) or not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    finca = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    
    # Check if parcela is already in another finca
    if parcela.get("finca_id") and parcela.get("finca_id") != finca_id:
        raise HTTPException(status_code=400, detail="La parcela ya está asignada a otra finca")
    
    # Add to finca
    parcelas_ids = finca.get("parcelas_ids", [])
    if parcela_id not in parcelas_ids:
        parcelas_ids.append(parcela_id)
        await fincas_collection.update_one(
            {"_id": ObjectId(finca_id)},
            {"$set": {"parcelas_ids": parcelas_ids, "updated_at": datetime.utcnow()}}
        )
    
    # Update parcela
    await parcelas_collection.update_one(
        {"_id": ObjectId(parcela_id)},
        {"$set": {"finca_id": finca_id}}
    )
    
    return {
        "success": True,
        "message": "Parcela añadida a la finca"
    }


@router.delete("/fincas/{finca_id}/parcelas/{parcela_id}")
async def remove_parcela_from_finca(
    finca_id: str,
    parcela_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireFincasAccess)
):
    """Remove a parcela from a finca"""
    if not ObjectId.is_valid(finca_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    finca = await fincas_collection.find_one({"_id": ObjectId(finca_id)})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    # Remove from finca
    parcelas_ids = finca.get("parcelas_ids", [])
    if parcela_id in parcelas_ids:
        parcelas_ids.remove(parcela_id)
        await fincas_collection.update_one(
            {"_id": ObjectId(finca_id)},
            {"$set": {"parcelas_ids": parcelas_ids, "updated_at": datetime.utcnow()}}
        )
    
    # Update parcela
    await parcelas_collection.update_one(
        {"_id": ObjectId(parcela_id)},
        {"$unset": {"finca_id": ""}}
    )
    
    return {
        "success": True,
        "message": "Parcela eliminada de la finca"
    }



# ==================== SIGPAC INTEGRATION ====================

import httpx

# SIGPAC HubCloud API base URL
SIGPAC_API_BASE = "https://sigpac-hubcloud.es/servicioconsultassigpac/query"


@router.get("/sigpac/consulta")
async def consultar_sigpac(
    provincia: str,
    municipio: str,
    poligono: str,
    parcela: str,
    agregado: str = "0",
    zona: str = "0",
    recinto: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Consultar datos de una parcela en SIGPAC usando la API REST de HubCloud.
    
    Parámetros:
    - provincia: Código de provincia (2 dígitos, ej: "41" para Sevilla)
    - municipio: Código de municipio (3 dígitos, ej: "053")
    - poligono: Número de polígono
    - parcela: Número de parcela
    - agregado: Código agregado (por defecto "0")
    - zona: Código zona (por defecto "0")
    - recinto: Número de recinto (opcional, si se omite devuelve info de parcela)
    
    Retorna información de la parcela/recinto incluyendo:
    - Superficie en hectáreas
    - Uso SIGPAC
    - Geometría en formato WKT
    - Coordenadas del centroide
    """
    try:
        # Limpiar códigos (eliminar ceros a la izquierda para algunos, añadir para otros)
        pr = provincia.zfill(2)
        mu = municipio.zfill(3)
        ag = agregado or "0"
        zo = zona or "0"
        po = poligono
        pa = parcela
        
        # Construir URL de consulta
        if recinto:
            # Consulta de recinto específico
            url = f"{SIGPAC_API_BASE}/recinfo/{pr}/{mu}/{ag}/{zo}/{po}/{pa}/{recinto}.json"
        else:
            # Consulta de parcela (primer recinto)
            url = f"{SIGPAC_API_BASE}/recinfo/{pr}/{mu}/{ag}/{zo}/{po}/{pa}/1.json"
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            
            if response.status_code == 404:
                # Intentar sin recinto
                url_parcela = f"{SIGPAC_API_BASE}/parinfo/{pr}/{mu}/{ag}/{zo}/{po}/{pa}.json"
                response = await client.get(url_parcela)
                
                if response.status_code == 404:
                    return {
                        "success": False,
                        "error": "Parcela no encontrada en SIGPAC",
                        "message": "Verifique los códigos introducidos. Formato: Provincia (2 dígitos), Municipio (3 dígitos), Polígono, Parcela"
                    }
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Error al consultar SIGPAC: {response.status_code}",
                    "message": "El servicio SIGPAC no está disponible en este momento"
                }
            
            raw_data = response.json()
            
            # La API puede devolver una lista o un objeto
            if isinstance(raw_data, list):
                if len(raw_data) == 0:
                    return {
                        "success": False,
                        "error": "Parcela no encontrada",
                        "message": "No se encontraron datos para los códigos introducidos"
                    }
                data = raw_data[0]  # Tomar el primer elemento
            else:
                data = raw_data
            
            # Parsear la respuesta
            result = {
                "success": True,
                "sigpac": {
                    "provincia": str(data.get("provincia", pr)),
                    "municipio": str(data.get("municipio", mu)).zfill(3),
                    "cod_agregado": str(data.get("agregado", ag)),
                    "zona": str(data.get("zona", zo)),
                    "poligono": str(data.get("poligono", po)),
                    "parcela": str(data.get("parcela", pa)),
                    "recinto": str(data.get("recinto", "1")),
                    "cod_uso": data.get("uso_sigpac", data.get("uso", "")),
                },
                "superficie_ha": data.get("superficie", data.get("dn_surface", 0)),
                "uso_sigpac": data.get("uso_sigpac", data.get("uso", "")),
                "pendiente": data.get("pendiente_media", data.get("pendiente", None)),
                "coef_regadio": data.get("coef_regadio", None),
                "region": data.get("region", None),
                "altitud": data.get("altitud", None),
            }
            
            # Si hay geometría WKT, extraer centroide para localización
            if "wkt" in data:
                result["geometria_wkt"] = data["wkt"]
                # Intentar extraer centroide del polígono
                try:
                    wkt = data["wkt"]
                    if "POLYGON" in wkt:
                        # Extraer primer punto como aproximación del centroide
                        coords_str = wkt.replace("POLYGON((", "").replace("))", "").split(",")[0]
                        lon, lat = coords_str.strip().split(" ")
                        result["centroide"] = {
                            "lat": float(lat),
                            "lon": float(lon)
                        }
                except:
                    pass
            
            # Información adicional si está disponible
            if "dn_oid" in data:
                result["oid"] = data["dn_oid"]
            if "srid" in data:
                result["srid"] = data["srid"]
                
            return result
            
    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "Timeout",
            "message": "El servicio SIGPAC tardó demasiado en responder. Inténtelo de nuevo."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Error al consultar el servicio SIGPAC"
        }


@router.get("/sigpac/municipios/{provincia}")
async def get_municipios_sigpac(
    provincia: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener lista de municipios de una provincia desde SIGPAC.
    Útil para autocompletado de formularios.
    """
    try:
        pr = provincia.zfill(2)
        url = f"{SIGPAC_API_BASE}/municipios/{pr}.json"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "municipios": [],
                    "message": "No se pudieron obtener los municipios"
                }
            
            data = response.json()
            return {
                "success": True,
                "provincia": pr,
                "municipios": data if isinstance(data, list) else []
            }
            
    except Exception as e:
        return {
            "success": False,
            "municipios": [],
            "error": str(e)
        }


# Diccionario de códigos de provincia
PROVINCIAS_SIGPAC = {
    "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
    "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
    "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
    "13": "Ciudad Real", "14": "Córdoba", "15": "La Coruña", "16": "Cuenca",
    "17": "Gerona", "18": "Granada", "19": "Guadalajara", "20": "Guipúzcoa",
    "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
    "25": "Lérida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
    "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Orense",
    "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
    "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
    "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
    "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
    "48": "Vizcaya", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla"
}


@router.get("/sigpac/provincias")
async def get_provincias_sigpac(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener lista de provincias españolas con sus códigos SIGPAC.
    """
    return {
        "success": True,
        "provincias": [
            {"codigo": k, "nombre": v} 
            for k, v in sorted(PROVINCIAS_SIGPAC.items(), key=lambda x: x[1])
        ]
    }


# Diccionario de usos SIGPAC
USOS_SIGPAC = {
    "AG": "Corrientes y superficies de agua",
    "CA": "Viales",
    "CF": "Cítricos - Frutal",
    "CI": "Cítricos",
    "CS": "Cítricos - Frutal de cáscara",
    "ED": "Edificaciones",
    "EP": "Elemento del paisaje",
    "FF": "Forestal - Frutal",
    "FL": "Flores y plantas ornamentales",
    "FO": "Forestal",
    "FS": "Forestal - Frutal de cáscara",
    "FV": "Frutal - Viñedo",
    "FY": "Frutal",
    "HN": "Huertos de nogales",
    "HR": "Huerta",
    "IM": "Improductivos",
    "IV": "Invernadero",
    "NR": "No indicado",
    "OC": "Olivar - Cítricos",
    "OF": "Olivar - Frutal",
    "OV": "Olivar",
    "PA": "Pasto con arbolado",
    "PR": "Pasto arbustivo",
    "PS": "Pastizal",
    "TA": "Tierra arable",
    "TH": "Huerta que no riega",
    "VF": "Viñedo - Frutal",
    "VI": "Viñedo",
    "VO": "Viñedo - Olivar",
    "ZC": "Zona concentrada no incluida en la ortofoto",
    "ZU": "Zona urbana",
    "ZV": "Zona censurada"
}


@router.get("/sigpac/usos")
async def get_usos_sigpac(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener diccionario de códigos de uso SIGPAC.
    """
    return {
        "success": True,
        "usos": [
            {"codigo": k, "descripcion": v}
            for k, v in sorted(USOS_SIGPAC.items())
        ]
    }
