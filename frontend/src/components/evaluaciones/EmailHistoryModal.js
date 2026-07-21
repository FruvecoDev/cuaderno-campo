import React, { useEffect, useState } from 'react';
import { X, History, Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import api from '../../services/api';
import { formatDateTimeDMY } from '../../utils/dateFormat';

/**
 * Modal de historial de emails enviados.
 * Props:
 *   - show: bool
 *   - title: string (default: "Historial de envíos por email")
 *   - queryUrl: string  (endpoint GET que devuelve { logs: [...] }).
 *   - onClose: fn
 */
const EmailHistoryModal = ({
  show,
  queryUrl,
  title = 'Historial de envíos por email',
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!show || !queryUrl) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(queryUrl);
        if (!cancelled) setLogs(data.logs || []);
      } catch (err) {
        console.error('[EmailHistoryModal] fetch failed', err);
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [show, queryUrl]);

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: '1rem', backdropFilter: 'blur(4px)',
      }}
      data-testid="email-history-modal-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '12px', width: '100%', maxWidth: '900px',
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
              <History size={18} style={{ color: 'hsl(210 92% 50%)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>
                {loading ? 'Cargando...' : `${logs.length} envío(s) registrado(s)`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="config-modal-close-btn" data-testid="email-history-close-btn">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.5rem' }}>
              <Loader2 size={18} className="animate-spin" /> Cargando historial...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
              <Mail size={48} style={{ margin: '0 auto 1rem', opacity: 0.35 }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>No hay envíos registrados</h3>
              <p style={{ fontSize: '0.85rem' }}>Cuando envíes un email, aparecerá aquí.</p>
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'hsl(var(--muted) / 0.4)' }}>
                  <th style={{ padding: '0.6rem', textAlign: 'left', width: '30px' }}></th>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Fecha</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Destinatarios</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Asunto</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left' }}>Enviado por</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                    data-testid={`email-log-${log._id}`}
                  >
                    <td style={{ padding: '0.6rem', verticalAlign: 'top' }}>
                      {log.status === 'success' ? (
                        <CheckCircle2 size={16} style={{ color: 'hsl(142 76% 36%)' }} title="Enviado correctamente" />
                      ) : (
                        <XCircle size={16} style={{ color: 'hsl(0 84% 60%)' }} title={log.error_message || 'Error'} />
                      )}
                    </td>
                    <td style={{ padding: '0.6rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {formatDateTimeDMY(log.sent_at)}
                    </td>
                    <td style={{ padding: '0.6rem', verticalAlign: 'top' }}>
                      <div>{(log.recipients || []).join(', ')}</div>
                      {log.cc && log.cc.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
                          CC: {log.cc.join(', ')}
                        </div>
                      )}
                      {log.proveedor_nombre && (
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
                          Proveedor: {log.proveedor_nombre}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem', verticalAlign: 'top' }}>
                      <div>{log.subject}</div>
                      {log.filename && (
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
                          📎 {log.filename}
                        </div>
                      )}
                      {log.status === 'error' && log.error_message && (
                        <div style={{ fontSize: '0.75rem', color: 'hsl(0 84% 60%)', marginTop: '0.2rem' }}>
                          ⚠ {log.error_message}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      {log.sent_by_name || log.sent_by_email || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{
          padding: '0.75rem 1.5rem', borderTop: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default EmailHistoryModal;
