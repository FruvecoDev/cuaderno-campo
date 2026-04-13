import React from 'react';
import { Settings, X, ChevronUp, ChevronDown, Save, RotateCcw } from 'lucide-react';

const ColumnConfigModal = ({
  show, onClose, columns, setColumns, onSave, onReset, title
}) => {
  if (!show) return null;

  const moveUp = (idx) => {
    if (idx === 0) return;
    const u = [...columns];
    [u[idx - 1], u[idx]] = [u[idx], u[idx - 1]];
    setColumns(u);
  };

  const moveDown = (idx) => {
    if (idx === columns.length - 1) return;
    const u = [...columns];
    [u[idx], u[idx + 1]] = [u[idx + 1], u[idx]];
    setColumns(u);
  };

  const toggle = (idx) => {
    const u = [...columns];
    u[idx] = { ...u[idx], visible: !u[idx].visible };
    setColumns(u);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: '480px', width: '90%', maxHeight: '80vh', overflow: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()} data-testid="modal-config-columnas">
        <div id="config-columns-header" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={22} style={{ color: '#1976d2' }} />
            {title || 'Configurar Columnas'}
          </h2>
          <button onClick={onClose} className="config-modal-close-btn"><X size={18} /></button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>Activa o desactiva columnas y reordenalas con las flechas.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {columns.map((col, idx) => (
            <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', backgroundColor: col.visible ? 'hsl(var(--primary) / 0.06)' : '#f5f5f5', border: col.visible ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid #e5e5e5', transition: 'all 0.15s ease' }} data-testid={`col-config-${col.id}`}>
              <input type="checkbox" checked={col.visible} onChange={() => toggle(idx)} style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))' }} />
              <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: col.visible ? '500' : '400', color: col.visible ? 'hsl(var(--foreground))' : '#999' }}>{col.label}</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ all: 'unset', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#ccc' : '#666' }}><ChevronUp size={16} /></button>
                <button onClick={() => moveDown(idx)} disabled={idx === columns.length - 1} style={{ all: 'unset', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', cursor: idx === columns.length - 1 ? 'default' : 'pointer', color: idx === columns.length - 1 ? '#ccc' : '#666' }}><ChevronDown size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
          <div className="config-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onReset} className="config-action-btn config-action-restore"><RotateCcw size={14} /> Restaurar</button>
            <button onClick={onClose} className="config-action-btn config-action-cancel">Cancelar</button>
            <button onClick={onSave} className="config-action-btn config-action-save"><Save size={14} /> Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnConfigModal;
