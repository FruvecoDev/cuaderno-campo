import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Search, X, Package, Check, XCircle, DollarSign } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CATEGORIAS = [
  'Fertilizantes',
  'Fitosanitarios',
  'Semillas',
  'Materiales',
  'Maquinaria',
  'Servicios',
  'Combustibles',
  'Envases',
  'Otros'
];

const UNIDADES = [
  'Kg',
  'L',
  'Unidad',
  'Saco',
  'Caja',
  'Palet',
  'm²',
  'm³',
  'Hora',
  'Servicio'
];

const ArticulosExplotacion = () => {
  const { t } = useTranslation();
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'General',
    unidad_medida: 'Unidad',
    precio_unitario: '',
    iva: '21',
    stock_actual: '',
    stock_minimo: '',
    proveedor_habitual: '',
    observaciones: '',
    activo: true
  });

  useEffect(() => {
    fetchArticulos();
  }, []);

  const fetchArticulos = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/articulos?limit=500`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterCategoria) url += `&categoria=${encodeURIComponent(filterCategoria)}`;
      if (filterActivo !== '') url += `&activo=${filterActivo}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setArticulos(data.articulos || []);
      }
    } catch (err) {
      console.error('Error fetching articulos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticulos();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterCategoria, filterActivo]);

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'General',
      unidad_medida: 'Unidad',
      precio_unitario: '',
      iva: '21',
      stock_actual: '',
      stock_minimo: '',
      proveedor_habitual: '',
      observaciones: '',
      activo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/articulos/${editingId}`
        : `${BACKEND_URL}/api/articulos`;
      
      const payload = {
        ...formData,
        // No enviar código vacío, el backend lo genera automáticamente
        codigo: editingId ? formData.codigo : undefined,
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
        iva: parseFloat(formData.iva) || 21,
        stock_actual: formData.stock_actual ? parseFloat(formData.stock_actual) : null,
        stock_minimo: formData.stock_minimo ? parseFloat(formData.stock_minimo) : null
      };
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
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
      
      setShowForm(false);
      setEditingId(null);
      fetchArticulos();
      resetForm();
    } catch (err) {
      const errorMsg = handlePermissionError(err, editingId ? 'actualizar' : 'crear');
      setError(err.message || errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (articulo) => {
    setEditingId(articulo._id);
    setFormData({
      codigo: articulo.codigo || '',
      nombre: articulo.nombre || '',
      descripcion: articulo.descripcion || '',
      categoria: articulo.categoria || 'General',
      unidad_medida: articulo.unidad_medida || 'Unidad',
      precio_unitario: articulo.precio_unitario?.toString() || '',
      iva: articulo.iva?.toString() || '21',
      stock_actual: articulo.stock_actual?.toString() || '',
      stock_minimo: articulo.stock_minimo?.toString() || '',
      proveedor_habitual: articulo.proveedor_habitual || '',
      observaciones: articulo.observaciones || '',
      activo: articulo.activo !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este artículo?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/articulos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchArticulos();
    } catch (err) {
      const errorMsg = handlePermissionError(err, 'eliminar');
      setError(err.message || errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/articulos/${id}/toggle-activo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchArticulos();
      }
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      'Fertilizantes': '#16a34a',
      'Fitosanitarios': '#dc2626',
      'Semillas': '#f59e0b',
      'Materiales': '#6366f1',
      'Maquinaria': '#64748b',
      'Servicios': '#0891b2',
      'Combustibles': '#ea580c',
      'Envases': '#8b5cf6',
      'Otros': '#71717a'
    };
    return colors[categoria] || '#71717a';
  };

  const hasActiveFilters = searchTerm || filterCategoria || filterActivo !== '';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <Package size={28} style={{ display: 'inline', marginRight: '0.75rem', color: 'hsl(var(--primary))' }} />
          Artículos de Explotación
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filtros {hasActiveFilters && <span className="badge badge-primary" style={{ marginLeft: '0.25rem' }}>!</span>}
          </button>
          {canCreate && (
            <PermissionButton
              className="btn btn-primary"
              onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
              action="create"
              data-testid="btn-nuevo-articulo"
            >
              <Plus size={18} />
              Nuevo Artículo
            </PermissionButton>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="grid-4">
            <div className="form-group">
              <label className="form-label">Buscar</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                  placeholder="Código, nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
              >
                <option value="">-- Todas --</option>
                {CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filterActivo}
                onChange={(e) => setFilterActivo(e.target.value)}
              >
                <option value="">-- Todos --</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              {hasActiveFilters && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setSearchTerm(''); setFilterCategoria(''); setFilterActivo(''); }}
                >
                  <X size={16} /> Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card-title">
            {editingId ? 'Editar Artículo' : 'Nuevo Artículo'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Código <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                  placeholder="Ej: FERT001"
                  required
                  data-testid="input-codigo"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Nombre del artículo"
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select
                  className="form-select"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  data-testid="select-categoria"
                >
                  <option value="General">General</option>
                  {CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-input"
                rows={2}
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                placeholder="Descripción del artículo..."
              />
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Unidad de Medida</label>
                <select
                  className="form-select"
                  value={formData.unidad_medida}
                  onChange={(e) => setFormData({...formData, unidad_medida: e.target.value})}
                >
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Precio Unitario (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.precio_unitario}
                  onChange={(e) => setFormData({...formData, precio_unitario: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">IVA (%)</label>
                <select
                  className="form-select"
                  value={formData.iva}
                  onChange={(e) => setFormData({...formData, iva: e.target.value})}
                >
                  <option value="0">0%</option>
                  <option value="4">4%</option>
                  <option value="10">10%</option>
                  <option value="21">21%</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Proveedor Habitual</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.proveedor_habitual}
                  onChange={(e) => setFormData({...formData, proveedor_habitual: e.target.value})}
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Stock Actual</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({...formData, stock_actual: e.target.value})}
                  placeholder="Cantidad en stock"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Stock Mínimo</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                  placeholder="Alerta stock bajo"
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Artículo Activo</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                rows={2}
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Notas adicionales..."
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de artículos */}
      <div className="card">
        <h2 className="card-title">
          <Package size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Catálogo de Artículos ({articulos.length})
        </h2>
        
        {loading ? (
          <p>Cargando artículos...</p>
        ) : articulos.length === 0 ? (
          <p className="text-muted">
            {hasActiveFilters ? 'No hay artículos que coincidan con los filtros' : 'No hay artículos registrados. ¡Añade el primero!'}
          </p>
        ) : (
          <div className="table-container">
            <table data-testid="articulos-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Precio</th>
                  <th>IVA</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {articulos.map((articulo) => (
                  <tr key={articulo._id} style={{ opacity: articulo.activo !== false ? 1 : 0.6 }}>
                    <td>
                      <strong style={{ fontFamily: 'monospace' }}>{articulo.codigo}</strong>
                    </td>
                    <td>
                      <div>{articulo.nombre}</div>
                      {articulo.descripcion && (
                        <small style={{ color: 'hsl(var(--muted-foreground))' }}>{articulo.descripcion.substring(0, 50)}...</small>
                      )}
                    </td>
                    <td>
                      <span 
                        className="badge"
                        style={{ 
                          backgroundColor: `${getCategoriaColor(articulo.categoria)}20`,
                          color: getCategoriaColor(articulo.categoria),
                          border: `1px solid ${getCategoriaColor(articulo.categoria)}40`
                        }}
                      >
                        {articulo.categoria}
                      </span>
                    </td>
                    <td>{articulo.unidad_medida}</td>
                    <td>
                      <strong style={{ color: 'hsl(var(--primary))' }}>
                        {articulo.precio_unitario?.toFixed(2) || '0.00'} €
                      </strong>
                    </td>
                    <td>{articulo.iva || 21}%</td>
                    <td>
                      {articulo.stock_actual !== null && articulo.stock_actual !== undefined ? (
                        <span style={{ 
                          color: articulo.stock_minimo && articulo.stock_actual < articulo.stock_minimo 
                            ? 'hsl(var(--destructive))' 
                            : 'inherit'
                        }}>
                          {articulo.stock_actual} {articulo.unidad_medida}
                          {articulo.stock_minimo && articulo.stock_actual < articulo.stock_minimo && (
                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'hsl(var(--destructive))' }}>
                              ⚠ Stock bajo
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActivo(articulo._id)}
                        className={`badge ${articulo.activo !== false ? 'badge-success' : 'badge-secondary'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title={articulo.activo !== false ? 'Desactivar' : 'Activar'}
                      >
                        {articulo.activo !== false ? (
                          <><Check size={12} /> Activo</>
                        ) : (
                          <><XCircle size={12} /> Inactivo</>
                        )}
                      </button>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(articulo)}
                              title="Editar"
                              data-testid={`edit-articulo-${articulo._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(articulo._id)}
                              title="Eliminar"
                              data-testid={`delete-articulo-${articulo._id}`}
                            >
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

export default ArticulosExplotacion;
