import React, { useState, useEffect, useMemo } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, X, Search, Calendar, Filter, Download, 
  ChevronLeft, ChevronRight, Clock, User, Flag, CheckSquare, 
  Square, ChevronDown, ChevronUp, ClipboardList
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../utils/permissions';
import '../App.css';


const PRIORIDAD_COLORS = {
  alta: { bg: '#fee2e2', text: '#dc2626' },
  media: { bg: '#fef3c7', text: '#d97706' },
  baja: { bg: '#dcfce7', text: '#16a34a' }
};

const ESTADO_COLORS = {
  pendiente: { bg: '#f3f4f6', text: '#6b7280' },
  en_progreso: { bg: '#dbeafe', text: '#2563eb' },
  completada: { bg: '#dcfce7', text: '#16a34a' },
  cancelada: { bg: '#fee2e2', text: '#dc2626' }
};

const Tareas = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [tareas, setTareas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [expandedTarea, setExpandedTarea] = useState(null);
  
  // Vista: lista o calendario
  const [vista, setVista] = useState('lista');
  const [mesCalendario, setMesCalendario] = useState(new Date().getMonth() + 1);
  const [anoCalendario, setAnoCalendario] = useState(new Date().getFullYear());
  const [tareasCalendario, setTareasCalendario] = useState({});
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    prioridad: '',
    tipo_tarea: '',
    asignado_a: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    superficie_tratar: 0,
    parcelas_ids: [],
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    fecha_vencimiento: '',
    observaciones: '',
    prioridad: 'media',
    estado: 'pendiente',
    asignado_a: '',
    tipo_tarea: 'general',
    subtareas: [],
    coste_estimado: 0,
    coste_real: 0
  });

  const [newSubtarea, setNewSubtarea] = useState('');
  const [searchParcela, setSearchParcela] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchTareas();
    fetchParcelas();
    fetchUsuarios();
    fetchStats();
    fetchTipos();
  }, []);

  useEffect(() => {
    if (vista === 'calendario') {
      fetchTareasCalendario();
    }
  }, [vista, mesCalendario, anoCalendario]);

  const fetchTareas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas`, { headers });
      const data = await res.json();
      setTareas(data.tareas || []);
    } catch (err) {
      console.error('Error fetching tareas:', err);
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

  const fetchUsuarios = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas/usuarios-asignables`, { headers });
      const data = await res.json();
      setUsuarios(data.usuarios || []);
    } catch (err) {
      console.error('Error fetching usuarios:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas/stats`, { headers });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTipos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas/tipos`, { headers });
      const data = await res.json();
      setTipos(data.tipos || []);
    } catch (err) {
      console.error('Error fetching tipos:', err);
    }
  };

  const fetchTareasCalendario = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas/calendario?mes=${mesCalendario}&ano=${anoCalendario}`, { headers });
      const data = await res.json();
      setTareasCalendario(data.calendario || {});
    } catch (err) {
      console.error('Error fetching calendario:', err);
    }
  };

  // Filtrar tareas
  const filteredTareas = useMemo(() => {
    return tareas.filter(t => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!t.nombre?.toLowerCase().includes(search) && 
            !t.descripcion?.toLowerCase().includes(search)) return false;
      }
      if (filters.estado) {
        if (filters.estado === 'pendiente' && t.estado !== 'pendiente' && t.realizada) return false;
        else if (filters.estado !== 'pendiente' && t.estado !== filters.estado) return false;
      }
      if (filters.prioridad && t.prioridad !== filters.prioridad) return false;
      if (filters.tipo_tarea && t.tipo_tarea !== filters.tipo_tarea) return false;
      if (filters.asignado_a && t.asignado_a !== filters.asignado_a) return false;
      if (filters.fecha_desde && t.fecha_inicio < filters.fecha_desde) return false;
      if (filters.fecha_hasta && t.fecha_inicio > filters.fecha_hasta) return false;
      return true;
    });
  }, [tareas, filters]);

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  // Filtrar parcelas para el selector
  const filteredParcelas = useMemo(() => {
    if (!searchParcela.trim()) return parcelas;
    const search = searchParcela.toLowerCase();
    return parcelas.filter(p => 
      p.codigo_plantacion?.toLowerCase().includes(search) ||
      p.cultivo?.toLowerCase().includes(search) ||
      p.proveedor?.toLowerCase().includes(search)
    );
  }, [parcelas, searchParcela]);

  const clearFilters = () => {
    setFilters({
      search: '', estado: '', prioridad: '', tipo_tarea: '',
      asignado_a: '', fecha_desde: '', fecha_hasta: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/tareas/${editingId}`
        : `${BACKEND_URL}/api/tareas`;
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchTareas();
        fetchStats();
      }
    } catch (err) {
      console.error('Error saving tarea:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '', descripcion: '', superficie_tratar: 0, parcelas_ids: [],
      fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '',
      fecha_vencimiento: '', observaciones: '', prioridad: 'media',
      estado: 'pendiente', asignado_a: '', tipo_tarea: 'general',
      subtareas: [], coste_estimado: 0, coste_real: 0
    });
    setNewSubtarea('');
    setSearchParcela('');
  };

  const handleEdit = (tarea) => {
    setEditingId(tarea._id);
    setFormData({
      nombre: tarea.nombre || '',
      descripcion: tarea.descripcion || '',
      superficie_tratar: tarea.superficie_tratar || 0,
      parcelas_ids: tarea.parcelas_ids || [],
      fecha_inicio: tarea.fecha_inicio || '',
      fecha_fin: tarea.fecha_fin || '',
      fecha_vencimiento: tarea.fecha_vencimiento || '',
      observaciones: tarea.observaciones || '',
      prioridad: tarea.prioridad || 'media',
      estado: tarea.estado || (tarea.realizada ? 'completada' : 'pendiente'),
      asignado_a: tarea.asignado_a || '',
      tipo_tarea: tarea.tipo_tarea || 'general',
      subtareas: tarea.subtareas || [],
      coste_estimado: tarea.coste_estimado || 0,
      coste_real: tarea.coste_real || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchTareas();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting tarea:', err);
    }
  };

  const handleEstadoChange = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas/${id}/estado?estado=${nuevoEstado}`, {
        method: 'PATCH',
        headers
      });
      if (res.ok) {
        fetchTareas();
        fetchStats();
      }
    } catch (err) {
      console.error('Error updating estado:', err);
    }
  };

  const handleToggleSubtarea = async (tareaId, subtareaId, completada) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/tareas/${tareaId}/subtarea/${subtareaId}?completada=${!completada}`,
        { method: 'PATCH', headers }
      );
      if (res.ok) {
        fetchTareas();
      }
    } catch (err) {
      console.error('Error toggling subtarea:', err);
    }
  };

  const addSubtarea = () => {
    if (!newSubtarea.trim()) return;
    setFormData({
      ...formData,
      subtareas: [...formData.subtareas, { 
        id: Date.now().toString(), 
        descripcion: newSubtarea, 
        completada: false 
      }]
    });
    setNewSubtarea('');
  };

  const removeSubtarea = (id) => {
    setFormData({
      ...formData,
      subtareas: formData.subtareas.filter(st => st.id !== id)
    });
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.prioridad) params.append('prioridad', filters.prioridad);
      
      const res = await fetch(`${BACKEND_URL}/api/tareas/export/excel?${params}`, { headers });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tareas_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };

  // Calendario helpers
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const renderCalendario = () => {
    const daysInMonth = getDaysInMonth(mesCalendario, anoCalendario);
    const firstDay = getFirstDayOfMonth(mesCalendario, anoCalendario);
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ padding: '0.5rem', backgroundColor: '#f9fafb' }}></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${anoCalendario}-${String(mesCalendario).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const tareasDelDia = tareasCalendario[dateKey] || [];
      const isToday = dateKey === new Date().toISOString().split('T')[0];

      days.push(
        <div 
          key={day} 
          style={{ 
            padding: '0.5rem', 
            minHeight: '100px', 
            border: '1px solid #e5e7eb',
            backgroundColor: isToday ? '#eff6ff' : 'white',
            borderColor: isToday ? '#3b82f6' : '#e5e7eb'
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: isToday ? '#2563eb' : '#374151' }}>{day}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {tareasDelDia.slice(0, 3).map(tarea => (
              <div 
                key={tarea._id}
                style={{ 
                  fontSize: '11px', 
                  padding: '2px 4px', 
                  borderRadius: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  backgroundColor: PRIORIDAD_COLORS[tarea.prioridad]?.bg || '#f3f4f6',
                  color: PRIORIDAD_COLORS[tarea.prioridad]?.text || '#374151'
                }}
                onClick={() => handleEdit(tarea)}
                title={tarea.nombre}
              >
                {tarea.nombre}
              </div>
            ))}
            {tareasDelDia.length > 3 && (
              <div style={{ fontSize: '11px', color: '#6b7280' }}>+{tareasDelDia.length - 3} más</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              if (mesCalendario === 1) {
                setMesCalendario(12);
                setAnoCalendario(anoCalendario - 1);
              } else {
                setMesCalendario(mesCalendario - 1);
              }
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{monthNames[mesCalendario - 1]} {anoCalendario}</h3>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              if (mesCalendario === 12) {
                setMesCalendario(1);
                setAnoCalendario(anoCalendario + 1);
              } else {
                setMesCalendario(mesCalendario + 1);
              }
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: '#e5e7eb' }}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>{d}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="tareas-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">
          <ClipboardList className="inline mr-2" size={28} style={{ color: '#2d5a27' }} />
          {t('tasks.title', 'Tareas')}
        </h1>
        <div className="flex gap-2">
          <button 
            className={`btn ${vista === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVista('lista')}
          >
            Lista
          </button>
          <button 
            className={`btn ${vista === 'calendario' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVista('calendario')}
          >
            <Calendar size={16} className="mr-1" />
            Calendario
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <Download size={16} className="mr-1" />
            Excel
          </button>
          {canCreate && (
            <button 
              className="btn btn-primary" 
              onClick={() => { resetForm(); setShowForm(true); }}
              data-testid="btn-nueva-tarea"
            >
              <Plus size={18} />
              Nueva Tarea
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid mb-4">
          <div className="stat-card">
            <div className="stat-icon"><ClipboardList size={20} /></div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: ESTADO_COLORS.pendiente.bg }}>
            <div className="stat-value" style={{ color: ESTADO_COLORS.pendiente.text }}>{stats.pendientes}</div>
            <div className="stat-label">Pendientes</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: ESTADO_COLORS.en_progreso.bg }}>
            <div className="stat-value" style={{ color: ESTADO_COLORS.en_progreso.text }}>{stats.en_progreso}</div>
            <div className="stat-label">En Progreso</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: ESTADO_COLORS.completada.bg }}>
            <div className="stat-value" style={{ color: ESTADO_COLORS.completada.text }}>{stats.completadas}</div>
            <div className="stat-label">Completadas</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: '#fee2e2' }}>
            <div className="stat-value" style={{ color: '#dc2626' }}>{stats.vencidas}</div>
            <div className="stat-label">Vencidas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Calendar size={20} /></div>
            <div className="stat-value">{stats.esta_semana}</div>
            <div className="stat-label">Esta Semana</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {vista === 'lista' && (
        <div className="card mb-4" data-testid="tareas-filtros">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative" style={{ maxWidth: '300px', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Buscar tareas..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  data-testid="input-buscar-tareas"
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
                <label className="form-label" style={{ fontSize: '12px' }}>Estado</label>
                <select className="form-select" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})} data-testid="select-filtro-estado">
                  <option value="">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Prioridad</label>
                <select className="form-select" value={filters.prioridad} onChange={(e) => setFilters({...filters, prioridad: e.target.value})} data-testid="select-filtro-prioridad">
                  <option value="">Todas</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Tipo</label>
                <select className="form-select" value={filters.tipo_tarea} onChange={(e) => setFilters({...filters, tipo_tarea: e.target.value})} data-testid="select-filtro-tipo">
                  <option value="">Todos</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Asignado a</label>
                <select className="form-select" value={filters.asignado_a} onChange={(e) => setFilters({...filters, asignado_a: e.target.value})} data-testid="select-filtro-asignado">
                  <option value="">Todos</option>
                  {usuarios.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
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

          <div style={{ marginTop: '0.75rem', fontSize: '14px', color: '#6b7280' }}>
            Mostrando <strong>{filteredTareas.length}</strong> de <strong>{tareas.length}</strong> tareas
            {hasActiveFilters && ' (filtradas)'}
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card mb-4">
          <h2 className="card-title">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-4">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Nombre *</label>
                <input
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={formData.tipo_tarea} onChange={(e) => setFormData({...formData, tipo_tarea: e.target.value})} data-testid="select-tipo">
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select className="form-select" value={formData.prioridad} onChange={(e) => setFormData({...formData, prioridad: e.target.value})} data-testid="select-prioridad">
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} data-testid="select-estado">
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Asignado a</label>
                <select className="form-select" value={formData.asignado_a} onChange={(e) => setFormData({...formData, asignado_a: e.target.value})} data-testid="select-asignado">
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Inicio</label>
                <input type="date" className="form-input" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} data-testid="input-fecha-inicio" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Vencimiento</label>
                <input type="date" className="form-input" value={formData.fecha_vencimiento} onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} data-testid="input-fecha-vencimiento" />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Parcelas asignadas</label>
                {/* Buscador de parcelas */}
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px', fontSize: '14px' }}
                    placeholder="Buscar parcela por código, cultivo..."
                    value={searchParcela}
                    onChange={(e) => setSearchParcela(e.target.value)}
                  />
                  {searchParcela && (
                    <button
                      type="button"
                      onClick={() => setSearchParcela('')}
                      style={{ 
                        position: 'absolute', 
                        right: '10px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: '#6b7280'
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {/* Lista de parcelas */}
                <div style={{ 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  maxHeight: '180px', 
                  overflowY: 'auto',
                  backgroundColor: '#f9fafb'
                }}>
                  {filteredParcelas.length === 0 ? (
                    <div style={{ padding: '0.75rem', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                      {parcelas.length === 0 ? 'No hay parcelas disponibles' : 'No se encontraron parcelas'}
                    </div>
                  ) : (
                    filteredParcelas.map(p => (
                      <label 
                        key={p._id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: formData.parcelas_ids.includes(p._id) ? '#dcfce7' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.parcelas_ids.includes(p._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, parcelas_ids: [...formData.parcelas_ids, p._id]});
                            } else {
                              setFormData({...formData, parcelas_ids: formData.parcelas_ids.filter(id => id !== p._id)});
                            }
                          }}
                          style={{ accentColor: '#2d5a27' }}
                        />
                        <span style={{ fontSize: '14px' }}>
                          <strong>{p.codigo_plantacion}</strong> - {p.cultivo}
                          {p.superficie_total && <span style={{ color: '#6b7280' }}> ({p.superficie_total} ha)</span>}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {/* Info de selección */}
                <div style={{ marginTop: '0.5rem', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>
                    {filteredParcelas.length} de {parcelas.length} parcelas
                  </span>
                  {formData.parcelas_ids.length > 0 && (
                    <span style={{ color: '#2d5a27', fontWeight: '500' }}>
                      {formData.parcelas_ids.length} seleccionada(s)
                    </span>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" rows={3} value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} data-testid="textarea-descripcion" />
              </div>
            </div>

            {/* Subtareas */}
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={16} />
                Subtareas / Checklist
              </h4>
              <div className="flex gap-2 mb-2">
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Añadir subtarea..."
                  value={newSubtarea}
                  onChange={(e) => setNewSubtarea(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtarea())}
                />
                <button type="button" className="btn btn-secondary" onClick={addSubtarea}>
                  <Plus size={16} />
                </button>
              </div>
              {formData.subtareas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {formData.subtareas.map(st => (
                    <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                      {st.completada ? <CheckSquare size={16} style={{ color: '#16a34a' }} /> : <Square size={16} style={{ color: '#9ca3af' }} />}
                      <span style={{ textDecoration: st.completada ? 'line-through' : 'none', color: st.completada ? '#9ca3af' : '#374151' }}>{st.descripcion}</span>
                      <button type="button" style={{ marginLeft: 'auto', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeSubtarea(st.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid-2 mb-4">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Coste Estimado (€)</label>
                <input type="number" step="0.01" className="form-input" value={formData.coste_estimado} onChange={(e) => setFormData({...formData, coste_estimado: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Coste Real (€)</label>
                <input type="number" step="0.01" className="form-input" value={formData.coste_real} onChange={(e) => setFormData({...formData, coste_real: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-tarea">{editingId ? 'Guardar' : 'Crear'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Vista */}
      {vista === 'calendario' ? renderCalendario() : (
        <div className="card">
          <h2 className="card-title">Lista de Tareas</h2>
          {loading ? (
            <p>{t('common.loading', 'Cargando...')}</p>
          ) : filteredTareas.length === 0 ? (
            <p className="text-muted">{t('common.noData', 'No hay tareas')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredTareas.map(tarea => (
                <div 
                  key={tarea._id} 
                  style={{ 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    borderLeftWidth: '4px',
                    borderLeftColor: PRIORIDAD_COLORS[tarea.prioridad]?.text || '#9ca3af',
                    transition: 'box-shadow 0.2s'
                  }}
                  className="hover-shadow"
                  data-testid={`tarea-item-${tarea._id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      {/* Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span 
                          style={{ 
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: ESTADO_COLORS[tarea.estado || 'pendiente']?.bg,
                            color: ESTADO_COLORS[tarea.estado || 'pendiente']?.text
                          }}
                        >
                          {tarea.estado || 'pendiente'}
                        </span>
                        <span 
                          style={{ 
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            backgroundColor: PRIORIDAD_COLORS[tarea.prioridad]?.bg,
                            color: PRIORIDAD_COLORS[tarea.prioridad]?.text,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Flag size={10} />
                          {tarea.prioridad}
                        </span>
                        {tarea.tipo_tarea && tarea.tipo_tarea !== 'general' && (
                          <span style={{ fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                            {tipos.find(t => t.id === tarea.tipo_tarea)?.nombre || tarea.tipo_tarea}
                          </span>
                        )}
                      </div>
                      
                      {/* Title */}
                      <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{tarea.nombre}</h3>
                      {tarea.descripcion && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.5rem' }}>{tarea.descripcion}</p>}
                      
                      {/* Meta info */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '14px', color: '#6b7280' }}>
                        {tarea.asignado_nombre && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={14} /> {tarea.asignado_nombre}
                          </span>
                        )}
                        {tarea.fecha_inicio && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} /> {tarea.fecha_inicio}
                          </span>
                        )}
                        {tarea.fecha_vencimiento && (
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: new Date(tarea.fecha_vencimiento) < new Date() && tarea.estado !== 'completada' ? '#dc2626' : '#6b7280'
                          }}>
                            <Clock size={14} /> Vence: {tarea.fecha_vencimiento}
                          </span>
                        )}
                        {tarea.parcelas_ids?.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ 
                              backgroundColor: '#dcfce7', 
                              color: '#166534', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {tarea.parcelas_ids.length} parcela(s)
                            </span>
                          </span>
                        )}
                        {tarea.cultivo && <span>Cultivo: {tarea.cultivo}</span>}
                      </div>
                      
                      {/* Subtareas preview */}
                      {tarea.subtareas?.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <button 
                            style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => setExpandedTarea(expandedTarea === tarea._id ? null : tarea._id)}
                          >
                            <CheckSquare size={14} />
                            {tarea.subtareas.filter(st => st.completada).length}/{tarea.subtareas.length} subtareas
                            {expandedTarea === tarea._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {expandedTarea === tarea._id && (
                            <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {tarea.subtareas.map(st => (
                                <div 
                                  key={st.id} 
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', cursor: 'pointer' }}
                                  onClick={() => handleToggleSubtarea(tarea._id, st.id, st.completada)}
                                >
                                  {st.completada ? 
                                    <CheckSquare size={14} style={{ color: '#16a34a' }} /> : 
                                    <Square size={14} style={{ color: '#9ca3af' }} />
                                  }
                                  <span style={{ textDecoration: st.completada ? 'line-through' : 'none', color: st.completada ? '#9ca3af' : '#374151' }}>{st.descripcion}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                      {tarea.estado !== 'completada' && canEdit && (
                        <select 
                          className="form-select"
                          style={{ fontSize: '14px', padding: '0.25rem 0.5rem', width: 'auto' }}
                          value={tarea.estado || 'pendiente'}
                          onChange={(e) => handleEstadoChange(tarea._id, e.target.value)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_progreso">En Progreso</option>
                          <option value="completada">Completada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      )}
                      {canEdit && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(tarea)} data-testid={`btn-editar-${tarea._id}`}>
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }} onClick={() => handleDelete(tarea._id)} data-testid={`btn-eliminar-${tarea._id}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tareas;
