import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Info, Filter, Settings, X, Eye, WifiOff, Camera, Upload, Image, Loader2, Sparkles, AlertTriangle, CheckCircle, Bug } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import syncService from '../services/syncService';
import offlineDB from '../services/offlineDB';
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
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingVisita, setViewingVisita] = useState(null);
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
    fecha_visita: new Date().toISOString().split('T')[0], // Fecha actual por defecto (OBLIGATORIO)
    fecha_planificada: '',
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
  
  // Estado para fotos
  const [fotos, setFotos] = useState([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  
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
  
  // Manejar parámetros de URL (ver y editar desde Dashboard)
  useEffect(() => {
    const verParam = searchParams.get('ver');
    const editarParam = searchParams.get('editar');
    
    if (verParam && visitas.length > 0) {
      const visita = visitas.find(v => v._id === verParam);
      if (visita) {
        setViewingVisita(visita);
        // Limpiar parámetro de URL
        searchParams.delete('ver');
        setSearchParams(searchParams);
      }
    }
    
    if (editarParam && visitas.length > 0) {
      const visita = visitas.find(v => v._id === editarParam);
      if (visita) {
        handleEdit(visita);
        // Limpiar parámetro de URL
        searchParams.delete('editar');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, visitas]);
  
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
      // Intentar desde el servidor primero
      if (navigator.onLine) {
        const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setParcelas(data.parcelas || []);
          return;
        }
      }
      
      // Si estamos offline o falló, cargar desde cache
      const cachedParcelas = await offlineDB.getCachedParcelas();
      if (cachedParcelas && cachedParcelas.length > 0) {
        console.log('Loaded parcelas from cache:', cachedParcelas.length);
        setParcelas(cachedParcelas);
      }
    } catch (error) {
      console.error('Error fetching parcelas:', error);
      // Intentar desde cache como fallback
      try {
        const cachedParcelas = await offlineDB.getCachedParcelas();
        if (cachedParcelas && cachedParcelas.length > 0) {
          setParcelas(cachedParcelas);
        }
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
      }
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
  
  // Funciones para manejo de fotos
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Validar antes de subir
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
      if (!validExtensions.includes(ext)) {
        setUploadError(`${file.name}: Formato no permitido`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`${file.name}: Excede 10MB`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Si estamos editando, subir directamente
    if (editingId) {
      await uploadFotos(editingId, validFiles);
    } else {
      // Si es nueva visita, guardar localmente hasta crear
      const newFotos = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        filename: file.name,
        pending: true
      }));
      setFotos(prev => [...prev, ...newFotos]);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const uploadFotos = async (visitaId, files) => {
    setUploadingFotos(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`${BACKEND_URL}/api/visitas/${visitaId}/fotos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al subir fotos');
      }
      
      const data = await response.json();
      setFotos(data.fotos || []);
      
      // Actualizar visita en la lista
      fetchVisitas();
      
      return data;
    } catch (error) {
      console.error('Error uploading photos:', error);
      setUploadError(error.message);
      throw error;
    } finally {
      setUploadingFotos(false);
    }
  };
  
  const deleteFoto = async (visitaId, fotoIndex) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    
    // Si es foto pendiente (no subida aún)
    if (fotos[fotoIndex]?.pending) {
      setFotos(prev => prev.filter((_, i) => i !== fotoIndex));
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/visitas/${visitaId}/fotos/${fotoIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar foto');
      }
      
      const data = await response.json();
      setFotos(data.fotos || []);
      fetchVisitas();
    } catch (error) {
      console.error('Error deleting photo:', error);
      setUploadError(error.message);
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
    
    // Validar parcela_id (obligatorio)
    if (!formData.parcela_id) {
      setError('Debe seleccionar una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Validar fecha_visita (obligatorio)
    if (!formData.fecha_visita) {
      setError('La fecha de visita es obligatoria');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Payload simplificado - el backend hereda el resto
    const payload = {
      objetivo: formData.objetivo,
      parcela_id: formData.parcela_id,
      fecha_visita: formData.fecha_visita,
      fecha_planificada: formData.fecha_planificada,
      observaciones: formData.observaciones
    };
    
    // Si el objetivo es "Plagas y Enfermedades", incluir el cuestionario
    if (formData.objetivo === 'Plagas y Enfermedades') {
      payload.cuestionario_plagas = cuestionarioPlagas;
    }
    
    // Si estamos offline y es una creación nueva, guardar localmente
    if (!navigator.onLine && !editingId) {
      try {
        // Añadir info de la parcela para mostrar en la cola
        const parcelaInfo = parcelas.find(p => p._id === formData.parcela_id);
        payload._offlineInfo = {
          parcelaNombre: parcelaInfo?.codigo_plantacion || 'Parcela',
          proveedor: parcelaInfo?.proveedor || '',
          cultivo: parcelaInfo?.cultivo || ''
        };
        
        const result = await syncService.saveVisitaOffline(payload);
        if (result.success) {
          setError(null);
          // Reset form
          setFormData({
            objetivo: 'Control Rutinario',
            fecha_visita: new Date().toISOString().split('T')[0],
            fecha_planificada: '',
            parcela_id: '',
            observaciones: ''
          });
          setShowForm(false);
          // Mostrar mensaje de éxito offline
          alert('Visita guardada localmente. Se sincronizará automáticamente cuando vuelva la conexión.');
        } else {
          setError('Error al guardar offline: ' + result.error);
        }
        return;
      } catch (error) {
        console.error('Error saving offline:', error);
        setError('Error al guardar offline');
        return;
      }
    }
    
    // Si hay conexión, enviar al servidor normalmente
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/visitas/${editingId}`
        : `${BACKEND_URL}/api/visitas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
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
        // Si hay fotos pendientes y es una creación nueva, subirlas
        const pendingFotos = fotos.filter(f => f.pending);
        if (!editingId && pendingFotos.length > 0 && data.data?._id) {
          try {
            await uploadFotos(data.data._id, pendingFotos.map(f => f.file));
          } catch (uploadError) {
            console.error('Error uploading photos after create:', uploadError);
            // La visita se creó, solo falló la subida de fotos
          }
        }
        
        setShowForm(false);
        setEditingId(null);
        fetchVisitas();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving visita:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la visita' : 'crear la visita');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      objetivo: 'Control Rutinario',
      fecha_visita: new Date().toISOString().split('T')[0], // Fecha actual por defecto
      fecha_planificada: '',
      parcela_id: '',
      observaciones: ''
    });
    // Resetear cuestionario de plagas
    const initialPlagas = {};
    PLAGAS_ENFERMEDADES.forEach(p => {
      initialPlagas[p.key] = 0;
    });
    setCuestionarioPlagas(initialPlagas);
    setSelectedParcelaInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
    // Limpiar fotos
    fotos.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFotos([]);
    setUploadError(null);
  };
  
  const handleEdit = (visita) => {
    setEditingId(visita._id);
    setFormData({
      objetivo: visita.objetivo || 'Control Rutinario',
      fecha_visita: visita.fecha_visita || new Date().toISOString().split('T')[0], // Fecha actual si no tiene
      fecha_planificada: visita.fecha_planificada || '',
      parcela_id: visita.parcela_id || '',
      observaciones: visita.observaciones || ''
    });
    // Si tiene cuestionario de plagas, cargarlo
    if (visita.cuestionario_plagas) {
      setCuestionarioPlagas(visita.cuestionario_plagas);
    } else {
      const initialPlagas = {};
      PLAGAS_ENFERMEDADES.forEach(p => {
        initialPlagas[p.key] = 0;
      });
      setCuestionarioPlagas(initialPlagas);
    }
    // Cargar fotos existentes
    setFotos(visita.fotos || []);
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    resetForm();
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
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('visits.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title={t('common.settings')}
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
            {t('visits.newVisit')}
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
                  <label className="form-label">
                    Fecha Visita <span style={{ color: 'hsl(var(--destructive))' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_visita}
                    onChange={(e) => setFormData({...formData, fecha_visita: e.target.value})}
                    required
                    data-testid="input-fecha-visita"
                  />
                </div>
              )}
              
              {/* Campo para planificar visitas futuras */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Fecha Planificada
                  <span style={{ 
                    fontSize: '0.7rem', 
                    backgroundColor: '#e3f2fd', 
                    color: '#1976d2', 
                    padding: '2px 6px', 
                    borderRadius: '4px' 
                  }}>
                    Opcional - Para calendario
                  </span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_planificada}
                  onChange={(e) => {
                    const nuevaFechaPlanificada = e.target.value;
                    // Si se establece una fecha planificada, actualizar también la fecha de visita
                    if (nuevaFechaPlanificada) {
                      setFormData({
                        ...formData, 
                        fecha_planificada: nuevaFechaPlanificada,
                        fecha_visita: nuevaFechaPlanificada
                      });
                    } else {
                      setFormData({...formData, fecha_planificada: nuevaFechaPlanificada});
                    }
                  }}
                  data-testid="input-fecha-planificada"
                />
                <small style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>
                  Al establecer fecha planificada, la fecha de visita se actualizará automáticamente
                </small>
              </div>
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
            
            {/* CUESTIONARIO DE PLAGAS Y ENFERMEDADES - Solo visible cuando objetivo = "Plagas y Enfermedades" */}
            {formData.objetivo === 'Plagas y Enfermedades' && fieldsConfig.cuestionario_plagas && (
              <div className="card" style={{ 
                backgroundColor: 'hsl(var(--warning) / 0.1)', 
                marginBottom: '1.5rem', 
                padding: '1.5rem', 
                border: '1px solid hsl(var(--warning) / 0.3)',
                borderRadius: '0.5rem'
              }} data-testid="cuestionario-plagas">
                <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: 'hsl(var(--warning))' }}>
                  Cuestionario de Plagas y Enfermedades
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                  Evalúe cada plaga/enfermedad: <strong>0</strong> = Sin presencia, <strong>1</strong> = Presencia baja, <strong>2</strong> = Presencia alta
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {PLAGAS_ENFERMEDADES.map((plaga) => (
                    <div key={plaga.key} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: 'hsl(var(--background))',
                      borderRadius: '0.375rem',
                      border: '1px solid hsl(var(--border))'
                    }}>
                      <label style={{ fontWeight: '500', fontSize: '0.875rem' }}>{plaga.label}</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[0, 1, 2].map((valor) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setCuestionarioPlagas(prev => ({...prev, [plaga.key]: valor}))}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              border: cuestionarioPlagas[plaga.key] === valor 
                                ? '2px solid hsl(var(--primary))' 
                                : '1px solid hsl(var(--border))',
                              backgroundColor: cuestionarioPlagas[plaga.key] === valor 
                                ? valor === 0 ? 'hsl(142, 76%, 36%)' 
                                  : valor === 1 ? 'hsl(38, 92%, 50%)' 
                                  : 'hsl(0, 84%, 60%)'
                                : 'hsl(var(--background))',
                              color: cuestionarioPlagas[plaga.key] === valor ? 'white' : 'inherit',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            data-testid={`plaga-${plaga.key}-${valor}`}
                          >
                            {valor}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
            
            {/* SECCIÓN DE FOTOS */}
            <div className="form-group" data-testid="fotos-section">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={18} />
                Fotos de la Visita
                <span style={{ 
                  fontSize: '0.7rem', 
                  backgroundColor: '#e8f5e9', 
                  color: '#2e7d32', 
                  padding: '2px 6px', 
                  borderRadius: '4px' 
                }}>
                  Opcional - JPG, PNG, WebP (máx. 10MB)
                </span>
              </label>
              
              {/* Zona de subida */}
              <div 
                style={{
                  border: '2px dashed hsl(var(--border))',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'hsl(var(--muted) / 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length > 0) {
                    const dataTransfer = new DataTransfer();
                    files.forEach(f => dataTransfer.items.add(f));
                    fileInputRef.current.files = dataTransfer.files;
                    handleFileSelect({ target: { files: dataTransfer.files } });
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  data-testid="input-fotos"
                />
                {uploadingFotos ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Subiendo fotos...</span>
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))' }}>
                      Arrastra fotos aquí o <span style={{ color: 'hsl(var(--primary))', fontWeight: '500' }}>haz clic para seleccionar</span>
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      Máximo 10 fotos por subida
                    </p>
                  </>
                )}
              </div>
              
              {/* Error de subida */}
              {uploadError && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem', 
                  backgroundColor: 'hsl(var(--destructive) / 0.1)', 
                  borderRadius: '0.375rem',
                  color: 'hsl(var(--destructive))',
                  fontSize: '0.875rem'
                }}>
                  {uploadError}
                </div>
              )}
              
              {/* Galería de fotos */}
              {fotos.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    {fotos.length} foto{fotos.length !== 1 ? 's' : ''} adjunta{fotos.length !== 1 ? 's' : ''}
                  </p>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                    gap: '0.75rem' 
                  }}>
                    {fotos.map((foto, index) => (
                      <div 
                        key={index}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--muted))'
                        }}
                      >
                        <img
                          src={foto.pending ? foto.preview : `${BACKEND_URL}${foto.url}`}
                          alt={foto.filename || `Foto ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div style={{
                          display: 'none',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'hsl(var(--muted))'
                        }}>
                          <Image size={32} style={{ color: 'hsl(var(--muted-foreground))' }} />
                        </div>
                        {/* Indicador de pendiente */}
                        {foto.pending && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: 'hsl(var(--warning))',
                            color: 'white',
                            fontSize: '0.65rem',
                            padding: '2px 4px',
                            borderRadius: '4px'
                          }}>
                            Pendiente
                          </div>
                        )}
                        {/* Botón eliminar */}
                        <button
                          type="button"
                          onClick={() => deleteFoto(editingId, index)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'hsl(var(--destructive))',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Eliminar foto"
                          data-testid={`delete-foto-${index}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
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
                  {tableConfig.objetivo ? <th>Objetivo</th> : null}
                  {tableConfig.parcela ? <th>Parcela</th> : null}
                  {tableConfig.proveedor ? <th>Proveedor</th> : null}
                  {tableConfig.cultivo ? <th>Cultivo</th> : null}
                  {tableConfig.campana ? <th>Campaña</th> : null}
                  {tableConfig.fecha ? <th>Fecha</th> : null}
                  {tableConfig.estado ? <th>Estado</th> : null}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredVisitas.map((visita) => (
                  <tr key={visita._id}>
                    {tableConfig.objetivo ? (
                      <td className="font-semibold">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {visita.objetivo}
                          {visita.fotos && visita.fotos.length > 0 && (
                            <span 
                              title={`${visita.fotos.length} foto(s)`}
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '2px',
                                backgroundColor: 'hsl(var(--primary) / 0.1)',
                                color: 'hsl(var(--primary))',
                                padding: '2px 6px',
                                borderRadius: '9999px',
                                fontSize: '0.7rem'
                              }}
                            >
                              <Camera size={12} />
                              {visita.fotos.length}
                            </span>
                          )}
                        </div>
                      </td>
                    ) : null}
                    {tableConfig.parcela ? <td>{visita.codigo_plantacion || 'N/A'}</td> : null}
                    {tableConfig.proveedor ? <td>{visita.proveedor || 'N/A'}</td> : null}
                    {tableConfig.cultivo ? <td>{visita.cultivo || 'N/A'}</td> : null}
                    {tableConfig.campana ? <td>{visita.campana || 'N/A'}</td> : null}
                    {tableConfig.fecha ? <td>{visita.fecha_visita ? new Date(visita.fecha_visita).toLocaleDateString() : 'Sin fecha'}</td> : null}
                    {tableConfig.estado ? (
                      <td>
                        <span className={`badge ${visita.realizado ? 'badge-success' : 'badge-default'}`}>
                          {visita.realizado ? 'Realizada' : 'Pendiente'}
                        </span>
                      </td>
                    ) : null}
                    {(canEdit || canDelete) ? (
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
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal para ver detalles de la visita */}
      {viewingVisita && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setViewingVisita(null)}
        >
          <div 
            className="card"
            style={{
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingVisita(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={24} />
              Detalles de la Visita
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="grid-2">
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Objetivo</label>
                  <p style={{ fontWeight: '500' }}>{viewingVisita.objetivo}</p>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Fecha</label>
                  <p style={{ fontWeight: '500' }}>{viewingVisita.fecha_visita}</p>
                </div>
              </div>
              
              <div className="grid-2">
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Proveedor</label>
                  <p>{viewingVisita.proveedor || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Cultivo</label>
                  <p>{viewingVisita.cultivo || 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid-2">
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Campaña</label>
                  <p>{viewingVisita.campana || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Estado</label>
                  <span className={`badge ${viewingVisita.estado === 'Completada' ? 'badge-success' : viewingVisita.estado === 'Programada' ? 'badge-warning' : 'badge-secondary'}`}>
                    {viewingVisita.estado || 'Programada'}
                  </span>
                </div>
              </div>
              
              {viewingVisita.observaciones && (
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Observaciones</label>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{viewingVisita.observaciones}</p>
                </div>
              )}
              
              {viewingVisita.cuestionario_plagas && Object.keys(viewingVisita.cuestionario_plagas).length > 0 && (
                <div>
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem', display: 'block' }}>Cuestionario de Plagas</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    {Object.entries(viewingVisita.cuestionario_plagas).map(([key, value]) => (
                      <div key={key} style={{ 
                        padding: '0.5rem', 
                        backgroundColor: value === 0 ? 'hsl(var(--success) / 0.1)' : value === 1 ? 'hsl(var(--warning) / 0.2)' : 'hsl(var(--destructive) / 0.1)',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <strong>{key.replace(/_/g, ' ')}:</strong> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Galería de fotos en el modal */}
              {viewingVisita.fotos && viewingVisita.fotos.length > 0 && (
                <div data-testid="modal-fotos-gallery">
                  <label style={{ fontWeight: '600', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Camera size={16} />
                    Fotos ({viewingVisita.fotos.length})
                  </label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                    gap: '0.75rem' 
                  }}>
                    {viewingVisita.fotos.map((foto, index) => (
                      <div 
                        key={index}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          border: '1px solid hsl(var(--border))',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(`${BACKEND_URL}${foto.url}`, '_blank')}
                        title="Clic para ver en tamaño completo"
                      >
                        <img
                          src={`${BACKEND_URL}${foto.url}`}
                          alt={foto.filename || `Foto ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          fontSize: '0.65rem',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}>
                          {foto.filename || `Foto ${index + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              {canEdit && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleEdit(viewingVisita);
                    setViewingVisita(null);
                  }}
                >
                  <Edit2 size={16} style={{ marginRight: '0.5rem' }} />
                  Editar
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setViewingVisita(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visitas;
