import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, FileText, ChevronDown, ChevronUp, Settings, Save, X, CheckCircle, Clock, Archive, Download, Copy, GripVertical } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Componente para pregunta arrastrable
const SortableQuestion = ({ pregunta, idx, isCustom, canDrag, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pregunta.id, disabled: !canDrag || !isCustom });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    padding: '0.75rem',
    backgroundColor: isDragging ? 'hsl(var(--primary) / 0.1)' : (idx % 2 === 0 ? 'hsl(var(--muted) / 0.3)' : 'transparent'),
    borderRadius: '0.375rem',
    marginBottom: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    border: isDragging ? '2px dashed hsl(var(--primary))' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {canDrag && isCustom && (
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            padding: '0.25rem',
            color: 'hsl(var(--muted-foreground))',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
          title="Arrastrar para reordenar"
        >
          <GripVertical size={16} />
        </div>
      )}
      {children}
    </div>
  );
};

const Evaluaciones = () => {
  const { t } = useTranslation();
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
  const [filters, setFilters] = useState({ 
    parcela: '',
    cultivo: '', 
    proveedor: '', 
    campana: '', 
    contrato: '',
    estado: '' 
  });
  
  // Secciones expandidas
  const [expandedSections, setExpandedSections] = useState({});
  
  // Preguntas custom cargadas del backend
  const [customPreguntas, setCustomPreguntas] = useState({});
  
  // Contratos para filtro
  const [contratos, setContratos] = useState([]);
  
  // Modal para agregar preguntas
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionSection, setNewQuestionSection] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('texto');
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // URL params para preselección de parcela
  const [searchParams, setSearchParams] = useSearchParams();
  
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
    fetchContratos();
    fetchPreguntasConfig();
  }, []);
  
  // Detectar parámetro de URL para preseleccionar parcela
  useEffect(() => {
    const parcelaIdFromUrl = searchParams.get('parcela_id');
    if (parcelaIdFromUrl && parcelas.length > 0) {
      const parcela = parcelas.find(p => p._id === parcelaIdFromUrl);
      if (parcela) {
        // Abrir formulario y preseleccionar parcela
        setShowForm(true);
        handleParcelaSelect(parcelaIdFromUrl);
        // Limpiar el parámetro de la URL
        setSearchParams({});
      }
    }
  }, [parcelas, searchParams]);
  
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
  
  // Opciones de filtro de parcelas (para el formulario de búsqueda)
  const parcelaFilterOptions = {
    proveedores: [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))],
    cultivos: [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))],
    campanas: [...new Set(parcelas.map(p => p.campana).filter(Boolean))]
  };
  
  // Opciones de filtro de evaluaciones (para la lista)
  const evaluacionFilterOptions = {
    parcelas: [...new Set(evaluaciones.map(e => e.codigo_plantacion).filter(Boolean))],
    cultivos: [...new Set(evaluaciones.map(e => e.cultivo).filter(Boolean))],
    proveedores: [...new Set(evaluaciones.map(e => e.proveedor).filter(Boolean))],
    campanas: [...new Set(evaluaciones.map(e => e.campana).filter(Boolean))],
    contratos: contratos.map(c => ({ id: c._id, nombre: c.nombre || `${c.proveedor} - ${c.cultivo}` }))
  };
  
  // Parcelas filtradas (para el formulario)
  const filteredParcelas = parcelas.filter(p => {
    if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
    if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
    if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
    return true;
  });
  
  // Evaluaciones filtradas
  const filteredEvaluaciones = evaluaciones.filter(e => {
    if (filters.parcela && e.codigo_plantacion !== filters.parcela) return false;
    if (filters.cultivo && e.cultivo !== filters.cultivo) return false;
    if (filters.proveedor && e.proveedor !== filters.proveedor) return false;
    if (filters.campana && e.campana !== filters.campana) return false;
    if (filters.contrato && e.contrato_id !== filters.contrato) return false;
    if (filters.estado && e.estado !== filters.estado) return false;
    return true;
  });
  
  // Limpiar filtros
  const clearFilters = () => {
    setFilters({ parcela: '', cultivo: '', proveedor: '', campana: '', contrato: '', estado: '' });
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
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
      setError(t('evaluations.selectParcel'));
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
    if (!window.confirm(t('evaluations.confirmDelete'))) {
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
      setError(t('messages.completeAllFields'));
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
      
      const result = await response.json();
      
      // Actualizar estado local inmediatamente
      setCustomPreguntas(prev => {
        const updated = { ...prev };
        if (!updated[newQuestionSection]) {
          updated[newQuestionSection] = [];
        }
        updated[newQuestionSection] = [...updated[newQuestionSection], result.pregunta];
        return updated;
      });
      
      // Inicializar respuesta para la nueva pregunta
      setRespuestas(prev => ({
        ...prev,
        [result.pregunta.id]: result.pregunta.tipo === 'si_no' ? null : ''
      }));
      
      setShowAddQuestion(false);
      setNewQuestionSection('');
      setNewQuestionText('');
      setNewQuestionType('texto');
      
      // Refrescar config del servidor también
      fetchPreguntasConfig();
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'agregar la pregunta');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Eliminar pregunta personalizada
  const handleDeleteQuestion = async (preguntaId, seccion) => {
    if (!window.confirm(t('evaluations.confirmDeleteQuestion'))) {
      return;
    }
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/evaluaciones/config/preguntas/${preguntaId}?seccion=${seccion}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      // Actualizar estado local inmediatamente
      setCustomPreguntas(prev => {
        const updated = { ...prev };
        if (updated[seccion]) {
          updated[seccion] = updated[seccion].filter(p => p.id !== preguntaId);
        }
        return updated;
      });
      
      // Eliminar respuesta de la pregunta eliminada
      setRespuestas(prev => {
        const updated = { ...prev };
        delete updated[preguntaId];
        return updated;
      });
      
      // Refrescar config del servidor también
      fetchPreguntasConfig();
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'eliminar la pregunta');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  // Duplicar pregunta existente (abre el modal con datos pre-rellenados)
  const handleDuplicateQuestion = (pregunta, seccion) => {
    setNewQuestionSection(seccion);
    setNewQuestionType(pregunta.tipo || 'texto');
    setNewQuestionText(pregunta.pregunta + ' (copia)');
    setShowAddQuestion(true);
  };
  
  // Manejar fin del drag & drop para reordenar preguntas custom
  const handleDragEnd = async (event, seccionKey) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }
    
    // Solo permitir reordenar preguntas custom
    if (!active.id.startsWith('custom_') || !over.id.startsWith('custom_')) {
      return;
    }
    
    // Obtener las preguntas custom de esta sección
    const customPreguntasSeccion = customPreguntas[seccionKey] || [];
    
    const oldIndex = customPreguntasSeccion.findIndex(p => p.id === active.id);
    const newIndex = customPreguntasSeccion.findIndex(p => p.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    
    // Reordenar localmente
    const newOrder = arrayMove(customPreguntasSeccion, oldIndex, newIndex);
    
    // Actualizar estado local inmediatamente
    setCustomPreguntas(prev => ({
      ...prev,
      [seccionKey]: newOrder
    }));
    
    // Guardar en el servidor
    try {
      const ordenIds = newOrder.map(p => p.id);
      await fetch(
        `${BACKEND_URL}/api/evaluaciones/config/preguntas/reorder?seccion=${seccionKey}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(ordenIds)
        }
      );
    } catch (error) {
      console.error('Error al guardar el orden:', error);
      // Revertir si hay error
      fetchPreguntasConfig();
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
            {t('common.yes')}
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
            {t('common.no')}
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
        placeholder={t('evaluations.writeAnswer')}
      />
    );
  };
  
  return (
    <div data-testid="evaluaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('evaluations.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddQuestion(true)}
              title={t('evaluations.addCustomQuestion')}
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
            {t('evaluations.newEvaluation')}
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Filtros */}
      <div className="card mb-6" data-testid="filtros-evaluaciones">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', margin: 0 }}>{t('common.filters')}</h3>
          {hasActiveFilters && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={clearFilters}
              data-testid="btn-limpiar-filtros"
            >
              <X size={14} style={{ marginRight: '0.25rem' }} />
              {t('common.clear')} {t('common.filters').toLowerCase()}
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('parcels.title')}</label>
            <select
              className="form-select"
              value={filters.parcela}
              onChange={(e) => setFilters({...filters, parcela: e.target.value})}
              data-testid="filter-parcela"
            >
              <option value="">{t('common.all')}</option>
              {evaluacionFilterOptions.parcelas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('crops.title')}</label>
            <select
              className="form-select"
              value={filters.cultivo}
              onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
              data-testid="filter-cultivo"
            >
              <option value="">{t('common.all')}</option>
              {evaluacionFilterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('suppliers.title')}</label>
            <select
              className="form-select"
              value={filters.proveedor}
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
              data-testid="filter-proveedor"
            >
              <option value="">{t('common.all')}</option>
              {evaluacionFilterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('contracts.campaign')}</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
              data-testid="filter-campana"
            >
              <option value="">{t('common.all')}</option>
              {evaluacionFilterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('contracts.title')}</label>
            <select
              className="form-select"
              value={filters.contrato}
              onChange={(e) => setFilters({...filters, contrato: e.target.value})}
              data-testid="filter-contrato"
            >
              <option value="">{t('common.all')}</option>
              {evaluacionFilterOptions.contratos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('common.status')}</label>
            <select
              className="form-select"
              value={filters.estado}
              onChange={(e) => setFilters({...filters, estado: e.target.value})}
              data-testid="filter-estado"
            >
              <option value="">{t('common.all')}</option>
              <option value="borrador">{t('evaluations.draft')}</option>
              <option value="completada">{t('evaluations.completed')}</option>
              <option value="archivada">{t('evaluations.archived')}</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Modal Agregar Pregunta - Overlay flotante */}
      {showAddQuestion && (
        <div style={{
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
        }}>
          <div className="card" style={{ 
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid hsl(var(--primary))'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontWeight: '600' }}>{t('evaluations.addNewQuestion')}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddQuestion(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{t('evaluations.section')} *</label>
                <select
                  className="form-select"
                  value={newQuestionSection}
                  onChange={(e) => setNewQuestionSection(e.target.value)}
                  data-testid="select-section"
                >
                  <option value="">{t('evaluations.selectSection')}</option>
                  {SECCIONES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('evaluations.answerType')} *</label>
                <select
                  className="form-select"
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value)}
                  data-testid="select-type"
                >
                  <option value="texto">{t('evaluations.text')}</option>
                  <option value="numero">{t('evaluations.number')}</option>
                  <option value="si_no">{t('evaluations.yesNo')}</option>
                  <option value="fecha">{t('common.date')}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('evaluations.question')} *</label>
              <input
                type="text"
                className="form-input"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder={t('evaluations.writeQuestion')}
                data-testid="input-question"
              />
            </div>
            <button className="btn btn-primary" onClick={handleAddQuestion} data-testid="btn-add-question">
              <Plus size={16} /> {t('evaluations.addQuestion')}
            </button>
          </div>
        </div>
      )}
      
      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="evaluacion-form">
          <h2 className="card-title">{editingId ? t('evaluations.editEvaluation') : t('evaluations.newEvaluation')}</h2>
          <form onSubmit={handleSubmit}>
            {/* Datos Generales */}
            <div style={{ backgroundColor: 'hsl(var(--muted))', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{t('evaluations.generalData')}</h3>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">{t('evaluations.startDate')} *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('evaluations.endDate')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('evaluations.technician')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.tecnico}
                    onChange={(e) => setFormData({...formData, tecnico: e.target.value})}
                    placeholder={user?.full_name || user?.username || t('evaluations.technicianName')}
                  />
                </div>
              </div>
            </div>
            
            {/* Selector de Parcela */}
            <div style={{ backgroundColor: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid hsl(var(--primary) / 0.2)' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{t('evaluations.plantation')} *</h3>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                {t('evaluations.searchParcelBy')}
              </p>
              <div className="grid-3" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('suppliers.title')}</label>
                  <select
                    className="form-select"
                    value={parcelaSearch.proveedor}
                    onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})}
                  >
                    <option value="">{t('common.all')}</option>
                    {parcelaFilterOptions.proveedores.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('crops.title')}</label>
                  <select
                    className="form-select"
                    value={parcelaSearch.cultivo}
                    onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})}
                  >
                    <option value="">{t('common.all')}</option>
                    {parcelaFilterOptions.cultivos.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('contracts.campaign')}</label>
                  <select
                    className="form-select"
                    value={parcelaSearch.campana}
                    onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})}
                  >
                    <option value="">{t('common.all')}</option>
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
                <option value="">{t('evaluations.selectParcel')}</option>
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
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>{t('evaluations.plantationData')}:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>{t('suppliers.title')}:</strong> {selectedParcelaInfo.proveedor}</div>
                  <div><strong>{t('parcels.code')}:</strong> {selectedParcelaInfo.codigo_plantacion}</div>
                  <div><strong>{t('farms.title')}:</strong> {selectedParcelaInfo.finca}</div>
                  <div><strong>{t('crops.title')}:</strong> {selectedParcelaInfo.cultivo}</div>
                  <div><strong>{t('crops.variety')}:</strong> {selectedParcelaInfo.variedad}</div>
                  <div><strong>{t('parcels.surface')}:</strong> {selectedParcelaInfo.superficie} ha</div>
                  <div><strong>{t('contracts.campaign')}:</strong> {selectedParcelaInfo.campana}</div>
                </div>
              </div>
            )}
            
            {/* Secciones de Cuestionarios */}
            {formData.parcela_id && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{t('evaluations.questionnaires')}</h3>
                
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {(user?.role === 'Admin' || user?.role === 'Manager') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewQuestionSection(seccion.key);
                                setShowAddQuestion(true);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: 'hsl(var(--primary))',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem'
                              }}
                              title={t('evaluations.addQuestionToSection')}
                              data-testid={`btn-add-question-${seccion.key}`}
                            >
                              <Plus size={14} /> {t('evaluations.addQuestion')}
                            </button>
                          )}
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div style={{ padding: '1rem' }}>
                          {preguntas.length === 0 ? (
                            <p style={{ color: 'hsl(var(--muted-foreground))' }}>{t('evaluations.noQuestions')}</p>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleDragEnd(event, seccion.key)}
                            >
                              <SortableContext
                                items={preguntas.map(p => p.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {preguntas.map((pregunta, idx) => {
                                  const isCustom = pregunta.id.startsWith('custom_');
                                  const canDrag = (user?.role === 'Admin' || user?.role === 'Manager');
                                  
                                  return (
                                    <SortableQuestion
                                      key={pregunta.id}
                                      pregunta={pregunta}
                                      idx={idx}
                                      isCustom={isCustom}
                                      canDrag={canDrag}
                                    >
                                      <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                          {idx + 1}. {pregunta.pregunta}
                                          {isCustom && (
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', marginLeft: '0.5rem' }}>({t('evaluations.custom')})</span>
                                          )}
                                        </label>
                                        {renderCampoRespuesta(pregunta)}
                                      </div>
                                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                        {/* Botón Duplicar - visible para Admin y Manager */}
                                        {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                          <button
                                            type="button"
                                            onClick={() => handleDuplicateQuestion(pregunta, seccion.key)}
                                            style={{
                                              padding: '0.25rem',
                                              borderRadius: '0.25rem',
                                              backgroundColor: 'hsl(var(--primary) / 0.1)',
                                              color: 'hsl(var(--primary))',
                                              border: '1px solid hsl(var(--primary) / 0.3)',
                                              cursor: 'pointer'
                                            }}
                                            title={t('evaluations.duplicateQuestion')}
                                            data-testid={`btn-duplicate-question-${pregunta.id}`}
                                          >
                                            <Copy size={14} />
                                          </button>
                                        )}
                                        {/* Botón Eliminar - solo para preguntas custom y Admin */}
                                        {isCustom && user?.role === 'Admin' && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteQuestion(pregunta.id, seccion.key)}
                                            style={{
                                              padding: '0.25rem',
                                              borderRadius: '0.25rem',
                                              backgroundColor: 'hsl(var(--destructive) / 0.1)',
                                              color: 'hsl(var(--destructive))',
                                              border: '1px solid hsl(var(--destructive) / 0.3)',
                                              cursor: 'pointer'
                                            }}
                                            title={t('evaluations.deleteQuestion')}
                                            data-testid={`btn-delete-question-${pregunta.id}`}
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </SortableQuestion>
                                  );
                                })}
                              </SortableContext>
                            </DndContext>
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
                {editingId ? t('common.update') : t('common.save')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Lista de Evaluaciones */}
      <div className="card">
        <h2 className="card-title">
          <FileText size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {t('evaluations.evaluationList')} ({filteredEvaluaciones.length})
        </h2>
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : filteredEvaluaciones.length === 0 ? (
          <p className="text-muted">{t('evaluations.noEvaluations')}</p>
        ) : (
          <div className="table-container">
            <table data-testid="evaluaciones-table">
              <thead>
                <tr>
                  <th>{t('parcels.code')}</th>
                  <th>{t('suppliers.title')}</th>
                  <th>{t('crops.title')}</th>
                  <th>{t('contracts.campaign')}</th>
                  <th>{t('evaluations.startDate')}</th>
                  <th>{t('evaluations.technician')}</th>
                  <th>{t('common.status')}</th>
                  {(canEdit || canDelete) ? <th>{t('common.actions')}</th> : null}
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
                          {estadoBadge.icon} {evaluacion.estado || t('evaluations.draft')}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDownloadPDF(evaluacion._id)}
                              title={t('common.download')} PDF
                            >
                              <Download size={14} />
                            </button>
                            {canEdit && (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEdit(evaluacion)}
                                title={t('common.edit')}
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="btn btn-sm btn-error"
                                onClick={() => handleDelete(evaluacion._id)}
                                title={t('common.delete')}
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
