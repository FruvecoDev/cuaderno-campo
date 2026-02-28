import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Clock, FileText, CreditCard, Calendar, CheckCircle,
  XCircle, AlertCircle, LogIn, LogOut, Download, PenTool, X, Bell,
  TrendingUp, Award, BarChart3, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import SignatureCanvas from 'react-signature-canvas';

const PortalEmpleado = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inicio');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [fichajes, setFichajes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [prenominas, setPrenominas] = useState([]);
  const [ausencias, setAusencias] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  
  // Productividad states
  const [productividad, setProductividad] = useState(null);
  const [productividadHoy, setProductividadHoy] = useState(null);
  const [periodoProductividad, setPeriodoProductividad] = useState('mes');
  
  // Modal states
  const [showFicharModal, setShowFicharModal] = useState(false);
  const [showAusenciaModal, setShowAusenciaModal] = useState(false);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [documentoParaFirmar, setDocumentoParaFirmar] = useState(null);
  
  // Form states
  const [ausenciaForm, setAusenciaForm] = useState({
    tipo: 'vacaciones',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: ''
  });
  
  const sigCanvas = useRef(null);
  
  useEffect(() => {
    fetchDashboard();
    fetchNotificaciones();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (activeTab === 'fichajes') fetchFichajes();
    if (activeTab === 'documentos') fetchDocumentos();
    if (activeTab === 'nominas') fetchPrenominas();
    if (activeTab === 'ausencias') fetchAusencias();
    if (activeTab === 'productividad') fetchProductividad();
  }, [activeTab, periodoProductividad]);
  
  const fetchNotificaciones = async () => {
    try {
      const data = await api.get('/api/portal-empleado/mis-notificaciones');
      setNotificaciones(data.notificaciones || []);
      setNotificacionesNoLeidas(data.no_leidas || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };
  
  const handleMarcarLeida = async (notifId) => {
    try {
      await api.put(`/api/portal-empleado/notificaciones/${notifId}/leer`);
      fetchNotificaciones();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleMarcarTodasLeidas = async () => {
    try {
      await api.put('/api/portal-empleado/notificaciones/leer-todas');
      fetchNotificaciones();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const fetchDashboard = async () => {
    try {
      const data = await api.get('/api/portal-empleado/resumen-dashboard');
      setDashboard(data);
    } catch (err) {
      setError(api.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFichajes = async () => {
    try {
      const data = await api.get('/api/portal-empleado/mis-fichajes');
      setFichajes(data.fichajes || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const fetchDocumentos = async () => {
    try {
      const data = await api.get('/api/portal-empleado/mis-documentos');
      setDocumentos(data.documentos || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const fetchPrenominas = async () => {
    try {
      const data = await api.get('/api/portal-empleado/mis-prenominas');
      setPrenominas(data.prenominas || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const fetchAusencias = async () => {
    try {
      const data = await api.get('/api/portal-empleado/mis-ausencias');
      setAusencias(data.ausencias || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleFichar = async (tipo) => {
    try {
      await api.post('/api/portal-empleado/fichar', { tipo });
      fetchDashboard();
      setShowFicharModal(false);
      alert(`Fichaje de ${tipo} registrado correctamente`);
    } catch (err) {
      alert('Error: ' + api.getErrorMessage(err));
    }
  };
  
  const handleSolicitarAusencia = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/portal-empleado/solicitar-ausencia', ausenciaForm);
      fetchAusencias();
      setShowAusenciaModal(false);
      setAusenciaForm({ tipo: 'vacaciones', fecha_inicio: '', fecha_fin: '', motivo: '' });
      alert('Solicitud enviada correctamente');
    } catch (err) {
      alert('Error: ' + api.getErrorMessage(err));
    }
  };
  
  const handleFirmarDocumento = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Por favor, firma el documento');
      return;
    }
    
    try {
      const firma = sigCanvas.current.toDataURL('image/png');
      await api.put(`/api/portal-empleado/firmar-documento/${documentoParaFirmar._id}`, { firma });
      fetchDocumentos();
      setShowFirmaModal(false);
      setDocumentoParaFirmar(null);
      alert('Documento firmado correctamente');
    } catch (err) {
      alert('Error: ' + api.getErrorMessage(err));
    }
  };
  
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: User },
    { id: 'fichajes', label: 'Mis Fichajes', icon: Clock },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'nominas', label: 'Nóminas', icon: CreditCard },
    { id: 'ausencias', label: 'Ausencias', icon: Calendar }
  ];
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'hsl(0 84% 60% / 0.1)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto', color: 'hsl(0 84% 60%)' }} />
          <h2 style={{ marginTop: '1rem', color: 'hsl(0 84% 60%)' }}>Error de acceso</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>{error}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            Si crees que esto es un error, contacta con el departamento de RRHH.
          </p>
        </div>
      </div>
    );
  }
  
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  return (
    <div className="p-6">
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Portal del Empleado</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>
            Bienvenido/a, {dashboard?.empleado?.nombre || user?.full_name}
          </p>
        </div>
        
        {/* Botón de notificaciones */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotificaciones(!showNotificaciones)}
            className="btn btn-ghost"
            style={{ position: 'relative' }}
            data-testid="btn-notificaciones"
          >
            <Bell size={24} />
            {notificacionesNoLeidas > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'hsl(0 84% 60%)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600'
              }}>
                {notificacionesNoLeidas > 9 ? '9+' : notificacionesNoLeidas}
              </span>
            )}
          </button>
          
          {/* Panel de notificaciones */}
          {showNotificaciones && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: '350px',
              maxHeight: '400px',
              overflow: 'auto',
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              zIndex: 100
            }}>
              <div style={{ 
                padding: '1rem', 
                borderBottom: '1px solid hsl(var(--border))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: 'hsl(var(--card))'
              }}>
                <h3 style={{ fontWeight: '600', margin: 0 }}>Notificaciones</h3>
                {notificacionesNoLeidas > 0 && (
                  <button onClick={handleMarcarTodasLeidas} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                    Marcar todas leídas
                  </button>
                )}
              </div>
              
              {notificaciones.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                  <Bell size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                  <p>No tienes notificaciones</p>
                </div>
              ) : (
                notificaciones.map(notif => (
                  <div 
                    key={notif._id}
                    onClick={() => !notif.leida && handleMarcarLeida(notif._id)}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid hsl(var(--border))',
                      cursor: notif.leida ? 'default' : 'pointer',
                      backgroundColor: notif.leida ? 'transparent' : 'hsl(var(--primary) / 0.05)',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: notif.tipo === 'success' ? 'hsl(142 76% 36% / 0.1)' :
                                  notif.tipo === 'warning' ? 'hsl(38 92% 50% / 0.1)' :
                                  notif.tipo === 'error' ? 'hsl(0 84% 60% / 0.1)' : 'hsl(var(--primary) / 0.1)'
                      }}>
                        {notif.tipo === 'success' && <CheckCircle size={16} style={{ color: 'hsl(142 76% 36%)' }} />}
                        {notif.tipo === 'warning' && <AlertCircle size={16} style={{ color: 'hsl(38 92% 50%)' }} />}
                        {notif.tipo === 'error' && <XCircle size={16} style={{ color: 'hsl(0 84% 60%)' }} />}
                        {notif.tipo === 'info' && <Bell size={16} style={{ color: 'hsl(var(--primary))' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: notif.leida ? '400' : '600', fontSize: '0.875rem' }}>
                          {notif.titulo}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
                          {notif.mensaje}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                          {new Date(notif.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!notif.leida && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', flexShrink: 0 }}></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              data-testid={`tab-${tab.id}`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Tab: Inicio */}
      {activeTab === 'inicio' && dashboard && (
        <div>
          {/* Perfil */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'hsl(var(--primary) / 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {dashboard.empleado?.foto_url ? (
                  <img src={`${BACKEND_URL}${dashboard.empleado.foto_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} style={{ color: 'hsl(var(--primary))' }} />
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{dashboard.empleado?.nombre}</h2>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {dashboard.empleado?.puesto} {dashboard.empleado?.departamento && `• ${dashboard.empleado.departamento}`}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  Código: {dashboard.empleado?.codigo}
                </p>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <button 
                  onClick={() => setShowFicharModal(true)} 
                  className="btn btn-primary"
                  style={{ padding: '1rem 2rem' }}
                  data-testid="btn-fichar"
                >
                  <Clock size={20} />
                  Fichar Ahora
                </button>
              </div>
            </div>
          </div>
          
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <Clock size={28} style={{ margin: '0 auto', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>{dashboard.horas_mes || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Este Mes</div>
            </div>
            
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <FileText size={28} style={{ margin: '0 auto', color: 'hsl(38 92% 50%)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>{dashboard.documentos_pendientes_firma || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Docs. Pendientes Firma</div>
            </div>
            
            <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <Calendar size={28} style={{ margin: '0 auto', color: 'hsl(217 91% 60%)', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>{dashboard.ausencias_pendientes || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Solicitudes Pendientes</div>
            </div>
            
            {dashboard.ultima_prenomina && (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                <CreditCard size={28} style={{ margin: '0 auto', color: 'hsl(142 76% 36%)', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>
                  {(dashboard.ultima_prenomina.importe_neto || 0).toFixed(2)} €
                </div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  Última Nómina ({meses[(dashboard.ultima_prenomina.periodo_mes || 1) - 1]})
                </div>
              </div>
            )}
          </div>
          
          {/* Fichajes de Hoy */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
              <h3 style={{ fontWeight: '600' }}>Fichajes de Hoy</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              {dashboard.fichajes_hoy?.length === 0 ? (
                <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '1rem' }}>
                  No has fichado hoy. Haz clic en "Fichar Ahora" para registrar tu entrada.
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {dashboard.fichajes_hoy?.map((f, idx) => (
                    <div key={idx} style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '0.5rem',
                      background: f.tipo === 'entrada' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {f.tipo === 'entrada' ? <LogIn size={18} style={{ color: 'hsl(142 76% 36%)' }} /> : <LogOut size={18} style={{ color: 'hsl(0 84% 60%)' }} />}
                      <span style={{ fontWeight: '500' }}>{f.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                      <span style={{ fontFamily: 'monospace' }}>{f.hora}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Próximas Ausencias */}
          {dashboard.proximas_ausencias?.length > 0 && (
            <div className="card">
              <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                <h3 style={{ fontWeight: '600' }}>Próximas Ausencias Aprobadas</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                {dashboard.proximas_ausencias.map((a, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'hsl(var(--muted) / 0.3)',
                    marginBottom: idx < dashboard.proximas_ausencias.length - 1 ? '0.5rem' : 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{a.tipo}</span>
                      <span style={{ margin: '0 0.5rem', color: 'hsl(var(--muted-foreground))' }}>•</span>
                      <span>{a.fecha_inicio} - {a.fecha_fin}</span>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      background: 'hsl(142 76% 36% / 0.1)',
                      color: 'hsl(142 76% 36%)'
                    }}>
                      Aprobada
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Tab: Fichajes */}
      {activeTab === 'fichajes' && (
        <div className="card">
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: '600' }}>Historial de Fichajes</h3>
            <button onClick={() => setShowFicharModal(true)} className="btn btn-primary btn-sm">
              <Clock size={16} />
              Fichar
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Hora</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {fichajes.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay fichajes registrados</td></tr>
                ) : fichajes.map(f => (
                  <tr key={f._id}>
                    <td>{f.fecha}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        background: f.tipo === 'entrada' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                        color: f.tipo === 'entrada' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
                      }}>
                        {f.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{f.hora}</td>
                    <td>{f.metodo_identificacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <div className="card">
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
            <h3 style={{ fontWeight: '600' }}>Mis Documentos</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay documentos</td></tr>
                ) : documentos.map(d => (
                  <tr key={d._id}>
                    <td style={{ fontWeight: '500' }}>{d.nombre}</td>
                    <td>{d.tipo_documento}</td>
                    <td>{d.fecha_registro?.split('T')[0]}</td>
                    <td>
                      {d.requiere_firma && !d.firmado ? (
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', background: 'hsl(38 92% 50% / 0.1)', color: 'hsl(38 92% 50%)' }}>
                          Pendiente Firma
                        </span>
                      ) : d.firmado ? (
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', background: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)' }}>
                          Firmado
                        </span>
                      ) : (
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                          Disponible
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {d.file_path && (
                          <a href={`${BACKEND_URL}${d.file_path}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Descargar">
                            <Download size={16} />
                          </a>
                        )}
                        {d.requiere_firma && !d.firmado && (
                          <button 
                            onClick={() => { setDocumentoParaFirmar(d); setShowFirmaModal(true); }}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'hsl(var(--primary))' }}
                            title="Firmar"
                          >
                            <PenTool size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Tab: Nóminas */}
      {activeTab === 'nominas' && (
        <div className="card">
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
            <h3 style={{ fontWeight: '600' }}>Mis Nóminas</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Horas Normales</th>
                  <th>Horas Extra</th>
                  <th>Total Horas</th>
                  <th>Importe Bruto</th>
                  <th>Importe Neto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {prenominas.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No hay nóminas disponibles</td></tr>
                ) : prenominas.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '500' }}>{meses[(p.periodo_mes || 1) - 1]} {p.periodo_ano}</td>
                    <td>{(p.horas_normales || 0).toFixed(1)}</td>
                    <td style={{ color: p.horas_extra > 0 ? 'hsl(38 92% 50%)' : 'inherit' }}>{(p.horas_extra || 0).toFixed(1)}</td>
                    <td style={{ fontWeight: '600' }}>{(p.total_horas || 0).toFixed(1)}</td>
                    <td>{(p.importe_bruto || 0).toFixed(2)} €</td>
                    <td style={{ fontWeight: '600', color: 'hsl(142 76% 36%)' }}>{(p.importe_neto || 0).toFixed(2)} €</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        background: p.estado === 'validada' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(38 92% 50% / 0.1)',
                        color: p.estado === 'validada' ? 'hsl(142 76% 36%)' : 'hsl(38 92% 50%)'
                      }}>
                        {p.estado === 'validada' ? 'Validada' : 'Borrador'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Tab: Ausencias */}
      {activeTab === 'ausencias' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAusenciaModal(true)} className="btn btn-primary">
              <Calendar size={18} />
              Solicitar Ausencia
            </button>
          </div>
          <div className="card">
            <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
              <h3 style={{ fontWeight: '600' }}>Mis Ausencias</h3>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ausencias.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay ausencias registradas</td></tr>
                  ) : ausencias.map(a => (
                    <tr key={a._id}>
                      <td style={{ textTransform: 'capitalize', fontWeight: '500' }}>{a.tipo}</td>
                      <td>{a.fecha_inicio}</td>
                      <td>{a.fecha_fin}</td>
                      <td>{a.motivo || '-'}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: a.estado === 'aprobada' ? 'hsl(142 76% 36% / 0.1)' : 
                                    a.estado === 'rechazada' ? 'hsl(0 84% 60% / 0.1)' : 'hsl(38 92% 50% / 0.1)',
                          color: a.estado === 'aprobada' ? 'hsl(142 76% 36%)' : 
                                a.estado === 'rechazada' ? 'hsl(0 84% 60%)' : 'hsl(38 92% 50%)'
                        }}>
                          {a.estado === 'aprobada' && <CheckCircle size={12} />}
                          {a.estado === 'rechazada' && <XCircle size={12} />}
                          {a.estado === 'pendiente' && <AlertCircle size={12} />}
                          {a.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Fichar */}
      {showFicharModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowFicharModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'hsl(var(--card))', borderRadius: '12px',
            padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Registrar Fichaje</h2>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => handleFichar('entrada')}
                className="btn btn-primary"
                style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                data-testid="btn-fichar-entrada"
              >
                <LogIn size={32} />
                Entrada
              </button>
              <button
                onClick={() => handleFichar('salida')}
                className="btn btn-secondary"
                style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'hsl(0 84% 60% / 0.1)', borderColor: 'hsl(0 84% 60%)', color: 'hsl(0 84% 60%)' }}
                data-testid="btn-fichar-salida"
              >
                <LogOut size={32} />
                Salida
              </button>
            </div>
            <button onClick={() => setShowFicharModal(false)} className="btn btn-ghost" style={{ marginTop: '1.5rem' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      
      {/* Modal Solicitar Ausencia */}
      {showAusenciaModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAusenciaModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'hsl(var(--card))', borderRadius: '12px',
            width: '100%', maxWidth: '500px'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Solicitar Ausencia</h2>
              <button onClick={() => setShowAusenciaModal(false)} className="btn btn-ghost"><X size={20} /></button>
            </div>
            <form onSubmit={handleSolicitarAusencia} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Ausencia</label>
                <select
                  className="form-select"
                  value={ausenciaForm.tipo}
                  onChange={e => setAusenciaForm({...ausenciaForm, tipo: e.target.value})}
                  required
                >
                  <option value="vacaciones">Vacaciones</option>
                  <option value="permiso">Permiso Personal</option>
                  <option value="baja_medica">Baja Médica</option>
                  <option value="asuntos_propios">Asuntos Propios</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha Inicio</label>
                  <input
                    type="date"
                    className="form-input"
                    value={ausenciaForm.fecha_inicio}
                    onChange={e => setAusenciaForm({...ausenciaForm, fecha_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Fin</label>
                  <input
                    type="date"
                    className="form-input"
                    value={ausenciaForm.fecha_fin}
                    onChange={e => setAusenciaForm({...ausenciaForm, fecha_fin: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Motivo (Opcional)</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={ausenciaForm.motivo}
                  onChange={e => setAusenciaForm({...ausenciaForm, motivo: e.target.value})}
                  placeholder="Describe brevemente el motivo de la ausencia..."
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAusenciaModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal Firmar Documento */}
      {showFirmaModal && documentoParaFirmar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowFirmaModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'hsl(var(--card))', borderRadius: '12px',
            width: '100%', maxWidth: '500px'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Firmar Documento</h2>
              <button onClick={() => setShowFirmaModal(false)} className="btn btn-ghost"><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Documento:</strong> {documentoParaFirmar.nombre}
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tu Firma:</label>
                <div style={{ border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', background: 'white' }}>
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{ width: 450, height: 150, className: 'signature-canvas' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => sigCanvas.current?.clear()}
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.5rem' }}
                >
                  Limpiar
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowFirmaModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button onClick={handleFirmarDocumento} className="btn btn-primary" style={{ flex: 1 }}>
                  <PenTool size={18} />
                  Firmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalEmpleado;
