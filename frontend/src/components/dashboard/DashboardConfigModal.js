import React from 'react';
import ReactDOM from 'react-dom';
import { Settings, X, RotateCcw, Save, ArrowUp, ArrowDown } from 'lucide-react';

const DashboardConfigModal = ({
  configWidgets,
  toggleWidgetVisibility,
  moveWidgetUp,
  moveWidgetDown,
  saveDashboardConfig,
  resetDashboardConfig,
  savingConfig,
  onClose
}) => {
  return ReactDOM.createPortal(
    <>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999998
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem',
        width: '90%', maxWidth: '700px', maxHeight: '85vh', overflow: 'auto',
        zIndex: 999999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }} data-testid="modal-config-dashboard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={24} style={{ color: '#1976d2' }} />
            Configurar Dashboard
          </h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          Activa/desactiva las secciones y usa las flechas para cambiar el orden de visualizacion. Los cambios se guardaran para tu usuario.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {configWidgets.map((widget, idx) => (
            <div
              key={widget.widget_id}
              style={{
                display: 'flex', alignItems: 'center', padding: '0.75rem 1rem',
                backgroundColor: widget.visible ? '#e8f5e9' : '#f5f5f5',
                borderRadius: '8px',
                border: `1px solid ${widget.visible ? '#a5d6a7' : '#e0e0e0'}`,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.75rem' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); moveWidgetUp(idx); }}
                  disabled={idx === 0}
                  style={{
                    background: idx === 0 ? '#f0f0f0' : '#e3f2fd',
                    border: 'none', borderRadius: '4px', padding: '2px 4px',
                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Subir"
                >
                  <ArrowUp size={14} style={{ color: idx === 0 ? '#bbb' : '#1976d2' }} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveWidgetDown(idx); }}
                  disabled={idx === configWidgets.length - 1}
                  style={{
                    background: idx === configWidgets.length - 1 ? '#f0f0f0' : '#e3f2fd',
                    border: 'none', borderRadius: '4px', padding: '2px 4px',
                    cursor: idx === configWidgets.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Bajar"
                >
                  <ArrowDown size={14} style={{ color: idx === configWidgets.length - 1 ? '#bbb' : '#1976d2' }} />
                </button>
              </div>
              
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: widget.visible ? '#2d5a27' : '#999',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: '600', marginRight: '0.75rem'
              }}>
                {idx + 1}
              </div>
              
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleWidgetVisibility(widget.widget_id)}>
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{widget.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{widget.description}</div>
              </div>
              
              <div 
                onClick={() => toggleWidgetVisibility(widget.widget_id)}
                style={{
                  width: '48px', height: '26px',
                  backgroundColor: widget.visible ? '#4caf50' : '#ccc',
                  borderRadius: '13px', position: 'relative',
                  transition: 'background-color 0.2s ease', cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '22px', height: '22px', backgroundColor: 'white',
                  borderRadius: '50%', position: 'absolute', top: '2px',
                  left: widget.visible ? '24px' : '2px',
                  transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <button onClick={resetDashboardConfig} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 20px', fontSize: '0.85rem', fontWeight: '500', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', marginRight: '12px' }}>
            <RotateCcw size={14} /> Restaurar
          </button>
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', fontSize: '0.85rem', fontWeight: '500', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', marginRight: '12px' }}>
            Cancelar
          </button>
          <button onClick={saveDashboardConfig} disabled={savingConfig} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 20px', fontSize: '0.85rem', fontWeight: '500', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', background: 'hsl(var(--primary))', color: 'white', border: 'none' }}>
            <Save size={14} /> {savingConfig ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>,
    document.getElementById('modal-root') || document.body
  );
};

export default DashboardConfigModal;
