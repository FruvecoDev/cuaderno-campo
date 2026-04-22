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
    
    data = [['Fecha', 'Tipo', 'Técnico', 'Observaciones']]
    
    for v in visitas:
        obs = v.get('observaciones') or '-'
        if len(obs) > 50:
            obs = obs[:47] + '...'
        data.append([
            v.get('fecha') or '-',
            (v.get('tipo_visita') or '-')[:15],
            (v.get('tecnico_nombre') or '-')[:20],
            obs
        ])
    
    table = Table(data, colWidths=[2.5*cm, 3*cm, 3.5*cm, 6*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27ae60')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 1), (3, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
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
            f"{kg_est:,.0f}",
            f"{kg_real:,.0f}",
            rendimiento,
            f"{importe:,.2f} €",
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
        f'Total cosechado: {total_kg:,.0f} kg | Importe total: {total_importe:,.2f} €', 
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
        ['Cosechas', str(data['num_cosechas']), f"Total: {data['kg_total']:,.0f} kg"],
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
    Includes all treatments, irrigations, visits, and harvests.
    """
    # Get parcela
    try:
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    except:
        raise HTTPException(status_code=400, detail="ID de parcela inválido")
    
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    
    # Use provided campana or parcela's campana
    campana_filtro = campana or parcela.get("campana", datetime.now().strftime("%Y/%y"))
    
    # Get related data
    tratamientos = await tratamientos_collection.find({
        "parcelas_ids": parcela_id,
        "campana": campana_filtro
    }).sort("fecha_tratamiento", 1).to_list(length=500)
    
    # Obtener datos completos de los técnicos aplicadores
    tecnicos_ids = [t.get('tecnico_aplicador_id') for t in tratamientos if t.get('tecnico_aplicador_id')]
    tecnicos_ids = [ObjectId(tid) for tid in tecnicos_ids if tid]
    
    tecnicos_dict = {}
    if tecnicos_ids:
        tecnicos_cursor = tecnicos_aplicadores_collection.find({"_id": {"$in": tecnicos_ids}})
        async for tecnico in tecnicos_cursor:
            tecnicos_dict[str(tecnico['_id'])] = tecnico
    
    # Enriquecer tratamientos con datos del técnico
    for t in tratamientos:
        tecnico_id = t.get('tecnico_aplicador_id')
        if tecnico_id and tecnico_id in tecnicos_dict:
            t['tecnico_data'] = tecnicos_dict[tecnico_id]
    
    irrigaciones = await irrigaciones_collection.find({
        "parcela_id": parcela_id
    }).sort("fecha", 1).to_list(length=500)
    
    visitas = await visitas_collection.find({
        "parcela_id": parcela_id
    }).sort("fecha", 1).to_list(length=500)
    
    cosechas = await cosechas_collection.find({
        "parcela_id": parcela_id
    }).sort("fecha_inicio", 1).to_list(length=500)
    
    # Calculate summary data
    summary_data = {
        'num_tratamientos': len(tratamientos),
        'tratamientos_realizados': sum(1 for t in tratamientos if t.get('realizado')),
        'num_riegos': len(irrigaciones),
        'volumen_total': sum(i.get('volumen', 0) or 0 for i in irrigaciones),
        'num_visitas': len(visitas),
        'num_cosechas': len(cosechas),
        'kg_total': sum(c.get('kg_reales', 0) or 0 for c in cosechas),
    }
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )
    
    styles = get_styles()
    elements = []
    
    # Header
    elements.append(create_header_table(parcela, campana_filtro))
    elements.append(Spacer(1, 0.5*cm))
    
    # Summary
    elements.extend(create_resumen_section(summary_data, styles))
    elements.append(Spacer(1, 0.3*cm))
    
    # Tratamientos
    elements.extend(create_tratamientos_table(tratamientos, styles))
    elements.append(Spacer(1, 0.3*cm))
    
    # Irrigaciones
    elements.extend(create_irrigaciones_table(irrigaciones, styles))
    elements.append(Spacer(1, 0.3*cm))
    
    # Visitas
    elements.extend(create_visitas_table(visitas, styles))
    elements.append(Spacer(1, 0.3*cm))
    
    # Cosechas
    elements.extend(create_cosechas_table(cosechas, styles))
    
    # Footer note
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph(
        f'Documento generado automáticamente el {datetime.now().strftime("%d/%m/%Y a las %H:%M")}',
        styles['SmallText']
    ))
    elements.append(Paragraph(
        'Este cuaderno de campo cumple con los requisitos de trazabilidad agrícola.',
        styles['SmallText']
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Generate filename
    codigo = parcela.get('codigo_plantacion', 'parcela').replace(' ', '_')
    filename = f"cuaderno_campo_{codigo}_{campana_filtro.replace('/', '-')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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
