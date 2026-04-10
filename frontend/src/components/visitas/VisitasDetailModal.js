import React from 'react';
import { X, Eye, Edit2, Camera } from 'lucide-react';
import { BACKEND_URL } from '../../services/api';

export const VisitasDetailModal = ({
  viewingVisita, setViewingVisita,
  canEdit, handleEdit
}) => {
  if (!viewingVisita) return null;

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={() => setViewingVisita(null)}
      data-testid="modal-detalle-visita"
    >
      <div 
        className="card"
        style={{
          maxWidth: '600px', width: '90%', maxHeight: '80vh',
          overflow: 'auto', position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setViewingVisita(null)}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem'
          }}
          data-testid="btn-close-detail"
        >
          <X size={20} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={24} />
          Detalles de la Visita
        </h2>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="grid-2">
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Objetivo</label>
              <p style={{ fontWeight: '500' }}>{viewingVisita.objetivo}</p>
            </div>
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Fecha</label>
              <p style={{ fontWeight: '500' }}>{viewingVisita.fecha_visita}</p>
            </div>
          </div>
          
          <div className="grid-2">
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Proveedor</label>
              <p>{viewingVisita.proveedor || 'N/A'}</p>
            </div>
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Cultivo</label>
              <p>{viewingVisita.cultivo || 'N/A'}</p>
            </div>
          </div>
          
          <div className="grid-2">
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Campana</label>
              <p>{viewingVisita.campana || 'N/A'}</p>
            </div>
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Estado</label>
              <span className={`badge ${viewingVisita.estado === 'Completada' ? 'badge-success' : viewingVisita.estado === 'Programada' ? 'badge-warning' : 'badge-secondary'}`}>
                {viewingVisita.estado || 'Programada'}
              </span>
            </div>
          </div>
          
          {viewingVisita.observaciones && (
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Observaciones</label>
              <p style={{ whiteSpace: 'pre-wrap' }}>{viewingVisita.observaciones}</p>
            </div>
          )}
          
          {viewingVisita.cuestionario_plagas && Object.keys(viewingVisita.cuestionario_plagas).length > 0 && (
            <div>
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem', display: 'block' }}>Cuestionario de Plagas</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {Object.entries(viewingVisita.cuestionario_plagas).map(([key, value]) => (
                  <div key={key} style={{ 
                    padding: '0.5rem', 
                    backgroundColor: value === 0 ? 'hsl(var(--success) / 0.1)' : value === 1 ? 'hsl(var(--warning) / 0.2)' : 'hsl(var(--destructive) / 0.1)',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}>
                    <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {viewingVisita.fotos && viewingVisita.fotos.length > 0 && (
            <div data-testid="modal-fotos-gallery">
              <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={16} />
                Fotos ({viewingVisita.fotos.length})
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '0.75rem' 
              }}>
                {viewingVisita.fotos.map((foto, index) => (
                  <div 
                    key={index}
                    style={{
                      position: 'relative', aspectRatio: '1', borderRadius: '0.5rem',
                      overflow: 'hidden', border: '1px solid hsl(var(--border))', cursor: 'pointer'
                    }}
                    onClick={() => window.open(`${BACKEND_URL}${foto.url}`, '_blank')}
                    title="Clic para ver en tamano completo"
                  >
                    <img
                      src={`${BACKEND_URL}${foto.url}`}
                      alt={foto.filename || `Foto ${index + 1}`}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '0.25rem 0.5rem', backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white', fontSize: '0.65rem',
                      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                    }}>
                      {foto.filename || `Foto ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={() => {
                handleEdit(viewingVisita);
                setViewingVisita(null);
              }}
              data-testid="btn-edit-from-detail"
            >
              <Edit2 size={16} style={{ marginRight: '0.5rem' }} />
              Editar
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setViewingVisita(null)}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
