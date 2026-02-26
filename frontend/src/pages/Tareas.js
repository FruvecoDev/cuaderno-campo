import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, X, CheckCircle, Circle, Search, Calendar, 
  Filter, Download, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  User, Flag, CheckSquare, Square, ChevronDown, ChevronUp, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PermissionButton, usePermissions } from '../utils/permissions';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PRIORIDAD_COLORS = {
  alta: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  media: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
  baja: { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' }
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

  const renderCalendario = () => {
    const daysInMonth = getDaysInMonth(mesCalendario, anoCalendario);
    const firstDay = getFirstDayOfMonth(mesCalendario, anoCalendario);
    const days = [];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 bg-gray-50"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${anoCalendario}-${String(mesCalendario).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const tareasDelDia = tareasCalendario[dateKey] || [];
      const isToday = dateKey === new Date().toISOString().split('T')[0];

      days.push(
        <div 
          key={day} 
          className={`p-2 min-h-24 border ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
        >
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : ''}`}>{day}</div>
          <div className="space-y-1">
            {tareasDelDia.slice(0, 3).map(tarea => (
              <div 
                key={tarea._id}
                className="text-xs p-1 rounded truncate cursor-pointer"
                style={{ 
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
              <div className="text-xs text-gray-500">+{tareasDelDia.length - 3} más</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
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
          <h3 className="text-lg font-semibold">{monthNames[mesCalendario - 1]} {anoCalendario}</h3>
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
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="p-2 bg-gray-100 text-center text-sm font-medium">{d}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="tareas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('tasks.title', 'Tareas')}</h1>
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
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={18} />
              Nueva Tarea
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="card p-4" style={{ backgroundColor: ESTADO_COLORS.pendiente.bg }}>
            <div className="text-2xl font-bold" style={{ color: ESTADO_COLORS.pendiente.text }}>{stats.pendientes}</div>
            <div className="text-sm">Pendientes</div>
          </div>
          <div className="card p-4" style={{ backgroundColor: ESTADO_COLORS.en_progreso.bg }}>
            <div className="text-2xl font-bold" style={{ color: ESTADO_COLORS.en_progreso.text }}>{stats.en_progreso}</div>
            <div className="text-sm">En Progreso</div>
          </div>
          <div className="card p-4" style={{ backgroundColor: ESTADO_COLORS.completada.bg }}>
            <div className="text-2xl font-bold" style={{ color: ESTADO_COLORS.completada.text }}>{stats.completadas}</div>
            <div className="text-sm">Completadas</div>
          </div>
          <div className="card p-4" style={{ backgroundColor: '#fee2e2' }}>
            <div className="text-2xl font-bold text-red-600">{stats.vencidas}</div>
            <div className="text-sm">Vencidas</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold">{stats.esta_semana}</div>
            <div className="text-sm text-gray-500">Esta Semana</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {vista === 'lista' && (
        <div className="card mb-4" data-testid="tareas-filtros">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="form-input pl-10"
                  placeholder="Buscar tareas..."
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
                <label className="form-label text-xs">Estado</label>
                <select className="form-select" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})}>
                  <option value="">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Prioridad</label>
                <select className="form-select" value={filters.prioridad} onChange={(e) => setFilters({...filters, prioridad: e.target.value})}>
                  <option value="">Todas</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Tipo</label>
                <select className="form-select" value={filters.tipo_tarea} onChange={(e) => setFilters({...filters, tipo_tarea: e.target.value})}>
                  <option value="">Todos</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Asignado a</label>
                <select className="form-select" value={filters.asignado_a} onChange={(e) => setFilters({...filters, asignado_a: e.target.value})}>
                  <option value="">Todos</option>
                  {usuarios.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
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

          <div className="mt-2 text-sm text-gray-500">
            Mostrando <strong>{filteredTareas.length}</strong> de <strong>{tareas.length}</strong> tareas
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-group lg:col-span-2">
                <label className="form-label">Nombre *</label>
                <input
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={formData.tipo_tarea} onChange={(e) => setFormData({...formData, tipo_tarea: e.target.value})}>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Prioridad</label>
                <select className="form-select" value={formData.prioridad} onChange={(e) => setFormData({...formData, prioridad: e.target.value})}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Asignado a</label>
                <select className="form-select" value={formData.asignado_a} onChange={(e) => setFormData({...formData, asignado_a: e.target.value})}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Inicio</label>
                <input type="date" className="form-input" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Vencimiento</label>
                <input type="date" className="form-input" value={formData.fecha_vencimiento} onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Parcelas</label>
                <select 
                  className="form-select" 
                  multiple 
                  value={formData.parcelas_ids} 
                  onChange={(e) => setFormData({...formData, parcelas_ids: Array.from(e.target.selectedOptions, o => o.value)})}
                  style={{ minHeight: '100px' }}
                >
                  {parcelas.map(p => <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" rows={3} value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>
            </div>

            {/* Subtareas */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckSquare size={16} />
                Subtareas / Checklist
              </h4>
              <div className="flex gap-2 mb-2">
                <input
                  className="form-input flex-1"
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
                <div className="space-y-1">
                  {formData.subtareas.map(st => (
                    <div key={st.id} className="flex items-center gap-2 p-2 bg-white rounded">
                      {st.completada ? <CheckSquare size={16} className="text-green-500" /> : <Square size={16} className="text-gray-400" />}
                      <span className={st.completada ? 'line-through text-gray-400' : ''}>{st.descripcion}</span>
                      <button type="button" className="ml-auto text-red-500" onClick={() => removeSubtarea(st.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group mb-0">
                <label className="form-label">Coste Estimado (€)</label>
                <input type="number" step="0.01" className="form-input" value={formData.coste_estimado} onChange={(e) => setFormData({...formData, coste_estimado: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Coste Real (€)</label>
                <input type="number" step="0.01" className="form-input" value={formData.coste_real} onChange={(e) => setFormData({...formData, coste_real: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">{editingId ? 'Guardar' : 'Crear'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Vista */}
      {vista === 'calendario' ? renderCalendario() : (
        <div className="card">
          <h2 className="card-title">Tareas</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : filteredTareas.length === 0 ? (
            <p className="text-gray-500">No hay tareas</p>
          ) : (
            <div className="space-y-2">
              {filteredTareas.map(tarea => (
                <div 
                  key={tarea._id} 
                  className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  style={{ borderLeftWidth: '4px', borderLeftColor: PRIORIDAD_COLORS[tarea.prioridad]?.text || '#9ca3af' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: ESTADO_COLORS[tarea.estado || 'pendiente']?.bg,
                            color: ESTADO_COLORS[tarea.estado || 'pendiente']?.text
                          }}
                        >
                          {tarea.estado || 'pendiente'}
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ 
                            backgroundColor: PRIORIDAD_COLORS[tarea.prioridad]?.bg,
                            color: PRIORIDAD_COLORS[tarea.prioridad]?.text
                          }}
                        >
                          <Flag size={10} className="inline mr-1" />
                          {tarea.prioridad}
                        </span>
                        {tarea.tipo_tarea && tarea.tipo_tarea !== 'general' && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {tipos.find(t => t.id === tarea.tipo_tarea)?.nombre || tarea.tipo_tarea}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{tarea.nombre}</h3>
                      {tarea.descripcion && <p className="text-sm text-gray-600 mt-1">{tarea.descripcion}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        {tarea.asignado_nombre && (
                          <span className="flex items-center gap-1">
                            <User size={14} /> {tarea.asignado_nombre}
                          </span>
                        )}
                        {tarea.fecha_inicio && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {tarea.fecha_inicio}
                          </span>
                        )}
                        {tarea.fecha_vencimiento && (
                          <span className={`flex items-center gap-1 ${new Date(tarea.fecha_vencimiento) < new Date() && tarea.estado !== 'completada' ? 'text-red-500' : ''}`}>
                            <Clock size={14} /> Vence: {tarea.fecha_vencimiento}
                          </span>
                        )}
                        {tarea.cultivo && <span>Cultivo: {tarea.cultivo}</span>}
                      </div>
                      
                      {/* Subtareas preview */}
                      {tarea.subtareas?.length > 0 && (
                        <div className="mt-2">
                          <button 
                            className="text-sm text-gray-500 flex items-center gap-1"
                            onClick={() => setExpandedTarea(expandedTarea === tarea._id ? null : tarea._id)}
                          >
                            <CheckSquare size={14} />
                            {tarea.subtareas.filter(st => st.completada).length}/{tarea.subtareas.length} subtareas
                            {expandedTarea === tarea._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {expandedTarea === tarea._id && (
                            <div className="mt-2 space-y-1 pl-4">
                              {tarea.subtareas.map(st => (
                                <div 
                                  key={st.id} 
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                  onClick={() => handleToggleSubtarea(tarea._id, st.id, st.completada)}
                                >
                                  {st.completada ? 
                                    <CheckSquare size={14} className="text-green-500" /> : 
                                    <Square size={14} className="text-gray-400" />
                                  }
                                  <span className={st.completada ? 'line-through text-gray-400' : ''}>{st.descripcion}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {tarea.estado !== 'completada' && canEdit && (
                        <select 
                          className="form-select text-sm py-1"
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
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(tarea)}>
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn btn-sm btn-error" onClick={() => handleDelete(tarea._id)}>
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
