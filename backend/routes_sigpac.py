"""
Integracion con SIGPAC (Sistema de Informacion Geografica de Parcelas Agricolas)
Consulta de parcelas oficiales del Ministerio de Agricultura de Espana.

Endpoints:
- GET /api/sigpac/consulta - Buscar parcela por referencia SIGPAC
- GET /api/sigpac/recintos - Obtener recintos de una parcela  
- POST /api/sigpac/importar - Importar parcela SIGPAC al sistema
- GET /api/sigpac/wms-config - Obtener URL de WMS para mapa
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import httpx

from database import db, serialize_doc
from routes_auth import get_current_user

router = APIRouter(prefix="/api/sigpac", tags=["sigpac"])

parcelas_collection = db["parcelas"]

SIGPAC_REST_BASE = "https://sigpac-hubcloud.es/servicioconsultassigpac/query"
SIGPAC_WMS_URL = "https://wms.mapa.gob.es/sigpac/wms"
SIGPAC_WMS_LAYER = "AU.Sigpac:recinto"


class SIGPACRef(BaseModel):
    provincia: str = Field(..., description="Codigo provincia (2 digitos)")
    municipio: str = Field(..., description="Codigo municipio (3 digitos)")
    agregado: str = Field("0", description="Agregado (defecto 0)")
    zona: str = Field("0", description="Zona (defecto 0)")
    poligono: str = Field(..., description="Poligono")
    parcela: str = Field(..., description="Parcela")
    recinto: Optional[str] = Field(None, description="Recinto (opcional)")


class SIGPACImport(BaseModel):
    sigpac_ref: SIGPACRef
    nombre: Optional[str] = None
    cultivo: Optional[str] = None
    variedad: Optional[str] = None
    campana: Optional[str] = None
    finca_id: Optional[str] = None
    proveedor: Optional[str] = None


@router.get("/consulta")
async def consulta_sigpac(
    provincia: str = Query(..., description="Codigo provincia (2 digitos)"),
    municipio: str = Query(..., description="Codigo municipio (3 digitos)"),
    agregado: str = Query("0", description="Agregado"),
    zona: str = Query("0", description="Zona"),
    poligono: str = Query(..., description="Poligono"),
    parcela: str = Query(..., description="Parcela"),
    current_user: dict = Depends(get_current_user),
):
    """Consultar parcela SIGPAC por referencia catastral"""
    url = f"{SIGPAC_REST_BASE}/refcatparcela/{provincia}/{municipio}/{agregado}/{zona}/{poligono}/{parcela}.json"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"})
        
        if resp.status_code != 200:
            return {
                "success": False,
                "message": f"SIGPAC devolvio status {resp.status_code}",
                "data": None,
            }
        
        data = resp.json()
        
        # SIGPAC returns an array of objects, each with provincia/municipio/poligono/parcela/referencia_cat
        if isinstance(data, list):
            results = []
            for item in data:
                results.append({
                    "provincia": str(item.get("provincia", provincia)),
                    "municipio": str(item.get("municipio", municipio)),
                    "agregado": str(item.get("agregado", agregado)),
                    "zona": str(item.get("zona", zona)),
                    "poligono": str(item.get("poligono", poligono)),
                    "parcela": str(item.get("parcela", parcela)),
                    "recinto": item.get("recinto"),
                    "referencia_catastral": item.get("referencia_cat", ""),
                    "uso_sigpac": item.get("uso_sigpac", item.get("uso", "")),
                    "superficie_ha": item.get("dn_surface", item.get("superficie", 0)),
                    "coef_regadio": item.get("coef_regadio", 0),
                    "geometry": item.get("geometry"),
                })
            
            if not results:
                return {"success": False, "message": "No se encontraron datos para los codigos introducidos", "data": None}
            
            return {
                "success": True,
                "referencia": f"{provincia}/{municipio}/{agregado}/{zona}/{poligono}/{parcela}",
                "total_recintos": len(results),
                "data": results,
            }
        
        # Fallback for dict response
        features = data.get("features", [data]) if isinstance(data, dict) else [data]
        
        results = []
        for feature in features:
            props = feature.get("properties", feature) if isinstance(feature, dict) else {}
            results.append({
                "provincia": props.get("provincia", provincia),
                "municipio": props.get("municipio", municipio),
                "agregado": props.get("agregado", agregado),
                "zona": props.get("zona", zona),
                "poligono": props.get("poligono", poligono),
                "parcela": props.get("parcela", parcela),
                "recinto": props.get("recinto"),
                "dn_oid": props.get("dn_oid"),
                "dn_pk": props.get("dn_pk"),
                "uso_sigpac": props.get("uso_sigpac", props.get("uso", "")),
                "superficie_ha": props.get("dn_surface", props.get("superficie", 0)),
                "coef_regadio": props.get("coef_regadio", 0),
                "referencia_catastral": f"{provincia}-{municipio}-{agregado}-{zona}-{poligono}-{parcela}",
                "geometry": feature.get("geometry") if isinstance(feature, dict) else None,
            })
        
        return {
            "success": True,
            "referencia": f"{provincia}/{municipio}/{agregado}/{zona}/{poligono}/{parcela}",
            "total_recintos": len(results),
            "data": results,
        }
    except httpx.TimeoutException:
        return {"success": False, "message": "Timeout al consultar SIGPAC. Intentelo de nuevo.", "data": None}
    except Exception as e:
        return {"success": False, "message": f"Error al consultar SIGPAC: {str(e)}", "data": None}


@router.get("/recintos")
async def obtener_recintos_geojson(
    provincia: str = Query(...),
    municipio: str = Query(...),
    agregado: str = Query("0"),
    zona: str = Query("0"),
    poligono: str = Query(...),
    parcela: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Obtener recintos en formato GeoJSON para superponer en mapa"""
    url = f"{SIGPAC_REST_BASE}/refcatparcela/{provincia}/{municipio}/{agregado}/{zona}/{poligono}/{parcela}.geojson"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers={"Accept": "application/geo+json"})
        
        if resp.status_code != 200:
            return {"success": False, "message": f"SIGPAC devolvio status {resp.status_code}"}
        
        geojson = resp.json()
        return {"success": True, "geojson": geojson}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/importar")
async def importar_parcela_sigpac(
    data: SIGPACImport,
    current_user: dict = Depends(get_current_user),
):
    """Importar una parcela desde SIGPAC al sistema FRUVECO"""
    ref = data.sigpac_ref
    ref_str = f"{ref.provincia}-{ref.municipio}-{ref.agregado}-{ref.zona}-{ref.poligono}-{ref.parcela}"
    
    # Check duplicates
    existing = await parcelas_collection.find_one({"sigpac_referencia": ref_str})
    if existing:
        raise HTTPException(status_code=409, detail=f"Ya existe una parcela con referencia SIGPAC: {ref_str}")
    
    # Query SIGPAC for geometry
    url = f"{SIGPAC_REST_BASE}/refcatparcela/{ref.provincia}/{ref.municipio}/{ref.agregado}/{ref.zona}/{ref.poligono}/{ref.parcela}.geojson"
    geometry = None
    superficie = 0
    recintos_sigpac = []
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
        if resp.status_code == 200:
            geojson = resp.json()
            features = geojson.get("features", []) if isinstance(geojson, dict) else []
            for feat in features:
                geom = feat.get("geometry")
                props = feat.get("properties", {})
                sup = props.get("dn_surface", props.get("superficie", 0))
                
                if geom and geom.get("type") == "Polygon":
                    coords = geom.get("coordinates", [[]])
                    # Convert [lng, lat] to [lat, lng] for Leaflet
                    leaflet_coords = []
                    for ring in coords:
                        leaflet_ring = [[c[1], c[0]] for c in ring if len(c) >= 2]
                        leaflet_coords.append(leaflet_ring)
                    
                    recintos_sigpac.append({
                        "tipo": "Polygon",
                        "coordenadas": leaflet_coords[0] if leaflet_coords else [],
                        "nombre": f"Recinto {props.get('recinto', len(recintos_sigpac)+1)}",
                        "superficie": sup,
                        "uso": props.get("uso_sigpac", props.get("uso", "")),
                        "sigpac_recinto": str(props.get("recinto", "")),
                    })
                    superficie += sup
                elif geom and geom.get("type") == "MultiPolygon":
                    for polygon_coords in geom.get("coordinates", []):
                        leaflet_coords = []
                        for ring in polygon_coords:
                            leaflet_ring = [[c[1], c[0]] for c in ring if len(c) >= 2]
                            leaflet_coords.append(leaflet_ring)
                        recintos_sigpac.append({
                            "tipo": "Polygon",
                            "coordenadas": leaflet_coords[0] if leaflet_coords else [],
                            "nombre": f"Recinto {len(recintos_sigpac)+1}",
                            "superficie": sup / max(len(geom.get("coordinates", [])), 1),
                            "uso": props.get("uso_sigpac", props.get("uso", "")),
                        })
                    superficie += sup
                    
            if not geometry and features:
                geometry = features[0].get("geometry")
    except Exception:
        pass  # Continue without geometry if SIGPAC service unavailable
    
    # Generate parcel code
    last = await parcelas_collection.find_one(sort=[("codigo_plantacion", -1)])
    num = 1
    if last and last.get("codigo_plantacion"):
        try:
            num = int(last["codigo_plantacion"].split("-")[-1]) + 1
        except (ValueError, IndexError):
            num = await parcelas_collection.count_documents({}) + 1
    codigo = f"SIGPAC-{str(num).zfill(4)}"
    
    parcela_doc = {
        "codigo_plantacion": codigo,
        "nombre": data.nombre or f"Parcela SIGPAC {ref.poligono}/{ref.parcela}",
        "sigpac_referencia": ref_str,
        "sigpac_provincia": ref.provincia,
        "sigpac_municipio": ref.municipio,
        "sigpac_agregado": ref.agregado,
        "sigpac_zona": ref.zona,
        "sigpac_poligono": ref.poligono,
        "sigpac_parcela": ref.parcela,
        "sigpac_recinto": ref.recinto,
        "cultivo": data.cultivo or "",
        "variedad": data.variedad or "",
        "campana": data.campana or "",
        "finca_id": data.finca_id,
        "proveedor": data.proveedor or "",
        "superficie_total": superficie,
        "recintos": recintos_sigpac,
        "geometry": geometry,
        "activo": True,
        "origen": "SIGPAC",
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("email"),
    }
    
    result = await parcelas_collection.insert_one(parcela_doc)
    
    return {
        "success": True,
        "message": f"Parcela importada desde SIGPAC: {ref_str}",
        "data": {
            "id": str(result.inserted_id),
            "codigo": codigo,
            "sigpac_referencia": ref_str,
            "superficie_ha": superficie,
            "recintos_importados": len(recintos_sigpac),
        }
    }


@router.get("/wms-config")
async def get_wms_config(current_user: dict = Depends(get_current_user)):
    """Obtener configuracion WMS para superponer capa SIGPAC en mapas"""
    return {
        "success": True,
        "wms": {
            "url": SIGPAC_WMS_URL,
            "layers": SIGPAC_WMS_LAYER,
            "format": "image/png",
            "transparent": True,
            "crs": "EPSG:4326",
            "attribution": "SIGPAC - Ministerio de Agricultura, Pesca y Alimentacion",
        }
    }


SIGPAC_OGC_BASE = "https://sigpac-hubcloud.es/ogcapi"


@router.get("/info-punto")
async def get_info_por_coordenadas(
    lat: float = Query(..., description="Latitud (WGS84)"),
    lng: float = Query(..., description="Longitud (WGS84)"),
    current_user: dict = Depends(get_current_user),
):
    """Consultar recinto SIGPAC por coordenadas GPS (click en mapa)"""
    # Create a small bbox around the click point (~50m)
    delta = 0.0005  # approx 50m
    bbox = f"{lng - delta},{lat - delta},{lng + delta},{lat + delta}"
    url = f"{SIGPAC_OGC_BASE}/collections/recintos/items?f=json&bbox={bbox}&limit=5"
    
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"})
        
        if resp.status_code != 200:
            return {"success": False, "message": f"SIGPAC OGC devolvio status {resp.status_code}"}
        
        data = resp.json()
        features = data.get("features", [])
        
        if not features:
            return {"success": True, "encontrado": False, "message": "No se encontro ningun recinto en este punto"}
        
        # Find the closest feature to the click point
        best = features[0]
        results = []
        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            
            # Get uso from a separate call if available
            uso_sigpac = props.get("uso_sigpac", "")
            
            results.append({
                "provincia": props.get("provincia"),
                "municipio": props.get("municipio"),
                "agregado": props.get("agregado", 0),
                "zona": props.get("zona", 0),
                "poligono": props.get("poligono"),
                "parcela": props.get("parcela"),
                "recinto": props.get("recinto"),
                "pendiente_media": props.get("pendiente_media"),
                "altitud": props.get("altitud"),
                "uso_sigpac": uso_sigpac,
                "dn_pk": props.get("dn_pk"),
                "geometry": geom,
            })
        
        # Now get detailed info for the first recinto (uso, superficie, etc.)
        main = results[0]
        pr = str(main["provincia"]).zfill(2)
        mu = str(main["municipio"]).zfill(3)
        ag = str(main.get("agregado", 0))
        zo = str(main.get("zona", 0))
        po = str(main["poligono"])
        pa = str(main["parcela"])
        rec = str(main["recinto"])
        
        detail_url = f"{SIGPAC_REST_BASE}/recinfo/{pr}/{mu}/{ag}/{zo}/{po}/{pa}/{rec}.json"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                detail_resp = await client.get(detail_url)
            if detail_resp.status_code == 200:
                detail_data = detail_resp.json()
                if isinstance(detail_data, list) and detail_data:
                    d = detail_data[0]
                    main["uso_sigpac"] = d.get("uso_sigpac", d.get("uso", ""))
                    main["superficie_ha"] = d.get("dn_surface", d.get("superficie", 0))
                    main["coef_regadio"] = d.get("coef_regadio", 0)
                    main["region"] = d.get("region", "")
                    main["referencia_catastral"] = d.get("referencia_cat", "")
        except Exception:
            pass  # Detail is optional, don't fail
        
        main["referencia"] = f"{pr}/{mu}/{ag}/{zo}/{po}/{pa}/{rec}"
        
        return {
            "success": True,
            "encontrado": True,
            "coordenadas": {"lat": lat, "lng": lng},
            "recinto": main,
            "total_recintos_area": len(results),
        }
    except httpx.TimeoutException:
        return {"success": False, "message": "Timeout al consultar SIGPAC"}
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}


# Diccionario de usos SIGPAC
USOS_SIGPAC = {
    "AG": "Corrientes y superficies de agua", "CA": "Viales",
    "CF": "Citricos - Frutal", "CI": "Citricos", "CS": "Citricos - Frutal de cascara",
    "ED": "Edificaciones", "EP": "Elemento del paisaje",
    "FF": "Forestal - Frutal", "FL": "Flores y plantas ornamentales",
    "FO": "Forestal", "FS": "Forestal - Frutal de cascara",
    "FV": "Frutal - Vinedo", "FY": "Frutal", "HN": "Huertos de nogales",
    "HR": "Huerta", "IM": "Improductivos", "IV": "Invernadero", "NR": "No indicado",
    "OC": "Olivar - Citricos", "OF": "Olivar - Frutal", "OV": "Olivar",
    "PA": "Pasto con arbolado", "PR": "Pasto arbustivo", "PS": "Pastizal",
    "TA": "Tierra arable", "TH": "Huerta que no riega",
    "VF": "Vinedo - Frutal", "VI": "Vinedo", "VO": "Vinedo - Olivar",
    "ZC": "Zona concentrada", "ZU": "Zona urbana", "ZV": "Zona censurada"
}


@router.get("/provincias")
async def get_provincias(current_user: dict = Depends(get_current_user)):
    """Lista de provincias espanolas con codigos SIGPAC"""
    provincias = {
        "01": "Alava", "02": "Albacete", "03": "Alicante", "04": "Almeria",
        "05": "Avila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
        "09": "Burgos", "10": "Caceres", "11": "Cadiz", "12": "Castellon",
        "13": "Ciudad Real", "14": "Cordoba", "15": "La Coruna", "16": "Cuenca",
        "17": "Gerona", "18": "Granada", "19": "Guadalajara", "20": "Guipuzcoa",
        "21": "Huelva", "22": "Huesca", "23": "Jaen", "24": "Leon",
        "25": "Lerida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
        "29": "Malaga", "30": "Murcia", "31": "Navarra", "32": "Orense",
        "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
        "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
        "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
        "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
        "48": "Vizcaya", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
    }
    return {
        "success": True,
        "provincias": [{"codigo": k, "nombre": v} for k, v in sorted(provincias.items(), key=lambda x: x[1])]
    }


@router.get("/municipios/{provincia}")
async def get_municipios(provincia: str, current_user: dict = Depends(get_current_user)):
    """Obtener municipios de una provincia desde SIGPAC"""
    try:
        pr = provincia.zfill(2)
        url = f"{SIGPAC_REST_BASE}/municipios/{pr}.json"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return {"success": False, "municipios": []}
            data = response.json()
            return {"success": True, "provincia": pr, "municipios": data if isinstance(data, list) else []}
    except Exception as e:
        return {"success": False, "municipios": [], "error": str(e)}


@router.get("/usos")
async def get_usos(current_user: dict = Depends(get_current_user)):
    """Diccionario de codigos de uso SIGPAC"""
    return {
        "success": True,
        "usos": [{"codigo": k, "descripcion": v} for k, v in sorted(USOS_SIGPAC.items())]
    }
