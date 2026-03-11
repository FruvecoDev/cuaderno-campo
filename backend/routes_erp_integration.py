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
