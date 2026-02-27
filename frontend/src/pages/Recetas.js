import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Settings, X, FileText, Beaker, Calculator, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';


// Tipos de tratamiento
const TIPOS_TRATAMIENTO = [
  'Fitosanitario',
  'Nutricional', 
  'Herbicida',
  'Fungicida',
  'Insecticida',
  'Acaricida',
  'Regulador de crecimiento',
  'Otro'
];

// Unidades de dosis
const UNIDADES_DOSIS = ['kg/ha', 'L/ha', 'g/ha', 'mL/ha', 'cc/ha'];

// Configuración de campos
const DEFAULT_FIELDS_CONFIG = {
  nombre: true,
  cultivo_objetivo: true,
  tipo_tratamiento: true,
  productos: true,
  plazo_seguridad: true,
  instrucciones: true,
  activa: true
};

const FIELD_LABELS = {
  nombre: 'Nombre',
  cultivo_objetivo: 'Cultivo Objetivo',
  tipo_tratamiento: 'Tipo de Tratamiento',
  productos: 'Productos',
  plazo_seguridad: 'Plazo Seguridad',
  instrucciones: 'Instrucciones',
  activa: 'Estado'
};

const Recetas = () => {
  const { t } = useTranslation();
  const [recetas, setRecetas] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Stats
  const [stats, setStats] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    cultivo_objetivo: '',
    tipo_tratamiento: '',
    nombre: '',
    activa: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('recetas_fields_config_v2');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones de filtros
  const [filterOptions, setFilterOptions] = useState({
    cultivos: [],
    tipos: []
  });
  
  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    cultivo_objetivo: '',
    tipo_tratamiento: 'Fitosanitario',
    objetivo_tratamiento: '',
    productos: [],
    plazo_seguridad: 0,
    instrucciones: '',
    ppe_requerido: '',
    epoca_aplicacion: '',
    condiciones_aplicacion: '',
    intervalo_aplicaciones: '',
    max_aplicaciones: '',
    activa: true
  });
  
  // Producto en edición
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre_comercial: '',
    materia_activa: '',
    num_registro: '',
    dosis: '',
    unidad: 'L/ha',
    plazo_seguridad: '',
    objetivo: ''
  });
  
  // Calculadora de dosis
  const [showCalculadora, setShowCalculadora] = useState(false);
  const [recetaCalculo, setRecetaCalculo] = useState(null);
  const [superficieCalculo, setSuperficieCalculo] = useState('');
  const [resultadoCalculo, setResultadoCalculo] = useState(null);
  
  // Modal de detalle
  const [viewingReceta, setViewingReceta] = useState(null);
  
  useEffect(() => {
    fetchRecetas();
    fetchCultivos();
    fetchStats();
  }, []);
  
  useEffect(() => {
    const cultivosUnicos = [...new Set(recetas.map(r => r.cultivo_objetivo).filter(Boolean))];
    const tiposUnicos = [...new Set(recetas.map(r => r.tipo_tratamiento).filter(Boolean))];
    setFilterOptions({ cultivos: cultivosUnicos, tipos: tiposUnicos });
  }, [recetas]);
  
  useEffect(() => {
    localStorage.setItem('recetas_fields_config_v2', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/recetas/stats/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
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
    if (filters.tipo_tratamiento && r.tipo_tratamiento !== filters.tipo_tratamiento) return false;
    if (filters.nombre && !r.nombre?.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
    if (filters.activa === 'true' && r.activa === false) return false;
    if (filters.activa === 'false' && r.activa !== false) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ cultivo_objetivo: '', tipo_tratamiento: '', nombre: '', activa: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const resetForm = () => {
    setFormData({
      nombre: '',
      cultivo_objetivo: '',
      tipo_tratamiento: 'Fitosanitario',
      objetivo_tratamiento: '',
      productos: [],
      plazo_seguridad: 0,
      instrucciones: '',
      ppe_requerido: '',
      epoca_aplicacion: '',
      condiciones_aplicacion: '',
      intervalo_aplicaciones: '',
      max_aplicaciones: '',
      activa: true
    });
    setNuevoProducto({
      nombre_comercial: '',
      materia_activa: '',
      num_registro: '',
      dosis: '',
      unidad: 'L/ha',
      plazo_seguridad: '',
      objetivo: ''
    });
  };
  
  const addProducto = () => {
    if (!nuevoProducto.nombre_comercial || !nuevoProducto.materia_activa || !nuevoProducto.dosis) {
      setError('Complete los campos obligatorios del producto: Nombre comercial, Materia activa y Dosis');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      productos: [...prev.productos, {
        ...nuevoProducto,
        dosis: parseFloat(nuevoProducto.dosis),
        plazo_seguridad: nuevoProducto.plazo_seguridad ? parseInt(nuevoProducto.plazo_seguridad) : 0
      }]
    }));
    
    setNuevoProducto({
      nombre_comercial: '',
      materia_activa: '',
      num_registro: '',
      dosis: '',
      unidad: 'L/ha',
      plazo_seguridad: '',
      objetivo: ''
    });
  };
  
  const removeProducto = (index) => {
    setFormData(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/recetas/${editingId}`
        : `${BACKEND_URL}/api/recetas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Calcular plazo de seguridad máximo de productos
      const maxPlazoProductos = formData.productos.length > 0 
        ? Math.max(...formData.productos.map(p => p.plazo_seguridad || 0))
        : 0;
      
      const payload = {
        ...formData,
        plazo_seguridad: Math.max(parseInt(formData.plazo_seguridad) || 0, maxPlazoProductos),
        intervalo_aplicaciones: formData.intervalo_aplicaciones ? parseInt(formData.intervalo_aplicaciones) : null,
        max_aplicaciones: formData.max_aplicaciones ? parseInt(formData.max_aplicaciones) : null
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
        fetchStats();
        resetForm();
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
      tipo_tratamiento: receta.tipo_tratamiento || 'Fitosanitario',
      objetivo_tratamiento: receta.objetivo_tratamiento || '',
      productos: receta.productos || [],
      plazo_seguridad: receta.plazo_seguridad || 0,
      instrucciones: receta.instrucciones || '',
      ppe_requerido: receta.ppe_requerido || '',
      epoca_aplicacion: receta.epoca_aplicacion || '',
      condiciones_aplicacion: receta.condiciones_aplicacion || '',
      intervalo_aplicaciones: receta.intervalo_aplicaciones || '',
      max_aplicaciones: receta.max_aplicaciones || '',
      activa: receta.activa !== false
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    resetForm();
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
      fetchStats();
    } catch (error) {
      console.error('Error deleting receta:', error);
      const errorMsg = handlePermissionError(error, 'eliminar la receta');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Calculadora de dosis
  const calcularDosis = async () => {
    if (!recetaCalculo || !superficieCalculo) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/recetas/${recetaCalculo._id}/calcular-dosis?superficie=${superficieCalculo}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResultadoCalculo(data);
      }
    } catch (error) {
      console.error('Error calculando dosis:', error);
    }
  };
  
  const openCalculadora = (receta) => {
    setRecetaCalculo(receta);
    setSuperficieCalculo('');
    setResultadoCalculo(null);
    setShowCalculadora(true);
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;
  
  return (
    <div data-testid="recetas-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Beaker size={28} /> Recetas Fitosanitarias
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
            onClick={() => { resetForm(); setShowForm(!showForm); }}
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
      
      {/* KPIs Dashboard */}
      {stats && (
        <div className="stats-grid-horizontal" style={{ marginBottom: '1.5rem' }} data-testid="recetas-kpis">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <FileText size={20} style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.total}</p>
              <p className="stat-label">Total Recetas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(142, 76%, 95%)' }}>
              <CheckCircle size={20} style={{ color: 'hsl(142, 76%, 36%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.activas}</p>
              <p className="stat-label">Activas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(0, 84%, 95%)' }}>
              <XCircle size={20} style={{ color: 'hsl(0, 84%, 60%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.inactivas}</p>
              <p className="stat-label">Inactivas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(38, 92%, 95%)' }}>
              <Package size={20} style={{ color: 'hsl(38, 92%, 50%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.promedio_productos}</p>
              <p className="stat-label">Productos/Receta</p>
            </div>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={18} /> Filtros
            </h3>
            {activeFiltersCount > 0 && (
              <span className="badge badge-primary">{activeFiltersCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {hasActiveFilters && (
              <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Limpiar</button>
            )}
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAdvancedFilters ? 'Menos' : 'Más'}
            </button>
          </div>
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
            <label className="form-label">Cultivo</label>
            <select className="form-select" value={filters.cultivo_objetivo} onChange={(e) => setFilters({...filters, cultivo_objetivo: e.target.value})} data-testid="filter-cultivo">
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {showAdvancedFilters && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo</label>
                <select className="form-select" value={filters.tipo_tratamiento} onChange={(e) => setFilters({...filters, tipo_tratamiento: e.target.value})} data-testid="filter-tipo">
                  <option value="">Todos</option>
                  {TIPOS_TRATAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Estado</label>
                <select className="form-select" value={filters.activa} onChange={(e) => setFilters({...filters, activa: e.target.value})} data-testid="filter-activa">
                  <option value="">Todos</option>
                  <option value="true">Activas</option>
                  <option value="false">Inactivas</option>
                </select>
              </div>
            </>
          )}
        </div>
        
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredRecetas.length} de {recetas.length} recetas
          </p>
        )}
      </div>
      
      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="receta-form">
          <h2 className="card-title">{editingId ? 'Editar Receta' : 'Nueva Receta'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Datos básicos */}
            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre de la Receta *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                  required 
                  placeholder="Ej: Tratamiento anti-pulgón primaveral"
                  data-testid="input-nombre" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cultivo Objetivo *</label>
                <select 
                  className="form-select" 
                  value={formData.cultivo_objetivo} 
                  onChange={(e) => setFormData({...formData, cultivo_objetivo: e.target.value})} 
                  required 
                  data-testid="select-cultivo"
                >
                  <option value="">Seleccionar cultivo...</option>
                  {cultivos.map(c => <option key={c._id} value={c.nombre}>{c.nombre}</option>)}
                  {formData.cultivo_objetivo && !cultivos.find(c => c.nombre === formData.cultivo_objetivo) && (
                    <option value={formData.cultivo_objetivo}>{formData.cultivo_objetivo}</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Tratamiento</label>
                <select 
                  className="form-select" 
                  value={formData.tipo_tratamiento} 
                  onChange={(e) => setFormData({...formData, tipo_tratamiento: e.target.value})}
                  data-testid="select-tipo"
                >
                  {TIPOS_TRATAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Objetivo (Plaga/Enfermedad)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.objetivo_tratamiento} 
                  onChange={(e) => setFormData({...formData, objetivo_tratamiento: e.target.value})} 
                  placeholder="Ej: Pulgón negro, Oídio..."
                  data-testid="input-objetivo" 
                />
              </div>
            </div>
            
            {/* Sección de productos */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: '0.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} /> Productos Fitosanitarios
              </h3>
              
              {/* Lista de productos añadidos */}
              {formData.productos.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Producto</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Materia Activa</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Dosis</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>P.S.</th>
                        <th style={{ padding: '0.5rem' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.productos.map((p, i) => (
                        <tr key={i} style={{ backgroundColor: 'white' }}>
                          <td style={{ padding: '0.5rem', fontWeight: '500' }}>{p.nombre_comercial}</td>
                          <td style={{ padding: '0.5rem' }}>{p.materia_activa}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.dosis} {p.unidad}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{p.plazo_seguridad || 0}d</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button type="button" className="btn btn-sm btn-error" onClick={() => removeProducto(i)}>
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Formulario para añadir producto */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Nombre Comercial *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={nuevoProducto.nombre_comercial}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, nombre_comercial: e.target.value})}
                    placeholder="Ej: Confidor"
                    data-testid="input-producto-nombre"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Materia Activa *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={nuevoProducto.materia_activa}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, materia_activa: e.target.value})}
                    placeholder="Ej: Imidacloprid"
                    data-testid="input-producto-materia"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Dosis *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-input" 
                    value={nuevoProducto.dosis}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, dosis: e.target.value})}
                    placeholder="0.5"
                    data-testid="input-producto-dosis"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Unidad</label>
                  <select 
                    className="form-select" 
                    value={nuevoProducto.unidad}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, unidad: e.target.value})}
                    data-testid="select-producto-unidad"
                  >
                    {UNIDADES_DOSIS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>P.S. (días)</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-input" 
                    value={nuevoProducto.plazo_seguridad}
                    onChange={(e) => setNuevoProducto({...nuevoProducto, plazo_seguridad: e.target.value})}
                    placeholder="14"
                    data-testid="input-producto-ps"
                  />
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={addProducto}
                  data-testid="btn-add-producto"
                >
                  <Plus size={16} /> Añadir
                </button>
              </div>
            </div>
            
            {/* Información adicional */}
            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Plazo de Seguridad Máximo (días)</label>
                <input 
                  type="number" 
                  min="0" 
                  className="form-input" 
                  value={formData.plazo_seguridad} 
                  onChange={(e) => setFormData({...formData, plazo_seguridad: e.target.value})} 
                  data-testid="input-plazo" 
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Se calcula automáticamente del máximo de los productos</small>
              </div>
              <div className="form-group">
                <label className="form-label">EPP Requerido</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.ppe_requerido} 
                  onChange={(e) => setFormData({...formData, ppe_requerido: e.target.value})} 
                  placeholder="Guantes, mascarilla, gafas..."
                  data-testid="input-epp" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Época de Aplicación</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.epoca_aplicacion} 
                  onChange={(e) => setFormData({...formData, epoca_aplicacion: e.target.value})} 
                  placeholder="Ej: Primavera, antes de floración..."
                  data-testid="input-epoca" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Condiciones de Aplicación</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.condiciones_aplicacion} 
                  onChange={(e) => setFormData({...formData, condiciones_aplicacion: e.target.value})} 
                  placeholder="Ej: Temp. < 25°C, sin viento..."
                  data-testid="input-condiciones" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Intervalo entre Aplicaciones (días)</label>
                <input 
                  type="number" 
                  min="0"
                  className="form-input" 
                  value={formData.intervalo_aplicaciones} 
                  onChange={(e) => setFormData({...formData, intervalo_aplicaciones: e.target.value})} 
                  data-testid="input-intervalo" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Máx. Aplicaciones/Campaña</label>
                <input 
                  type="number" 
                  min="1"
                  className="form-input" 
                  value={formData.max_aplicaciones} 
                  onChange={(e) => setFormData({...formData, max_aplicaciones: e.target.value})} 
                  data-testid="input-max-aplicaciones" 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Instrucciones de Aplicación</label>
              <textarea 
                className="form-textarea" 
                rows="3" 
                value={formData.instrucciones} 
                onChange={(e) => setFormData({...formData, instrucciones: e.target.value})} 
                placeholder="Método de aplicación, precauciones, observaciones..."
                data-testid="textarea-instrucciones" 
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.activa}
                  onChange={(e) => setFormData({...formData, activa: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                  data-testid="checkbox-activa"
                />
                <span>Receta activa</span>
              </label>
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">
                {editingId ? 'Actualizar' : 'Guardar'} Receta
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
      
      {/* Lista de recetas */}
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
                  {fieldsConfig.nombre && <th>Nombre</th>}
                  {fieldsConfig.cultivo_objetivo && <th>Cultivo</th>}
                  {fieldsConfig.tipo_tratamiento && <th>Tipo</th>}
                  {fieldsConfig.productos && <th>Productos</th>}
                  {fieldsConfig.plazo_seguridad && <th>P.S.</th>}
                  {fieldsConfig.activa && <th>Estado</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecetas.map((receta) => (
                  <tr key={receta._id}>
                    {fieldsConfig.nombre && (
                      <td>
                        <span className="font-semibold" style={{ cursor: 'pointer', color: 'hsl(var(--primary))' }} onClick={() => setViewingReceta(receta)}>
                          {receta.nombre}
                        </span>
                        {receta.objetivo_tratamiento && (
                          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                            {receta.objetivo_tratamiento}
                          </p>
                        )}
                      </td>
                    )}
                    {fieldsConfig.cultivo_objetivo && (
                      <td><span className="badge badge-default">{receta.cultivo_objetivo}</span></td>
                    )}
                    {fieldsConfig.tipo_tratamiento && (
                      <td><span className="badge badge-secondary">{receta.tipo_tratamiento || 'Fitosanitario'}</span></td>
                    )}
                    {fieldsConfig.productos && (
                      <td>
                        <span className="badge" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                          <Package size={12} style={{ marginRight: '4px' }} />
                          {receta.productos?.length || 0}
                        </span>
                      </td>
                    )}
                    {fieldsConfig.plazo_seguridad && (
                      <td>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          backgroundColor: receta.plazo_seguridad > 14 ? 'hsl(0, 84%, 95%)' : receta.plazo_seguridad > 7 ? 'hsl(38, 92%, 95%)' : 'hsl(142, 76%, 95%)',
                          color: receta.plazo_seguridad > 14 ? 'hsl(0, 84%, 40%)' : receta.plazo_seguridad > 7 ? 'hsl(38, 92%, 40%)' : 'hsl(142, 76%, 30%)',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          {receta.plazo_seguridad}d
                        </span>
                      </td>
                    )}
                    {fieldsConfig.activa && (
                      <td>
                        {receta.activa !== false ? (
                          <span className="badge" style={{ backgroundColor: 'hsl(142, 76%, 95%)', color: 'hsl(142, 76%, 36%)' }}>
                            <CheckCircle size={12} style={{ marginRight: '4px' }} /> Activa
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'hsl(0, 84%, 95%)', color: 'hsl(0, 84%, 60%)' }}>
                            <XCircle size={12} style={{ marginRight: '4px' }} /> Inactiva
                          </span>
                        )}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => setViewingReceta(receta)} 
                          title="Ver detalle"
                          data-testid={`view-receta-${receta._id}`}
                        >
                          <FileText size={14} />
                        </button>
                        {receta.productos?.length > 0 && (
                          <button 
                            className="btn btn-sm" 
                            style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}
                            onClick={() => openCalculadora(receta)} 
                            title="Calculadora de dosis"
                            data-testid={`calc-receta-${receta._id}`}
                          >
                            <Calculator size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button 
                            className="btn btn-sm btn-secondary" 
                            onClick={() => handleEdit(receta)} 
                            title="Editar"
                            data-testid={`edit-receta-${receta._id}`}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            className="btn btn-sm btn-error" 
                            onClick={() => handleDelete(receta._id)} 
                            title="Eliminar"
                            data-testid={`delete-receta-${receta._id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal de Detalle */}
      {viewingReceta && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={() => setViewingReceta(null)}
          data-testid="modal-detalle-receta"
        >
          <div 
            className="card"
            style={{ maxWidth: '700px', width: '90%', maxHeight: '85vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0 }}>{viewingReceta.nombre}</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setViewingReceta(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Cultivo</label>
                <p style={{ fontWeight: '500' }}>{viewingReceta.cultivo_objetivo}</p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Tipo</label>
                <p><span className="badge badge-secondary">{viewingReceta.tipo_tratamiento || 'Fitosanitario'}</span></p>
              </div>
              {viewingReceta.objetivo_tratamiento && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Objetivo</label>
                  <p>{viewingReceta.objetivo_tratamiento}</p>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Plazo Seguridad</label>
                <p><strong>{viewingReceta.plazo_seguridad}</strong> días</p>
              </div>
            </div>
            
            {viewingReceta.productos?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} /> Productos ({viewingReceta.productos.length})
                </h4>
                <div className="table-container">
                  <table style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Materia Activa</th>
                        <th style={{ textAlign: 'right' }}>Dosis</th>
                        <th style={{ textAlign: 'right' }}>P.S.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingReceta.productos.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '500' }}>{p.nombre_comercial}</td>
                          <td>{p.materia_activa}</td>
                          <td style={{ textAlign: 'right' }}>{p.dosis} {p.unidad}</td>
                          <td style={{ textAlign: 'right' }}>{p.plazo_seguridad || 0}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {viewingReceta.instrucciones && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Instrucciones</label>
                <p style={{ whiteSpace: 'pre-wrap' }}>{viewingReceta.instrucciones}</p>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {viewingReceta.ppe_requerido && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>EPP Requerido</label>
                  <p>{viewingReceta.ppe_requerido}</p>
                </div>
              )}
              {viewingReceta.epoca_aplicacion && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Época</label>
                  <p>{viewingReceta.epoca_aplicacion}</p>
                </div>
              )}
              {viewingReceta.condiciones_aplicacion && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Condiciones</label>
                  <p>{viewingReceta.condiciones_aplicacion}</p>
                </div>
              )}
              {viewingReceta.max_aplicaciones && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Máx. Aplicaciones</label>
                  <p>{viewingReceta.max_aplicaciones} por campaña</p>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              {viewingReceta.productos?.length > 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={() => { setViewingReceta(null); openCalculadora(viewingReceta); }}
                >
                  <Calculator size={16} /> Calcular Dosis
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setViewingReceta(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Calculadora de Dosis */}
      {showCalculadora && recetaCalculo && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={() => setShowCalculadora(false)}
          data-testid="modal-calculadora"
        >
          <div 
            className="card"
            style={{ maxWidth: '550px', width: '90%', maxHeight: '85vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={24} /> Calculadora de Dosis
              </h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowCalculadora(false)}>
                <X size={16} />
              </button>
            </div>
            
            <p style={{ marginBottom: '1rem', color: 'hsl(var(--muted-foreground))' }}>
              Receta: <strong>{recetaCalculo.nombre}</strong>
            </p>
            
            <div className="form-group">
              <label className="form-label">Superficie a tratar (ha)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="form-input" 
                  value={superficieCalculo}
                  onChange={(e) => setSuperficieCalculo(e.target.value)}
                  placeholder="Ej: 5.5"
                  data-testid="input-superficie-calculo"
                />
                <button 
                  className="btn btn-primary"
                  onClick={calcularDosis}
                  disabled={!superficieCalculo}
                  data-testid="btn-calcular"
                >
                  Calcular
                </button>
              </div>
            </div>
            
            {resultadoCalculo && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'hsl(var(--primary) / 0.05)', borderRadius: '0.5rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>
                  Cantidades para {resultadoCalculo.superficie_ha} ha
                </h4>
                
                <div className="table-container">
                  <table style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style={{ textAlign: 'right' }}>Dosis/ha</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoCalculo.productos.map((p, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{p.nombre_comercial}</strong>
                            <br />
                            <small style={{ color: 'hsl(var(--muted-foreground))' }}>{p.materia_activa}</small>
                          </td>
                          <td style={{ textAlign: 'right' }}>{p.dosis_por_ha} {p.unidad}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', fontSize: '1rem', color: 'hsl(var(--primary))' }}>
                            {p.cantidad_total} {p.unidad.replace('/ha', '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'hsl(38, 92%, 95%)', borderRadius: '0.375rem' }}>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(38, 92%, 40%)' }}>
                    <AlertTriangle size={18} />
                    <strong>Plazo de seguridad:</strong> {resultadoCalculo.plazo_seguridad_max} días
                  </p>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCalculadora(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recetas;
