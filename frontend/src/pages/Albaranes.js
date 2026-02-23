import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Filter, Settings, X, FileSpreadsheet, PlusCircle, MinusCircle, FileText, Package } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos visibles en tabla
const DEFAULT_FIELDS_CONFIG = {
  numero: true,
  tipo: true,
  fecha: true,
  contrato: true,
  proveedor: true,
  cultivo: true,
  parcela: true,
  items: true,
  total: true,
  observaciones: false
};

const FIELD_LABELS = {
  numero: 'Nº Albarán',
  tipo: 'Tipo',
  fecha: 'Fecha',
  contrato: 'Contrato',
  proveedor: 'Proveedor',
  cultivo: 'Cultivo',
  parcela: 'Parcela',
  items: 'Líneas',
  total: 'Total',
  observaciones: 'Observaciones'
};

const Albaranes = () => {
  const [albaranes, setAlbaranes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Contrato seleccionado y datos heredados
  const [selectedContrato, setSelectedContrato] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    tipo: '',
    contrato_id: '',
    proveedor: '',
    cultivo: ''
  });
  
  // Filtros para buscar contratos en el formulario
  const [contratoSearch, setContratoSearch] = useState({
    proveedor: '',
    cultivo: '',
    campana: '',
    parcela: ''
  });
  
  // Opciones para filtros de contratos (extraídos de los contratos)
  const [contratoOptions, setContratoOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: [],
    parcelas: []
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('albaranes_fields_config_v2');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones de filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores: [],
    cultivos: []
  });
  
  // Lista de proveedores para selector alternativo
  const [proveedores, setProveedores] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    tipo: 'Entrada',
    fecha: new Date().toISOString().split('T')[0],
    contrato_id: '',
    // Datos heredados del contrato (referencia)
    proveedor_contrato: '',  // Proveedor original del contrato (informativo)
    cultivo: '',
    parcela_codigo: '',
    parcela_id: '',
    campana: '',
    // Proveedor del albarán (puede ser diferente al del contrato)
    proveedor: '',  // Este es el proveedor real del albarán
    usar_otro_proveedor: false,  // Flag para indicar si usa otro proveedor
    // Líneas del albarán
    items: [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }],
    observaciones: ''
  });
  
  useEffect(() => {
    fetchAlbaranes();
    fetchContratos();
    fetchProveedores();
  }, []);
  
  const fetchProveedores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/proveedores?limit=500`, {
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
  
  useEffect(() => {
    // Extraer opciones de filtro de albaranes existentes
    const proveedores = [...new Set(albaranes.map(a => a.proveedor).filter(Boolean))];
    const cultivos = [...new Set(albaranes.map(a => a.cultivo).filter(Boolean))];
    setFilterOptions({ proveedores, cultivos });
  }, [albaranes]);
  
  useEffect(() => {
    // Extraer opciones de filtro de contratos para el buscador del formulario
    const proveedores = [...new Set(contratos.map(c => c.proveedor).filter(Boolean))].sort();
    const cultivos = [...new Set(contratos.map(c => c.cultivo).filter(Boolean))].sort();
    const campanas = [...new Set(contratos.map(c => c.campana).filter(Boolean))].sort();
    const parcelas = [...new Set(contratos.map(c => c.parcela || c.parcela_codigo).filter(Boolean))].sort();
    setContratoOptions({ proveedores, cultivos, campanas, parcelas });
  }, [contratos]);
  
  useEffect(() => {
    localStorage.setItem('albaranes_fields_config_v2', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  const fetchContratos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/contratos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContratos(data.contratos || []);
      }
    } catch (error) {
      console.error('Error fetching contratos:', error);
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
  
  // Cuando se selecciona un contrato, heredar datos
  const handleContratoSelect = (contratoId) => {
    const contrato = contratos.find(c => c._id === contratoId);
    setSelectedContrato(contrato);
    
    if (contrato) {
      const proveedorContrato = contrato.proveedor || '';
      setFormData(prev => ({
        ...prev,
        contrato_id: contratoId,
        proveedor_contrato: proveedorContrato,
        proveedor: proveedorContrato,  // Por defecto, mismo proveedor del contrato
        usar_otro_proveedor: false,
        cultivo: contrato.cultivo || '',
        parcela_codigo: contrato.parcela_codigo || contrato.parcela || '',
        parcela_id: contrato.parcela_id || '',
        campana: contrato.campana || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        contrato_id: '',
        proveedor_contrato: '',
        proveedor: '',
        usar_otro_proveedor: false,
        cultivo: '',
        parcela_codigo: '',
        parcela_id: '',
        campana: ''
      }));
    }
  };
  
  // Manejar cambio de checkbox para usar otro proveedor
  const handleUsarOtroProveedorChange = (checked) => {
    setFormData(prev => ({
      ...prev,
      usar_otro_proveedor: checked,
      proveedor: checked ? '' : prev.proveedor_contrato
    }));
  };
  
  // Calcular total de líneas
  const updateItemTotal = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'cantidad' || field === 'precio_unitario') {
      const cantidad = parseFloat(newItems[index].cantidad) || 0;
      const precio = parseFloat(newItems[index].precio_unitario) || 0;
      newItems[index].total = cantidad * precio;
    }
    
    setFormData({ ...formData, items: newItems });
  };
  
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }]
    });
  };
  
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };
  
  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.contrato_id) {
      setError('Debe seleccionar un contrato');
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/albaranes/${editingId}`
        : `${BACKEND_URL}/api/albaranes`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          cantidad: parseFloat(item.cantidad) || 0,
          precio_unitario: parseFloat(item.precio_unitario) || 0,
          total: parseFloat(item.total) || 0
        })),
        total_albaran: calculateGrandTotal()
      };
      
      const response = await fetch(url, {
        method,
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
      resetForm();
      fetchAlbaranes();
    } catch (error) {
      console.error('Error saving albaran:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el albarán' : 'crear el albarán');
      setError(errorMsg);
    }
  };
  
  const handleEdit = (albaran) => {
    setEditingId(albaran._id);
    
    // Buscar el contrato para establecer selectedContrato
    const contrato = contratos.find(c => c._id === albaran.contrato_id);
    setSelectedContrato(contrato);
    
    setFormData({
      tipo: albaran.tipo || 'Entrada',
      fecha: albaran.fecha || '',
      contrato_id: albaran.contrato_id || '',
      proveedor: albaran.proveedor || '',
      cultivo: albaran.cultivo || '',
      parcela_codigo: albaran.parcela_codigo || '',
      parcela_id: albaran.parcela_id || '',
      campana: albaran.campana || '',
      items: albaran.items?.length > 0 
        ? albaran.items 
        : [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }],
      observaciones: albaran.observaciones || ''
    });
    setShowForm(true);
  };
  
  const handleDelete = async (albaranId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar albaranes');
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este albarán?')) {
      return;
    }
    
    try {
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
    }
  };
  
  const resetForm = () => {
    setSelectedContrato(null);
    setContratoSearch({ proveedor: '', cultivo: '', campana: '', parcela: '' });
    setFormData({
      tipo: 'Entrada',
      fecha: new Date().toISOString().split('T')[0],
      contrato_id: '',
      proveedor: '',
      cultivo: '',
      parcela_codigo: '',
      parcela_id: '',
      campana: '',
      items: [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }],
      observaciones: ''
    });
  };
  
  const clearFilters = () => {
    setFilters({ tipo: '', contrato_id: '', proveedor: '', cultivo: '' });
  };
  
  const clearContratoSearch = () => {
    setContratoSearch({ proveedor: '', cultivo: '', campana: '', parcela: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  // Filtrar contratos para el selector según búsqueda
  const filteredContratos = contratos.filter(c => {
    if (contratoSearch.proveedor && c.proveedor !== contratoSearch.proveedor) return false;
    if (contratoSearch.cultivo && c.cultivo !== contratoSearch.cultivo) return false;
    if (contratoSearch.campana && c.campana !== contratoSearch.campana) return false;
    if (contratoSearch.parcela && (c.parcela || c.parcela_codigo) !== contratoSearch.parcela) return false;
    return true;
  });
  
  const hasContratoSearchActive = contratoSearch.proveedor || contratoSearch.cultivo || contratoSearch.campana || contratoSearch.parcela;
  
  // Filtrar albaranes
  const filteredAlbaranes = albaranes.filter(a => {
    if (filters.tipo && a.tipo !== filters.tipo) return false;
    if (filters.contrato_id && a.contrato_id !== filters.contrato_id) return false;
    if (filters.proveedor && a.proveedor !== filters.proveedor) return false;
    if (filters.cultivo && a.cultivo !== filters.cultivo) return false;
    return true;
  });
  
  const hasActiveFilters = filters.tipo || filters.contrato_id || filters.proveedor || filters.cultivo;

  return (
    <div data-testid="albaranes-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={28} />
            Albaranes
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
            Gestión de albaranes de entrada y salida por contrato
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title="Configurar columnas"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => { resetForm(); setShowForm(!showForm); setEditingId(null); }}
            className="btn btn-primary"
            data-testid="btn-nuevo-albaran"
          >
            <Plus size={18} />
            Nuevo Albarán
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {/* Configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Columnas Visibles</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fieldsConfig[key]}
                  onChange={() => toggleFieldConfig(key)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros de Búsqueda
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select 
              className="form-select" 
              value={filters.tipo} 
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="Entrada">Entrada</option>
              <option value="Salida">Salida</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contrato</label>
            <select 
              className="form-select" 
              value={filters.contrato_id} 
              onChange={(e) => setFilters({...filters, contrato_id: e.target.value})}
            >
              <option value="">Todos</option>
              {contratos.map(c => (
                <option key={c._id} value={c._id}>
                  {c.numero_contrato || c._id.slice(-6)} - {c.proveedor}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor</label>
            <select 
              className="form-select" 
              value={filters.proveedor} 
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
            >
              <option value="">Todos</option>
              {filterOptions.proveedores.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cultivo</label>
            <select 
              className="form-select" 
              value={filters.cultivo} 
              onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
            >
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="albaran-form">
          <h2 className="card-title">{editingId ? 'Editar Albarán' : 'Nuevo Albarán'}</h2>
          
          <form onSubmit={handleSubmit}>
            {/* Paso 1: Seleccionar Contrato */}
            <div style={{ 
              backgroundColor: 'hsl(var(--primary) / 0.1)', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1.5rem',
              border: '1px solid hsl(var(--primary) / 0.3)'
            }}>
              <div className="flex justify-between items-center mb-3">
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <FileText size={18} /> 1. Seleccionar Contrato
                </h3>
                {hasContratoSearchActive && (
                  <button 
                    type="button" 
                    className="btn btn-sm btn-secondary" 
                    onClick={clearContratoSearch}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
              
              {/* Filtros para buscar contratos */}
              <div style={{ 
                backgroundColor: 'white', 
                padding: '0.75rem', 
                borderRadius: '6px', 
                marginBottom: '1rem',
                border: '1px solid hsl(var(--border))'
              }}>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
                  Buscar contrato por:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <select
                    className="form-select"
                    value={contratoSearch.proveedor}
                    onChange={(e) => setContratoSearch({...contratoSearch, proveedor: e.target.value})}
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="">Proveedor</option>
                    {contratoOptions.proveedores.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    className="form-select"
                    value={contratoSearch.cultivo}
                    onChange={(e) => setContratoSearch({...contratoSearch, cultivo: e.target.value})}
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="">Cultivo</option>
                    {contratoOptions.cultivos.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="form-select"
                    value={contratoSearch.campana}
                    onChange={(e) => setContratoSearch({...contratoSearch, campana: e.target.value})}
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="">Campaña</option>
                    {contratoOptions.campanas.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="form-select"
                    value={contratoSearch.parcela}
                    onChange={(e) => setContratoSearch({...contratoSearch, parcela: e.target.value})}
                    style={{ fontSize: '0.875rem' }}
                  >
                    <option value="">Parcela</option>
                    {contratoOptions.parcelas.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Selector de contrato filtrado */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Contrato * 
                  <span style={{ fontWeight: 'normal', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginLeft: '0.5rem' }}>
                    ({filteredContratos.length} {filteredContratos.length === 1 ? 'contrato' : 'contratos'} encontrados)
                  </span>
                </label>
                <select
                  className="form-select"
                  value={formData.contrato_id}
                  onChange={(e) => handleContratoSelect(e.target.value)}
                  required
                  data-testid="select-contrato"
                >
                  <option value="">-- Seleccionar contrato --</option>
                  {filteredContratos.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.numero_contrato || `CON-${c._id.slice(-6)}`} | {c.proveedor} | {c.cultivo} | {c.parcela || c.parcela_codigo} | {c.campana}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Datos heredados del contrato */}
            {selectedContrato && (
              <div style={{ 
                backgroundColor: '#f0fdf4', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #86efac'
              }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#166534' }}>
                  Datos del Contrato (heredados automáticamente)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Proveedor</span>
                    <p style={{ fontWeight: '500' }}>{formData.proveedor || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Cultivo</span>
                    <p style={{ fontWeight: '500' }}>{formData.cultivo || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Parcela</span>
                    <p style={{ fontWeight: '500' }}>{formData.parcela_codigo || '-'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Campaña</span>
                    <p style={{ fontWeight: '500' }}>{formData.campana || '-'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Datos del Albarán */}
            <div className="grid-3 mb-4">
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select 
                  className="form-select" 
                  value={formData.tipo} 
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})} 
                  required 
                  data-testid="select-tipo"
                >
                  <option value="Entrada">Entrada</option>
                  <option value="Salida">Salida</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.fecha} 
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})} 
                  required 
                  data-testid="input-fecha" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total Albarán</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={`${calculateGrandTotal().toFixed(2)} €`} 
                  disabled
                  style={{ backgroundColor: '#f0fdf4', fontWeight: '600' }}
                />
              </div>
            </div>
            
            {/* Líneas del albarán */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={16} /> Líneas del Albarán
              </label>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginBottom: '0.5rem' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '200px' }}>Descripción</th>
                      <th style={{ width: '100px' }}>Cantidad</th>
                      <th style={{ width: '80px' }}>Unidad</th>
                      <th style={{ width: '120px' }}>Precio Unit.</th>
                      <th style={{ width: '120px' }}>Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={item.descripcion}
                            onChange={(e) => updateItemTotal(index, 'descripcion', e.target.value)}
                            placeholder="Descripción del producto"
                            data-testid={`item-descripcion-${index}`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            value={item.cantidad}
                            onChange={(e) => updateItemTotal(index, 'cantidad', e.target.value)}
                            placeholder="0"
                            data-testid={`item-cantidad-${index}`}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={item.unidad || 'kg'}
                            onChange={(e) => updateItemTotal(index, 'unidad', e.target.value)}
                          >
                            <option value="kg">kg</option>
                            <option value="ud">ud</option>
                            <option value="L">L</option>
                            <option value="cajas">cajas</option>
                            <option value="pallets">pallets</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            value={item.precio_unitario}
                            onChange={(e) => updateItemTotal(index, 'precio_unitario', e.target.value)}
                            placeholder="0.00"
                            data-testid={`item-precio-${index}`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={`${(item.total || 0).toFixed(2)} €`}
                            disabled
                            style={{ backgroundColor: '#f5f5f5', textAlign: 'right' }}
                          />
                        </td>
                        <td>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-error"
                              onClick={() => removeItem(index)}
                              title="Eliminar línea"
                            >
                              <MinusCircle size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addItem}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <PlusCircle size={16} /> Añadir Línea
              </button>
            </div>
            
            {/* Observaciones */}
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                className="form-textarea" 
                rows="2" 
                value={formData.observaciones} 
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})} 
                placeholder="Notas adicionales..." 
                data-testid="textarea-observaciones" 
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">
                {editingId ? 'Actualizar Albarán' : 'Guardar Albarán'}
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

      {/* Tabla */}
      <div className="card">
        <h2 className="card-title">Lista de Albaranes ({filteredAlbaranes.length})</h2>
        {loading ? (
          <p>Cargando albaranes...</p>
        ) : filteredAlbaranes.length === 0 ? (
          <p className="text-muted">No hay albaranes registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" data-testid="albaranes-table">
              <thead>
                <tr>
                  {fieldsConfig.numero && <th>Nº</th>}
                  {fieldsConfig.tipo && <th>Tipo</th>}
                  {fieldsConfig.fecha && <th>Fecha</th>}
                  {fieldsConfig.contrato && <th>Contrato</th>}
                  {fieldsConfig.proveedor && <th>Proveedor</th>}
                  {fieldsConfig.cultivo && <th>Cultivo</th>}
                  {fieldsConfig.parcela && <th>Parcela</th>}
                  {fieldsConfig.items && <th>Líneas</th>}
                  {fieldsConfig.total && <th>Total</th>}
                  {fieldsConfig.observaciones && <th>Observaciones</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlbaranes.map((albaran, index) => (
                  <tr key={albaran._id}>
                    {fieldsConfig.numero && (
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>ALB-{String(index + 1).padStart(4, '0')}</code>
                      </td>
                    )}
                    {fieldsConfig.tipo && (
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: albaran.tipo === 'Entrada' ? '#dcfce7' : '#fee2e2',
                          color: albaran.tipo === 'Entrada' ? '#166534' : '#991b1b'
                        }}>
                          {albaran.tipo}
                        </span>
                      </td>
                    )}
                    {fieldsConfig.fecha && <td>{albaran.fecha ? new Date(albaran.fecha).toLocaleDateString('es-ES') : '-'}</td>}
                    {fieldsConfig.contrato && (
                      <td>
                        {albaran.contrato_id ? (
                          <code style={{ fontSize: '0.75rem' }}>
                            {contratos.find(c => c._id === albaran.contrato_id)?.numero_contrato || albaran.contrato_id.slice(-6)}
                          </code>
                        ) : '-'}
                      </td>
                    )}
                    {fieldsConfig.proveedor && <td>{albaran.proveedor || '-'}</td>}
                    {fieldsConfig.cultivo && <td>{albaran.cultivo || '-'}</td>}
                    {fieldsConfig.parcela && <td>{albaran.parcela_codigo || '-'}</td>}
                    {fieldsConfig.items && <td>{albaran.items?.length || 0} líneas</td>}
                    {fieldsConfig.total && (
                      <td style={{ fontWeight: '600', color: '#166534' }}>
                        {(albaran.total_albaran || 0).toFixed(2)} €
                      </td>
                    )}
                    {fieldsConfig.observaciones && (
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {albaran.observaciones || '-'}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <PermissionButton
                          permission="edit"
                          onClick={() => handleEdit(albaran)}
                          className="btn btn-sm btn-secondary"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </PermissionButton>
                        <PermissionButton
                          permission="delete"
                          onClick={() => handleDelete(albaran._id)}
                          className="btn btn-sm btn-error"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </PermissionButton>
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

export default Albaranes;
