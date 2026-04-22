import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// Animaciones del modal (inyectadas una sola vez)
if (typeof document !== 'undefined' && !document.getElementById('tabbed-modal-animations')) {
  const style = document.createElement('style');
  style.id = 'tabbed-modal-animations';
  style.textContent = `
@keyframes tabbed-modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tabbed-modal-scale-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.tabbed-modal-overlay { animation: tabbed-modal-fade-in 160ms ease-out; }
.tabbed-modal-card    { animation: tabbed-modal-scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1); }
`;
  document.head.appendChild(style);
}

// Estilo compartido para las <kbd> del footer
const kbdStyle = {
  display: 'inline-block',
  padding: '0.1rem 0.4rem',
  border: '1px solid hsl(var(--border))',
  borderBottomWidth: '2px',
  borderRadius: '4px',
  backgroundColor: 'hsl(var(--muted) / 0.4)',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  fontSize: '0.7rem',
  fontWeight: '600',
  lineHeight: 1,
  color: 'hsl(var(--foreground))',
};

/**
 * Modal tabbed genérico — shell estándar de la app.
 *
 * Props:
 *  - open:         boolean, controla visibilidad.
 *  - onClose:      fn(), se invoca al cerrar (X, overlay click, ESC).
 *  - icon:         React node, icono del header (ej. <Beaker size={20} />).
 *  - iconColor:    string, color del icono (ej. 'hsl(210, 80%, 50%)').
 *  - iconBg:       string, background translúcido del circulo del icono.
 *  - title:        string, título principal.
 *  - subtitle:     string, línea secundaria (dinámica según formData).
 *  - tabs:         [{ key, label, icon }]  lista de pestañas.
 *  - activeTab:    string, pestaña activa.
 *  - onTabChange:  fn(key).
 *  - onSubmit:     fn(e), handler del <form>.
 *  - footer:       React node, acciones (ej. botones Cancelar/Guardar).
 *  - error:        string | null, muestra banner destacado dentro del modal.
 *  - testIdPrefix: string, prefijo para data-testid (tab-<key>, btn-close-modal-<prefix>).
 *  - maxWidth:     number|string, por defecto 960px.
 *  - children:     contenido de las pestañas.
 */
const TabbedModal = ({
  open,
  onClose,
  icon,
  iconColor = 'hsl(var(--primary))',
  iconBg,
  title,
  subtitle,
  tabs = [],
  activeTab,
  onTabChange,
  onSubmit,
  footer,
  error = null,
  testIdPrefix = 'modal',
  maxWidth = 960,
  showShortcutHints = true,
  children,
}) => {
  const formRef = useRef(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const saveKey = isMac ? '⌘' : 'Ctrl';

  // Cierre con ESC y atajo Ctrl/Cmd+S para guardar
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose && onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (formRef.current) {
          if (typeof formRef.current.requestSubmit === 'function') {
            formRef.current.requestSubmit();
          } else {
            formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const bgIcon = iconBg || (iconColor.includes('hsl') && iconColor.includes(')')
    ? iconColor.replace(')', ' / 0.12)')
    : 'hsl(var(--primary) / 0.1)');

  return (
    <div
      data-testid={`${testIdPrefix}-modal-overlay`}
      className="tabbed-modal-overlay"
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)',
      }}
      onClick={() => onClose && onClose()}
    >
      <div
        className="card tabbed-modal-card"
        data-testid={`${testIdPrefix}-modal`}
        style={{
          maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
          width: '100%', height: '85vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', padding: '2rem', borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {icon && (
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: bgIcon, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: iconColor,
              }}>
                {icon}
              </div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{title}</h2>
              {subtitle && (
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                  {subtitle}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="config-modal-close-btn"
            data-testid={`btn-close-modal-${testIdPrefix}`}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {tabs.length > 0 && (
          <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))', overflowX: 'auto' }}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange && onTabChange(tab.key)}
                  data-testid={`tab-${tab.key}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.6rem 1rem', fontSize: '0.8rem',
                    fontWeight: active ? '700' : '500',
                    color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    background: 'none', border: 'none',
                    borderBottom: active ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px',
                  }}
                >
                  {tab.icon}{tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Form / Content */}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <div style={{ flex: 1, overflow: 'auto', paddingRight: '1rem' }}>
            {error && (
              <div
                data-testid={`${testIdPrefix}-modal-error-banner`}
                style={{
                  marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
                  backgroundColor: 'hsl(var(--destructive) / 0.1)',
                  border: '1px solid hsl(var(--destructive) / 0.4)',
                  color: 'hsl(var(--destructive))',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.88rem', fontWeight: '500',
                }}
              >
                <AlertTriangle size={16} /> {error}
              </div>
            )}
            {children}
          </div>

          {/* Footer fijo */}
          {footer && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem',
              paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))', marginTop: '1rem',
            }}>
              <div data-testid={`${testIdPrefix}-modal-shortcut-hints`} style={{
                display: showShortcutHints ? 'flex' : 'none',
                alignItems: 'center', gap: '0.75rem',
                fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))',
                userSelect: 'none', flexWrap: 'wrap',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <kbd style={kbdStyle}>{saveKey}</kbd>
                  <kbd style={kbdStyle}>S</kbd>
                  <span>guardar</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <kbd style={kbdStyle}>Esc</kbd>
                  <span>cerrar</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {footer}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TabbedModal;
