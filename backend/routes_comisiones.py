"""
Routes for Comisiones (Commissions) - Liquidation and Reports
Comisiones se calculan a partir de los ALBARANES asociados a contratos,
no directamente de los contratos.
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from collections import defaultdict

from database import db, serialize_doc, serialize_docs

router = APIRouter(prefix="/api", tags=["comisiones"])

# Collections
contratos_collection = db['contratos']
agentes_collection = db['agentes']
albaranes_collection = db['albaranes']


def format_number_es(value: float, decimals: int = 2) -> str:
    """
    Formatea un número al estilo español:
    - Punto (.) para separador de miles
    - Coma (,) para decimales
    Ejemplo: 12850.50 -> "12.850,50"
    """
    if value is None:
        return "0"
    
    # Format with the required decimals
    if decimals == 0:
        formatted = f"{value:,.0f}"
    else:
        formatted = f"{value:,.{decimals}f}"
    
    # Replace: comma -> temp, dot -> comma, temp -> dot
    formatted = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
    return formatted


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


def get_current_user(token: str = None):
    """Placeholder for auth dependency"""
    pass

from rbac_guards import get_current_user  # noqa: F811


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
    Obtiene el resumen de comisiones agrupado por agente.
    Las comisiones se calculan a partir de los ALBARANES asociados a contratos.
    """
    # Build filter for albaranes
    albaran_query = {}
    if fecha_desde or fecha_hasta:
        date_filter = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        # El campo real es 'fecha_albaran' (formato actual). Mantenemos compat con 'fecha'.
        albaran_query["$or"] = [
            {"fecha_albaran": date_filter},
            {"fecha": date_filter}
        ]
    if campana:
        albaran_query["campana"] = campana
    
    # Get all albaranes with contrato_id
    albaran_query["contrato_id"] = {"$exists": True, "$nin": [None, ""]}
    albaranes = await albaranes_collection.find(albaran_query).to_list(1000)
    
    # Get all contracts for commission info
    contrato_ids = list(set([a.get("contrato_id") for a in albaranes if a.get("contrato_id")]))
    contratos = {}
    if contrato_ids:
        contrato_docs = await contratos_collection.find({
            "_id": {"$in": [ObjectId(cid) for cid in contrato_ids if ObjectId.is_valid(cid)]}
        }).to_list(1000)
        contratos = {str(c["_id"]): c for c in contrato_docs}
    
    # Get all agents for name lookup
    agentes = await agentes_collection.find({}).to_list(100)
    agentes_map = {str(a["_id"]): a for a in agentes}

    # Fallback: recoger nombres desde las comisiones_generadas previas
    # (por si el agente fue eliminado pero aun existen comisiones historicas con su nombre)
    try:
        comisiones_historicas = db['comisiones_generadas']
        async for c in comisiones_historicas.find({}, {"_id": 0, "agente_id": 1, "agente_nombre": 1}):
            aid = c.get("agente_id")
            if aid and aid not in agentes_map and c.get("agente_nombre"):
                agentes_map[aid] = {"nombre": c["agente_nombre"]}
    except Exception:
        pass
    
    # Group commissions by agent from albaranes
    comisiones_compra = defaultdict(lambda: {
        "agente_id": "",
        "agente_nombre": "",
        "tipo": "compra",
        "albaranes": [],
        "total_kg": 0,
        "total_importe_albaranes": 0,
        "total_comision": 0
    })
    
    comisiones_venta = defaultdict(lambda: {
        "agente_id": "",
        "agente_nombre": "",
        "tipo": "venta",
        "albaranes": [],
        "total_kg": 0,
        "total_importe_albaranes": 0,
        "total_comision": 0
    })
    
    for albaran in albaranes:
        contrato_id = albaran.get("contrato_id")
        if not contrato_id or contrato_id not in contratos:
            continue
        
        contrato = contratos[contrato_id]
        
        # Calcular cantidad (kilos netos) del albaran.
        # Preferir kilos_netos del albaran (formato actual).
        # Fallback: sumar cantidad de items no-destare (formato antiguo).
        cantidad_kg = float(albaran.get("kilos_netos") or 0)
        if cantidad_kg <= 0:
            cantidad_kg = sum(
                (item.get("cantidad") or 0)
                for item in albaran.get("items", [])
                if not item.get("es_destare")
            )
        
        importe_albaran = albaran.get("total_albaran", 0) or 0
        
        # Calcular precio promedio por kg
        precio_kg = importe_albaran / cantidad_kg if cantidad_kg > 0 else 0
        
        # Determinar tipo del albaran.
        # Formato actual: tipo_albaran = "Compra" | "Venta"
        # Formato antiguo: tipo = "Entrada" | "Salida"
        tipo_albaran_val = (albaran.get("tipo_albaran") or albaran.get("tipo") or "").strip()
        if tipo_albaran_val in ("Compra", "Entrada", "Albarán de compra", "Albaran de compra"):
            albaran_tipo = "Entrada"
        elif tipo_albaran_val in ("Venta", "Salida", "Albarán de venta", "Albaran de venta"):
            albaran_tipo = "Salida"
        else:
            albaran_tipo = "Entrada"  # default compra
        
        # Determinar número de albarán
        albaran_numero = albaran.get("numero_albaran") or f"ALB-{str(albaran.get('_id', ''))[-6:]}"
        
        # Comisión de compra (tipo Entrada)
        if albaran_tipo == "Entrada":
            agente_compra_id = contrato.get("agente_compra")
            if agente_compra_id and (not tipo_agente or tipo_agente == 'compra'):
                if not agente_id or agente_id == agente_compra_id:
                    com_tipo = contrato.get("comision_compra_tipo") or contrato.get("comision_tipo")
                    com_valor = contrato.get("comision_compra_valor") or contrato.get("comision_valor") or 0
                    importe_comision = calcular_comision(com_tipo, com_valor, cantidad_kg, precio_kg)
                    
                    agente_info = agentes_map.get(agente_compra_id, {})
                    comisiones_compra[agente_compra_id]["agente_id"] = agente_compra_id
                    comisiones_compra[agente_compra_id]["agente_nombre"] = agente_info.get("nombre", "Agente desconocido")
                    comisiones_compra[agente_compra_id]["albaranes"].append({
                        "albaran_id": str(albaran["_id"]),
                        "numero": albaran_numero,
                        "fecha": albaran.get("fecha_albaran") or albaran.get("fecha") or "",
                        "contrato_numero": f"{contrato.get('serie', 'MP')}-{contrato.get('año', '')}-{str(contrato.get('numero', '')).zfill(3)}",
                        "contrato_id": contrato_id,
                        "campana": albaran.get("campana") or contrato.get("campana"),
                        "proveedor": albaran.get("proveedor") or contrato.get("proveedor"),
                        "cultivo": albaran.get("cultivo") or contrato.get("cultivo"),
                        "cantidad_kg": cantidad_kg,
                        "precio_kg": round(precio_kg, 4),
                        "importe_albaran": importe_albaran,
                        "comision_tipo": com_tipo,
                        "comision_valor": com_valor,
                        "importe_comision": importe_comision
                    })
                    comisiones_compra[agente_compra_id]["total_kg"] += cantidad_kg
                    comisiones_compra[agente_compra_id]["total_importe_albaranes"] += importe_albaran
                    comisiones_compra[agente_compra_id]["total_comision"] += importe_comision
        
        # Comisión de venta (tipo Salida)
        elif albaran_tipo == "Salida":
            agente_venta_id = contrato.get("agente_venta")
            if agente_venta_id and (not tipo_agente or tipo_agente == 'venta'):
                if not agente_id or agente_id == agente_venta_id:
                    com_tipo = contrato.get("comision_venta_tipo")
                    com_valor = contrato.get("comision_venta_valor") or 0
                    importe_comision = calcular_comision(com_tipo, com_valor, cantidad_kg, precio_kg)
                    
                    agente_info = agentes_map.get(agente_venta_id, {})
                    comisiones_venta[agente_venta_id]["agente_id"] = agente_venta_id
                    comisiones_venta[agente_venta_id]["agente_nombre"] = agente_info.get("nombre", "Agente desconocido")
                    comisiones_venta[agente_venta_id]["albaranes"].append({
                        "albaran_id": str(albaran["_id"]),
                        "numero": albaran_numero,
                        "fecha": albaran.get("fecha_albaran") or albaran.get("fecha") or "",
                        "contrato_numero": f"{contrato.get('serie', 'MP')}-{contrato.get('año', '')}-{str(contrato.get('numero', '')).zfill(3)}",
                        "contrato_id": contrato_id,
                        "campana": albaran.get("campana") or contrato.get("campana"),
                        "cliente": albaran.get("cliente") or contrato.get("cliente"),
                        "cultivo": albaran.get("cultivo") or contrato.get("cultivo"),
                        "cantidad_kg": cantidad_kg,
                        "precio_kg": round(precio_kg, 4),
                        "importe_albaran": importe_albaran,
                        "comision_tipo": com_tipo,
                        "comision_valor": com_valor,
                        "importe_comision": importe_comision
                    })
                    comisiones_venta[agente_venta_id]["total_kg"] += cantidad_kg
                    comisiones_venta[agente_venta_id]["total_importe_albaranes"] += importe_albaran
                    comisiones_venta[agente_venta_id]["total_comision"] += importe_comision
    
    # Combine results
    resultado = []
    for agente_data in comisiones_compra.values():
        if agente_data["albaranes"]:
            resultado.append(agente_data)
    for agente_data in comisiones_venta.values():
        if agente_data["albaranes"]:
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
    Lista de agentes que tienen comisiones configuradas en contratos con albaranes
    """
    # Get contracts with agents
    query = {}
    if campana:
        query["campana"] = campana
    
    contratos = await contratos_collection.find({
        "$or": [
            {"agente_compra": {"$exists": True, "$nin": ["", None]}},
            {"agente_venta": {"$exists": True, "$nin": ["", None]}}
        ]
    }).to_list(1000)
    
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
    Lista de campañas que tienen albaranes asociados a contratos con agentes
    """
    # Get albaranes with contrato_id
    pipeline = [
        {"$match": {"contrato_id": {"$exists": True, "$nin": [None, ""]}}},
        {"$group": {"_id": "$campana"}},
        {"$sort": {"_id": -1}}
    ]
    
    result = await albaranes_collection.aggregate(pipeline).to_list(100)
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
    basado en los ALBARANES asociados a sus contratos
    """
    from weasyprint import HTML, CSS
    from io import BytesIO
    
    # Get agent info
    agente = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    # Build query for albaranes
    albaran_query = {"contrato_id": {"$exists": True, "$nin": [None, ""]}}
    if campana:
        albaran_query["campana"] = campana
    if fecha_desde or fecha_hasta:
        date_filter = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        albaran_query["fecha"] = date_filter
    
    # Filter by tipo
    if tipo_agente == 'compra':
        albaran_query["tipo"] = "Entrada"
    else:
        albaran_query["tipo"] = "Salida"
    
    albaranes = await albaranes_collection.find(albaran_query).to_list(1000)
    
    # Get contracts with this agent
    if tipo_agente == 'compra':
        contratos_query = {"agente_compra": agente_id}
    else:
        contratos_query = {"agente_venta": agente_id}
    
    contratos_list = await contratos_collection.find(contratos_query).to_list(1000)
    contratos_ids = set(str(c["_id"]) for c in contratos_list)
    contratos_map = {str(c["_id"]): c for c in contratos_list}
    
    # Filter albaranes by contracts with this agent
    lineas = []
    total_kg = 0
    total_importe = 0
    total_comision = 0
    
    for albaran in albaranes:
        contrato_id = albaran.get("contrato_id")
        if contrato_id not in contratos_ids:
            continue
        
        contrato = contratos_map.get(contrato_id, {})
        
        # Calculate quantities from items
        cantidad_kg = sum(item.get("cantidad", 0) or 0 for item in albaran.get("items", []))
        importe = albaran.get("total_albaran", 0) or 0
        precio_kg = importe / cantidad_kg if cantidad_kg > 0 else 0
        
        if tipo_agente == 'compra':
            com_tipo = contrato.get("comision_compra_tipo") or contrato.get("comision_tipo")
            com_valor = contrato.get("comision_compra_valor") or contrato.get("comision_valor") or 0
        else:
            com_tipo = contrato.get("comision_venta_tipo")
            com_valor = contrato.get("comision_venta_valor") or 0
        
        comision = calcular_comision(com_tipo, com_valor, cantidad_kg, precio_kg)
        
        lineas.append({
            "albaran_numero": f"ALB-{str(albaran.get('_id', ''))[-6:]}",
            "fecha": albaran.get("fecha_albaran") or albaran.get("fecha") or "",
            "contrato_numero": f"{contrato.get('serie', 'MP')}-{contrato.get('año', '')}-{str(contrato.get('numero', '')).zfill(3)}",
            "campana": albaran.get("campana") or contrato.get("campana", ""),
            "proveedor_cliente": albaran.get("proveedor") if tipo_agente == 'compra' else albaran.get("cliente"),
            "cultivo": albaran.get("cultivo") or contrato.get("cultivo", ""),
            "cantidad": cantidad_kg,
            "precio": precio_kg,
            "importe": importe,
            "comision_tipo": com_tipo or "-",
            "comision_valor": com_valor,
            "comision_importe": comision
        })
        
        total_kg += cantidad_kg
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
            .nota {{ background: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 9pt; color: #856404; }}
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
        
        <div class="nota">
            <strong>Nota:</strong> Las comisiones se calculan a partir de los albaranes registrados asociados a contratos.
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Albarán</th>
                    <th>Fecha</th>
                    <th>Contrato</th>
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
        com_valor_display = f"{format_number_es(linea['comision_valor'], 2)}%" if linea['comision_tipo'] == 'porcentaje' else f"{format_number_es(linea['comision_valor'], 2)} €/kg"
        html_content += f"""
                <tr>
                    <td>{linea['albaran_numero']}</td>
                    <td>{linea['fecha']}</td>
                    <td>{linea['contrato_numero']}</td>
                    <td>{linea['campana']}</td>
                    <td>{linea['proveedor_cliente'] or '-'}</td>
                    <td>{linea['cultivo']}</td>
                    <td class="text-right">{format_number_es(linea['cantidad'], 0)}</td>
                    <td class="text-right">{format_number_es(linea['precio'], 4)}</td>
                    <td class="text-right">{format_number_es(linea['importe'], 2)}</td>
                    <td>{linea['comision_tipo']}</td>
                    <td class="text-right">{com_valor_display if linea['comision_valor'] else '-'}</td>
                    <td class="text-right"><strong>{format_number_es(linea['comision_importe'], 2)}</strong></td>
                </tr>
        """
    
    html_content += f"""
            </tbody>
        </table>
        
        <div class="totales">
            <h3>TOTALES</h3>
            <div class="totales-grid">
                <div class="total-item">
                    <div class="label">Total Albaranes</div>
                    <div class="value">{len(lineas)}</div>
                </div>
                <div class="total-item">
                    <div class="label">Total Kg</div>
                    <div class="value">{format_number_es(total_kg, 0)}</div>
                </div>
                <div class="total-item">
                    <div class="label">Importe Albaranes</div>
                    <div class="value">€{format_number_es(total_importe, 2)}</div>
                </div>
                <div class="total-item">
                    <div class="label">TOTAL COMISIÓN</div>
                    <div class="value" style="color: #1565c0;">€{format_number_es(total_comision, 2)}</div>
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
