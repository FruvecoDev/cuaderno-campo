import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Filter, Settings, X, FileText } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos
const DEFAULT_FIELDS_CONFIG = {
  nombre: true,
  cultivo_objetivo: true,
  plazo_seguridad: true,
  instrucciones: true
};

const FIELD_LABELS = {
  nombre: 'Nombre',
  cultivo_objetivo: 'Cultivo Objetivo',
  plazo_seguridad: 'Plazo Seguridad',
  instrucciones: 'Instrucciones'
};

const Recetas = () => {
  const [recetas, setRecetas] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Filtros
  const [filters, setFilters] = useState({
    cultivo_objetivo: '',
    nombre: ''
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('recetas_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones de filtros
  const [filterOptions, setFilterOptions] = useState({
    cultivos: []
  });
  
  const [formData, setFormData] = useState({
    nombre: '',
    cultivo_objetivo: '',
    plazo_seguridad: '',
    instrucciones: ''
  });
  
  useEffect(() => {
    fetchRecetas();
    fetchCultivos();
  }, []);
  
  useEffect(() => {
    const cultivosUnicos = [...new Set(recetas.map(r => r.cultivo_objetivo).filter(Boolean))];
    setFilterOptions({ cultivos: cultivosUnicos });
  }, [recetas]);
  
  useEffect(() => {
    localStorage.setItem('recetas_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  const fetchCultivos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/cultivos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCultivos(data.cultivos || []);
      }
    } catch (error) {
      console.error('Error fetching cultivos:', error);
    }
  };
  
  const fetchRecetas = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/recetas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setRecetas(data.recetas || []);
    } catch (error) {
      console.error('Error fetching recetas:', error);
      const errorMsg = handlePermissionError(error, 'ver las recetas');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar recetas
  const filteredRecetas = recetas.filter(r => {
    if (filters.cultivo_objetivo && r.cultivo_objetivo !== filters.cultivo_objetivo) return false;
    if (filters.nombre && !r.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ cultivo_objetivo: '', nombre: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/recetas/${editingId}`
        : `${BACKEND_URL}/api/recetas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        plazo_seguridad: parseInt(formData.plazo_seguridad)
      };
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchRecetas();
        setFormData({ nombre: '', cultivo_objetivo: '', plazo_seguridad: '', instrucciones: '' });
      }
    } catch (error) {
      console.error('Error saving receta:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la receta' : 'crear la receta');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (receta) => {
    setEditingId(receta._id);
    setFormData({
      nombre: receta.nombre || '',
      cultivo_objetivo: receta.cultivo_objetivo || '',
      plazo_seguridad: receta.plazo_seguridad || '',
      instrucciones: receta.instrucciones || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ nombre: '', cultivo_objetivo: '', plazo_seguridad: '', instrucciones: '' });
  };
  
  const handleDelete = async (recetaId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar recetas');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/recetas/${recetaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchRecetas();
    } catch (error) {
      console.error('Error deleting receta:', error);
      const errorMsg = handlePermissionError(error, 'eliminar la receta');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="recetas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={28} /> Recetas
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title="Configurar campos visibles"
            data-testid="btn-config-fields"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            data-testid="btn-nueva-receta"
          >
            <Plus size={18} /> Nueva Receta
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Campos Visibles</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={fieldsConfig[key]} onChange={() => toggleFieldConfig(key)} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Filtros */}
      <div className="card mb-6" data-testid="filters-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros de Búsqueda
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Limpiar filtros</button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar por nombre</label>
            <input 
              type="text" 
              className="form-input" 
              value={filters.nombre} 
              onChange={(e) => setFilters({...filters, nombre: e.target.value})} 
              placeholder="Escriba para buscar..."
              data-testid="filter-nombre" 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cultivo Objetivo</label>
            <select className="form-select" value={filters.cultivo_objetivo} onChange={(e) => setFilters({...filters, cultivo_objetivo: e.target.value})} data-testid="filter-cultivo">
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredRecetas.length} de {recetas.length} recetas
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="receta-form">
          <h2 className="card-title">{editingId ? 'Editar Receta' : 'Nueva Receta'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              {fieldsConfig.nombre && (
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required data-testid="input-nombre" />
                </div>
              )}
              {fieldsConfig.cultivo_objetivo && (
                <div className="form-group">
                  <label className="form-label">Cultivo Objetivo *</label>
                  <select className="form-select" value={formData.cultivo_objetivo} onChange={(e) => setFormData({...formData, cultivo_objetivo: e.target.value})} required data-testid="select-cultivo">
                    <option value="">Seleccionar cultivo...</option>
                    {cultivos.map(c => <option key={c._id} value={c.nombre}>{c.nombre}</option>)}
                    {/* Si el cultivo actual no está en la lista, añadirlo */}
                    {formData.cultivo_objetivo && !cultivos.find(c => c.nombre === formData.cultivo_objetivo) && (
                      <option value={formData.cultivo_objetivo}>{formData.cultivo_objetivo}</option>
                    )}
                  </select>
                </div>
              )}
              {fieldsConfig.plazo_seguridad && (
                <div className="form-group">
                  <label className="form-label">Plazo de Seguridad (días) *</label>
                  <input type="number" min="0" className="form-input" value={formData.plazo_seguridad} onChange={(e) => setFormData({...formData, plazo_seguridad: e.target.value})} required data-testid="input-plazo" />
                </div>
              )}
            </div>
            {fieldsConfig.instrucciones && (
              <div className="form-group">
                <label className="form-label">Instrucciones de Aplicación</label>
                <textarea className="form-textarea" rows="4" value={formData.instrucciones} onChange={(e) => setFormData({...formData, instrucciones: e.target.value})} placeholder="Dosis, método de aplicación, precauciones..." data-testid="textarea-instrucciones" />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">{editingId ? 'Actualizar' : 'Guardar'}</button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Lista de Recetas ({filteredRecetas.length})</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : filteredRecetas.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay recetas que coincidan con los filtros' : 'No hay recetas registradas'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="recetas-table">
              <thead>
                <tr>
                  {fieldsConfig.nombre ? <th>Nombre</th> : null}
                  {fieldsConfig.cultivo_objetivo ? <th>Cultivo Objetivo</th> : null}
                  {fieldsConfig.plazo_seguridad ? <th>P.S. (días)</th> : null}
                  {fieldsConfig.instrucciones ? <th>Instrucciones</th> : null}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredRecetas.map((receta) => (
                  <tr key={receta._id}>
                    {fieldsConfig.nombre && <td className="font-semibold">{receta.nombre}</td>}
                    {(fieldsConfig.cultivo_objetivo) ? <td><span className="badge badge-default">{receta.cultivo_objetivo}</span></td>}
                    {(fieldsConfig.plazo_seguridad) ? <td>{receta.plazo_seguridad}</td> : null}
                    {fieldsConfig.instrucciones && <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receta.instrucciones || '—'}</td>}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(receta)} title="Editar" data-testid={`edit-receta-${receta._id}`}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-error" onClick={() => handleDelete(receta._id)} title="Eliminar" data-testid={`delete-receta-${receta._id}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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

export default Recetas;
