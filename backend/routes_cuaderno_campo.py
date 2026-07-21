"""
Cuaderno de Campo - Generación de PDF
Genera un documento PDF completo con toda la información de seguimiento
de una parcela/cultivo durante una campaña.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from io import BytesIO

from utils.formatters import format_number_es

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api", tags=["Cuaderno de Campo"])

# Collections
parcelas_collection = db['parcelas']
tratamientos_collection = db['tratamientos']
irrigaciones_collection = db['irrigaciones']
visitas_collection = db['visitas']
cosechas_collection = db['cosechas']
evaluaciones_collection = db['evaluaciones']
contratos_collection = db['contratos']
tecnicos_aplicadores_collection = db['tecnicos_aplicadores']


def get_styles():
    """Define custom styles for the PDF"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='TitleMain',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#1a5276'),
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='SectionTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1a5276'),
        spaceBefore=15,
        spaceAfter=10,
        borderWidth=1,
        borderColor=colors.HexColor('#1a5276'),
        borderPadding=5
    ))
    
    styles.add(ParagraphStyle(
        name='SubSection',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=colors.HexColor('#2c3e50'),
        spaceBefore=10,
        spaceAfter=5
    ))
    
    styles.add(ParagraphStyle(
        name='NormalText',
        parent=styles['Normal'],
        fontSize=9,
        leading=12
    ))
    
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.gray
    ))
    
    return styles


def create_header_table(parcela: dict, campana: str) -> Table:
    """Create the header section with parcela info"""
    data = [
        ['CUADERNO DE CAMPO', '', ''],
        ['', '', ''],
        ['Código Parcela:', parcela.get('codigo_plantacion', '-'), f'Campaña: {campana}'],
        ['Cultivo:', parcela.get('cultivo', '-'), f'Variedad: {parcela.get("variedad", "-")}'],
        ['Superficie:', f'{parcela.get("superficie_total", 0)} ha', f'Fecha: {datetime.now().strftime("%d/%m/%Y")}'],
    ]
    
    table = Table(data, colWidths=[4*cm, 6*cm, 6*cm])
    table.setStyle(TableStyle([
        ('SPAN', (0, 0), (2, 0)),
        ('ALIGN', (0, 0), (2, 0), 'CENTER'),
        ('FONTSIZE', (0, 0), (2, 0), 20),
        ('FONTNAME', (0, 0), (2, 0), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (2, 0), colors.HexColor('#1a5276')),
        ('BOTTOMPADDING', (0, 0), (2, 0), 15),
        ('FONTNAME', (0, 2), (0, 4), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 2), (2, 4), 10),
        ('BACKGROUND', (0, 2), (2, 4), colors.HexColor('#f8f9fa')),
        ('GRID', (0, 2), (2, 4), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    
    return table


def create_tratamientos_table(tratamientos: list, styles) -> list:
    """Create tratamientos section with applicator details"""
    elements = []
    elements.append(Paragraph('TRATAMIENTOS FITOSANITARIOS', styles['SectionTitle']))
    
    if not tratamientos:
        elements.append(Paragraph('No se han registrado tratamientos para esta parcela.', styles['NormalText']))
        return elements
    
    data = [['Fecha', 'Tipo', 'Producto', 'Dosis', 'Superficie', 'Aplicador', 'Estado']]
    
    for t in tratamientos:
        data.append([
            (t.get('fecha_tratamiento') or '-'),
            (t.get('tipo_tratamiento') or '-')[:15],
            (t.get('producto_fitosanitario_nombre') or '-')[:20],
            f"{t.get('producto_fitosanitario_dosis') or ''} {t.get('producto_fitosanitario_unidad') or ''}".strip()[:10] or '-',
            f"{t.get('superficie_aplicacion') or 0} ha",
            (t.get('aplicador_nombre') or '-')[:15],
            '✓' if t.get('realizado') else '○'
        ])
    
    table = Table(data, colWidths=[2.2*cm, 2.2*cm, 3*cm, 2*cm, 2*cm, 2.5*cm, 1.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a5276')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
    ]))
    
    elements.append(table)
    elements.append(Paragraph(f'Total tratamientos: {len(tratamientos)}', styles['SmallText']))
    
    # Añadir sección de datos de técnicos aplicadores
    tratamientos_con_tecnico = [t for t in tratamientos if t.get('tecnico_data')]
    
    if tratamientos_con_tecnico:
        elements.append(Spacer(1, 0.3*cm))
        elements.append(Paragraph('DATOS DE TÉCNICOS APLICADORES', styles['SubSection']))
        
        # Obtener técnicos únicos
        tecnicos_unicos = {}
        for t in tratamientos_con_tecnico:
            tecnico = t.get('tecnico_data')
            tecnico_id = str(tecnico.get('_id', ''))
            if tecnico_id and tecnico_id not in tecnicos_unicos:
                tecnicos_unicos[tecnico_id] = tecnico
        
        # Crear tabla con datos de aplicadores
        aplicadores_data = [['Nombre Completo', 'DNI', 'Nº Carnet', 'Nivel Capacitación', 'Validez']]
        
        for tecnico in tecnicos_unicos.values():
            nombre_completo = f"{tecnico.get('nombre', '')} {tecnico.get('apellidos', '')}".strip()
            aplicadores_data.append([
                nombre_completo[:25] or '-',
                tecnico.get('dni', '-'),
                tecnico.get('num_carnet', '-'),
                tecnico.get('nivel_capacitacion', '-'),
                tecnico.get('fecha_validez', '-')
            ])
        
        aplicadores_table = Table(aplicadores_data, colWidths=[4.5*cm, 2.5*cm, 2.5*cm, 3*cm, 2.5*cm])
        aplicadores_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27ae60')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#e8f8f5')]),
        ]))
        
        elements.append(aplicadores_table)
        elements.append(Paragraph(
            'Los técnicos aplicadores deben disponer del carnet de aplicador de productos fitosanitarios vigente.',
            styles['SmallText']
        ))
    
    return elements


def create_irrigaciones_table(irrigaciones: list, styles) -> list:
    """Create irrigaciones section"""
    elements = []
    elements.append(Paragraph('RIEGOS', styles['SectionTitle']))
    
    if not irrigaciones:
        elements.append(Paragraph('No se han registrado riegos para esta parcela.', styles['NormalText']))
        return elements
    
    data = [['Fecha', 'Sistema', 'Duración (h)', 'Volumen (m³)', 'Coste (€)', 'Estado']]
    
    total_volumen = 0
    total_coste = 0
    
    for i in irrigaciones:
        volumen = i.get('volumen') or 0
        coste = i.get('coste') or 0
        total_volumen += volumen
        total_coste += coste
        
        estado = i.get('estado') or '-'
        data.append([
            i.get('fecha') or '-',
            i.get('sistema') or '-',
            str(i.get('duracion') or '-'),
            str(volumen),
            f"{coste:.2f}",
            estado[:10] if estado else '-'
        ])
    
    table = Table(data, colWidths=[2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2980b9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ebf5fb')]),
    ]))
    
    elements.append(table)
    elements.append(Paragraph(
        f'Total riegos: {len(irrigaciones)} | Volumen total: {total_volumen} m³ | Coste total: {total_coste:.2f} €', 
        styles['SmallText']
    ))
    
    return elements


def create_visitas_table(visitas: list, styles) -> list:
    """Create visitas section"""
    elements = []
    elements.append(Paragraph('VISITAS DE SEGUIMIENTO', styles['SectionTitle']))
    
    if not visitas:
        elements.append(Paragraph('No se han registrado visitas para esta parcela.', styles['NormalText']))
        return elements

    # Estilo dedicado para celdas con texto largo: word-wrap + tamaño pequeño.
    obs_style = ParagraphStyle(
        'CellObs', parent=styles['NormalText'],
        fontSize=8, leading=10, spaceBefore=0, spaceAfter=0, wordWrap='CJK'
    )

    data = [['Fecha', 'Tipo', 'Nº Visita', 'Observaciones']]

    for v in visitas:
        # Campos reales del modelo Visita (verificados en MongoDB):
        #  - fecha real: `fecha_visita` (fallback: `fecha_planificada`)
        #  - tipo real: `objetivo` (Plagas y Enfermedades / etc.)
        #  - identificador: `numero_visita`
        #  - `observaciones`: texto libre.
        fecha = v.get('fecha_visita') or v.get('fecha_planificada') or '-'
        tipo = (v.get('objetivo') or v.get('tipo_visita') or v.get('tipo') or '-')
        num_visita = v.get('numero_visita')
        num_visita_str = f'#{num_visita}' if num_visita is not None else '-'
        obs_text = v.get('observaciones') or '-'
        data.append([
            str(fecha),
            Paragraph(str(tipo), obs_style),
            num_visita_str,
            Paragraph(obs_text, obs_style),
        ])

    # Ancho de columnas ajustado: Observaciones más ancho para que no se corte
    # (el ancho útil de una A4 con márgenes 1.5cm ≈ 18cm → repartimos así).
    table = Table(
        data,
        colWidths=[2.3*cm, 4.5*cm, 1.7*cm, 9.5*cm],
        repeatRows=1,
    )
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27ae60')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 1), (3, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#eafaf1')]),
    ]))
    
    elements.append(table)
    elements.append(Paragraph(f'Total visitas: {len(visitas)}', styles['SmallText']))
    
    return elements


def create_cosechas_table(cosechas: list, styles) -> list:
    """Create cosechas section"""
    elements = []
    elements.append(Paragraph('COSECHAS', styles['SectionTitle']))
    
    if not cosechas:
        elements.append(Paragraph('No se han registrado cosechas para esta parcela.', styles['NormalText']))
        return elements
    
    data = [['Fecha', 'Kg Estimados', 'Kg Reales', 'Rendimiento', 'Importe', 'Estado']]
    
    total_kg = 0
    total_importe = 0
    
    for c in cosechas:
        kg_est = c.get('kg_estimados') or 0
        kg_real = c.get('kg_reales') or 0
        importe = c.get('importe_total') or 0
        total_kg += kg_real
        total_importe += importe
        
        rendimiento = f"{(kg_real/kg_est*100):.1f}%" if kg_est > 0 else "-"
        estado = c.get('estado') or '-'
        
        data.append([
            c.get('fecha_inicio') or '-',
            format_number_es(kg_est, 0),
            format_number_es(kg_real, 0),
            rendimiento,
            f"{format_number_es(importe, 2)} €",
            estado[:10] if estado else '-'
        ])
    
    table = Table(data, colWidths=[2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f39c12')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fef9e7')]),
    ]))
    
    elements.append(table)
    elements.append(Paragraph(
        f'Total cosechado: {format_number_es(total_kg, 0)} kg | Importe total: {format_number_es(total_importe, 2)} €',
        styles['SmallText']
    ))
    
    return elements


def create_resumen_section(data: dict, styles) -> list:
    """Create summary section"""
    elements = []
    elements.append(Paragraph('RESUMEN DEL CUADERNO', styles['SectionTitle']))
    
    resumen_data = [
        ['Concepto', 'Cantidad', 'Detalle'],
        ['Tratamientos', str(data['num_tratamientos']), f"Realizados: {data['tratamientos_realizados']}"],
        ['Riegos', str(data['num_riegos']), f"Volumen: {data['volumen_total']:.0f} m³"],
        ['Visitas', str(data['num_visitas']), ''],
        ['Cosechas', str(data['num_cosechas']), f"Total: {format_number_es(data['kg_total'], 0)} kg"],
    ]
    
    table = Table(resumen_data, colWidths=[5*cm, 3*cm, 7*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f6f7')]),
    ]))
    
    elements.append(table)
    
    return elements


@router.post("/contratos/{contrato_id}/cuaderno")
async def generar_cuaderno_from_contrato(
    contrato_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate Cuaderno de Campo from a contrato - finds linked parcelas and generates PDF."""
    try:
        contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de contrato invalido")
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")

    # Find parcelas linked to this contrato's proveedor + cultivo + campana
    query = {}
    if contrato.get("proveedor"):
        query["proveedor"] = contrato["proveedor"]
    if contrato.get("cultivo"):
        query["cultivo"] = contrato["cultivo"]
    if contrato.get("campana"):
        query["campana"] = contrato["campana"]

    parcelas = await parcelas_collection.find(query).to_list(100)
    if not parcelas:
        raise HTTPException(status_code=404, detail="No se encontraron parcelas asociadas a este contrato. Crea primero una parcela con el mismo proveedor, cultivo y campana.")

    parcela_id = str(parcelas[0]["_id"])
    campana = contrato.get("campana")

    # Call existing generation function directly
    return await generar_cuaderno_campo(parcela_id, campana, current_user)


@router.get("/cuaderno-campo/parcelas")
async def get_parcelas_for_cuaderno(
    current_user: dict = Depends(get_current_user)
):
    """Get list of parcelas available for cuaderno generation"""
    parcelas = await parcelas_collection.find({}).to_list(length=500)
    
    result = []
    for p in parcelas:
        result.append({
            "_id": str(p["_id"]),
            "codigo_plantacion": p.get("codigo_plantacion", ""),
            "cultivo": p.get("cultivo", ""),
            "superficie_total": p.get("superficie_total", 0),
            "campana": p.get("campana", "")
        })
    
    return {"parcelas": result}


@router.get("/cuaderno-campo/generar/{parcela_id}")
async def generar_cuaderno_campo(
    parcela_id: str,
    campana: Optional[str] = Query(None, description="Campaña (ej: 2025/26)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate Cuaderno de Campo PDF for a specific parcela.

    Este endpoint delega en el generador de PDF de la Hoja de Evaluacion para
    que el documento sea IDENTICO al de la seccion Evaluaciones. Busca una
    evaluacion existente para la parcela+campana; si no existe, crea una
    evaluacion transiente (borrable si se desea).
    """
    # Validar parcela
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de parcela invalido")
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")

    campana_filtro = campana or parcela.get("campana", datetime.now().strftime("%Y/%y"))

    # Buscar evaluacion existente para parcela+campana (ordenar por mas reciente)
    query = {"parcela_id": parcela_id}
    if campana_filtro:
        query["campana"] = campana_filtro
    ev = await evaluaciones_collection.find_one(query, sort=[("created_at", -1)])
    # Fallback si no coincide la campaña — buscar cualquier evaluacion de la parcela
    if not ev:
        ev = await evaluaciones_collection.find_one({"parcela_id": parcela_id}, sort=[("created_at", -1)])

    created_transient = False
    if not ev:
        # Crear evaluacion transiente para poder generar el PDF con el mismo formato
        transient = {
            "parcela_id": parcela_id,
            "campana": campana_filtro,
            "codigo_plantacion": parcela.get("codigo_plantacion", ""),
            "fecha_inicio": datetime.now().strftime("%Y-%m-%d"),
            "estado": "borrador",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": str(current_user.get("_id", "")),
            "_transient": True,
        }
        result = await evaluaciones_collection.insert_one(transient)
        ev = await evaluaciones_collection.find_one({"_id": result.inserted_id})
        created_transient = True

    # Delegar en el generador oficial de la Hoja de Evaluacion
    try:
        from routes_evaluaciones import generate_evaluacion_pdf as _gen_pdf
        response = await _gen_pdf(str(ev["_id"]), current_user)
        return response
    finally:
        # Limpieza de evaluacion transiente si la creamos aqui (no dejamos basura)
        if created_transient and ev:
            try:
                await evaluaciones_collection.delete_one({"_id": ev["_id"]})
            except Exception:
                pass


# ============================================================================
# ENVIO POR EMAIL DEL CUADERNO DE CAMPO
# ============================================================================

async def _get_or_create_transient_evaluacion(parcela_id: str, campana: Optional[str], current_user: dict):
    """Obtiene una evaluacion existente para la parcela+campana o crea una transiente.
    Devuelve (ev_doc, created_transient_bool).
    """
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de parcela invalido")
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")

    campana_filtro = campana or parcela.get("campana", datetime.now().strftime("%Y/%y"))
    query = {"parcela_id": parcela_id}
    if campana_filtro:
        query["campana"] = campana_filtro
    ev = await evaluaciones_collection.find_one(query, sort=[("created_at", -1)])
    if not ev:
        ev = await evaluaciones_collection.find_one({"parcela_id": parcela_id}, sort=[("created_at", -1)])
    if ev:
        return ev, False, parcela
    transient = {
        "parcela_id": parcela_id,
        "campana": campana_filtro,
        "codigo_plantacion": parcela.get("codigo_plantacion", ""),
        "fecha_inicio": datetime.now().strftime("%Y-%m-%d"),
        "estado": "borrador",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "created_by": str(current_user.get("_id", "")),
        "_transient": True,
    }
    result = await evaluaciones_collection.insert_one(transient)
    ev = await evaluaciones_collection.find_one({"_id": result.inserted_id})
    return ev, True, parcela


@router.get("/cuaderno-campo/{parcela_id}/email-suggestion")
async def suggest_cuaderno_email_recipients(
    parcela_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Sugiere destinatarios de email a partir del proveedor de la parcela."""
    from routes_evaluaciones import _extract_emails_from_proveedor
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de parcela invalido")
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")

    proveedor_id_str = parcela.get("proveedor_id")
    proveedor_nombre = parcela.get("proveedor")
    proveedores_col = db["proveedores"]
    proveedor_doc = None
    if proveedor_id_str and ObjectId.is_valid(proveedor_id_str):
        proveedor_doc = await proveedores_col.find_one({"_id": ObjectId(proveedor_id_str)})
    if not proveedor_doc and proveedor_nombre:
        proveedor_doc = await proveedores_col.find_one({"nombre": proveedor_nombre})
    emails = _extract_emails_from_proveedor(proveedor_doc)
    return {
        "parcela_id": parcela_id,
        "proveedor_id": str(proveedor_doc["_id"]) if proveedor_doc else None,
        "proveedor_nombre": (proveedor_doc or {}).get("nombre") if proveedor_doc else proveedor_nombre,
        "emails": emails,
        "has_email": bool(emails),
    }


@router.post("/cuaderno-campo/{parcela_id}/email")
async def send_cuaderno_by_email(
    parcela_id: str,
    payload: dict,
    campana: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Envia el PDF del Cuaderno de Campo (formato Hoja de Evaluacion) por email.

    Body: { recipients: [...], cc?: [...], subject?, message? }
    """
    from routes_evaluaciones import send_evaluacion_by_email
    ev, created_transient, _parcela = await _get_or_create_transient_evaluacion(parcela_id, campana, current_user)
    try:
        return await send_evaluacion_by_email(str(ev["_id"]), payload, current_user)
    finally:
        if created_transient and ev:
            try:
                await evaluaciones_collection.delete_one({"_id": ev["_id"]})
            except Exception:
                pass



@router.get("/cuaderno-campo/preview/{parcela_id}")
async def preview_cuaderno_campo(
    parcela_id: str,
    campana: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Get preview data for cuaderno de campo without generating PDF.
    Useful for showing summary before download.
    """
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de parcela inválido")
    
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    
    campana_filtro = campana or parcela.get("campana", "")
    
    # Count related records
    num_tratamientos = await tratamientos_collection.count_documents({
        "parcelas_ids": parcela_id,
        "campana": campana_filtro
    }) if campana_filtro else await tratamientos_collection.count_documents({"parcelas_ids": parcela_id})
    
    num_irrigaciones = await irrigaciones_collection.count_documents({"parcela_id": parcela_id})
    num_visitas = await visitas_collection.count_documents({"parcela_id": parcela_id})
    num_cosechas = await cosechas_collection.count_documents({"parcela_id": parcela_id})
    
    return {
        "success": True,
        "parcela": {
            "_id": str(parcela["_id"]),
            "codigo_plantacion": parcela.get("codigo_plantacion", ""),
            "cultivo": parcela.get("cultivo", ""),
            "superficie_total": parcela.get("superficie_total", 0),
            "campana": campana_filtro
        },
        "resumen": {
            "tratamientos": num_tratamientos,
            "irrigaciones": num_irrigaciones,
            "visitas": num_visitas,
            "cosechas": num_cosechas,
            "total_registros": num_tratamientos + num_irrigaciones + num_visitas + num_cosechas
        }
    }
