import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, Thermometer, Droplets, CloudRain, Sun, Bug, Snowflake,
  RefreshCw, Settings, CheckCircle, X, Zap, Eye, Clock, 
  ChevronDown, ChevronUp, MapPin, Loader2, Wind
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import '../App.css';


// Icon mapping
const ICON_MAP = {
  'droplets': Droplets,
  'thermometer': Thermometer,
  'cloud-rain': CloudRain,
  'sun': Sun,
  'bug': Bug,
  'snowflake': Snowflake,
  'wind': Wind
};

const AlertasClima = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  
  // States
  const [alertas, setAlertas] = useState([]);
  const [stats, setStats] = useState(null);
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // UI states
  const [showConfig, setShowConfig] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [expandedAlerta, setExpandedAlerta] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  
  // Manual data form
  const [datosManual, setDatosManual] = useState({
    temperatura: '',
    humedad: '',
    lluvia: '',
    viento: '',
    descripcion: ''
  });

  useEffect(() => {
    if (token) {
      fetchAll();
    }
  }, [token]);

  // Refetch alertas when filter changes
  useEffect(() => {
    if (token) {
      fetchAlertas();
    }
  }, [filtroEstado, token]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchAlertas(),
      fetchStats(),
      fetchReglas()
    ]);
    setLoading(false);
  };

  const fetchAlertas = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroEstado !== 'todas') {
        params.append('estado', filtroEstado);
      }
      
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAlertas(data.alertas || []);
    } catch (err) {
      console.error('Error fetching alertas:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchReglas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima/reglas/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setReglas(data.reglas || []);
    } catch (err) {
      console.error('Error fetching reglas:', err);
    }
  };

  const handleVerificarTodas = async () => {
    setVerificando(true);
    setError(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima/verificar-todas`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        let errorMsg = 'Error al verificar';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 4000);
      fetchAlertas();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificando(false);
    }
  };

  const handleRegistrarManual = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!datosManual.temperatura && !datosManual.humedad) {
      setError('Debe introducir al menos temperatura o humedad');
      return;
    }
    
    try {
      const dataToSend = {
        temperatura: datosManual.temperatura ? parseFloat(datosManual.temperatura) : 20,
        humedad: datosManual.humedad ? parseFloat(datosManual.humedad) : 50,
        lluvia: datosManual.lluvia ? parseFloat(datosManual.lluvia) : 0,
        viento: datosManual.viento ? parseFloat(datosManual.viento) : 0,
        descripcion: datosManual.descripcion || null
      };
      
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima/clima/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });
      
      if (!response.ok) {
        let errorMsg = 'Error al registrar datos';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 4000);
      setShowManualForm(false);
      setDatosManual({ temperatura: '', humedad: '', lluvia: '', viento: '', descripcion: '' });
      fetchAlertas();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateAlertaEstado = async (alertaId, nuevoEstado) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima/${alertaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al actualizar');
      }
      
      fetchAlertas();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleRegla = async (regla) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/alertas-clima/reglas/${regla.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rule_id: regla.id,
          activo: !regla.activo 
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al actualizar regla');
      }
      
      fetchReglas();
    } catch (err) {
      setError(err.message);
    }
  };

  const getIconComponent = (iconName) => {
    const Icon = ICON_MAP[iconName] || AlertTriangle;
    return Icon;
  };

  const canManage = user?.role && ['Admin', 'Manager'].includes(user.role);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="alertas-clima-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={28} />
            Alertas Climáticas
          </h1>
          <p className="text-muted">Alertas automáticas basadas en condiciones meteorológicas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowManualForm(!showManualForm)}
            data-testid="btn-datos-manuales"
          >
            <Thermometer size={18} /> Datos Manuales
          </button>
          {canManage && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowConfig(!showConfig)}
            >
              <Settings size={18} /> Configurar
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleVerificarTodas}
            disabled={verificando}
            data-testid="btn-verificar-todas"
          >
            {verificando ? (
              <><Loader2 size={18} className="animate-spin" /> Verificando...</>
            ) : (
              <><RefreshCw size={18} /> Verificar Parcelas</>
            )}
          </button>
        </div>
      </div>

      {/* Alerts/Success Messages */}
      {error && (
        <div className="alert alert-error mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><AlertTriangle size={18} /> {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><CheckCircle size={18} /> {success}</span>
          <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{stats.resumen.pendientes}</div>
            <div className="text-muted text-sm">Pendientes</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{stats.resumen.revisadas}</div>
            <div className="text-muted text-sm">En Revisión</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>{stats.resumen.resueltas_hoy}</div>
            <div className="text-muted text-sm">Resueltas Hoy</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{stats.semana.total}</div>
            <div className="text-muted text-sm">Última Semana</div>
          </div>
        </div>
      )}

      {/* Manual Data Form */}
      {showManualForm && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Registrar Datos Climáticos Manuales</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowManualForm(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="text-muted text-sm mb-4">
            Introduzca los datos climáticos actuales. El sistema evaluará las condiciones y generará alertas si es necesario.
          </p>
          
          <form onSubmit={handleRegistrarManual}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">Temperatura (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={datosManual.temperatura}
                  onChange={(e) => setDatosManual(prev => ({ ...prev, temperatura: e.target.value }))}
                  placeholder="25.0"
                  required
                />
              </div>
              <div>
                <label className="form-label">Humedad (%) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  className="form-input"
                  value={datosManual.humedad}
                  onChange={(e) => setDatosManual(prev => ({ ...prev, humedad: e.target.value }))}
                  placeholder="60"
                  required
                />
              </div>
              <div>
                <label className="form-label">Lluvia (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={datosManual.lluvia}
                  onChange={(e) => setDatosManual(prev => ({ ...prev, lluvia: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="form-label">Viento (km/h)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  value={datosManual.viento}
                  onChange={(e) => setDatosManual(prev => ({ ...prev, viento: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Descripción (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={datosManual.descripcion}
                  onChange={(e) => setDatosManual(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej: Cielo nublado, previsión de lluvias"
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowManualForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                <Zap size={16} /> Registrar y Evaluar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && canManage && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configuración de Reglas de Alerta</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowConfig(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Regla</th>
                  <th>Condición</th>
                  <th>Plantilla Sugerida</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reglas.map(regla => {
                  const Icon = getIconComponent(regla.icono);
                  return (
                    <tr key={regla.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Icon size={18} style={{ color: regla.color }} />
                          <div>
                            <div style={{ fontWeight: '500' }}>{regla.nombre}</div>
                            <div className="text-sm text-muted">{regla.descripcion}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ 
                          backgroundColor: 'hsl(var(--muted))', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '0.25rem',
                          fontSize: '0.8rem'
                        }}>
                          {regla.condicion} {regla.operador} {Array.isArray(regla.valor) ? regla.valor.join('-') : regla.valor} {regla.unidad}
                        </code>
                      </td>
                      <td>{regla.plantilla_sugerida || '-'}</td>
                      <td>
                        <button
                          onClick={() => handleToggleRegla(regla)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: regla.activo ? '#16a34a' : '#9ca3af'
                          }}
                        >
                          {regla.activo ? (
                            <><CheckCircle size={18} /> Activa</>
                          ) : (
                            <><X size={18} /> Inactiva</>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['pendiente', 'revisada', 'resuelta', 'todas'].map(estado => (
          <button
            key={estado}
            className={`btn btn-sm ${filtroEstado === estado ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFiltroEstado(estado)}
          >
            {estado === 'pendiente' && <Clock size={14} />}
            {estado === 'revisada' && <Eye size={14} />}
            {estado === 'resuelta' && <CheckCircle size={14} />}
            {estado.charAt(0).toUpperCase() + estado.slice(1)}s
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          Alertas ({alertas.length})
        </h3>
        
        {alertas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
            <CheckCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay alertas {filtroEstado !== 'todas' ? filtroEstado + 's' : ''}</p>
            <p className="text-sm" style={{ marginTop: '0.5rem' }}>
              Las alertas se generan automáticamente cuando las condiciones climáticas coinciden con las reglas configuradas.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alertas.map(alerta => {
              const Icon = getIconComponent(alerta.icono);
              const isExpanded = expandedAlerta === alerta._id;
              
              return (
                <div 
                  key={alerta._id}
                  style={{
                    border: `2px solid ${alerta.color}20`,
                    borderLeft: `4px solid ${alerta.color}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    backgroundColor: 'white'
                  }}
                >
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                    onClick={() => setExpandedAlerta(isExpanded ? null : alerta._id)}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ 
                        padding: '0.5rem', 
                        borderRadius: '0.5rem', 
                        backgroundColor: `${alerta.color}20`
                      }}>
                        <Icon size={24} style={{ color: alerta.color }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {alerta.nombre}
                          <span style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            backgroundColor: alerta.prioridad === 'Alta' ? '#fef2f2' : alerta.prioridad === 'Media' ? '#fffbeb' : '#f0fdf4',
                            color: alerta.prioridad === 'Alta' ? '#dc2626' : alerta.prioridad === 'Media' ? '#d97706' : '#16a34a'
                          }}>
                            {alerta.prioridad}
                          </span>
                        </div>
                        <div className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          {alerta.parcela_codigo} - {alerta.parcela_cultivo}
                        </div>
                        <div className="text-sm" style={{ marginTop: '0.25rem', color: '#6b7280' }}>
                          {alerta.descripcion}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {alerta.plantilla_nombre && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem'
                        }}>
                          Sugerencia: {alerta.plantilla_nombre}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
                      {/* Weather details */}
                      {alerta.datos_clima && (
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                          gap: '0.5rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <Thermometer size={16} style={{ margin: '0 auto 0.25rem' }} />
                            <div style={{ fontWeight: '600' }}>{alerta.datos_clima.temperatura}°C</div>
                            <div className="text-xs text-muted">Temperatura</div>
                          </div>
                          <div style={{ padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <Droplets size={16} style={{ margin: '0 auto 0.25rem' }} />
                            <div style={{ fontWeight: '600' }}>{alerta.datos_clima.humedad}%</div>
                            <div className="text-xs text-muted">Humedad</div>
                          </div>
                          <div style={{ padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <CloudRain size={16} style={{ margin: '0 auto 0.25rem' }} />
                            <div style={{ fontWeight: '600' }}>{alerta.datos_clima.lluvia || 0}mm</div>
                            <div className="text-xs text-muted">Lluvia</div>
                          </div>
                          <div style={{ padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <Wind size={16} style={{ margin: '0 auto 0.25rem' }} />
                            <div style={{ fontWeight: '600' }}>{alerta.datos_clima.viento || 0}km/h</div>
                            <div className="text-xs text-muted">Viento</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {alerta.estado === 'pendiente' && (
                          <>
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={(e) => { e.stopPropagation(); handleUpdateAlertaEstado(alerta._id, 'revisada'); }}
                            >
                              <Eye size={14} /> Marcar Revisada
                            </button>
                            {alerta.plantilla_id && (
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  window.location.href = `/recomendaciones?plantilla=${alerta.plantilla_id}&parcela=${alerta.parcela_id}`;
                                }}
                              >
                                <Zap size={14} /> Crear Recomendación
                              </button>
                            )}
                          </>
                        )}
                        {alerta.estado === 'revisada' && (
                          <button 
                            className="btn btn-sm"
                            style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                            onClick={(e) => { e.stopPropagation(); handleUpdateAlertaEstado(alerta._id, 'resuelta'); }}
                          >
                            <CheckCircle size={14} /> Marcar Resuelta
                          </button>
                        )}
                        <button 
                          className="btn btn-sm"
                          style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                          onClick={(e) => { e.stopPropagation(); handleUpdateAlertaEstado(alerta._id, 'ignorada'); }}
                        >
                          <X size={14} /> Ignorar
                        </button>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
                        Generada: {new Date(alerta.created_at).toLocaleString('es-ES')}
                        {alerta.datos_clima?.fuente && ` | Fuente: ${alerta.datos_clima.fuente}`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertasClima;
