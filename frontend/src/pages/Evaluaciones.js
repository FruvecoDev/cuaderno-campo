import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileText, ChevronDown, ChevronUp, Settings, Save, X, CheckCircle, Clock, Archive, Download } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Preguntas por defecto para cada sección
const PREGUNTAS_DEFAULT = {
  toma_datos: [
    { id: "td_1", pregunta: "¿Se mantiene limpia la finca?", tipo: "si_no" },
    { id: "td_2", pregunta: "¿En el campo hay colocados cubos de basura permanentes o móviles?", tipo: "si_no" },
    { id: "td_3", pregunta: "¿Los cubos de basura se vacían de forma regular?", tipo: "si_no" },
    { id: "td_4", pregunta: "¿Se recoge la basura generada durante los procesos de plantación y recolección?", tipo: "si_no" },
    { id: "td_5", pregunta: "¿En qué condiciones se mantienen los márgenes de los campos?", tipo: "texto" },
    { id: "td_6", pregunta: "¿Las parcelas de cultivo se mantienen limpias de malas hierbas?", tipo: "si_no" },
    { id: "td_7", pregunta: "¿Qué método se ha utilizado para eliminar las malas hierbas?", tipo: "texto" },
    { id: "td_8", pregunta: "En caso de utilización de herbicida, ¿su uso está anotado en el parte de tratamientos fitosanitarios?", tipo: "si_no" },
    { id: "td_9", pregunta: "¿El ganado pasa por el campo entre cultivos?", tipo: "si_no" },
    { id: "td_10", pregunta: "¿La finca dispone de botiquín completo debidamente señalizado?", tipo: "si_no" },
  ],
  analisis_suelo: [
    { id: "as_1", pregunta: "¿Se ha archivado la hoja de los resultados de análisis con este impreso?", tipo: "si_no" },
    { id: "as_2", pregunta: "Medidas tomadas como consecuencia de los resultados de los análisis", tipo: "texto" },
    { id: "as_3", pregunta: "¿Los paquetes/envases de semillas están archivados?", tipo: "si_no" },
    { id: "as_4", pregunta: "Este lote en el momento de entrega estaba libre de síntomas de:", tipo: "texto" },
  ],
  calidad_cepellones: [
    { id: "cc_1", pregunta: "Nº de referencia de lote de cepellones", tipo: "texto" },
    { id: "cc_2", pregunta: "¿Los paquetes/envases de semillas están archivados con este impreso?", tipo: "si_no" },
    { id: "cc_3", pregunta: "¿El semillero ha suministrado un certificado de sanidad vegetal?", tipo: "si_no" },
    { id: "cc_4", pregunta: "Si existe el certificado de sanidad, ¿está archivado con este impreso?", tipo: "si_no" },
    { id: "cc_5", pregunta: "Este lote en el momento de entrega estaba libre de síntomas de:", tipo: "texto" },
  ],
  inspeccion_maquinaria: [
    { id: "im_1", pregunta: "Tipo de maquinaria", tipo: "texto" },
    { id: "im_2", pregunta: "Modelo", tipo: "texto" },
    { id: "im_3", pregunta: "¿Se ha realizado la limpieza de los filtros?", tipo: "si_no" },
    { id: "im_4", pregunta: "¿Se ha comprobado el estado de la maquinaria?", tipo: "si_no" },
    { id: "im_5", pregunta: "¿Se han cambiado los diafragmas?", tipo: "si_no" },
    { id: "im_6", pregunta: "¿Se han revisado todas las conexiones?", tipo: "si_no" },
  ],
  calibracion_mantenimiento: [
    { id: "cm_1", pregunta: "Vaso", tipo: "texto" },
    { id: "cm_2", pregunta: "Peso", tipo: "texto" },
  ],
  observaciones: [
    { id: "obs_1", pregunta: "Observaciones generales", tipo: "texto" },
  ],
  pasos_precampana: []
};

const SECCIONES = [
  { key: 'toma_datos', label: 'Toma de Datos', icon: '📋' },
  { key: 'analisis_suelo', label: 'Análisis de Suelo', icon: '🧪' },
  { key: 'pasos_precampana', label: 'Pasos Precampaña Desinfección', icon: '🧹' },
  { key: 'calidad_cepellones', label: 'Calidad de Cepellones', icon: '🌱' },
  { key: 'inspeccion_maquinaria', label: 'Inspección Maquinaria', icon: '🚜' },
  { key: 'observaciones', label: 'Observaciones', icon: '📝' },
  { key: 'calibracion_mantenimiento', label: 'Calibración y Mantenimiento', icon: '⚙️' },
];

const Evaluaciones = () => {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token, user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Parcelas para selector
  const [parcelas, setParcelas] = useState([]);
  const [selectedParcelaInfo, setSelectedParcelaInfo] = useState(null);
  
  // Filtros de búsqueda de parcela
  const [parcelaSearch, setParcelaSearch] = useState({ proveedor: '', cultivo: '', campana: '' });
  
  // Filtros de lista
  const [filters, setFilters] = useState({ campana: '', estado: '' });
  
  // Secciones expandidas
  const [expandedSections, setExpandedSections] = useState({});
  
  // Preguntas custom cargadas del backend
  const [customPreguntas, setCustomPreguntas] = useState({});
  
  // Modal para agregar preguntas
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionSection, setNewQuestionSection] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('texto');
  
  // Form data
  const [formData, setFormData] = useState({
    parcela_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    tecnico: '',
    toma_datos: [],
    impresos: { fecha_inicio: '', fecha_fin: '', tecnico: '' },
    analisis_suelo: [],
    pasos_precampana: [],
    calidad_cepellones: [],
    inspeccion_maquinaria: [],
    observaciones: [],
    calibracion_mantenimiento: []
  });
  
  // Respuestas del cuestionario
  const [respuestas, setRespuestas] = useState({});
  
  useEffect(() => {
    fetchEvaluaciones();
    fetchParcelas();
    fetchPreguntasConfig();
  }, []);
  
  // Inicializar respuestas cuando se selecciona parcela
  useEffect(() => {
    if (formData.parcela_id && !editingId) {
      initializeRespuestas();
    }
  }, [formData.parcela_id]);
  
  const fetchEvaluaciones = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/evaluaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setEvaluaciones(data.evaluaciones || []);
    } catch (error) {
      console.error('Error fetching evaluaciones:', error);
      const errorMsg = handlePermissionError(error, 'ver las evaluaciones');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
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
  
  const fetchPreguntasConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/evaluaciones/config/preguntas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomPreguntas(data.custom || {});
      }
    } catch (error) {
      console.error('Error fetching preguntas config:', error);
    }
  };
  
  // Obtener todas las preguntas de una sección (default + custom)
  const getPreguntasSeccion = (seccion) => {
    const defaultPregs = PREGUNTAS_DEFAULT[seccion] || [];
    const customPregs = customPreguntas[seccion] || [];
    return [...defaultPregs, ...customPregs];
  };
  
  // Inicializar respuestas vacías
  const initializeRespuestas = () => {
    const newRespuestas = {};
    SECCIONES.forEach(seccion => {
      const preguntas = getPreguntasSeccion(seccion.key);
      preguntas.forEach(p => {
        newRespuestas[p.id] = p.tipo === 'si_no' ? null : '';
      });
    });
    setRespuestas(newRespuestas);
  };
  
  // Opciones de filtro de parcelas
  const parcelaFilterOptions = {
    proveedores: [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))],
    cultivos: [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))],
    campanas: [...new Set(parcelas.map(p => p.campana).filter(Boolean))]
  };
  
  // Parcelas filtradas
  const filteredParcelas = parcelas.filter(p => {
    if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
    if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
    if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
    return true;
  });
  
  // Evaluaciones filtradas
  const filteredEvaluaciones = evaluaciones.filter(e => {
    if (filters.campana && e.campana !== filters.campana) return false;
    if (filters.estado && e.estado !== filters.estado) return false;
    return true;
  });
  
  // Cuando se selecciona una parcela
  const handleParcelaSelect = (parcelaId) => {
    const parcela = parcelas.find(p => p._id === parcelaId);
    setFormData({ ...formData, parcela_id: parcelaId });
    if (parcela) {
      setSelectedParcelaInfo({
        proveedor: parcela.proveedor,
        codigo_plantacion: parcela.codigo_plantacion,
        finca: parcela.finca,
        cultivo: parcela.cultivo,
        variedad: parcela.variedad,
        superficie: parcela.superficie_total,
        campana: parcela.campana
      });
    }
  };
  
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };
  
  const handleRespuestaChange = (preguntaId, valor) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: valor
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.parcela_id) {
      setError('Debe seleccionar una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/evaluaciones/${editingId}`
        : `${BACKEND_URL}/api/evaluaciones`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Construir las respuestas por sección
      const buildSeccionRespuestas = (seccionKey) => {
        const preguntas = getPreguntasSeccion(seccionKey);
        return preguntas.map(p => ({
          pregunta_id: p.id,
          pregunta: p.pregunta,
          respuesta: respuestas[p.id],
          tipo: p.tipo
        })).filter(r => r.respuesta !== null && r.respuesta !== '');
      };
      
      const payload = {
        parcela_id: formData.parcela_id,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        tecnico: formData.tecnico || user?.full_name || user?.username || '',
        toma_datos: buildSeccionRespuestas('toma_datos'),
        impresos: {
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: formData.fecha_fin,
          tecnico: formData.tecnico
        },
        analisis_suelo: buildSeccionRespuestas('analisis_suelo'),
        pasos_precampana: buildSeccionRespuestas('pasos_precampana'),
        calidad_cepellones: buildSeccionRespuestas('calidad_cepellones'),
        inspeccion_maquinaria: buildSeccionRespuestas('inspeccion_maquinaria'),
        observaciones: buildSeccionRespuestas('observaciones'),
        calibracion_mantenimiento: buildSeccionRespuestas('calibracion_mantenimiento')
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
        fetchEvaluaciones();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving evaluacion:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la evaluación' : 'crear la evaluación');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const resetForm = () => {
    setFormData({
      parcela_id: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      tecnico: '',
      toma_datos: [],
      impresos: { fecha_inicio: '', fecha_fin: '', tecnico: '' },
      analisis_suelo: [],
      pasos_precampana: [],
      calidad_cepellones: [],
      inspeccion_maquinaria: [],
      observaciones: [],
      calibracion_mantenimiento: []
    });
    setRespuestas({});
    setSelectedParcelaInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
    setExpandedSections({});
  };
  
  const handleEdit = (evaluacion) => {
    setEditingId(evaluacion._id);
    setFormData({
      parcela_id: evaluacion.parcela_id || '',
      fecha_inicio: evaluacion.fecha_inicio || '',
      fecha_fin: evaluacion.fecha_fin || '',
      tecnico: evaluacion.tecnico || '',
      toma_datos: evaluacion.toma_datos || [],
      impresos: evaluacion.impresos || {},
      analisis_suelo: evaluacion.analisis_suelo || [],
      pasos_precampana: evaluacion.pasos_precampana || [],
      calidad_cepellones: evaluacion.calidad_cepellones || [],
      inspeccion_maquinaria: evaluacion.inspeccion_maquinaria || [],
      observaciones: evaluacion.observaciones || [],
      calibracion_mantenimiento: evaluacion.calibracion_mantenimiento || []
    });
    
    // Cargar respuestas existentes
    const loadedRespuestas = {};
    SECCIONES.forEach(seccion => {
      const data = evaluacion[seccion.key] || [];
      data.forEach(r => {
        loadedRespuestas[r.pregunta_id] = r.respuesta;
      });
    });
    setRespuestas(loadedRespuestas);
    
    // Info de parcela
    setSelectedParcelaInfo({
      proveedor: evaluacion.proveedor,
      codigo_plantacion: evaluacion.codigo_plantacion,
      finca: evaluacion.finca,
      cultivo: evaluacion.cultivo,
      variedad: evaluacion.variedad,
      superficie: evaluacion.superficie,
      campana: evaluacion.campana
    });
    
    // Expandir todas las secciones
    const expanded = {};
    SECCIONES.forEach(s => expanded[s.key] = true);
    setExpandedSections(expanded);
    
    setShowForm(true);
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta hoja de evaluación?')) {
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/evaluaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchEvaluaciones();
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'eliminar la evaluación');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Descargar PDF
  const handleDownloadPDF = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/evaluaciones/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluacion_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'descargar el PDF');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Agregar nueva pregunta
  const handleAddQuestion = async () => {
    if (!newQuestionText.trim() || !newQuestionSection) {
      setError('Debe completar todos los campos');
      return;
    }
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/evaluaciones/config/preguntas?seccion=${newQuestionSection}&pregunta=${encodeURIComponent(newQuestionText)}&tipo=${newQuestionType}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      setShowAddQuestion(false);
      setNewQuestionSection('');
      setNewQuestionText('');
      setNewQuestionType('texto');
      fetchPreguntasConfig();
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'agregar la pregunta');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'completada': return { class: 'badge-success', icon: <CheckCircle size={12} /> };
      case 'archivada': return { class: 'badge-default', icon: <Archive size={12} /> };
      default: return { class: 'badge-warning', icon: <Clock size={12} /> };
    }
  };
  
  // Renderizar campo de respuesta según tipo
  const renderCampoRespuesta = (pregunta) => {
    const valor = respuestas[pregunta.id];
    
    if (pregunta.tipo === 'si_no') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => handleRespuestaChange(pregunta.id, true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: valor === true ? '2px solid hsl(142, 76%, 36%)' : '1px solid hsl(var(--border))',
              backgroundColor: valor === true ? 'hsl(142, 76%, 36%)' : 'transparent',
              color: valor === true ? 'white' : 'inherit',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => handleRespuestaChange(pregunta.id, false)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: valor === false ? '2px solid hsl(0, 84%, 60%)' : '1px solid hsl(var(--border))',
              backgroundColor: valor === false ? 'hsl(0, 84%, 60%)' : 'transparent',
              color: valor === false ? 'white' : 'inherit',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            No
          </button>
        </div>
      );
    }
    
    if (pregunta.tipo === 'numero') {
      return (
        <input
          type="number"
          className="form-input"
          value={valor || ''}
          onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
          style={{ maxWidth: '150px' }}
        />
      );
    }
    
    if (pregunta.tipo === 'fecha') {
      return (
        <input
          type="date"
          className="form-input"
          value={valor || ''}
          onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      );
    }
    
    // Default: texto
    return (
      <input
        type="text"
        className="form-input"
        value={valor || ''}
        onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
        placeholder="Escriba su respuesta..."
      />
    );
  };
  
  const campanas = [...new Set(evaluaciones.map(e => e.campana).filter(Boolean))];
  
  return (
    <div data-testid="evaluaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Hojas de Evaluación</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddQuestion(true)}
              title="Agregar pregunta personalizada"
            >
              <Settings size={18} />
            </button>
          )}
          <PermissionButton
            permission="create"
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="btn btn-primary"
            data-testid="btn-nueva-evaluacion"
          >
            <Plus size={18} />
            Nueva Evaluación
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Filtros */}
      <div className="card mb-6">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Filtros</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
            >
              <option value="">Todas</option>
              {campanas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filters.estado}
              onChange={(e) => setFilters({...filters, estado: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="completada">Completada</option>
              <option value="archivada">Archivada</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Modal Agregar Pregunta */}
      {showAddQuestion && (
        <div className="card mb-6" style={{ border: '2px solid hsl(var(--primary))' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Agregar Nueva Pregunta</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAddQuestion(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Sección *</label>
              <select
                className="form-select"
                value={newQuestionSection}
                onChange={(e) => setNewQuestionSection(e.target.value)}
              >
                <option value="">Seleccionar sección...</option>
                {SECCIONES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Respuesta *</label>
              <select
                className="form-select"
                value={newQuestionType}
                onChange={(e) => setNewQuestionType(e.target.value)}
              >
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="si_no">Sí / No</option>
                <option value="fecha">Fecha</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Pregunta *</label>
            <input
              type="text"
              className="form-input"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Escriba la pregunta..."
            />
          </div>
          <button className="btn btn-primary" onClick={handleAddQuestion}>
            <Plus size={16} /> Agregar Pregunta
          </button>
        </div>
      )}
      
      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="evaluacion-form">
          <h2 className="card-title">{editingId ? 'Editar Hoja de Evaluación' : 'Nueva Hoja de Evaluación'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Datos Generales */}
            <div style={{ backgroundColor: 'hsl(var(--muted))', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Datos Generales</h3>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Fecha Inicio *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Fin</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Técnico</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.tecnico}
                    onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                    placeholder={user?.full_name || user?.username || 'Nombre del técnico'}
                  />
                </div>
              </div>
            </div>
            
            {/* Selector de Parcela */}
            <div style={{ backgroundColor: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid hsl(var(--primary) / 0.2)' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Plantación (Parcela) *</h3>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                Buscar parcela por:
              </p>
              <div className="grid-3" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Proveedor</label>
                  <select
                    className="form-select"
                    value={parcelaSearch.proveedor}
                    onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})}
                  >
                    <option value="">Todos</option>
                    {parcelaFilterOptions.proveedores.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cultivo</label>
                  <select
                    className="form-select"
                    value={parcelaSearch.cultivo}
                    onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})}
                  >
                    <option value="">Todos</option>
                    {parcelaFilterOptions.cultivos.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Campaña</label>
                  <select
                    className="form-select"
                    value={parcelaSearch.campana}
                    onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})}
                  >
                    <option value="">Todas</option>
                    {parcelaFilterOptions.campanas.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <select
                className="form-select"
                value={formData.parcela_id}
                onChange={(e) => handleParcelaSelect(e.target.value)}
                required
              >
                <option value="">Seleccionar parcela...</option>
                {filteredParcelas.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.codigo_plantacion} - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.superficie_total} ha
                  </option>
                ))}
              </select>
            </div>
            
            {/* Info de Parcela Seleccionada */}
            {selectedParcelaInfo && (
              <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos de Plantación:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {selectedParcelaInfo.proveedor}</div>
                  <div><strong>Código:</strong> {selectedParcelaInfo.codigo_plantacion}</div>
                  <div><strong>Finca:</strong> {selectedParcelaInfo.finca}</div>
                  <div><strong>Cultivo:</strong> {selectedParcelaInfo.cultivo}</div>
                  <div><strong>Variedad:</strong> {selectedParcelaInfo.variedad}</div>
                  <div><strong>Superficie:</strong> {selectedParcelaInfo.superficie} ha</div>
                  <div><strong>Campaña:</strong> {selectedParcelaInfo.campana}</div>
                </div>
              </div>
            )}
            
            {/* Secciones de Cuestionarios */}
            {formData.parcela_id && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Cuestionarios</h3>
                
                {SECCIONES.map(seccion => {
                  const preguntas = getPreguntasSeccion(seccion.key);
                  const isExpanded = expandedSections[seccion.key];
                  
                  return (
                    <div key={seccion.key} style={{ 
                      marginBottom: '0.5rem', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '0.5rem',
                      overflow: 'hidden'
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleSection(seccion.key)}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: isExpanded ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        <span>{seccion.icon} {seccion.label} ({preguntas.length})</span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {isExpanded && (
                        <div style={{ padding: '1rem' }}>
                          {preguntas.length === 0 ? (
                            <p style={{ color: 'hsl(var(--muted-foreground))' }}>No hay preguntas en esta sección. Agregue una desde el botón de configuración.</p>
                          ) : (
                            preguntas.map((pregunta, idx) => (
                              <div key={pregunta.id} style={{ 
                                padding: '0.75rem', 
                                backgroundColor: idx % 2 === 0 ? 'hsl(var(--muted) / 0.3)' : 'transparent',
                                borderRadius: '0.375rem',
                                marginBottom: '0.5rem'
                              }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                  {idx + 1}. {pregunta.pregunta}
                                  {pregunta.id.startsWith('custom_') && (
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', marginLeft: '0.5rem' }}>(Personalizada)</span>
                                  )}
                                </label>
                                {renderCampoRespuesta(pregunta)}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-evaluacion">
                <Save size={16} style={{ marginRight: '0.5rem' }} />
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
      
      {/* Lista de Evaluaciones */}
      <div className="card">
        <h2 className="card-title">
          <FileText size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Lista de Evaluaciones ({filteredEvaluaciones.length})
        </h2>
        {loading ? (
          <p>Cargando evaluaciones...</p>
        ) : filteredEvaluaciones.length === 0 ? (
          <p className="text-muted">No hay hojas de evaluación registradas.</p>
        ) : (
          <div className="table-container">
            <table data-testid="evaluaciones-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Proveedor</th>
                  <th>Cultivo</th>
                  <th>Campaña</th>
                  <th>Fecha Inicio</th>
                  <th>Técnico</th>
                  <th>Estado</th>
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEvaluaciones.map((evaluacion) => {
                  const estadoBadge = getEstadoBadge(evaluacion.estado);
                  return (
                    <tr key={evaluacion._id}>
                      <td className="font-semibold">{evaluacion.codigo_plantacion}</td>
                      <td>{evaluacion.proveedor}</td>
                      <td>{evaluacion.cultivo} ({evaluacion.variedad})</td>
                      <td>{evaluacion.campana}</td>
                      <td>{evaluacion.fecha_inicio}</td>
                      <td>{evaluacion.tecnico}</td>
                      <td>
                        <span className={`badge ${estadoBadge.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {estadoBadge.icon} {evaluacion.estado || 'borrador'}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDownloadPDF(evaluacion._id)}
                              title="Descargar PDF"
                            >
                              <Download size={14} />
                            </button>
                            {canEdit && (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEdit(evaluacion)}
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="btn btn-sm btn-error"
                                onClick={() => handleDelete(evaluacion._id)}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluaciones;
