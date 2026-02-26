import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Filter, Settings, X, Droplets, Search,
  Download, Calendar, Clock, AlertTriangle, BarChart3, History,
  Calculator, ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ESTADO_COLORS = {
  planificado: { bg: '#fef3c7', text: '#d97706' },
  en_curso: { bg: '#dbeafe', text: '#2563eb' },
  completado: { bg: '#dcfce7', text: '#16a34a' },
  cancelado: { bg: '#fee2e2', text: '#dc2626' }
};

const SISTEMA_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#06b6d4', '#f59e0b'];

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
  const [vista, setVista] = useState('lista'); // lista, planificadas, graficos
  
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
      console.log('Fetching historial for parcela:', parcelaId);
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/historial/${parcelaId}`, { headers });
      const data = await res.json();
      console.log('Historial data received:', data);
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

  const handleEstadoChange = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones/${id}/estado?estado=${nuevoEstado}`, {
        method: 'PATCH',
        headers
      });
      if (res.ok) {
        fetchIrrigaciones();
        fetchStats();
      }
    } catch (err) {
      console.error('Error updating estado:', err);
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Riegos</div>
          </div>
          <div className="card p-4" style={{ backgroundColor: ESTADO_COLORS.completado.bg }}>
            <div className="text-2xl font-bold" style={{ color: ESTADO_COLORS.completado.text }}>{stats.completados}</div>
            <div className="text-sm">Completados</div>
          </div>
          <div className="card p-4" style={{ backgroundColor: ESTADO_COLORS.planificado.bg }}>
            <div className="text-2xl font-bold" style={{ color: ESTADO_COLORS.planificado.text }}>{stats.planificados}</div>
            <div className="text-sm">Planificados</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totales?.volumen?.toLocaleString()} m³</div>
            <div className="text-sm text-gray-500">Volumen Total</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold">{stats.totales?.horas?.toLocaleString()} h</div>
            <div className="text-sm text-gray-500">Horas Total</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-green-600">€{stats.totales?.coste?.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Coste Total</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por Sistema */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Distribución por Sistema</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.por_sistema}
                  dataKey="count"
                  nameKey="sistema"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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

          {/* Por Mes */}
          <div className="card p-4">
            <h3 className="font-semibold mb-4">Volumen por Mes (últimos 12 meses)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.por_mes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `${value} m³`} />
                <Bar dataKey="volumen" fill="#2563eb" name="Volumen (m³)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="irrigaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>
          <Droplets className="inline mr-2" size={28} />
          {t('irrigations.title', 'Irrigaciones')}
        </h1>
        <div className="flex gap-2">
          <button className={`btn ${vista === 'lista' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVista('lista')}>
            Lista
          </button>
          <button className={`btn ${vista === 'graficos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVista('graficos')}>
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
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={18} />
              Nuevo Riego
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card mb-4 p-4 bg-red-50 border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Calculadora */}
      {showCalculadora && (
        <div className="card mb-4 p-4 bg-blue-50 border border-blue-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calculator size={18} />
            Calculadora de Consumo por Hectárea
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="form-group mb-0">
              <label className="form-label text-sm">Parcela</label>
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
            <div className="form-group mb-0">
              <label className="form-label text-sm">Volumen (m³)</label>
              <input 
                type="number" 
                className="form-input"
                value={calcData.volumen}
                onChange={(e) => setCalcData({...calcData, volumen: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-sm">Superficie (ha)</label>
              <input type="text" className="form-input bg-gray-100" value={calcData.superficie} readOnly />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-sm">Consumo (m³/ha)</label>
              <input 
                type="text" 
                className="form-input bg-green-100 font-bold text-green-700" 
                value={calcData.consumo_por_ha} 
                readOnly 
              />
            </div>
          </div>
          <button className="btn btn-primary mt-3" onClick={calcularConsumo}>
            Calcular
          </button>
        </div>
      )}

      {/* Stats resumen - KPIs en línea horizontal */}
      {vista === 'lista' && stats && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Droplets size={20} className="text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Total Riegos</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Calendar size={20} className="text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.proximos_7_dias}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Próx. 7 días</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                <Droplets size={20} className="text-cyan-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-600">{stats.totales?.volumen?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">m³ Total</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock size={20} className="text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.totales?.horas?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Horas</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">€</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.totales?.coste?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Coste Total</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-600 font-bold text-sm">Ha</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{stats.totales?.superficie?.toLocaleString() || 0}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Ha Regadas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {vista === 'lista' && (
        <div className="card mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="form-input pl-10"
                  placeholder="Buscar..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
              <button
                className="btn btn-secondary flex items-center gap-1"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                Filtros
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {Object.values(filters).filter(v => v).length}
                  </span>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowFieldsConfig(!showFieldsConfig)}
              >
                <Settings size={16} />
              </button>
            </div>
            {hasActiveFilters && (
              <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
                <X size={14} /> Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4 border-t">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Sistema</label>
                <select className="form-select" value={filters.sistema} onChange={(e) => setFilters({...filters, sistema: e.target.value})}>
                  <option value="">Todos</option>
                  {filterOptions.sistemas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Parcela</label>
                <select className="form-select" value={filters.parcela_id} onChange={(e) => setFilters({...filters, parcela_id: e.target.value})}>
                  <option value="">Todas</option>
                  {filterOptions.parcelas.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Estado</label>
                <select className="form-select" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})}>
                  <option value="">Todos</option>
                  <option value="planificado">Planificado</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Cultivo</label>
                <select className="form-select" value={filters.cultivo} onChange={(e) => setFilters({...filters, cultivo: e.target.value})}>
                  <option value="">Todos</option>
                  {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Desde</label>
                <input type="date" className="form-input" value={filters.fecha_desde} onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Hasta</label>
                <input type="date" className="form-input" value={filters.fecha_hasta} onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})} />
              </div>
            </div>
          )}

          {showFieldsConfig && (
            <div className="pt-4 border-t mt-4">
              <h4 className="font-semibold mb-2">Columnas visibles</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(fieldsConfig).map(([field, visible]) => (
                  <label key={field} className="flex items-center gap-1 text-sm">
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

          <div className="mt-2 text-sm text-gray-500">
            Mostrando <strong>{filteredIrrigaciones.length}</strong> de <strong>{irrigaciones.length}</strong> registros
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{editingId ? 'Editar Riego' : 'Nuevo Riego'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-group">
                <label className="form-label">Parcela *</label>
                <select className="form-select" value={formData.parcela_id} onChange={(e) => setFormData({...formData, parcela_id: e.target.value})} required>
                  <option value="">Seleccionar...</option>
                  {parcelas.map(p => (
                    <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo} ({p.superficie_total} ha)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sistema *</label>
                <select className="form-select" value={formData.sistema} onChange={(e) => setFormData({...formData, sistema: e.target.value})} required>
                  {sistemas.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                  <option value="planificado">Planificado</option>
                  <option value="en_curso">En Curso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-group">
                <label className="form-label">Duración (horas) *</label>
                <input type="number" step="0.1" className="form-input" value={formData.duracion} onChange={(e) => setFormData({...formData, duracion: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Volumen (m³) *</label>
                <input type="number" step="0.1" className="form-input" value={formData.volumen} onChange={(e) => setFormData({...formData, volumen: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Coste (€)</label>
                <input type="number" step="0.01" className="form-input" value={formData.coste} onChange={(e) => setFormData({...formData, coste: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Fuente de Agua</label>
                <select className="form-select" value={formData.fuente_agua} onChange={(e) => setFormData({...formData, fuente_agua: e.target.value})}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.es_planificada}
                  onChange={(e) => setFormData({...formData, es_planificada: e.target.checked, estado: e.target.checked ? 'planificado' : 'completado'})}
                />
                Es riego planificado (futuro)
              </label>
              {formData.es_planificada && (
                <div className="form-group mb-0">
                  <label className="form-label text-sm">Fecha Planificada</label>
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
              <button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Crear'}</button>
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
            <p>Cargando...</p>
          ) : filteredIrrigaciones.length === 0 ? (
            <p className="text-gray-500">No hay registros de riego</p>
          ) : (
            <div className="table-container">
              <table>
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
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIrrigaciones.map(irrig => (
                    <tr key={irrig._id}>
                      {fieldsConfig.fecha && <td>{irrig.fecha}</td>}
                      {fieldsConfig.parcela_id && (
                        <td>
                          <div className="font-medium">{irrig.parcela_codigo}</div>
                          <div className="text-xs text-gray-500">{irrig.cultivo}</div>
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
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ 
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
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(irrig)}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-error" onClick={() => handleDelete(irrig._id)}>
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

      {/* Modal Historial - Diseño mejorado */}
      {showHistorial && historialData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <History size={24} />
                    <h2 className="text-2xl font-bold">Historial de Riegos</h2>
                  </div>
                  <p className="text-blue-100 flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-medium">
                      {historialData.parcela?.codigo}
                    </span>
                    <span>{historialData.parcela?.cultivo}</span>
                    <span className="text-blue-200">•</span>
                    <span>{historialData.parcela?.superficie} ha</span>
                  </p>
                </div>
                <button 
                  onClick={() => setShowHistorial(null)} 
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Contenido con scroll */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
              {/* KPIs del historial */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <Droplets size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-blue-700">{historialData.totales?.riegos}</div>
                      <div className="text-sm text-blue-600">Riegos Realizados</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border border-cyan-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200">
                      <Droplets size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-cyan-700">{historialData.totales?.volumen_total}</div>
                      <div className="text-sm text-cyan-600">m³ Total</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                      <BarChart3 size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-700">{historialData.totales?.volumen_por_ha}</div>
                      <div className="text-sm text-purple-600">m³ por Ha</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                      <span className="text-white font-bold text-xl">€</span>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-700">{historialData.totales?.coste_total}</div>
                      <div className="text-sm text-green-600">Coste Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribución por sistema */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Settings size={18} />
                  Distribución por Sistema
                </h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(historialData.por_sistema || {}).map(([sistema, data], index) => (
                    <div 
                      key={sistema} 
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      style={{ 
                        backgroundColor: `${SISTEMA_COLORS[index % SISTEMA_COLORS.length]}15`,
                        color: SISTEMA_COLORS[index % SISTEMA_COLORS.length],
                        border: `1px solid ${SISTEMA_COLORS[index % SISTEMA_COLORS.length]}40`
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SISTEMA_COLORS[index % SISTEMA_COLORS.length] }}
                      />
                      <span className="font-semibold">{sistema}</span>
                      <span className="text-gray-500">•</span>
                      <span>{data.count} riegos</span>
                      <span className="text-gray-500">•</span>
                      <span>{data.volumen} m³</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla de historial */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar size={18} />
                  Detalle de Riegos
                </h4>
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Fecha</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-600">Sistema</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Duración</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Volumen</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600">Coste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialData.historial?.map((h, idx) => (
                        <tr 
                          key={h._id} 
                          className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-800">{h.fecha}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              <Droplets size={14} />
                              {h.sistema}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-700">{h.duracion} h</td>
                          <td className="py-3 px-4 text-right font-medium text-cyan-600">{h.volumen} m³</td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">€{h.coste || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end">
              <button 
                onClick={() => setShowHistorial(null)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
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
