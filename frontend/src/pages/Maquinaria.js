import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Settings, X, Cog, Upload, Image, Eye } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos del formulario
const DEFAULT_FIELDS_CONFIG = {
  nombre: true,
  tipo: true,
  marca: true,
  modelo: true,
  matricula: true,
  num_serie: true,
  año_fabricacion: true,
  capacidad: true,
  estado: true,
  observaciones: true,
  imagen_placa_ce: true
};

const FIELD_LABELS = {
  nombre: 'Nombre',
  tipo: 'Tipo',
  marca: 'Marca',
  modelo: 'Modelo',
  matricula: 'Matrícula',
  num_serie: 'Nº Serie',
  año_fabricacion: 'Año Fabricación',
  capacidad: 'Capacidad',
  estado: 'Estado',
  observaciones: 'Observaciones',
  imagen_placa_ce: 'Imagen Placa CE'
};

// Configuración de columnas de la tabla
const DEFAULT_TABLE_CONFIG = {
  nombre: true,
  tipo: true,
  marca: true,
  modelo: true,
  matricula: true,
  estado: true,
  imagen_placa_ce: true
};

const TABLE_LABELS = {
  nombre: 'Nombre',
  tipo: 'Tipo',
  marca: 'Marca',
  modelo: 'Modelo',
  matricula: 'Matrícula',
  estado: 'Estado',
  imagen_placa_ce: 'Placa CE'
};

// Tipos de maquinaria predefinidos
const TIPOS_MAQUINARIA = [
  'Tractor',
  'Pulverizador',
  'Cosechadora',
  'Sembradora',
  'Arado',
  'Cultivador',
  'Remolque',
  'Cuba de tratamientos',
  'Atomizador',
  'Abonadora',
  'Empacadora',
  'Segadora',
  'Otro'
];

const ESTADOS_MAQUINARIA = [
  'Operativo',
  'En mantenimiento',
  'Averiado',
  'Fuera de servicio'
];

const Maquinaria = () => {
  const { t } = useTranslation();
  const [maquinaria, setMaquinaria] = useState([]);
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
    estado: ''
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('maquinaria_fields_config');
    if (saved) {
      // Fusionar con defaults para incluir campos nuevos
      return { ...DEFAULT_FIELDS_CONFIG, ...JSON.parse(saved) };
    }
    return DEFAULT_FIELDS_CONFIG;
  });
  
  // Configuración de columnas de tabla
  const [tableConfig, setTableConfig] = useState(() => {
    const saved = localStorage.getItem('maquinaria_table_config');
    if (saved) {
      // Fusionar con defaults para incluir columnas nuevas
      return { ...DEFAULT_TABLE_CONFIG, ...JSON.parse(saved) };
    }
    return DEFAULT_TABLE_CONFIG;
  });
  
  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Tractor',
    marca: '',
    modelo: '',
    matricula: '',
    num_serie: '',
    año_fabricacion: '',
    capacidad: '',
    estado: 'Operativo',
    observaciones: ''
  });
  
  // Estado para imagen de placa CE
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  
  useEffect(() => {
    fetchMaquinaria();
  }, []);
  
  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('maquinaria_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  useEffect(() => {
    localStorage.setItem('maquinaria_table_config', JSON.stringify(tableConfig));
  }, [tableConfig]);
  
  const fetchMaquinaria = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/maquinaria`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setMaquinaria(data.maquinaria || []);
    } catch (error) {
      console.error('Error fetching maquinaria:', error);
      const errorMsg = handlePermissionError(error, 'ver la maquinaria');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar maquinaria
  const filteredMaquinaria = maquinaria.filter(m => {
    if (filters.tipo && m.tipo !== filters.tipo) return false;
    if (filters.estado && m.estado !== filters.estado) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ tipo: '', estado: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const toggleTableConfig = (field) => {
    setTableConfig(prev => ({ ...prev, [field]: !prev[field] }));
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
        ? `${BACKEND_URL}/api/maquinaria/${editingId}`
        : `${BACKEND_URL}/api/maquinaria`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        año_fabricacion: formData.año_fabricacion ? parseInt(formData.año_fabricacion) : null
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
      console.log('Save maquinaria response:', data);
      if (data.success) {
        // Si hay imagen seleccionada, subirla
        const maquinariaId = data.data._id || editingId;
        console.log('Maquinaria saved, ID:', maquinariaId, 'Has selected image:', !!selectedImage);
        if (selectedImage && maquinariaId) {
          console.log('Starting image upload...');
          await uploadImage(maquinariaId);
        }
        
        setShowForm(false);
        setEditingId(null);
        fetchMaquinaria();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving maquinaria:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la maquinaria' : 'crear la maquinaria');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const resetForm = () => {
    setFormData({
      nombre: '',
      tipo: 'Tractor',
      marca: '',
      modelo: '',
      matricula: '',
      num_serie: '',
      año_fabricacion: '',
      capacidad: '',
      estado: 'Operativo',
      observaciones: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
  };
  
  // Estado para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  
  // Funciones para manejo de imagen de placa CE
  const validateAndSetImage = (file) => {
    if (!file) return false;
    
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no permitido. Use JPEG, PNG o WEBP');
      setTimeout(() => setError(null), 5000);
      return false;
    }
    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo de 10MB');
      setTimeout(() => setError(null), 5000);
      return false;
    }
    
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    return true;
  };
  
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    validateAndSetImage(file);
  };
  
  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetImage(files[0]);
    }
  };
  
  const uploadImage = async (maquinariaId) => {
    if (!selectedImage) {
      console.log('No image selected for upload');
      return;
    }
    
    console.log('Uploading image for maquinaria:', maquinariaId);
    console.log('Selected image:', selectedImage.name, selectedImage.type, selectedImage.size);
    
    setUploadingImage(true);
    try {
      const formDataImage = new FormData();
      formDataImage.append('file', selectedImage);
      
      console.log('Sending upload request to:', `${BACKEND_URL}/api/maquinaria/${maquinariaId}/imagen-placa-ce`);
      
      const response = await fetch(`${BACKEND_URL}/api/maquinaria/${maquinariaId}/imagen-placa-ce`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataImage
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        throw { status: response.status, message: errorData.detail };
      }
      
      const result = await response.json();
      console.log('Upload success:', result);
      return result;
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Error al subir la imagen de la placa CE');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingImage(false);
    }
  };
  
  const deleteImage = async (maquinariaId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar la imagen de la placa CE?')) {
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/maquinaria/${maquinariaId}/imagen-placa-ce`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchMaquinaria();
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('Error al eliminar la imagen');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const viewImage = (item) => {
    // Usar la URL directa del campo imagen_placa_ce_url
    let url = item.imagen_placa_ce_url;
    if (url) {
      // Si la URL es relativa, añadir el BACKEND_URL
      if (url.startsWith('/api/uploads/')) {
        url = `${BACKEND_URL}${url}`;
      } else if (url.startsWith('/app/uploads/')) {
        // Convertir rutas absolutas del sistema a URLs web
        url = `${BACKEND_URL}/api/uploads${url.replace('/app/uploads', '')}`;
      }
    } else {
      // Fallback al endpoint de API
      url = `${BACKEND_URL}/api/maquinaria/${item._id}/imagen-placa-ce`;
    }
    setModalImageUrl(url);
    setShowImageModal(true);
  };
  
  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      nombre: item.nombre || '',
      tipo: item.tipo || 'Tractor',
      marca: item.marca || '',
      modelo: item.modelo || '',
      matricula: item.matricula || '',
      num_serie: item.num_serie || '',
      año_fabricacion: item.año_fabricacion || '',
      capacidad: item.capacidad || '',
      estado: item.estado || 'Operativo',
      observaciones: item.observaciones || ''
    });
    // Si tiene imagen, mostrar preview
    if (item.imagen_placa_ce_url) {
      setImagePreview(`${BACKEND_URL}/api/maquinaria/${item._id}/imagen-placa-ce`);
    } else {
      setImagePreview(null);
    }
    setSelectedImage(null);
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    resetForm();
  };
  
  const handleDelete = async (id) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar maquinaria');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta maquinaria?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/maquinaria/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchMaquinaria();
    } catch (error) {
      console.error('Error deleting maquinaria:', error);
      const errorMsg = handlePermissionError(error, 'eliminar la maquinaria');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  // Obtener opciones únicas de los datos
  const tiposUnicos = [...new Set(maquinaria.map(m => m.tipo).filter(Boolean))];
  const estadosUnicos = [...new Set(maquinaria.map(m => m.estado).filter(Boolean))];
  
  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Operativo': return 'badge-success';
      case 'En mantenimiento': return 'badge-warning';
      case 'Averiado': return 'badge-error';
      default: return 'badge-default';
    }
  };
  
  return (
    <div data-testid="maquinaria-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Maquinaria</h1>
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
            data-testid="btn-nueva-maquinaria"
          >
            <Plus size={18} />
            Nueva Maquinaria
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
                    disabled={key === 'nombre' || key === 'tipo'}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label} {(key === 'nombre' || key === 'tipo') && '(obligatorio)'}</span>
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
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={filters.tipo}
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
              data-testid="filter-tipo"
            >
              <option value="">Todos</option>
              {(tiposUnicos.length > 0 ? tiposUnicos : TIPOS_MAQUINARIA).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filters.estado}
              onChange={(e) => setFilters({...filters, estado: e.target.value})}
              data-testid="filter-estado"
            >
              <option value="">Todos</option>
              {(estadosUnicos.length > 0 ? estadosUnicos : ESTADOS_MAQUINARIA).map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredMaquinaria.length} de {maquinaria.length} maquinaria
          </p>
        )}
      </div>
      
      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="maquinaria-form">
          <h2 className="card-title">{editingId ? 'Editar Maquinaria' : 'Nueva Maquinaria'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              {/* Nombre - siempre visible */}
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej: Tractor principal, Cuba 1000L"
                  required
                  data-testid="input-nombre"
                />
              </div>
              
              {/* Tipo - siempre visible */}
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  required
                  data-testid="select-tipo"
                >
                  {TIPOS_MAQUINARIA.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              {fieldsConfig.marca && (
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.marca}
                    onChange={(e) => setFormData({...formData, marca: e.target.value})}
                    placeholder="Ej: John Deere, New Holland"
                    data-testid="input-marca"
                  />
                </div>
              )}
              
              {fieldsConfig.modelo && (
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.modelo}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                    placeholder="Ej: 6150M"
                    data-testid="input-modelo"
                  />
                </div>
              )}
              
              {fieldsConfig.matricula && (
                <div className="form-group">
                  <label className="form-label">Matrícula</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.matricula}
                    onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                    placeholder="Ej: 1234-ABC"
                    data-testid="input-matricula"
                  />
                </div>
              )}
              
              {fieldsConfig.num_serie && (
                <div className="form-group">
                  <label className="form-label">Nº Serie</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.num_serie}
                    onChange={(e) => setFormData({...formData, num_serie: e.target.value})}
                    data-testid="input-num-serie"
                  />
                </div>
              )}
              
              {fieldsConfig.año_fabricacion && (
                <div className="form-group">
                  <label className="form-label">Año Fabricación</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="form-input"
                    value={formData.año_fabricacion}
                    onChange={(e) => setFormData({...formData, año_fabricacion: e.target.value})}
                    placeholder="Ej: 2020"
                    data-testid="input-año"
                  />
                </div>
              )}
              
              {fieldsConfig.capacidad && (
                <div className="form-group">
                  <label className="form-label">Capacidad</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({...formData, capacidad: e.target.value})}
                    placeholder="Ej: 1000L, 150CV"
                    data-testid="input-capacidad"
                  />
                </div>
              )}
              
              {fieldsConfig.estado && (
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    data-testid="select-estado"
                  >
                    {ESTADOS_MAQUINARIA.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {fieldsConfig.observaciones && (
              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.observaciones}
                  onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                  placeholder="Notas adicionales sobre la maquinaria..."
                  data-testid="textarea-observaciones"
                />
              </div>
            )}
            
            {/* Campo de imagen Placa CE */}
            {fieldsConfig.imagen_placa_ce && (
              <div className="form-group">
                <label className="form-label">
                  <Image size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Imagen Placa CE
                </label>
                <div 
                  style={{ 
                    border: isDragging ? '2px solid hsl(var(--primary))' : '2px dashed hsl(var(--border))', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    backgroundColor: isDragging ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {imagePreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={imagePreview} 
                        alt="Placa CE Preview" 
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '150px', 
                          objectFit: 'contain',
                          borderRadius: '4px',
                          border: '1px solid hsl(var(--border))'
                        }} 
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                          <Upload size={14} style={{ marginRight: '0.25rem' }} />
                          Cambiar
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                            data-testid="input-imagen-change"
                          />
                        </label>
                        {editingId && !selectedImage && (
                          <button
                            type="button"
                            className="btn btn-sm btn-error"
                            onClick={() => deleteImage(editingId)}
                            title="Eliminar imagen"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {selectedImage && (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      {selectedImage && (
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          Nueva imagen: {selectedImage.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '1.5rem'
                    }}>
                      <Upload size={36} style={{ color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                      <span style={{ fontSize: '0.875rem', color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', fontWeight: isDragging ? '600' : '400' }}>
                        {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                        JPEG, PNG o WEBP (máx. 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                        data-testid="input-imagen-placa"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="btn btn-primary" 
                data-testid="btn-guardar"
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Subiendo imagen...' : (editingId ? 'Actualizar' : 'Guardar')}
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
      
      {/* Modal para ver imagen */}
      {showImageModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'hsl(var(--destructive))',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
            <img 
              src={`${modalImageUrl}?t=${Date.now()}`}
              alt="Placa CE" 
              style={{ 
                maxWidth: '85vw', 
                maxHeight: '85vh',
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.src = '';
                setError('No se pudo cargar la imagen');
                setShowImageModal(false);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Lista de maquinaria */}
      <div className="card">
        <h2 className="card-title">
          <Cog size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Catálogo de Maquinaria ({filteredMaquinaria.length})
        </h2>
        {loading ? (
          <p>Cargando maquinaria...</p>
        ) : filteredMaquinaria.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay maquinaria que coincida con los filtros' : 'No hay maquinaria registrada. Añade la primera!'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="maquinaria-table">
              <thead>
                <tr>
                  {tableConfig.nombre ? <th>Nombre</th> : null}
                  {tableConfig.tipo ? <th>Tipo</th> : null}
                  {tableConfig.marca ? <th>Marca</th> : null}
                  {tableConfig.modelo ? <th>Modelo</th> : null}
                  {tableConfig.matricula ? <th>Matrícula</th> : null}
                  {tableConfig.estado ? <th>Estado</th> : null}
                  {tableConfig.imagen_placa_ce ? <th>Placa CE</th> : null}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredMaquinaria.map((item) => (
                  <tr key={item._id}>
                    {tableConfig.nombre ? <td className="font-semibold">{item.nombre}</td> : null}
                    {tableConfig.tipo ? <td>{item.tipo}</td> : null}
                    {tableConfig.marca ? <td>{item.marca || '—'}</td> : null}
                    {tableConfig.modelo ? <td>{item.modelo || '—'}</td> : null}
                    {tableConfig.matricula ? <td>{item.matricula || '—'}</td> : null}
                    {tableConfig.estado ? (
                      <td>
                        <span className={`badge ${getEstadoBadgeClass(item.estado)}`}>
                          {item.estado}
                        </span>
                      </td>
                    ) : null}
                    {tableConfig.imagen_placa_ce ? (
                      <td>
                        {item.imagen_placa_ce_url ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => viewImage(item)}
                            title="Ver imagen de placa CE"
                            data-testid={`view-placa-${item._id}`}
                          >
                            <Eye size={14} style={{ marginRight: '0.25rem' }} />
                            Ver
                          </button>
                        ) : (
                          <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>—</span>
                        )}
                      </td>
                    ) : null}
                    {(canEdit || canDelete) ? (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(item)}
                              title="Editar"
                              data-testid={`edit-maquinaria-${item._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(item._id)}
                              title="Eliminar"
                              data-testid={`delete-maquinaria-${item._id}`}
                            >
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

export default Maquinaria;
