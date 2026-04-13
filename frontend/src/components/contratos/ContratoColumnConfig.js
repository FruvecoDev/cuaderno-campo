import React from 'react';
import { Settings, X, ChevronUp, ChevronDown, Save, RotateCcw } from 'lucide-react';

const ContratoColumnConfig = ({
  show, onClose, columns, setColumns, onSave, onReset
}) => {
  if (!show) return null;

  const moveUp = (idx) => {
    if (idx === 0) return;
    const updated = [...columns];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setColumns(updated);
  };

  const moveDown = (idx) => {
    if (idx === columns.length - 1) return;
    const updated = [...columns];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setColumns(updated);
  };

  const toggleVisible = (idx) => {
    const updated = [...columns];
    updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
    setColumns(updated);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '480px', width: '90%', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-config-contratos"
      >
        <div id="config-contratos-header" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={22} style={{ color: '#1976d2' }} />
            Configurar Columnas
          </h2>
          <button onClick={onClose} className="config-modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
          Activa o desactiva columnas y reordenalas con las flechas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {columns.map((col, idx) => (
            <div
              key={col.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', borderRadius: '8px',
                backgroundColor: col.visible ? 'hsl(var(--primary) / 0.06)' : '#f5f5f5',
                border: col.visible ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid #e5e5e5',
                transition: 'all 0.15s ease'
              }}
              data-testid={`col-config-${col.id}`}
            >
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleVisible(idx)}
                  disabled={col.fixed}
                  style={{ width: '18px', height: '18px', accentColor: 'hsl(var(--primary))' }}
                />
              </label>
              <span style={{
                flex: 1, fontSize: '0.875rem', fontWeight: col.visible ? '500' : '400',
                color: col.visible ? 'hsl(var(--foreground))' : '#999'
              }}>
                {col.label}
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  style={{
                    all: 'unset', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: '6px', cursor: idx === 0 ? 'default' : 'pointer',
                    color: idx === 0 ? '#ccc' : '#666', background: 'transparent'
                  }}
                  title="Subir"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === columns.length - 1}
                  style={{
                    all: 'unset', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: '6px', cursor: idx === columns.length - 1 ? 'default' : 'pointer',
                    color: idx === columns.length - 1 ? '#ccc' : '#666', background: 'transparent'
                  }}
                  title="Bajar"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem' }}>
          <div className="config-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onReset} className="config-action-btn config-action-restore">
              <RotateCcw size={14} /> Restaurar
            </button>
            <button onClick={onClose} className="config-action-btn config-action-cancel">
              Cancelar
            </button>
            <button onClick={onSave} className="config-action-btn config-action-save">
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContratoColumnConfig;
