import React, { useEffect, useState } from 'react';
import { X, Mail, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { notify } from '../../lib/notify';

/**
 * Modal de envio de Hoja de Evaluacion por email.
 *
 * Flujo:
 * 1. Al abrirse, consulta /email-suggestion para el evaluacion_id.
 * 2. Muestra los emails del proveedor con etiquetas (Comercial, Admin...)
 *    y checkboxes para elegir cuales usar.
 * 3. Permite agregar destinatarios extra.
 * 4. Sugiere CC con el email del usuario actual (registro interno).
 *
 * Props:
 *   - show: bool
 *   - evaluacionId: string
 *   - currentUserEmail: string (para prefill del CC opcional)
 *   - onClose: fn
 *   - onSent: fn (opcional)
 */
const SendEmailModal = ({ show, evaluacionId, currentUserEmail = '', onClose, onSent }) => {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [suggestion, setSuggestion] = useState({ proveedor_nombre: null, emails: [] });
  const [selectedIds, setSelectedIds] = useState(new Set());  // valores email
  const [extraRecipients, setExtraRecipients] = useState('');
  const [ccRecipients, setCcRecipients] = useState(currentUserEmail || '');
  const [ccMe, setCcMe] = useState(false);
  const [subject, setSubject] = useState('Hoja de Evaluación / Cuaderno de Campo');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!show || !evaluacionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/evaluaciones/${evaluacionId}/email-suggestion`);
        if (cancelled) return;
        setSuggestion(data);
        // Preseleccionar TODOS los emails del proveedor
        setSelectedIds(new Set((data.emails || []).map(e => e.valor)));
      } catch (err) {
        console.error('[SendEmailModal] email-suggestion failed', err);
        setSuggestion({ proveedor_nombre: null, emails: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [show, evaluacionId]);

  // Reset estado cuando se cierra el modal
  useEffect(() => {
    if (!show) {
      setExtraRecipients('');
      setCcRecipients(currentUserEmail || '');
      setCcMe(false);
      setMessage('');
      setSubject('Hoja de Evaluación / Cuaderno de Campo');
    }
  }, [show, currentUserEmail]);

  const toggleEmail = (valor) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(valor)) next.delete(valor);
      else next.add(valor);
      return next;
    });
  };

  const parseEmails = (raw) => (raw || '').split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);

  const buildRecipients = () => {
    const fromProveedor = (suggestion.emails || []).filter(e => selectedIds.has(e.valor)).map(e => e.valor);
    const extras = parseEmails(extraRecipients);
    const all = [...fromProveedor, ...extras];
    // Deduplicar case-insensitive
    const seen = new Set();
    return all.filter(e => {
      const k = e.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const buildCc = () => {
    const base = parseEmails(ccRecipients);
    if (ccMe && currentUserEmail && !base.some(e => e.toLowerCase() === currentUserEmail.toLowerCase())) {
      base.push(currentUserEmail);
    }
    return base;
  };

  const handleSend = async () => {
    const recipients = buildRecipients();
    if (recipients.length === 0) {
      notify.error('Selecciona al menos un destinatario');
      return;
    }
    setSending(true);
    try {
      const cc = buildCc();
      const result = await api.post(`/api/evaluaciones/${evaluacionId}/email`, {
        recipients,
        cc,
        subject: subject || undefined,
        message: message || undefined,
      });
      notify.success(`Email enviado a ${result.recipients?.join(', ') || 'los destinatarios'}` + (cc.length ? ` (CC: ${cc.join(', ')})` : ''));
      if (onSent) onSent(result);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al enviar el email';
      notify.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: '1rem', backdropFilter: 'blur(4px)',
      }}
      data-testid="send-email-modal-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '2px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'hsl(210 92% 50% / 0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={18} style={{ color: 'hsl(210 92% 50%)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Enviar Hoja de Evaluación</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>
                {suggestion.proveedor_nombre ? `Proveedor: ${suggestion.proveedor_nombre}` : 'Sin proveedor asociado'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="config-modal-close-btn" data-testid="send-email-close-btn">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', gap: '0.5rem' }}>
              <Loader2 size={18} className="animate-spin" /> Cargando destinatarios...
            </div>
          ) : (
            <>
              {suggestion.emails.length > 0 ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Contactos del proveedor
                  </label>
                  <div style={{
                    border: '1px solid hsl(var(--border))', borderRadius: '8px',
                    padding: '0.5rem', marginTop: '0.25rem',
                  }}>
                    {suggestion.emails.map(e => (
                      <label
                        key={e.valor}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.4rem 0.5rem', cursor: 'pointer', borderRadius: '4px',
                        }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'hsl(var(--muted) / 0.4)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(e.valor)}
                          onChange={() => toggleEmail(e.valor)}
                          data-testid={`send-email-checkbox-${e.valor}`}
                        />
                        <span style={{ fontSize: '0.85rem', flex: 1 }}>{e.valor}</span>
                        {e.etiqueta && (
                          <span style={{
                            fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '4px',
                            background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))',
                            fontWeight: 600,
                          }}>{e.etiqueta}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '0.75rem 1rem', marginBottom: '1rem',
                  background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.3)',
                  borderRadius: '8px', fontSize: '0.82rem',
                }}>
                  El proveedor no tiene emails registrados. Añade destinatarios manualmente abajo.
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Destinatarios adicionales <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>(separados por coma)</span>
                </label>
                <input
                  type="text" className="form-input"
                  value={extraRecipients}
                  onChange={e => setExtraRecipients(e.target.value)}
                  placeholder="otro@correo.com, tecnico@fruveco.com"
                  data-testid="send-email-extra"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Copia (CC)</span>
                  {currentUserEmail && (
                    <label style={{ fontSize: '0.75rem', fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--muted-foreground))' }}>
                      <input
                        type="checkbox"
                        checked={ccMe}
                        onChange={e => setCcMe(e.target.checked)}
                        data-testid="send-email-cc-me"
                      />
                      Enviarme copia ({currentUserEmail})
                    </label>
                  )}
                </label>
                <input
                  type="text" className="form-input"
                  value={ccRecipients}
                  onChange={e => setCcRecipients(e.target.value)}
                  placeholder="cc@fruveco.com, otro@fruveco.com"
                  data-testid="send-email-cc"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Asunto</label>
                <input
                  type="text" className="form-input"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  data-testid="send-email-subject"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Mensaje personalizado <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>(opcional)</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Se adjunta la Hoja de Evaluación firmada..."
                  data-testid="send-email-message"
                />
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: '0.9rem 1.5rem', borderTop: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
            {loading ? '' : `${buildRecipients().length} destinatario(s) seleccionado(s)`}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={sending}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || loading || buildRecipients().length === 0}
              data-testid="send-email-submit"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {sending ? 'Enviando...' : 'Enviar email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendEmailModal;
