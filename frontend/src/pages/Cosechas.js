import React, { useState, useEffect, useMemo } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Package, TrendingUp, TrendingDown, Check, ChevronDown, ChevronUp, X, Download, Target, Scale, DollarSign, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';


const Cosechas = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [cosechas, setCosechas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCargaForm, setShowCargaForm] = useState(null);
  const [expandedCosecha, setExpandedCosecha] = useState(null);
  
  // Stats y exportación
  const [stats, setStats] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    proveedor: '',
    campana: '',
    estado: '',
    contrato: '',
    cultivo: ''
  });
  
  // Form para nueva cosecha
  const [formData, setFormData] = useState({
    contrato_id: '',
    planificaciones: [{ fecha_planificada: '', kilos_estimados: '', observaciones: '' }]
  });
  
  // Form para nueva carga
  const [cargaForm, setCargaForm] = useState({
    id_carga: '',
    fecha: new Date().toISOString().split('T')[0],
    kilos_reales: '',
    es_descuento: false,
    tipo_descuento: '',
    valor_tenderometria: '',
    num_albaran: '',
    observaciones: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchCosechas();
    fetchContratos();
    fetchStats();
  }, []);

  const fetchCosechas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cosechas`, { headers });
      const data = await res.json();
      setCosechas(data.cosechas || []);
    } catch (err) {
      console.error('Error fetching cosechas:', err);
    }
    setLoading(false);
  };

  const fetchContratos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/contratos`, { headers });
      const data = await res.json();
      setContratos(data.contratos || []);
    } catch (err) {
      console.error('Error fetching contratos:', err);
    }
  };
  
  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cosechas/stats/dashboard`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };
  
  const exportToExcel = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.campana) params.append('campana', filters.campana);
      
      const res = await fetch(`${BACKEND_URL}/api/cosechas/export/excel?${params}`, { headers });
      
      if (res.ok) {
        const data = await res.json();
        
        // Crear CSV
        const csvHeaders = data.columns.map(c => c.header).join(',');
        const csvRows = data.data.map(row => 
          data.columns.map(c => {
            const val = row[c.key];
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val ?? '';
          }).join(',')
        ).join('\n');
        
        const csvContent = `${csvHeaders}\n${csvRows}`;
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExportLoading(false);
    }
  };

  // Filtrar cosechas
  const filteredCosechas = useMemo(() => {
    return cosechas.filter(c => {
      if (filters.proveedor && !c.proveedor?.toLowerCase().includes(filters.proveedor.toLowerCase())) return false;
      if (filters.campana && c.campana !== filters.campana) return false;
      if (filters.estado && c.estado !== filters.estado) return false;
      if (filters.contrato && c.contrato_id !== filters.contrato) return false;
      if (filters.cultivo && c.cultivo !== filters.cultivo) return false;
      return true;
    });
  }, [cosechas, filters]);

  // Opciones únicas para filtros
  const filterOptions = useMemo(() => ({
    campanas: [...new Set(cosechas.map(c => c.campana).filter(Boolean))].sort(),
    proveedores: [...new Set(cosechas.map(c => c.proveedor).filter(Boolean))].sort(),
    cultivos: [...new Set(cosechas.map(c => c.cultivo).filter(Boolean))].sort()
  }), [cosechas]);

  // Generar ID de carga automático
  const generateCargaId = () => {
    const prefix = 'CRG';
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${date}-${random}`;
  };

  // Crear nueva cosecha
  const handleCreateCosecha = async (e) => {
    e.preventDefault();
    
    const planificaciones = formData.planificaciones
      .filter(p => p.fecha_planificada && p.kilos_estimados)
      .map(p => ({
        ...p,
        kilos_estimados: parseFloat(p.kilos_estimados)
      }));
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/cosechas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contrato_id: formData.contrato_id,
          planificaciones
        })
      });
      
      if (res.ok) {
        setShowForm(false);
        setFormData({
          contrato_id: '',
          planificaciones: [{ fecha_planificada: '', kilos_estimados: '', observaciones: '' }]
        });
        fetchCosechas();
      }
    } catch (err) {
      console.error('Error creating cosecha:', err);
    }
  };

  // Añadir carga
  const handleAddCarga = async (cosechaId) => {
    try {
      const payload = {
        ...cargaForm,
        kilos_reales: parseFloat(cargaForm.kilos_reales)
      };
      // Incluir valor_tenderometria solo si tiene valor
      if (cargaForm.valor_tenderometria) {
        payload.valor_tenderometria = parseFloat(cargaForm.valor_tenderometria);
      }
      
      const res = await fetch(`${BACKEND_URL}/api/cosechas/${cosechaId}/cargas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowCargaForm(null);
        setCargaForm({
          id_carga: '',
          fecha: new Date().toISOString().split('T')[0],
          kilos_reales: '',
          es_descuento: false,
          tipo_descuento: '',
          valor_tenderometria: '',
          num_albaran: '',
          observaciones: ''
        });
        fetchCosechas();
      }
    } catch (err) {
      console.error('Error adding carga:', err);
    }
  };

  // Eliminar carga
  const handleDeleteCarga = async (cosechaId, idCarga) => {
    if (!window.confirm('¿Eliminar esta carga?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/cosechas/${cosechaId}/cargas/${idCarga}`, {
        method: 'DELETE',
        headers
      });
      fetchCosechas();
    } catch (err) {
      console.error('Error deleting carga:', err);
    }
  };

  // Completar cosecha
  const handleCompletarCosecha = async (cosechaId) => {
    if (!window.confirm('¿Marcar cosecha como completada?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/cosechas/${cosechaId}/completar`, {
        method: 'PUT',
        headers
      });
      fetchCosechas();
    } catch (err) {
      console.error('Error completing cosecha:', err);
    }
  };

  // Eliminar cosecha
  const handleDeleteCosecha = async (cosechaId) => {
    if (!window.confirm('¿Eliminar esta cosecha y todas sus cargas?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/cosechas/${cosechaId}`, {
        method: 'DELETE',
        headers
      });
      fetchCosechas();
    } catch (err) {
      console.error('Error deleting cosecha:', err);
    }
  };

  // Añadir/quitar planificación
  const addPlanificacion = () => {
    setFormData({
      ...formData,
      planificaciones: [...formData.planificaciones, { fecha_planificada: '', kilos_estimados: '', observaciones: '' }]
    });
  };

  const removePlanificacion = (index) => {
    setFormData({
      ...formData,
      planificaciones: formData.planificaciones.filter((_, i) => i !== index)
    });
  };

  const updatePlanificacion = (index, field, value) => {
    const updated = [...formData.planificaciones];
    updated[index][field] = value;
    setFormData({ ...formData, planificaciones: updated });
  };

  // Estado badge
  const getEstadoBadge = (estado) => {
    const styles = {
      planificada: { bg: '#e3f2fd', color: '#1976d2' },
      en_curso: { bg: '#fff3e0', color: '#f57c00' },
      completada: { bg: '#e8f5e9', color: '#388e3c' }
    };
    const s = styles[estado] || styles.planificada;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: s.bg,
        color: s.color
      }}>
        {estado?.charAt(0).toUpperCase() + estado?.slice(1) || 'Planificada'}
      </span>
    );
  };

  // Obtener contrato seleccionado
  const selectedContrato = contratos.find(c => c._id === formData.contrato_id);

  return (
    <div data-testid="cosechas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Cosechas</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={exportToExcel}
            disabled={exportLoading || cosechas.length === 0}
            title="Exportar a Excel"
            data-testid="btn-export-excel"
          >
            {exportLoading ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={18} />
            )}
            Exportar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
            data-testid="btn-nueva-cosecha"
          >
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Nueva Cosecha
          </button>
        </div>
      </div>
      
      {/* KPIs Dashboard */}
      {stats && (
        <div className="stats-grid-horizontal" style={{ marginBottom: '1.5rem' }} data-testid="cosechas-kpis">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <Package size={20} style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.total}</p>
              <p className="stat-label">Total Cosechas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(38, 92%, 95%)' }}>
              <Clock size={20} style={{ color: 'hsl(38, 92%, 50%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.planificadas + stats.en_curso}</p>
              <p className="stat-label">En Proceso</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(142, 76%, 95%)' }}>
              <CheckCircle size={20} style={{ color: 'hsl(142, 76%, 36%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.completadas}</p>
              <p className="stat-label">Completadas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <Scale size={20} style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value" style={{ fontSize: '1.1rem' }}>
                {(stats.kilos_reales / 1000).toFixed(1)}t
              </p>
              <p className="stat-label">Kg Reales</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: stats.rendimiento_porcentaje >= 100 ? 'hsl(142, 76%, 95%)' : 'hsl(0, 84%, 95%)' }}>
              <Target size={20} style={{ color: stats.rendimiento_porcentaje >= 100 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.rendimiento_porcentaje}%</p>
              <p className="stat-label">Rendimiento</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(142, 76%, 95%)' }}>
              <DollarSign size={20} style={{ color: 'hsl(142, 76%, 36%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value" style={{ fontSize: '1rem' }}>
                {stats.importe_total?.toLocaleString('es-ES')}€
              </p>
              <p className="stat-label">Importe Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario Nueva Cosecha */}
      {showForm && (
        <div className="card mb-6" data-testid="form-nueva-cosecha">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Nueva Cosecha</h3>
          <form onSubmit={handleCreateCosecha}>
            {/* Selección de Contrato */}
            <div className="form-group">
              <label className="form-label">Contrato *</label>
              <select
                className="form-select"
                value={formData.contrato_id}
                onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })}
                required
                data-testid="select-contrato"
              >
                <option value="">Seleccionar contrato...</option>
                {contratos.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.proveedor} - {c.cultivo} ({c.campana}) - {c.precio}€/kg
                  </option>
                ))}
              </select>
            </div>

            {/* Info del contrato seleccionado */}
            {selectedContrato && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div>
                    <small style={{ color: '#6c757d' }}>Proveedor</small>
                    <div style={{ fontWeight: '600' }}>{selectedContrato.proveedor}</div>
                  </div>
                  <div>
                    <small style={{ color: '#6c757d' }}>Cultivo</small>
                    <div style={{ fontWeight: '600' }}>{selectedContrato.cultivo} {selectedContrato.variedad && `(${selectedContrato.variedad})`}</div>
                  </div>
                  <div>
                    <small style={{ color: '#6c757d' }}>Campaña</small>
                    <div style={{ fontWeight: '600' }}>{selectedContrato.campana}</div>
                  </div>
                  <div>
                    <small style={{ color: '#6c757d' }}>Precio</small>
                    <div style={{ fontWeight: '600', color: '#2d5a27' }}>{selectedContrato.precio} €/kg</div>
                  </div>
                </div>
              </div>
            )}

            {/* Planificaciones */}
            <div style={{ marginBottom: '1rem' }}>
              <div className="flex justify-between items-center mb-2">
                <label className="form-label" style={{ margin: 0 }}>Planificación de Recolección</label>
                <button 
                  type="button" 
                  className="btn btn-sm btn-secondary"
                  onClick={addPlanificacion}
                >
                  <Plus size={14} /> Añadir fecha
                </button>
              </div>
              
              {formData.planificaciones.map((plan, idx) => (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 2fr auto',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  alignItems: 'end'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="date"
                      className="form-input"
                      value={plan.fecha_planificada}
                      onChange={(e) => updatePlanificacion(idx, 'fecha_planificada', e.target.value)}
                      placeholder="Fecha"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="number"
                      className="form-input"
                      value={plan.kilos_estimados}
                      onChange={(e) => updatePlanificacion(idx, 'kilos_estimados', e.target.value)}
                      placeholder="Kilos estimados"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={plan.observaciones}
                      onChange={(e) => updatePlanificacion(idx, 'observaciones', e.target.value)}
                      placeholder="Observaciones"
                    />
                  </div>
                  {formData.planificaciones.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                      onClick={() => removePlanificacion(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Crear Cosecha</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4" data-testid="filtros-cosechas">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contrato</label>
            <select
              className="form-select"
              value={filters.contrato}
              onChange={(e) => setFilters({ ...filters, contrato: e.target.value })}
              data-testid="filter-contrato"
            >
              <option value="">Todos</option>
              {contratos.map(c => (
                <option key={c._id} value={c._id}>
                  {c.proveedor} - {c.cultivo} ({c.campana})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cultivo</label>
            <select
              className="form-select"
              value={filters.cultivo}
              onChange={(e) => setFilters({ ...filters, cultivo: e.target.value })}
              data-testid="filter-cultivo"
            >
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar proveedor..."
              value={filters.proveedor}
              onChange={(e) => setFilters({ ...filters, proveedor: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({ ...filters, campana: e.target.value })}
            >
              <option value="">Todas</option>
              {filterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filters.estado}
              onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="planificada">Planificada</option>
              <option value="en_curso">En Curso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Cosechas */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          Lista de Cosechas ({filteredCosechas.length})
        </h3>
        
        {loading ? (
          <p>Cargando...</p>
        ) : filteredCosechas.length === 0 ? (
          <p className="text-muted">No hay cosechas registradas</p>
        ) : (
          <div>
            {filteredCosechas.map(cosecha => (
              <div 
                key={cosecha._id} 
                className="card mb-4"
                style={{ border: '1px solid #e5e7eb' }}
                data-testid={`cosecha-${cosecha._id}`}
              >
                {/* Cabecera de la cosecha */}
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedCosecha(expandedCosecha === cosecha._id ? null : cosecha._id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Package size={24} style={{ color: '#2d5a27' }} />
                    <div>
                      <div style={{ fontWeight: '600' }}>
                        {cosecha.proveedor} - {cosecha.cultivo}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                        {cosecha.parcela} | {cosecha.campana}
                      </div>
                    </div>
                    {getEstadoBadge(cosecha.estado)}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Kilos Netos</div>
                      <div style={{ fontWeight: '700', fontSize: '1.25rem', color: '#2d5a27' }}>
                        {(cosecha.kilos_netos || 0).toLocaleString()} kg
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Importe Neto</div>
                      <div style={{ fontWeight: '700', fontSize: '1.25rem', color: '#1e8449' }}>
                        {(cosecha.importe_neto || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </div>
                    </div>
                    {expandedCosecha === cosecha._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Contenido expandido */}
                {expandedCosecha === cosecha._id && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    {/* Resumen */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: '#f8f9fa',
                      padding: '1rem',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Precio Contrato</div>
                        <div style={{ fontWeight: '600' }}>{cosecha.precio_contrato} €/kg</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Kilos Estimados</div>
                        <div style={{ fontWeight: '600' }}>{(cosecha.kilos_totales_estimados || 0).toLocaleString()} kg</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Kilos Recolectados</div>
                        <div style={{ fontWeight: '600', color: '#2d5a27' }}>
                          <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          {(cosecha.kilos_totales_reales || 0).toLocaleString()} kg
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Descuentos</div>
                        <div style={{ fontWeight: '600', color: '#dc2626' }}>
                          <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />
                          -{(cosecha.kilos_descuentos || 0).toLocaleString()} kg
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>Importe Descuentos</div>
                        <div style={{ fontWeight: '600', color: '#dc2626' }}>
                          -{(cosecha.importe_descuentos || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </div>
                      </div>
                    </div>

                    {/* Planificaciones */}
                    {cosecha.planificaciones?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1a5276' }}>
                          Planificación de Recolección
                        </h4>
                        <table style={{ width: '100%', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#e3f2fd' }}>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Fecha</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Kilos Estimados</th>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Observaciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cosecha.planificaciones.map((p, idx) => (
                              <tr key={idx}>
                                <td style={{ padding: '8px' }}>{p.fecha_planificada}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{p.kilos_estimados?.toLocaleString()} kg</td>
                                <td style={{ padding: '8px' }}>{p.observaciones || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Cargas */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div className="flex justify-between items-center mb-2">
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#b9770e', margin: 0 }}>
                          Cargas Registradas ({cosecha.cargas?.length || 0})
                        </h4>
                        {cosecha.estado !== 'completada' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCargaForm({ ...cargaForm, id_carga: generateCargaId() });
                              setShowCargaForm(cosecha._id);
                            }}
                            data-testid={`btn-add-carga-${cosecha._id}`}
                          >
                            <Plus size={14} /> Nueva Carga
                          </button>
                        )}
                      </div>

                      {/* Formulario nueva carga */}
                      {showCargaForm === cosecha._id && (
                        <div style={{
                          backgroundColor: '#fff8e1',
                          padding: '1rem',
                          borderRadius: '8px',
                          marginBottom: '1rem',
                          border: '1px solid #ffe082'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>ID Carga</label>
                              <input
                                className="form-input"
                                value={cargaForm.id_carga}
                                onChange={(e) => setCargaForm({ ...cargaForm, id_carga: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Fecha</label>
                              <input
                                type="date"
                                className="form-input"
                                value={cargaForm.fecha}
                                onChange={(e) => setCargaForm({ ...cargaForm, fecha: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Kilos</label>
                              <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={cargaForm.kilos_reales}
                                onChange={(e) => setCargaForm({ ...cargaForm, kilos_reales: e.target.value })}
                                required
                              />
                            </div>
                            {/* Campo Tenderometría - Solo para Guisante */}
                            {(cosecha.cultivo || '').toLowerCase().includes('guisante') && !cargaForm.es_descuento && (
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: '#1a5276', fontWeight: '600' }}>
                                  Tenderometría
                                </label>
                                <input
                                  type="number"
                                  step="1"
                                  className="form-input"
                                  value={cargaForm.valor_tenderometria}
                                  onChange={(e) => setCargaForm({ ...cargaForm, valor_tenderometria: e.target.value })}
                                  placeholder="Ej: 105"
                                  style={{ borderColor: '#1a5276' }}
                                />
                              </div>
                            )}
                            {/* Nº Albarán - se mueve o se queda según hay tenderometría */}
                            {!((cosecha.cultivo || '').toLowerCase().includes('guisante') && !cargaForm.es_descuento) && (
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Nº Albarán</label>
                                <input
                                  className="form-input"
                                  value={cargaForm.num_albaran}
                                  onChange={(e) => setCargaForm({ ...cargaForm, num_albaran: e.target.value })}
                                />
                              </div>
                            )}
                          </div>
                          {/* Segunda fila para Albarán cuando hay tenderometría */}
                          {(cosecha.cultivo || '').toLowerCase().includes('guisante') && !cargaForm.es_descuento && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Nº Albarán</label>
                                <input
                                  className="form-input"
                                  value={cargaForm.num_albaran}
                                  onChange={(e) => setCargaForm({ ...cargaForm, num_albaran: e.target.value })}
                                />
                              </div>
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                                <input
                                  type="checkbox"
                                  checked={cargaForm.es_descuento}
                                  onChange={(e) => setCargaForm({ ...cargaForm, es_descuento: e.target.checked })}
                                  style={{ marginRight: '0.5rem' }}
                                />
                                Aplica Descuento
                              </label>
                            </div>
                            {cargaForm.es_descuento && (
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo</label>
                                <select
                                  className="form-select"
                                  value={cargaForm.tipo_descuento}
                                  onChange={(e) => setCargaForm({ ...cargaForm, tipo_descuento: e.target.value })}
                                >
                                  <option value="">Seleccionar...</option>
                                  <option value="destare">Destare</option>
                                  <option value="calidad">Calidad</option>
                                  <option value="otro">Otro</option>
                                </select>
                              </div>
                            )}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Observaciones</label>
                              <input
                                className="form-input"
                                value={cargaForm.observaciones}
                                onChange={(e) => setCargaForm({ ...cargaForm, observaciones: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleAddCarga(cosecha._id)}
                            >
                              Guardar Carga
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setShowCargaForm(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tabla de cargas */}
                      {cosecha.cargas?.length > 0 ? (
                        <table style={{ width: '100%', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#fff3e0' }}>
                              <th style={{ padding: '8px', textAlign: 'left' }}>ID Carga</th>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Fecha</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Kilos</th>
                              {(cosecha.cultivo || '').toLowerCase().includes('guisante') && (
                                <th style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e3f2fd', color: '#1a5276' }}>Tend.</th>
                              )}
                              <th style={{ padding: '8px', textAlign: 'right' }}>Precio</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Importe</th>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Albarán</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cosecha.cargas.map((carga, idx) => (
                              <tr 
                                key={idx}
                                style={{ 
                                  backgroundColor: carga.es_descuento ? '#fee2e2' : 'transparent'
                                }}
                              >
                                <td style={{ padding: '8px', fontWeight: '500' }}>{carga.id_carga}</td>
                                <td style={{ padding: '8px' }}>{carga.fecha}</td>
                                <td style={{ 
                                  padding: '8px', 
                                  textAlign: 'right',
                                  fontWeight: '600',
                                  color: carga.es_descuento ? '#dc2626' : '#2d5a27'
                                }}>
                                  {carga.es_descuento && <TrendingDown size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                                  {carga.kilos_reales?.toLocaleString()} kg
                                  {carga.tipo_descuento && (
                                    <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: '#6c757d' }}>
                                      ({carga.tipo_descuento})
                                    </span>
                                  )}
                                </td>
                                {(cosecha.cultivo || '').toLowerCase().includes('guisante') && (
                                  <td style={{ 
                                    padding: '8px', 
                                    textAlign: 'center',
                                    backgroundColor: '#e3f2fd',
                                    fontWeight: carga.valor_tenderometria ? '600' : 'normal',
                                    color: '#1a5276'
                                  }}>
                                    {carga.valor_tenderometria || '-'}
                                  </td>
                                )}
                                <td style={{ padding: '8px', textAlign: 'right' }}>{carga.precio} €/kg</td>
                                <td style={{ 
                                  padding: '8px', 
                                  textAlign: 'right',
                                  fontWeight: '600',
                                  color: carga.es_descuento ? '#dc2626' : '#1e8449'
                                }}>
                                  {carga.importe?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </td>
                                <td style={{ padding: '8px' }}>{carga.num_albaran || '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  {cosecha.estado !== 'completada' && (
                                    <button
                                      className="btn btn-sm"
                                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                                      onClick={() => handleDeleteCarga(cosecha._id, carga.id_carga)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          No hay cargas registradas
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                      {cosecha.estado !== 'completada' && cosecha.cargas?.length > 0 && (
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: '#d4edda', color: '#155724' }}
                          onClick={() => handleCompletarCosecha(cosecha._id)}
                        >
                          <Check size={14} style={{ marginRight: '0.25rem' }} />
                          Completar Cosecha
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                        onClick={() => handleDeleteCosecha(cosecha._id)}
                      >
                        <Trash2 size={14} style={{ marginRight: '0.25rem' }} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cosechas;
