import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Filter, Settings, X, FileSpreadsheet, PlusCircle, MinusCircle } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos
const DEFAULT_FIELDS_CONFIG = {
  tipo: true,
  fecha: true,
  proveedor_cliente: true,
  items: true,
  observaciones: true
};

const FIELD_LABELS = {
  tipo: 'Tipo',
  fecha: 'Fecha',
  proveedor_cliente: 'Proveedor/Cliente',
  items: 'Líneas',
  observaciones: 'Observaciones'
};

const Albaranes = () => {
  const [albaranes, setAlbaranes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Filtros
  const [filters, setFilters] = useState({
    tipo: '',
    proveedor_cliente: ''
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('albaranes_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones de filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores_clientes: []
  });
  
  const [formData, setFormData] = useState({
    tipo: 'Entrada',
    fecha: '',
    proveedor_cliente: '',
    items: [{ descripcion: '', cantidad: '', precio_unitario: '', total: 0 }],
    observaciones: ''
  });
  
  useEffect(() => {
    fetchAlbaranes();
    fetchProveedores();
  }, []);
  
  useEffect(() => {
    const provClientes = [...new Set(albaranes.map(a => a.proveedor_cliente).filter(Boolean))];
    setFilterOptions({ proveedores_clientes: provClientes });
  }, [albaranes]);
  
  useEffect(() => {
    localStorage.setItem('albaranes_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  const fetchProveedores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/proveedores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProveedores(data.proveedores || []);
      }
    } catch (error) {
      console.error('Error fetching proveedores:', error);
    }
  };
  
  const fetchAlbaranes = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/albaranes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setAlbaranes(data.albaranes || []);
    } catch (error) {
      console.error('Error fetching albaranes:', error);
      const errorMsg = handlePermissionError(error, 'ver los albaranes');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar albaranes
  const filteredAlbaranes = albaranes.filter(a => {
    if (filters.tipo && a.tipo !== filters.tipo) return false;
    if (filters.proveedor_cliente && a.proveedor_cliente !== filters.proveedor_cliente) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ tipo: '', proveedor_cliente: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  // Gestión de items del albarán
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { descripcion: '', cantidad: '', precio_unitario: '', total: 0 }]
    }));
  };
  
  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
  
  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalcular total del item
      const cantidad = parseFloat(newItems[index].cantidad) || 0;
      const precio = parseFloat(newItems[index].precio_unitario) || 0;
      newItems[index].total = cantidad * precio;
      
      return { ...prev, items: newItems };
    });
  };
  
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/albaranes/${editingId}`
        : `${BACKEND_URL}/api/albaranes`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        items: formData.items.map(item => ({
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad) || 0,
          precio_unitario: parseFloat(item.precio_unitario) || 0,
          total: parseFloat(item.total) || 0
        }))
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
        fetchAlbaranes();
        setFormData({
          tipo: 'Entrada',
          fecha: '',
          proveedor_cliente: '',
          items: [{ descripcion: '', cantidad: '', precio_unitario: '', total: 0 }],
          observaciones: ''
        });
      }
    } catch (error) {
      console.error('Error saving albaran:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el albarán' : 'crear el albarán');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (albaran) => {
    setEditingId(albaran._id);
    setFormData({
      tipo: albaran.tipo || 'Entrada',
      fecha: albaran.fecha || '',
      proveedor_cliente: albaran.proveedor_cliente || '',
      items: albaran.items && albaran.items.length > 0 
        ? albaran.items 
        : [{ descripcion: '', cantidad: '', precio_unitario: '', total: 0 }],
      observaciones: albaran.observaciones || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      tipo: 'Entrada',
      fecha: '',
      proveedor_cliente: '',
      items: [{ descripcion: '', cantidad: '', precio_unitario: '', total: 0 }],
      observaciones: ''
    });
  };
  
  const handleDelete = async (albaranId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar albaranes');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este albarán?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/albaranes/${albaranId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchAlbaranes();
    } catch (error) {
      console.error('Error deleting albaran:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el albarán');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="albaranes-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={28} /> Albaranes
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
            data-testid="btn-nuevo-albaran"
          >
            <Plus size={18} /> Nuevo Albarán
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
            <label className="form-label">Tipo</label>
            <select className="form-select" value={filters.tipo} onChange={(e) => setFilters({...filters, tipo: e.target.value})} data-testid="filter-tipo">
              <option value="">Todos</option>
              <option value="Entrada">Entrada</option>
              <option value="Salida">Salida</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor/Cliente</label>
            <select className="form-select" value={filters.proveedor_cliente} onChange={(e) => setFilters({...filters, proveedor_cliente: e.target.value})} data-testid="filter-proveedor">
              <option value="">Todos</option>
              {filterOptions.proveedores_clientes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredAlbaranes.length} de {albaranes.length} albaranes
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="albaran-form">
          <h2 className="card-title">{editingId ? 'Editar Albarán' : 'Nuevo Albarán'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              {fieldsConfig.tipo && (
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-select" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} required data-testid="select-tipo">
                    <option value="Entrada">Entrada</option>
                    <option value="Salida">Salida</option>
                  </select>
                </div>
              )}
              {fieldsConfig.fecha && (
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required data-testid="input-fecha" />
                </div>
              )}
              {fieldsConfig.proveedor_cliente && (
                <div className="form-group">
                  <label className="form-label">Proveedor/Cliente *</label>
                  <select className="form-select" value={formData.proveedor_cliente} onChange={(e) => setFormData({...formData, proveedor_cliente: e.target.value})} required data-testid="select-proveedor">
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => <option key={p._id} value={p.nombre}>{p.nombre}</option>)}
                    {formData.proveedor_cliente && !proveedores.find(p => p.nombre === formData.proveedor_cliente) && (
                      <option value={formData.proveedor_cliente}>{formData.proveedor_cliente}</option>
                    )}
                  </select>
                </div>
              )}
            </div>
            
            {fieldsConfig.items && (
              <div className="form-group">
                <div className="flex justify-between items-center mb-2">
                  <label className="form-label" style={{ marginBottom: 0 }}>Líneas del Albarán</label>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>
                    <PlusCircle size={14} /> Añadir línea
                  </button>
                </div>
                <div style={{ border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <table style={{ width: '100%', marginBottom: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: 'hsl(var(--muted))' }}>
                        <th style={{ padding: '0.5rem' }}>Descripción</th>
                        <th style={{ padding: '0.5rem', width: '100px' }}>Cantidad</th>
                        <th style={{ padding: '0.5rem', width: '120px' }}>Precio Unit.</th>
                        <th style={{ padding: '0.5rem', width: '100px' }}>Total</th>
                        <th style={{ padding: '0.5rem', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td style={{ padding: '0.25rem' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={item.descripcion} 
                              onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                              placeholder="Descripción del producto"
                              style={{ marginBottom: 0 }}
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              className="form-input" 
                              value={item.cantidad} 
                              onChange={(e) => updateItem(index, 'cantidad', e.target.value)}
                              style={{ marginBottom: 0 }}
                            />
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              className="form-input" 
                              value={item.precio_unitario} 
                              onChange={(e) => updateItem(index, 'precio_unitario', e.target.value)}
                              style={{ marginBottom: 0 }}
                            />
                          </td>
                          <td style={{ padding: '0.25rem', textAlign: 'right', fontWeight: '600' }}>
                            €{(item.total || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            {formData.items.length > 1 && (
                              <button type="button" className="btn btn-sm btn-error" onClick={() => removeItem(index)}>
                                <MinusCircle size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: 'hsl(var(--muted))' }}>
                        <td colSpan="3" style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>TOTAL:</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', fontSize: '1.1rem' }}>€{calculateTotal().toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            
            {fieldsConfig.observaciones && (
              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea className="form-textarea" rows="2" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Notas adicionales..." data-testid="textarea-observaciones" />
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
        <h2 className="card-title">Lista de Albaranes ({filteredAlbaranes.length})</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : filteredAlbaranes.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay albaranes que coincidan con los filtros' : 'No hay albaranes registrados'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="albaranes-table">
              <thead>
                <tr>
                  {fieldsConfig.tipo ? <th>Tipo</th> : null}
                  {fieldsConfig.fecha ? <th>Fecha</th> : null}
                  {fieldsConfig.proveedor_cliente ? <th>Proveedor/Cliente</th> : null}
                  {fieldsConfig.items ? <th>Líneas</th> : null}
                  <th>Total</th>
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredAlbaranes.map((albaran) => (
                  <tr key={albaran._id}>
                    {fieldsConfig.tipo && (
                      <td>
                        <span className={`badge ${albaran.tipo === 'Entrada' ? 'badge-success' : 'badge-warning'}`}>
                          {albaran.tipo}
                        </span>
                      </td>
                    )}
                    {fieldsConfig.fecha ? <td>{albaran.fecha ? new Date(albaran.fecha).toLocaleDateString() : '—'}</td> : null}
                    {fieldsConfig.proveedor_cliente ? <td className="font-semibold">{albaran.proveedor_cliente}</td> : null}
                    {fieldsConfig.items ? <td>{albaran.items?.length || 0}</td> : null}
                    <td style={{ fontWeight: '600' }}>€{(albaran.total_general || 0).toFixed(2)}</td>
                    {(canEdit || canDelete) ? (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(albaran)} title="Editar" data-testid={`edit-albaran-${albaran._id}`}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-error" onClick={() => handleDelete(albaran._id)} title="Eliminar" data-testid={`delete-albaran-${albaran._id}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
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

export default Albaranes;
