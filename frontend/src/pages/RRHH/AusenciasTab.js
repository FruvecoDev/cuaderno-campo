import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, XCircle, AlertCircle, Filter, User, Clock, MessageSquare, LayoutGrid, List
} from 'lucide-react';
import api from '../../services/api';
import CalendarioAusencias from './CalendarioAusencias';

const AusenciasTab = ({ empleados }) => {
  const [ausencias, setAusencias] = useState([]);
  const [todasAusencias, setTodasAusencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [ausenciaSeleccionada, setAusenciaSeleccionada] = useState(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [stats, setStats] = useState({ pendientes: 0, aprobadas: 0, rechazadas: 0 });
  const [vistaCalendario, setVistaCalendario] = useState(false);
  
  useEffect(() => {
    fetchAusencias();
  }, [filtroEstado, filtroTipo]);
  
  const fetchAusencias = async () => {
    setLoading(true);
    try {
      let url = '/api/rrhh/ausencias?';
      if (filtroEstado) url += `estado=${filtroEstado}&`;
      if (filtroTipo) url += `tipo=${filtroTipo}&`;
      
      const data = await api.get(url);
      setAusencias(data.ausencias || []);
      
      // Obtener todas para el calendario y stats
      const allData = await api.get('/api/rrhh/ausencias');
      const all = allData.ausencias || [];
      setTodasAusencias(all);
      setStats({
        pendientes: all.filter(a => a.estado === 'pendiente').length,
        aprobadas: all.filter(a => a.estado === 'aprobada').length,
        rechazadas: all.filter(a => a.estado === 'rechazada').length
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAprobar = async (ausenciaId) => {
    if (!window.confirm('¿Aprobar esta solicitud de ausencia?')) return;
    
    try {
      await api.put(`/api/rrhh/ausencias/${ausenciaId}/aprobar`, {
        estado: 'aprobada',
        aprobada_por: 'admin'
      });
      fetchAusencias();
    } catch (err) {
      console.error('Error:', err);
      alert('Error al aprobar: ' + api.getErrorMessage(err));
    }
  };
  
  const handleRechazar = async () => {
    if (!ausenciaSeleccionada) return;
    
    try {
      await api.put(`/api/rrhh/ausencias/${ausenciaSeleccionada._id}/aprobar`, {
        estado: 'rechazada',
        aprobada_por: 'admin',
        comentario: comentarioRechazo
      });
      setShowRechazarModal(false);
      setAusenciaSeleccionada(null);
      setComentarioRechazo('');
      fetchAusencias();
    } catch (err) {
      console.error('Error:', err);
      alert('Error al rechazar: ' + api.getErrorMessage(err));
    }
  };
  
  const tiposAusencia = [
    { value: '', label: 'Todos los tipos' },
    { value: 'vacaciones', label: 'Vacaciones' },
    { value: 'permiso', label: 'Permiso Personal' },
    { value: 'baja_medica', label: 'Baja Médica' },
    { value: 'asuntos_propios', label: 'Asuntos Propios' },
    { value: 'otros', label: 'Otros' }
  ];
  
  const getEstadoBadge = (estado) => {
    const styles = {
      pendiente: { bg: 'hsl(38 92% 50% / 0.1)', color: 'hsl(38 92% 50%)', icon: AlertCircle },
      aprobada: { bg: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)', icon: CheckCircle },
      rechazada: { bg: 'hsl(0 84% 60% / 0.1)', color: 'hsl(0 84% 60%)', icon: XCircle }
    };
    const style = styles[estado] || styles.pendiente;
    const Icon = style.icon;
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '500',
        background: style.bg,
        color: style.color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <Icon size={12} />
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };
  
  const calcularDias = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diffTime = Math.abs(fin - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div 
          className="card" 
          style={{ 
            padding: '1.25rem', 
            textAlign: 'center', 
            cursor: 'pointer',
            border: filtroEstado === 'pendiente' ? '2px solid hsl(38 92% 50%)' : undefined
          }}
          onClick={() => setFiltroEstado('pendiente')}
        >
          <AlertCircle size={28} style={{ margin: '0 auto', color: 'hsl(38 92% 50%)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>{stats.pendientes}</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Pendientes</div>
        </div>
        
        <div 
          className="card" 
          style={{ 
            padding: '1.25rem', 
            textAlign: 'center',
            cursor: 'pointer',
            border: filtroEstado === 'aprobada' ? '2px solid hsl(142 76% 36%)' : undefined
          }}
          onClick={() => setFiltroEstado('aprobada')}
        >
          <CheckCircle size={28} style={{ margin: '0 auto', color: 'hsl(142 76% 36%)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>{stats.aprobadas}</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Aprobadas</div>
        </div>
        
        <div 
          className="card" 
          style={{ 
            padding: '1.25rem', 
            textAlign: 'center',
            cursor: 'pointer',
            border: filtroEstado === 'rechazada' ? '2px solid hsl(0 84% 60%)' : undefined
          }}
          onClick={() => setFiltroEstado('rechazada')}
        >
          <XCircle size={28} style={{ margin: '0 auto', color: 'hsl(0 84% 60%)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(0 84% 60%)' }}>{stats.rechazadas}</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Rechazadas</div>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
          
          <div className="form-group" style={{ margin: 0 }}>
            <select
              className="form-select"
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="aprobada">Aprobadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <select
              className="form-select"
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              {tiposAusencia.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => { setFiltroEstado(''); setFiltroTipo(''); }}
            className="btn btn-ghost btn-sm"
          >
            Limpiar filtros
          </button>
          
          {/* Toggle Vista */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <button
              onClick={() => setVistaCalendario(false)}
              className={`btn btn-sm ${!vistaCalendario ? 'btn-primary' : 'btn-ghost'}`}
              title="Vista Lista"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setVistaCalendario(true)}
              className={`btn btn-sm ${vistaCalendario ? 'btn-primary' : 'btn-ghost'}`}
              title="Vista Calendario"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendario Visual */}
      {vistaCalendario && (
        <CalendarioAusencias ausencias={todasAusencias} empleados={empleados} />
      )}
      
      {/* Lista de Ausencias */}
      {!vistaCalendario && (
      <div className="card">
        <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'hsl(var(--primary))' }} />
            Solicitudes de Ausencia
            <span style={{ 
              marginLeft: '0.5rem', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '9999px', 
              background: 'hsl(var(--muted))', 
              fontSize: '0.75rem' 
            }}>
              {ausencias.length}
            </span>
          </h3>
        </div>
        
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Días</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ausencias.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    <Calendar size={40} style={{ margin: '0 auto', opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                      No hay solicitudes {filtroEstado ? `con estado "${filtroEstado}"` : ''}
                    </p>
                  </td>
                </tr>
              ) : (
                ausencias.map(a => (
                  <tr key={a._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'hsl(var(--primary) / 0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <User size={16} style={{ color: 'hsl(var(--primary))' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{a.empleado_nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                            {a.empleado_codigo || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {(a.tipo || '').replace('_', ' ')}
                    </td>
                    <td>{a.fecha_inicio}</td>
                    <td>{a.fecha_fin}</td>
                    <td style={{ fontWeight: '600' }}>
                      {calcularDias(a.fecha_inicio, a.fecha_fin)}
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }} title={a.motivo}>
                        {a.motivo || '-'}
                      </div>
                    </td>
                    <td>{getEstadoBadge(a.estado)}</td>
                    <td>
                      {a.estado === 'pendiente' ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleAprobar(a._id)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'hsl(142 76% 36%)' }}
                            title="Aprobar"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => { setAusenciaSeleccionada(a); setShowRechazarModal(true); }}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'hsl(0 84% 60%)' }}
                            title="Rechazar"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          <Clock size={12} />
                          {a.fecha_aprobacion?.split(' ')[0] || '-'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Rechazar */}
      {showRechazarModal && ausenciaSeleccionada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowRechazarModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '1.5rem', 
              borderBottom: '1px solid hsl(var(--border))',
              background: 'hsl(0 84% 60% / 0.05)'
            }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={24} style={{ color: 'hsl(0 84% 60%)' }} />
                Rechazar Solicitud
              </h2>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'hsl(var(--muted) / 0.3)', 
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                <div><strong>Empleado:</strong> {ausenciaSeleccionada.empleado_nombre}</div>
                <div><strong>Tipo:</strong> {(ausenciaSeleccionada.tipo || '').replace('_', ' ')}</div>
                <div><strong>Fechas:</strong> {ausenciaSeleccionada.fecha_inicio} - {ausenciaSeleccionada.fecha_fin}</div>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <MessageSquare size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Motivo del rechazo (opcional)
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={comentarioRechazo}
                  onChange={e => setComentarioRechazo(e.target.value)}
                  placeholder="Explica brevemente el motivo del rechazo..."
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  onClick={() => { setShowRechazarModal(false); setComentarioRechazo(''); }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRechazar}
                  className="btn"
                  style={{ 
                    flex: 1, 
                    background: 'hsl(0 84% 60%)', 
                    color: 'white',
                    border: 'none'
                  }}
                >
                  <XCircle size={18} />
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AusenciasTab;
