from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
import pandas as pd
import io
import httpx
from bs4 import BeautifulSoup

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/fitosanitarios", tags=["fitosanitarios"])

# Collection
fitosanitarios_collection = db['fitosanitarios']

# Models
class ProductoFitosanitarioBase(BaseModel):
    numero_registro: str
    nombre_comercial: str
    denominacion_comun: Optional[str] = None
    empresa: Optional[str] = None
    tipo: str  # Herbicida, Insecticida, Fungicida, Acaricida, Molusquicida, Fertilizante
    materia_activa: Optional[str] = None
    dosis_min: Optional[float] = None
    dosis_max: Optional[float] = None
    unidad_dosis: str = "L/ha"  # L/ha, kg/ha, ml/ha, g/ha
    volumen_agua_min: Optional[float] = 200
    volumen_agua_max: Optional[float] = 600
    plagas_objetivo: Optional[List[str]] = []
    plazo_seguridad: Optional[int] = None  # días
    observaciones: Optional[str] = None
    activo: bool = True

class ProductoFitosanitarioCreate(ProductoFitosanitarioBase):
    pass

class ProductoFitosanitarioUpdate(BaseModel):
    numero_registro: Optional[str] = None
    nombre_comercial: Optional[str] = None
    denominacion_comun: Optional[str] = None
    empresa: Optional[str] = None
    tipo: Optional[str] = None
    materia_activa: Optional[str] = None
    dosis_min: Optional[float] = None
    dosis_max: Optional[float] = None
    unidad_dosis: Optional[str] = None
    volumen_agua_min: Optional[float] = None
    volumen_agua_max: Optional[float] = None
    plagas_objetivo: Optional[List[str]] = None
    plazo_seguridad: Optional[int] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None


# Helper function
def serialize_producto(producto: dict) -> dict:
    if producto:
        producto["_id"] = str(producto["_id"])
    return producto


# GET all products
@router.get("")
async def get_productos(
    tipo: Optional[str] = None,
    activo: Optional[bool] = True,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    
    query = {}
    if tipo:
        query["tipo"] = tipo
    if activo is not None:
        query["activo"] = activo
    if search:
        query["$or"] = [
            {"nombre_comercial": {"$regex": search, "$options": "i"}},
            {"denominacion_comun": {"$regex": search, "$options": "i"}},
            {"materia_activa": {"$regex": search, "$options": "i"}},
            {"numero_registro": {"$regex": search, "$options": "i"}}
        ]
    
    productos = await fitosanitarios_collection.find(query).sort("nombre_comercial", 1).to_list(length=1000)
    
    return {
        "success": True,
        "productos": [serialize_producto(p) for p in productos],
        "total": len(productos)
    }


# GET template for import (MUST be before /{producto_id})
@router.get("/template")
async def get_import_template(
    current_user: dict = Depends(get_current_user)
):
    """Returns a base64 encoded Excel template for importing products"""
    
    template_data = {
        "numero_registro": ["ES-00001", "ES-00002"],
        "nombre_comercial": ["PRODUCTO EJEMPLO 1", "PRODUCTO EJEMPLO 2"],
        "denominacion_comun": ["Nombre alternativo 1", "Nombre alternativo 2"],
        "empresa": ["Empresa S.A.", "Otra Empresa S.L."],
        "tipo": ["Herbicida", "Insecticida"],
        "materia_activa": ["Glifosato 36%", "Cipermetrina 10%"],
        "dosis_min": [1.0, 0.1],
        "dosis_max": [3.0, 0.2],
        "unidad_dosis": ["L/ha", "L/ha"],
        "volumen_agua_min": [200, 200],
        "volumen_agua_max": [400, 500],
        "plagas_objetivo": ["Malas hierbas", "Pulgón, Trips"],
        "plazo_seguridad": [21, 7],
        "observaciones": ["", "Usar en horas frescas"]
    }
    
    df = pd.DataFrame(template_data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Plantilla')
    output.seek(0)
    
    import base64
    excel_base64 = base64.b64encode(output.read()).decode('utf-8')
    
    return {
        "success": True,
        "filename": "plantilla_fitosanitarios.xlsx",
        "data": excel_base64
    }


# EXPORT products to Excel (MUST be before /{producto_id})
@router.get("/export")
async def export_productos(
    tipo: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"activo": True}
    if tipo:
        query["tipo"] = tipo
    
    productos = await fitosanitarios_collection.find(query).sort("nombre_comercial", 1).to_list(length=5000)
    
    # Convert to DataFrame
    data = []
    for p in productos:
        data.append({
            "Nº Registro": p.get("numero_registro", ""),
            "Nombre Comercial": p.get("nombre_comercial", ""),
            "Denominación": p.get("denominacion_comun", ""),
            "Empresa": p.get("empresa", ""),
            "Tipo": p.get("tipo", ""),
            "Materia Activa": p.get("materia_activa", ""),
            "Dosis Mín": p.get("dosis_min", ""),
            "Dosis Máx": p.get("dosis_max", ""),
            "Unidad Dosis": p.get("unidad_dosis", ""),
            "Vol. Agua Mín": p.get("volumen_agua_min", ""),
            "Vol. Agua Máx": p.get("volumen_agua_max", ""),
            "Plagas Objetivo": ", ".join(p.get("plagas_objetivo", [])),
            "Plazo Seguridad": p.get("plazo_seguridad", ""),
            "Observaciones": p.get("observaciones", "")
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Productos')
    output.seek(0)
    
    # Return as base64
    import base64
    excel_base64 = base64.b64encode(output.read()).decode('utf-8')
    
    return {
        "success": True,
        "filename": f"fitosanitarios_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
        "data": excel_base64,
        "total": len(productos)
    }


# GET single product
@router.get("/{producto_id}")
async def get_producto(
    producto_id: str,
    current_user: dict = Depends(get_current_user)
):
    
    try:
        producto = await fitosanitarios_collection.find_one({"_id": ObjectId(producto_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de producto inválido")
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"success": True, "producto": serialize_producto(producto)}


# CREATE product
@router.post("")
async def create_producto(
    producto: ProductoFitosanitarioCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear productos")
    
    
    producto_dict = producto.model_dump()
    producto_dict["created_at"] = datetime.utcnow()
    producto_dict["created_by"] = current_user.get("email")
    
    result = await fitosanitarios_collection.insert_one(producto_dict)
    
    return {
        "success": True,
        "message": "Producto creado correctamente",
        "id": str(result.inserted_id)
    }


# UPDATE product
@router.put("/{producto_id}")
async def update_producto(
    producto_id: str,
    producto: ProductoFitosanitarioUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar productos")
    
    
    try:
        existing = await fitosanitarios_collection.find_one({"_id": ObjectId(producto_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de producto inválido")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    update_data = {k: v for k, v in producto.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_user.get("email")
    
    await fitosanitarios_collection.update_one(
        {"_id": ObjectId(producto_id)},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Producto actualizado correctamente"}


# DELETE product
@router.delete("/{producto_id}")
async def delete_producto(
    producto_id: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede eliminar productos")
    
    
    try:
        result = await fitosanitarios_collection.delete_one({"_id": ObjectId(producto_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de producto inválido")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"success": True, "message": "Producto eliminado correctamente"}


# SEED initial products from PDF data
@router.post("/seed")
async def seed_productos(
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede cargar datos iniciales")
    
    
    # Check if already seeded
    count = await fitosanitarios_collection.count_documents({})
    if count > 0:
        return {"success": False, "message": f"Ya existen {count} productos en la base de datos"}
    
    # Products from PDF with added dose information (typical ranges)
    productos_iniciales = [
        # HERBICIDAS
        {"numero_registro": "22720", "nombre_comercial": "MCPA DMA 500 SL", "denominacion_comun": "MCPA 50 SL", "empresa": "DU PONT IBERICA, S.L.", "tipo": "Herbicida", "materia_activa": "MCPA 50%", "dosis_min": 1.0, "dosis_max": 2.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Malas hierbas de hoja ancha"], "plazo_seguridad": 21},
        {"numero_registro": "25854", "nombre_comercial": "HAKSAR 500 SL", "denominacion_comun": "HERMENON 500", "empresa": "SIPCAM IBERIA, S.L.", "tipo": "Herbicida", "materia_activa": "MCPA 50%", "dosis_min": 1.0, "dosis_max": 2.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Malas hierbas anuales"], "plazo_seguridad": 21},
        {"numero_registro": "25821", "nombre_comercial": "CREW", "denominacion_comun": "ESQUIRE", "empresa": "CHEMINOVA AGRO, S.A.", "tipo": "Herbicida", "materia_activa": "Fluroxipir + Clopyralid", "dosis_min": 0.75, "dosis_max": 1.5, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Dicotiledóneas"], "plazo_seguridad": 30},
        {"numero_registro": "ES-00646", "nombre_comercial": "PULSAR PLUS", "denominacion_comun": "LISTEGO PLUS", "empresa": "SYNGENTA ESPAÑA, S.A.", "tipo": "Herbicida", "materia_activa": "Imazamox", "dosis_min": 0.8, "dosis_max": 1.2, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Gramíneas y dicotiledóneas"], "plazo_seguridad": 60},
        {"numero_registro": "24809", "nombre_comercial": "RALON SUPER", "denominacion_comun": "CHEETAH GOLD", "empresa": "KENOGARD, S.A.", "tipo": "Herbicida", "materia_activa": "Fenoxaprop-P-etil", "dosis_min": 0.8, "dosis_max": 1.5, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 300, "plagas_objetivo": ["Gramíneas anuales"], "plazo_seguridad": 45},
        {"numero_registro": "ES-00280", "nombre_comercial": "OSSETIA", "denominacion_comun": "ATALANTE", "empresa": "GOWAN ESPAÑOLA FITOSANITARIOS, S.L", "tipo": "Herbicida", "materia_activa": "Tribenuron-metil", "dosis_min": 0.015, "dosis_max": 0.030, "unidad_dosis": "kg/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Dicotiledóneas anuales"], "plazo_seguridad": 14},
        {"numero_registro": "19549", "nombre_comercial": "ACCRESTO", "denominacion_comun": "INFINITY", "empresa": "COMERCIAL QUÍMICA MASSÓ S.A.", "tipo": "Herbicida", "materia_activa": "Prosulfocarb", "dosis_min": 4.0, "dosis_max": 5.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Gramíneas y dicotiledóneas"], "plazo_seguridad": 90},
        {"numero_registro": "ES-00842", "nombre_comercial": "MIGHTY", "denominacion_comun": "MESOGARD", "empresa": "KENOGARD, S.A.", "tipo": "Herbicida", "materia_activa": "Mesotriona", "dosis_min": 0.75, "dosis_max": 1.5, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Malas hierbas en maíz"], "plazo_seguridad": 45},
        {"numero_registro": "17845", "nombre_comercial": "KERB FLO", "denominacion_comun": "SKADI", "empresa": "CERTIS BELCHIM B.V.", "tipo": "Herbicida", "materia_activa": "Propizamida", "dosis_min": 2.5, "dosis_max": 4.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 600, "plagas_objetivo": ["Gramíneas"], "plazo_seguridad": 60},
        {"numero_registro": "ES-00890", "nombre_comercial": "BELOUKHA GARDEN", "denominacion_comun": "HERBAFIN", "empresa": "PRODUCTOS FLOWER, S.A.", "tipo": "Herbicida", "materia_activa": "Ácido pelargónico", "dosis_min": 8.0, "dosis_max": 16.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 400, "plagas_objetivo": ["Malas hierbas anuales"], "plazo_seguridad": 1},
        
        # FUNGICIDAS
        {"numero_registro": "21603", "nombre_comercial": "STROBY WG", "denominacion_comun": "TACTIC", "empresa": "COMERCIAL QUÍMICA MASSÓ S.A.", "tipo": "Fungicida", "materia_activa": "Kresoxim-metil 50%", "dosis_min": 0.15, "dosis_max": 0.20, "unidad_dosis": "kg/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Oídio", "Moteado"], "plazo_seguridad": 35},
        {"numero_registro": "13964", "nombre_comercial": "CALDO BORDELES VALLES BLU", "denominacion_comun": "CALDO BORDELES KEY WP", "empresa": "INDUSTRIAL QUÍMICA KEY S.A.", "tipo": "Fungicida", "materia_activa": "Sulfato cuprocálcico 20%", "dosis_min": 3.0, "dosis_max": 6.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Mildiu", "Bacteriosis"], "plazo_seguridad": 15},
        {"numero_registro": "24397", "nombre_comercial": "FOLPAN GOLD", "denominacion_comun": "RIDOMIL GOLD COMBI PEPITE", "empresa": "SYNGENTA ESPAÑA, S.A.", "tipo": "Fungicida", "materia_activa": "Folpet + Metalaxil-M", "dosis_min": 2.0, "dosis_max": 2.5, "unidad_dosis": "kg/ha", "volumen_agua_min": 400, "volumen_agua_max": 800, "plagas_objetivo": ["Mildiu"], "plazo_seguridad": 28},
        {"numero_registro": "25934", "nombre_comercial": "AZOXYSTAR", "denominacion_comun": "MIRADOR S", "empresa": "ADAMA AGRICULTURE ESPAÑA S.A.", "tipo": "Fungicida", "materia_activa": "Azoxistrobin 25%", "dosis_min": 0.75, "dosis_max": 1.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 500, "plagas_objetivo": ["Roya", "Septoria", "Oídio"], "plazo_seguridad": 35},
        {"numero_registro": "25889", "nombre_comercial": "TRIANUM P", "denominacion_comun": "CONIN", "empresa": "KOPPERT B.V.", "tipo": "Fungicida", "materia_activa": "Trichoderma harzianum", "dosis_min": 1.5, "dosis_max": 3.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 200, "volumen_agua_max": 500, "plagas_objetivo": ["Fusarium", "Pythium", "Rhizoctonia"], "plazo_seguridad": 0},
        {"numero_registro": "23557", "nombre_comercial": "FAECU-38", "denominacion_comun": "FOLICOBRE", "empresa": "FAESAL", "tipo": "Fungicida", "materia_activa": "Oxicloruro de cobre 38%", "dosis_min": 2.0, "dosis_max": 4.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Mildiu", "Alternaria", "Antracnosis"], "plazo_seguridad": 15},
        {"numero_registro": "ES-00765", "nombre_comercial": "DEXTOP", "denominacion_comun": "MASSO PROTECT", "empresa": "COMERCIAL QUÍMICA MASSÓ S.A.", "tipo": "Fungicida", "materia_activa": "Bacillus subtilis", "dosis_min": 2.0, "dosis_max": 4.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 1000, "plagas_objetivo": ["Botrytis", "Oídio"], "plazo_seguridad": 0},
        {"numero_registro": "19064", "nombre_comercial": "BORDO MICRO", "denominacion_comun": "CALDO BORDELÉS MASSÓ", "empresa": "COMERCIAL QUÍMICA MASSÓ S.A.", "tipo": "Fungicida", "materia_activa": "Sulfato de cobre 20%", "dosis_min": 4.0, "dosis_max": 6.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Mildiu", "Bacteriosis"], "plazo_seguridad": 15},
        {"numero_registro": "25450", "nombre_comercial": "RANMAN TOP", "denominacion_comun": "AZULEO", "empresa": "ISK BIOSCIENCES EUROPE, N.V.", "tipo": "Fungicida", "materia_activa": "Ciazofamida", "dosis_min": 0.4, "dosis_max": 0.5, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 600, "plagas_objetivo": ["Mildiu"], "plazo_seguridad": 7},
        {"numero_registro": "21673", "nombre_comercial": "CODACIDE", "denominacion_comun": "VOYAGER", "empresa": "COMERCIAL QUÍMICA MASSÓ S.A.", "tipo": "Fungicida", "materia_activa": "Aceite de colza 842 g/L", "dosis_min": 1.0, "dosis_max": 3.0, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 500, "plagas_objetivo": ["Oídio", "Trips"], "plazo_seguridad": 0},
        
        # INSECTICIDAS
        {"numero_registro": "22912", "nombre_comercial": "SULTRIN 40-0,5", "denominacion_comun": "CIPERZUFRE", "empresa": "PRODUCTOS AJF, S.L.", "tipo": "Insecticida", "materia_activa": "Azufre + Cipermetrin", "dosis_min": 2.0, "dosis_max": 4.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Araña roja", "Oídio"], "plazo_seguridad": 21},
        {"numero_registro": "23912", "nombre_comercial": "ANIBAL", "denominacion_comun": "CARENS", "empresa": "SYNGENTA ESPAÑA, S.A.", "tipo": "Insecticida", "materia_activa": "Clorpirifos 48%", "dosis_min": 1.5, "dosis_max": 3.0, "unidad_dosis": "L/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Gusanos del suelo", "Rosquilla"], "plazo_seguridad": 21},
        {"numero_registro": "ES-00069", "nombre_comercial": "KOMODO 10 EC", "denominacion_comun": "LAMBDA CY NATURAGRI", "empresa": "NATURAGRI SOLUCIONES, S.L.U.", "tipo": "Insecticida", "materia_activa": "Lambda-cihalotrin 10%", "dosis_min": 0.1, "dosis_max": 0.2, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 500, "plagas_objetivo": ["Pulgones", "Trips", "Orugas"], "plazo_seguridad": 7},
        {"numero_registro": "23808", "nombre_comercial": "SPINTOR CEBO", "denominacion_comun": "SPINTOR CEBO OLIVO", "empresa": "CORTEVA AGRISCIENCE", "tipo": "Insecticida", "materia_activa": "Spinosad 0.024%", "dosis_min": 1.0, "dosis_max": 1.5, "unidad_dosis": "L/ha", "volumen_agua_min": 1, "volumen_agua_max": 4, "plagas_objetivo": ["Mosca del olivo", "Ceratitis"], "plazo_seguridad": 7},
        {"numero_registro": "ES-00225", "nombre_comercial": "PIRECRIS", "denominacion_comun": "KENOPYR", "empresa": "KENOGARD, S.A.", "tipo": "Insecticida", "materia_activa": "Piretrinas 4%", "dosis_min": 0.5, "dosis_max": 1.5, "unidad_dosis": "L/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Pulgones", "Mosca blanca", "Trips"], "plazo_seguridad": 0},
        {"numero_registro": "23276", "nombre_comercial": "BOTANIGARD 22 WP", "denominacion_comun": "MYCOTROL", "empresa": "CERTIS BELCHIM B.V.", "tipo": "Insecticida", "materia_activa": "Beauveria bassiana", "dosis_min": 0.5, "dosis_max": 1.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 200, "volumen_agua_max": 1000, "plagas_objetivo": ["Mosca blanca", "Trips", "Pulgones"], "plazo_seguridad": 0},
        {"numero_registro": "ES-00244", "nombre_comercial": "PIRETRO NATURA", "denominacion_comun": "TEMOCROP", "empresa": "IDAI NATURE, S.L.", "tipo": "Insecticida", "materia_activa": "Piretrinas naturales", "dosis_min": 0.6, "dosis_max": 1.2, "unidad_dosis": "L/ha", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Pulgón", "Mosca blanca"], "plazo_seguridad": 0},
        {"numero_registro": "25882", "nombre_comercial": "LAMBDASTAR", "denominacion_comun": "SENDO", "empresa": "ADAMA AGRICULTURE ESPAÑA S.A.", "tipo": "Insecticida", "materia_activa": "Lambda-cihalotrin 10%", "dosis_min": 0.075, "dosis_max": 0.15, "unidad_dosis": "L/ha", "volumen_agua_min": 200, "volumen_agua_max": 500, "plagas_objetivo": ["Orugas", "Pulgones", "Escarabajos"], "plazo_seguridad": 7},
        
        # ACARICIDAS
        {"numero_registro": "ES-00603", "nombre_comercial": "ACARIDOIL 13 SL", "denominacion_comun": "RELEVANT-OIL SJ", "empresa": "SIPCAM JARDIN, S.L.", "tipo": "Acaricida", "materia_activa": "Aceite de parafina 83%", "dosis_min": 1.0, "dosis_max": 2.0, "unidad_dosis": "%", "volumen_agua_min": 500, "volumen_agua_max": 1000, "plagas_objetivo": ["Araña roja", "Cochinillas"], "plazo_seguridad": 0},
        
        # MOLUSQUICIDAS
        {"numero_registro": "ES-01168", "nombre_comercial": "FERRIMAX", "denominacion_comun": "ANTICARACOLES", "empresa": "SEMILLAS BATLLE, S.A.", "tipo": "Molusquicida", "materia_activa": "Fosfato férrico 3%", "dosis_min": 25.0, "dosis_max": 50.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 0, "volumen_agua_max": 0, "plagas_objetivo": ["Caracoles", "Babosas"], "plazo_seguridad": 0},
        {"numero_registro": "22870", "nombre_comercial": "MULLO", "denominacion_comun": "MATACARACOLES LAINCO DT", "empresa": "LAINCO, S.A.", "tipo": "Molusquicida", "materia_activa": "Metaldehído 5%", "dosis_min": 4.0, "dosis_max": 7.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 0, "volumen_agua_max": 0, "plagas_objetivo": ["Caracoles", "Babosas"], "plazo_seguridad": 14},
        {"numero_registro": "12470", "nombre_comercial": "METALIXON", "denominacion_comun": "BELPRON LIMACOS", "empresa": "PROBELTE, S.A.U.", "tipo": "Molusquicida", "materia_activa": "Metaldehído 5%", "dosis_min": 5.0, "dosis_max": 8.0, "unidad_dosis": "kg/ha", "volumen_agua_min": 0, "volumen_agua_max": 0, "plagas_objetivo": ["Caracoles", "Babosas"], "plazo_seguridad": 14},
    ]
    
    # Add common fields
    for p in productos_iniciales:
        p["activo"] = True
        p["created_at"] = datetime.utcnow()
        p["created_by"] = "system"
    
    result = await fitosanitarios_collection.insert_many(productos_iniciales)
    
    return {
        "success": True,
        "message": f"Se han cargado {len(result.inserted_ids)} productos fitosanitarios",
        "count": len(result.inserted_ids)
    }


# GET products by type (for calculator dropdown)
@router.get("/tipo/{tipo}")
async def get_productos_by_tipo(
    tipo: str,
    current_user: dict = Depends(get_current_user)
):
    
    # Map calculator types to database types
    tipo_map = {
        "insecticida": "Insecticida",
        "herbicida": "Herbicida",
        "fungicida": "Fungicida",
        "fertilizante": "Fertilizante",
        "acaricida": "Acaricida",
        "molusquicida": "Molusquicida"
    }
    
    db_tipo = tipo_map.get(tipo.lower(), tipo)
    
    productos = await fitosanitarios_collection.find({
        "tipo": db_tipo,
        "activo": True
    }).sort("nombre_comercial", 1).to_list(length=500)
    
    return {
        "success": True,
        "productos": [serialize_producto(p) for p in productos]
    }



# IMPORT products from Excel/CSV
@router.post("/import")
async def import_productos(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para importar productos")
    
    # Validate file type
    filename = file.filename.lower()
    if not (filename.endswith('.xlsx') or filename.endswith('.xls') or filename.endswith('.csv')):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use .xlsx, .xls o .csv")
    
    try:
        contents = await file.read()
        
        # Read file based on type
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Clean column names (lowercase, strip, replace spaces)
        df.columns = df.columns.str.lower().str.strip().str.replace(' ', '_')
        
        # Map common column names
        column_mapping = {
            'nº_registro': 'numero_registro',
            'n_registro': 'numero_registro',
            'no_registro': 'numero_registro',
            'registro': 'numero_registro',
            'nombre': 'nombre_comercial',
            'producto': 'nombre_comercial',
            'denominacion': 'denominacion_comun',
            'denominación': 'denominacion_comun',
            'empresa_concesionaria': 'empresa',
            'fabricante': 'empresa',
            'tipo_producto': 'tipo',
            'categoria': 'tipo',
            'materia': 'materia_activa',
            'composicion': 'materia_activa',
            'dosis_minima': 'dosis_min',
            'dosis_min': 'dosis_min',
            'dosis_maxima': 'dosis_max',
            'dosis_max': 'dosis_max',
            'unidad': 'unidad_dosis',
            'volumen_agua_minimo': 'volumen_agua_min',
            'volumen_agua_maximo': 'volumen_agua_max',
            'plagas': 'plagas_objetivo',
            'enfermedades': 'plagas_objetivo',
            'plazo': 'plazo_seguridad',
            'plazo_de_seguridad': 'plazo_seguridad',
            'notas': 'observaciones',
            'comentarios': 'observaciones'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        # Validate required columns
        required_cols = ['numero_registro', 'nombre_comercial']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"Columnas requeridas no encontradas: {', '.join(missing_cols)}. Columnas disponibles: {', '.join(df.columns.tolist())}"
            )
        
        # Process rows
        productos_to_insert = []
        errors = []
        skipped = 0
        
        for idx, row in df.iterrows():
            try:
                # Skip rows without required data
                if pd.isna(row.get('numero_registro')) or pd.isna(row.get('nombre_comercial')):
                    skipped += 1
                    continue
                
                # Check if product already exists
                existing = await fitosanitarios_collection.find_one({
                    "numero_registro": str(row['numero_registro']).strip()
                })
                if existing:
                    skipped += 1
                    continue
                
                # Build product object
                producto = {
                    "numero_registro": str(row['numero_registro']).strip(),
                    "nombre_comercial": str(row['nombre_comercial']).strip(),
                    "denominacion_comun": str(row.get('denominacion_comun', '')).strip() if pd.notna(row.get('denominacion_comun')) else None,
                    "empresa": str(row.get('empresa', '')).strip() if pd.notna(row.get('empresa')) else None,
                    "tipo": str(row.get('tipo', 'Herbicida')).strip() if pd.notna(row.get('tipo')) else 'Herbicida',
                    "materia_activa": str(row.get('materia_activa', '')).strip() if pd.notna(row.get('materia_activa')) else None,
                    "dosis_min": float(row['dosis_min']) if pd.notna(row.get('dosis_min')) else None,
                    "dosis_max": float(row['dosis_max']) if pd.notna(row.get('dosis_max')) else None,
                    "unidad_dosis": str(row.get('unidad_dosis', 'L/ha')).strip() if pd.notna(row.get('unidad_dosis')) else 'L/ha',
                    "volumen_agua_min": float(row['volumen_agua_min']) if pd.notna(row.get('volumen_agua_min')) else 200,
                    "volumen_agua_max": float(row['volumen_agua_max']) if pd.notna(row.get('volumen_agua_max')) else 600,
                    "plagas_objetivo": str(row.get('plagas_objetivo', '')).split(',') if pd.notna(row.get('plagas_objetivo')) else [],
                    "plazo_seguridad": int(row['plazo_seguridad']) if pd.notna(row.get('plazo_seguridad')) else None,
                    "observaciones": str(row.get('observaciones', '')).strip() if pd.notna(row.get('observaciones')) else None,
                    "activo": True,
                    "created_at": datetime.utcnow(),
                    "created_by": current_user.get("email"),
                    "imported": True
                }
                
                # Clean plagas_objetivo
                if producto["plagas_objetivo"]:
                    producto["plagas_objetivo"] = [p.strip() for p in producto["plagas_objetivo"] if p.strip()]
                
                productos_to_insert.append(producto)
                
            except Exception as e:
                errors.append(f"Fila {idx + 2}: {str(e)}")
        
        # Insert products
        inserted_count = 0
        if productos_to_insert:
            result = await fitosanitarios_collection.insert_many(productos_to_insert)
            inserted_count = len(result.inserted_ids)
        
        return {
            "success": True,
            "message": "Importación completada",
            "inserted": inserted_count,
            "skipped": skipped,
            "errors": errors[:10] if errors else [],
            "total_errors": len(errors)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")



# SYNC with MAPA (Ministerio de Agricultura) registry
MAPA_BASE_URL = "https://www.mapa.gob.es/es/agricultura/temas/sanidad-vegetal/productos-fitosanitarios/fitos.asp"

@router.post("/sync-mapa")
async def sync_with_mapa(
    search_term: str = "",
    current_user: dict = Depends(get_current_user)
):
    """
    Sincroniza productos con el Registro Oficial de Productos Fitosanitarios del MAPA.
    Busca productos por nombre comercial o materia activa.
    """
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para sincronizar con MAPA")
    
    try:
        # MAPA doesn't have a public API, so we'll use their search page
        # This is a simplified example - in production you'd need to handle their specific form
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Search for products
            search_url = f"{MAPA_BASE_URL}"
            params = {
                "nombre": search_term,
                "formulado": "",
                "sustancia": "",
                "cultivo": "",
                "plaga": ""
            }
            
            response = await client.get(search_url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Error conectando con el servidor del MAPA")
            
            # Parse HTML response
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find product tables (structure depends on MAPA's current HTML)
            productos_encontrados = []
            
            # Look for product rows in the results table
            table = soup.find('table', {'class': 'listado'})
            if table:
                rows = table.find_all('tr')[1:]  # Skip header
                for row in rows:
                    cols = row.find_all('td')
                    if len(cols) >= 4:
                        producto = {
                            "numero_registro": cols[0].get_text(strip=True),
                            "nombre_comercial": cols[1].get_text(strip=True),
                            "empresa": cols[2].get_text(strip=True) if len(cols) > 2 else "",
                            "tipo": cols[3].get_text(strip=True) if len(cols) > 3 else "Fitosanitario"
                        }
                        productos_encontrados.append(producto)
            
            # If no table found, try alternative parsing
            if not productos_encontrados:
                # Return info that search was performed but no results in expected format
                return {
                    "success": True,
                    "message": "Búsqueda realizada. El MAPA no proporciona una API pública, se recomienda usar la importación desde Excel con datos descargados manualmente.",
                    "mapa_url": "https://www.mapa.gob.es/es/agricultura/temas/sanidad-vegetal/productos-fitosanitarios/registro-productos/",
                    "productos_encontrados": 0,
                    "nota": "Para obtener datos actualizados, visite el enlace del MAPA y exporte los datos a Excel."
                }
            
            # Insert or update products found
            inserted = 0
            updated = 0
            
            for prod in productos_encontrados:
                existing = await fitosanitarios_collection.find_one({
                    "numero_registro": prod["numero_registro"]
                })
                
                if existing:
                    # Update existing
                    await fitosanitarios_collection.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {
                            "nombre_comercial": prod["nombre_comercial"],
                            "empresa": prod["empresa"],
                            "updated_at": datetime.utcnow(),
                            "source": "MAPA"
                        }}
                    )
                    updated += 1
                else:
                    # Insert new
                    prod["activo"] = True
                    prod["created_at"] = datetime.utcnow()
                    prod["source"] = "MAPA"
                    await fitosanitarios_collection.insert_one(prod)
                    inserted += 1
            
            return {
                "success": True,
                "message": f"Sincronización completada",
                "inserted": inserted,
                "updated": updated,
                "total_encontrados": len(productos_encontrados)
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout conectando con el servidor del MAPA")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en sincronización: {str(e)}")


# Search in MAPA (returns URL for manual search)
@router.get("/mapa-search-url")
async def get_mapa_search_url(
    nombre: Optional[str] = "",
    sustancia: Optional[str] = "",
    cultivo: Optional[str] = "",
    current_user: dict = Depends(get_current_user)
):
    """
    Genera la URL de búsqueda en el registro oficial del MAPA.
    Como el MAPA no tiene API pública, proporcionamos el enlace directo.
    """
    base_url = "https://www.mapa.gob.es/es/agricultura/temas/sanidad-vegetal/productos-fitosanitarios/fitos.asp"
    
    params = []
    if nombre:
        params.append(f"nombre={nombre}")
    if sustancia:
        params.append(f"sustancia={sustancia}")
    if cultivo:
        params.append(f"cultivo={cultivo}")
    
    search_url = base_url
    if params:
        search_url += "?" + "&".join(params)
    
    return {
        "success": True,
        "search_url": search_url,
        "registro_url": "https://www.mapa.gob.es/es/agricultura/temas/sanidad-vegetal/productos-fitosanitarios/registro-productos/",
        "instructions": [
            "1. Haga clic en el enlace del registro oficial",
            "2. Busque los productos deseados",
            "3. Exporte los resultados a Excel",
            "4. Use la función 'Importar' en FRUVECO para cargar los datos"
        ]
    }
