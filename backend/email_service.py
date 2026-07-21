"""
Email Service for FRUVECO - Cuaderno de Campo
Handles email notifications for visits, treatments, and other farm activities.
Uses SMTP (Office 365 compatible) via aiosmtplib for async delivery.
"""

import os
import logging
import ssl
from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import List, Optional, Iterable, Union

import aiosmtplib
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SMTP configuration (Office 365 defaults)
#   SMTP_HOST=smtp.office365.com
#   SMTP_PORT=587           (STARTTLS)
#   SMTP_USERNAME=user@fruveco.com
#   SMTP_PASSWORD=***
#   SMTP_FROM_EMAIL=user@fruveco.com     (opcional, default=SMTP_USERNAME)
#   SMTP_FROM_NAME="FRUVECO Notificaciones"
#   SMTP_USE_TLS=starttls   (starttls|ssl|none)  default: starttls
# ---------------------------------------------------------------------------
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or "587")
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL") or SMTP_USERNAME
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "FRUVECO")
SMTP_USE_TLS = (os.environ.get("SMTP_USE_TLS", "starttls") or "starttls").lower()

# Backwards compat: alguas rutas leen SENDER_EMAIL directamente.
SENDER_EMAIL = SMTP_FROM_EMAIL

APP_NAME = "FRUVECO - Cuaderno de Campo"


def _is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD and SMTP_FROM_EMAIL)


def get_email_template(title: str, content: str, footer_text: str = "") -> str:
    """Generate a styled HTML email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #2d5a27 0%, #4CAF50 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{APP_NAME}</h1>
                            </td>
                        </tr>
                        
                        <!-- Title -->
                        <tr>
                            <td style="padding: 30px 30px 10px 30px;">
                                <h2 style="color: #2d5a27; margin: 0; font-size: 20px;">{title}</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 10px 30px 30px 30px; color: #333333; font-size: 14px; line-height: 1.6;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                                    {footer_text if footer_text else f'Este mensaje fue enviado automáticamente por {APP_NAME}'}
                                </p>
                                <p style="color: #6c757d; font-size: 11px; margin: 10px 0 0 0;">
                                    © {datetime.now().year} FRUVECO Frozen Foods
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_email(
    recipient_email: Union[str, Iterable[str]],
    subject: str,
    html_content: str,
    *,
    text_content: Optional[str] = None,
    attachments: Optional[List[dict]] = None,
    cc: Optional[List[str]] = None,
) -> dict:
    """Enviar email via SMTP (Office 365 compatible, async).

    Args:
        recipient_email: destinatario (str) o lista de destinatarios.
        subject: asunto.
        html_content: cuerpo HTML.
        text_content: cuerpo texto plano opcional (default: strip del HTML).
        attachments: lista de dicts con keys `filename`, `content` (bytes),
                     `content_type` (str, opcional).
        cc: lista de emails en copia.

    Env vars requeridas: SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL.
    Si no hay configuracion, devuelve status=skipped.
    """
    if not _is_smtp_configured():
        logger.warning("SMTP no configurado (SMTP_HOST/USERNAME/PASSWORD faltan). Email no enviado.")
        return {"status": "skipped", "message": "SMTP service not configured"}

    if isinstance(recipient_email, str):
        recipients = [recipient_email]
    else:
        recipients = list(recipient_email)
    if not recipients:
        return {"status": "error", "message": "No recipient provided"}

    msg = EmailMessage()
    from_display = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>" if SMTP_FROM_NAME else SMTP_FROM_EMAIL
    msg["From"] = from_display
    msg["To"] = ", ".join(recipients)
    if cc:
        msg["Cc"] = ", ".join(cc)
    msg["Subject"] = subject
    msg.set_content(text_content or "Este correo contiene contenido HTML.")
    msg.add_alternative(html_content, subtype="html")

    for att in attachments or []:
        try:
            data = att["content"]
            if isinstance(data, str):
                data = data.encode("utf-8")
            ctype = att.get("content_type") or "application/octet-stream"
            maintype, _, subtype = ctype.partition("/")
            msg.add_attachment(
                data,
                maintype=maintype or "application",
                subtype=subtype or "octet-stream",
                filename=att.get("filename", "adjunto"),
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Error agregando adjunto '%s': %s", att.get("filename"), exc)

    tls_ctx = ssl.create_default_context()
    to_addrs = list(recipients) + list(cc or [])

    try:
        if SMTP_USE_TLS == "ssl":
            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USERNAME,
                password=SMTP_PASSWORD,
                use_tls=True,
                tls_context=tls_ctx,
                recipients=to_addrs,
                timeout=30,
            )
        elif SMTP_USE_TLS == "none":
            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USERNAME,
                password=SMTP_PASSWORD,
                use_tls=False,
                start_tls=False,
                recipients=to_addrs,
                timeout=30,
            )
        else:  # starttls (default)
            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USERNAME,
                password=SMTP_PASSWORD,
                start_tls=True,
                tls_context=tls_ctx,
                recipients=to_addrs,
                timeout=30,
            )
        logger.info("Email SMTP enviado a %s (subject=%s)", to_addrs, subject)
        return {
            "status": "success",
            "message": f"Email sent to {', '.join(recipients)}",
            "email_id": msg.get("Message-ID"),
        }
    except Exception as exc:
        logger.error("Fallo envio SMTP a %s: %s", to_addrs, exc, exc_info=True)
        return {"status": "error", "message": str(exc)}


async def send_visit_reminder(
    recipient_email: str,
    visita: dict,
    dias_restantes: int
) -> dict:
    """Send a reminder email for an upcoming visit"""
    
    fecha_visita = visita.get("fecha_planificada", "")
    if fecha_visita:
        try:
            fecha_obj = datetime.fromisoformat(fecha_visita.replace('Z', '+00:00'))
            fecha_formateada = fecha_obj.strftime("%d de %B de %Y")
        except:
            fecha_formateada = fecha_visita
    else:
        fecha_formateada = "Fecha no especificada"
    
    urgencia = ""
    if dias_restantes == 0:
        urgencia = "⚠️ <strong style='color: #dc2626;'>¡HOY!</strong>"
        subject = f"🔴 URGENTE: Visita programada para HOY - {visita.get('objetivo', 'Visita')}"
    elif dias_restantes == 1:
        urgencia = "⏰ <strong style='color: #f57c00;'>MAÑANA</strong>"
        subject = f"🟠 Recordatorio: Visita programada para MAÑANA - {visita.get('objetivo', 'Visita')}"
    elif dias_restantes <= 3:
        urgencia = f"📅 En {dias_restantes} días"
        subject = f"📅 Recordatorio: Visita próxima - {visita.get('objetivo', 'Visita')}"
    else:
        urgencia = f"📅 En {dias_restantes} días"
        subject = f"📅 Visita planificada - {visita.get('objetivo', 'Visita')}"
    
    content = f"""
    <p>Le recordamos que tiene una visita planificada:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 12px; background-color: #e8f5e9; border-left: 4px solid #4CAF50; font-weight: bold;">
                {urgencia}
            </td>
        </tr>
    </table>
    
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Objetivo:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('objetivo', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Fecha:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{fecha_formateada}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Proveedor:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('proveedor', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Cultivo:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('cultivo', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Parcela:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('codigo_plantacion', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0;"><strong>Observaciones:</strong></td>
            <td style="padding: 10px 0;">{visita.get('observaciones', 'Sin observaciones')}</td>
        </tr>
    </table>
    
    <p style="margin-top: 20px;">
        <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #2d5a27; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Ver en la aplicación
        </a>
    </p>
    """
    
    html = get_email_template(
        title="Recordatorio de Visita",
        content=content,
        footer_text="Recuerde completar la visita y registrar sus observaciones en el sistema."
    )
    
    return await send_email(recipient_email, subject, html)


async def send_daily_visit_summary(
    recipient_email: str,
    visitas: List[dict],
    fecha: str
) -> dict:
    """Send a daily summary of all planned visits"""
    
    if not visitas:
        return {"status": "skipped", "message": "No visits to report"}
    
    visitas_html = ""
    for v in visitas:
        visitas_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('objetivo', '-')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('proveedor', '-')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('cultivo', '-')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('codigo_plantacion', '-')}</td>
        </tr>
        """
    
    content = f"""
    <p>Resumen de visitas planificadas para <strong>{fecha}</strong>:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #2d5a27; color: white;">
            <th style="padding: 12px; text-align: left;">Objetivo</th>
            <th style="padding: 12px; text-align: left;">Proveedor</th>
            <th style="padding: 12px; text-align: left;">Cultivo</th>
            <th style="padding: 12px; text-align: left;">Parcela</th>
        </tr>
        {visitas_html}
    </table>
    
    <p><strong>Total de visitas:</strong> {len(visitas)}</p>
    """
    
    html = get_email_template(
        title=f"Resumen de Visitas - {fecha}",
        content=content
    )
    
    return await send_email(
        recipient_email,
        f"📋 Resumen de visitas para {fecha} ({len(visitas)} visitas)",
        html
    )


async def send_test_email(recipient_email: str) -> dict:
    """Send a test email to verify configuration"""
    
    content = """
    <p>¡Hola!</p>
    <p>Este es un correo de prueba para verificar que el servicio de notificaciones 
    por email está funcionando correctamente.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 15px; background-color: #e8f5e9; border-radius: 6px; text-align: center;">
                ✅ La configuración de email está correcta
            </td>
        </tr>
    </table>
    
    <p>A partir de ahora recibirás notificaciones sobre:</p>
    <ul>
        <li>Visitas próximas programadas</li>
        <li>Resúmenes diarios de actividades</li>
        <li>Alertas importantes del cuaderno de campo</li>
    </ul>
    """
    
    html = get_email_template(
        title="Prueba de Notificaciones",
        content=content,
        footer_text="Este es un mensaje de prueba. Si no solicitaste esta prueba, ignora este correo."
    )
    
    return await send_email(
        recipient_email,
        "✅ Prueba de Notificaciones - FRUVECO",
        html
    )


# ============================================================
# RRHH Email Notifications
# ============================================================

async def send_ausencia_notification(
    recipient_email: str,
    empleado_nombre: str,
    tipo_ausencia: str,
    fecha_inicio: str,
    fecha_fin: str,
    estado: str,
    comentario: str = ""
) -> dict:
    """Envía notificación por email cuando una ausencia es aprobada/rechazada"""
    
    tipo_formatted = tipo_ausencia.replace("_", " ").capitalize()
    
    if estado == "aprobada":
        icon = "✅"
        color = "#10b981"
        titulo = f"Solicitud de {tipo_formatted} Aprobada"
        mensaje_estado = "ha sido <strong style='color: #10b981;'>APROBADA</strong>"
    else:
        icon = "❌"
        color = "#ef4444"
        titulo = f"Solicitud de {tipo_formatted} Rechazada"
        mensaje_estado = "ha sido <strong style='color: #ef4444;'>RECHAZADA</strong>"
    
    content = f"""
    <p>Hola <strong>{empleado_nombre}</strong>,</p>
    
    <p>Tu solicitud de <strong>{tipo_formatted}</strong> {mensaje_estado}.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px;">
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                <strong>Tipo de Ausencia:</strong>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                {tipo_formatted}
            </td>
        </tr>
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                <strong>Fecha Inicio:</strong>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                {fecha_inicio}
            </td>
        </tr>
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                <strong>Fecha Fin:</strong>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                {fecha_fin}
            </td>
        </tr>
        <tr>
            <td style="padding: 15px;">
                <strong>Estado:</strong>
            </td>
            <td style="padding: 15px;">
                <span style="background: {color}20; color: {color}; padding: 5px 12px; border-radius: 20px; font-weight: bold;">
                    {estado.upper()}
                </span>
            </td>
        </tr>
    </table>
    
    {"<p><strong>Comentario:</strong> " + comentario + "</p>" if comentario else ""}
    
    <p style="margin-top: 20px;">
        Puedes ver más detalles en tu <a href="#" style="color: #2d5a27; text-decoration: none; font-weight: bold;">Portal del Empleado</a>.
    </p>
    """
    
    html = get_email_template(
        title=titulo,
        content=content,
        footer_text="Este mensaje fue enviado desde el Portal del Empleado de FRUVECO"
    )
    
    return await send_email(
        recipient_email,
        f"{icon} {titulo} - FRUVECO",
        html
    )


async def send_documento_notification(
    recipient_email: str,
    empleado_nombre: str,
    documento_nombre: str,
    tipo_documento: str,
    requiere_firma: bool
) -> dict:
    """Envía notificación por email cuando se sube un nuevo documento"""
    
    if requiere_firma:
        icon = "📝"
        titulo = "Nuevo Documento Pendiente de Firma"
        mensaje_accion = """
        <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            ⚠️ <strong>Este documento requiere tu firma.</strong> Por favor, accede al Portal del Empleado para firmarlo.
        </p>
        """
    else:
        icon = "📄"
        titulo = "Nuevo Documento Disponible"
        mensaje_accion = ""
    
    content = f"""
    <p>Hola <strong>{empleado_nombre}</strong>,</p>
    
    <p>Se ha subido un nuevo documento a tu expediente:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px;">
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                <strong>Documento:</strong>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                {documento_nombre}
            </td>
        </tr>
        <tr>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                <strong>Tipo:</strong>
            </td>
            <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                {tipo_documento}
            </td>
        </tr>
        <tr>
            <td style="padding: 15px;">
                <strong>Requiere Firma:</strong>
            </td>
            <td style="padding: 15px;">
                <span style="background: {'#fef3c7' if requiere_firma else '#d1fae5'}; color: {'#92400e' if requiere_firma else '#065f46'}; padding: 5px 12px; border-radius: 20px; font-weight: bold;">
                    {'SÍ' if requiere_firma else 'NO'}
                </span>
            </td>
        </tr>
    </table>
    
    {mensaje_accion}
    
    <p style="margin-top: 20px;">
        Puedes ver y descargar el documento desde tu <a href="#" style="color: #2d5a27; text-decoration: none; font-weight: bold;">Portal del Empleado</a>.
    </p>
    """
    
    html = get_email_template(
        title=titulo,
        content=content,
        footer_text="Este mensaje fue enviado desde el Portal del Empleado de FRUVECO"
    )
    
    subject = f"{icon} {titulo}" + (" ⚠️" if requiere_firma else "") + " - FRUVECO"
    
    return await send_email(
        recipient_email,
        subject,
        html
    )
