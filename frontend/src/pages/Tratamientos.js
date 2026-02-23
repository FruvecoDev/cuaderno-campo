import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Info, Filter, Settings, X } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Default field configuration
const DEFAULT_FIELDS_CONFIG = {
  tipo_tratamiento: true,
  subtipo: true,
  metodo_aplicacion: true,
  aplicacion_numero: true,
  parcelas_ids: true,
  superficie_aplicacion: true,
  caldo_superficie: true,
  fecha_tratamiento: true,
  fecha_aplicacion: true,
  aplicador_nombre: true,
  maquina_id: true
};

const FIELD_LABELS = {
  tipo_tratamiento: 'Tipo Tratamiento',
  subtipo: 'Subtipo',
  metodo_aplicacion: 'Método Aplicación',
  aplicacion_numero: 'Nº Aplicación',
  parcelas_ids: 'Parcelas',
  superficie_aplicacion: 'Superficie',
  caldo_superficie: 'Caldo/Superficie',
  fecha_tratamiento: 'Fecha Tratamiento',
  fecha_aplicacion: 'Fecha Aplicación',
  aplicador_nombre: 'Aplicador',
  maquina_id: 'Máquina'
};

// Table columns config
const DEFAULT_TABLE_CONFIG = {
  tipo: true,
  subtipo: true,
  metodo: true,
  campana: true,
  fecha_tratamiento: true,
  fecha_aplicacion: true,
  superficie: true,
  parcelas: true,
  aplicador: true,
  maquina: true,
  estado: true
};

const TABLE_LABELS = {
  tipo: 'Tipo',
  subtipo: 'Subtipo',
  metodo: 'Método',
  campana: 'Campaña',
  fecha_tratamiento: 'F. Tratamiento',
  fecha_aplicacion: 'F. Aplicación',
  superficie: 'Superficie',
  parcelas: 'Parcelas',
  aplicador: 'Aplicador',
  maquina: 'Máquina',
  estado: 'Estado'
};

const Tratamientos = () => {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Solo necesitamos parcelas para el selector
  const [parcelas, setParcelas] = useState([]);
  const [maquinaria, setMaquinaria] = useState([]);
  const [selectedParcelas, setSelectedParcelas] = useState([]);
  const [selectedParcelasInfo, setSelectedParcelasInfo] = useState(null);
  
  // Filtros de búsqueda de parcelas (dentro del formulario)
  const [parcelaSearch, setParcelaSearch] = useState({
    proveedor: '',
    cultivo: '',
    campana: ''
  });
  
  // Opciones únicas para filtros de parcelas (dentro del formulario)
  const [parcelaFilterOptions, setParcelaFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: []
  });
  
  // Filtros
  const [filters, setFilters] = useState({
    proveedor: '',
    cultivo: '',
    campana: '',
    tipo_tratamiento: ''
  });
  
  // Configuración de campos del formulario
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('tratamientos_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Configuración de columnas de la tabla
  const [tableConfig, setTableConfig] = useState(() => {
    const saved = localStorage.getItem('tratamientos_table_config');
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_CONFIG;
  });
  
  // Opciones únicas para filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: [],
    tipos: []
  });
  
  // Form data SIMPLIFICADO
  const [formData, setFormData] = useState({
    tipo_tratamiento: 'FITOSANITARIOS',
    subtipo: 'Insecticida',
    aplicacion_numero: 1,
    metodo_aplicacion: 'Pulverización',
    superficie_aplicacion: '',
    caldo_superficie: '',
    parcelas_ids: [],
    fecha_tratamiento: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    fecha_aplicacion: '',
    aplicador_nombre: '',
    maquina_id: ''
  });
  
  useEffect(() => {
    fetchTratamientos();
    fetchParcelas();
    fetchMaquinaria();
  }, []);
  
  // Extraer opciones únicas cuando cambian los tratamientos
  useEffect(() => {
    // También necesitamos datos de parcelas para proveedor y cultivo
    const proveedores = [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))];
    const cultivos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
    const campanas = [...new Set(tratamientos.map(t => t.campana).filter(Boolean))];
    const tipos = [...new Set(tratamientos.map(t => t.tipo_tratamiento).filter(Boolean))];
    
    setFilterOptions({
      proveedores,
      cultivos,
      campanas,
      tipos
    });
  }, [tratamientos, parcelas]);
  
  // Extraer opciones únicas de parcelas para el buscador del formulario
  useEffect(() => {
    const proveedores = [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))];
    const cultivos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
    const campanas = [...new Set(parcelas.map(p => p.campana).filter(Boolean))];
    
    setParcelaFilterOptions({
      proveedores,
      cultivos,
      campanas
    });
  }, [parcelas]);
  
  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('tratamientos_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  useEffect(() => {
    localStorage.setItem('tratamientos_table_config', JSON.stringify(tableConfig));
  }, [tableConfig]);
  
  // Cuando se seleccionan parcelas, mostrar info heredada de la primera
  useEffect(() => {
    if (selectedParcelas.length > 0) {
      const firstParcela = parcelas.find(p => p._id === selectedParcelas[0]);
      setSelectedParcelasInfo(firstParcela || null);
    } else {
      setSelectedParcelasInfo(null);
    }
  }, [selectedParcelas, parcelas]);
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setParcelas(data.parcelas || []);
      }
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    }
  };
  
  const fetchMaquinaria = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/maquinaria`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMaquinaria(data.maquinaria || []);
      }
    } catch (error) {
      console.error('Error fetching maquinaria:', error);
    }
  };
  
  const fetchTratamientos = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/tratamientos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setTratamientos(data.tratamientos || []);
    } catch (error) {
      console.error('Error fetching tratamientos:', error);
      const errorMsg = handlePermissionError(error, 'ver los tratamientos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar tratamientos
  const filteredTratamientos = tratamientos.filter(t => {
    if (filters.campana && t.campana !== filters.campana) return false;
    if (filters.tipo_tratamiento && t.tipo_tratamiento !== filters.tipo_tratamiento) return false;
    // Para proveedor y cultivo necesitamos buscar en las parcelas asociadas
    if (filters.proveedor || filters.cultivo) {
      const parcelasIds = t.parcelas_ids || [];
      const matchingParcelas = parcelas.filter(p => parcelasIds.includes(p._id));
      if (filters.proveedor && !matchingParcelas.some(p => p.proveedor === filters.proveedor)) return false;
      if (filters.cultivo && !matchingParcelas.some(p => p.cultivo === filters.cultivo)) return false;
    }
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ proveedor: '', cultivo: '', campana: '', tipo_tratamiento: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const toggleTableConfig = (field) => {
    setTableConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleParcelaSelection = (parcelaId) => {
    const isSelected = selectedParcelas.includes(parcelaId);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedParcelas.filter(id => id !== parcelaId);
    } else {
      newSelection = [...selectedParcelas, parcelaId];
    }
    
    setSelectedParcelas(newSelection);
    setFormData(prev => ({ ...prev, parcelas_ids: newSelection }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar solo parcelas_ids (obligatorio)
    if (formData.parcelas_ids.length === 0) {
      setError('Debe seleccionar al menos una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/tratamientos/${editingId}`
        : `${BACKEND_URL}/api/tratamientos`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Payload simplificado - el backend hereda el resto
      const payload = {
        tipo_tratamiento: formData.tipo_tratamiento,
        subtipo: formData.subtipo,
        aplicacion_numero: parseInt(formData.aplicacion_numero),
        metodo_aplicacion: formData.metodo_aplicacion,
        superficie_aplicacion: parseFloat(formData.superficie_aplicacion) || 0,
        caldo_superficie: parseFloat(formData.caldo_superficie) || 0,
        parcelas_ids: formData.parcelas_ids,
        fecha_tratamiento: formData.fecha_tratamiento || null,
        fecha_aplicacion: formData.fecha_aplicacion || null,
        aplicador_nombre: formData.aplicador_nombre || null,
        maquina_id: formData.maquina_id || null
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
        fetchTratamientos();
        setFormData({
          tipo_tratamiento: 'FITOSANITARIOS',
          subtipo: 'Insecticida',
          aplicacion_numero: 1,
          metodo_aplicacion: 'Pulverización',
          superficie_aplicacion: '',
          caldo_superficie: '',
          parcelas_ids: [],
          fecha_tratamiento: new Date().toISOString().split('T')[0],
          fecha_aplicacion: '',
          aplicador_nombre: '',
          maquina_id: ''
        });
        setSelectedParcelas([]);
        setSelectedParcelasInfo(null);
        setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
      }
    } catch (error) {
      console.error('Error saving tratamiento:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el tratamiento' : 'crear el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (tratamiento) => {
    setEditingId(tratamiento._id);
    setFormData({
      tipo_tratamiento: tratamiento.tipo_tratamiento || 'FITOSANITARIOS',
      subtipo: tratamiento.subtipo || 'Insecticida',
      aplicacion_numero: tratamiento.aplicacion_numero || 1,
      metodo_aplicacion: tratamiento.metodo_aplicacion || 'Pulverización',
      superficie_aplicacion: tratamiento.superficie_aplicacion || '',
      caldo_superficie: tratamiento.caldo_superficie || '',
      parcelas_ids: tratamiento.parcelas_ids || [],
      fecha_tratamiento: tratamiento.fecha_tratamiento || '',
      fecha_aplicacion: tratamiento.fecha_aplicacion || '',
      aplicador_nombre: tratamiento.aplicador_nombre || '',
      maquina_id: tratamiento.maquina_id || ''
    });
    setSelectedParcelas(tratamiento.parcelas_ids || []);
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setSelectedParcelas([]);
    setSelectedParcelasInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
    setFormData({
      tipo_tratamiento: 'FITOSANITARIOS',
      subtipo: 'Insecticida',
      aplicacion_numero: 1,
      metodo_aplicacion: 'Pulverización',
      superficie_aplicacion: '',
      caldo_superficie: '',
      parcelas_ids: [],
      fecha_tratamiento: new Date().toISOString().split('T')[0],
      fecha_aplicacion: '',
      aplicador_nombre: '',
      maquina_id: ''
    });
  };
  
  const handleDelete = async (tratamientoId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar tratamientos');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este tratamiento?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/tratamientos/${tratamientoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchTratamientos();
    } catch (error) {
      console.error('Error deleting tratamiento:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="tratamientos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tratamientos</h1>
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
            data-testid="btn-nuevo-tratamiento"
          >
            <Plus size={18} />
            Nuevo Tratamiento
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Panel de configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Campos</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Campos del Formulario:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fieldsConfig[key]}
                    onChange={() => toggleFieldConfig(key)}
                    disabled={key === 'parcelas_ids'} // parcelas_ids siempre obligatorio
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label} {key === 'parcelas_ids' && '(obligatorio)'}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Columnas de la Tabla:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(TABLE_LABELS).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={tableConfig[key]}
                    onChange={() => toggleTableConfig(key)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Filtros de búsqueda */}
      <div className="card mb-6" data-testid="filters-panel">
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor</label>
            <select
              className="form-select"
              value={filters.proveedor}
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
              data-testid="filter-proveedor"
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
              data-testid="filter-cultivo"
            >
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
              data-testid="filter-campana"
            >
              <option value="">Todas</option>
              {filterOptions.campanas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo Tratamiento</label>
            <select
              className="form-select"
              value={filters.tipo_tratamiento}
              onChange={(e) => setFilters({...filters, tipo_tratamiento: e.target.value})}
              data-testid="filter-tipo"
            >
              <option value="">Todos</option>
              {filterOptions.tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredTratamientos.length} de {tratamientos.length} tratamientos
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="tratamiento-form">
          <h2 className="card-title">{editingId ? 'Editar Tratamiento' : 'Crear Tratamiento'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Información del modelo simplificado */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                <Info size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Modelo simplificado:</strong> Solo selecciona las Parcelas. El Contrato, Cultivo y Campaña se heredan automáticamente de la primera parcela seleccionada.
              </p>
            </div>
            
            {/* Tipo de tratamiento */}
            <div className="grid-3">
              {fieldsConfig.tipo_tratamiento && (
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamiento *</label>
                  <select
                    className="form-select"
                    value={formData.tipo_tratamiento}
                    onChange={(e) => setFormData({...formData, tipo_tratamiento: e.target.value})}
                    required
                    data-testid="select-tipo-tratamiento"
                  >
                    <option value="FITOSANITARIOS">Fitosanitarios</option>
                    <option value="NUTRICIÓN">Nutrición</option>
                    <option value="ENMIENDAS">Enmiendas</option>
                  </select>
                </div>
              )}
              
              {fieldsConfig.subtipo && (
                <div className="form-group">
                  <label className="form-label">Subtipo</label>
                  <select
                    className="form-select"
                    value={formData.subtipo}
                    onChange={(e) => setFormData({...formData, subtipo: e.target.value})}
                    data-testid="select-subtipo"
                  >
                    <option value="Insecticida">Insecticida</option>
                    <option value="Fungicida">Fungicida</option>
                    <option value="Herbicida">Herbicida</option>
                    <option value="Acaricida">Acaricida</option>
                    <option value="Fertilizante">Fertilizante</option>
                    <option value="Bioestimulante">Bioestimulante</option>
                  </select>
                </div>
              )}
              
              {fieldsConfig.metodo_aplicacion && (
                <div className="form-group">
                  <label className="form-label">Método de Aplicación *</label>
                  <select
                    className="form-select"
                    value={formData.metodo_aplicacion}
                    onChange={(e) => setFormData({...formData, metodo_aplicacion: e.target.value})}
                    required
                    data-testid="select-metodo-aplicacion"
                  >
                    <option value="Pulverización">Pulverización</option>
                    <option value="Quimigación">Quimigación (fertirrigación)</option>
                    <option value="Espolvoreo">Espolvoreo</option>
                    <option value="Aplicación Foliar">Aplicación Foliar</option>
                    <option value="Aplicación al Suelo">Aplicación al Suelo</option>
                  </select>
                </div>
              )}
            </div>
            
            {fieldsConfig.aplicacion_numero && (
              <div className="form-group">
                <label className="form-label">Nº Aplicación *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={formData.aplicacion_numero}
                  onChange={(e) => setFormData({...formData, aplicacion_numero: parseInt(e.target.value)})}
                  required
                  style={{ maxWidth: '150px' }}
                  data-testid="input-aplicacion-numero"
                />
              </div>
            )}
            
            {/* Selección de parcelas (múltiple) CON BÚSQUEDA - SIEMPRE VISIBLE */}
            <div className="form-group">
              <label className="form-label">Parcelas a Tratar * (Obligatorio - selecciona una o varias)</label>
              
              {/* Filtros de búsqueda de parcelas */}
              <div style={{ 
                backgroundColor: 'hsl(var(--muted))', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '0.75rem' 
              }}>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>
                  Buscar parcelas por:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Proveedor</label>
                    <select
                      className="form-select"
                      value={parcelaSearch.proveedor}
                      onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})}
                      style={{ fontSize: '0.875rem' }}
                      data-testid="parcela-search-proveedor"
                    >
                      <option value="">Todos</option>
                      {parcelaFilterOptions.proveedores.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Cultivo</label>
                    <select
                      className="form-select"
                      value={parcelaSearch.cultivo}
                      onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})}
                      style={{ fontSize: '0.875rem' }}
                      data-testid="parcela-search-cultivo"
                    >
                      <option value="">Todos</option>
                      {parcelaFilterOptions.cultivos.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Campaña</label>
                    <select
                      className="form-select"
                      value={parcelaSearch.campana}
                      onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})}
                      style={{ fontSize: '0.875rem' }}
                      data-testid="parcela-search-campana"
                    >
                      <option value="">Todas</option>
                      {parcelaFilterOptions.campanas.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(parcelaSearch.proveedor || parcelaSearch.cultivo || parcelaSearch.campana) && (
                  <button
                    type="button"
                    onClick={() => setParcelaSearch({ proveedor: '', cultivo: '', campana: '' })}
                    style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.75rem', 
                      color: 'hsl(var(--primary))',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Limpiar filtros de búsqueda
                  </button>
                )}
              </div>
              
              {/* Lista de parcelas filtrada */}
              <div style={{ 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '0.5rem', 
                padding: '1rem', 
                maxHeight: '200px', 
                overflowY: 'auto',
                backgroundColor: 'hsl(var(--background))'
              }}>
                {parcelas.length === 0 ? (
                  <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                    No hay parcelas disponibles. Crea una parcela primero.
                  </p>
                ) : (
                  parcelas
                    .filter(p => {
                      if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
                      if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
                      if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
                      return true;
                    })
                    .map(p => (
                      <label 
                        key={p._id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0.5rem', 
                          cursor: 'pointer',
                          borderBottom: '1px solid hsl(var(--border))'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedParcelas.includes(p._id)}
                          onChange={() => handleParcelaSelection(p._id)}
                          style={{ marginRight: '0.75rem' }}
                          data-testid={`checkbox-parcela-${p._id}`}
                        />
                        <span>
                          <strong>{p.codigo_plantacion}</strong> - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.superficie_total} ha
                        </span>
                      </label>
                    ))
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                {selectedParcelas.length > 0 && (
                  <small style={{ color: 'hsl(var(--primary))' }}>
                    {selectedParcelas.length} parcela(s) seleccionada(s)
                  </small>
                )}
                {(parcelaSearch.proveedor || parcelaSearch.cultivo || parcelaSearch.campana) && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Mostrando {parcelas.filter(p => {
                      if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
                      if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
                      if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
                      return true;
                    }).length} de {parcelas.length} parcelas
                  </small>
                )}
              </div>
            </div>
            
            {/* Mostrar información heredada de la primera parcela seleccionada */}
            {selectedParcelasInfo && (
              <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos heredados (de la primera parcela):</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {selectedParcelasInfo.proveedor}</div>
                  <div><strong>Cultivo:</strong> {selectedParcelasInfo.cultivo}</div>
                  <div><strong>Campaña:</strong> {selectedParcelasInfo.campana}</div>
                  <div><strong>Finca:</strong> {selectedParcelasInfo.finca}</div>
                </div>
              </div>
            )}
            
            {/* Datos técnicos */}
            <div className="grid-2">
              {fieldsConfig.superficie_aplicacion && (
                <div className="form-group">
                  <label className="form-label">Superficie a Tratar (ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.superficie_aplicacion}
                    onChange={(e) => setFormData({...formData, superficie_aplicacion: e.target.value})}
                    required
                    data-testid="input-superficie-aplicacion"
                  />
                </div>
              )}
              
              {fieldsConfig.caldo_superficie && (
                <div className="form-group">
                  <label className="form-label">Caldo por Superficie (L/ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.caldo_superficie}
                    onChange={(e) => setFormData({...formData, caldo_superficie: e.target.value})}
                    placeholder="Litros por hectárea"
                    required
                    data-testid="input-caldo-superficie"
                  />
                </div>
              )}
            </div>
            
            {/* Aplicador y Máquina */}
            <div className="grid-2">
              {fieldsConfig.aplicador_nombre && (
                <div className="form-group">
                  <label className="form-label">Aplicador</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.aplicador_nombre}
                    onChange={(e) => setFormData({...formData, aplicador_nombre: e.target.value})}
                    placeholder="Nombre del aplicador"
                    data-testid="input-aplicador-nombre"
                  />
                </div>
              )}
              
              {fieldsConfig.maquina_id && (
                <div className="form-group">
                  <label className="form-label">Máquina</label>
                  <select
                    className="form-select"
                    value={formData.maquina_id}
                    onChange={(e) => setFormData({...formData, maquina_id: e.target.value})}
                    data-testid="select-maquina"
                  >
                    <option value="">-- Seleccionar máquina --</option>
                    {maquinaria.filter(m => m.estado === 'Operativo').map(m => (
                      <option key={m._id} value={m._id}>
                        {m.nombre} {m.tipo && `(${m.tipo})`} {m.matricula && `- ${m.matricula}`}
                      </option>
                    ))}
                  </select>
                  {maquinaria.length === 0 && (
                    <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                      No hay maquinaria registrada. Puedes añadirla desde el catálogo de Maquinaria.
                    </small>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-tratamiento">
                {editingId ? 'Actualizar Tratamiento' : 'Guardar Tratamiento'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Lista de Tratamientos ({filteredTratamientos.length})</h2>
        {loading ? (
          <p>Cargando tratamientos...</p>
        ) : filteredTratamientos.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay tratamientos que coincidan con los filtros' : 'No hay tratamientos registrados. Crea el primero!'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="tratamientos-table">
              <thead>
                <tr>
                  {tableConfig.tipo && <th>Tipo</th>}
                  {tableConfig.subtipo && <th>Subtipo</th>}
                  {tableConfig.metodo && <th>Método</th>}
                  {tableConfig.campana && <th>Campaña</th>}
                  {tableConfig.superficie && <th>Superficie</th>}
                  {tableConfig.parcelas && <th>Parcelas</th>}
                  {tableConfig.aplicador && <th>Aplicador</th>}
                  {tableConfig.maquina && <th>Máquina</th>}
                  {tableConfig.estado && <th>Estado</th>}
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTratamientos.map((tratamiento) => (
                  <tr key={tratamiento._id}>
                    {tableConfig.tipo && <td className="font-semibold">{tratamiento.tipo_tratamiento}</td>}
                    {tableConfig.subtipo && <td>{tratamiento.subtipo || '—'}</td>}
                    {tableConfig.metodo && <td>{tratamiento.metodo_aplicacion}</td>}
                    {tableConfig.campana && <td>{tratamiento.campana || 'N/A'}</td>}
                    {tableConfig.superficie && <td>{tratamiento.superficie_aplicacion} ha</td>}
                    {tableConfig.parcelas && <td>{tratamiento.parcelas_ids?.length || 0} parcela(s)</td>}
                    {tableConfig.aplicador && <td>{tratamiento.aplicador_nombre || '—'}</td>}
                    {tableConfig.maquina && <td>{tratamiento.maquina_nombre || '—'}</td>}
                    {tableConfig.estado && (
                      <td>
                        <span className={`badge ${tratamiento.realizado ? 'badge-success' : 'badge-default'}`}>
                          {tratamiento.realizado ? 'Realizado' : 'Pendiente'}
                        </span>
                      </td>
                    )}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(tratamiento)}
                              title="Editar tratamiento"
                              data-testid={`edit-tratamiento-${tratamiento._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(tratamiento._id)}
                              title="Eliminar tratamiento"
                              data-testid={`delete-tratamiento-${tratamiento._id}`}
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

export default Tratamientos;
