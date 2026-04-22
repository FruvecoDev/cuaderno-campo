"""
Albaranes de Comisión.

Documento contable que representa la comisión devengada por un agente (comprador
o vendedor) a partir de un albarán origen (compra o venta) cuyo contrato incluye
un comisionista.

Regla de negocio:
    1 albarán origen con comisionista = 1 albarán de comisión (ACM-XXXXXX).

La colección subyacente es `comisiones_generadas` — la misma que alimenta a
`Comisiones Generadas` y `Liquidación de Comisiones`. Aquí sólo añadimos:
  - numero_albaran_comision (auto-incremental ACM-000001)
  - endpoints dedicados (list, regenerate, pdf)

El registro ya se crea automáticamente desde `routes_extended.py` cuando se
guarda un albarán que tiene contrato con agente.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from bson import ObjectId
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from database import db, serialize_doc
from rbac_guards import (
    RequireAlbaranesAccess,
    RequireEdit,
    get_current_user,
)
from utils.formatters import format_number_es


router = APIRouter(prefix="/api/albaranes-comision", tags=["albaranes-comision"])

comisiones_collection = db["comisiones_generadas"]
albaranes_collection = db["albaranes"]
contratos_collection = db["contratos"]
agentes_collection = db["agentes"]
proveedores_collection = db["proveedores"]
clientes_collection = db["clientes"]


# ---------------------------------------------------------------------------
# Utilidades internas
# ---------------------------------------------------------------------------

async def _next_numero_acm() -> str:
    """Genera el siguiente numero ACM-000001 buscando el maximo existente."""
    last = await comisiones_collection.find_one(
        {"numero_albaran_comision": {"$regex": "^ACM-"}},
        sort=[("numero_albaran_comision", -1)],
        projection={"_id": 0, "numero_albaran_comision": 1},
    )
    if last and last.get("numero_albaran_comision"):
        try:
            num = int(last["numero_albaran_comision"].split("-")[1])
            return f"ACM-{num + 1:06d}"
        except (IndexError, ValueError):
            pass
    return "ACM-000001"


async def _ensure_numero_acm(comision_doc: dict) -> Optional[str]:
    """Asigna un numero ACM si aun no lo tiene. Devuelve el numero final."""
    if comision_doc.get("numero_albaran_comision"):
        return comision_doc["numero_albaran_comision"]
    numero = await _next_numero_acm()
    await comisiones_collection.update_one(
        {"_id": comision_doc["_id"]},
        {"$set": {"numero_albaran_comision": numero}},
    )
    return numero


def _calc_importe_comision(tipo: str, valor: float, kilos: float, precio_kg: float) -> float:
    valor = float(valor or 0)
    kilos = float(kilos or 0)
    precio_kg = float(precio_kg or 0)
    if tipo == "porcentaje":
        return round(kilos * precio_kg * (valor / 100.0), 2)
    if tipo in ("fijo", "fijo_por_kg", "eur_por_kg", "euros_por_kg"):
        return round(kilos * valor, 2)
    return 0.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
async def list_albaranes_comision(
    agente_id: Optional[str] = None,
    tipo_agente: Optional[str] = None,  # "compra" / "venta"
    estado: Optional[str] = None,
    campana: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(RequireAlbaranesAccess),
):
    """Lista albaranes de comisión con filtros."""
    query: dict = {}
    if agente_id:
        query["agente_id"] = agente_id
    if tipo_agente:
        query["tipo_agente"] = tipo_agente
    if estado:
        query["estado"] = estado
    if campana:
        query["campana"] = campana
    if fecha_desde or fecha_hasta:
        date_filter: dict = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        query["fecha_albaran"] = date_filter
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"numero_albaran_comision": regex},
            {"numero_albaran": regex},
            {"agente_nombre": regex},
            {"proveedor_nombre": regex},
            {"cliente_nombre": regex},
            {"cultivo": regex},
        ]

    cursor = comisiones_collection.find(query).sort("fecha_albaran", -1)
    docs: List[dict] = []
    contratos_cache: dict = {}
    async for doc in cursor:
        numero = await _ensure_numero_acm(doc)  # idempotente: asigna si falta
        if numero:
            doc["numero_albaran_comision"] = numero
        # Resolver contrato_numero si aun no esta poblado
        if not doc.get("contrato_numero") and doc.get("contrato_id"):
            cid = doc["contrato_id"]
            if cid not in contratos_cache:
                contratos_cache[cid] = None
                if ObjectId.is_valid(cid):
                    cdoc = await contratos_collection.find_one(
                        {"_id": ObjectId(cid)},
                        {"_id": 0, "numero_contrato": 1, "numero": 1, "codigo": 1}
                    )
                    if cdoc:
                        contratos_cache[cid] = (
                            cdoc.get("numero_contrato")
                            or cdoc.get("numero")
                            or cdoc.get("codigo")
                        )
            if contratos_cache.get(cid):
                doc["contrato_numero"] = contratos_cache[cid]
        docs.append(serialize_doc(doc))

    # Totales
    total_importe_comision = sum(float(d.get("comision_importe") or 0) for d in docs)
    total_kilos = sum(float(d.get("kilos_netos") or 0) for d in docs)
    pendiente = sum(float(d.get("comision_importe") or 0) for d in docs if d.get("estado") == "pendiente")
    pagada = sum(float(d.get("comision_importe") or 0) for d in docs if d.get("estado") == "pagada")

    return {
        "albaranes": docs,
        "totales": {
            "count": len(docs),
            "kilos_netos": total_kilos,
            "importe_total": round(total_importe_comision, 2),
            "pendiente": round(pendiente, 2),
            "pagada": round(pagada, 2),
        },
    }


@router.get("/resumen-pdf")
async def factura_resumen_pdf_route(
    agente_id: str = Query(..., description="Agente a facturar"),
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    current_user: dict = Depends(RequireAlbaranesAccess),
):
    return await factura_resumen_pdf(
        agente_id=agente_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        estado=estado,
        current_user=current_user,
    )


@router.get("/{acm_id}")
async def get_albaran_comision(
    acm_id: str,
    current_user: dict = Depends(RequireAlbaranesAccess),
):
    if not ObjectId.is_valid(acm_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    doc = await comisiones_collection.find_one({"_id": ObjectId(acm_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Albarán de comisión no encontrado")
    await _ensure_numero_acm(doc)
    doc = await comisiones_collection.find_one({"_id": ObjectId(acm_id)})
    return serialize_doc(doc)


@router.post("/regenerar")
async def regenerar_albaranes_comision(
    solo_faltantes: bool = True,
    current_user: dict = Depends(RequireEdit),
):
    """
    Recorre todos los albaranes que tengan contrato y comisionista y asegura
    que exista su albarán de comisión correspondiente.

    - solo_faltantes=True (default): solo crea los que faltan. No recalcula los
      existentes para no perder ajustes manuales de estado.
    - solo_faltantes=False: borra los existentes (solo estado=pendiente, para no
      tocar los ya pagados) y recrea.
    """
    creados = 0
    actualizados = 0
    saltados = 0
    errores: List[str] = []

    async for alb in albaranes_collection.find({
        "contrato_id": {"$exists": True, "$nin": [None, ""]}
    }):
        try:
            albaran_id = str(alb["_id"])
            contrato_id = alb.get("contrato_id")
            if not contrato_id or not ObjectId.is_valid(contrato_id):
                saltados += 1
                continue

            contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
            if not contrato:
                saltados += 1
                continue

            tipo_albaran = (alb.get("tipo_albaran") or alb.get("tipo") or "").strip()
            es_compra = tipo_albaran in ("Compra", "Entrada", "Albarán de compra")
            es_venta = tipo_albaran in ("Venta", "Salida", "Albarán de venta")

            if es_compra and contrato.get("agente_compra"):
                agente_id = contrato["agente_compra"]
                tipo_comision = contrato.get("comision_compra_tipo") or contrato.get("comision_tipo")
                valor_comision = contrato.get("comision_compra_valor") or contrato.get("comision_valor") or 0
                tipo_agente = "compra"
            elif es_venta and contrato.get("agente_venta"):
                agente_id = contrato["agente_venta"]
                tipo_comision = contrato.get("comision_venta_tipo")
                valor_comision = contrato.get("comision_venta_valor") or 0
                tipo_agente = "venta"
            else:
                saltados += 1
                continue

            if not agente_id or float(valor_comision or 0) <= 0:
                saltados += 1
                continue

            # ¿Ya existe una comisión para este albarán?
            existing = await comisiones_collection.find_one({"albaran_id": albaran_id})

            kilos_netos = float(alb.get("kilos_netos") or 0)
            if kilos_netos <= 0:
                kilos_netos = sum(
                    (i.get("cantidad") or 0)
                    for i in alb.get("items", [])
                    if not i.get("es_destare")
                )
            importe_albaran = float(alb.get("total_albaran") or 0)
            precio_kg = importe_albaran / kilos_netos if kilos_netos > 0 else 0
            importe_comision = _calc_importe_comision(tipo_comision, valor_comision, kilos_netos, precio_kg)

            if importe_comision <= 0:
                saltados += 1
                continue

            # Resolver nombres
            agente_doc = None
            if ObjectId.is_valid(agente_id):
                agente_doc = await agentes_collection.find_one({"_id": ObjectId(agente_id)})
            agente_nombre = (agente_doc or {}).get("nombre") or (existing or {}).get("agente_nombre") or "Agente"

            proveedor_nombre = None
            cliente_nombre = None
            if tipo_agente == "compra":
                prov = alb.get("proveedor")
                if prov:
                    if ObjectId.is_valid(prov):
                        p = await proveedores_collection.find_one({"_id": ObjectId(prov)})
                        proveedor_nombre = (p or {}).get("nombre", prov)
                    else:
                        proveedor_nombre = prov
            else:
                cli = alb.get("cliente")
                if cli:
                    if ObjectId.is_valid(cli):
                        c = await clientes_collection.find_one({"_id": ObjectId(cli)})
                        cliente_nombre = (c or {}).get("nombre", cli)
                    else:
                        cliente_nombre = cli

            numero_albaran = alb.get("numero_albaran") or f"ALB-{albaran_id[-6:].upper()}"

            if existing:
                if solo_faltantes:
                    # Asegurar que al menos tiene número ACM
                    await _ensure_numero_acm(existing)
                    saltados += 1
                    continue
                # Regenerar SOLO si está pendiente (no tocar pagadas)
                if existing.get("estado") != "pendiente":
                    saltados += 1
                    continue
                await comisiones_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "kilos_netos": kilos_netos,
                        "precio_kg": round(precio_kg, 4),
                        "comision_tipo": tipo_comision,
                        "comision_valor": valor_comision,
                        "comision_importe": importe_comision,
                        "agente_nombre": agente_nombre,
                        "proveedor_nombre": proveedor_nombre,
                        "cliente_nombre": cliente_nombre,
                        "updated_at": datetime.now(timezone.utc),
                    }},
                )
                await _ensure_numero_acm(existing)
                actualizados += 1
                continue

            numero_acm = await _next_numero_acm()
            record = {
                "numero_albaran_comision": numero_acm,
                "albaran_id": albaran_id,
                "numero_albaran": numero_albaran,
                "contrato_id": contrato_id,
                "contrato_numero": (
                    contrato.get("numero_contrato")
                    or contrato.get("numero")
                    or contrato.get("codigo")
                ),
                "agente_id": agente_id,
                "agente_nombre": agente_nombre,
                "tipo_agente": tipo_agente,
                "fecha_albaran": alb.get("fecha_albaran") or alb.get("fecha") or "",
                "campana": alb.get("campana") or contrato.get("campana"),
                "proveedor": alb.get("proveedor") if tipo_agente == "compra" else None,
                "proveedor_nombre": proveedor_nombre,
                "cliente": alb.get("cliente") if tipo_agente == "venta" else None,
                "cliente_nombre": cliente_nombre,
                "cultivo": alb.get("cultivo") or contrato.get("cultivo"),
                "kilos_brutos": float(alb.get("kilos_brutos") or 0),
                "kilos_destare": float(alb.get("kilos_destare") or 0),
                "kilos_netos": kilos_netos,
                "precio_kg": round(precio_kg, 4),
                "comision_tipo": tipo_comision,
                "comision_valor": valor_comision,
                "comision_importe": importe_comision,
                "estado": "pendiente",
                "created_at": datetime.now(timezone.utc),
                "created_by": current_user.get("email", "regenerar"),
            }
            await comisiones_collection.insert_one(record)
            creados += 1
        except Exception as e:  # noqa: BLE001
            errores.append(f"Albarán {alb.get('_id')}: {e}")

    return {
        "success": True,
        "creados": creados,
        "actualizados": actualizados,
        "saltados": saltados,
        "errores": errores[:20],
    }


@router.get("/{acm_id}/pdf")
async def albaran_comision_pdf(
    acm_id: str,
    current_user: dict = Depends(RequireAlbaranesAccess),
):
    if not ObjectId.is_valid(acm_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    doc = await comisiones_collection.find_one({"_id": ObjectId(acm_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="No encontrado")

    numero_acm = await _ensure_numero_acm(doc)
    doc["numero_albaran_comision"] = numero_acm

    # Resolver contrato_numero si no está poblado
    if not doc.get("contrato_numero") and doc.get("contrato_id") and ObjectId.is_valid(doc["contrato_id"]):
        cdoc = await contratos_collection.find_one(
            {"_id": ObjectId(doc["contrato_id"])},
            {"_id": 0, "numero_contrato": 1, "numero": 1, "codigo": 1}
        )
        if cdoc:
            doc["contrato_numero"] = (
                cdoc.get("numero_contrato")
                or cdoc.get("numero")
                or cdoc.get("codigo")
            )

    buf = io.BytesIO()
    pdf = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=f"Albarán de Comisión {numero_acm}",
    )
    styles = getSampleStyleSheet()

    title = ParagraphStyle(
        "acm_title",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#1e40af"),
        alignment=0,
        spaceAfter=2,
    )
    subtitle = ParagraphStyle(
        "acm_sub",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
    )
    section = ParagraphStyle(
        "acm_section",
        parent=styles["Heading3"],
        fontSize=10,
        textColor=colors.white,
        backColor=colors.HexColor("#1e40af"),
        leftIndent=0,
        spaceBefore=6,
        spaceAfter=6,
        leading=14,
        borderPadding=4,
    )

    elements: list = []
    elements.append(Paragraph("ALBARÁN DE COMISIÓN", title))
    elements.append(Paragraph(f"Nº <b>{numero_acm}</b>", subtitle))
    elements.append(Paragraph(
        f"Fecha del albarán origen: {doc.get('fecha_albaran') or '-'}",
        subtitle,
    ))
    elements.append(Spacer(1, 8))

    # Emisor / Receptor
    emisor = "<b>EMISOR</b><br/>FRUVECO Frozen Foods<br/>"
    receptor = (
        f"<b>RECEPTOR (Agente)</b><br/>"
        f"{doc.get('agente_nombre', '-')}<br/>"
        f"Tipo: Agente de {doc.get('tipo_agente', '').capitalize() or '-'}"
    )
    hdr_table = Table(
        [[Paragraph(emisor, styles["Normal"]), Paragraph(receptor, styles["Normal"])]],
        colWidths=[90 * mm, 90 * mm],
    )
    hdr_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f9fafb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(hdr_table)
    elements.append(Spacer(1, 10))

    # Detalle del albarán origen
    elements.append(Paragraph("&nbsp;DATOS DEL ALBARÁN ORIGEN", section))
    partner_label = "Proveedor" if doc.get("tipo_agente") == "compra" else "Cliente"
    partner_name = doc.get("proveedor_nombre") or doc.get("cliente_nombre") or "-"
    info_rows = [
        ["Nº Albarán origen", doc.get("numero_albaran") or "-", "Contrato", doc.get("contrato_numero") or doc.get("contrato_id") or "-"],
        [partner_label, partner_name, "Cultivo", doc.get("cultivo") or "-"],
        ["Campaña", doc.get("campana") or "-", "Tipo", doc.get("tipo_agente", "").capitalize() or "-"],
    ]
    info_table = Table(info_rows, colWidths=[35 * mm, 55 * mm, 30 * mm, 60 * mm])
    info_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(info_table)

    # Linea de comision
    elements.append(Paragraph("&nbsp;LÍNEA DE COMISIÓN", section))
    tipo_label = (
        f"{format_number_es(doc.get('comision_valor') or 0)} %"
        if doc.get("comision_tipo") == "porcentaje"
        else f"{format_number_es(doc.get('comision_valor') or 0, 4)} €/kg"
    )
    line_rows = [
        ["Kilos Netos", "Precio (€/kg)", "Importe Albarán origen (€)", "Comisión", "Importe Comisión (€)"],
        [
            format_number_es(doc.get("kilos_netos") or 0, 0),
            format_number_es(doc.get("precio_kg") or 0, 4),
            format_number_es(
                (float(doc.get("kilos_netos") or 0) * float(doc.get("precio_kg") or 0)),
                2,
            ),
            tipo_label,
            format_number_es(doc.get("comision_importe") or 0, 2),
        ],
    ]
    line_table = Table(line_rows, colWidths=[30 * mm, 30 * mm, 45 * mm, 35 * mm, 40 * mm])
    line_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (-1, 1), (-1, 1), colors.HexColor("#d1fae5")),
        ("FONTNAME", (-1, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (-1, 1), (-1, 1), colors.HexColor("#065f46")),
    ]))
    elements.append(line_table)

    # Total destacado
    elements.append(Spacer(1, 12))
    total_table = Table(
        [[
            Paragraph("<b>TOTAL A LIQUIDAR AL AGENTE</b>", styles["Normal"]),
            Paragraph(
                f"<b>{format_number_es(doc.get('comision_importe') or 0, 2)} €</b>",
                ParagraphStyle("tot", parent=styles["Normal"], alignment=2, fontSize=14),
            ),
        ]],
        colWidths=[120 * mm, 60 * mm],
    )
    total_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.2, colors.HexColor("#065f46")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#d1fae5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(total_table)

    # Pie - estado
    elements.append(Spacer(1, 12))
    estado_txt = (doc.get("estado") or "pendiente").upper()
    estado_color = {
        "PAGADA": "#10b981",
        "PENDIENTE": "#f59e0b",
        "ANULADA": "#ef4444",
    }.get(estado_txt, "#6b7280")
    elements.append(Paragraph(
        f'<font color="{estado_color}"><b>Estado: {estado_txt}</b></font>',
        subtitle,
    ))
    elements.append(Paragraph(
        f"Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        subtitle,
    ))

    pdf.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="albaran_comision_{numero_acm}.pdf"'
        },
    )


# ---------------------------------------------------------------------------
# Factura-Resumen mensual (agrupada por agente + periodo)
# ---------------------------------------------------------------------------

async def factura_resumen_pdf(
    agente_id: str = Query(..., description="Agente a facturar"),
    fecha_desde: Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_hasta: Optional[str] = Query(None, description="YYYY-MM-DD"),
    estado: Optional[str] = Query(None, description="pendiente / pagada / anulada"),
    current_user: dict = Depends(RequireAlbaranesAccess),
):
    """
    Factura-resumen de un agente en un periodo:
    un único PDF con todas las líneas ACM agrupadas.
    """
    query: dict = {"agente_id": agente_id}
    if fecha_desde or fecha_hasta:
        date_filter: dict = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        query["fecha_albaran"] = date_filter
    if estado:
        query["estado"] = estado

    cursor = comisiones_collection.find(query).sort("fecha_albaran", 1)
    rows: List[dict] = []
    async for doc in cursor:
        numero = await _ensure_numero_acm(doc)
        if numero:
            doc["numero_albaran_comision"] = numero
        rows.append(doc)

    if not rows:
        raise HTTPException(status_code=404, detail="No hay albaranes de comisión en este periodo")

    agente_nombre = rows[0].get("agente_nombre") or "Agente"
    tipo_agente = rows[0].get("tipo_agente") or ""
    total_kilos = sum(float(r.get("kilos_netos") or 0) for r in rows)
    total_importe = sum(float(r.get("comision_importe") or 0) for r in rows)

    buf = io.BytesIO()
    pdf = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        title=f"Factura Resumen {agente_nombre}",
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "fr_title", parent=styles["Heading1"], fontSize=16,
        textColor=colors.HexColor("#1e40af"), spaceAfter=2,
    )
    subtitle = ParagraphStyle(
        "fr_sub", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#6b7280"),
    )

    elements: list = []
    elements.append(Paragraph("FACTURA RESUMEN DE COMISIONES", title))
    periodo_label = (
        f"{fecha_desde or '—'} → {fecha_hasta or 'Hoy'}"
        if (fecha_desde or fecha_hasta) else "Todo el histórico"
    )
    elements.append(Paragraph(
        f"<b>Agente:</b> {agente_nombre} &nbsp;&nbsp; "
        f"<b>Tipo:</b> {tipo_agente.capitalize()} &nbsp;&nbsp; "
        f"<b>Periodo:</b> {periodo_label} &nbsp;&nbsp; "
        f"<b>Líneas:</b> {len(rows)}",
        subtitle,
    ))
    elements.append(Spacer(1, 10))

    # Tabla de lineas
    header = [
        "Nº ACM", "Fecha", "Albarán origen", "Cultivo",
        "Kg Netos", "€/kg", "Comisión", "Importe (€)", "Estado",
    ]
    data = [header]
    for r in rows:
        comision_lbl = (
            f"{format_number_es(r.get('comision_valor') or 0)} %"
            if r.get("comision_tipo") == "porcentaje"
            else f"{format_number_es(r.get('comision_valor') or 0, 4)} €/kg"
        )
        data.append([
            r.get("numero_albaran_comision") or "-",
            r.get("fecha_albaran") or "-",
            r.get("numero_albaran") or "-",
            (r.get("cultivo") or "-")[:14],
            format_number_es(r.get("kilos_netos") or 0, 0),
            format_number_es(r.get("precio_kg") or 0, 4),
            comision_lbl,
            format_number_es(r.get("comision_importe") or 0, 2),
            (r.get("estado") or "-").capitalize(),
        ])

    # Fila total
    data.append([
        "", "", "", "TOTAL",
        format_number_es(total_kilos, 0), "", "",
        format_number_es(total_importe, 2), "",
    ])

    col_widths = [24*mm, 21*mm, 24*mm, 24*mm, 20*mm, 15*mm, 20*mm, 22*mm, 20*mm]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#d1d5db")),
        ("ALIGN", (4, 1), (7, -1), "RIGHT"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f9fafb")]),
        # Fila total
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#d1fae5")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.HexColor("#065f46")),
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, colors.HexColor("#065f46")),
    ]))
    elements.append(table)

    elements.append(Spacer(1, 14))
    # Cuadro total destacado
    total_box = Table([[
        Paragraph("<b>TOTAL A LIQUIDAR AL AGENTE</b>", styles["Normal"]),
        Paragraph(
            f"<b>{format_number_es(total_importe, 2)} €</b>",
            ParagraphStyle("tb", parent=styles["Normal"], alignment=2, fontSize=15),
        ),
    ]], colWidths=[130 * mm, 60 * mm])
    total_box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1.2, colors.HexColor("#065f46")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#d1fae5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(total_box)

    elements.append(Spacer(1, 10))
    elements.append(Paragraph(
        f"Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        subtitle,
    ))

    pdf.build(elements)
    buf.seek(0)
    safe_nombre = "".join(ch if ch.isalnum() else "_" for ch in agente_nombre)[:40]
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="factura_resumen_{safe_nombre}_{fecha_desde or "inicio"}_{fecha_hasta or "hoy"}.pdf"'
        },
    )
