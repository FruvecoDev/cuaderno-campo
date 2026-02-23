import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrendingUp, MapPin, FileText, Sprout, Euro, Calendar, Bell, Layers, Satellite } from 'lucide-react';
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