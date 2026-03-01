"""
Routes for importing geographic data (KML/GeoJSON) into parcelas
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Optional
import json
import re
from datetime import datetime
from bson import ObjectId

# Import auth dependency
import sys
sys.path.append('/app/backend')
from routes_auth import get_current_user
from database import parcelas_collection

router = APIRouter(prefix="/api", tags=["Geo Import"])


def parse_kml_coordinates(coord_string: str) -> List[dict]:
    """Parse KML coordinate string into list of {lat, lng} dicts"""
    coordinates = []
    # KML format: lng,lat,alt lng,lat,alt ...
    parts = coord_string.strip().split()
    for part in parts:
        try:
            coords = part.split(',')
            if len(coords) >= 2:
                lng = float(coords[0])
                lat = float(coords[1])
                coordinates.append({"lat": lat, "lng": lng})
        except (ValueError, IndexError):
            continue
    return coordinates


def parse_kml_content(content: str) -> List[dict]:
    """Parse KML file content and extract polygons"""
    polygons = []
    
    try:
        from lxml import etree
        
        # Parse XML
        root = etree.fromstring(content.encode('utf-8'))
        
        # Define namespaces
        namespaces = {
            'kml': 'http://www.opengis.net/kml/2.2',
            'gx': 'http://www.google.com/kml/ext/2.2'
        }
        
        # Find all Placemarks
        placemarks = root.findall('.//kml:Placemark', namespaces)
        if not placemarks:
            # Try without namespace (some KML files don't use namespace)
            placemarks = root.findall('.//Placemark')
        
        for placemark in placemarks:
            try:
                # Get name
                name_elem = placemark.find('kml:name', namespaces)
                if name_elem is None:
                    name_elem = placemark.find('name')
                name = name_elem.text if name_elem is not None and name_elem.text else "Parcela Importada"
                
                # Get description
                desc_elem = placemark.find('kml:description', namespaces)
                if desc_elem is None:
                    desc_elem = placemark.find('description')
                description = desc_elem.text if desc_elem is not None and desc_elem.text else ""
                
                # Find polygon coordinates
                coord_elem = placemark.find('.//kml:coordinates', namespaces)
                if coord_elem is None:
                    coord_elem = placemark.find('.//coordinates')
                
                if coord_elem is not None and coord_elem.text:
                    coords = parse_kml_coordinates(coord_elem.text)
                    if len(coords) >= 3:  # Need at least 3 points for polygon
                        # Calculate area
                        area = calculate_polygon_area(coords)
                        
                        # Calculate center
                        center_lat = sum(c['lat'] for c in coords) / len(coords)
                        center_lng = sum(c['lng'] for c in coords) / len(coords)
                        
                        polygons.append({
                            "name": name.strip(),
                            "description": description.strip() if description else "",
                            "coordinates": coords,
                            "area_ha": round(area, 4),
                            "center": {"lat": center_lat, "lng": center_lng}
                        })
            except Exception as e:
                print(f"Error parsing placemark: {e}")
                continue
                
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing KML: {str(e)}")
    
    return polygons


def parse_geojson_content(content: str) -> List[dict]:
    """Parse GeoJSON file content and extract polygons"""
    polygons = []
    
    try:
        data = json.loads(content)
        
        features = []
        if data.get('type') == 'FeatureCollection':
            features = data.get('features', [])
        elif data.get('type') == 'Feature':
            features = [data]
        elif data.get('type') in ['Polygon', 'MultiPolygon']:
            features = [{'type': 'Feature', 'geometry': data, 'properties': {}}]
        
        for feature in features:
            try:
                geometry = feature.get('geometry', {})
                properties = feature.get('properties', {})
                
                # Get name from properties
                name = (
                    properties.get('name') or 
                    properties.get('Name') or 
                    properties.get('nombre') or
                    properties.get('NOMBRE') or
                    properties.get('codigo') or
                    properties.get('id') or
                    "Parcela Importada"
                )
                
                # Get description
                description = (
                    properties.get('description') or 
                    properties.get('descripcion') or
                    ""
                )
                
                coords_list = []
                
                if geometry.get('type') == 'Polygon':
                    # GeoJSON Polygon: [[[lng, lat], [lng, lat], ...]]
                    rings = geometry.get('coordinates', [])
                    if rings:
                        # Use outer ring (first ring)
                        coords_list = [rings[0]]
                        
                elif geometry.get('type') == 'MultiPolygon':
                    # GeoJSON MultiPolygon: [[[[lng, lat], ...]]]
                    multi_coords = geometry.get('coordinates', [])
                    for polygon_rings in multi_coords:
                        if polygon_rings:
                            coords_list.append(polygon_rings[0])
                
                for ring in coords_list:
                    coords = []
                    for point in ring:
                        if len(point) >= 2:
                            coords.append({
                                "lat": float(point[1]),
                                "lng": float(point[0])
                            })
                    
                    if len(coords) >= 3:
                        area = calculate_polygon_area(coords)
                        center_lat = sum(c['lat'] for c in coords) / len(coords)
                        center_lng = sum(c['lng'] for c in coords) / len(coords)
                        
                        polygons.append({
                            "name": str(name).strip(),
                            "description": str(description).strip() if description else "",
                            "coordinates": coords,
                            "area_ha": round(area, 4),
                            "center": {"lat": center_lat, "lng": center_lng},
                            "properties": properties  # Include all original properties
                        })
                        
            except Exception as e:
                print(f"Error parsing feature: {e}")
                continue
                
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid GeoJSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing GeoJSON: {str(e)}")
    
    return polygons


def calculate_polygon_area(coordinates: List[dict]) -> float:
    """Calculate polygon area in hectares using shoelace formula"""
    if not coordinates or len(coordinates) < 3:
        return 0
    
    import math
    
    earth_radius = 6371000  # meters
    area = 0
    
    n = len(coordinates)
    for i in range(n):
        j = (i + 1) % n
        lat1 = coordinates[i]['lat'] * math.pi / 180
        lat2 = coordinates[j]['lat'] * math.pi / 180
        lng1 = coordinates[i]['lng'] * math.pi / 180
        lng2 = coordinates[j]['lng'] * math.pi / 180
        
        area += (lng2 - lng1) * (2 + math.sin(lat1) + math.sin(lat2))
    
    area = abs(area * earth_radius * earth_radius / 2)
    return area / 10000  # Convert m² to hectares


@router.post("/geo-import/parse")
async def parse_geo_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Parse a KML or GeoJSON file and return extracted polygons for preview
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    filename = file.filename.lower()
    content = await file.read()
    content_str = content.decode('utf-8')
    
    polygons = []
    
    if filename.endswith('.kml'):
        polygons = parse_kml_content(content_str)
    elif filename.endswith('.geojson') or filename.endswith('.json'):
        polygons = parse_geojson_content(content_str)
    else:
        raise HTTPException(
            status_code=400, 
            detail="Formato no soportado. Use archivos .kml, .geojson o .json"
        )
    
    if not polygons:
        raise HTTPException(
            status_code=400, 
            detail="No se encontraron polígonos válidos en el archivo"
        )
    
    return {
        "success": True,
        "filename": file.filename,
        "format": "KML" if filename.endswith('.kml') else "GeoJSON",
        "polygons_count": len(polygons),
        "polygons": polygons,
        "total_area_ha": round(sum(p['area_ha'] for p in polygons), 2)
    }


@router.post("/geo-import/create-parcelas")
async def create_parcelas_from_import(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create new parcelas from imported polygon data
    """
    polygons = data.get('polygons', [])
    default_cultivo = data.get('default_cultivo', '')
    default_campana = data.get('default_campana', '2025/26')
    
    if not polygons:
        raise HTTPException(status_code=400, detail="No polygons provided")
    
    created_parcelas = []
    errors = []
    
    for idx, polygon in enumerate(polygons):
        try:
            # Generate codigo_plantacion
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            codigo = polygon.get('name', f'IMP-{timestamp}-{idx+1}')
            
            # Clean up codigo (remove special chars)
            codigo = re.sub(r'[^\w\-]', '_', codigo)[:50]
            
            # Check if codigo already exists
            existing = await parcelas_collection.find_one({"codigo_plantacion": codigo})
            if existing:
                codigo = f"{codigo}_{idx+1}"
            
            # Create parcela document
            parcela_doc = {
                "codigo_plantacion": codigo,
                "cultivo": polygon.get('cultivo') or default_cultivo or "",
                "variedad": polygon.get('variedad', ''),
                "superficie_total": polygon.get('area_ha', 0),
                "campana": default_campana,
                "latitud": polygon.get('center', {}).get('lat'),
                "longitud": polygon.get('center', {}).get('lng'),
                "recintos": [{
                    "geometria": polygon.get('coordinates', []),
                    "superficie_recinto": polygon.get('area_ha', 0)
                }],
                "observaciones": polygon.get('description', ''),
                "estado": "activa",
                "fecha_creacion": datetime.now().isoformat(),
                "importado_de": "geo_import",
                "propiedades_importadas": polygon.get('properties', {})
            }
            
            result = await parcelas_collection.insert_one(parcela_doc)
            
            created_parcelas.append({
                "_id": str(result.inserted_id),
                "codigo_plantacion": codigo,
                "superficie_total": polygon.get('area_ha', 0)
            })
            
        except Exception as e:
            errors.append({
                "index": idx,
                "name": polygon.get('name', f'Polygon {idx+1}'),
                "error": str(e)
            })
    
    return {
        "success": True,
        "created_count": len(created_parcelas),
        "created_parcelas": created_parcelas,
        "errors_count": len(errors),
        "errors": errors
    }


@router.post("/parcelas/{parcela_id}/import-polygon")
async def import_polygon_to_existing_parcela(
    parcela_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Import a polygon to an existing parcela
    """
    if not ObjectId.is_valid(parcela_id):
        raise HTTPException(status_code=400, detail="ID de parcela inválido")
    
    parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    
    coordinates = data.get('coordinates', [])
    if not coordinates or len(coordinates) < 3:
        raise HTTPException(status_code=400, detail="Coordenadas inválidas")
    
    # Calculate area and center
    area = calculate_polygon_area(coordinates)
    center_lat = sum(c['lat'] for c in coordinates) / len(coordinates)
    center_lng = sum(c['lng'] for c in coordinates) / len(coordinates)
    
    # Update parcela
    update_data = {
        "latitud": center_lat,
        "longitud": center_lng,
        "recintos": [{
            "geometria": coordinates,
            "superficie_recinto": round(area, 4)
        }]
    }
    
    await parcelas_collection.update_one(
        {"_id": ObjectId(parcela_id)},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "parcela_id": parcela_id,
        "area_ha": round(area, 4),
        "center": {"lat": center_lat, "lng": center_lng}
    }
