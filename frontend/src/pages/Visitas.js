import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Info, Filter, Settings, X } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Default field configuration
const DEFAULT_FIELDS_CONFIG = {
  objetivo: true,
  fecha_visita: true,
  parcela_id: true,
  observaciones: true,
  cuestionario_plagas: true
};

const FIELD_LABELS = {
  objetivo: 'Objetivo',
  fecha_visita: 'Fecha Visita',
  parcela_id: 'Parcela',
  observaciones: 'Observaciones',
  cuestionario_plagas: 'Cuest. Plagas'
};

// Cuestionario de Plagas y Enfermedades
const PLAGAS_ENFERMEDADES = [
  { key: 'trips', label: 'Trips' },
  { key: 'mosca_blanca', label: 'Mosca blanca' },
  { key: 'minador', label: 'Minador' },
  { key: 'arana_roja', label: 'Araña roja' },
  { key: 'oruga', label: 'Oruga' },
  { key: 'pulgon', label: 'Pulgón' },
  { key: 'botrytis', label: 'Botrytis' },
  { key: 'mildiu', label: 'Mildiu' },
  { key: 'oidio', label: 'Oídio' },
  { key: 'ascochyta', label: 'Ascochyta' }
];

const VALORES_CUESTIONARIO = [
  { value: 0, label: '0 - Sin presencia' },
  { value: 1, label: '1 - Presencia baja' },
  { value: 2, label: '2 - Presencia alta' }
];

// Table columns config
const DEFAULT_TABLE_CONFIG = {
  objetivo: true,
  parcela: true,
  proveedor: true,
  cultivo: true,
  campana: true,
  fecha: true,
  estado: true
};

const TABLE_LABELS = {
  objetivo: 'Objetivo',
  parcela: 'Parcela',
  proveedor: 'Proveedor',
  cultivo: 'Cultivo',
  campana: 'Campaña',
  fecha: 'Fecha',
  estado: 'Estado'
};

const Visitas = () => {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Solo necesitamos parcelas para el selector
  const [parcelas, setParcelas] = useState([]);
  const [selectedParcelaInfo, setSelectedParcelaInfo] = useState(null);
  
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
    parcela: ''
  });
  
  // Configuración de campos del formulario
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('visitas_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Configuración de columnas de la tabla
  const [tableConfig, setTableConfig] = useState(() => {
    const saved = localStorage.getItem('visitas_table_config');
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_CONFIG;
  });
  
  // Opciones únicas para filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: [],
    parcelas: []
  });
  
  // Form data SIMPLIFICADO - solo parcela_id es obligatorio
  const [formData, setFormData] = useState({
    objetivo: 'Control Rutinario',
    fecha_visita: '',
    parcela_id: '',
    observaciones: ''
  });
  
  // Estado para el cuestionario de plagas y enfermedades
  const [cuestionarioPlagas, setCuestionarioPlagas] = useState(() => {
    const initial = {};
    PLAGAS_ENFERMEDADES.forEach(p => {
      initial[p.key] = 0;
    });
    return initial;
  });
  
  useEffect(() => {
    fetchVisitas();
    fetchParcelas();
  }, []);
  
  // Extraer opciones únicas cuando cambian las visitas
  useEffect(() => {
    const proveedores = [...new Set(visitas.map(v => v.proveedor).filter(Boolean))];
    const cultivos = [...new Set(visitas.map(v => v.cultivo).filter(Boolean))];
    const campanas = [...new Set(visitas.map(v => v.campana).filter(Boolean))];
    const parcelasCodigos = [...new Set(visitas.map(v => v.codigo_plantacion).filter(Boolean))];
    
    setFilterOptions({
      proveedores,
      cultivos,
      campanas,
      parcelas: parcelasCodigos
    });
  }, [visitas]);
  
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
    localStorage.setItem('visitas_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  useEffect(() => {
    localStorage.setItem('visitas_table_config', JSON.stringify(tableConfig));
  }, [tableConfig]);
  
  // Cuando se selecciona una parcela, mostrar info heredada
  useEffect(() => {
    if (formData.parcela_id) {
      const parcela = parcelas.find(p => p._id === formData.parcela_id);
      setSelectedParcelaInfo(parcela || null);
    } else {
      setSelectedParcelaInfo(null);
    }
  }, [formData.parcela_id, parcelas]);
  
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
  
  const fetchVisitas = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/visitas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setVisitas(data.visitas || []);
    } catch (error) {
      console.error('Error fetching visitas:', error);
      const errorMsg = handlePermissionError(error, 'ver las visitas');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar visitas
  const filteredVisitas = visitas.filter(v => {
    if (filters.proveedor && v.proveedor !== filters.proveedor) return false;
    if (filters.cultivo && v.cultivo !== filters.cultivo) return false;
    if (filters.campana && v.campana !== filters.campana) return false;
    if (filters.parcela && v.codigo_plantacion !== filters.parcela) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ proveedor: '', cultivo: '', campana: '', parcela: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const toggleTableConfig = (field) => {
    setTableConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar solo parcela_id (obligatorio)
    if (!formData.parcela_id) {
      setError('Debe seleccionar una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/visitas/${editingId}`
        : `${BACKEND_URL}/api/visitas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Payload simplificado - el backend hereda el resto
      const payload = {
        objetivo: formData.objetivo,
        parcela_id: formData.parcela_id,
        fecha_visita: formData.fecha_visita,
        observaciones: formData.observaciones
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
        fetchVisitas();
        setFormData({
          objetivo: 'Control Rutinario',
          fecha_visita: '',
          parcela_id: '',
          observaciones: ''
        });
        setSelectedParcelaInfo(null);
        setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
      }
    } catch (error) {
      console.error('Error saving visita:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la visita' : 'crear la visita');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (visita) => {
    setEditingId(visita._id);
    setFormData({
      objetivo: visita.objetivo || 'Control Rutinario',
      fecha_visita: visita.fecha_visita || '',
      parcela_id: visita.parcela_id || '',
      observaciones: visita.observaciones || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setSelectedParcelaInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
    setFormData({
      objetivo: 'Control Rutinario',
      fecha_visita: '',
      parcela_id: '',
      observaciones: ''
    });
  };
  
  const handleDelete = async (visitaId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar visitas');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta visita?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/visitas/${visitaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchVisitas();
    } catch (error) {
      console.error('Error deleting visita:', error);
      const errorMsg = handlePermissionError(error, 'eliminar la visita');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="visitas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Visitas</h1>
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
            data-testid="btn-nueva-visita"
          >
            <Plus size={18} />
            Nueva Visita
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fieldsConfig[key]}
                    onChange={() => toggleFieldConfig(key)}
                    disabled={key === 'parcela_id'} // parcela_id siempre obligatorio
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label} {key === 'parcela_id' && '(obligatorio)'}</span>
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
            <label className="form-label">Parcela</label>
            <select
              className="form-select"
              value={filters.parcela}
              onChange={(e) => setFilters({...filters, parcela: e.target.value})}
              data-testid="filter-parcela"
            >
              <option value="">Todas</option>
              {filterOptions.parcelas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredVisitas.length} de {visitas.length} visitas
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="visita-form">
          <h2 className="card-title">{editingId ? 'Editar Visita' : 'Crear Visita'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Información del modelo simplificado */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                <Info size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Modelo simplificado:</strong> Solo selecciona la Parcela. El Contrato, Proveedor, Cultivo y Campaña se heredan automáticamente.
              </p>
            </div>
            
            <div className="grid-2">
              {fieldsConfig.objetivo && (
                <div className="form-group">
                  <label className="form-label">Objetivo *</label>
                  <select
                    className="form-select"
                    value={formData.objetivo}
                    onChange={(e) => setFormData({...formData, objetivo: e.target.value})}
                    required
                    data-testid="select-objetivo"
                  >
                    <option value="Control Rutinario">Control Rutinario</option>
                    <option value="Informe">Informe</option>
                    <option value="Evaluación">Evaluación</option>
                    <option value="Plagas y Enfermedades">Plagas y Enfermedades</option>
                    <option value="Cosecha">Cosecha</option>
                  </select>
                </div>
              )}
              
              {fieldsConfig.fecha_visita && (
                <div className="form-group">
                  <label className="form-label">Fecha Visita</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_visita}
                    onChange={(e) => setFormData({...formData, fecha_visita: e.target.value})}
                    data-testid="input-fecha-visita"
                  />
                </div>
              )}
            </div>
            
            {/* SELECTOR DE PARCELA CON BÚSQUEDA - Siempre visible (obligatorio) */}
            <div className="form-group">
              <label className="form-label">Parcela * (Obligatorio - define el contexto)</label>
              
              {/* Filtros de búsqueda de parcelas */}
              <div style={{ 
                backgroundColor: 'hsl(var(--muted))', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '0.75rem' 
              }}>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>
                  Buscar parcela por:
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
              
              {/* Selector de parcela filtrado */}
              <select
                className="form-select"
                value={formData.parcela_id}
                onChange={(e) => setFormData({...formData, parcela_id: e.target.value})}
                required
                data-testid="select-parcela"
              >
                <option value="">Seleccionar parcela...</option>
                {parcelas
                  .filter(p => {
                    if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
                    if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
                    if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
                    return true;
                  })
                  .map(p => (
                    <option key={p._id} value={p._id}>
                      {p.codigo_plantacion} - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.campana}
                    </option>
                  ))
                }
              </select>
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
            
            {/* Mostrar información heredada de la parcela seleccionada */}
            {selectedParcelaInfo && (
              <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos heredados de la parcela:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {selectedParcelaInfo.proveedor}</div>
                  <div><strong>Cultivo:</strong> {selectedParcelaInfo.cultivo}</div>
                  <div><strong>Variedad:</strong> {selectedParcelaInfo.variedad}</div>
                  <div><strong>Campaña:</strong> {selectedParcelaInfo.campana}</div>
                  <div><strong>Finca:</strong> {selectedParcelaInfo.finca}</div>
                  <div><strong>Superficie:</strong> {selectedParcelaInfo.superficie_total} ha</div>
                </div>
              </div>
            )}
            
            {fieldsConfig.observaciones && (
              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-textarea"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                  placeholder="Notas, incidencias observadas, recomendaciones..."
                  rows="4"
                  data-testid="textarea-observaciones"
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-visita">
                {editingId ? 'Actualizar Visita' : 'Guardar Visita'}
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
        <h2 className="card-title">Lista de Visitas ({filteredVisitas.length})</h2>
        {loading ? (
          <p>Cargando visitas...</p>
        ) : filteredVisitas.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay visitas que coincidan con los filtros' : 'No hay visitas registradas. Crea la primera!'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="visitas-table">
              <thead>
                <tr>
                  {tableConfig.objetivo && <th>Objetivo</th>}
                  {tableConfig.parcela && <th>Parcela</th>}
                  {tableConfig.proveedor && <th>Proveedor</th>}
                  {tableConfig.cultivo && <th>Cultivo</th>}
                  {tableConfig.campana && <th>Campaña</th>}
                  {tableConfig.fecha && <th>Fecha</th>}
                  {tableConfig.estado && <th>Estado</th>}
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVisitas.map((visita) => (
                  <tr key={visita._id}>
                    {tableConfig.objetivo && <td className="font-semibold">{visita.objetivo}</td>}
                    {tableConfig.parcela && <td>{visita.codigo_plantacion || 'N/A'}</td>}
                    {tableConfig.proveedor && <td>{visita.proveedor || 'N/A'}</td>}
                    {tableConfig.cultivo && <td>{visita.cultivo || 'N/A'}</td>}
                    {tableConfig.campana && <td>{visita.campana || 'N/A'}</td>}
                    {tableConfig.fecha && <td>{visita.fecha_visita ? new Date(visita.fecha_visita).toLocaleDateString() : 'Sin fecha'}</td>}
                    {tableConfig.estado && (
                      <td>
                        <span className={`badge ${visita.realizado ? 'badge-success' : 'badge-default'}`}>
                          {visita.realizado ? 'Realizada' : 'Pendiente'}
                        </span>
                      </td>
                    )}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(visita)}
                              title="Editar visita"
                              data-testid={`edit-visita-${visita._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(visita._id)}
                              title="Eliminar visita"
                              data-testid={`delete-visita-${visita._id}`}
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

export default Visitas;
