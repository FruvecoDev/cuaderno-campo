import React from 'react';
import { X, Sparkles, AlertTriangle, CheckCircle, Bug } from 'lucide-react';

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'grave': return { bg: 'hsl(0, 84%, 95%)', color: 'hsl(0, 84%, 40%)', border: 'hsl(0, 84%, 60%)' };
    case 'moderado': return { bg: 'hsl(38, 92%, 95%)', color: 'hsl(38, 92%, 40%)', border: 'hsl(38, 92%, 50%)' };
    case 'leve': return { bg: 'hsl(142, 76%, 95%)', color: 'hsl(142, 76%, 30%)', border: 'hsl(142, 76%, 40%)' };
    default: return { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: 'hsl(var(--border))' };
  }
};

export const VisitasAnalysisModal = ({ showAnalysisModal, setShowAnalysisModal }) => {
  if (!showAnalysisModal) return null;

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100
      }}
      onClick={() => setShowAnalysisModal(null)}
      data-testid="modal-analisis-ia"
    >
      <div 
        className="card"
        style={{
          maxWidth: '550px', width: '90%', maxHeight: '85vh',
          overflow: 'auto', position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowAnalysisModal(null)}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem'
          }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={24} style={{ color: 'hsl(var(--primary))' }} />
          Analisis de IA
        </h2>
        
        {showAnalysisModal.summary ? (
          <div>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
              Se analizaron {showAnalysisModal.total} fotos
            </p>
            
            {showAnalysisModal.detections?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {showAnalysisModal.detections.map((d, i) => {
                  const style = getSeverityColor(d.severity);
                  return (
                    <div key={i} style={{ 
                      padding: '1rem', backgroundColor: style.bg, borderRadius: '0.5rem',
                      border: `1px solid ${style.border}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <AlertTriangle size={18} style={{ color: style.color }} />
                        <span style={{ fontWeight: '600', color: style.color }}>{d.pest_or_disease}</span>
                        <span style={{ 
                          fontSize: '0.7rem', padding: '2px 6px', borderRadius: '9999px',
                          backgroundColor: style.color, color: 'white'
                        }}>
                          {d.severity?.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>{d.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                padding: '1.5rem', backgroundColor: 'hsl(142, 76%, 95%)', 
                borderRadius: '0.5rem', textAlign: 'center'
              }}>
                <CheckCircle size={40} style={{ color: 'hsl(142, 76%, 36%)', marginBottom: '0.5rem' }} />
                <p style={{ fontWeight: '600', color: 'hsl(142, 76%, 30%)', margin: 0 }}>
                  {showAnalysisModal.message || 'Todas las plantas se ven sanas'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {showAnalysisModal.detected ? (
              <div>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: getSeverityColor(showAnalysisModal.severity).bg, 
                  borderRadius: '0.5rem', marginBottom: '1rem',
                  border: `1px solid ${getSeverityColor(showAnalysisModal.severity).border}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={20} style={{ color: getSeverityColor(showAnalysisModal.severity).color }} />
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: getSeverityColor(showAnalysisModal.severity).color }}>
                      {showAnalysisModal.pest_or_disease}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ 
                      backgroundColor: getSeverityColor(showAnalysisModal.severity).color, color: 'white' 
                    }}>
                      Severidad: {showAnalysisModal.severity?.toUpperCase()}
                    </span>
                    <span className="badge badge-secondary">
                      Confianza: {showAnalysisModal.confidence}%
                    </span>
                    {showAnalysisModal.urgency && showAnalysisModal.urgency !== 'ninguna' && (
                      <span className="badge" style={{ backgroundColor: '#ef4444', color: 'white' }}>
                        Urgencia: {showAnalysisModal.urgency.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                
                {showAnalysisModal.description && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Descripcion</label>
                    <p style={{ margin: '0.25rem 0 0' }}>{showAnalysisModal.description}</p>
                  </div>
                )}
                
                {showAnalysisModal.symptoms?.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Sintomas observados</label>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                      {showAnalysisModal.symptoms.map((s, i) => (
                        <li key={i} style={{ fontSize: '0.9rem' }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {showAnalysisModal.recommended_treatment && (
                  <div style={{ 
                    padding: '1rem', backgroundColor: 'hsl(var(--primary) / 0.1)', 
                    borderRadius: '0.5rem', marginBottom: '1rem'
                  }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bug size={16} />
                      Tratamiento recomendado
                    </label>
                    <p style={{ margin: '0.5rem 0 0' }}>{showAnalysisModal.recommended_treatment}</p>
                  </div>
                )}
                
                {showAnalysisModal.preventive_measures?.length > 0 && (
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Medidas preventivas</label>
                    <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                      {showAnalysisModal.preventive_measures.map((m, i) => (
                        <li key={i} style={{ fontSize: '0.9rem' }}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                padding: '2rem', backgroundColor: 'hsl(142, 76%, 95%)', 
                borderRadius: '0.5rem', textAlign: 'center'
              }}>
                <CheckCircle size={48} style={{ color: 'hsl(142, 76%, 36%)', marginBottom: '0.75rem' }} />
                <h3 style={{ color: 'hsl(142, 76%, 30%)', margin: '0 0 0.5rem' }}>Planta Sana</h3>
                <p style={{ color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                  {showAnalysisModal.description || 'No se detectaron plagas ni enfermedades en esta imagen.'}
                </p>
                {showAnalysisModal.confidence && (
                  <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                    Confianza: {showAnalysisModal.confidence}%
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowAnalysisModal(null)}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
