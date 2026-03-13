"""
API de Integración ERP - Endpoints para sincronización automática
Este módulo proporciona endpoints simplificados y seguros para que sistemas ERP
externos puedan crear/actualizar datos en el sistema FRUVECO.

Autenticación: API Key en header "X-API-Key"
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
import hashlib
import os

from database import db, serialize_doc

router = APIRouter(prefix="/api/erp", tags=["erp-integration"])

# Collections
contratos_collection = db['contratos']
proveedores_collection = db['proveedores']
clientes_collection = db['clientes']
cultivos_collection = db['cultivos']
agentes_collection = db['agentes']
parcelas_collection = db['parcelas']
fincas_collection = db['fincas']

# API Key configuration - En producción, guardar en .env
# Generar una API Key única para el ERP
ERP_API_KEYS = {
    os.environ.get("ERP_API_KEY", "fruveco-erp-key-2026"): "ERP Principal"
}


# === MODELOS PARA ERP ===

class PrecioCalidadERP(BaseModel):
    """Precio por rango de tenderometría (solo para guisante)"""
    calidad: str = Field(..., description="Nombre de la calidad: premium, standard, industrial")
    min_tenderometria: float = Field(..., description="Tenderometría mínima del rango")
    max_tenderometria: float = Field(..., description="Tenderometría máxima del rango")
    precio: float = Field(..., description="Precio en €/kg para este rango")


class ContratoERP(BaseModel):
    """Modelo de contrato para integración ERP"""
    # Identificación
    referencia_erp: str = Field(..., description="Referencia única del contrato en el ERP")
    
    # Tipo y clasificación
    tipo: str = Field("Compra", description="Tipo: 'Compra' o 'Venta'")
    campana: str = Field(..., description="Campaña agrícola, ej: '2025/26'")
    procedencia: str = Field("Campo", description="Procedencia: 'Campo', 'Almacén con tratamiento', 'Almacén sin tratamiento'")
    
    # Fechas
    fecha_contrato: str = Field(..., description="Fecha del contrato (YYYY-MM-DD)")
    periodo_desde: str = Field(..., description="Fecha inicio entregas (YYYY-MM-DD)")
    periodo_hasta: str = Field(..., description="Fecha fin entregas (YYYY-MM-DD)")
    
    # Proveedor/Cliente (identificación)
    proveedor_cif: Optional[str] = Field(None, description="CIF/NIF del proveedor (para tipo='Compra')")
    proveedor_nombre: Optional[str] = Field(None, description="Nombre del proveedor (alternativo si no tiene CIF)")
    cliente_cif: Optional[str] = Field(None, description="CIF/NIF del cliente (para tipo='Venta')")
    cliente_nombre: Optional[str] = Field(None, description="Nombre del cliente (alternativo si no tiene CIF)")
    
    # Cultivo
    cultivo_codigo: Optional[str] = Field(None, description="Código del cultivo en el sistema")
    cultivo_nombre: str = Field(..., description="Nombre del cultivo")
    
    # Cantidades y precios
    cantidad: float = Field(..., description="Cantidad en kg")
    precio: float = Field(..., description="Precio en €/kg")
    moneda: str = Field("EUR", description="Moneda: EUR, USD, GBP")
    
    # Comisiones (opcional)
    agente_compra_codigo: Optional[str] = Field(None, description="Código del agente de compra")
    comision_compra_porcentaje: Optional[float] = Field(None, description="Comisión de compra en %")
    agente_venta_codigo: Optional[str] = Field(None, description="Código del agente de venta")
    comision_venta_porcentaje: Optional[float] = Field(None, description="Comisión de venta en %")
    
    # Condiciones
    forma_pago: Optional[str] = Field(None, description="Forma de pago")
    descuento_destare: Optional[float] = Field(0, description="% de destare")
    condiciones_entrega: Optional[str] = Field(None, description="Condiciones: FCA, DDP, EXW, FOB, CFR")
    transporte_por_cuenta: Optional[str] = Field(None, description="Transporte: Empresa, Proveedor, Cliente")
    envases_por_cuenta: Optional[str] = Field(None, description="Envases: Empresa, Proveedor, Cliente")
    cargas_granel: Optional[bool] = Field(False, description="Si las cargas son a granel")
    
    # Precios por calidad (para guisante)
    precios_calidad: Optional[List[PrecioCalidadERP]] = Field(None, description="Precios por tenderometría")
    
    # Observaciones
    observaciones: Optional[str] = Field(None, description="Observaciones adicionales")


class ProveedorERP(BaseModel):
    """Modelo de proveedor para integración ERP"""
    referencia_erp: str = Field(..., description="Referencia única en el ERP")
    nombre: str = Field(..., description="Nombre o razón social")
    cif_nif: str = Field(..., description="CIF/NIF")
    direccion: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    tipo: Optional[str] = Field("Agricultor", description="Tipo: Agricultor, Cooperativa, Mayorista")
    iban: Optional[str] = None
    observaciones: Optional[str] = None


class ClienteERP(BaseModel):
    """Modelo de cliente para integración ERP"""
    referencia_erp: str = Field(..., description="Referencia única en el ERP")
    nombre: str = Field(..., description="Nombre o razón social")
    cif_nif: str = Field(..., description="CIF/NIF")
    direccion: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais: Optional[str] = Field("España")
    telefono: Optional[str] = None
    email: Optional[str] = None
    tipo: Optional[str] = None
    persona_contacto: Optional[str] = None
    observaciones: Optional[str] = None


class CultivoERP(BaseModel):
    """Modelo de cultivo para integración ERP"""
    codigo: str = Field(..., description="Código único del cultivo")
    nombre: str = Field(..., description="Nombre del cultivo")
    variedad: Optional[str] = None
    descripcion: Optional[str] = None


# === AUTENTICACIÓN ===

async def verify_api_key(x_api_key: str = Header(..., description="API Key para autenticación ERP")):
    """Verificar API Key del ERP"""
    if x_api_key not in ERP_API_KEYS:
        raise HTTPException(
            status_code=401,
            detail="API Key inválida. Contacte al administrador para obtener una API Key válida."
        )
    return {"api_key": x_api_key, "erp_name": ERP_API_KEYS[x_api_key]}


# === ENDPOINTS DE CONTRATOS ===

@router.post("/contratos", response_model=dict)
async def crear_contrato_erp(
    contrato: ContratoERP,
    auth: dict = Depends(verify_api_key)
):
    """
    Crear un nuevo contrato desde el ERP.
    
    Este endpoint permite al ERP crear contratos de compra o venta.
    Si el proveedor/cliente o cultivo no existen, se crearán automáticamente.
    
    **Autenticación**: Requiere header `X-API-Key`
    
    **Respuesta exitosa**: Devuelve el contrato creado con su ID y número asignado.
    """
    try:
        # Verificar si ya existe un contrato con esta referencia ERP
        existing = await contratos_collection.find_one({"referencia_erp": contrato.referencia_erp})
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe un contrato con referencia ERP: {contrato.referencia_erp}"
            )
        
        # Buscar o crear proveedor (para contratos de Compra)
        proveedor_id = None
        proveedor_nombre = contrato.proveedor_nombre or ""
        if contrato.tipo == "Compra" and (contrato.proveedor_cif or contrato.proveedor_nombre):
            # Buscar por CIF primero, luego por nombre
            query = {}
            if contrato.proveedor_cif:
                query = {"cif_nif": contrato.proveedor_cif}
            elif contrato.proveedor_nombre:
                query = {"nombre": {"$regex": f"^{contrato.proveedor_nombre}$", "$options": "i"}}
            
            proveedor = await proveedores_collection.find_one(query)
            if proveedor:
                proveedor_id = str(proveedor["_id"])
                proveedor_nombre = proveedor.get("nombre", "")
            elif contrato.proveedor_cif:
                # Crear proveedor automáticamente
                new_prov = {
                    "nombre": contrato.proveedor_nombre or f"Proveedor {contrato.proveedor_cif}",
                    "cif_nif": contrato.proveedor_cif,
                    "activo": True,
                    "created_at": datetime.now(),
                    "created_by": "ERP Integration"
                }
                result = await proveedores_collection.insert_one(new_prov)
                proveedor_id = str(result.inserted_id)
                proveedor_nombre = new_prov["nombre"]
        
        # Buscar o crear cliente (para contratos de Venta)
        cliente_id = None
        cliente_nombre = contrato.cliente_nombre or ""
        if contrato.tipo == "Venta" and (contrato.cliente_cif or contrato.cliente_nombre):
            query = {}
            if contrato.cliente_cif:
                query = {"cif_nif": contrato.cliente_cif}
            elif contrato.cliente_nombre:
                query = {"nombre": {"$regex": f"^{contrato.cliente_nombre}$", "$options": "i"}}
            
            cliente = await clientes_collection.find_one(query)
            if cliente:
                cliente_id = str(cliente["_id"])
                cliente_nombre = cliente.get("nombre", "")
            elif contrato.cliente_cif:
                # Crear cliente automáticamente
                new_cli = {
                    "nombre": contrato.cliente_nombre or f"Cliente {contrato.cliente_cif}",
                    "cif_nif": contrato.cliente_cif,
                    "activo": True,
                    "created_at": datetime.now(),
                    "created_by": "ERP Integration"
                }
                result = await clientes_collection.insert_one(new_cli)
                cliente_id = str(result.inserted_id)
                cliente_nombre = new_cli["nombre"]
        
        # Buscar cultivo
        cultivo_id = None
        cultivo_nombre = contrato.cultivo_nombre
        if contrato.cultivo_codigo:
            cultivo = await cultivos_collection.find_one({"codigo": contrato.cultivo_codigo})
            if cultivo:
                cultivo_id = str(cultivo["_id"])
                cultivo_nombre = cultivo.get("nombre", contrato.cultivo_nombre)
        else:
            # Buscar por nombre
            cultivo = await cultivos_collection.find_one({
                "nombre": {"$regex": f"^{contrato.cultivo_nombre}$", "$options": "i"}
            })
            if cultivo:
                cultivo_id = str(cultivo["_id"])
                cultivo_nombre = cultivo.get("nombre", contrato.cultivo_nombre)
        
        # Buscar agentes
        agente_compra_id = None
        if contrato.agente_compra_codigo:
            agente = await agentes_collection.find_one({"codigo": contrato.agente_compra_codigo})
            if agente:
                agente_compra_id = str(agente["_id"])
        
        agente_venta_id = None
        if contrato.agente_venta_codigo:
            agente = await agentes_collection.find_one({"codigo": contrato.agente_venta_codigo})
            if agente:
                agente_venta_id = str(agente["_id"])
        
        # Obtener siguiente número de contrato
        last_contrato = await contratos_collection.find_one(sort=[("numero", -1)])
        next_numero = (last_contrato.get("numero", 0) if last_contrato else 0) + 1
        year = datetime.now().year
        numero_contrato = f"MP-{year}-{str(next_numero).zfill(6)}"
        
        # Construir documento del contrato
        contrato_doc = {
            "serie": "MP",
            "año": year,
            "numero": next_numero,
            "numero_contrato": numero_contrato,
            "referencia_erp": contrato.referencia_erp,
            "tipo": contrato.tipo,
            "campana": contrato.campana,
            "procedencia": contrato.procedencia,
            "fecha_contrato": contrato.fecha_contrato,
            "periodo_desde": contrato.periodo_desde,
            "periodo_hasta": contrato.periodo_hasta,
            "proveedor_id": proveedor_id,
            "proveedor": proveedor_nombre,
            "cliente_id": cliente_id,
            "cliente": cliente_nombre,
            "cultivo_id": cultivo_id,
            "cultivo": cultivo_nombre,
            "cantidad": contrato.cantidad,
            "precio": contrato.precio,
            "moneda": contrato.moneda,
            "agente_compra": agente_compra_id,
            "comision_compra_tipo": "porcentaje" if contrato.comision_compra_porcentaje else None,
            "comision_compra_valor": contrato.comision_compra_porcentaje,
            "agente_venta": agente_venta_id,
            "comision_venta_tipo": "porcentaje" if contrato.comision_venta_porcentaje else None,
            "comision_venta_valor": contrato.comision_venta_porcentaje,
            "forma_pago": contrato.forma_pago,
            "descuento_destare": contrato.descuento_destare,
            "condiciones_entrega": contrato.condiciones_entrega,
            "transporte_por_cuenta": contrato.transporte_por_cuenta,
            "envases_por_cuenta": contrato.envases_por_cuenta,
            "cargas_granel": contrato.cargas_granel,
            "precios_calidad": [p.dict() for p in contrato.precios_calidad] if contrato.precios_calidad else [],
            "observaciones": contrato.observaciones,
            "estado": "Activo",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "created_by": f"ERP Integration ({auth['erp_name']})"
        }
        
        # Insertar contrato
        result = await contratos_collection.insert_one(contrato_doc)
        created = await contratos_collection.find_one({"_id": result.inserted_id})
        
        return {
            "success": True,
            "message": "Contrato creado correctamente",
            "data": {
                "id": str(result.inserted_id),
                "numero_contrato": numero_contrato,
                "referencia_erp": contrato.referencia_erp,
                "proveedor_id": proveedor_id,
                "cliente_id": cliente_id,
                "cultivo_id": cultivo_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear contrato: {str(e)}")


@router.put("/contratos/{referencia_erp}", response_model=dict)
async def actualizar_contrato_erp(
    referencia_erp: str,
    contrato: ContratoERP,
    auth: dict = Depends(verify_api_key)
):
    """
    Actualizar un contrato existente usando la referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    try:
        # Buscar contrato por referencia ERP
        existing = await contratos_collection.find_one({"referencia_erp": referencia_erp})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró contrato con referencia ERP: {referencia_erp}"
            )
        
        # Actualizar campos
        update_data = {
            "cantidad": contrato.cantidad,
            "precio": contrato.precio,
            "periodo_desde": contrato.periodo_desde,
            "periodo_hasta": contrato.periodo_hasta,
            "forma_pago": contrato.forma_pago,
            "descuento_destare": contrato.descuento_destare,
            "condiciones_entrega": contrato.condiciones_entrega,
            "observaciones": contrato.observaciones,
            "updated_at": datetime.now(),
            "updated_by": f"ERP Integration ({auth['erp_name']})"
        }
        
        if contrato.precios_calidad:
            update_data["precios_calidad"] = [p.dict() for p in contrato.precios_calidad]
        
        await contratos_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Contrato actualizado correctamente",
            "data": {
                "id": str(existing["_id"]),
                "numero_contrato": existing.get("numero_contrato"),
                "referencia_erp": referencia_erp
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar contrato: {str(e)}")


@router.get("/contratos/{referencia_erp}", response_model=dict)
async def obtener_contrato_erp(
    referencia_erp: str,
    auth: dict = Depends(verify_api_key)
):
    """
    Obtener un contrato por su referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    contrato = await contratos_collection.find_one({"referencia_erp": referencia_erp})
    if not contrato:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró contrato con referencia ERP: {referencia_erp}"
        )
    
    return {
        "success": True,
        "data": serialize_doc(contrato)
    }


@router.delete("/contratos/{referencia_erp}", response_model=dict)
async def eliminar_contrato_erp(
    referencia_erp: str,
    auth: dict = Depends(verify_api_key)
):
    """
    Eliminar (dar de baja) un contrato por su referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    contrato = await contratos_collection.find_one({"referencia_erp": referencia_erp})
    if not contrato:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró contrato con referencia ERP: {referencia_erp}"
        )
    
    # Marcar como eliminado en lugar de borrar físicamente
    await contratos_collection.update_one(
        {"_id": contrato["_id"]},
        {"$set": {
            "estado": "Cancelado",
            "fecha_baja": datetime.now().strftime("%Y-%m-%d"),
            "updated_at": datetime.now(),
            "deleted_by": "ERP Integration"
        }}
    )
    
    return {
        "success": True,
        "message": "Contrato cancelado correctamente",
        "data": {
            "id": str(contrato["_id"]),
            "numero_contrato": contrato.get("numero_contrato"),
            "referencia_erp": referencia_erp
        }
    }


# === ENDPOINTS DE PROVEEDORES ===

@router.post("/proveedores", response_model=dict)
async def crear_proveedor_erp(
    proveedor: ProveedorERP,
    auth: dict = Depends(verify_api_key)
):
    """Crear un nuevo proveedor desde el ERP."""
    # Verificar si ya existe
    existing = await proveedores_collection.find_one({
        "$or": [
            {"referencia_erp": proveedor.referencia_erp},
            {"cif_nif": proveedor.cif_nif}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un proveedor con esta referencia o CIF/NIF"
        )
    
    proveedor_doc = proveedor.dict()
    proveedor_doc.update({
        "activo": True,
        "created_at": datetime.now(),
        "created_by": f"ERP Integration ({auth['erp_name']})"
    })
    
    result = await proveedores_collection.insert_one(proveedor_doc)
    
    return {
        "success": True,
        "message": "Proveedor creado correctamente",
        "data": {
            "id": str(result.inserted_id),
            "referencia_erp": proveedor.referencia_erp,
            "cif_nif": proveedor.cif_nif
        }
    }


@router.put("/proveedores/{referencia_erp}", response_model=dict)
async def actualizar_proveedor_erp(
    referencia_erp: str,
    proveedor: ProveedorERP,
    auth: dict = Depends(verify_api_key)
):
    """Actualizar un proveedor existente."""
    existing = await proveedores_collection.find_one({"referencia_erp": referencia_erp})
    if not existing:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    update_data = proveedor.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    update_data["updated_by"] = f"ERP Integration ({auth['erp_name']})"
    
    await proveedores_collection.update_one(
        {"_id": existing["_id"]},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Proveedor actualizado correctamente"}


# === ENDPOINTS DE CLIENTES ===

@router.post("/clientes", response_model=dict)
async def crear_cliente_erp(
    cliente: ClienteERP,
    auth: dict = Depends(verify_api_key)
):
    """Crear un nuevo cliente desde el ERP."""
    existing = await clientes_collection.find_one({
        "$or": [
            {"referencia_erp": cliente.referencia_erp},
            {"cif_nif": cliente.cif_nif}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un cliente con esta referencia o CIF/NIF"
        )
    
    cliente_doc = cliente.dict()
    cliente_doc.update({
        "activo": True,
        "created_at": datetime.now(),
        "created_by": f"ERP Integration ({auth['erp_name']})"
    })
    
    result = await clientes_collection.insert_one(cliente_doc)
    
    return {
        "success": True,
        "message": "Cliente creado correctamente",
        "data": {
            "id": str(result.inserted_id),
            "referencia_erp": cliente.referencia_erp,
            "cif_nif": cliente.cif_nif
        }
    }


# === ENDPOINTS DE CULTIVOS ===

@router.post("/cultivos", response_model=dict)
async def crear_cultivo_erp(
    cultivo: CultivoERP,
    auth: dict = Depends(verify_api_key)
):
    """Crear un nuevo cultivo desde el ERP."""
    existing = await cultivos_collection.find_one({"codigo": cultivo.codigo})
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un cultivo con código: {cultivo.codigo}"
        )
    
    cultivo_doc = cultivo.dict()
    cultivo_doc.update({
        "activo": True,
        "created_at": datetime.now(),
        "created_by": f"ERP Integration ({auth['erp_name']})"
    })
    
    result = await cultivos_collection.insert_one(cultivo_doc)
    
    return {
        "success": True,
        "message": "Cultivo creado correctamente",
        "data": {
            "id": str(result.inserted_id),
            "codigo": cultivo.codigo
        }
    }


# === ENDPOINT DE VERIFICACIÓN ===

@router.get("/health", response_model=dict)
async def health_check(auth: dict = Depends(verify_api_key)):
    """
    Verificar que la API está funcionando y la autenticación es correcta.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    return {
        "success": True,
        "message": "API ERP funcionando correctamente",
        "erp_name": auth["erp_name"],
        "timestamp": datetime.now().isoformat()
    }


# === ENDPOINT DE CATÁLOGOS ===

@router.get("/catalogos/cultivos", response_model=dict)
async def listar_cultivos_erp(auth: dict = Depends(verify_api_key)):
    """Obtener lista de cultivos disponibles."""
    cultivos = await cultivos_collection.find({"activo": {"$ne": False}}).to_list(1000)
    return {
        "success": True,
        "data": [
            {
                "id": str(c["_id"]),
                "codigo": c.get("codigo"),
                "nombre": c.get("nombre"),
                "variedad": c.get("variedad")
            }
            for c in cultivos
        ]
    }


@router.get("/catalogos/agentes", response_model=dict)
async def listar_agentes_erp(auth: dict = Depends(verify_api_key)):
    """Obtener lista de agentes disponibles."""
    agentes = await agentes_collection.find({"activo": {"$ne": False}}).to_list(1000)
    return {
        "success": True,
        "data": [
            {
                "id": str(a["_id"]),
                "codigo": a.get("codigo"),
                "nombre": a.get("nombre"),
                "tipo": a.get("tipo"),
                "comision_defecto": a.get("comision_defecto")
            }
            for a in agentes
        ]
    }



# === MODELOS DE FINCAS Y PARCELAS ===

class FincaERP(BaseModel):
    """Modelo de finca para integración ERP"""
    referencia_erp: str = Field(..., description="Código único de la finca en el ERP")
    denominacion: str = Field(..., description="Nombre de la finca")
    codigo: Optional[str] = Field(None, description="Código interno")
    provincia: Optional[str] = Field(None, description="Provincia")
    poblacion: Optional[str] = Field(None, description="Población/Localidad")
    direccion: Optional[str] = Field(None, description="Dirección")
    codigo_postal: Optional[str] = Field(None, description="Código postal")
    poligono: Optional[str] = Field(None, description="Polígono catastral")
    parcela_catastral: Optional[str] = Field(None, description="Parcela catastral")
    hectareas: Optional[float] = Field(None, description="Superficie en hectáreas")
    propietario: Optional[str] = Field(None, description="Nombre del propietario")
    propietario_cif: Optional[str] = Field(None, description="CIF/NIF del propietario")
    finca_propia: Optional[bool] = Field(False, description="Si es propiedad de la empresa")
    observaciones: Optional[str] = Field(None, description="Observaciones")


class CoordenadasERP(BaseModel):
    """Coordenadas para geometría de parcela"""
    longitud: float = Field(..., description="Longitud (ej: -1.13)")
    latitud: float = Field(..., description="Latitud (ej: 37.98)")


class GeometriaERP(BaseModel):
    """Geometría GeoJSON para parcela"""
    tipo: str = Field("Polygon", description="Tipo de geometría (Polygon)")
    coordenadas: List[List[CoordenadasERP]] = Field(..., description="Array de coordenadas del polígono")


class ParcelaERP(BaseModel):
    """Modelo de parcela para integración ERP"""
    referencia_erp: str = Field(..., description="Código único de la parcela en el ERP")
    codigo: Optional[str] = Field(None, description="Código de parcela (ej: PAR-001)")
    nombre: str = Field(..., description="Nombre descriptivo de la parcela")
    
    # Vinculación con finca
    finca_referencia_erp: Optional[str] = Field(None, description="Referencia ERP de la finca")
    finca_nombre: Optional[str] = Field(None, description="Nombre de la finca (alternativo)")
    
    # Vinculación con contrato (opcional)
    contrato_referencia_erp: Optional[str] = Field(None, description="Referencia ERP del contrato")
    
    # Proveedor
    proveedor_cif: Optional[str] = Field(None, description="CIF/NIF del proveedor")
    proveedor_nombre: Optional[str] = Field(None, description="Nombre del proveedor")
    
    # Cultivo
    cultivo_codigo: Optional[str] = Field(None, description="Código del cultivo")
    cultivo_nombre: str = Field(..., description="Nombre del cultivo")
    variedad: Optional[str] = Field(None, description="Variedad del cultivo")
    
    # Datos de campaña
    campana: str = Field(..., description="Campaña agrícola (ej: 2025/26)")
    
    # Superficie y características
    superficie: float = Field(..., description="Superficie en hectáreas")
    superficie_unidad: str = Field("ha", description="Unidad: 'ha' o 'm2'")
    plantas_hectarea: Optional[int] = Field(None, description="Plantas por hectárea")
    sistema_riego: Optional[str] = Field(None, description="Sistema de riego: Goteo, Aspersión, Pivot, Inundación")
    
    # Fechas
    fecha_siembra: Optional[str] = Field(None, description="Fecha de siembra (YYYY-MM-DD)")
    fecha_cosecha_prevista: Optional[str] = Field(None, description="Fecha prevista de cosecha (YYYY-MM-DD)")
    
    # Estado
    estado: Optional[str] = Field("Activa", description="Estado: Activa, Cosechada, Baja")
    
    # Ubicación geográfica (opcional)
    latitud: Optional[float] = Field(None, description="Latitud del centro de la parcela")
    longitud: Optional[float] = Field(None, description="Longitud del centro de la parcela")
    
    # Datos SIGPAC (opcional)
    sigpac_provincia: Optional[str] = Field(None, description="Código provincia SIGPAC (2 dígitos)")
    sigpac_municipio: Optional[str] = Field(None, description="Código municipio SIGPAC (3 dígitos)")
    sigpac_agregado: Optional[str] = Field(None, description="Agregado SIGPAC")
    sigpac_zona: Optional[str] = Field(None, description="Zona SIGPAC")
    sigpac_poligono: Optional[str] = Field(None, description="Polígono SIGPAC")
    sigpac_parcela: Optional[str] = Field(None, description="Parcela SIGPAC")
    sigpac_recinto: Optional[str] = Field(None, description="Recinto SIGPAC")
    
    # Observaciones
    observaciones: Optional[str] = Field(None, description="Observaciones adicionales")


# === ENDPOINTS DE FINCAS ===

@router.post("/fincas", response_model=dict)
async def crear_finca_erp(
    finca: FincaERP,
    auth: dict = Depends(verify_api_key)
):
    """
    Crear una nueva finca desde el ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    try:
        # Verificar si ya existe
        existing = await fincas_collection.find_one({"referencia_erp": finca.referencia_erp})
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe una finca con referencia ERP: {finca.referencia_erp}"
            )
        
        # Buscar proveedor si se proporciona CIF
        proveedor_id = None
        if finca.propietario_cif:
            proveedor = await proveedores_collection.find_one({"cif_nif": finca.propietario_cif})
            if proveedor:
                proveedor_id = str(proveedor["_id"])
        
        # Generar código si no se proporciona
        codigo = finca.codigo
        if not codigo:
            last_finca = await fincas_collection.find_one(sort=[("codigo", -1)])
            if last_finca and last_finca.get("codigo"):
                try:
                    num = int(last_finca["codigo"].replace("FIN", "").replace("-", "")) + 1
                except:
                    num = 1
            else:
                num = 1
            codigo = f"FIN-{str(num).zfill(3)}"
        
        # Construir documento
        finca_doc = {
            "referencia_erp": finca.referencia_erp,
            "codigo": codigo,
            "denominacion": finca.denominacion,
            "provincia": finca.provincia,
            "poblacion": finca.poblacion,
            "direccion": finca.direccion,
            "codigo_postal": finca.codigo_postal,
            "poligono": finca.poligono,
            "parcela": finca.parcela_catastral,
            "hectareas": finca.hectareas,
            "propietario": finca.propietario,
            "propietario_id": proveedor_id,
            "finca_propia": finca.finca_propia,
            "observaciones": finca.observaciones,
            "activo": True,
            "created_at": datetime.now(),
            "created_by": f"ERP Integration ({auth['erp_name']})"
        }
        
        result = await fincas_collection.insert_one(finca_doc)
        
        return {
            "success": True,
            "message": "Finca creada correctamente",
            "data": {
                "id": str(result.inserted_id),
                "codigo": codigo,
                "referencia_erp": finca.referencia_erp,
                "denominacion": finca.denominacion
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear finca: {str(e)}")


@router.put("/fincas/{referencia_erp}", response_model=dict)
async def actualizar_finca_erp(
    referencia_erp: str,
    finca: FincaERP,
    auth: dict = Depends(verify_api_key)
):
    """
    Actualizar una finca existente usando la referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    try:
        existing = await fincas_collection.find_one({"referencia_erp": referencia_erp})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró finca con referencia ERP: {referencia_erp}"
            )
        
        update_data = {
            "denominacion": finca.denominacion,
            "provincia": finca.provincia,
            "poblacion": finca.poblacion,
            "direccion": finca.direccion,
            "codigo_postal": finca.codigo_postal,
            "poligono": finca.poligono,
            "parcela": finca.parcela_catastral,
            "hectareas": finca.hectareas,
            "propietario": finca.propietario,
            "finca_propia": finca.finca_propia,
            "observaciones": finca.observaciones,
            "updated_at": datetime.now(),
            "updated_by": f"ERP Integration ({auth['erp_name']})"
        }
        
        await fincas_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Finca actualizada correctamente",
            "data": {
                "id": str(existing["_id"]),
                "codigo": existing.get("codigo"),
                "referencia_erp": referencia_erp
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar finca: {str(e)}")


@router.get("/fincas/{referencia_erp}", response_model=dict)
async def obtener_finca_erp(
    referencia_erp: str,
    auth: dict = Depends(verify_api_key)
):
    """
    Obtener una finca por su referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    finca = await fincas_collection.find_one({"referencia_erp": referencia_erp})
    if not finca:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró finca con referencia ERP: {referencia_erp}"
        )
    
    return {
        "success": True,
        "data": serialize_doc(finca)
    }


@router.delete("/fincas/{referencia_erp}", response_model=dict)
async def eliminar_finca_erp(
    referencia_erp: str,
    auth: dict = Depends(verify_api_key)
):
    """
    Eliminar (dar de baja) una finca por su referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    finca = await fincas_collection.find_one({"referencia_erp": referencia_erp})
    if not finca:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró finca con referencia ERP: {referencia_erp}"
        )
    
    await fincas_collection.update_one(
        {"_id": finca["_id"]},
        {"$set": {
            "activo": False,
            "fecha_baja": datetime.now().strftime("%Y-%m-%d"),
            "updated_at": datetime.now(),
            "deleted_by": "ERP Integration"
        }}
    )
    
    return {
        "success": True,
        "message": "Finca dada de baja correctamente",
        "data": {
            "id": str(finca["_id"]),
            "codigo": finca.get("codigo"),
            "referencia_erp": referencia_erp
        }
    }


# === ENDPOINTS DE PARCELAS ===

@router.post("/parcelas", response_model=dict)
async def crear_parcela_erp(
    parcela: ParcelaERP,
    auth: dict = Depends(verify_api_key)
):
    """
    Crear una nueva parcela desde el ERP.
    
    La parcela puede vincularse a una finca y/o contrato existentes usando sus referencias ERP.
    Si el proveedor no existe, se creará automáticamente.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    try:
        # Verificar si ya existe
        existing = await parcelas_collection.find_one({"referencia_erp": parcela.referencia_erp})
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe una parcela con referencia ERP: {parcela.referencia_erp}"
            )
        
        # Buscar finca si se proporciona referencia ERP
        finca_id = None
        finca_nombre = parcela.finca_nombre or ""
        if parcela.finca_referencia_erp:
            finca = await fincas_collection.find_one({"referencia_erp": parcela.finca_referencia_erp})
            if finca:
                finca_id = str(finca["_id"])
                finca_nombre = finca.get("denominacion", "")
        elif parcela.finca_nombre:
            finca = await fincas_collection.find_one({
                "denominacion": {"$regex": f"^{parcela.finca_nombre}$", "$options": "i"}
            })
            if finca:
                finca_id = str(finca["_id"])
                finca_nombre = finca.get("denominacion", "")
        
        # Buscar contrato si se proporciona referencia ERP
        contrato_id = None
        numero_contrato = None
        if parcela.contrato_referencia_erp:
            contrato = await contratos_collection.find_one({"referencia_erp": parcela.contrato_referencia_erp})
            if contrato:
                contrato_id = str(contrato["_id"])
                numero_contrato = contrato.get("numero_contrato")
        
        # Buscar o crear proveedor
        proveedor_id = None
        proveedor_nombre = parcela.proveedor_nombre or ""
        if parcela.proveedor_cif:
            proveedor = await proveedores_collection.find_one({"cif_nif": parcela.proveedor_cif})
            if proveedor:
                proveedor_id = str(proveedor["_id"])
                proveedor_nombre = proveedor.get("nombre", "")
            else:
                # Crear proveedor automáticamente
                new_prov = {
                    "nombre": parcela.proveedor_nombre or f"Proveedor {parcela.proveedor_cif}",
                    "cif_nif": parcela.proveedor_cif,
                    "activo": True,
                    "created_at": datetime.now(),
                    "created_by": "ERP Integration"
                }
                result_prov = await proveedores_collection.insert_one(new_prov)
                proveedor_id = str(result_prov.inserted_id)
                proveedor_nombre = new_prov["nombre"]
        
        # Buscar cultivo
        cultivo_id = None
        cultivo_nombre = parcela.cultivo_nombre
        if parcela.cultivo_codigo:
            cultivo = await cultivos_collection.find_one({"codigo": parcela.cultivo_codigo})
            if cultivo:
                cultivo_id = str(cultivo["_id"])
                cultivo_nombre = cultivo.get("nombre", parcela.cultivo_nombre)
        else:
            cultivo = await cultivos_collection.find_one({
                "nombre": {"$regex": f"^{parcela.cultivo_nombre}$", "$options": "i"}
            })
            if cultivo:
                cultivo_id = str(cultivo["_id"])
                cultivo_nombre = cultivo.get("nombre", parcela.cultivo_nombre)
        
        # Generar código si no se proporciona
        codigo = parcela.codigo
        if not codigo:
            last_parcela = await parcelas_collection.find_one(sort=[("codigo", -1)])
            if last_parcela and last_parcela.get("codigo"):
                try:
                    num = int(last_parcela["codigo"].replace("PAR-", "").replace("PAR", "")) + 1
                except:
                    num = 1
            else:
                num = 1
            codigo = f"PAR-{str(num).zfill(3)}"
        
        # Construir geometría si se proporcionan coordenadas
        geometry = None
        if parcela.latitud and parcela.longitud:
            # Crear un polígono pequeño alrededor del punto central
            delta = 0.005  # Aproximadamente 500m
            geometry = {
                "type": "Polygon",
                "coordinates": [[
                    [parcela.longitud - delta, parcela.latitud - delta],
                    [parcela.longitud + delta, parcela.latitud - delta],
                    [parcela.longitud + delta, parcela.latitud + delta],
                    [parcela.longitud - delta, parcela.latitud + delta],
                    [parcela.longitud - delta, parcela.latitud - delta]
                ]]
            }
        
        # Construir datos SIGPAC si se proporcionan
        recintos = []
        if parcela.sigpac_provincia and parcela.sigpac_municipio and parcela.sigpac_poligono and parcela.sigpac_parcela:
            recintos.append({
                "provincia": parcela.sigpac_provincia,
                "municipio": parcela.sigpac_municipio,
                "agregado": parcela.sigpac_agregado or "0",
                "zona": parcela.sigpac_zona or "0",
                "poligono": parcela.sigpac_poligono,
                "parcela": parcela.sigpac_parcela,
                "recinto": parcela.sigpac_recinto or "1"
            })
        
        # Construir documento
        parcela_doc = {
            "referencia_erp": parcela.referencia_erp,
            "codigo": codigo,
            "nombre": parcela.nombre,
            "finca_id": finca_id,
            "finca": finca_nombre,
            "contrato_id": contrato_id,
            "numero_contrato": numero_contrato,
            "proveedor_id": proveedor_id,
            "proveedor": proveedor_nombre,
            "cultivo_id": cultivo_id,
            "cultivo": cultivo_nombre,
            "variedad": parcela.variedad,
            "campana": parcela.campana,
            "superficie": parcela.superficie,
            "superficie_unidad": parcela.superficie_unidad,
            "plantas_hectarea": parcela.plantas_hectarea,
            "sistema_riego": parcela.sistema_riego,
            "fecha_siembra": parcela.fecha_siembra,
            "fecha_cosecha_prevista": parcela.fecha_cosecha_prevista,
            "estado": parcela.estado or "Activa",
            "geometry": geometry,
            "recintos": recintos,
            "observaciones": parcela.observaciones,
            "activo": True,
            "created_at": datetime.now(),
            "created_by": f"ERP Integration ({auth['erp_name']})"
        }
        
        result = await parcelas_collection.insert_one(parcela_doc)
        
        return {
            "success": True,
            "message": "Parcela creada correctamente",
            "data": {
                "id": str(result.inserted_id),
                "codigo": codigo,
                "referencia_erp": parcela.referencia_erp,
                "nombre": parcela.nombre,
                "finca_id": finca_id,
                "contrato_id": contrato_id,
                "proveedor_id": proveedor_id,
                "cultivo_id": cultivo_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear parcela: {str(e)}")


@router.put("/parcelas/{referencia_erp}", response_model=dict)
async def actualizar_parcela_erp(
    referencia_erp: str,
    parcela: ParcelaERP,
    auth: dict = Depends(verify_api_key)
):
    """
    Actualizar una parcela existente usando la referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    try:
        existing = await parcelas_collection.find_one({"referencia_erp": referencia_erp})
        if not existing:
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró parcela con referencia ERP: {referencia_erp}"
            )
        
        # Buscar cultivo actualizado
        cultivo_id = existing.get("cultivo_id")
        cultivo_nombre = parcela.cultivo_nombre
        if parcela.cultivo_codigo:
            cultivo = await cultivos_collection.find_one({"codigo": parcela.cultivo_codigo})
            if cultivo:
                cultivo_id = str(cultivo["_id"])
                cultivo_nombre = cultivo.get("nombre", parcela.cultivo_nombre)
        
        update_data = {
            "nombre": parcela.nombre,
            "cultivo_id": cultivo_id,
            "cultivo": cultivo_nombre,
            "variedad": parcela.variedad,
            "campana": parcela.campana,
            "superficie": parcela.superficie,
            "superficie_unidad": parcela.superficie_unidad,
            "plantas_hectarea": parcela.plantas_hectarea,
            "sistema_riego": parcela.sistema_riego,
            "fecha_siembra": parcela.fecha_siembra,
            "fecha_cosecha_prevista": parcela.fecha_cosecha_prevista,
            "estado": parcela.estado,
            "observaciones": parcela.observaciones,
            "updated_at": datetime.now(),
            "updated_by": f"ERP Integration ({auth['erp_name']})"
        }
        
        await parcelas_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Parcela actualizada correctamente",
            "data": {
                "id": str(existing["_id"]),
                "codigo": existing.get("codigo"),
                "referencia_erp": referencia_erp
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar parcela: {str(e)}")


@router.get("/parcelas/{referencia_erp}", response_model=dict)
async def obtener_parcela_erp(
    referencia_erp: str,
    auth: dict = Depends(verify_api_key)
):
    """
    Obtener una parcela por su referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    parcela = await parcelas_collection.find_one({"referencia_erp": referencia_erp})
    if not parcela:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró parcela con referencia ERP: {referencia_erp}"
        )
    
    return {
        "success": True,
        "data": serialize_doc(parcela)
    }


@router.delete("/parcelas/{referencia_erp}", response_model=dict)
async def eliminar_parcela_erp(
    referencia_erp: str,
    auth: dict = Depends(verify_api_key)
):
    """
    Eliminar (dar de baja) una parcela por su referencia ERP.
    
    **Autenticación**: Requiere header `X-API-Key`
    """
    parcela = await parcelas_collection.find_one({"referencia_erp": referencia_erp})
    if not parcela:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró parcela con referencia ERP: {referencia_erp}"
        )
    
    await parcelas_collection.update_one(
        {"_id": parcela["_id"]},
        {"$set": {
            "activo": False,
            "estado": "Baja",
            "fecha_baja": datetime.now().strftime("%Y-%m-%d"),
            "updated_at": datetime.now(),
            "deleted_by": "ERP Integration"
        }}
    )
    
    return {
        "success": True,
        "message": "Parcela dada de baja correctamente",
        "data": {
            "id": str(parcela["_id"]),
            "codigo": parcela.get("codigo"),
            "referencia_erp": referencia_erp
        }
    }


# === CATÁLOGOS ADICIONALES ===

@router.get("/catalogos/fincas", response_model=dict)
async def listar_fincas_erp(auth: dict = Depends(verify_api_key)):
    """Obtener lista de fincas disponibles."""
    fincas = await fincas_collection.find({"activo": {"$ne": False}}).to_list(1000)
    return {
        "success": True,
        "data": [
            {
                "id": str(f["_id"]),
                "referencia_erp": f.get("referencia_erp"),
                "codigo": f.get("codigo"),
                "denominacion": f.get("denominacion"),
                "provincia": f.get("provincia"),
                "hectareas": f.get("hectareas")
            }
            for f in fincas
        ]
    }


@router.get("/catalogos/parcelas", response_model=dict)
async def listar_parcelas_erp(
    campana: Optional[str] = None,
    auth: dict = Depends(verify_api_key)
):
    """Obtener lista de parcelas disponibles."""
    query = {"activo": {"$ne": False}}
    if campana:
        query["campana"] = campana
    
    parcelas = await parcelas_collection.find(query).to_list(1000)
    return {
        "success": True,
        "data": [
            {
                "id": str(p["_id"]),
                "referencia_erp": p.get("referencia_erp"),
                "codigo": p.get("codigo"),
                "nombre": p.get("nombre"),
                "finca": p.get("finca"),
                "cultivo": p.get("cultivo"),
                "campana": p.get("campana"),
                "superficie": p.get("superficie"),
                "estado": p.get("estado")
            }
            for p in parcelas
        ]
    }
