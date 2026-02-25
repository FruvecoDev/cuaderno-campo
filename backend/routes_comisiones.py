"""
Routes for Comisiones (Commissions) - Liquidation and Reports
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from collections import defaultdict

from database import db, serialize_doc, serialize_docs
from rbac_guards import get_current_user, RequireContratosAccess

router = APIRouter(prefix="/api", tags=["comisiones"])

# Collections
contratos_collection = db['contratos']
agentes_collection = db['agentes_compra_venta']
albaranes_collection = db['albaranes']


def calcular_comision(tipo: str, valor: float, cantidad_kg: float, precio_kg: float) -> float:
    """
    Calcula el importe de la comisión según el tipo
    - porcentaje: (cantidad * precio * valor / 100)
    - euro_kilo: (cantidad * valor)
    """
    if not valor or valor <= 0:
        return 0.0
    
    if tipo == 'porcentaje':
        return round(cantidad_kg * precio_kg * (valor / 100), 2)
    elif tipo == 'euro_kilo':
        return round(cantidad_kg * valor, 2)
    return 0.0


@router.get("/comisiones/resumen")
async def get_resumen_comisiones(
    campana: Optional[str] = None,
    agente_id: Optional[str] = None,
    tipo_agente: Optional[str] = None,  # 'compra' o 'venta'
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el resumen de comisiones agrupado por agente
    """
    # Build filter
    query = {}
    if campana:
        query["campana"] = campana
    if fecha_desde or fecha_hasta:
        date_filter = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        query["fecha_contrato"] = date_filter
    
    # Get all contracts with commissions
    contratos = await contratos_collection.find(query).to_list(1000)
    
    # Get all agents for name lookup
    agentes = await agentes_collection.find({}).to_list(100)
    agentes_map = {str(a["_id"]): a for a in agentes}
    
    # Group commissions by agent
    comisiones_compra = defaultdict(lambda: {
        "agente_id": "",
        "agente_nombre": "",
        "tipo": "compra",
        "contratos": [],
        "total_kg": 0,
        "total_importe_contratos": 0,
        "total_comision": 0
    })
    
    comisiones_venta = defaultdict(lambda: {
        "agente_id": "",
        "agente_nombre": "",
        "tipo": "venta",
        "contratos": [],
        "total_kg": 0,
        "total_importe_contratos": 0,
        "total_comision": 0
    })
    
    for contrato in contratos:
        cantidad = contrato.get("cantidad", 0) or 0
        precio = contrato.get("precio", 0) or 0
        importe_contrato = cantidad * precio
        
        # Comisión de compra
        agente_compra_id = contrato.get("agente_compra")
        if agente_compra_id and (not tipo_agente or tipo_agente == 'compra'):
            if not agente_id or agente_id == agente_compra_id:
                com_tipo = contrato.get("comision_compra_tipo") or contrato.get("comision_tipo")
                com_valor = contrato.get("comision_compra_valor") or contrato.get("comision_valor") or 0
                importe_comision = calcular_comision(com_tipo, com_valor, cantidad, precio)
                
                agente_info = agentes_map.get(agente_compra_id, {})
                comisiones_compra[agente_compra_id]["agente_id"] = agente_compra_id
                comisiones_compra[agente_compra_id]["agente_nombre"] = agente_info.get("nombre", "Agente desconocido")
                comisiones_compra[agente_compra_id]["contratos"].append({
                    "contrato_id": str(contrato["_id"]),
                    "numero": f"{contrato.get('serie', 'MP')}-{contrato.get('año', '')}-{str(contrato.get('numero', '')).zfill(3)}",
                    "campana": contrato.get("campana"),
                    "proveedor": contrato.get("proveedor"),
                    "cultivo": contrato.get("cultivo"),
                    "cantidad_kg": cantidad,
                    "precio_kg": precio,
                    "importe_contrato": importe_contrato,
                    "comision_tipo": com_tipo,
                    "comision_valor": com_valor,
                    "importe_comision": importe_comision
                })
                comisiones_compra[agente_compra_id]["total_kg"] += cantidad
                comisiones_compra[agente_compra_id]["total_importe_contratos"] += importe_contrato
                comisiones_compra[agente_compra_id]["total_comision"] += importe_comision
        
        # Comisión de venta
        agente_venta_id = contrato.get("agente_venta")
        if agente_venta_id and (not tipo_agente or tipo_agente == 'venta'):
            if not agente_id or agente_id == agente_venta_id:
                com_tipo = contrato.get("comision_venta_tipo")
                com_valor = contrato.get("comision_venta_valor") or 0
                importe_comision = calcular_comision(com_tipo, com_valor, cantidad, precio)
                
                agente_info = agentes_map.get(agente_venta_id, {})
                comisiones_venta[agente_venta_id]["agente_id"] = agente_venta_id
                comisiones_venta[agente_venta_id]["agente_nombre"] = agente_info.get("nombre", "Agente desconocido")
                comisiones_venta[agente_venta_id]["contratos"].append({
                    "contrato_id": str(contrato["_id"]),
                    "numero": f"{contrato.get('serie', 'MP')}-{contrato.get('año', '')}-{str(contrato.get('numero', '')).zfill(3)}",
                    "campana": contrato.get("campana"),
                    "cliente": contrato.get("cliente"),
                    "cultivo": contrato.get("cultivo"),
                    "cantidad_kg": cantidad,
                    "precio_kg": precio,
                    "importe_contrato": importe_contrato,
                    "comision_tipo": com_tipo,
                    "comision_valor": com_valor,
                    "importe_comision": importe_comision
                })
                comisiones_venta[agente_venta_id]["total_kg"] += cantidad
                comisiones_venta[agente_venta_id]["total_importe_contratos"] += importe_contrato
                comisiones_venta[agente_venta_id]["total_comision"] += importe_comision
    
    # Combine results
    resultado = []
    for agente_data in comisiones_compra.values():
        if agente_data["contratos"]:
            resultado.append(agente_data)
    for agente_data in comisiones_venta.values():
        if agente_data["contratos"]:
            resultado.append(agente_data)
    
    # Calculate totals
    total_comision_compra = sum(c["total_comision"] for c in comisiones_compra.values())
    total_comision_venta = sum(c["total_comision"] for c in comisiones_venta.values())
    
    return {
        "success": True,
        "comisiones": resultado,
        "totales": {
            "total_comision_compra": round(total_comision_compra, 2),
            "total_comision_venta": round(total_comision_venta, 2),
            "total_general": round(total_comision_compra + total_comision_venta, 2)
        }
    }


@router.get("/comisiones/agentes")
async def get_agentes_con_comisiones(
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Lista de agentes que tienen comisiones en contratos
    """
    query = {}
    if campana:
        query["campana"] = campana
    
    contratos = await contratos_collection.find(query).to_list(1000)
    agentes = await agentes_collection.find({}).to_list(100)
    agentes_map = {str(a["_id"]): a for a in agentes}
    
    agentes_compra = set()
    agentes_venta = set()
    
    for c in contratos:
        if c.get("agente_compra"):
            agentes_compra.add(c["agente_compra"])
        if c.get("agente_venta"):
            agentes_venta.add(c["agente_venta"])
    
    result = []
    for aid in agentes_compra:
        agente = agentes_map.get(aid, {})
        result.append({
            "id": aid,
            "nombre": agente.get("nombre", "Desconocido"),
            "tipo": "compra"
        })
    
    for aid in agentes_venta:
        agente = agentes_map.get(aid, {})
        result.append({
            "id": aid,
            "nombre": agente.get("nombre", "Desconocido"),
            "tipo": "venta"
        })
    
    return {"success": True, "agentes": result}


@router.get("/comisiones/campanas")
async def get_campanas_con_comisiones(
    current_user: dict = Depends(get_current_user)
):
    """
    Lista de campañas que tienen contratos con comisiones
    """
    pipeline = [
        {"$match": {"$or": [
            {"agente_compra": {"$exists": True, "$ne": ""}},
            {"agente_venta": {"$exists": True, "$ne": ""}}
        ]}},
        {"$group": {"_id": "$campana"}},
        {"$sort": {"_id": -1}}
    ]
    
    result = await contratos_collection.aggregate(pipeline).to_list(100)
    campanas = [r["_id"] for r in result if r["_id"]]
    
    return {"success": True, "campanas": campanas}


@router.get("/comisiones/liquidacion/pdf")
async def generate_liquidacion_pdf(
    agente_id: str,
    tipo_agente: str,  # 'compra' o 'venta'
    campana: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un PDF de liquidación de comisiones para un agente
    """
    from weasyprint import HTML, CSS
    from io import BytesIO
    
    # Get agent info
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    # Build query
    query = {}
    if tipo_agente == 'compra':
        query["agente_compra"] = agente_id
    else:
        query["agente_venta"] = agente_id
    
    if campana:
        query["campana"] = campana
    if fecha_desde or fecha_hasta:
        date_filter = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        query["fecha_contrato"] = date_filter
    
    contratos = await contratos_collection.find(query).to_list(1000)
    
    # Calculate commissions
    lineas = []
    total_kg = 0
    total_importe = 0
    total_comision = 0
    
    for c in contratos:
        cantidad = c.get("cantidad", 0) or 0
        precio = c.get("precio", 0) or 0
        importe = cantidad * precio
        
        if tipo_agente == 'compra':
            com_tipo = c.get("comision_compra_tipo") or c.get("comision_tipo")
            com_valor = c.get("comision_compra_valor") or c.get("comision_valor") or 0
        else:
            com_tipo = c.get("comision_venta_tipo")
            com_valor = c.get("comision_venta_valor") or 0
        
        comision = calcular_comision(com_tipo, com_valor, cantidad, precio)
        
        lineas.append({
            "numero": f"{c.get('serie', 'MP')}-{c.get('año', '')}-{str(c.get('numero', '')).zfill(3)}",
            "fecha": c.get("fecha_contrato", ""),
            "campana": c.get("campana", ""),
            "proveedor_cliente": c.get("proveedor") if tipo_agente == 'compra' else c.get("cliente"),
            "cultivo": c.get("cultivo", ""),
            "cantidad": cantidad,
            "precio": precio,
            "importe": importe,
            "comision_tipo": com_tipo or "-",
            "comision_valor": com_valor,
            "comision_importe": comision
        })
        
        total_kg += cantidad
        total_importe += importe
        total_comision += comision
    
    # Generate HTML
    fecha_generacion = datetime.now().strftime("%d/%m/%Y %H:%M")
    periodo = ""
    if campana:
        periodo = f"Campaña: {campana}"
    elif fecha_desde or fecha_hasta:
        periodo = f"Desde: {fecha_desde or '-'} Hasta: {fecha_hasta or '-'}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{ size: A4 landscape; margin: 1.5cm; }}
            body {{ font-family: Arial, sans-serif; font-size: 10pt; color: #333; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #2d5a27; padding-bottom: 15px; }}
            .header h1 {{ color: #2d5a27; margin: 0; font-size: 18pt; }}
            .header .info {{ text-align: right; font-size: 9pt; color: #666; }}
            .agente-info {{ background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 20px; }}
            .agente-info h2 {{ margin: 0 0 8px 0; color: #2d5a27; font-size: 14pt; }}
            .agente-info p {{ margin: 4px 0; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }}
            th {{ background: #2d5a27; color: white; padding: 8px 6px; text-align: left; }}
            td {{ padding: 6px; border-bottom: 1px solid #ddd; }}
            tr:nth-child(even) {{ background: #f9f9f9; }}
            .text-right {{ text-align: right; }}
            .totales {{ background: #e8f5e9; padding: 15px; border-radius: 6px; margin-top: 20px; }}
            .totales h3 {{ margin: 0 0 10px 0; color: #2d5a27; }}
            .totales-grid {{ display: flex; justify-content: space-around; }}
            .total-item {{ text-align: center; }}
            .total-item .label {{ font-size: 9pt; color: #666; }}
            .total-item .value {{ font-size: 16pt; font-weight: bold; color: #2d5a27; }}
            .footer {{ margin-top: 30px; text-align: center; font-size: 8pt; color: #999; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>LIQUIDACIÓN DE COMISIONES</h1>
            <div class="info">
                <div>Fecha: {fecha_generacion}</div>
                <div>{periodo}</div>
            </div>
        </div>
        
        <div class="agente-info">
            <h2>Agente de {'Compra' if tipo_agente == 'compra' else 'Venta'}</h2>
            <p><strong>Nombre:</strong> {agente.get('nombre', '-')}</p>
            <p><strong>NIF/CIF:</strong> {agente.get('nif', '-')}</p>
            <p><strong>Email:</strong> {agente.get('email', '-')}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Nº Contrato</th>
                    <th>Fecha</th>
                    <th>Campaña</th>
                    <th>{'Proveedor' if tipo_agente == 'compra' else 'Cliente'}</th>
                    <th>Cultivo</th>
                    <th class="text-right">Cantidad (kg)</th>
                    <th class="text-right">Precio (€/kg)</th>
                    <th class="text-right">Importe (€)</th>
                    <th>Tipo Com.</th>
                    <th class="text-right">Valor Com.</th>
                    <th class="text-right">Comisión (€)</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for linea in lineas:
        com_valor_display = f"{linea['comision_valor']}%" if linea['comision_tipo'] == 'porcentaje' else f"{linea['comision_valor']} €/kg"
        html_content += f"""
                <tr>
                    <td>{linea['numero']}</td>
                    <td>{linea['fecha']}</td>
                    <td>{linea['campana']}</td>
                    <td>{linea['proveedor_cliente'] or '-'}</td>
                    <td>{linea['cultivo']}</td>
                    <td class="text-right">{linea['cantidad']:,.0f}</td>
                    <td class="text-right">{linea['precio']:.3f}</td>
                    <td class="text-right">{linea['importe']:,.2f}</td>
                    <td>{linea['comision_tipo']}</td>
                    <td class="text-right">{com_valor_display if linea['comision_valor'] else '-'}</td>
                    <td class="text-right"><strong>{linea['comision_importe']:,.2f}</strong></td>
                </tr>
        """
    
    html_content += f"""
            </tbody>
        </table>
        
        <div class="totales">
            <h3>TOTALES</h3>
            <div class="totales-grid">
                <div class="total-item">
                    <div class="label">Total Kg</div>
                    <div class="value">{total_kg:,.0f}</div>
                </div>
                <div class="total-item">
                    <div class="label">Importe Contratos</div>
                    <div class="value">€{total_importe:,.2f}</div>
                </div>
                <div class="total-item">
                    <div class="label">TOTAL COMISIÓN</div>
                    <div class="value" style="color: #1565c0;">€{total_comision:,.2f}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Documento generado automáticamente - FRUVECO Cuaderno de Campo</p>
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    html = HTML(string=html_content)
    pdf_bytes = html.write_pdf()
    
    filename = f"Liquidacion_{agente.get('nombre', 'Agente').replace(' ', '_')}_{tipo_agente}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
