import React from 'react';
import { X, Calendar, History } from 'lucide-react';

// Using Beaker from a simple icon approach since it may not be in lucide
const BeakerIcon = ({ size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4.5 3h15M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M6 14h12" />
  </svg>
);

export const ParcelasHistorial = ({
  showHistorial, setShowHistorial, historialParcela,
  historialData, historialLoading
}) => {
  if (!showHistorial) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '900px',
        maxHeight: '80vh', overflow: 'auto', padding: '2rem'
      }}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} /> Historial de Tratamientos
          </h2>
          <button className="btn btn-secondary" onClick={() => setShowHistorial(false)}>
            <X size={18} />
          </button>
        </div>
        
        {historialParcela && (
          <div style={{ 
            backgroundColor: 'hsl(var(--primary) / 0.1)', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Parcela: {historialParcela.codigo_plantacion}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div><strong>Proveedor:</strong> {historialParcela.proveedor}</div>
              <div><strong>Cultivo:</strong> {historialParcela.cultivo}</div>
              <div><strong>Superficie:</strong> {historialParcela.superficie_total} ha</div>
              <div><strong>Campaña:</strong> {historialParcela.campana}</div>
            </div>
          </div>
        )}
        
        {historialLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Cargando historial...</p>
          </div>
        ) : historialData ? (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#166534' }}>
                  {historialData.estadisticas.total_tratamientos}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Tratamientos Totales</div>
              </div>
              <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eff6ff' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e40af' }}>
                  {historialData.estadisticas.productos_usados.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Productos Diferentes</div>
              </div>
              <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#fef3c7' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#92400e' }}>
                  {historialData.estadisticas.tipos_aplicados.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Tipos de Tratamiento</div>
              </div>
            </div>
            
            {/* Treatment list */}
            {historialData.historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                <BeakerIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5, margin: '0 auto 1rem' }} />
                <p>No hay tratamientos registrados para esta parcela.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Dosis</th>
                      <th>Superficie</th>
                      <th>Aplicador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialData.historial.map((t, idx) => (
                      <tr key={t._id || idx}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={14} />
                            {t.fecha_tratamiento ? new Date(t.fecha_tratamiento).toLocaleDateString('es-ES') : '-'}
                          </div>
                          {t.fecha_aplicacion && (
                            <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                              Aplicado: {new Date(t.fecha_aplicacion).toLocaleDateString('es-ES')}
                            </small>
                          )}
                        </td>
                        <td>
                          {t.producto_fitosanitario_nombre ? (
                            <strong style={{ color: '#166534' }}>{t.producto_fitosanitario_nombre}</strong>
                          ) : (
                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>Sin producto</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            backgroundColor: 
                              t.subtipo === 'Herbicida' ? '#fef3c7' :
                              t.subtipo === 'Insecticida' ? '#fce7f3' :
                              t.subtipo === 'Fungicida' ? '#dbeafe' : '#f3f4f6'
                          }}>
                            {t.subtipo || t.tipo_tratamiento}
                          </span>
                        </td>
                        <td>
                          {t.producto_fitosanitario_dosis ? (
                            <span>{t.producto_fitosanitario_dosis} {t.producto_fitosanitario_unidad}</span>
                          ) : '-'}
                        </td>
                        <td>{t.superficie_aplicacion ? `${t.superficie_aplicacion} ha` : '-'}</td>
                        <td>{t.aplicador_nombre || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Products used */}
            {historialData.estadisticas.productos_usados.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Productos Utilizados</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {historialData.estadisticas.productos_usados.map((prod, idx) => (
                    <span 
                      key={idx}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        color: '#166534'
                      }}
                    >
                      {prod}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--destructive))' }}>
            <p>Error al cargar el historial de tratamientos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParcelasHistorial;
