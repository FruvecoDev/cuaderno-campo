import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MapPin, FileText, Sprout, Euro, Calendar as CalendarIcon, Bell, Layers, Satellite, ChevronLeft, ChevronRight, Mail, Send, CheckCircle, AlertCircle, Eye, Edit2, Home, AlertTriangle, Building2, Wheat, Droplets, Clock, Package, FileSignature, ShoppingCart, TrendingDown, ClipboardList, Users, Settings, X, GripVertical, RotateCcw, Save, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../App.css';

// Subcomponentes extraidos
import VisitasCalendar from '../components/dashboard/VisitasCalendar';
import DashboardConfigModal from '../components/dashboard/DashboardConfigModal';
import DashboardFincasWidget from '../components/dashboard/DashboardFincasWidget';
import DashboardContratosWidget from '../components/dashboard/DashboardContratosWidget';
import DashboardMapWidget from '../components/dashboard/DashboardMapWidget';
import DashboardExportWidget from '../components/dashboard/DashboardExportWidget';
import DashboardAlertasWidget from '../components/dashboard/DashboardAlertasWidget';

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [visitasPlanificadas, setVisitasPlanificadas] = useState([]);
  const [selectedVisita, setSelectedVisita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('satellite');
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState(null);
  
  // Dashboard configuration
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configWidgets, setConfigWidgets] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);
  
  const { token, user, canDoOperacion } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const puedeCompra = canDoOperacion('compra');
  const puedeVenta = canDoOperacion('venta');
  
  useEffect(() => {
    fetchDashboardData();
    fetchParcelas();
    fetchVisitasPlanificadas();
    fetchNotificationStatus();
    fetchDashboardConfig();
  }, []);
  
  const fetchDashboardConfig = async () => {
    try {
      const data = await api.get('/api/dashboard/config');
      const availableWidgets = data.available_widgets || [];
      const userConfig = data.config?.widgets || [];
      const mergedWidgets = availableWidgets.map((available, idx) => {
        const userWidget = userConfig.find(w => w.widget_id === available.widget_id);
        return { ...available, visible: userWidget ? userWidget.visible : true, order: userWidget ? userWidget.order : idx };
      });
      mergedWidgets.sort((a, b) => a.order - b.order);
      setDashboardConfig({ ...data.config, widgets: mergedWidgets });
      setConfigWidgets(mergedWidgets);
    } catch (error) { console.error('Error fetching dashboard config:', error); }
  };
  
  const saveDashboardConfig = async () => {
    setSavingConfig(true);
    try {
      await api.post('/api/dashboard/config', { widgets: configWidgets, layout: dashboardConfig?.layout || 'default' });
      setDashboardConfig({ ...dashboardConfig, widgets: configWidgets });
      setShowConfigModal(false);
    } catch (error) { console.error('Error saving dashboard config:', error); }
    finally { setSavingConfig(false); }
  };
  
  const resetDashboardConfig = async () => {
    try {
      const data = await api.post('/api/dashboard/config/reset', {});
      setDashboardConfig(data.config);
      setConfigWidgets(data.config?.widgets || []);
    } catch (error) { console.error('Error resetting dashboard config:', error); }
  };
  
  const toggleWidgetVisibility = (widgetId) => {
    setConfigWidgets(prev => prev.map(w => w.widget_id === widgetId ? { ...w, visible: !w.visible } : w));
  };
  
  const moveWidgetUp = (index) => {
    if (index === 0) return;
    setConfigWidgets(prev => {
      const n = [...prev]; const tmp = n[index]; n[index] = n[index - 1]; n[index - 1] = tmp;
      return n.map((w, i) => ({ ...w, order: i }));
    });
  };
  
  const moveWidgetDown = (index) => {
    if (index === configWidgets.length - 1) return;
    setConfigWidgets(prev => {
      const n = [...prev]; const tmp = n[index]; n[index] = n[index + 1]; n[index + 1] = tmp;
      return n.map((w, i) => ({ ...w, order: i }));
    });
  };
  
  const isWidgetVisible = (widgetId) => {
    if (!dashboardConfig?.widgets) return true;
    const widget = dashboardConfig.widgets.find(w => w.widget_id === widgetId);
    return widget ? widget.visible : true;
  };
  
  const getWidgetOrder = (widgetId) => {
    if (!dashboardConfig?.widgets) return 999;
    const widget = dashboardConfig.widgets.find(w => w.widget_id === widgetId);
    return widget ? widget.order : 999;
  };
  
  const sortedWidgetIds = useMemo(() => {
    if (!dashboardConfig?.widgets) {
      return ['kpis_principales', 'resumen_fincas', 'proximas_cosechas', 'tratamientos_pendientes', 
              'contratos_activos', 'proximas_visitas', 'graficos_cultivos', 'mapa_parcelas', 
              'calendario', 'actividad_reciente'];
    }
    return [...dashboardConfig.widgets].sort((a, b) => a.order - b.order).map(w => w.widget_id);
  }, [dashboardConfig]);
  
  const fetchDashboardData = async () => {
    try { const data = await api.get('/api/dashboard/kpis'); setKpis(data); }
    catch (error) { console.error('Error fetching dashboard:', error); }
    finally { setLoading(false); }
  };
  
  const fetchParcelas = async () => {
    try { const data = await api.get('/api/parcelas'); setParcelas(data.parcelas || []); }
    catch (error) { console.error('Error fetching parcelas:', error); }
  };
  
  const fetchVisitasPlanificadas = async () => {
    try { const data = await api.get('/api/visitas/planificadas'); setVisitasPlanificadas(data.visitas || []); }
    catch (error) { console.error('Error fetching visitas planificadas:', error); }
  };
  
  const fetchNotificationStatus = async () => {
    try { const data = await api.get('/api/notifications/status'); setNotificationStatus(data); }
    catch (error) { console.error('Error fetching notification status:', error); }
  };
  
  const sendVisitReminders = async () => {
    setSendingNotification(true); setNotificationResult(null);
    try {
      const data = await api.post('/api/notifications/send-visit-reminders?days_ahead=7', {});
      setNotificationResult({ success: data.success, message: data.message, sent: data.reminders_sent });
    } catch (error) { setNotificationResult({ success: false, message: 'Error al enviar notificaciones' }); }
    finally { setSendingNotification(false); setTimeout(() => setNotificationResult(null), 5000); }
  };
  
  const sendTestEmail = async () => {
    if (!user?.email) { setNotificationResult({ success: false, message: 'No se encontro email del usuario' }); return; }
    setSendingNotification(true); setNotificationResult(null);
    try {
      const data = await api.post('/api/notifications/test', { email: user.email });
      setNotificationResult({ success: data.success !== false, message: data.message || 'Email de prueba enviado' });
    } catch (error) { setNotificationResult({ success: false, message: 'Error al enviar email de prueba' }); }
    finally { setSendingNotification(false); setTimeout(() => setNotificationResult(null), 5000); }
  };
  
  if (loading) {
    return (<div data-testid="dashboard-loading"><h1 style={{ marginBottom: '2rem' }}>{t('dashboard.title')}</h1><p>{t('common.loading')}</p></div>);
  }
  if (!kpis) {
    return (<div data-testid="dashboard-error"><h1>{t('dashboard.title')}</h1><p>{t('messages.errorLoading')}</p></div>);
  }
  
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', '#8884d8', '#82ca9d', '#ffc658'];
  
  const cultivoData = Object.entries(kpis.produccion.por_cultivo || {}).map(([name, data]) => ({
    name, parcelas: data.parcelas, superficie: data.superficie
  }));
  
  return (
    <div data-testid="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('dashboard.title')}</h1>
        <button onClick={() => setShowConfigModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-testid="btn-config-dashboard">
          <Settings size={18} /> Configurar
        </button>
      </div>
      
      {/* Modal de Configuracion */}
      {showConfigModal && (
        <DashboardConfigModal
          configWidgets={configWidgets}
          toggleWidgetVisibility={toggleWidgetVisibility}
          moveWidgetUp={moveWidgetUp}
          moveWidgetDown={moveWidgetDown}
          saveDashboardConfig={saveDashboardConfig}
          resetDashboardConfig={resetDashboardConfig}
          savingConfig={savingConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* KPI Cards */}
      {isWidgetVisible('kpis_principales') && (
      <div className="stats-grid" data-testid="dashboard-kpis" style={{ order: getWidgetOrder('kpis_principales') }}>
        {puedeCompra && (
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.purchaseContracts')}</div>
          <div className="stat-value">{kpis.totales.contratos_compra || 0}</div>
          <div className="text-sm text-muted">{t('common.active')}</div>
        </div>
        )}
        {puedeVenta && (
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.saleContracts')}</div>
          <div className="stat-value">{kpis.totales.contratos_venta || 0}</div>
          <div className="text-sm text-muted">{t('common.active')}</div>
        </div>
        )}
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.activeParcels')}</div>
          <div className="stat-value">{kpis.totales.parcelas_activas}</div>
          <div className="text-sm text-muted">de {kpis.totales.parcelas} {t('common.total').toLowerCase()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('parcels.surface')} {t('common.total')}</div>
          <div className="stat-value">{kpis.superficie.total_ha.toFixed(2)}</div>
          <div className="text-sm text-muted">{t('units.hectares')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.treatments')}</div>
          <div className="stat-value">{kpis.totales.tratamientos}</div>
          <div className="text-sm text-muted">{t('common.total')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.totalProduction')}</div>
          <div className="stat-value">{(kpis.produccion.total_kg / 1000).toFixed(1)}</div>
          <div className="text-sm text-muted">{t('dashboard.stats.tons')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.income')}</div>
          <div className="stat-value">{'\u20AC'}{kpis.produccion.total_ingresos.toLocaleString()}</div>
          <div className="text-sm text-muted">{t('dashboard.stats.totalBilled')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.costs')}</div>
          <div className="stat-value">{'\u20AC'}{kpis.costes.total.toLocaleString()}</div>
          <div className="text-sm text-muted">{t('dashboard.stats.totalExpenses')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.grossMargin')}</div>
          <div className="stat-value">{'\u20AC'}{kpis.rentabilidad.margen_bruto.toLocaleString()}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} style={{ display: 'inline' }} />
            {kpis.produccion.total_ingresos > 0 ? ((kpis.rentabilidad.margen_bruto / kpis.produccion.total_ingresos) * 100).toFixed(1) : '0.0'}% {t('dashboard.stats.margin')}
          </div>
        </div>
      </div>
      )}
      
      {/* Productividad Widget - New Advanced KPIs */}
      <div className="card mb-6" data-testid="dashboard-productividad" style={{ order: getWidgetOrder('kpis_principales') + 0.5 }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <TrendingUp size={20} style={{ color: 'hsl(var(--chart-1))' }} /> Análisis de Productividad
        </h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #4caf50' }}>
            <div className="stat-label">Rendimiento</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {kpis.superficie.total_ha > 0 ? (kpis.produccion.total_kg / kpis.superficie.total_ha).toFixed(0) : '0'}
            </div>
            <div className="text-sm text-muted">kg / ha</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #f44336' }}>
            <div className="stat-label">Coste por Hectárea</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {'\u20AC'}{kpis.superficie.total_ha > 0 ? (kpis.costes.total / kpis.superficie.total_ha).toFixed(0) : '0'}
            </div>
            <div className="text-sm text-muted">{'\u20AC'} / ha</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #2196f3' }}>
            <div className="stat-label">Ingresos por Hectárea</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {'\u20AC'}{kpis.superficie.total_ha > 0 ? (kpis.produccion.total_ingresos / kpis.superficie.total_ha).toFixed(0) : '0'}
            </div>
            <div className="text-sm text-muted">{'\u20AC'} / ha</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #ff9800' }}>
            <div className="stat-label">Margen Neto / ha</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {'\u20AC'}{kpis.superficie.total_ha > 0 ? (kpis.rentabilidad.margen_bruto / kpis.superficie.total_ha).toFixed(0) : '0'}
            </div>
            <div className="text-sm text-muted">{'\u20AC'} / ha</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #9c27b0' }}>
            <div className="stat-label">Superficie Media</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {kpis.superficie.promedio_ha_parcela?.toFixed(2) || '0'}
            </div>
            <div className="text-sm text-muted">ha / parcela</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #00bcd4' }}>
            <div className="stat-label">Precio Medio / kg</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>
              {'\u20AC'}{kpis.produccion.total_kg > 0 ? (kpis.produccion.total_ingresos / kpis.produccion.total_kg).toFixed(2) : '0'}
            </div>
            <div className="text-sm text-muted">{'\u20AC'} / kg</div>
          </div>
        </div>
      </div>
      
      {/* Centro de Exportacion */}
      {isWidgetVisible('centro_exportacion') && (
        <div style={{ order: getWidgetOrder('centro_exportacion'), marginBottom: '1.5rem' }}>
          <DashboardExportWidget />
        </div>
      )}

      {/* Alertas y Avisos */}
      {isWidgetVisible('alertas_avisos') && (
        <div style={{ order: getWidgetOrder('alertas_avisos'), marginBottom: '1.5rem' }}>
          <DashboardAlertasWidget />
        </div>
      )}
      
      {/* Fincas Widget */}
      {isWidgetVisible('resumen_fincas') && kpis.fincas && (
        <div style={{ order: getWidgetOrder('resumen_fincas') }}>
          <DashboardFincasWidget kpis={kpis} navigate={navigate} />
        </div>
      )}
      
      {/* Proximas Cosechas y Tratamientos Pendientes */}
      {(isWidgetVisible('proximas_cosechas') || isWidgetVisible('tratamientos_pendientes')) && (
      <div className="grid-2 mb-6" data-testid="dashboard-widgets" style={{ order: Math.min(getWidgetOrder('proximas_cosechas'), getWidgetOrder('tratamientos_pendientes')) }}>
        {isWidgetVisible('proximas_cosechas') && (
        <div className="card" data-testid="proximas-cosechas">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wheat size={20} style={{ color: '#f57c00' }} /> Proximas Cosechas
            </h2>
            {kpis.proximas_cosechas?.length > 0 && (
              <span style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                {kpis.proximas_cosechas.length} planificadas
              </span>
            )}
          </div>
          {kpis.proximas_cosechas?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              {kpis.proximas_cosechas.map((cosecha, idx) => {
                const fechaCosecha = new Date(cosecha.fecha_planificada);
                const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaCosecha - hoy) / (1000 * 60 * 60 * 24));
                const esUrgente = diasRestantes <= 3 && diasRestantes >= 0;
                const esProxima = diasRestantes <= 7 && diasRestantes > 3;
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem',
                    backgroundColor: esUrgente ? '#fff3e0' : esProxima ? '#fffde7' : 'hsl(var(--muted))',
                    borderRadius: '8px', borderLeft: `4px solid ${esUrgente ? '#f57c00' : esProxima ? '#fbc02d' : '#4caf50'}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {esUrgente && <Clock size={14} style={{ color: '#f57c00' }} />}
                        {cosecha.cultivo || 'Sin cultivo'}
                        {cosecha.variedad && <span style={{ fontWeight: '400', color: '#666' }}>- {cosecha.variedad}</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                        {cosecha.proveedor} {cosecha.parcela && `| ${cosecha.parcela}`}
                      </div>
                      {cosecha.kilos_estimados > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#4caf50', fontWeight: '500' }}>
                          <Package size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {cosecha.kilos_estimados.toLocaleString()} kg estimados
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: esUrgente ? '#e65100' : esProxima ? '#f9a825' : '#2e7d32' }}>
                        {fechaCosecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                        {diasRestantes === 0 ? 'Hoy!' : diasRestantes === 1 ? 'Manana' : diasRestantes < 0 ? `Hace ${Math.abs(diasRestantes)} dias` : `En ${diasRestantes} dias`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
              <Wheat size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted">No hay cosechas planificadas proximamente</p>
            </div>
          )}
          {kpis.fincas_recoleccion_semana?.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Home size={14} /> Fincas en recoleccion esta semana
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {kpis.fincas_recoleccion_semana.map((f, idx) => (
                  <div key={idx} style={{ backgroundColor: '#e8f5e9', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '600', color: '#2d5a27' }}>{f.denominacion}</span>
                    <span style={{ color: '#666' }}>({f.hectareas} ha)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
        
        {isWidgetVisible('tratamientos_pendientes') && (
        <div className="card" data-testid="tratamientos-pendientes">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Droplets size={20} style={{ color: '#1976d2' }} /> Tratamientos Pendientes
            </h2>
            {kpis.tratamientos_pendientes?.length > 0 && (
              <span style={{ backgroundColor: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
                {kpis.tratamientos_pendientes.length} pendientes
              </span>
            )}
          </div>
          {kpis.tratamientos_pendientes?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              {kpis.tratamientos_pendientes.map((trat, idx) => {
                const fechaTrat = trat.fecha_tratamiento ? new Date(trat.fecha_tratamiento) : null;
                const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                const diasRestantes = fechaTrat ? Math.ceil((fechaTrat - hoy) / (1000 * 60 * 60 * 24)) : null;
                const esVencido = diasRestantes !== null && diasRestantes < 0;
                const esUrgente = diasRestantes !== null && diasRestantes <= 2 && diasRestantes >= 0;
                const prioridadAlta = trat.prioridad === 'alta' || trat.prioridad === 'urgente';
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem',
                    backgroundColor: esVencido ? '#ffebee' : esUrgente || prioridadAlta ? '#fff3e0' : 'hsl(var(--muted))',
                    borderRadius: '8px', borderLeft: `4px solid ${esVencido ? '#c62828' : esUrgente || prioridadAlta ? '#f57c00' : '#1976d2'}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(esVencido || prioridadAlta) && <AlertCircle size={14} style={{ color: esVencido ? '#c62828' : '#f57c00' }} />}
                        {trat.tipo_tratamiento || 'Tratamiento'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                        {trat.cultivo} {trat.parcela && `| ${trat.parcela}`}
                      </div>
                      {trat.superficie_aplicacion > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#1976d2' }}>{trat.superficie_aplicacion} ha a tratar</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {fechaTrat ? (
                        <>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: esVencido ? '#c62828' : esUrgente ? '#e65100' : '#1565c0' }}>
                            {fechaTrat.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                            {diasRestantes === 0 ? 'Hoy!' : diasRestantes === 1 ? 'Manana' : esVencido ? `Hace ${Math.abs(diasRestantes)} dias` : `En ${diasRestantes} dias`}
                          </div>
                        </>
                      ) : (
                        <span style={{ backgroundColor: '#e3f2fd', color: '#1565c0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                          {trat.estado || 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
              <CheckCircle size={40} style={{ color: '#4caf50', marginBottom: '0.5rem' }} />
              <p className="text-muted">No hay tratamientos pendientes</p>
              <p style={{ fontSize: '0.8rem', color: '#4caf50' }}>Todo al dia!</p>
            </div>
          )}
          <button onClick={() => navigate('/tratamientos')} className="btn btn-sm btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
            Ver todos los tratamientos
          </button>
        </div>
        )}
      </div>
      )}
      
      {/* Contratos Widget */}
      {isWidgetVisible('contratos_activos') && kpis.contratos_stats && (
        <div style={{ order: getWidgetOrder('contratos_activos') }}>
          <DashboardContratosWidget kpis={kpis} navigate={navigate} />
        </div>
      )}
      
      {/* Proximas Visitas */}
      {isWidgetVisible('proximas_visitas') && kpis.visitas_stats && (
        <div className="card mb-6" data-testid="proximas-visitas" style={{ order: getWidgetOrder('proximas_visitas') }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={22} style={{ color: '#00897b' }} /> Proximas Visitas
            </h2>
            <button onClick={() => navigate('/visitas')} className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Ver todas</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#e0f2f1', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#00695c', fontWeight: '500' }}>Visitas Este Mes</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#00897b' }}>{kpis.visitas_stats.total_mes || 0}</div>
            </div>
            <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: '500' }}>Realizadas</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#43a047' }}>{kpis.visitas_stats.realizadas_mes || 0}</div>
            </div>
            <div style={{ backgroundColor: '#fff3e0', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#e65100', fontWeight: '500' }}>Pendientes</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f57c00' }}>{kpis.visitas_stats.pendientes || 0}</div>
            </div>
            <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#1565c0', fontWeight: '500' }}>Prox. 14 dias</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1976d2' }}>{kpis.visitas_stats.proximas_14_dias || 0}</div>
            </div>
          </div>
          {kpis.visitas_proximas?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {kpis.visitas_proximas.map((visita, idx) => {
                const fechaVisita = new Date(visita.fecha);
                const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaVisita - hoy) / (1000 * 60 * 60 * 24));
                const esHoy = diasRestantes === 0;
                const esManana = diasRestantes === 1;
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem',
                    backgroundColor: esHoy ? '#e0f2f1' : esManana ? '#e8f5e9' : 'hsl(var(--muted))',
                    borderRadius: '8px', borderLeft: `4px solid ${esHoy ? '#00897b' : esManana ? '#43a047' : '#90a4ae'}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {esHoy && <Clock size={14} style={{ color: '#00897b' }} />} {visita.objetivo || 'Visita'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                        {visita.parcela} | {visita.proveedor} | {visita.cultivo}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: esHoy ? '#00695c' : esManana ? '#2e7d32' : '#546e7a' }}>
                        {fechaVisita.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                        {esHoy ? 'Hoy!' : esManana ? 'Manana' : `En ${diasRestantes} dias`}
                      </div>
                    </div>
                    <button onClick={() => navigate(`/visitas?ver=${visita.id}`)} className="btn btn-sm" style={{ marginLeft: '0.75rem', backgroundColor: 'hsl(var(--muted))', padding: '4px 8px' }} title="Ver visita">
                      <Eye size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
              <ClipboardList size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted">No hay visitas planificadas para los proximos 14 dias</p>
              <button onClick={() => navigate('/visitas')} className="btn btn-sm btn-primary" style={{ marginTop: '0.5rem' }}>Planificar visita</button>
            </div>
          )}
        </div>
      )}
      
      {/* Charts */}
      {isWidgetVisible('graficos_cultivos') && (
      <div className="grid-2" style={{ marginBottom: '2rem', order: getWidgetOrder('graficos_cultivos') }}>
        {cultivoData.length > 0 && (
          <div className="card">
            <h2 className="card-title">{t('dashboard.charts.surfaceByCrop')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cultivoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="superficie" fill="hsl(var(--chart-1))" name={`${t('parcels.surface')} (ha)`} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card">
          <h2 className="card-title">{t('dashboard.charts.costDistribution')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: t('dashboard.charts.treatmentsCosts'), value: kpis.costes.tratamientos },
                  { name: t('dashboard.charts.irrigationCosts'), value: kpis.costes.riegos },
                  { name: t('dashboard.charts.tasksCosts'), value: kpis.costes.tareas }
                ]}
                cx="50%" cy="50%" labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80} fill="#8884d8" dataKey="value"
              >
                {COLORS.map((color, index) => (<Cell key={`cell-${index}`} fill={color} />))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
      
      {/* Mapa de Parcelas */}
      {isWidgetVisible('mapa_parcelas') && (
        <div style={{ order: getWidgetOrder('mapa_parcelas') }}>
          <DashboardMapWidget parcelas={parcelas} mapType={mapType} setMapType={setMapType} navigate={navigate} t={t} />
        </div>
      )}
      
      {/* Calendario y Planificador de Visitas */}
      {isWidgetVisible('calendario') && (
      <div className="grid-2 mb-6" style={{ order: getWidgetOrder('calendario') }}>
        <div className="card" data-testid="calendario-visitas">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={20} /> {t('dashboard.calendar.title')}
          </h2>
          <VisitasCalendar 
            visitas={visitasPlanificadas}
            t={t}
            onDateClick={(date) => {
              const dateStr = date.toISOString().split('T')[0];
              navigate(`/visitas?fecha=${dateStr}`);
            }}
          />
        </div>
        
        <div className="card" data-testid="planificador-visitas">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} /> {t('dashboard.visits.title')}
            </h2>
            <button onClick={() => navigate('/visitas?planificar=true')} className="btn btn-sm btn-primary">
              <CalendarIcon size={14} style={{ marginRight: '0.25rem' }} /> {t('dashboard.visits.new')}
            </button>
          </div>
          {visitasPlanificadas.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
              {visitasPlanificadas.map((visita, idx) => {
                const fechaVisita = new Date(visita.fecha_planificada);
                const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaVisita - hoy) / (1000 * 60 * 60 * 24));
                const esUrgente = diasRestantes <= 2 && diasRestantes >= 0;
                const esProxima = diasRestantes <= 7 && diasRestantes > 2;
                const esVencida = diasRestantes < 0;
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem',
                    backgroundColor: esVencida ? '#fecaca' : esUrgente ? '#fee2e2' : esProxima ? '#fff3e0' : 'hsl(var(--muted))',
                    borderRadius: '8px', borderLeft: `4px solid ${esVencida ? '#991b1b' : esUrgente ? '#dc2626' : esProxima ? '#f57c00' : '#2d5a27'}`
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(esUrgente || esVencida) && <Bell size={14} style={{ color: esVencida ? '#991b1b' : '#dc2626' }} />}
                        {visita.objetivo}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                        {visita.proveedor} - {visita.cultivo}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: esVencida ? '#991b1b' : esUrgente ? '#dc2626' : esProxima ? '#f57c00' : '#2d5a27' }}>
                          {fechaVisita.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                          {diasRestantes === 0 ? t('dashboard.calendar.today') + '!' : 
                           diasRestantes === 1 ? t('dashboard.calendar.tomorrow') : 
                           esVencida ? t('dashboard.calendar.daysAgo', { days: Math.abs(diasRestantes) }) :
                           t('dashboard.calendar.inDays', { days: diasRestantes })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => setSelectedVisita(visita)} className="btn btn-sm" style={{ padding: '0.35rem 0.5rem', backgroundColor: 'hsl(var(--primary))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title={t('dashboard.visits.viewVisit')} data-testid={`ver-visita-${visita._id}`}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => setSelectedVisita(visita)} className="btn btn-sm" style={{ padding: '0.35rem 0.5rem', backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '4px', cursor: 'pointer' }} title={t('dashboard.visits.editVisit')} data-testid={`editar-visita-${visita._id}`}>
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
              <CalendarIcon size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted" style={{ marginBottom: '0.75rem' }}>{t('dashboard.visits.noPlanned')}</p>
              <button onClick={() => navigate('/visitas?planificar=true')} className="btn btn-primary btn-sm">{t('dashboard.visits.planFirst')}</button>
            </div>
          )}
        </div>
      </div>
      )}
      
      {/* Panel de Notificaciones por Email */}
      {isWidgetVisible('actividad_reciente') && (
      <div className="card mb-6" data-testid="panel-notificaciones" style={{ order: getWidgetOrder('actividad_reciente') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={20} /> {t('dashboard.notifications.title')}
          </h2>
          {notificationStatus && (
            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: notificationStatus.configured ? '#e8f5e9' : '#fff3e0', color: notificationStatus.configured ? '#2d5a27' : '#f57c00' }}>
              {notificationStatus.configured ? `${t('dashboard.notifications.configured')}` : `${t('dashboard.notifications.notConfigured')}`}
            </span>
          )}
        </div>
        <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t('dashboard.notifications.description')}</p>
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
            {visitasPlanificadas.length > 0 ? t('dashboard.notifications.plannedVisits', { count: visitasPlanificadas.length }) : t('dashboard.notifications.noVisitsToNotify')}
          </p>
        </div>
        {notificationResult && (
          <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '6px', backgroundColor: notificationResult.success ? '#e8f5e9' : '#ffebee', border: `1px solid ${notificationResult.success ? '#4CAF50' : '#f44336'}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notificationResult.success ? <CheckCircle size={18} style={{ color: '#4CAF50' }} /> : <AlertCircle size={18} style={{ color: '#f44336' }} />}
            <span style={{ fontSize: '0.875rem' }}>{notificationResult.message}</span>
            {notificationResult.sent !== undefined && (<span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>({notificationResult.sent} {t('dashboard.notifications.sent')})</span>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={sendVisitReminders} disabled={sendingNotification || !notificationStatus?.configured || visitasPlanificadas.length === 0} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={16} /> {sendingNotification ? t('dashboard.notifications.sending') : t('dashboard.notifications.sendReminders')}
          </button>
          <button onClick={sendTestEmail} disabled={sendingNotification || !notificationStatus?.configured} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={16} /> {t('dashboard.notifications.sendTestEmail')}
          </button>
        </div>
        {!notificationStatus?.configured && (
          <p style={{ fontSize: '0.75rem', color: '#f57c00', marginTop: '1rem', padding: '0.5rem', backgroundColor: '#fff8e1', borderRadius: '4px' }}>{t('dashboard.notifications.configureApi')}</p>
        )}
      </div>
      )}
      
      {/* Recent Activity */}
      {isWidgetVisible('actividad_reciente') && kpis.actividad_reciente && (
        <div className="grid-2" style={{ order: getWidgetOrder('actividad_reciente') + 1 }}>
          <div className="card">
            <h2 className="card-title">{t('dashboard.visits.recentVisits')}</h2>
            {kpis.actividad_reciente.visitas.length > 0 ? (
              <div>
                {kpis.actividad_reciente.visitas.slice(0, 5).map((visita, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="font-semibold">{visita.objetivo}</div>
                    <div className="text-sm text-muted">{visita.proveedor} - {visita.cultivo}</div>
                    <div className="text-xs text-muted">{new Date(visita.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-muted">{t('dashboard.visits.noVisitsRecorded')}</p>)}
          </div>
          <div className="card">
            <h2 className="card-title">{t('dashboard.treatments.recentTreatments')}</h2>
            {kpis.actividad_reciente.tratamientos.length > 0 ? (
              <div>
                {kpis.actividad_reciente.tratamientos.slice(0, 5).map((trat, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="font-semibold">{trat.tipo_tratamiento}</div>
                    <div className="text-sm text-muted">{trat.metodo_aplicacion} - {trat.superficie_aplicacion} ha</div>
                    <div className="text-xs text-muted">{new Date(trat.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-muted">{t('dashboard.treatments.noTreatmentsRecorded')}</p>)}
          </div>
        </div>
      )}
      
      </div>{/* Cierre del container flex de widgets */}
      
      {/* Modal de Detalles de Visita */}
      {selectedVisita && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedVisita(null)}>
          <div className="card" style={{ maxWidth: '550px', width: '90%', maxHeight: '80vh', overflow: 'auto', position: 'relative', padding: '1.5rem' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedVisita(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <Eye size={22} /> {t('dashboard.visits.visitDetails')}
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.objective')}</label>
                  <p style={{ fontWeight: '500', margin: 0 }}>{selectedVisita.objetivo}</p>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.date')}</label>
                  <p style={{ fontWeight: '500', margin: 0 }}>{selectedVisita.fecha_visita}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.provider')}</label>
                  <p style={{ margin: 0 }}>{selectedVisita.proveedor || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.crop')}</label>
                  <p style={{ margin: 0 }}>{selectedVisita.cultivo || 'N/A'}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.campaign')}</label>
                  <p style={{ margin: 0 }}>{selectedVisita.campana || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.status')}</label>
                  <span className={`badge ${selectedVisita.estado === 'Completada' ? 'badge-success' : selectedVisita.estado === 'Programada' ? 'badge-warning' : 'badge-secondary'}`}>
                    {selectedVisita.estado || 'Programada'}
                  </span>
                </div>
              </div>
              {selectedVisita.observaciones && (
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>{t('dashboard.visits.observations')}</label>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', backgroundColor: 'hsl(var(--muted) / 0.5)', padding: '0.75rem', borderRadius: '6px' }}>{selectedVisita.observaciones}</p>
                </div>
              )}
              {selectedVisita.cuestionario_plagas && Object.keys(selectedVisita.cuestionario_plagas).length > 0 && (
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.5rem' }}>{t('dashboard.visits.pestsQuestionnaire')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    {Object.entries(selectedVisita.cuestionario_plagas).map(([key, value]) => (
                      <div key={key} style={{ padding: '0.5rem', backgroundColor: value === 0 ? 'hsl(142 76% 36% / 0.1)' : value === 1 ? 'hsl(48 96% 53% / 0.2)' : 'hsl(0 84% 60% / 0.1)', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => { navigate(`/visitas?editar=${selectedVisita._id}`); setSelectedVisita(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={16} /> {t('dashboard.visits.edit')}
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedVisita(null)}>{t('dashboard.visits.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
