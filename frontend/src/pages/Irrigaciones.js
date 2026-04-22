import React, { useState, useEffect, useMemo } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Filter, Settings, X, Droplets, Search,
  Download, Calendar, Clock, History, Calculator, BarChart3,
  MapPin, Gauge, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
import PaginationFooter, { usePagination } from '../components/PaginationFooter';
import '../App.css';


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
  const [activeTab, setActiveTab] = useState('general');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [sistemas, setSistemas] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [showHistorial, setShowHistorial] = useState(null);
  const [historialData, setHistorialData] = useState(null);
  const [showCalculadora, setShowCalculadora] = useState(false);
  
  const { token, user } = useAuth();
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
    cultivo: '',
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

  // Función para manejar cambio de parcela en calculadora
  const handleCalcParcelaChange = (parcelaId) => {
    if (parcelaId) {
      const parcela = parcelas.find(p => p._id === parcelaId);
      setCalcData({
        ...calcData,
        parcela_id: parcelaId,
        superficie: parcela?.superficie_total || 0
      });
    } else {
      setCalcData({...calcData, parcela_id: '', superficie: 0});
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchIrrigaciones();
    fetchParcelas();
    fetchStats();
    fetchSistemas();
    fetchCultivos();
  }, []);

  useEffect(() => {
    localStorage.setItem('irrigaciones_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);

  const fetchIrrigaciones = async () => {
    try {
      setError(null);
      const data = await api.get('/api/irrigaciones');
      setIrrigaciones(data.irrigaciones || []);
    } catch (err) {

      setError('Error al cargar irrigaciones');
    }
    setLoading(false);
  };

  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/parcelas');
      setParcelas(data.parcelas || []);
    } catch (err) {

    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/irrigaciones/stats');
      setStats(data);
    } catch (err) {

    }
  };

  const fetchSistemas = async () => {
    try {
      const data = await api.get('/api/irrigaciones/sistemas');
      setSistemas(data.sistemas || []);
    } catch (err) {

    }
  };

  const fetchCultivos = async () => {
    try {
      const data = await api.get('/api/cultivos');
      setCultivos(data.cultivos || []);
    } catch (err) {

    }
  };

  const fetchHistorial = async (parcelaId) => {
    try {
      const data = await api.get(`/api/irrigaciones/historial/${parcelaId}`);
      setHistorialData(data);
      setShowHistorial(parcelaId);
    } catch (err) {

    }
  };

  // Filtrar irrigaciones
  const filteredIrrigaciones = useMemo(() => {
    return irrigaciones.filter(i => {
      // Obtener el cultivo de la parcela asociada
      const parcelaInfo = parcelas.find(p => p._id === i.parcela_id);
      const cultivoIrrigacion = parcelaInfo?.cultivo || i.cultivo || '';
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!i.parcela_codigo?.toLowerCase().includes(search) &&
            !cultivoIrrigacion?.toLowerCase().includes(search) &&
            !i.observaciones?.toLowerCase().includes(search)) return false;
      }
      if (filters.sistema && i.sistema !== filters.sistema) return false;
      if (filters.parcela_id && i.parcela_id !== filters.parcela_id) return false;
      if (filters.estado && i.estado !== filters.estado) return false;
      if (filters.fecha_desde && i.fecha < filters.fecha_desde) return false;
      if (filters.fecha_hasta && i.fecha > filters.fecha_hasta) return false;
      if (filters.cultivo && cultivoIrrigacion !== filters.cultivo) return false;
      return true;
    });
  }, [irrigaciones, filters, parcelas]);

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  const clearFilters = () => {
    setFilters({
      search: '', sistema: '', parcela_id: '', estado: '',
      fecha_desde: '', fecha_hasta: '', cultivo: ''
    });
  };

  // Paginación
  const { page, pageSize, totalPages, totalItems, pageStart, pageEnd, paginatedItems: paginatedIrrigaciones, setPage, setPageSize } = usePagination(filteredIrrigaciones, 25);

  // Bulk delete
  const canBulkDelete = !!user?.can_bulk_delete;
  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(paginatedIrrigaciones);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await bulkDeleteApi('irrigaciones', selectedIds);
      const r = res?.data ?? res;
      const deleted = new Set(selectedIds);
      setIrrigaciones(prev => prev.filter(x => !deleted.has(x._id)));
      clearSelection();
      if (r?.deleted_count != null) {
        window.alert(`${r.deleted_count} irrigación${r.deleted_count > 1 ? 'es' : ''} eliminada${r.deleted_count > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Error al eliminar masivamente');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Función para manejar el cambio de parcela en el filtro
  const handleParcelaFilterChange = (parcelaId) => {
    if (parcelaId) {
      // Buscar la parcela seleccionada
      const parcelaSeleccionada = parcelas.find(p => p._id === parcelaId);
      if (parcelaSeleccionada && parcelaSeleccionada.cultivo) {
        // Actualizar ambos filtros: parcela y cultivo
        setFilters({
          ...filters, 
          parcela_id: parcelaId, 
          cultivo: parcelaSeleccionada.cultivo
        });
      } else {
        // Solo actualizar parcela
        setFilters({...filters, parcela_id: parcelaId});
      }
    } else {
      // Si se selecciona "Todas", limpiar ambos filtros
      setFilters({...filters, parcela_id: '', cultivo: ''});
    }
  };

  // Opciones únicas para filtros
  const filterOptions = useMemo(() => {
    // Combinar cultivos del catálogo con los de las parcelas
    const cultivosCatalogo = cultivos.map(c => c.nombre).filter(Boolean);
    const cultivosParcelas = parcelas.map(p => p.cultivo).filter(Boolean);
    const todosCultivos = [...new Set([...cultivosCatalogo, ...cultivosParcelas])].sort();
    
    return {
      sistemas: [...new Set(irrigaciones.map(i => i.sistema).filter(Boolean))],
      cultivos: todosCultivos,
      parcelas: parcelas.map(p => ({ id: p._id, codigo: p.codigo_plantacion, cultivo: p.cultivo }))
    };
  }, [irrigaciones, parcelas, cultivos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        duracion: parseFloat(formData.duracion) || 0,
        volumen: parseFloat(formData.volumen) || 0,
        coste: parseFloat(formData.coste) || 0,
        caudal: formData.caudal ? parseFloat(formData.caudal) : null,
        presion: formData.presion ? parseFloat(formData.presion) : null
      };
      
      if (editingId) {
        await api.put(`/api/irrigaciones/${editingId}`, submitData);
      } else {
        await api.post('/api/irrigaciones', submitData);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchIrrigaciones();
      fetchStats();
    } catch (err) {

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
      cultivo: '',
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

  // Función para manejar el cambio de parcela en el formulario
  const handleParcelaChange = (parcelaId) => {
    if (parcelaId) {
      const parcelaSeleccionada = parcelas.find(p => p._id === parcelaId);
      setFormData({
        ...formData, 
        parcela_id: parcelaId, 
        cultivo: parcelaSeleccionada?.cultivo || ''
      });
    } else {
      setFormData({...formData, parcela_id: '', cultivo: ''});
    }
  };

  const handleEdit = (irrigacion) => {
    setEditingId(irrigacion._id);
    // Buscar el cultivo de la parcela
    const parcela = parcelas.find(p => p._id === irrigacion.parcela_id);
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
      observaciones: irrigacion.observaciones || '',
      cultivo: parcela?.cultivo || irrigacion.cultivo || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro de riego?')) return;
    try {
      await api.delete(`/api/irrigaciones/${id}`);
      fetchIrrigaciones();
      fetchStats();
    } catch (err) {

    }
  };

  // Export to Excel - uses api.download
  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.parcela_id) params.append('parcela_id', filters.parcela_id);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      
      await api.download(`/api/irrigaciones/export/excel?${params}`, `irrigaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {

    }
  };

  const calcularConsumo = async () => {
    if (!calcData.parcela_id || !calcData.volumen) return;
    try {
      const data = await api.get(`/api/irrigaciones/calcular-consumo?parcela_id=${calcData.parcela_id}&volumen=${calcData.volumen}`);
      setCalcData({
        ...calcData,
        superficie: data.superficie_ha,
        consumo_por_ha: data.consumo_por_ha
      });
    } catch (err) {

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
                onChange={(e) => handleCalcParcelaChange(e.target.value)}
                data-testid="calc-select-parcela"
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
                data-testid="calc-input-volumen"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Superficie (ha)</label>
              <input 
                type="text" 
                className="form-input" 
                value={calcData.superficie} 
                readOnly 
                style={{ backgroundColor: '#f3f4f6', fontWeight: '600' }}
                data-testid="calc-input-superficie"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Consumo (m³/ha)</label>
              <input 
                type="text" 
                className="form-input" 
                value={calcData.consumo_por_ha} 
                readOnly 
                style={{ backgroundColor: '#dcfce7', fontWeight: 'bold', color: '#16a34a' }}
                data-testid="calc-input-consumo"
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
                <select className="form-select" value={filters.parcela_id} onChange={(e) => handleParcelaFilterChange(e.target.value)} data-testid="select-filtro-parcela">
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

      {/* Formulario Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowForm(false); setEditingId(null); resetForm(); setActiveTab('general'); }}
        >
          <div
            className="card"
            style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(210, 80%, 50% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={20} style={{ color: 'hsl(210, 80%, 50%)' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Riego</h2>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    {formData.cultivo ? `${formData.cultivo} — ${formData.sistema}` : 'Registro de irrigación de la parcela'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); setActiveTab('general'); }} className="config-modal-close-btn" data-testid="btn-close-modal-riego">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'general', label: 'General', icon: <MapPin size={14} /> },
                { key: 'volumen', label: 'Volumen y Coste', icon: <Droplets size={14} /> },
                { key: 'tecnico', label: 'Datos Técnicos', icon: <Gauge size={14} /> },
                { key: 'planificacion', label: 'Planificación', icon: <Calendar size={14} /> },
                { key: 'observaciones', label: 'Observaciones', icon: <FileText size={14} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`tab-${tab.key}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, overflow: 'auto', paddingRight: '1rem' }}>

                {/* TAB: General */}
                {activeTab === 'general' && (
                  <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Parcela y Sistema</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Parcela *</label>
                        <select className="form-input" value={formData.parcela_id} onChange={(e) => handleParcelaChange(e.target.value)} required data-testid="select-parcela">
                          <option value="">Seleccionar...</option>
                          {parcelas.map(p => (
                            <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo} ({p.superficie_total} ha)</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Cultivo</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.cultivo}
                          readOnly
                          style={{ backgroundColor: 'hsl(var(--muted) / 0.3)', cursor: 'not-allowed' }}
                          placeholder="Se rellena automáticamente"
                          data-testid="input-cultivo"
                        />
                      </div>
                    </div>

                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Datos del Riego</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Sistema *</label>
                        <select className="form-input" value={formData.sistema} onChange={(e) => setFormData({ ...formData, sistema: e.target.value })} required data-testid="select-sistema">
                          {sistemas.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha *</label>
                        <input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} required data-testid="input-fecha" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Estado</label>
                        <select className="form-input" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} data-testid="select-estado">
                          <option value="planificado">Planificado</option>
                          <option value="en_curso">En Curso</option>
                          <option value="completado">Completado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Volumen y Coste */}
                {activeTab === 'volumen' && (
                  <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Cantidades</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Duración (horas) *</label>
                        <input type="number" step="0.1" className="form-input" value={formData.duracion} onChange={(e) => setFormData({ ...formData, duracion: e.target.value })} required data-testid="input-duracion" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Volumen (m³) *</label>
                        <input type="number" step="0.1" className="form-input" value={formData.volumen} onChange={(e) => setFormData({ ...formData, volumen: e.target.value })} required data-testid="input-volumen" />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Coste y Origen del agua</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Coste (€)</label>
                        <input type="number" step="0.01" className="form-input" value={formData.coste} onChange={(e) => setFormData({ ...formData, coste: e.target.value })} data-testid="input-coste" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fuente de Agua</label>
                        <select className="form-input" value={formData.fuente_agua} onChange={(e) => setFormData({ ...formData, fuente_agua: e.target.value })} data-testid="select-fuente-agua">
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
                  </div>
                )}

                {/* TAB: Datos Técnicos */}
                {activeTab === 'tecnico' && (
                  <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Horarios</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Hora Inicio</label>
                        <input type="time" className="form-input" value={formData.hora_inicio} onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Hora Fin</label>
                        <input type="time" className="form-input" value={formData.hora_fin} onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })} />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Caudal y Presión</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Caudal (L/h)</label>
                        <input type="number" step="0.1" className="form-input" value={formData.caudal} onChange={(e) => setFormData({ ...formData, caudal: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Presión (bar)</label>
                        <input type="number" step="0.1" className="form-input" value={formData.presion} onChange={(e) => setFormData({ ...formData, presion: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Planificación */}
                {activeTab === 'planificacion' && (
                  <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Planificación futura</h3>
                    <div style={{ background: 'hsl(var(--muted) / 0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.es_planificada}
                          onChange={(e) => setFormData({ ...formData, es_planificada: e.target.checked, estado: e.target.checked ? 'planificado' : 'completado' })}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Es un riego planificado (futuro)</span>
                      </label>
                      {formData.es_planificada && (
                        <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Planificada</label>
                          <input
                            type="date"
                            className="form-input"
                            value={formData.fecha_planificada}
                            onChange={(e) => setFormData({ ...formData, fecha_planificada: e.target.value })}
                            style={{ maxWidth: '260px' }}
                          />
                        </div>
                      )}
                    </div>
                    <small style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', display: 'block', marginTop: '0.75rem' }}>
                      <Calendar size={11} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Los riegos planificados aparecerán en el calendario agrícola y generarán recordatorios.
                    </small>
                  </div>
                )}

                {/* TAB: Observaciones */}
                {activeTab === 'observaciones' && (
                  <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Notas del riego</h3>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <textarea
                        className="form-input"
                        rows={10}
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        placeholder="Condiciones meteorológicas, incidencias, revisiones del sistema..."
                        style={{ fontSize: '0.85rem', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); setActiveTab('general'); }} data-testid="btn-cancelar-riego">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" data-testid="btn-guardar-riego">
                  {editingId ? 'Actualizar' : 'Crear'} Riego
                </button>
              </div>
            </form>
          </div>
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
              {canBulkDelete && (
                <BulkActionBar
                  selectedCount={selectedIds.size}
                  onDelete={handleBulkDelete}
                  onClear={clearSelection}
                  deleting={bulkDeleting}
                />
              )}
              <table data-testid="irrigaciones-table">
                <thead>
                  <tr>
                    {canBulkDelete && (
                      <BulkCheckboxHeader
                        allSelected={allSelected}
                        someSelected={someSelected}
                        onToggle={toggleAll}
                      />
                    )}
                    {fieldsConfig.fecha && <th>Fecha</th>}
                    {fieldsConfig.parcela_id && <th>Parcela</th>}
                    <th>Cultivo</th>
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
                  {paginatedIrrigaciones.map(irrig => {
                    // Obtener el cultivo de la parcela
                    const parcelaInfo = parcelas.find(p => p._id === irrig.parcela_id);
                    const cultivoNombre = parcelaInfo?.cultivo || irrig.cultivo || '-';
                    
                    return (
                    <tr key={irrig._id} style={selectedIds.has(irrig._id) ? { backgroundColor: 'hsl(var(--primary) / 0.05)' } : undefined}>
                      {canBulkDelete && (
                        <BulkCheckboxCell
                          id={irrig._id}
                          selected={selectedIds.has(irrig._id)}
                          onToggle={toggleOne}
                        />
                      )}
                      {fieldsConfig.fecha && <td>{irrig.fecha}</td>}
                      {fieldsConfig.parcela_id && (
                        <td>
                          <div style={{ fontWeight: '500' }}>{irrig.parcela_codigo || '-'}</div>
                        </td>
                      )}
                      <td style={{ color: 'hsl(var(--primary))', fontWeight: '500' }}>{cultivoNombre}</td>
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
                  );
                  })}
                </tbody>
              </table>
              <PaginationFooter
                totalItems={totalItems} page={page} pageSize={pageSize}
                totalPages={totalPages} pageStart={pageStart} pageEnd={pageEnd}
                onPageChange={setPage} onPageSizeChange={setPageSize}
                itemLabel="irrigaciones" testIdSuffix="irrigaciones"
              />
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
