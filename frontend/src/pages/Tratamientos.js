import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, Info, Filter, Settings, X, Calculator, AlertTriangle, RotateCcw, Beaker, Droplets, Ruler, Bug, Database, ChevronDown, WifiOff, Download, TrendingUp, CheckCircle, Clock, Leaf, ArrowLeft, XCircle, PlayCircle, MapPin, Cog, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import syncService from '../services/syncService';
import offlineDB from '../services/offlineDB';
import api, { BACKEND_URL } from '../services/api';
import CalculadoraFitosanitarios from '../components/tratamientos/CalculadoraFitosanitarios';
import TratamientosKPIs from '../components/tratamientos/TratamientosKPIs';
import TratamientosFilters from '../components/tratamientos/TratamientosFilters';
import TratamientosTable from '../components/tratamientos/TratamientosTable';
import '../App.css';


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
  maquina_nombre: true
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
  maquina_nombre: 'Máquina'
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: urlId, action } = useParams();
  const location = useLocation();
  const formRef = useRef(null);
  
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Determinar si estamos en modo formulario por la URL
  const isFormMode = location.pathname.includes('/nuevo') || location.pathname.includes('/editar/');
  
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
    // Merge saved config with defaults to ensure new fields are always included
    return saved ? { ...DEFAULT_FIELDS_CONFIG, ...JSON.parse(saved) } : DEFAULT_FIELDS_CONFIG;
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
  
  // Técnicos Aplicadores para selector
  const [tecnicosAplicadores, setTecnicosAplicadores] = useState([]);
  
  // Stats y exportación
  const [stats, setStats] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  
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
    tecnico_aplicador_id: '',
    maquina_id: '',
    maquina_nombre: '',
    // Producto fitosanitario desde calculadora
    producto_fitosanitario_id: '',
    producto_fitosanitario_nombre: '',
    producto_fitosanitario_dosis: '',
    producto_fitosanitario_unidad: '',
    producto_materia_activa: '',
    producto_plazo_seguridad: ''
  });
  
  useEffect(() => {
    fetchTratamientos();
    fetchParcelas();
    fetchMaquinaria();
    fetchTecnicosAplicadores();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Soporte legacy: si alguien aterriza en /tratamientos/editar/:id, cargar para editar en el modal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.pathname.includes('/editar/') && urlId) {
      loadTratamientoForEdit(urlId);
    } else if (location.pathname.includes('/nuevo')) {
      setEditingId(null);
      resetForm();
      setActiveTab('general');
      setShowForm(true);
    }
  }, [location.pathname, urlId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Cargar tratamiento para edición
  const loadTratamientoForEdit = async (id) => {
    try {
      const tratamiento = tratamientos.find(t => t._id === id);
      if (tratamiento) {
        handleEdit(tratamiento, true); // true = no navegar
      } else {
        // Si no está en la lista, cargarlo del servidor
        const data = await api.get(`/api/tratamientos/${id}`);
        if (data.tratamiento) {
          handleEdit(data.tratamiento, true);
        }
      }
    } catch (err) {

      setError('Error al cargar el tratamiento');
    }
  };
  
  // Función para obtener estadísticas
  const fetchStats = async () => {
    try {
      const data = await api.get('/api/tratamientos/stats/dashboard');
      setStats(data.stats);
    } catch (err) {

    }
  };
  
  // Función para exportar a Excel
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params = filters.campana ? `campana=${filters.campana}` : '';
      await api.download(`/api/tratamientos/export/excel?${params}`, `tratamientos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {

      alert('Error al exportar');
    } finally {
      setExportLoading(false);
    }
  };
  
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
  
  // Cuando se seleccionan parcelas, mostrar info heredada de la primera y calcular superficie total
  useEffect(() => {
    if (selectedParcelas.length > 0) {
      const firstParcela = parcelas.find(p => p._id === selectedParcelas[0]);
      setSelectedParcelasInfo(firstParcela || null);
      
      // Calcular superficie total de todas las parcelas seleccionadas
      const superficieTotal = selectedParcelas.reduce((total, parcelaId) => {
        const parcela = parcelas.find(p => p._id === parcelaId);
        return total + (parseFloat(parcela?.superficie_total) || 0);
      }, 0);
      
      // Autocompletar superficie_aplicacion si está vacío o es la primera selección
      if (!editingId) {
        setFormData(prev => ({
          ...prev,
          superficie_aplicacion: superficieTotal.toFixed(2)
        }));
      }
    } else {
      setSelectedParcelasInfo(null);
      // Limpiar superficie si no hay parcelas seleccionadas
      if (!editingId) {
        setFormData(prev => ({
          ...prev,
          superficie_aplicacion: ''
        }));
      }
    }
  }, [selectedParcelas, parcelas, editingId]);
  
  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/parcelas');
      setParcelas(data.parcelas || []);
    } catch (error) {

    }
  };
  
  const fetchMaquinaria = async () => {
    try {
      const data = await api.get('/api/maquinaria');
      setMaquinaria(data.maquinaria || []);
    } catch (error) {

    }
  };
  
  const fetchTecnicosAplicadores = async () => {
    try {
      const data = await api.get('/api/tecnicos-aplicadores/activos');
      setTecnicosAplicadores(data.tecnicos || []);
    } catch (error) {

    }
  };
  
  const fetchTratamientos = async () => {
    try {
      setError(null);
      const data = await api.get('/api/tratamientos');
      setTratamientos(data.tratamientos || []);
    } catch (error) {

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
      tecnico_aplicador_id: formData.tecnico_aplicador_id || null,
      maquina_id: formData.maquina_id || null,
      maquina_nombre: formData.maquina_nombre || null,
      // Producto fitosanitario
      producto_fitosanitario_id: formData.producto_fitosanitario_id || null,
      producto_fitosanitario_nombre: formData.producto_fitosanitario_nombre || null,
      producto_fitosanitario_dosis: parseFloat(formData.producto_fitosanitario_dosis) || null,
      producto_fitosanitario_unidad: formData.producto_fitosanitario_unidad || null
    };
    
    // Si estamos offline y es una creación nueva, guardar localmente
    if (!navigator.onLine && !editingId) {
      try {
        // Añadir info para mostrar en la cola
        payload._offlineInfo = {
          tipoDeTratamiento: formData.tipo_tratamiento,
          subtipo: formData.subtipo,
          numParcelas: formData.parcelas_ids.length
        };
        
        const result = await syncService.saveTratamientoOffline(payload);
        if (result.success) {
          setError(null);
          // Reset form
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
            tecnico_aplicador_id: '',
            maquina_id: '',
            maquina_nombre: '',
            producto_fitosanitario_id: '',
            producto_fitosanitario_nombre: '',
            producto_fitosanitario_dosis: '',
            producto_fitosanitario_unidad: 'L/ha'
          });
          setShowForm(false);
          // Mostrar mensaje de éxito offline
          alert('Tratamiento guardado localmente. Se sincronizará automáticamente cuando vuelva la conexión.');
        } else {
          setError('Error al guardar offline: ' + result.error);
        }
        return;
      } catch (error) {

        setError('Error al guardar offline');
        return;
      }
    }
    
    // Si hay conexión, enviar al servidor normalmente
    try {
      setError(null);
      const url = editingId 
        ? `/api/tratamientos/${editingId}`
        : `/api/tratamientos`;
      
      const data = editingId 
        ? await api.put(url, payload)
        : await api.post(url, payload);
      
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setActiveTab('general');
        fetchTratamientos();
        resetForm();
      }
    } catch (error) {

      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el tratamiento' : 'crear el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (tratamiento, skipNavigation = false) => {
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
      tecnico_aplicador_id: tratamiento.tecnico_aplicador_id || '',
      maquina_id: tratamiento.maquina_id || '',
      maquina_nombre: tratamiento.maquina_nombre || '',
      producto_fitosanitario_id: tratamiento.producto_fitosanitario_id || '',
      producto_fitosanitario_nombre: tratamiento.producto_fitosanitario_nombre || '',
      producto_fitosanitario_dosis: tratamiento.producto_fitosanitario_dosis || '',
      producto_fitosanitario_unidad: tratamiento.producto_fitosanitario_unidad || '',
      producto_materia_activa: tratamiento.producto_materia_activa || '',
      producto_plazo_seguridad: tratamiento.producto_plazo_seguridad || ''
    });
    setSelectedParcelas(tratamiento.parcelas_ids || []);
    setActiveTab('general');
    setShowForm(true);
  };
  
  // Función para abrir nuevo tratamiento
  const handleNewTratamiento = () => {
    resetForm();
    setActiveTab('general');
    setShowForm(true);
  };
  
  const resetForm = () => {
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
      tecnico_aplicador_id: '',
      maquina_id: '',
      maquina_nombre: '',
      producto_fitosanitario_id: '',
      producto_fitosanitario_nombre: '',
      producto_fitosanitario_dosis: '',
      producto_fitosanitario_unidad: 'L/ha',
      producto_materia_activa: '',
      producto_plazo_seguridad: ''
    });
    setSelectedParcelas([]);
    setSelectedParcelasInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setActiveTab('general');
    resetForm();
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
      await api.delete(`/api/tratamientos/${tratamientoId}`);
      fetchTratamientos();
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'eliminar el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Cambiar estado del tratamiento (completado/cancelado/pendiente)
  const handleChangeEstado = async (tratamientoId, nuevoEstado) => {
    if (!canEdit) {
      setError('No tienes permisos para modificar tratamientos');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    const mensajes = {
      completado: '¿Marcar este tratamiento como COMPLETADO?',
      cancelado: '¿Marcar este tratamiento como CANCELADO?',
      pendiente: '¿Volver a poner este tratamiento como PENDIENTE?'
    };
    
    if (!window.confirm(mensajes[nuevoEstado])) {
      return;
    }
    
    try {
      setError(null);
      await api.patch(`/api/tratamientos/${tratamientoId}/estado?estado=${nuevoEstado}`);
      fetchTratamientos();
      fetchStats();
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'cambiar el estado del tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  // Filtrar parcelas según los criterios de búsqueda
  const filteredParcelas = useMemo(() => {
    return parcelas.filter(p => {
      if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
      if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
      if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
      return true;
    });
  }, [parcelas, parcelaSearch]);
  
  
  // Vista de lista (cuando no estamos en modo formulario)
  return (
    <div data-testid="tratamientos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tratamientos</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={exportLoading}
            title="Exportar a Excel"
            data-testid="btn-export-excel"
          >
            <Download size={18} />
            {exportLoading ? 'Exportando...' : 'Excel'}
          </button>
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
            onClick={handleNewTratamiento}
            className="btn btn-primary"
            data-testid="btn-nuevo-tratamiento"
          >
            <Plus size={18} />
            Nuevo Tratamiento
          </PermissionButton>
        </div>
      </div>

      {/* KPIs Dashboard */}
      <TratamientosKPIs stats={stats} />

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
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}
          onClick={() => handleCancelEdit()}
        >
          <div
            className="card"
            data-testid="tratamiento-form"
            style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(142, 76%, 36% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Beaker size={20} style={{ color: 'hsl(142, 76%, 36%)' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Crear'} Tratamiento</h2>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    {formData.tipo_tratamiento ? `${formData.tipo_tratamiento}${formData.subtipo ? ' - ' + formData.subtipo : ''}` : 'Registro fitosanitario / nutrición'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => handleCancelEdit()} className="config-modal-close-btn" data-testid="btn-close-modal-tratamiento">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))', overflowX: 'auto' }}>
              {[
                { key: 'general', label: 'General', icon: <FileText size={14} /> },
                { key: 'parcelas', label: 'Parcelas', icon: <MapPin size={14} /> },
                { key: 'producto', label: 'Producto y Dosis', icon: <Droplets size={14} /> },
                { key: 'aplicacion', label: 'Aplicación', icon: <Cog size={14} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`tab-${tab.key}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ flex: 1, overflow: 'auto', paddingRight: '1rem' }}>

            {/* TAB: General */}
            {activeTab === 'general' && (<>
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
            </>)}

            {/* TAB: Parcelas */}
            {activeTab === 'parcelas' && (<>
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
                  <div style={{ gridColumn: 'span 2', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'hsl(var(--background))', borderRadius: '4px' }}>
                    <strong>Superficie Total Seleccionada:</strong>{' '}
                    <span style={{ color: 'hsl(var(--primary))', fontWeight: '600' }}>
                      {selectedParcelas.reduce((total, parcelaId) => {
                        const parcela = parcelas.find(p => p._id === parcelaId);
                        return total + (parseFloat(parcela?.superficie_total) || 0);
                      }, 0).toFixed(2)} ha
                    </span>
                    <span style={{ color: 'hsl(var(--muted-foreground))', marginLeft: '0.5rem' }}>
                      ({selectedParcelas.length} parcela{selectedParcelas.length > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              </div>
            )}
            </>)}

            {/* TAB: Producto y Dosis */}
            {activeTab === 'producto' && (<>
            {/* Calculadora de Fitosanitarios */}
            <CalculadoraFitosanitarios 
              onApplyToForm={(values) => {
                setFormData(prev => ({
                  ...prev,
                  superficie_aplicacion: values.superficie_aplicacion || prev.superficie_aplicacion,
                  caldo_superficie: values.caldo_superficie || prev.caldo_superficie,
                  // Producto fitosanitario
                  producto_fitosanitario_id: values.producto_fitosanitario_id || prev.producto_fitosanitario_id,
                  producto_fitosanitario_nombre: values.producto_fitosanitario_nombre || prev.producto_fitosanitario_nombre,
                  producto_fitosanitario_dosis: values.producto_fitosanitario_dosis || prev.producto_fitosanitario_dosis,
                  producto_fitosanitario_unidad: values.producto_fitosanitario_unidad || prev.producto_fitosanitario_unidad,
                  producto_materia_activa: values.producto_materia_activa || prev.producto_materia_activa,
                  producto_plazo_seguridad: values.producto_plazo_seguridad || prev.producto_plazo_seguridad
                }));
              }}
            />
            
            {/* Mostrar producto seleccionado */}
            {formData.producto_fitosanitario_nombre && (
              <div className="card" style={{ 
                backgroundColor: '#f0fdf4', 
                border: '2px solid #86efac', 
                marginBottom: '1.5rem', 
                padding: '1rem' 
              }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Beaker size={16} /> Producto Fitosanitario Seleccionado
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Producto:</strong> {formData.producto_fitosanitario_nombre}</div>
                  {formData.producto_materia_activa && (
                    <div><strong>Materia Activa:</strong> {formData.producto_materia_activa}</div>
                  )}
                  {formData.producto_fitosanitario_dosis && (
                    <div><strong>Dosis:</strong> {formData.producto_fitosanitario_dosis} {formData.producto_fitosanitario_unidad}</div>
                  )}
                  {formData.producto_plazo_seguridad && (
                    <div><strong>Plazo Seguridad:</strong> {formData.producto_plazo_seguridad} días</div>
                  )}
                </div>
                <button 
                  type="button"
                  className="btn btn-sm btn-secondary mt-2"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    producto_fitosanitario_id: '',
                    producto_fitosanitario_nombre: '',
                    producto_fitosanitario_dosis: '',
                    producto_fitosanitario_unidad: '',
                    producto_materia_activa: '',
                    producto_plazo_seguridad: ''
                  }))}
                  style={{ fontSize: '0.75rem' }}
                >
                  <X size={14} /> Quitar producto
                </button>
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
                  {selectedParcelas.length > 0 && !editingId && (
                    <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Autocompletado desde parcelas ({selectedParcelas.length} seleccionadas) - Puedes modificarlo si no tratas toda la superficie
                    </small>
                  )}
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
            
            {/* Fechas */}
            <div className="grid-2">
              {fieldsConfig.fecha_tratamiento && (
                <div className="form-group">
                  <label className="form-label">Fecha Tratamiento</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_tratamiento}
                    onChange={(e) => setFormData({...formData, fecha_tratamiento: e.target.value})}
                    data-testid="input-fecha-tratamiento"
                  />
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Fecha cuando se genera/registra el tratamiento
                  </small>
                </div>
              )}
              
              {fieldsConfig.fecha_aplicacion && (
                <div className="form-group">
                  <label className="form-label">Fecha Aplicación</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_aplicacion}
                    onChange={(e) => setFormData({...formData, fecha_aplicacion: e.target.value})}
                    data-testid="input-fecha-aplicacion"
                  />
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Fecha cuando se realiza la aplicación (aplicador y máquina)
                  </small>
                </div>
              )}
            </div>
            </>)}

            {/* TAB: Aplicación */}
            {activeTab === 'aplicacion' && (<>
            {/* Aplicador y Máquina */}
            <div className="grid-2">
              {fieldsConfig.aplicador_nombre && (
                <div className="form-group">
                  <label className="form-label">Técnico Aplicador</label>
                  <select
                    className="form-select"
                    value={formData.tecnico_aplicador_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedTecnico = tecnicosAplicadores.find(t => t._id === selectedId);
                      setFormData({
                        ...formData,
                        tecnico_aplicador_id: selectedId,
                        aplicador_nombre: selectedTecnico ? selectedTecnico.nombre_completo : ''
                      });
                    }}
                    data-testid="select-aplicador"
                  >
                    <option value="">-- Seleccionar técnico aplicador --</option>
                    {tecnicosAplicadores.map(tecnico => (
                      <option key={tecnico._id} value={tecnico._id}>
                        {tecnico.nombre_completo} ({tecnico.nivel_capacitacion}) - Válido hasta: {tecnico.fecha_validez}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Solo se muestran técnicos con certificación vigente
                  </small>
                </div>
              )}
              
              {fieldsConfig.maquina_id && (
                <div className="form-group">
                  <label className="form-label">Máquina</label>
                  <select
                    className="form-select"
                    value={formData.maquina_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedMaquina = maquinaria.find(m => m._id === selectedId);
                      setFormData({
                        ...formData,
                        maquina_id: selectedId,
                        maquina_nombre: selectedMaquina ? selectedMaquina.nombre : ''
                      });
                    }}
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
            </>)}

            </div>

            {/* Footer fijo */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-tratamiento">
                {editingId ? 'Actualizar Tratamiento' : 'Guardar Tratamiento'}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
      
      <TratamientosTable
        tratamientos={filteredTratamientos}
        loading={loading}
        hasActiveFilters={hasActiveFilters}
        tableConfig={tableConfig}
        canEdit={canEdit}
        canDelete={canDelete}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        handleChangeEstado={handleChangeEstado}
      />
    </div>
  );
};

export default Tratamientos;
