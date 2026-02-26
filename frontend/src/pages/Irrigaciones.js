import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Filter, Settings, X, Droplets, Search,
  Download, Calendar, Clock, History, Calculator, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ESTADO_COLORS = {
  planificado: { bg: '#fef3c7', text: '#d97706' },
  en_curso: { bg: '#dbeafe', text: '#2563eb' },
  completado: { bg: '#dcfce7', text: '#16a34a' },
  cancelado: { bg: '#fee2e2', text: '#dc2626' }
};

const SISTEMA_COLORS = ['#2d5a27', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const Irrigaciones = () => {
  const { t } = useTranslation();
  const [irrigaciones, setIrrigaciones] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [sistemas, setSistemas] = useState([]);
  const [showHistorial, setShowHistorial] = useState(null);
  const [historialData, setHistorialData] = useState(null);
  const [showCalculadora, setShowCalculadora] = useState(false);
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Vista
  const [vista, setVista] = useState('lista');
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    sistema: '',
    parcela_id: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    cultivo: ''
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('irrigaciones_fields_config');
    return saved ? JSON.parse(saved) : {
      fecha: true, sistema: true, duracion: true, volumen: true,
      consumo_por_ha: true, coste: true, parcela_id: true, estado: true
    };
  });
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    sistema: 'Goteo',
    duracion: '',
    volumen: '',
    coste: 0,
    parcela_id: '',
    es_planificada: false,
    fecha_planificada: '',
    hora_inicio: '',
    hora_fin: '',
    caudal: '',
    presion: '',
    fuente_agua: '',
    sector: '',
    estado: 'completado',
    observaciones: ''
  });

  // Calculadora
  const [calcData, setCalcData] = useState({
    parcela_id: '',
    volumen: 0,
    superficie: 0,
    consumo_por_ha: 0
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchIrrigaciones();
    fetchParcelas();
    fetchStats();
    fetchSistemas();
  }, []);

  useEffect(() => {
    localStorage.setItem('irrigaciones_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);

  const fetchIrrigaciones = async () => {
    try {
      setError(null);
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones`, { headers });
      const data = await res.json();
      setIrrigaciones(data.irrigaciones || []);
    } catch (err) {
      console.error('Error fetching irrigaciones:', err);
      setError('Error al cargar irrigaciones');
    }
    setLoading(false);
  };

  const fetchParcelas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/parcelas`, { headers });
      const data = await res.json();
      setParcelas(data.parcelas || []);
    } catch (err) {
      console.error('Error fetching parcelas:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/stats`, { headers });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSistemas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/sistemas`, { headers });
      const data = await res.json();
      setSistemas(data.sistemas || []);
    } catch (err) {
      console.error('Error fetching sistemas:', err);
    }
  };

  const fetchHistorial = async (parcelaId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/historial/${parcelaId}`, { headers });
      const data = await res.json();
      setHistorialData(data);
      setShowHistorial(parcelaId);
    } catch (err) {
      console.error('Error fetching historial:', err);
    }
  };

  // Filtrar irrigaciones
  const filteredIrrigaciones = useMemo(() => {
    return irrigaciones.filter(i => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!i.parcela_codigo?.toLowerCase().includes(search) &&
            !i.cultivo?.toLowerCase().includes(search) &&
            !i.observaciones?.toLowerCase().includes(search)) return false;
      }
      if (filters.sistema && i.sistema !== filters.sistema) return false;
      if (filters.parcela_id && i.parcela_id !== filters.parcela_id) return false;
      if (filters.estado && i.estado !== filters.estado) return false;
      if (filters.fecha_desde && i.fecha < filters.fecha_desde) return false;
      if (filters.fecha_hasta && i.fecha > filters.fecha_hasta) return false;
      if (filters.cultivo && i.cultivo !== filters.cultivo) return false;
      return true;
    });
  }, [irrigaciones, filters]);

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  const clearFilters = () => {
    setFilters({
      search: '', sistema: '', parcela_id: '', estado: '',
      fecha_desde: '', fecha_hasta: '', cultivo: ''
    });
  };

  // Opciones únicas para filtros
  const filterOptions = useMemo(() => ({
    sistemas: [...new Set(irrigaciones.map(i => i.sistema).filter(Boolean))],
    cultivos: [...new Set(irrigaciones.map(i => i.cultivo).filter(Boolean))],
    parcelas: parcelas.map(p => ({ id: p._id, codigo: p.codigo_plantacion }))
  }), [irrigaciones, parcelas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/irrigaciones/${editingId}`
        : `${BACKEND_URL}/api/irrigaciones`;
      
      const submitData = {
        ...formData,
        duracion: parseFloat(formData.duracion) || 0,
        volumen: parseFloat(formData.volumen) || 0,
        coste: parseFloat(formData.coste) || 0,
        caudal: formData.caudal ? parseFloat(formData.caudal) : null,
        presion: formData.presion ? parseFloat(formData.presion) : null
      };
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(submitData)
      });
      
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchIrrigaciones();
        fetchStats();
      }
    } catch (err) {
      console.error('Error saving irrigacion:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      sistema: 'Goteo',
      duracion: '',
      volumen: '',
      coste: 0,
      parcela_id: '',
      es_planificada: false,
      fecha_planificada: '',
      hora_inicio: '',
      hora_fin: '',
      caudal: '',
      presion: '',
      fuente_agua: '',
      sector: '',
      estado: 'completado',
      observaciones: ''
    });
  };

  const handleEdit = (irrigacion) => {
    setEditingId(irrigacion._id);
    setFormData({
      fecha: irrigacion.fecha || '',
      sistema: irrigacion.sistema || 'Goteo',
      duracion: irrigacion.duracion || '',
      volumen: irrigacion.volumen || '',
      coste: irrigacion.coste || 0,
      parcela_id: irrigacion.parcela_id || '',
      es_planificada: irrigacion.es_planificada || false,
      fecha_planificada: irrigacion.fecha_planificada || '',
      hora_inicio: irrigacion.hora_inicio || '',
      hora_fin: irrigacion.hora_fin || '',
      caudal: irrigacion.caudal || '',
      presion: irrigacion.presion || '',
      fuente_agua: irrigacion.fuente_agua || '',
      sector: irrigacion.sector || '',
      estado: irrigacion.estado || 'completado',
      observaciones: irrigacion.observaciones || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro de riego?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchIrrigaciones();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting irrigacion:', err);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.parcela_id) params.append('parcela_id', filters.parcela_id);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/export/excel?${params}`, { headers });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `irrigaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };

  const calcularConsumo = async () => {
    if (!calcData.parcela_id || !calcData.volumen) return;
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/irrigaciones/calcular-consumo?parcela_id=${calcData.parcela_id}&volumen=${calcData.volumen}`,
        { headers }
      );
      const data = await res.json();
      setCalcData({
        ...calcData,
        superficie: data.superficie_ha,
        consumo_por_ha: data.consumo_por_ha
      });
    } catch (err) {
      console.error('Error calculando consumo:', err);
    }
  };

  // Gráficos
  const renderGraficos = () => {
    if (!stats) return null;
    
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Riegos</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: '#dcfce7' }}>
            <div className="stat-value" style={{ color: '#16a34a' }}>{stats.completados}</div>
            <div className="stat-label">Completados</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: '#fef3c7' }}>
            <div className="stat-value" style={{ color: '#d97706' }}>{stats.planificados}</div>
            <div className="stat-label">Planificados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#2d5a27' }}>{stats.totales?.volumen?.toLocaleString() || 0} m³</div>
            <div className="stat-label">Volumen Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totales?.horas?.toLocaleString() || 0} h</div>
            <div className="stat-label">Horas Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#16a34a' }}>€{stats.totales?.coste?.toLocaleString() || 0}</div>
            <div className="stat-label">Coste Total</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid-2">
          <div className="card">
            <h3 className="card-title">Distribución por Sistema</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.por_sistema}
                  dataKey="count"
                  nameKey="sistema"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ sistema, count }) => `${sistema}: ${count}`}
                >
                  {stats.por_sistema?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SISTEMA_COLORS[index % SISTEMA_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="card-title">Volumen por Mes (últimos 12 meses)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.por_mes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `${value} m³`} />
                <Bar dataKey="volumen" fill="#2d5a27" name="Volumen (m³)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="irrigaciones-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">
          <Droplets className="inline mr-2" size={28} style={{ color: '#2d5a27' }} />
          {t('irrigations.title', 'Irrigaciones')}
        </h1>
        <div className="flex gap-2">
          <button 
            className={`btn ${vista === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVista('lista')}
          >
            Lista
          </button>
          <button 
            className={`btn ${vista === 'graficos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVista('graficos')}
          >
            <BarChart3 size={16} className="mr-1" />
            Estadísticas
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCalculadora(!showCalculadora)}>
            <Calculator size={16} className="mr-1" />
            Calculadora
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <Download size={16} className="mr-1" />
            Excel
          </button>
          {canCreate && (
            <button 
              className="btn btn-primary" 
              onClick={() => { resetForm(); setShowForm(true); }}
              data-testid="btn-nuevo-riego"
            >
              <Plus size={18} />
              Nuevo Riego
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }}>
          <p style={{ color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {/* Calculadora */}
      {showCalculadora && (
        <div className="card mb-4" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={18} />
            Calculadora de Consumo por Hectárea
          </h3>
          <div className="grid-4">
            <div className="form-group">
              <label className="form-label">Parcela</label>
              <select 
                className="form-select"
                value={calcData.parcela_id}
                onChange={(e) => setCalcData({...calcData, parcela_id: e.target.value})}
              >
                <option value="">Seleccionar...</option>
                {parcelas.map(p => (
                  <option key={p._id} value={p._id}>{p.codigo_plantacion} ({p.superficie_total} ha)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Volumen (m³)</label>
              <input 
                type="number" 
                className="form-input"
                value={calcData.volumen}
                onChange={(e) => setCalcData({...calcData, volumen: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Superficie (ha)</label>
              <input type="text" className="form-input" value={calcData.superficie} readOnly style={{ backgroundColor: '#f3f4f6' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Consumo (m³/ha)</label>
              <input 
                type="text" 
                className="form-input" 
                value={calcData.consumo_por_ha} 
                readOnly 
                style={{ backgroundColor: '#dcfce7', fontWeight: 'bold', color: '#16a34a' }}
              />
            </div>
          </div>
          <button className="btn btn-primary" onClick={calcularConsumo}>
            Calcular
          </button>
        </div>
      )}

      {/* Stats resumen */}
      {vista === 'lista' && stats && (
        <div className="stats-grid mb-4">
          <div className="stat-card">
            <div className="stat-icon"><Droplets size={20} /></div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Riegos</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Calendar size={20} /></div>
            <div className="stat-value" style={{ color: '#d97706' }}>{stats.proximos_7_dias}</div>
            <div className="stat-label">Próx. 7 días</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Droplets size={20} /></div>
            <div className="stat-value" style={{ color: '#2d5a27' }}>{stats.totales?.volumen?.toLocaleString() || 0}</div>
            <div className="stat-label">m³ Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Clock size={20} /></div>
            <div className="stat-value">{stats.totales?.horas?.toLocaleString() || 0}</div>
            <div className="stat-label">Horas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#16a34a' }}>€{stats.totales?.coste?.toLocaleString() || 0}</div>
            <div className="stat-label">Coste Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totales?.superficie?.toLocaleString() || 0}</div>
            <div className="stat-label">Ha Regadas</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {vista === 'lista' && (
        <div className="card mb-4" data-testid="irrigaciones-filtros">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative" style={{ maxWidth: '300px', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Buscar irrigaciones..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  data-testid="input-buscar-irrigaciones"
                />
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="btn-toggle-filtros"
              >
                <Filter size={16} />
                Filtros avanzados
                {hasActiveFilters && (
                  <span style={{ 
                    backgroundColor: '#2d5a27', 
                    color: 'white', 
                    borderRadius: '9999px', 
                    width: '20px', 
                    height: '20px', 
                    fontSize: '12px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginLeft: '6px'
                  }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFieldsConfig(!showFieldsConfig)}
                title="Configurar columnas"
              >
                <Settings size={16} />
              </button>
            </div>
            {hasActiveFilters && (
              <button className="btn btn-secondary" onClick={clearFilters} data-testid="btn-limpiar-filtros">
                <X size={14} /> Limpiar filtros
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid-6 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Sistema</label>
                <select className="form-select" value={filters.sistema} onChange={(e) => setFilters({...filters, sistema: e.target.value})} data-testid="select-filtro-sistema">
                  <option value="">Todos</option>
                  {filterOptions.sistemas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Parcela</label>
                <select className="form-select" value={filters.parcela_id} onChange={(e) => setFilters({...filters, parcela_id: e.target.value})} data-testid="select-filtro-parcela">
                  <option value="">Todas</option>
                  {filterOptions.parcelas.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Estado</label>
                <select className="form-select" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})} data-testid="select-filtro-estado">
                  <option value="">Todos</option>
                  <option value="planificado">Planificado</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Cultivo</label>
                <select className="form-select" value={filters.cultivo} onChange={(e) => setFilters({...filters, cultivo: e.target.value})} data-testid="select-filtro-cultivo">
                  <option value="">Todos</option>
                  {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Fecha Desde</label>
                <input type="date" className="form-input" value={filters.fecha_desde} onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})} data-testid="input-filtro-fecha-desde" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Fecha Hasta</label>
                <input type="date" className="form-input" value={filters.fecha_hasta} onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})} data-testid="input-filtro-fecha-hasta" />
              </div>
            </div>
          )}

          {showFieldsConfig && (
            <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb', marginTop: '1rem' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Columnas visibles</h4>
              <div className="flex flex-wrap gap-4">
                {Object.entries(fieldsConfig).map(([field, visible]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={(e) => setFieldsConfig({...fieldsConfig, [field]: e.target.checked})}
                    />
                    {field.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '0.75rem', fontSize: '14px', color: '#6b7280' }}>
            Mostrando <strong>{filteredIrrigaciones.length}</strong> de <strong>{irrigaciones.length}</strong> registros
            {hasActiveFilters && ' (filtrados)'}
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card mb-4">
          <h2 className="card-title">{editingId ? 'Editar Riego' : 'Nuevo Riego'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Parcela *</label>
                <select className="form-select" value={formData.parcela_id} onChange={(e) => setFormData({...formData, parcela_id: e.target.value})} required data-testid="select-parcela">
                  <option value="">Seleccionar...</option>
                  {parcelas.map(p => (
                    <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo} ({p.superficie_total} ha)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sistema *</label>
                <select className="form-select" value={formData.sistema} onChange={(e) => setFormData({...formData, sistema: e.target.value})} required data-testid="select-sistema">
                  {sistemas.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required data-testid="input-fecha" />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} data-testid="select-estado">
                  <option value="planificado">Planificado</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Duración (horas) *</label>
                <input type="number" step="0.1" className="form-input" value={formData.duracion} onChange={(e) => setFormData({...formData, duracion: e.target.value})} required data-testid="input-duracion" />
              </div>
              <div className="form-group">
                <label className="form-label">Volumen (m³) *</label>
                <input type="number" step="0.1" className="form-input" value={formData.volumen} onChange={(e) => setFormData({...formData, volumen: e.target.value})} required data-testid="input-volumen" />
              </div>
              <div className="form-group">
                <label className="form-label">Coste (€)</label>
                <input type="number" step="0.01" className="form-input" value={formData.coste} onChange={(e) => setFormData({...formData, coste: e.target.value})} data-testid="input-coste" />
              </div>
              <div className="form-group">
                <label className="form-label">Fuente de Agua</label>
                <select className="form-select" value={formData.fuente_agua} onChange={(e) => setFormData({...formData, fuente_agua: e.target.value})} data-testid="select-fuente-agua">
                  <option value="">Seleccionar...</option>
                  <option value="Pozo">Pozo</option>
                  <option value="Embalse">Embalse</option>
                  <option value="Red">Red municipal</option>
                  <option value="Canal">Canal</option>
                  <option value="Balsa">Balsa</option>
                  <option value="Rio">Río</option>
                </select>
              </div>
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Hora Inicio</label>
                <input type="time" className="form-input" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Hora Fin</label>
                <input type="time" className="form-input" value={formData.hora_fin} onChange={(e) => setFormData({...formData, hora_fin: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Caudal (L/h)</label>
                <input type="number" step="0.1" className="form-input" value={formData.caudal} onChange={(e) => setFormData({...formData, caudal: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Presión (bar)</label>
                <input type="number" step="0.1" className="form-input" value={formData.presion} onChange={(e) => setFormData({...formData, presion: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea className="form-textarea" rows={2} value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} />
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={formData.es_planificada}
                  onChange={(e) => setFormData({...formData, es_planificada: e.target.checked, estado: e.target.checked ? 'planificado' : 'completado'})}
                />
                Es riego planificado (futuro)
              </label>
              {formData.es_planificada && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fecha Planificada</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={formData.fecha_planificada}
                    onChange={(e) => setFormData({...formData, fecha_planificada: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-riego">{editingId ? 'Guardar' : 'Crear'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Vista */}
      {vista === 'graficos' ? renderGraficos() : (
        <div className="card">
          <h2 className="card-title">Registros de Riego</h2>
          {loading ? (
            <p>{t('common.loading', 'Cargando...')}</p>
          ) : filteredIrrigaciones.length === 0 ? (
            <p className="text-muted">{t('common.noData', 'No hay datos')}</p>
          ) : (
            <div className="table-container">
              <table data-testid="irrigaciones-table">
                <thead>
                  <tr>
                    {fieldsConfig.fecha && <th>Fecha</th>}
                    {fieldsConfig.parcela_id && <th>Parcela</th>}
                    {fieldsConfig.sistema && <th>Sistema</th>}
                    {fieldsConfig.duracion && <th>Duración (h)</th>}
                    {fieldsConfig.volumen && <th>Volumen (m³)</th>}
                    {fieldsConfig.consumo_por_ha && <th>m³/ha</th>}
                    {fieldsConfig.coste && <th>Coste (€)</th>}
                    {fieldsConfig.estado && <th>Estado</th>}
                    <th>{t('common.actions', 'Acciones')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIrrigaciones.map(irrig => (
                    <tr key={irrig._id}>
                      {fieldsConfig.fecha && <td>{irrig.fecha}</td>}
                      {fieldsConfig.parcela_id && (
                        <td>
                          <div style={{ fontWeight: '500' }}>{irrig.parcela_codigo || '-'}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{irrig.cultivo || ''}</div>
                        </td>
                      )}
                      {fieldsConfig.sistema && <td>{irrig.sistema}</td>}
                      {fieldsConfig.duracion && <td>{irrig.duracion}</td>}
                      {fieldsConfig.volumen && <td>{irrig.volumen}</td>}
                      {fieldsConfig.consumo_por_ha && <td>{irrig.consumo_por_ha || '-'}</td>}
                      {fieldsConfig.coste && <td>€{irrig.coste || 0}</td>}
                      {fieldsConfig.estado && (
                        <td>
                          <span 
                            style={{ 
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: ESTADO_COLORS[irrig.estado || 'completado']?.bg,
                              color: ESTADO_COLORS[irrig.estado || 'completado']?.text
                            }}
                          >
                            {irrig.estado || 'completado'}
                          </span>
                        </td>
                      )}
                      <td>
                        <div className="flex gap-1">
                          {irrig.parcela_id && (
                            <button 
                              className="btn btn-sm btn-secondary" 
                              onClick={() => fetchHistorial(irrig.parcela_id)}
                              title="Ver historial parcela"
                            >
                              <History size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(irrig)} data-testid={`btn-editar-${irrig._id}`}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }} onClick={() => handleDelete(irrig._id)} data-testid={`btn-eliminar-${irrig._id}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Historial */}
      {showHistorial && historialData && (
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
            padding: '1rem',
            zIndex: 9999
          }}
          onClick={() => setShowHistorial(null)}
        >
          <div 
            className="card" 
            style={{ maxWidth: '900px', width: '100%', maxHeight: '85vh', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #2d5a27, #3b82f6)', 
              color: 'white', 
              padding: '1.5rem', 
              margin: '-1rem -1rem 1rem -1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <History size={24} />
                  Historial de Riegos
                </h2>
                <p style={{ opacity: 0.9 }}>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', marginRight: '0.5rem' }}>
                    {historialData.parcela?.codigo}
                  </span>
                  {historialData.parcela?.cultivo} • {historialData.parcela?.superficie} ha
                </p>
              </div>
              <button 
                onClick={() => setShowHistorial(null)} 
                style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>
              {/* KPIs */}
              <div className="stats-grid mb-4">
                <div className="stat-card" style={{ backgroundColor: '#eff6ff' }}>
                  <div className="stat-value" style={{ color: '#2563eb' }}>{historialData.totales?.riegos}</div>
                  <div className="stat-label">Riegos</div>
                </div>
                <div className="stat-card" style={{ backgroundColor: '#ecfdf5' }}>
                  <div className="stat-value" style={{ color: '#059669' }}>{historialData.totales?.volumen_total} m³</div>
                  <div className="stat-label">Volumen Total</div>
                </div>
                <div className="stat-card" style={{ backgroundColor: '#faf5ff' }}>
                  <div className="stat-value" style={{ color: '#7c3aed' }}>{historialData.totales?.volumen_por_ha} m³/ha</div>
                  <div className="stat-label">Por Hectárea</div>
                </div>
                <div className="stat-card" style={{ backgroundColor: '#fef3c7' }}>
                  <div className="stat-value" style={{ color: '#d97706' }}>€{historialData.totales?.coste_total}</div>
                  <div className="stat-label">Coste Total</div>
                </div>
              </div>

              {/* Por sistema */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Distribución por Sistema</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(historialData.por_sistema || {}).map(([sistema, data], idx) => (
                    <span 
                      key={sistema} 
                      style={{ 
                        padding: '4px 12px', 
                        borderRadius: '9999px', 
                        fontSize: '14px',
                        backgroundColor: `${SISTEMA_COLORS[idx % SISTEMA_COLORS.length]}20`,
                        color: SISTEMA_COLORS[idx % SISTEMA_COLORS.length],
                        border: `1px solid ${SISTEMA_COLORS[idx % SISTEMA_COLORS.length]}40`
                      }}
                    >
                      {sistema}: {data.count} riegos ({data.volumen} m³)
                    </span>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Sistema</th>
                      <th>Duración</th>
                      <th>Volumen</th>
                      <th>Coste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialData.historial?.map(h => (
                      <tr key={h._id}>
                        <td>{h.fecha}</td>
                        <td>{h.sistema}</td>
                        <td>{h.duracion} h</td>
                        <td>{h.volumen} m³</td>
                        <td>€{h.coste || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowHistorial(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Irrigaciones;
