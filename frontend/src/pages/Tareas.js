import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, CheckCircle, Circle, Search, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Tareas = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [tareas, setTareas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    nombre: '',
    estado: '',
    parcela: ''
  });
  
  const [formData, setFormData] = useState({
    nombre: '',
    superficie_tratar: '',
    parcelas_ids: [],
    fecha_inicio: '',
    fecha_fin: '',
    coste_total: '',
    observaciones: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchTareas();
    fetchParcelas();
  }, []);

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

  // Filtrar tareas
  const filteredTareas = useMemo(() => {
    return tareas.filter(t => {
      if (filters.nombre && !t.nombre?.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
      if (filters.estado === 'realizada' && !t.realizada) return false;
      if (filters.estado === 'pendiente' && t.realizada) return false;
      return true;
    });
  }, [tareas, filters]);

  // Totales
  const totals = useMemo(() => ({
    total: filteredTareas.length,
    realizadas: filteredTareas.filter(t => t.realizada).length,
    pendientes: filteredTareas.filter(t => !t.realizada).length,
    costeTotal: filteredTareas.reduce((sum, t) => sum + (t.coste_total || 0), 0),
    superficieTotal: filteredTareas.reduce((sum, t) => sum + (t.superficie_tratar || 0), 0)
  }), [filteredTareas]);

  const resetForm = () => {
    setFormData({
      nombre: '',
      superficie_tratar: '',
      parcelas_ids: [],
      fecha_inicio: '',
      fecha_fin: '',
      coste_total: '',
      observaciones: ''
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/tareas/${editingId}`
        : `${BACKEND_URL}/api/tareas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          superficie_tratar: parseFloat(formData.superficie_tratar) || 0,
          coste_total: parseFloat(formData.coste_total) || 0
        })
      });
      
      setShowForm(false);
      resetForm();
      fetchTareas();
    } catch (err) {
      console.error('Error saving tarea:', err);
    }
  };

  const handleEdit = (tarea) => {
    setFormData({
      nombre: tarea.nombre || '',
      superficie_tratar: tarea.superficie_tratar || '',
      parcelas_ids: tarea.parcelas_ids || [],
      fecha_inicio: tarea.fecha_inicio || '',
      fecha_fin: tarea.fecha_fin || '',
      coste_total: tarea.coste_total || '',
      observaciones: tarea.observaciones || ''
    });
    setEditingId(tarea._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/tareas/${id}`, {
        method: 'DELETE',
        headers
      });
      fetchTareas();
    } catch (err) {
      console.error('Error deleting tarea:', err);
    }
  };

  const toggleRealizada = async (tarea) => {
    try {
      await fetch(`${BACKEND_URL}/api/tareas/${tarea._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ realizada: !tarea.realizada })
      });
      fetchTareas();
    } catch (err) {
      console.error('Error updating tarea:', err);
    }
  };

  const clearFilters = () => {
    setFilters({ nombre: '', estado: '', parcela: '' });
  };

  const hasActiveFilters = filters.nombre || filters.estado || filters.parcela;

  const getEstadoBadge = (realizada) => {
    if (realizada) {
      return (
        <span style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: '500',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <CheckCircle size={12} /> Realizada
        </span>
      );
    }
    return (
      <span style={{
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <Circle size={12} /> Pendiente
      </span>
    );
  };

  return (
    <div data-testid="tareas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tareas</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          data-testid="btn-nueva-tarea"
        >
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Nueva Tarea
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="form-tarea">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600', margin: 0 }}>
              {editingId ? 'Editar Tarea' : 'Nueva Tarea'}
            </h3>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => { setShowForm(false); resetForm(); }}
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre de la Tarea *</label>
              <input 
                className="form-input" 
                value={formData.nombre} 
                onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                required 
                placeholder="Ej: Poda de invierno, Abonado, etc."
                data-testid="input-nombre"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Superficie (ha)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  value={formData.superficie_tratar} 
                  onChange={(e) => setFormData({...formData, superficie_tratar: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Coste Total (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  value={formData.coste_total} 
                  onChange={(e) => setFormData({...formData, coste_total: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Inicio</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.fecha_inicio} 
                  onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Fin</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.fecha_fin} 
                  onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})} 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Parcelas</label>
              <select
                className="form-select"
                multiple
                value={formData.parcelas_ids}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, opt => opt.value);
                  setFormData({...formData, parcelas_ids: values});
                }}
                style={{ minHeight: '80px' }}
              >
                {parcelas.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.codigo_plantacion} - {p.proveedor}
                  </option>
                ))}
              </select>
              <small style={{ color: '#6c757d' }}>Ctrl+Click para seleccionar múltiples</small>
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                className="form-textarea" 
                value={formData.observaciones} 
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4" data-testid="filtros-tareas">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', margin: 0 }}>Filtros</h3>
          {hasActiveFilters && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={clearFilters}
            >
              <X size={14} style={{ marginRight: '0.25rem' }} />
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '35px' }}
                placeholder="Nombre de tarea..."
                value={filters.nombre}
                onChange={(e) => setFilters({...filters, nombre: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filters.estado}
              onChange={(e) => setFilters({...filters, estado: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="realizada">Realizadas</option>
              <option value="pendiente">Pendientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '1rem', 
        marginBottom: '1rem' 
      }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Total Tareas</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
            {totals.total}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Realizadas</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#155724' }}>
            {totals.realizadas}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Pendientes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#856404' }}>
            {totals.pendientes}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Superficie</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
            {totals.superficieTotal.toLocaleString()} ha
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>Coste Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc3545' }}>
            {totals.costeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          Lista de Tareas ({filteredTareas.length})
        </h3>
        
        {loading ? (
          <p>Cargando...</p>
        ) : filteredTareas.length === 0 ? (
          <p className="text-muted">No hay tareas registradas</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Tarea</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Fechas</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Superficie</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Coste</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTareas.map((tarea, idx) => (
                  <tr 
                    key={tarea._id}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa'
                    }}
                    data-testid={`tarea-row-${tarea._id}`}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600' }}>{tarea.nombre}</div>
                      {tarea.observaciones && (
                        <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '4px' }}>
                          {tarea.observaciones.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {tarea.fecha_inicio && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.85rem' }}>
                          <Calendar size={12} />
                          {tarea.fecha_inicio}
                          {tarea.fecha_fin && ` - ${tarea.fecha_fin}`}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {tarea.superficie_tratar?.toLocaleString()} ha
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                      {tarea.coste_total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => toggleRealizada(tarea)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Click para cambiar estado"
                      >
                        {getEstadoBadge(tarea.realizada)}
                      </button>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '6px 10px' }}
                          onClick={() => handleEdit(tarea)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '6px 10px' }}
                          onClick={() => handleDelete(tarea._id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tareas;
