"""
Cuaderno de Campo Inteligente - Field Notebook Generation
Generates comprehensive PDF reports with all activities for a parcel/contract campaign
"""

import os
import json
import base64
from io import BytesIO
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
from weasyprint import HTML, CSS

# OpenAI integration - direct without emergentintegrations
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None

from database import (
    parcelas_collection, contratos_collection, tratamientos_collection,
    irrigaciones_collection, visitas_collection, cosechas_collection,
    fincas_collection, evaluaciones_collection, maquinaria_collection,
    db, serialize_doc, serialize_docs
)
from routes_auth import get_current_user

router = APIRouter(tags=["cuaderno-campo"])

# Get API Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Collection for tecnicos aplicadores
tecnicos_aplicadores_collection = db['tecnicos_aplicadores']


def get_image_as_base64(file_path: str) -> Optional[str]:
    """Convert an image file to base64 data URI for embedding in HTML"""
    if not file_path or not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, 'rb') as f:
            image_data = f.read()
        
        # Determine mime type from extension
        ext = file_path.lower().split('.')[-1]
        mime_types = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'pdf': 'application/pdf'
        }
        mime_type = mime_types.get(ext, 'image/jpeg')
        
        # Convert to base64
        b64_data = base64.b64encode(image_data).decode('utf-8')
        return f"data:{mime_type};base64,{b64_data}"
    except Exception as e:
        print(f"Error reading image {file_path}: {e}")
        return None


class CuadernoCampoRequest(BaseModel):
    """Request model for field notebook generation"""
    parcela_id: Optional[str] = None
    contrato_id: Optional[str] = None
    campana: Optional[str] = None
    include_ai_summary: bool = True


async def gather_parcela_data(parcela_id: str, campana: Optional[str] = None) -> dict:
    """Gather all data related to a parcel"""
    parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    
    # Get related finca
    finca = None
    if parcela.get("finca_id"):
        finca = await fincas_collection.find_one({"_id": ObjectId(parcela["finca_id"])})
    
    # Build query filters
    parcela_str = str(parcela["_id"])
    
    # Get visitas
    visitas_query = {"parcela_id": parcela_str}
    if campana:
        visitas_query["campana"] = campana
    visitas = await visitas_collection.find(visitas_query).sort("fecha", 1).to_list(500)
    
    # Get tratamientos
    tratamientos_query = {"parcelas_ids": parcela_str}
    if campana:
        tratamientos_query["campana"] = campana
    tratamientos = await tratamientos_collection.find(tratamientos_query).sort("fecha_aplicacion", 1).to_list(500)
    
    # Get irrigaciones
    irrigaciones_query = {"parcela_id": parcela_str}
    if campana:
        irrigaciones_query["campana"] = campana
    irrigaciones = await irrigaciones_collection.find(irrigaciones_query).sort("fecha", 1).to_list(500)
    
    # Get cosechas
    cosechas_query = {"parcelas_ids": parcela_str}
    cosechas = await cosechas_collection.find(cosechas_query).sort("fecha", 1).to_list(100)
    
    # Get evaluaciones
    evaluaciones_query = {"parcela_id": parcela_str}
    evaluaciones = await evaluaciones_collection.find(evaluaciones_query).sort("fecha_inicio", 1).to_list(100)
    
    # Get contrato if exists
    contrato = None
    if parcela.get("contrato_id"):
        contrato = await contratos_collection.find_one({"_id": ObjectId(parcela["contrato_id"])})
    
    return {
        "parcela": serialize_doc(parcela),
        "finca": serialize_doc(finca) if finca else None,
        "contrato": serialize_doc(contrato) if contrato else None,
        "visitas": serialize_docs(visitas),
        "tratamientos": serialize_docs(tratamientos),
        "irrigaciones": serialize_docs(irrigaciones),
        "cosechas": serialize_docs(cosechas),
        "evaluaciones": serialize_docs(evaluaciones),
        "campana": campana or parcela.get("campana", "N/A")
    }


async def gather_contrato_data(contrato_id: str) -> dict:
    """Gather all data related to a contract and its parcels"""
    contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    campana = contrato.get("campana")
    
    # Get all parcelas for this contract
    parcelas_ids = contrato.get("parcelas_ids", [])
    parcelas_data = []
    
    all_visitas = []
    all_tratamientos = []
    all_irrigaciones = []
    all_cosechas = []
    all_evaluaciones = []
    
    for pid in parcelas_ids:
        try:
            parcela = await parcelas_collection.find_one({"_id": ObjectId(pid)})
            if parcela:
                parcelas_data.append(serialize_doc(parcela))
                
                # Gather data for each parcel
                visitas = await visitas_collection.find({
                    "parcela_id": pid,
                    "campana": campana
                }).to_list(100)
                all_visitas.extend(serialize_docs(visitas))
                
                tratamientos = await tratamientos_collection.find({
                    "parcelas_ids": pid,
                    "campana": campana
                }).to_list(100)
                all_tratamientos.extend(serialize_docs(tratamientos))
                
                irrigaciones = await irrigaciones_collection.find({
                    "parcela_id": pid,
                    "campana": campana
                }).to_list(100)
                all_irrigaciones.extend(serialize_docs(irrigaciones))
                
                cosechas = await cosechas_collection.find({
                    "parcelas_ids": pid
                }).to_list(50)
                all_cosechas.extend(serialize_docs(cosechas))
                
                evaluaciones = await evaluaciones_collection.find({
                    "parcela_id": pid
                }).to_list(50)
                all_evaluaciones.extend(serialize_docs(evaluaciones))
        except Exception:
            continue
    
    # Remove duplicates (same treatment can be in multiple parcels)
    seen_tratamientos = set()
    unique_tratamientos = []
    for t in all_tratamientos:
        if t.get("_id") not in seen_tratamientos:
            seen_tratamientos.add(t.get("_id"))
            unique_tratamientos.append(t)
    
    return {
        "contrato": serialize_doc(contrato),
        "parcelas": parcelas_data,
        "visitas": all_visitas,
        "tratamientos": unique_tratamientos,
        "irrigaciones": all_irrigaciones,
        "cosechas": all_cosechas,
        "evaluaciones": all_evaluaciones,
        "campana": campana
    }


async def generate_ai_summary(data: dict) -> str:
    """Generate AI-powered summary of the field notebook"""
    if not EMERGENT_LLM_KEY:
        return "<p><em>Resumen IA no disponible - API key no configurada</em></p>"
    
    try:
        # Prepare summary data
        parcela = data.get("parcela") or (data.get("parcelas", [{}])[0] if data.get("parcelas") else {})
        contrato = data.get("contrato", {})
        
        summary_data = {
            "cultivo": parcela.get("cultivo", "N/A"),
            "variedad": parcela.get("variedad", "N/A"),
            "superficie": parcela.get("superficie_total", 0),
            "campana": data.get("campana", "N/A"),
            "num_visitas": len(data.get("visitas", [])),
            "num_tratamientos": len(data.get("tratamientos", [])),
            "num_irrigaciones": len(data.get("irrigaciones", [])),
            "num_cosechas": len(data.get("cosechas", [])),
            "produccion_total": sum(c.get("cantidad", 0) for c in data.get("cosechas", [])),
        }
        
        # Calculate treatment costs
        total_coste_tratamientos = sum(
            float(t.get("coste_total", 0) or 0) 
            for t in data.get("tratamientos", [])
        )
        summary_data["coste_tratamientos"] = total_coste_tratamientos
        
        # Get irrigation volume
        total_agua = sum(
            float(i.get("cantidad", 0) or 0) 
            for i in data.get("irrigaciones", [])
        )
        summary_data["total_agua_m3"] = total_agua
        
        # Get issues from visits
        incidencias = [
            v.get("observaciones", "") 
            for v in data.get("visitas", []) 
            if v.get("tipo") == "incidencia" or "problema" in v.get("observaciones", "").lower()
        ]
        summary_data["incidencias"] = incidencias[:5]  # Top 5
        
        prompt = f"""Eres un agrónomo experto. Genera un RESUMEN EJECUTIVO del cuaderno de campo con los siguientes datos:

DATOS DEL CULTIVO:
- Cultivo: {summary_data['cultivo']}
- Variedad: {summary_data['variedad']}
- Superficie: {summary_data['superficie']} ha
- Campaña: {summary_data['campana']}

ACTIVIDADES REGISTRADAS:
- Visitas realizadas: {summary_data['num_visitas']}
- Tratamientos aplicados: {summary_data['num_tratamientos']}
- Riegos registrados: {summary_data['num_irrigaciones']}
- Cosechas: {summary_data['num_cosechas']}

MÉTRICAS:
- Producción total: {summary_data['produccion_total']} kg
- Coste tratamientos: {summary_data['coste_tratamientos']:.2f} €
- Agua utilizada: {summary_data['total_agua_m3']:.2f} m³

INCIDENCIAS DESTACADAS:
{json.dumps(summary_data['incidencias'], ensure_ascii=False)}

GENERA UN RESUMEN EN HTML (sin etiquetas html/body, solo el contenido) que incluya:
1. Valoración general de la campaña (2-3 líneas)
2. Puntos fuertes observados
3. Áreas de mejora
4. Recomendaciones para la próxima campaña

Usa etiquetas <h4>, <p>, <ul>, <li> para estructurar. Sé conciso y directo."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"cuaderno-summary-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message="Eres un agrónomo experto especializado en análisis de campañas agrícolas y generación de informes."
        )
        chat.with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return response if response else "<p>Error generando resumen</p>"
        
    except Exception as e:
        return f"<p><em>Error generando resumen IA: {str(e)}</em></p>"


def generate_html_cuaderno(data: dict, ai_summary: str = "", maquinaria_images: dict = None, tecnicos_images: dict = None) -> str:
    """Generate HTML content for the field notebook"""
    parcela = data.get("parcela") or (data.get("parcelas", [{}])[0] if data.get("parcelas") else {})
    contrato = data.get("contrato", {})
    finca = data.get("finca", {})
    campana = data.get("campana", "N/A")
    
    # Initialize image dicts if not provided
    maquinaria_images = maquinaria_images or {}
    tecnicos_images = tecnicos_images or {}
    
    # Format dates helper
    def format_date(date_str):
        if not date_str:
            return "N/A"
        if isinstance(date_str, str):
            try:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00")).strftime("%d/%m/%Y")
            except Exception:
                return date_str[:10] if len(date_str) >= 10 else date_str
        return str(date_str)
    
    # Start HTML
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Cuaderno de Campo - {parcela.get('codigo_plantacion', 'N/A')}</title>
        <style>
            @page {{
                size: A4;
                margin: 1.5cm;
            }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 10pt;
                line-height: 1.4;
                color: #333;
            }}
            .header {{
                text-align: center;
                border-bottom: 3px solid #2e7d32;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            .header h1 {{
                color: #2e7d32;
                margin: 0;
                font-size: 24pt;
            }}
            .header .subtitle {{
                color: #666;
                font-size: 12pt;
                margin-top: 5px;
            }}
            .section {{
                margin-bottom: 20px;
                page-break-inside: avoid;
            }}
            .section-title {{
                background: #2e7d32;
                color: white;
                padding: 8px 15px;
                font-size: 12pt;
                font-weight: bold;
                margin-bottom: 10px;
                border-radius: 4px;
            }}
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }}
            .info-box {{
                background: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                border-left: 4px solid #2e7d32;
            }}
            .info-box label {{
                font-weight: bold;
                color: #666;
                font-size: 9pt;
                display: block;
                margin-bottom: 3px;
            }}
            .info-box .value {{
                font-size: 11pt;
                color: #333;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 9pt;
            }}
            th {{
                background: #e8f5e9;
                color: #2e7d32;
                padding: 8px;
                text-align: left;
                border-bottom: 2px solid #2e7d32;
            }}
            td {{
                padding: 6px 8px;
                border-bottom: 1px solid #ddd;
            }}
            tr:nth-child(even) {{
                background: #f9f9f9;
            }}
            .summary-box {{
                background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #a5d6a7;
            }}
            .summary-box h3 {{
                color: #2e7d32;
                margin-top: 0;
            }}
            .stats-row {{
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 15px;
            }}
            .stat-card {{
                background: white;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                flex: 1;
                min-width: 100px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .stat-card .number {{
                font-size: 20pt;
                font-weight: bold;
                color: #2e7d32;
            }}
            .stat-card .label {{
                font-size: 8pt;
                color: #666;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                font-size: 8pt;
                color: #999;
                text-align: center;
            }}
            .ai-summary {{
                background: #fff3e0;
                border: 1px solid #ffb74d;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }}
            .ai-summary h3 {{
                color: #e65100;
                margin-top: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .ai-badge {{
                background: #e65100;
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 8pt;
            }}
            .no-data {{
                color: #999;
                font-style: italic;
                padding: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>CUADERNO DE CAMPO</h1>
            <div class="subtitle">Campaña {campana} | {parcela.get('cultivo', 'N/A')} - {parcela.get('variedad', 'N/A')}</div>
            <div class="subtitle">Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
        </div>
    """
    
    # Statistics Summary
    num_visitas = len(data.get("visitas", []))
    num_tratamientos = len(data.get("tratamientos", []))
    num_irrigaciones = len(data.get("irrigaciones", []))
    num_cosechas = len(data.get("cosechas", []))
    produccion_total = sum(c.get("cantidad", 0) or 0 for c in data.get("cosechas", []))
    
    html += f"""
        <div class="stats-row">
            <div class="stat-card">
                <div class="number">{num_visitas}</div>
                <div class="label">Visitas</div>
            </div>
            <div class="stat-card">
                <div class="number">{num_tratamientos}</div>
                <div class="label">Tratamientos</div>
            </div>
            <div class="stat-card">
                <div class="number">{num_irrigaciones}</div>
                <div class="label">Riegos</div>
            </div>
            <div class="stat-card">
                <div class="number">{num_cosechas}</div>
                <div class="label">Cosechas</div>
            </div>
            <div class="stat-card">
                <div class="number">{produccion_total:,.0f}</div>
                <div class="label">Kg Producidos</div>
            </div>
        </div>
    """
    
    # AI Summary Section
    if ai_summary:
        html += f"""
        <div class="ai-summary">
            <h3><span class="ai-badge">IA</span> Resumen Inteligente</h3>
            {ai_summary}
        </div>
        """
    
    # Parcel/Contract Info
    html += """
        <div class="section">
            <div class="section-title">📋 Información General</div>
            <div class="info-grid">
    """
    
    if contrato:
        html += f"""
                <div class="info-box">
                    <label>Contrato</label>
                    <div class="value">{contrato.get('nombre', 'N/A')}</div>
                </div>
        """
    
    html += f"""
                <div class="info-box">
                    <label>Código Plantación</label>
                    <div class="value">{parcela.get('codigo_plantacion', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Proveedor</label>
                    <div class="value">{parcela.get('proveedor', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Finca</label>
                    <div class="value">{finca.get('nombre', parcela.get('finca', 'N/A')) if finca else parcela.get('finca', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Cultivo / Variedad</label>
                    <div class="value">{parcela.get('cultivo', 'N/A')} / {parcela.get('variedad', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Superficie Total</label>
                    <div class="value">{parcela.get('superficie_total', 0)} ha</div>
                </div>
                <div class="info-box">
                    <label>Municipio / Provincia</label>
                    <div class="value">{parcela.get('municipio', 'N/A')} / {parcela.get('provincia', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Campaña</label>
                    <div class="value">{campana}</div>
                </div>
            </div>
        </div>
    """
    
    # Maquinaria Asociada Section - Extract from tratamientos
    tratamientos_data = data.get("tratamientos", [])
    maquinaria_usada = {}
    tecnicos_usados = {}
    
    for t in tratamientos_data:
        # Recopilar maquinaria
        maquina_nombre = t.get('maquina_nombre')
        maquina_id = t.get('maquina_id')
        if not maquina_nombre:
            maquinaria_data = t.get('maquinaria')
            if maquinaria_data and isinstance(maquinaria_data, dict):
                maquina_nombre = f"{maquinaria_data.get('tipo', '')} {maquinaria_data.get('modelo', '')}".strip()
        
        if maquina_nombre and maquina_nombre != 'N/A':
            if maquina_nombre not in maquinaria_usada:
                maquinaria_usada[maquina_nombre] = {
                    'nombre': maquina_nombre,
                    'id': maquina_id,
                    'usos': 0,
                    'fechas': []
                }
            maquinaria_usada[maquina_nombre]['usos'] += 1
            fecha = t.get('fecha_aplicacion') or t.get('fecha_tratamiento')
            if fecha:
                maquinaria_usada[maquina_nombre]['fechas'].append(fecha)
        
        # Recopilar técnicos aplicadores
        aplicador = t.get('aplicador_nombre') or t.get('tecnico')
        aplicador_id = t.get('tecnico_aplicador_id')
        if isinstance(aplicador, dict):
            aplicador = f"{aplicador.get('nombre', '')} {aplicador.get('apellidos', '')}".strip()
        
        if aplicador and aplicador != 'N/A':
            if aplicador not in tecnicos_usados:
                tecnicos_usados[aplicador] = {
                    'nombre': aplicador,
                    'id': aplicador_id,
                    'aplicaciones': 0
                }
            tecnicos_usados[aplicador]['aplicaciones'] += 1
    
    # Mostrar sección de Maquinaria y Técnicos si hay datos
    if maquinaria_usada or tecnicos_usados:
        html += """
        <div class="section">
            <div class="section-title">🚜 Maquinaria y Personal Asociado</div>
        """
        
        if maquinaria_usada:
            html += """
            <h4 style="margin: 10px 0 5px 0; color: #2e7d32;">Maquinaria Utilizada</h4>
            <table>
                <thead>
                    <tr>
                        <th>Máquina</th>
                        <th>Nº de Usos</th>
                        <th>Última Utilización</th>
                        <th style="width: 120px;">Placa CE</th>
                    </tr>
                </thead>
                <tbody>
            """
            for maq in sorted(maquinaria_usada.values(), key=lambda x: x['usos'], reverse=True):
                ultima_fecha = max(maq['fechas']) if maq['fechas'] else 'N/A'
                if ultima_fecha != 'N/A':
                    ultima_fecha = format_date(ultima_fecha)
                
                # Get image if available
                maq_id = maq.get('id')
                placa_ce_html = '<span style="color: #999;">Sin imagen</span>'
                if maq_id and maq_id in maquinaria_images:
                    img_data = maquinaria_images[maq_id]
                    if img_data:
                        placa_ce_html = f'<img src="{img_data}" style="max-width: 100px; max-height: 60px; border: 1px solid #ddd; border-radius: 4px;" alt="Placa CE" />'
                
                html += f"""
                    <tr>
                        <td><strong>{maq['nombre']}</strong></td>
                        <td style="text-align: center;">{maq['usos']}</td>
                        <td>{ultima_fecha}</td>
                        <td style="text-align: center;">{placa_ce_html}</td>
                    </tr>
                """
            html += """
                </tbody>
            </table>
            """
        
        if tecnicos_usados:
            html += """
            <h4 style="margin: 15px 0 5px 0; color: #2e7d32;">Técnicos Aplicadores</h4>
            <table>
                <thead>
                    <tr>
                        <th>Técnico Aplicador</th>
                        <th>Nº de Aplicaciones</th>
                        <th style="width: 120px;">Certificado</th>
                    </tr>
                </thead>
                <tbody>
            """
            for tec in sorted(tecnicos_usados.values(), key=lambda x: x['aplicaciones'], reverse=True):
                # Get certificate image if available
                tec_id = tec.get('id')
                cert_html = '<span style="color: #999;">Sin imagen</span>'
                if tec_id and tec_id in tecnicos_images:
                    img_data = tecnicos_images[tec_id]
                    if img_data:
                        cert_html = f'<img src="{img_data}" style="max-width: 100px; max-height: 60px; border: 1px solid #ddd; border-radius: 4px;" alt="Certificado" />'
                
                html += f"""
                    <tr>
                        <td><strong>{tec['nombre']}</strong></td>
                        <td style="text-align: center;">{tec['aplicaciones']}</td>
                        <td style="text-align: center;">{cert_html}</td>
                    </tr>
                """
            html += """
                </tbody>
            </table>
            """
        
        html += "</div>"
    
    # Visitas Section
    visitas = data.get("visitas", [])
    html += """
        <div class="section">
            <div class="section-title">📅 Registro de Visitas</div>
    """
    if visitas:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Técnico</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
        """
        for v in visitas:
            html += f"""
                    <tr>
                        <td>{format_date(v.get('fecha'))}</td>
                        <td>{v.get('tipo', 'N/A')}</td>
                        <td>{v.get('tecnico', 'N/A')}</td>
                        <td>{v.get('observaciones', '')[:100]}{'...' if len(v.get('observaciones', '')) > 100 else ''}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay visitas registradas</p>'
    html += "</div>"
    
    # Tratamientos Section
    tratamientos = data.get("tratamientos", [])
    html += """
        <div class="section">
            <div class="section-title">💊 Tratamientos Fitosanitarios</div>
    """
    if tratamientos:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Productos</th>
                        <th>Superficie</th>
                        <th>Técnico Aplicador</th>
                        <th>Máquina</th>
                    </tr>
                </thead>
                <tbody>
        """
        for t in tratamientos:
            # Obtener nombre del aplicador (nuevo campo o legacy)
            aplicador = t.get('aplicador_nombre') or t.get('tecnico') or 'N/A'
            if isinstance(aplicador, dict):
                aplicador = f"{aplicador.get('nombre', '')} {aplicador.get('apellidos', '')}".strip() or 'N/A'
            
            # Obtener nombre de la máquina
            maquina = t.get('maquina_nombre') or 'N/A'
            if not maquina or maquina == 'N/A':
                maquinaria_data = t.get('maquinaria')
                if maquinaria_data and isinstance(maquinaria_data, dict):
                    maquina = f"{maquinaria_data.get('tipo', '')} {maquinaria_data.get('modelo', '')}".strip() or 'N/A'
            
            # Obtener productos
            productos = t.get('productos', [])
            productos_str = 'N/A'
            if productos:
                productos_list = []
                for p in productos:
                    nombre = p.get('nombre_comercial', p.get('nombre', ''))
                    dosis = p.get('dosis_superficie', p.get('dosis', ''))
                    unidad = p.get('unidad_medida', '')
                    if nombre:
                        productos_list.append(f"{nombre} ({dosis} {unidad})".strip())
                productos_str = ', '.join(productos_list) if productos_list else 'N/A'
            elif t.get('producto'):
                productos_str = f"{t.get('producto')} ({t.get('dosis', '')} {t.get('unidad_dosis', '')})".strip()
            
            # Tipo de tratamiento
            tipo = t.get('tipo_tratamiento', t.get('tipo', 'N/A'))
            subtipo = t.get('subtipo', '')
            tipo_display = f"{tipo}" + (f" - {subtipo}" if subtipo else "")
            
            # Superficie
            superficie = t.get('superficie_aplicacion', t.get('superficie', 'N/A'))
            
            html += f"""
                    <tr>
                        <td>{format_date(t.get('fecha_aplicacion') or t.get('fecha_tratamiento'))}</td>
                        <td>{tipo_display}</td>
                        <td style="max-width: 200px; word-wrap: break-word;">{productos_str}</td>
                        <td>{superficie} ha</td>
                        <td><strong>{aplicador}</strong></td>
                        <td><strong>{maquina}</strong></td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay tratamientos registrados</p>'
    html += "</div>"
    
    # Irrigaciones Section
    irrigaciones = data.get("irrigaciones", [])
    html += """
        <div class="section">
            <div class="section-title">💧 Registro de Riegos</div>
    """
    if irrigaciones:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Sistema</th>
                        <th>Cantidad (m³)</th>
                        <th>Duración</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
        """
        for i in irrigaciones:
            html += f"""
                    <tr>
                        <td>{format_date(i.get('fecha'))}</td>
                        <td>{i.get('sistema', 'N/A')}</td>
                        <td>{i.get('cantidad', 0)}</td>
                        <td>{i.get('duracion', 'N/A')} {i.get('unidad_duracion', 'min')}</td>
                        <td>{i.get('observaciones', '')[:80]}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay riegos registrados</p>'
    html += "</div>"
    
    # Cosechas Section
    cosechas = data.get("cosechas", [])
    html += """
        <div class="section">
            <div class="section-title">🌾 Registro de Cosechas</div>
    """
    if cosechas:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cantidad (kg)</th>
                        <th>Calidad</th>
                        <th>Destino</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
        """
        for c in cosechas:
            html += f"""
                    <tr>
                        <td>{format_date(c.get('fecha'))}</td>
                        <td>{c.get('cantidad', 0):,.0f}</td>
                        <td>{c.get('calidad', 'N/A')}</td>
                        <td>{c.get('destino', 'N/A')}</td>
                        <td>{c.get('observaciones', '')[:80]}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay cosechas registradas</p>'
    html += "</div>"
    
    # Evaluaciones Section
    evaluaciones = data.get("evaluaciones", [])
    if evaluaciones:
        html += """
            <div class="section">
                <div class="section-title">📝 Evaluaciones</div>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th>Técnico</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        for e in evaluaciones:
            html += f"""
                        <tr>
                            <td>{format_date(e.get('fecha_inicio'))}</td>
                            <td>{format_date(e.get('fecha_fin'))}</td>
                            <td>{e.get('tecnico', 'N/A')}</td>
                            <td>{e.get('estado', 'borrador')}</td>
                        </tr>
            """
        html += """
                    </tbody>
                </table>
            </div>
        """
    
    # Footer
    html += f"""
        <div class="footer">
            <p>Cuaderno de Campo generado automáticamente por FRUVECO - Sistema de Gestión Agrícola</p>
            <p>Este documento certifica las actividades registradas durante la campaña {campana}</p>
        </div>
    </body>
    </html>
    """
    
    return html


@router.post("/api/cuaderno-campo/generar")
async def generar_cuaderno_campo(
    request: CuadernoCampoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a comprehensive Field Notebook PDF for a parcel or contract
    """
    try:
        # Gather data based on request type
        if request.contrato_id:
            if not ObjectId.is_valid(request.contrato_id):
                raise HTTPException(status_code=400, detail="ID de contrato inválido")
            data = await gather_contrato_data(request.contrato_id)
        elif request.parcela_id:
            if not ObjectId.is_valid(request.parcela_id):
                raise HTTPException(status_code=400, detail="ID de parcela inválido")
            data = await gather_parcela_data(request.parcela_id, request.campana)
        else:
            raise HTTPException(status_code=400, detail="Debe especificar parcela_id o contrato_id")
        
        # Generate AI summary if requested
        ai_summary = ""
        if request.include_ai_summary:
            ai_summary = await generate_ai_summary(data)
        
        # Preload images for maquinaria and tecnicos from tratamientos
        maquinaria_images = {}
        tecnicos_images = {}
        tratamientos = data.get("tratamientos", [])
        
        # Collect unique IDs
        maquina_ids = set()
        tecnico_ids = set()
        for t in tratamientos:
            if t.get('maquina_id'):
                maquina_ids.add(t.get('maquina_id'))
            if t.get('tecnico_aplicador_id'):
                tecnico_ids.add(t.get('tecnico_aplicador_id'))
        
        # Load maquinaria images
        for maq_id in maquina_ids:
            if ObjectId.is_valid(maq_id):
                maq = await maquinaria_collection.find_one({"_id": ObjectId(maq_id)})
                if maq and maq.get('imagen_placa_ce_url'):
                    img_data = get_image_as_base64(maq['imagen_placa_ce_url'])
                    if img_data:
                        maquinaria_images[maq_id] = img_data
        
        # Load tecnicos images
        for tec_id in tecnico_ids:
            if ObjectId.is_valid(tec_id):
                tec = await tecnicos_aplicadores_collection.find_one({"_id": ObjectId(tec_id)})
                if tec and tec.get('imagen_certificado_url'):
                    img_data = get_image_as_base64(tec['imagen_certificado_url'])
                    if img_data:
                        tecnicos_images[tec_id] = img_data
        
        # Generate HTML with images
        html_content = generate_html_cuaderno(data, ai_summary, maquinaria_images, tecnicos_images)
        
        # Generate PDF
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        # Generate filename
        parcela = data.get("parcela") or (data.get("parcelas", [{}])[0] if data.get("parcelas") else {})
        campana = data.get("campana", "N/A")
        codigo = parcela.get("codigo_plantacion", "parcela").replace(" ", "_")
        filename = f"Cuaderno_Campo_{codigo}_{campana}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando cuaderno de campo: {str(e)}")


@router.get("/api/cuaderno-campo/preview/{parcela_id}")
async def preview_cuaderno_campo(
    parcela_id: str,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get preview data for a field notebook (without generating PDF)
    """
    try:
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail="ID de parcela inválido")
        
        data = await gather_parcela_data(parcela_id, campana)
        
        # Return summary data
        return {
            "success": True,
            "preview": {
                "parcela": data.get("parcela", {}),
                "campana": data.get("campana"),
                "estadisticas": {
                    "visitas": len(data.get("visitas", [])),
                    "tratamientos": len(data.get("tratamientos", [])),
                    "irrigaciones": len(data.get("irrigaciones", [])),
                    "cosechas": len(data.get("cosechas", [])),
                    "evaluaciones": len(data.get("evaluaciones", [])),
                    "produccion_total": sum(c.get("cantidad", 0) or 0 for c in data.get("cosechas", []))
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo preview: {str(e)}")
