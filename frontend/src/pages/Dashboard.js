import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrendingUp, MapPin, FileText, Sprout, Euro, Calendar as CalendarIcon, Bell, Layers, Satellite, ChevronLeft, ChevronRight, Mail, Send, CheckCircle, AlertCircle, Eye, Edit2, Home, AlertTriangle, Building2, Wheat, Droplets, Clock, Package, FileSignature, ShoppingCart, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Tile layers para el mapa
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    name: 'Mapa Base'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    name: 'Satélite'
  }
};

// Componente para ajustar bounds del mapa
function FitAllBounds({ parcelas }) {
  const map = useMap();
  
  useEffect(() => {
    if (parcelas && parcelas.length > 0) {
      const allCoords = [];
      parcelas.forEach(p => {
        if (p.recintos && p.recintos[0]?.geometria) {
          p.recintos[0].geometria.forEach(coord => {
            allCoords.push([coord.lat, coord.lng]);
          });
        }
      });
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [map, parcelas]);
  
  return null;
}

// Colores por cultivo
const CULTIVO_COLORS = {
  'Guisante': '#4CAF50',
  'Brócoli': '#2E7D32',
  'Coliflor': '#81C784',
  'Lechuga': '#A5D6A7',
  'Espinaca': '#388E3C',
  'default': '#66BB6A'
};

const getCultivoColor = (cultivo) => {
  return CULTIVO_COLORS[cultivo] || CULTIVO_COLORS.default;
};

// Componente Calendario de Visitas
function VisitasCalendar({ visitas, onDateClick, t }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Obtener días con visitas
  const visitasPorDia = useMemo(() => {
    const map = {};
    visitas.forEach(v => {
      if (v.fecha_planificada) {
        const dateKey = v.fecha_planificada.split('T')[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(v);
      }
    });
    return map;
  }, [visitas]);
  
  const monthNames = t('dashboard.calendar.monthNames', { returnObjects: true }) || ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = t('dashboard.calendar.dayNames', { returnObjects: true }) || ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Primer día del mes (ajustado para que Lunes = 0)
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  
  // Días en el mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Generar días del calendario
  const calendarDays = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  
  const getDateKey = (day) => {
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  };
  
  const hasVisitas = (day) => {
    if (!day) return false;
    return visitasPorDia[getDateKey(day)]?.length > 0;
  };
  
  const getVisitasForDay = (day) => {
    if (!day) return [];
    return visitasPorDia[getDateKey(day)] || [];
  };
  
  return (
    <div style={{ padding: '0.5rem' }}>
      {/* Header del calendario */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={prevMonth} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontWeight: '600', fontSize: '1rem' }}>{monthNames[month]} {year}</span>
          <button onClick={goToToday} className="btn btn-sm" style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
            {t('dashboard.calendar.today')}
          </button>
        </div>
        <button onClick={nextMonth} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem' }}>
          <ChevronRight size={16} />
        </button>
      </div>
      
      {/* Días de la semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
        {dayNames.map(d => (
          <div key={d} style={{ 
            textAlign: 'center', 
            fontSize: '0.7rem', 
            fontWeight: '600', 
            color: 'hsl(var(--muted-foreground))',
            padding: '0.25rem'
          }}>
            {d}
          </div>
        ))}
      </div>
      
      {/* Grid de días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {calendarDays.map((day, idx) => {
          const visitasDelDia = getVisitasForDay(day);
          const tieneVisitas = visitasDelDia.length > 0;
          
          return (
            <div 
              key={idx}
              onClick={() => day && onDateClick && onDateClick(new Date(year, month, day))}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                cursor: day ? 'pointer' : 'default',
                backgroundColor: isToday(day) ? '#2d5a27' : tieneVisitas ? '#e8f5e9' : 'transparent',
                color: isToday(day) ? 'white' : 'inherit',
                border: tieneVisitas && !isToday(day) ? '2px solid #4CAF50' : '1px solid transparent',
                transition: 'all 0.15s ease',
                position: 'relative',
                minHeight: '40px'
              }}
              onMouseEnter={(e) => {
                if (day && !isToday(day)) {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (day && !isToday(day)) {
                  e.currentTarget.style.backgroundColor = tieneVisitas ? '#e8f5e9' : 'transparent';
                }
              }}
              title={tieneVisitas ? `${visitasDelDia.length} visita(s): ${visitasDelDia.map(v => v.objetivo).join(', ')}` : ''}
            >
              {day && (
                <>
                  <span style={{ fontSize: '0.85rem', fontWeight: isToday(day) || tieneVisitas ? '600' : '400' }}>
                    {day}
                  </span>
                  {tieneVisitas && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '2px', 
                      marginTop: '2px',
                      flexWrap: 'wrap',
                      justifyContent: 'center'
                    }}>
                      {visitasDelDia.slice(0, 3).map((_, i) => (
                        <div 
                          key={i} 
                          style={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            backgroundColor: isToday(day) ? 'white' : '#4CAF50'
                          }} 
                        />
                      ))}
                      {visitasDelDia.length > 3 && (
                        <span style={{ fontSize: '0.6rem', color: isToday(day) ? 'white' : '#2d5a27' }}>+</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Leyenda */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        marginTop: '1rem',
        padding: '0.5rem',
        backgroundColor: 'hsl(var(--muted))',
        borderRadius: '6px',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#2d5a27', borderRadius: '4px' }} />
          <span>{t('dashboard.calendar.today')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50', borderRadius: '4px' }} />
          <span>{t('dashboard.calendar.withVisits')}</span>
        </div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [visitasPlanificadas, setVisitasPlanificadas] = useState([]);
  const [selectedVisita, setSelectedVisita] = useState(null); // Modal de visita
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('satellite');
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState(null);
  const { token, user, canDoOperacion } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Permisos de operación
  const puedeCompra = canDoOperacion('compra');
  const puedeVenta = canDoOperacion('venta');
  
  useEffect(() => {
    fetchDashboardData();
    fetchParcelas();
    fetchVisitasPlanificadas();
    fetchNotificationStatus();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/kpis`);
      const data = await response.json();
      setKpis(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setParcelas(data.parcelas || []);
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    }
  };
  
  const fetchVisitasPlanificadas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/visitas/planificadas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setVisitasPlanificadas(data.visitas || []);
    } catch (error) {
      console.error('Error fetching visitas planificadas:', error);
    }
  };
  
  const fetchNotificationStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNotificationStatus(data);
    } catch (error) {
      console.error('Error fetching notification status:', error);
    }
  };
  
  const sendVisitReminders = async () => {
    setSendingNotification(true);
    setNotificationResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/send-visit-reminders?days_ahead=7`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setNotificationResult({
        success: data.success,
        message: data.message,
        sent: data.reminders_sent
      });
    } catch (error) {
      setNotificationResult({
        success: false,
        message: 'Error al enviar notificaciones'
      });
    } finally {
      setSendingNotification(false);
      // Clear result after 5 seconds
      setTimeout(() => setNotificationResult(null), 5000);
    }
  };
  
  const sendTestEmail = async () => {
    if (!user?.email) {
      setNotificationResult({
        success: false,
        message: 'No se encontró email del usuario'
      });
      return;
    }
    
    setSendingNotification(true);
    setNotificationResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/test`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user.email })
      });
      const data = await response.json();
      setNotificationResult({
        success: data.success !== false,
        message: data.message || 'Email de prueba enviado'
      });
    } catch (error) {
      setNotificationResult({
        success: false,
        message: 'Error al enviar email de prueba'
      });
    } finally {
      setSendingNotification(false);
      setTimeout(() => setNotificationResult(null), 5000);
    }
  };
  
  if (loading) {
    return (
      <div data-testid="dashboard-loading">
        <h1 style={{ marginBottom: '2rem' }}>{t('dashboard.title')}</h1>
        <p>{t('common.loading')}</p>
      </div>
    );
  }
  
  if (!kpis) {
    return (
      <div data-testid="dashboard-error">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('messages.errorLoading')}</p>
      </div>
    );
  }
  
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', '#8884d8', '#82ca9d', '#ffc658'];
  
  // Prepare chart data
  const cultivoData = Object.entries(kpis.produccion.por_cultivo || {}).map(([name, data]) => ({
    name,
    parcelas: data.parcelas,
    superficie: data.superficie
  }));
  
  // Prepare fincas chart data
  const fincasData = kpis.fincas ? Object.entries(kpis.fincas.por_provincia || {}).map(([name, data]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    fullName: name,
    fincas: data.count,
    hectareas: data.hectareas,
    propias: data.propias,
    alquiladas: data.alquiladas
  })).sort((a, b) => b.fincas - a.fincas) : [];
  
  const fincasTipoData = kpis.fincas ? [
    { name: 'Propias', value: kpis.fincas.propias, color: '#2d5a27' },
    { name: 'Alquiladas', value: kpis.fincas.alquiladas, color: '#f57c00' }
  ] : [];
  
  return (
    <div data-testid="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('dashboard.title')}</h1>
      </div>
      
      {/* KPI Cards */}
      <div className="stats-grid" data-testid="dashboard-kpis">
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
          <div className="stat-value">€{kpis.produccion.total_ingresos.toLocaleString()}</div>
          <div className="text-sm text-muted">{t('dashboard.stats.totalBilled')}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.costs')}</div>
          <div className="stat-value">€{kpis.costes.total.toLocaleString()}</div>
          <div className="text-sm text-muted">{t('dashboard.stats.totalExpenses')}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.stats.grossMargin')}</div>
          <div className="stat-value">€{kpis.rentabilidad.margen_bruto.toLocaleString()}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} style={{ display: 'inline' }} />
            {((kpis.rentabilidad.margen_bruto / kpis.produccion.total_ingresos) * 100).toFixed(1)}% {t('dashboard.stats.margin')}
          </div>
        </div>
      </div>
      
      {/* Sección de Fincas */}
      {kpis.fincas && (
        <div className="card mb-6" data-testid="dashboard-fincas">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={22} style={{ color: '#2d5a27' }} />
              Resumen de Fincas
            </h2>
            <button
              onClick={() => navigate('/fincas')}
              className="btn btn-sm btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Ver todas
            </button>
          </div>
          
          {/* Alerta de parcelas sin asignar */}
          {kpis.fincas.parcelas_sin_asignar > 0 && (
            <div style={{
              backgroundColor: '#fff3e0',
              border: '1px solid #ffcc80',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={20} style={{ color: '#f57c00' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#e65100' }}>
                  {kpis.fincas.parcelas_sin_asignar} parcela{kpis.fincas.parcelas_sin_asignar > 1 ? 's' : ''} sin asignar a fincas
                </div>
                <div style={{ fontSize: '0.8rem', color: '#bf360c' }}>
                  Organiza tus parcelas asignándolas a sus respectivas fincas
                </div>
              </div>
              <button
                onClick={() => navigate('/fincas')}
                className="btn btn-sm"
                style={{ marginLeft: 'auto', backgroundColor: '#f57c00', color: 'white' }}
              >
                Asignar
              </button>
            </div>
          )}
          
          {/* KPIs de Fincas */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#2d5a27', fontWeight: '500' }}>Total Fincas</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1b5e20' }}>{kpis.fincas.total}</div>
            </div>
            
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center',
              borderLeft: '3px solid #2d5a27'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#2d5a27', fontWeight: '500' }}>Propias</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2d5a27' }}>{kpis.fincas.propias}</div>
            </div>
            
            <div style={{ 
              backgroundColor: '#fff3e0', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center',
              borderLeft: '3px solid #f57c00'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#e65100', fontWeight: '500' }}>Alquiladas</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f57c00' }}>{kpis.fincas.alquiladas}</div>
            </div>
            
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#1565c0', fontWeight: '500' }}>Hectáreas Total</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1565c0' }}>{kpis.fincas.hectareas_total?.toLocaleString() || 0}</div>
            </div>
            
            <div style={{ 
              backgroundColor: '#f3e5f5', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#7b1fa2', fontWeight: '500' }}>Prod. Esperada (t)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7b1fa2' }}>{kpis.fincas.produccion_esperada?.toLocaleString() || 0}</div>
            </div>
            
            <div style={{ 
              backgroundColor: '#fce4ec', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#c2185b', fontWeight: '500' }}>Prod. Disponible (t)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#c2185b' }}>{kpis.fincas.produccion_disponible?.toLocaleString() || 0}</div>
            </div>
          </div>
          
          {/* Gráficos de Fincas */}
          {fincasData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Gráfico de Fincas por Provincia */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} />
                  Fincas por Provincia
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={fincasData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" style={{ fontSize: '11px' }} />
                    <YAxis dataKey="name" type="category" style={{ fontSize: '11px' }} width={80} />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'propias' ? 'Propias' : name === 'alquiladas' ? 'Alquiladas' : name]}
                      labelFormatter={(label) => {
                        const item = fincasData.find(d => d.name === label);
                        return item ? item.fullName : label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="propias" stackId="a" fill="#2d5a27" name="Propias" />
                    <Bar dataKey="alquiladas" stackId="a" fill="#f57c00" name="Alquiladas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Gráfico Propias vs Alquiladas */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Home size={16} />
                  Distribución por Tipo
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={fincasTipoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {fincasTipoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} fincas`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Widgets: Próximas Cosechas y Tratamientos Pendientes */}
      <div className="grid-2 mb-6" data-testid="dashboard-widgets">
        {/* Próximas Cosechas */}
        <div className="card" data-testid="proximas-cosechas">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wheat size={20} style={{ color: '#f57c00' }} />
              Próximas Cosechas
            </h2>
            {kpis.proximas_cosechas?.length > 0 && (
              <span style={{
                backgroundColor: '#fff3e0',
                color: '#e65100',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {kpis.proximas_cosechas.length} planificadas
              </span>
            )}
          </div>
          
          {kpis.proximas_cosechas?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              {kpis.proximas_cosechas.map((cosecha, idx) => {
                const fechaCosecha = new Date(cosecha.fecha_planificada);
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaCosecha - hoy) / (1000 * 60 * 60 * 24));
                const esUrgente = diasRestantes <= 3 && diasRestantes >= 0;
                const esProxima = diasRestantes <= 7 && diasRestantes > 3;
                
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: esUrgente ? '#fff3e0' : esProxima ? '#fffde7' : 'hsl(var(--muted))',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${esUrgente ? '#f57c00' : esProxima ? '#fbc02d' : '#4caf50'}`
                    }}
                  >
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
                      <div style={{
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: esUrgente ? '#e65100' : esProxima ? '#f9a825' : '#2e7d32'
                      }}>
                        {fechaCosecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                        {diasRestantes === 0 ? '¡Hoy!' :
                         diasRestantes === 1 ? 'Mañana' :
                         diasRestantes < 0 ? `Hace ${Math.abs(diasRestantes)} días` :
                         `En ${diasRestantes} días`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: '8px'
            }}>
              <Wheat size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted">No hay cosechas planificadas próximamente</p>
            </div>
          )}
          
          {/* Fincas con recolección esta semana */}
          {kpis.fincas_recoleccion_semana?.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Home size={14} />
                Fincas en recolección esta semana
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {kpis.fincas_recoleccion_semana.map((f, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#e8f5e9',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontWeight: '600', color: '#2d5a27' }}>{f.denominacion}</span>
                    <span style={{ color: '#666' }}>({f.hectareas} ha)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Tratamientos Pendientes */}
        <div className="card" data-testid="tratamientos-pendientes">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Droplets size={20} style={{ color: '#1976d2' }} />
              Tratamientos Pendientes
            </h2>
            {kpis.tratamientos_pendientes?.length > 0 && (
              <span style={{
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {kpis.tratamientos_pendientes.length} pendientes
              </span>
            )}
          </div>
          
          {kpis.tratamientos_pendientes?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              {kpis.tratamientos_pendientes.map((trat, idx) => {
                const fechaTrat = trat.fecha_tratamiento ? new Date(trat.fecha_tratamiento) : null;
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const diasRestantes = fechaTrat ? Math.ceil((fechaTrat - hoy) / (1000 * 60 * 60 * 24)) : null;
                const esVencido = diasRestantes !== null && diasRestantes < 0;
                const esUrgente = diasRestantes !== null && diasRestantes <= 2 && diasRestantes >= 0;
                const prioridadAlta = trat.prioridad === 'alta' || trat.prioridad === 'urgente';
                
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: esVencido ? '#ffebee' : esUrgente || prioridadAlta ? '#fff3e0' : 'hsl(var(--muted))',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${esVencido ? '#c62828' : esUrgente || prioridadAlta ? '#f57c00' : '#1976d2'}`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(esVencido || prioridadAlta) && <AlertCircle size={14} style={{ color: esVencido ? '#c62828' : '#f57c00' }} />}
                        {trat.tipo_tratamiento || 'Tratamiento'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                        {trat.cultivo} {trat.parcela && `| ${trat.parcela}`}
                      </div>
                      {trat.superficie_aplicacion > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#1976d2' }}>
                          {trat.superficie_aplicacion} ha a tratar
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {fechaTrat ? (
                        <>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            color: esVencido ? '#c62828' : esUrgente ? '#e65100' : '#1565c0'
                          }}>
                            {fechaTrat.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                            {diasRestantes === 0 ? '¡Hoy!' :
                             diasRestantes === 1 ? 'Mañana' :
                             esVencido ? `Hace ${Math.abs(diasRestantes)} días` :
                             `En ${diasRestantes} días`}
                          </div>
                        </>
                      ) : (
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1565c0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem'
                        }}>
                          {trat.estado || 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: '8px'
            }}>
              <CheckCircle size={40} style={{ color: '#4caf50', marginBottom: '0.5rem' }} />
              <p className="text-muted">No hay tratamientos pendientes</p>
              <p style={{ fontSize: '0.8rem', color: '#4caf50' }}>¡Todo al día!</p>
            </div>
          )}
          
          <button
            onClick={() => navigate('/tratamientos')}
            className="btn btn-sm btn-secondary"
            style={{ marginTop: '1rem', width: '100%' }}
          >
            Ver todos los tratamientos
          </button>
        </div>
      </div>
      
      {/* Widget de Contratos Activos */}
      {kpis.contratos_stats && (
        <div className="card mb-6" data-testid="contratos-activos">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSignature size={22} style={{ color: '#7b1fa2' }} />
              Contratos Activos
            </h2>
            <button
              onClick={() => navigate('/contratos')}
              className="btn btn-sm btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Ver todos
            </button>
          </div>
          
          {/* KPIs de Contratos */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Total Activos */}
            <div style={{ 
              backgroundColor: '#f3e5f5', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#7b1fa2', fontWeight: '500' }}>Total Activos</div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7b1fa2' }}>
                {kpis.contratos_stats.total_activos}
              </div>
            </div>
            
            {/* Contratos Compra */}
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '1rem', 
              borderRadius: '8px',
              borderLeft: '3px solid #1976d2'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShoppingCart size={16} style={{ color: '#1976d2' }} />
                <span style={{ fontSize: '0.8rem', color: '#1976d2', fontWeight: '600' }}>Compra</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1565c0' }}>
                {kpis.contratos_stats.compra?.count || 0} contratos
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                {((kpis.contratos_stats.compra?.cantidad_total || 0) / 1000).toFixed(0)} t | €{((kpis.contratos_stats.compra?.valor_total || 0) / 1000).toFixed(0)}k
              </div>
            </div>
            
            {/* Contratos Venta */}
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              padding: '1rem', 
              borderRadius: '8px',
              borderLeft: '3px solid #2e7d32'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={16} style={{ color: '#2e7d32' }} />
                <span style={{ fontSize: '0.8rem', color: '#2e7d32', fontWeight: '600' }}>Venta</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1b5e20' }}>
                {kpis.contratos_stats.venta?.count || 0} contratos
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                {((kpis.contratos_stats.venta?.cantidad_total || 0) / 1000).toFixed(0)} t | €{((kpis.contratos_stats.venta?.valor_total || 0) / 1000).toFixed(0)}k
              </div>
            </div>
            
            {/* Balance */}
            <div style={{ 
              backgroundColor: (kpis.contratos_stats.venta?.valor_total || 0) >= (kpis.contratos_stats.compra?.valor_total || 0) ? '#e8f5e9' : '#ffebee', 
              padding: '1rem', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '500' }}>Balance Contratos</div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                color: (kpis.contratos_stats.venta?.valor_total || 0) >= (kpis.contratos_stats.compra?.valor_total || 0) ? '#2e7d32' : '#c62828',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}>
                {(kpis.contratos_stats.venta?.valor_total || 0) >= (kpis.contratos_stats.compra?.valor_total || 0) 
                  ? <TrendingUp size={18} /> 
                  : <TrendingDown size={18} />}
                €{(((kpis.contratos_stats.venta?.valor_total || 0) - (kpis.contratos_stats.compra?.valor_total || 0)) / 1000).toFixed(1)}k
              </div>
            </div>
          </div>
          
          {/* Lista de Contratos Activos */}
          {kpis.contratos_activos?.length > 0 && (
            <div style={{ 
              backgroundColor: 'hsl(var(--muted))', 
              borderRadius: '8px', 
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 70px 150px 120px auto 100px',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#7b1fa2',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                <div>Nº Contrato</div>
                <div>Tipo</div>
                <div>Prov./Cliente</div>
                <div>Cultivo</div>
                <div>Cantidad</div>
                <div style={{ textAlign: 'right' }}>Valor</div>
              </div>
              {/* Rows */}
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {kpis.contratos_activos.map((contrato, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 70px 150px 120px auto 100px',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: idx % 2 === 0 ? 'white' : 'hsl(var(--muted))',
                      fontSize: '0.8rem',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#7b1fa2' }}>{contrato.numero}</div>
                    <div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '500',
                        backgroundColor: contrato.tipo === 'Compra' ? '#e3f2fd' : '#e8f5e9',
                        color: contrato.tipo === 'Compra' ? '#1565c0' : '#2e7d32'
                      }}>
                        {contrato.tipo}
                      </span>
                    </div>
                    <div style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {contrato.tipo === 'Venta' ? contrato.cliente : contrato.proveedor}
                    </div>
                    <div>{contrato.cultivo || '-'}</div>
                    <div>{(contrato.cantidad / 1000).toFixed(1)} t</div>
                    <div style={{ textAlign: 'right', fontWeight: '600' }}>
                      €{(contrato.valor_total / 1000).toFixed(1)}k
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
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
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Mapa de Parcelas */}
      <div className="card mb-6" data-testid="mapa-parcelas">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} /> {t('dashboard.map.title')}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
              {parcelas.filter(p => p.recintos?.[0]?.geometria).length} {t('dashboard.map.parcelsWithGeometry')}
            </span>
            <button
              onClick={() => setMapType(mapType === 'satellite' ? 'osm' : 'satellite')}
              className="btn btn-sm btn-secondary"
              title={mapType === 'satellite' ? t('dashboard.map.switchToBase') : t('dashboard.map.switchToSatellite')}
            >
              {mapType === 'satellite' ? <Layers size={14} /> : <Satellite size={14} />}
            </button>
          </div>
        </div>
        
        {parcelas.filter(p => p.recintos?.[0]?.geometria).length > 0 ? (
          <>
            <MapContainer 
              center={[37.0886, -2.3170]} 
              zoom={12} 
              style={{ height: '400px', width: '100%', borderRadius: '8px' }}
              key={mapType}
            >
              <TileLayer url={TILE_LAYERS[mapType].url} />
              <FitAllBounds parcelas={parcelas} />
              {parcelas.map(parcela => {
                if (!parcela.recintos?.[0]?.geometria) return null;
                const coords = parcela.recintos[0].geometria.map(c => [c.lat, c.lng]);
                return (
                  <Polygon 
                    key={parcela._id}
                    positions={coords}
                    pathOptions={{ 
                      color: getCultivoColor(parcela.cultivo),
                      fillColor: getCultivoColor(parcela.cultivo),
                      fillOpacity: 0.4,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <strong style={{ fontSize: '1rem' }}>{parcela.codigo_plantacion}</strong>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                          <div><strong>{t('dashboard.map.crop')}:</strong> {parcela.cultivo}</div>
                          <div><strong>{t('dashboard.map.provider')}:</strong> {parcela.proveedor}</div>
                          <div><strong>{t('dashboard.map.farm')}:</strong> {parcela.finca}</div>
                          <div><strong>{t('dashboard.map.surface')}:</strong> {parcela.superficie_total} ha</div>
                          <div><strong>{t('dashboard.map.campaign')}:</strong> {parcela.campana}</div>
                        </div>
                        <button 
                          onClick={() => navigate(`/parcelas`)}
                          style={{
                            marginTop: '0.75rem',
                            padding: '0.4rem 0.75rem',
                            backgroundColor: '#2d5a27',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {t('dashboard.map.viewDetails')}
                        </button>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>
            
            {/* Leyenda de cultivos */}
            <div style={{ 
              marginTop: '0.75rem', 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '1rem',
              padding: '0.75rem',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: '6px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))' }}>{t('dashboard.map.crops')}:</span>
              {[...new Set(parcelas.map(p => p.cultivo).filter(Boolean))].map(cultivo => (
                <div key={cultivo} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: getCultivoColor(cultivo),
                    borderRadius: '2px'
                  }} />
                  <span style={{ fontSize: '0.75rem' }}>{cultivo}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ 
            height: '200px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'hsl(var(--muted))',
            borderRadius: '8px'
          }}>
            <p className="text-muted">{t('dashboard.map.noParcelsWithGeometry')}</p>
          </div>
        )}
      </div>
      
      {/* Calendario y Planificador de Visitas */}
      <div className="grid-2 mb-6">
        {/* Calendario Visual */}
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
        
        {/* Lista de Visitas Planificadas */}
        <div className="card" data-testid="planificador-visitas">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} /> {t('dashboard.visits.title')}
            </h2>
            <button 
              onClick={() => navigate('/visitas?planificar=true')}
              className="btn btn-sm btn-primary"
            >
              <CalendarIcon size={14} style={{ marginRight: '0.25rem' }} /> {t('dashboard.visits.new')}
            </button>
          </div>
          
          {visitasPlanificadas.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
              {visitasPlanificadas.map((visita, idx) => {
                const fechaVisita = new Date(visita.fecha_planificada);
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const diasRestantes = Math.ceil((fechaVisita - hoy) / (1000 * 60 * 60 * 24));
                const esUrgente = diasRestantes <= 2 && diasRestantes >= 0;
                const esProxima = diasRestantes <= 7 && diasRestantes > 2;
                const esVencida = diasRestantes < 0;
                
                return (
                  <div 
                    key={idx}
                    style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: esVencida ? '#fecaca' : esUrgente ? '#fee2e2' : esProxima ? '#fff3e0' : 'hsl(var(--muted))',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${esVencida ? '#991b1b' : esUrgente ? '#dc2626' : esProxima ? '#f57c00' : '#2d5a27'}`
                    }}
                  >
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
                        <div style={{ 
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          color: esVencida ? '#991b1b' : esUrgente ? '#dc2626' : esProxima ? '#f57c00' : '#2d5a27'
                        }}>
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
                        <button
                          onClick={() => setSelectedVisita(visita)}
                          className="btn btn-sm"
                          style={{ 
                            padding: '0.35rem 0.5rem',
                            backgroundColor: 'hsl(var(--primary))',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title={t('dashboard.visits.viewVisit')}
                          data-testid={`ver-visita-${visita._id}`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setSelectedVisita(visita)}
                          className="btn btn-sm"
                          style={{ 
                            padding: '0.35rem 0.5rem',
                            backgroundColor: 'hsl(var(--secondary))',
                            color: 'hsl(var(--secondary-foreground))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title={t('dashboard.visits.editVisit')}
                          data-testid={`editar-visita-${visita._id}`}
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: '8px'
            }}>
              <CalendarIcon size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted" style={{ marginBottom: '0.75rem' }}>{t('dashboard.visits.noPlanned')}</p>
              <button 
                onClick={() => navigate('/visitas?planificar=true')}
                className="btn btn-primary btn-sm"
              >
                {t('dashboard.visits.planFirst')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Panel de Notificaciones por Email */}
      <div className="card mb-6" data-testid="panel-notificaciones">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={20} /> {t('dashboard.notifications.title')}
          </h2>
          {notificationStatus && (
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '4px 8px', 
              borderRadius: '4px',
              backgroundColor: notificationStatus.configured ? '#e8f5e9' : '#fff3e0',
              color: notificationStatus.configured ? '#2d5a27' : '#f57c00'
            }}>
              {notificationStatus.configured ? `✓ ${t('dashboard.notifications.configured')}` : `⚠ ${t('dashboard.notifications.notConfigured')}`}
            </span>
          )}
        </div>
        
        <div style={{ 
          padding: '1rem',
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {t('dashboard.notifications.description')}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
            {visitasPlanificadas.length > 0 
              ? t('dashboard.notifications.plannedVisits', { count: visitasPlanificadas.length })
              : t('dashboard.notifications.noVisitsToNotify')
            }
          </p>
        </div>
        
        {/* Result message */}
        {notificationResult && (
          <div style={{ 
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            backgroundColor: notificationResult.success ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${notificationResult.success ? '#4CAF50' : '#f44336'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {notificationResult.success 
              ? <CheckCircle size={18} style={{ color: '#4CAF50' }} />
              : <AlertCircle size={18} style={{ color: '#f44336' }} />
            }
            <span style={{ fontSize: '0.875rem' }}>{notificationResult.message}</span>
            {notificationResult.sent !== undefined && (
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                ({notificationResult.sent} {t('dashboard.notifications.sent')})
              </span>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={sendVisitReminders}
            disabled={sendingNotification || !notificationStatus?.configured || visitasPlanificadas.length === 0}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Send size={16} />
            {sendingNotification ? t('dashboard.notifications.sending') : t('dashboard.notifications.sendReminders')}
          </button>
          
          <button 
            onClick={sendTestEmail}
            disabled={sendingNotification || !notificationStatus?.configured}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Mail size={16} />
            {t('dashboard.notifications.sendTestEmail')}
          </button>
        </div>
        
        {!notificationStatus?.configured && (
          <p style={{ 
            fontSize: '0.75rem', 
            color: '#f57c00', 
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: '#fff8e1',
            borderRadius: '4px'
          }}>
            {t('dashboard.notifications.configureApi')}
          </p>
        )}
      </div>
      
      {/* Recent Activity */}
      {kpis.actividad_reciente && (
        <div className="grid-2">
          <div className="card">
            <h2 className="card-title">{t('dashboard.visits.recentVisits')}</h2>
            {kpis.actividad_reciente.visitas.length > 0 ? (
              <div>
                {kpis.actividad_reciente.visitas.slice(0, 5).map((visita, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="font-semibold">{visita.objetivo}</div>
                    <div className="text-sm text-muted">
                      {visita.proveedor} - {visita.cultivo}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(visita.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">{t('dashboard.visits.noVisitsRecorded')}</p>
            )}
          </div>
          
          <div className="card">
            <h2 className="card-title">{t('dashboard.treatments.recentTreatments')}</h2>
            {kpis.actividad_reciente.tratamientos.length > 0 ? (
              <div>
                {kpis.actividad_reciente.tratamientos.slice(0, 5).map((trat, idx) => (
                  <div key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className="font-semibold">{trat.tipo_tratamiento}</div>
                    <div className="text-sm text-muted">
                      {trat.metodo_aplicacion} - {trat.superficie_aplicacion} ha
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(trat.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">{t('dashboard.treatments.noTreatmentsRecorded')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Modal de Detalles de Visita */}
      {selectedVisita && (
        <div 
          style={{
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
          }}
          onClick={() => setSelectedVisita(null)}
        >
          <div 
            className="card"
            style={{
              maxWidth: '550px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              padding: '1.5rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedVisita(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <AlertCircle size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
            
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              <Eye size={22} />
              {t('dashboard.visits.visitDetails')}
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
                      <div key={key} style={{ 
                        padding: '0.5rem', 
                        backgroundColor: value === 0 ? 'hsl(142 76% 36% / 0.1)' : value === 1 ? 'hsl(48 96% 53% / 0.2)' : 'hsl(0 84% 60% / 0.1)',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigate(`/visitas?editar=${selectedVisita._id}`);
                  setSelectedVisita(null);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Edit2 size={16} />
                {t('dashboard.visits.edit')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedVisita(null)}
              >
                {t('dashboard.visits.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;