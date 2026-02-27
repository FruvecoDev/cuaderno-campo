import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, Calendar, FileText, Clock, 
  Thermometer, Droplets, CheckCircle, TrendingUp,
  ChevronRight, Leaf, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';


const ResumenDiario = ({ onClose }) => {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noMostrarHoy, setNoMostrarHoy] = useState(false);

  useEffect(() => {
    fetchResumen();
  }, []);

  const fetchResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/api/resumen-diario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching resumen:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (noMostrarHoy) {
      // Store in localStorage that user doesn't want to see it today
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('resumen_diario_dismissed', today);
    }
    onClose();
  };

  if (loading) {
    return (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '1rem',
          textAlign: 'center'
        }}>
          <div className="animate-spin" style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e5e7eb',
            borderTopColor: 'hsl(var(--primary))',
            borderRadius: '50%',
            margin: '0 auto 1rem'
          }}></div>
          <p>Cargando resumen del día...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    onClose();
    return null;
  }

  const { alertas_clima, tratamientos_hoy, contratos_vencer, kpis } = data;
  const hasAlertasAlta = alertas_clima?.por_prioridad?.alta > 0;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }} onClick={handleClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        data-testid="resumen-diario-modal"
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))'
        }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={24} /> Buenos días, {user?.username || 'Usuario'}
            </h2>
            <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={handleClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Alertas Climáticas */}
          {alertas_clima && alertas_clima.total > 0 && (
            <div style={{ 
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: hasAlertasAlta ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${hasAlertasAlta ? '#fecaca' : '#fde68a'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ 
                  padding: '0.5rem', 
                  borderRadius: '0.5rem', 
                  backgroundColor: hasAlertasAlta ? '#fee2e2' : '#fef3c7'
                }}>
                  <Thermometer size={20} style={{ color: hasAlertasAlta ? '#dc2626' : '#d97706' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: '600' }}>
                    {alertas_clima.total} Alertas Climáticas Activas
                  </h3>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>
                    {alertas_clima.por_prioridad?.alta > 0 && `${alertas_clima.por_prioridad.alta} de alta prioridad`}
                  </p>
                </div>
              </div>
              <a 
                href="/alertas-clima" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  color: hasAlertasAlta ? '#dc2626' : '#d97706',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Ver alertas <ChevronRight size={16} />
              </a>
            </div>
          )}

          {/* Grid de secciones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {/* Tratamientos Hoy */}
            <div style={{ 
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'hsl(var(--muted) / 0.5)',
              border: '1px solid hsl(var(--border))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Calendar size={18} style={{ color: '#3b82f6' }} />
                <h4 style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>Tratamientos Hoy</h4>
              </div>
              {tratamientos_hoy?.total > 0 ? (
                <>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                    {tratamientos_hoy.total}
                  </div>
                  <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0' }}>
                    programados
                  </p>
                  <a 
                    href="/tratamientos" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      color: '#3b82f6',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    Ver tratamientos <ChevronRight size={14} />
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.25rem', color: '#22c55e' }} />
                  Sin tratamientos programados
                </p>
              )}
            </div>

            {/* Contratos por Vencer */}
            <div style={{ 
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'hsl(var(--muted) / 0.5)',
              border: '1px solid hsl(var(--border))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <FileText size={18} style={{ color: '#f59e0b' }} />
                <h4 style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>Contratos por Vencer</h4>
              </div>
              {contratos_vencer?.total > 0 ? (
                <>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
                    {contratos_vencer.total}
                  </div>
                  <p className="text-sm text-muted" style={{ margin: '0.25rem 0 0' }}>
                    en los próximos 7 días
                  </p>
                  <a 
                    href="/contratos" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      color: '#f59e0b',
                      fontSize: '0.8rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    Ver contratos <ChevronRight size={14} />
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.25rem', color: '#22c55e' }} />
                  Sin contratos próximos a vencer
                </p>
              )}
            </div>
          </div>

          {/* KPIs */}
          {kpis && (
            <div style={{ 
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <TrendingUp size={18} style={{ color: '#16a34a' }} />
                <h4 style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>Resumen General</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>{kpis.parcelas_activas || 0}</div>
                  <div className="text-xs text-muted">Parcelas Activas</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>{kpis.recomendaciones_pendientes || 0}</div>
                  <div className="text-xs text-muted">Recom. Pendientes</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>{kpis.visitas_semana || 0}</div>
                  <div className="text-xs text-muted">Visitas Semana</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#16a34a' }}>{kpis.cosechas_mes || 0}</div>
                  <div className="text-xs text-muted">Cosechas Mes</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1rem 1.5rem',
          borderTop: '1px solid hsl(var(--border))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'hsl(var(--muted) / 0.3)'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
            <input 
              type="checkbox"
              checked={noMostrarHoy}
              onChange={(e) => setNoMostrarHoy(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            No mostrar hoy
          </label>
          <button 
            onClick={handleClose}
            className="btn btn-primary"
            data-testid="btn-entendido"
          >
            <CheckCircle size={16} /> Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumenDiario;
