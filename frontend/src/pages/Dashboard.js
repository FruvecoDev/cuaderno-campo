import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrendingUp, MapPin, FileText, Sprout, Euro, Calendar as CalendarIcon, Bell, Layers, Satellite, ChevronLeft, ChevronRight } from 'lucide-react';
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

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [parcelas, setParcelas] = useState([]);
  const [visitasPlanificadas, setVisitasPlanificadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('satellite');
  const { token } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDashboardData();
    fetchParcelas();
    fetchVisitasPlanificadas();
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
  
  if (loading) {
    return (
      <div data-testid="dashboard-loading">
        <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
        <p>Cargando datos...</p>
      </div>
    );
  }
  
  if (!kpis) {
    return (
      <div data-testid="dashboard-error">
        <h1>Dashboard</h1>
        <p>Error al cargar los datos</p>
      </div>
    );
  }
  
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
  
  // Prepare chart data
  const cultivoData = Object.entries(kpis.produccion.por_cultivo || {}).map(([name, data]) => ({
    name,
    parcelas: data.parcelas,
    superficie: data.superficie
  }));
  
  return (
    <div data-testid="dashboard-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Dashboard</h1>
      </div>
      
      {/* KPI Cards */}
      <div className="stats-grid" data-testid="dashboard-kpis">
        <div className="stat-card">
          <div className="stat-label">Total Contratos</div>
          <div className="stat-value">{kpis.totales.contratos}</div>
          <div className="text-sm text-muted">Contratos activos</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Parcelas Activas</div>
          <div className="stat-value">{kpis.totales.parcelas_activas}</div>
          <div className="text-sm text-muted">de {kpis.totales.parcelas} totales</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Superficie Total</div>
          <div className="stat-value">{kpis.superficie.total_ha.toFixed(2)}</div>
          <div className="text-sm text-muted">hectáreas</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Tratamientos</div>
          <div className="stat-value">{kpis.totales.tratamientos}</div>
          <div className="text-sm text-muted">aplicaciones registradas</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Producción Total</div>
          <div className="stat-value">{(kpis.produccion.total_kg / 1000).toFixed(1)}</div>
          <div className="text-sm text-muted">toneladas</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Ingresos</div>
          <div className="stat-value">€{kpis.produccion.total_ingresos.toLocaleString()}</div>
          <div className="text-sm text-muted">total facturado</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Costes</div>
          <div className="stat-value">€{kpis.costes.total.toLocaleString()}</div>
          <div className="text-sm text-muted">gastos totales</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Margen Bruto</div>
          <div className="stat-value">€{kpis.rentabilidad.margen_bruto.toLocaleString()}</div>
          <div className="stat-change positive">
            <TrendingUp size={14} style={{ display: 'inline' }} />
            {((kpis.rentabilidad.margen_bruto / kpis.produccion.total_ingresos) * 100).toFixed(1)}% margen
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {cultivoData.length > 0 && (
          <div className="card">
            <h2 className="card-title">Superficie por Cultivo</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cultivoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="superficie" fill="hsl(var(--chart-1))" name="Superficie (ha)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="card">
          <h2 className="card-title">Distribución de Costes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Tratamientos', value: kpis.costes.tratamientos },
                  { name: 'Riegos', value: kpis.costes.riegos },
                  { name: 'Tareas', value: kpis.costes.tareas }
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
            <MapPin size={20} /> Mapa de Parcelas
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
              {parcelas.filter(p => p.recintos?.[0]?.geometria).length} parcelas con geometría
            </span>
            <button
              onClick={() => setMapType(mapType === 'satellite' ? 'osm' : 'satellite')}
              className="btn btn-sm btn-secondary"
              title={mapType === 'satellite' ? 'Cambiar a Mapa Base' : 'Cambiar a Satélite'}
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
                          <div><strong>Cultivo:</strong> {parcela.cultivo}</div>
                          <div><strong>Proveedor:</strong> {parcela.proveedor}</div>
                          <div><strong>Finca:</strong> {parcela.finca}</div>
                          <div><strong>Superficie:</strong> {parcela.superficie_total} ha</div>
                          <div><strong>Campaña:</strong> {parcela.campana}</div>
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
                          Ver detalles
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
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))' }}>Cultivos:</span>
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
            <p className="text-muted">No hay parcelas con geometría definida</p>
          </div>
        )}
      </div>
      
      {/* Calendario y Planificador de Visitas */}
      <div className="grid-2 mb-6">
        {/* Calendario Visual */}
        <div className="card" data-testid="calendario-visitas">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={20} /> Calendario de Visitas
          </h2>
          <VisitasCalendar 
            visitas={visitasPlanificadas} 
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
              <Bell size={20} /> Próximas Visitas
            </h2>
            <button 
              onClick={() => navigate('/visitas?planificar=true')}
              className="btn btn-sm btn-primary"
            >
              <CalendarIcon size={14} style={{ marginRight: '0.25rem' }} /> Nueva
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
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: esVencida ? '#991b1b' : esUrgente ? '#dc2626' : esProxima ? '#f57c00' : '#2d5a27'
                      }}>
                        {fechaVisita.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                        {diasRestantes === 0 ? '¡Hoy!' : 
                         diasRestantes === 1 ? 'Mañana' : 
                         esVencida ? `Hace ${Math.abs(diasRestantes)} días` :
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
              <CalendarIcon size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted" style={{ marginBottom: '0.75rem' }}>No hay visitas planificadas</p>
              <button 
                onClick={() => navigate('/visitas?planificar=true')}
                className="btn btn-primary btn-sm"
              >
                Planificar primera visita
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Activity */}
      {kpis.actividad_reciente && (
        <div className="grid-2">
          <div className="card">
            <h2 className="card-title">Visitas Recientes</h2>
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
              <p className="text-muted">No hay visitas registradas</p>
            )}
          </div>
          
          <div className="card">
            <h2 className="card-title">Tratamientos Recientes</h2>
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
              <p className="text-muted">No hay tratamientos registrados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;