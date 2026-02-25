import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, Filter, X, 
  AlertTriangle, CheckCircle, Clock, Calendar,
  FileText, Beaker, ArrowRight, Loader2, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORIDAD_COLORS = {
  'Alta': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  'Media': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'Baja': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
};

const ESTADO_COLORS = {
  'Pendiente': { bg: '#fef3c7', text: '#92400e', icon: Clock },
  'Programada': { bg: '#dbeafe', text: '#1e40af', icon: Calendar },
  'Aplicada': { bg: '#dcfce7', text: '#166534', icon: CheckCircle },
  'Cancelada': { bg: '#f3f4f6', text: '#6b7280', icon: X }
};

const Recomendaciones = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  
  // Data states
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [fitosanitarios, setFitosanitarios] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [subtipos, setSubtipos] = useState([]);
  const [stats, setStats] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generatingTratamiento, setGeneratingTratamiento] = useState(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    parcela_id: '',
    tipo: '',
    prioridad: '',
    estado: '',
    campana: ''
  });
  
  // Form state
  const [formData, setFormData] = useState({
    parcela_id: '',
    contrato_id: '',
    campana: new Date().getFullYear().toString(),
    tipo: 'Tratamiento Fitosanitario',
    subtipo: '',
    producto_id: '',
    producto_nombre: '',
    dosis: '',
    unidad_dosis: 'L/ha',
    fecha_programada: '',
    prioridad: 'Media',
    observaciones: '',
    motivo: ''
  });
  
  // Fetch data on mount
  useEffect(() => {
    fetchAll();
  }, []);
  
  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchRecomendaciones(),
      fetchParcelas(),
      fetchContratos(),
      fetchFitosanitarios(),
      fetchTipos(),
      fetchStats()
    ]);
    setLoading(false);
  };
  
  const fetchRecomendaciones = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`${API_URL}/api/recomendaciones?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecomendaciones(data.recomendaciones || []);
    } catch (err) {
      console.error('Error fetching recomendaciones:', err);
    }
  };
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setParcelas(data.parcelas || []);
    } catch (err) {
      console.error('Error fetching parcelas:', err);
    }
  };
  
  const fetchContratos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contratos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setContratos(data.contratos || []);
    } catch (err) {
      console.error('Error fetching contratos:', err);
    }
  };
  
  const fetchFitosanitarios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/fitosanitarios?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setFitosanitarios(data.productos || []);
    } catch (err) {
      console.error('Error fetching fitosanitarios:', err);
    }
  };
  
  const fetchTipos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/config/tipos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTipos(data.tipos || []);
      setSubtipos(data.subtipos_tratamiento || []);
    } catch (err) {
      console.error('Error fetching tipos:', err);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/stats/resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.parcela_id) {
      setError('Debe seleccionar una parcela');
      return;
    }
    
    try {
      const url = editingId 
        ? `${API_URL}/api/recomendaciones/${editingId}`
        : `${API_URL}/api/recomendaciones`;
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error al guardar');
      }
      
      setSuccess(editingId ? 'Recomendación actualizada' : 'Recomendación creada');
      setTimeout(() => setSuccess(null), 3000);
      
      resetForm();
      fetchRecomendaciones();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleEdit = (rec) => {
    setFormData({
      parcela_id: rec.parcela_id || '',
      contrato_id: rec.contrato_id || '',
      campana: rec.campana || '',
      tipo: rec.tipo || 'Tratamiento Fitosanitario',
      subtipo: rec.subtipo || '',
      producto_id: rec.producto_id || '',
      producto_nombre: rec.producto_nombre || '',
      dosis: rec.dosis || '',
      unidad_dosis: rec.unidad_dosis || 'L/ha',
      fecha_programada: rec.fecha_programada || '',
      prioridad: rec.prioridad || 'Media',
      observaciones: rec.observaciones || '',
      motivo: rec.motivo || ''
    });
    setEditingId(rec._id);
    setShowForm(true);
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta recomendación?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al eliminar');
      }
      
      setSuccess('Recomendación eliminada');
      setTimeout(() => setSuccess(null), 3000);
      fetchRecomendaciones();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleGenerarTratamiento = async (rec) => {
    if (!window.confirm(`¿Generar tratamiento a partir de esta recomendación?\n\nProducto: ${rec.producto_nombre}\nParcela: ${rec.parcela_codigo}`)) {
      return;
    }
    
    setGeneratingTratamiento(rec._id);
    
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/${rec._id}/generar-tratamiento`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error al generar tratamiento');
      }
      
      setSuccess('Tratamiento generado correctamente');
      setTimeout(() => setSuccess(null), 3000);
      fetchRecomendaciones();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingTratamiento(null);
    }
  };
  
  const resetForm = () => {
    setFormData({
      parcela_id: '',
      contrato_id: '',
      campana: new Date().getFullYear().toString(),
      tipo: 'Tratamiento Fitosanitario',
      subtipo: '',
      producto_id: '',
      producto_nombre: '',
      dosis: '',
      unidad_dosis: 'L/ha',
      fecha_programada: '',
      prioridad: 'Media',
      observaciones: '',
      motivo: ''
    });
    setEditingId(null);
    setShowForm(false);
  };
  
  const handleParcelaChange = (parcelaId) => {
    setFormData(prev => ({ ...prev, parcela_id: parcelaId }));
    
    // Auto-fill contrato if parcela has one
    const parcela = parcelas.find(p => p._id === parcelaId);
    if (parcela?.contrato_id) {
      setFormData(prev => ({ ...prev, contrato_id: parcela.contrato_id }));
    }
  };
  
  const handleProductoChange = (productoId) => {
    const producto = fitosanitarios.find(p => p._id === productoId);
    setFormData(prev => ({
      ...prev,
      producto_id: productoId,
      producto_nombre: producto?.nombre_comercial || ''
    }));
  };
  
  const canManage = user?.role && ['Admin', 'Manager', 'Technician'].includes(user.role);
  
  // Filter recomendaciones
  const filteredRecomendaciones = recomendaciones;
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="page-container" data-testid="recomendaciones-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} />
            Recomendaciones
          </h1>
          <p className="text-muted">Gestiona las recomendaciones técnicas para parcelas y cultivos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </button>
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}
              data-testid="btn-nueva-recomendacion"
            >
              <Plus size={18} /> Nueva Recomendación
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto' }}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4">
          <CheckCircle size={18} /> {success}
        </div>
      )}
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{stats.total}</div>
            <div className="text-muted text-sm">Total</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{stats.pendientes}</div>
            <div className="text-muted text-sm">Pendientes</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{stats.programadas}</div>
            <div className="text-muted text-sm">Programadas</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #22c55e' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>{stats.aplicadas}</div>
            <div className="text-muted text-sm">Aplicadas</div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Filtros</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label">Parcela</label>
              <select
                className="form-select"
                value={filters.parcela_id}
                onChange={(e) => setFilters(prev => ({ ...prev, parcela_id: e.target.value }))}
              >
                <option value="">Todas</option>
                {parcelas.map(p => (
                  <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={filters.tipo}
                onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="">Todos</option>
                {tipos.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Prioridad</label>
              <select
                className="form-select"
                value={filters.prioridad}
                onChange={(e) => setFilters(prev => ({ ...prev, prioridad: e.target.value }))}
              >
                <option value="">Todas</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filters.estado}
                onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Programada">Programada</option>
                <option value="Aplicada">Aplicada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={fetchRecomendaciones}>
              <Search size={16} /> Filtrar
            </button>
            <button className="btn btn-secondary" onClick={() => { setFilters({ parcela_id: '', tipo: '', prioridad: '', estado: '', campana: '' }); fetchRecomendaciones(); }}>
              Limpiar
            </button>
          </div>
        </div>
      )}
      
      {/* Form */}
      {showForm && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>
              {editingId ? 'Editar Recomendación' : 'Nueva Recomendación'}
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {/* Parcela */}
              <div>
                <label className="form-label">Parcela *</label>
                <select
                  className="form-select"
                  value={formData.parcela_id}
                  onChange={(e) => handleParcelaChange(e.target.value)}
                  required
                >
                  <option value="">Seleccionar parcela</option>
                  {parcelas.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.codigo_plantacion} - {p.cultivo} ({p.proveedor})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Campaña */}
              <div>
                <label className="form-label">Campaña</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.campana}
                  onChange={(e) => setFormData(prev => ({ ...prev, campana: e.target.value }))}
                  placeholder="2024"
                />
              </div>
              
              {/* Tipo */}
              <div>
                <label className="form-label">Tipo de Recomendación</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                >
                  {tipos.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              {/* Subtipo (solo para tratamientos) */}
              {formData.tipo === 'Tratamiento Fitosanitario' && (
                <div>
                  <label className="form-label">Subtipo</label>
                  <select
                    className="form-select"
                    value={formData.subtipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtipo: e.target.value }))}
                  >
                    <option value="">Seleccionar subtipo</option>
                    {subtipos.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Producto */}
              {(formData.tipo === 'Tratamiento Fitosanitario' || formData.tipo === 'Fertilización') && (
                <div>
                  <label className="form-label">Producto</label>
                  <select
                    className="form-select"
                    value={formData.producto_id}
                    onChange={(e) => handleProductoChange(e.target.value)}
                  >
                    <option value="">Seleccionar producto</option>
                    {fitosanitarios
                      .filter(f => !formData.subtipo || f.tipo === formData.subtipo)
                      .map(f => (
                        <option key={f._id} value={f._id}>
                          {f.nombre_comercial} ({f.materia_activa})
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
              {/* Dosis */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Dosis</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.dosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, dosis: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ width: '100px' }}>
                  <label className="form-label">Unidad</label>
                  <select
                    className="form-select"
                    value={formData.unidad_dosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, unidad_dosis: e.target.value }))}
                  >
                    <option value="L/ha">L/ha</option>
                    <option value="Kg/ha">Kg/ha</option>
                    <option value="g/ha">g/ha</option>
                    <option value="ml/ha">ml/ha</option>
                    <option value="cc/hl">cc/hl</option>
                  </select>
                </div>
              </div>
              
              {/* Fecha programada */}
              <div>
                <label className="form-label">Fecha Programada</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_programada: e.target.value }))}
                />
              </div>
              
              {/* Prioridad */}
              <div>
                <label className="form-label">Prioridad</label>
                <select
                  className="form-select"
                  value={formData.prioridad}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value }))}
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              
              {/* Motivo */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Motivo / Justificación</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.motivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ej: Presencia de pulgón, deficiencia de nitrógeno..."
                />
              </div>
              
              {/* Observaciones */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-textarea"
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Recomendación
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* List */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          Recomendaciones ({filteredRecomendaciones.length})
        </h3>
        
        {filteredRecomendaciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay recomendaciones registradas</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Parcela / Cultivo</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Dosis</th>
                  <th>Fecha Prog.</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecomendaciones.map((rec) => {
                  const prioridadStyle = PRIORIDAD_COLORS[rec.prioridad] || PRIORIDAD_COLORS['Media'];
                  const estadoConfig = ESTADO_COLORS[rec.estado] || ESTADO_COLORS['Pendiente'];
                  const EstadoIcon = estadoConfig.icon;
                  
                  return (
                    <tr key={rec._id}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{rec.parcela_codigo}</div>
                        <div className="text-sm text-muted">{rec.parcela_cultivo}</div>
                      </td>
                      <td>
                        <div>{rec.tipo}</div>
                        {rec.subtipo && <div className="text-sm text-muted">{rec.subtipo}</div>}
                      </td>
                      <td>
                        {rec.producto_nombre || '-'}
                      </td>
                      <td>
                        {rec.dosis ? `${rec.dosis} ${rec.unidad_dosis}` : '-'}
                      </td>
                      <td>
                        {rec.fecha_programada ? new Date(rec.fecha_programada).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: prioridadStyle.bg,
                          color: prioridadStyle.text,
                          border: `1px solid ${prioridadStyle.border}`
                        }}>
                          {rec.prioridad}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: estadoConfig.bg,
                          color: estadoConfig.text,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <EstadoIcon size={12} />
                          {rec.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {/* Generate Treatment Button */}
                          {!rec.tratamiento_generado && canManage && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerarTratamiento(rec)}
                              disabled={generatingTratamiento === rec._id}
                              title="Generar Tratamiento"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              {generatingTratamiento === rec._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Beaker size={14} />
                                  <ArrowRight size={12} />
                                </>
                              )}
                            </button>
                          )}
                          
                          {rec.tratamiento_generado && (
                            <span style={{ 
                              padding: '0.25rem 0.5rem', 
                              backgroundColor: '#dcfce7', 
                              borderRadius: '0.25rem',
                              fontSize: '0.7rem',
                              color: '#166534'
                            }}>
                              <CheckCircle size={12} style={{ display: 'inline', marginRight: '2px' }} />
                              Tratamiento
                            </span>
                          )}
                          
                          {/* Edit Button */}
                          {canManage && !rec.tratamiento_generado && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(rec)}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          
                          {/* Delete Button */}
                          {canManage && (
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'hsl(var(--destructive))', color: 'white' }}
                              onClick={() => handleDelete(rec._id)}
                              title="Eliminar"
                            >
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Recomendaciones;
