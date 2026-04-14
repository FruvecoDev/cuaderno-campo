import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Settings, Download, X } from 'lucide-react';
import { CheckCircle, Clock, Archive } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import { arrayMove } from '@dnd-kit/sortable';
import EvaluacionesFilters from '../components/evaluaciones/EvaluacionesFilters';
import EvaluacionesTable from '../components/evaluaciones/EvaluacionesTable';
import EvaluacionesForm from '../components/evaluaciones/EvaluacionesForm';
import '../App.css';


// Preguntas por defecto para cada seccion
const PREGUNTAS_DEFAULT = {
  toma_datos: [
    { id: "td_1", pregunta: "Se mantiene limpia la finca?", tipo: "si_no" },
    { id: "td_2", pregunta: "En el campo hay colocados cubos de basura permanentes o moviles?", tipo: "si_no" },
    { id: "td_3", pregunta: "Los cubos de basura se vacian de forma regular?", tipo: "si_no" },
    { id: "td_4", pregunta: "Se recoge la basura generada durante los procesos de plantacion y recoleccion?", tipo: "si_no" },
    { id: "td_5", pregunta: "En que condiciones se mantienen los margenes de los campos?", tipo: "texto" },
    { id: "td_6", pregunta: "Las parcelas de cultivo se mantienen limpias de malas hierbas?", tipo: "si_no" },
    { id: "td_7", pregunta: "Que metodo se ha utilizado para eliminar las malas hierbas?", tipo: "texto" },
    { id: "td_8", pregunta: "En caso de utilizacion de herbicida, su uso esta anotado en el parte de tratamientos fitosanitarios?", tipo: "si_no" },
    { id: "td_9", pregunta: "El ganado pasa por el campo entre cultivos?", tipo: "si_no" },
    { id: "td_10", pregunta: "La finca dispone de botiquin completo debidamente senalizado?", tipo: "si_no" },
  ],
  analisis_suelo: [
    { id: "as_1", pregunta: "Se ha archivado la hoja de los resultados de analisis con este impreso?", tipo: "si_no" },
    { id: "as_2", pregunta: "Medidas tomadas como consecuencia de los resultados de los analisis", tipo: "texto" },
    { id: "as_3", pregunta: "Los paquetes/envases de semillas estan archivados?", tipo: "si_no" },
    { id: "as_4", pregunta: "Este lote en el momento de entrega estaba libre de sintomas de:", tipo: "texto" },
  ],
  calidad_cepellones: [
    { id: "cc_1", pregunta: "N de referencia de lote de cepellones", tipo: "texto" },
    { id: "cc_2", pregunta: "Los paquetes/envases de semillas estan archivados con este impreso?", tipo: "si_no" },
    { id: "cc_3", pregunta: "El semillero ha suministrado un certificado de sanidad vegetal?", tipo: "si_no" },
    { id: "cc_4", pregunta: "Se ha guardado una muestra del lote de cepellones?", tipo: "si_no" },
    { id: "cc_5", pregunta: "Origen de la planta y nombre del proveedor", tipo: "texto" },
    { id: "cc_6", pregunta: "Variedad de la planta", tipo: "texto" },
    { id: "cc_7", pregunta: "Estado fenologico de la planta", tipo: "texto" },
    { id: "cc_8", pregunta: "Estado sanitario de la planta", tipo: "texto" },
    { id: "cc_9", pregunta: "Tamano de la planta", tipo: "texto" },
    { id: "cc_10", pregunta: "Estado de la planta (fresca, marchita, seca...)", tipo: "texto" },
    { id: "cc_11", pregunta: "N hojas verdaderas", tipo: "numero" },
  ],
  inspeccion_maquinaria: [
    { id: "im_1", pregunta: "Se realiza inspeccion de las maquinas de tratamiento?", tipo: "si_no" },
    { id: "im_2", pregunta: "Es obligatoria desde el ano 2016", tipo: "texto" },
  ],
  pasos_precampana: [
    { id: "pp_1", pregunta: "Se ha realizado la limpieza del terreno adecuadamente?", tipo: "si_no" },
    { id: "pp_2", pregunta: "Se ha verificado el sistema de riego antes de la campana?", tipo: "si_no" },
    { id: "pp_3", pregunta: "Se han preparado los insumos necesarios para la campana?", tipo: "si_no" },
  ],
  observaciones: [
    { id: "obs_1", pregunta: "Observaciones generales de la evaluacion", tipo: "texto" },
  ],
  calibracion_mantenimiento: [
    { id: "cm_1", pregunta: "Se ha calibrado la maquinaria de aplicacion?", tipo: "si_no" },
    { id: "cm_2", pregunta: "Se lleva un registro de mantenimiento de la maquinaria?", tipo: "si_no" },
  ],
};

const SECCIONES = [
  { key: 'toma_datos', label: 'Toma de Datos / Limpieza', icon: '' },
  { key: 'analisis_suelo', label: 'Analisis de Suelo / Material Vegetal', icon: '' },
  { key: 'calidad_cepellones', label: 'Calidad de Cepellones', icon: '' },
  { key: 'inspeccion_maquinaria', label: 'Inspeccion de Maquinaria', icon: '' },
  { key: 'pasos_precampana', label: 'Pasos Pre-Campana', icon: '' },
  { key: 'observaciones', label: 'Observaciones', icon: '' },
  { key: 'calibracion_mantenimiento', label: 'Calibracion y Mantenimiento', icon: '' },
];


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

  const [parcelas, setParcelas] = useState([]);
  const [selectedParcelaInfo, setSelectedParcelaInfo] = useState(null);
  const [parcelaSearch, setParcelaSearch] = useState({ proveedor: '', cultivo: '', campana: '' });
  const [filters, setFilters] = useState({ parcela: '', cultivo: '', proveedor: '', campana: '', contrato: '', estado: '' });
  const [expandedSections, setExpandedSections] = useState({});
  const [customPreguntas, setCustomPreguntas] = useState({});
  const [contratos, setContratos] = useState([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionSection, setNewQuestionSection] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('texto');
  const [searchParams, setSearchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    parcela_id: '', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '',
    tecnico: '', toma_datos: [], impresos: { fecha_inicio: '', fecha_fin: '', tecnico: '' },
    analisis_suelo: [], pasos_precampana: [], calidad_cepellones: [],
    inspeccion_maquinaria: [], observaciones: [], calibracion_mantenimiento: []
  });
  const [respuestas, setRespuestas] = useState({});

  useEffect(() => {
    fetchEvaluaciones();
    fetchParcelas();
    fetchContratos();
    fetchPreguntasConfig();
  }, []);

  useEffect(() => {
    const parcelaId = searchParams.get('parcela');
    if (parcelaId && parcelas.length > 0) {
      handleParcelaSelect(parcelaId);
      setShowForm(true);
      setSearchParams({});
    }
  }, [parcelas, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showForm && !editingId) initializeRespuestas();
  }, [showForm, customPreguntas]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvaluaciones = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/evaluaciones');
      setEvaluaciones(Array.isArray(data) ? data : []);
    } catch (error) { setError('Error al cargar evaluaciones'); }
    finally { setLoading(false); }
  };

  const fetchParcelas = async () => {
    try { const data = await api.get('/api/parcelas?limit=1000'); setParcelas(Array.isArray(data) ? data : data?.parcelas || []); }
    catch (error) { }
  };

  const fetchContratos = async () => {
    try { const data = await api.get('/api/contratos?limit=1000'); setContratos(Array.isArray(data) ? data : data?.contratos || []); }
    catch (error) { }
  };

  const fetchPreguntasConfig = async () => {
    try { const data = await api.get('/api/evaluaciones/config/preguntas'); setCustomPreguntas(data?.preguntas || {}); }
    catch (error) { }
  };

  const getPreguntasSeccion = (seccion) => {
    const defaults = PREGUNTAS_DEFAULT[seccion] || [];
    const custom = customPreguntas[seccion] || [];
    return [...defaults, ...custom];
  };

  const initializeRespuestas = () => {
    const initial = {};
    SECCIONES.forEach(seccion => {
      const preguntas = getPreguntasSeccion(seccion.key);
      preguntas.forEach(p => { initial[p.id] = ''; });
    });
    setRespuestas(initial);
  };

  const parcelaFilterOptions = {
    proveedores: [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))],
    cultivos: [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))],
    campanas: [...new Set(parcelas.map(p => p.campana).filter(Boolean))],
  };

  const evaluacionFilterOptions = {
    parcelas: [...new Set(evaluaciones.map(e => e.codigo_plantacion).filter(Boolean))],
    cultivos: [...new Set(evaluaciones.map(e => e.cultivo).filter(Boolean))],
    proveedores: [...new Set(evaluaciones.map(e => e.proveedor).filter(Boolean))],
    campanas: [...new Set(evaluaciones.map(e => e.campana).filter(Boolean))],
    contratos: contratos.map(c => ({ id: c._id, nombre: `${c.numero_contrato || ''} - ${c.proveedor || ''}` })),
  };

  const filteredParcelas = parcelas.filter(p => {
    if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
    if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
    if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
    return true;
  });

  const filteredEvaluaciones = evaluaciones.filter(e => {
    if (filters.parcela && e.codigo_plantacion !== filters.parcela) return false;
    if (filters.cultivo && e.cultivo !== filters.cultivo) return false;
    if (filters.proveedor && e.proveedor !== filters.proveedor) return false;
    if (filters.campana && e.campana !== filters.campana) return false;
    if (filters.contrato && e.contrato_id !== filters.contrato) return false;
    if (filters.estado && e.estado !== filters.estado) return false;
    return true;
  });

  const clearFilters = () => setFilters({ parcela: '', cultivo: '', proveedor: '', campana: '', contrato: '', estado: '' });
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const handleParcelaSelect = (parcelaId) => {
    setFormData(prev => ({ ...prev, parcela_id: parcelaId }));
    if (parcelaId) {
      const parcela = parcelas.find(p => p._id === parcelaId);
      if (parcela) {
        setSelectedParcelaInfo({
          proveedor: parcela.proveedor, codigo_plantacion: parcela.codigo_plantacion,
          finca: parcela.finca, cultivo: parcela.cultivo, variedad: parcela.variedad,
          superficie: parcela.superficie_total, campana: parcela.campana
        });
      }
    } else { setSelectedParcelaInfo(null); }
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleRespuestaChange = (preguntaId, valor) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate && !editingId) { setError('No tienes permisos para crear evaluaciones'); return; }
    if (!canEdit && editingId) { setError('No tienes permisos para editar evaluaciones'); return; }
    try {
      setError(null);
      const parcela = parcelas.find(p => p._id === formData.parcela_id);
      const secciones_respuestas = {};
      SECCIONES.forEach(seccion => {
        const preguntas = getPreguntasSeccion(seccion.key);
        secciones_respuestas[seccion.key] = preguntas.map(p => ({
          pregunta_id: p.id, pregunta: p.pregunta, tipo: p.tipo, respuesta: respuestas[p.id] || ''
        }));
      });
      const payload = {
        ...formData,
        codigo_plantacion: parcela?.codigo_plantacion || '',
        proveedor: parcela?.proveedor || '',
        cultivo: parcela?.cultivo || '',
        variedad: parcela?.variedad || '',
        finca: parcela?.finca || '',
        campana: parcela?.campana || '',
        secciones: secciones_respuestas,
        tecnico: formData.tecnico || user?.full_name || user?.username || '',
      };
      if (editingId) {
        await api.put(`/api/evaluaciones/${editingId}`, payload);
      } else {
        await api.post('/api/evaluaciones', payload);
      }
      fetchEvaluaciones();
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (error) {

      if (error.response?.status === 403) handlePermissionError(error);
      else setError('Error al guardar la evaluacion');
      setTimeout(() => setError(null), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      parcela_id: '', fecha_inicio: new Date().toISOString().split('T')[0], fecha_fin: '',
      tecnico: '', toma_datos: [], impresos: { fecha_inicio: '', fecha_fin: '', tecnico: '' },
      analisis_suelo: [], pasos_precampana: [], calidad_cepellones: [],
      inspeccion_maquinaria: [], observaciones: [], calibracion_mantenimiento: []
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
      impresos: evaluacion.impresos || { fecha_inicio: '', fecha_fin: '', tecnico: '' },
      analisis_suelo: evaluacion.analisis_suelo || [],
      pasos_precampana: evaluacion.pasos_precampana || [],
      calidad_cepellones: evaluacion.calidad_cepellones || [],
      inspeccion_maquinaria: evaluacion.inspeccion_maquinaria || [],
      observaciones: evaluacion.observaciones || [],
      calibracion_mantenimiento: evaluacion.calibracion_mantenimiento || []
    });
    if (evaluacion.parcela_id) {
      const parcela = parcelas.find(p => p._id === evaluacion.parcela_id);
      if (parcela) {
        setSelectedParcelaInfo({
          proveedor: parcela.proveedor, codigo_plantacion: parcela.codigo_plantacion,
          finca: parcela.finca, cultivo: parcela.cultivo, variedad: parcela.variedad,
          superficie: parcela.superficie_total, campana: parcela.campana
        });
      }
    }
    const newRespuestas = {};
    if (evaluacion.secciones) {
      Object.values(evaluacion.secciones).forEach(seccionResp => {
        if (Array.isArray(seccionResp)) {
          seccionResp.forEach(r => { newRespuestas[r.pregunta_id] = r.respuesta; });
        }
      });
    }
    setRespuestas(newRespuestas);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!canDelete) { setError('No tienes permisos para eliminar'); return; }
    if (!window.confirm(t('evaluations.confirmDelete'))) return;
    try { await api.delete(`/api/evaluaciones/${id}`); fetchEvaluaciones(); }
    catch (error) { setError('Error al eliminar'); setTimeout(() => setError(null), 5000); }
  };

  const handleDownloadPDF = async (id) => {
    try { await api.download(`/api/evaluaciones/${id}/pdf`, `evaluacion_${id}.pdf`); }
    catch (error) { }
  };

  const handleAddQuestion = async () => {
    if (!newQuestionSection || !newQuestionText.trim()) { setError('Completa todos los campos'); setTimeout(() => setError(null), 3000); return; }
    try {
      await api.post('/api/evaluaciones/config/preguntas', { seccion: newQuestionSection, pregunta: newQuestionText.trim(), tipo: newQuestionType });
      fetchPreguntasConfig();
      setNewQuestionText('');
      setNewQuestionType('texto');
      setShowAddQuestion(false);
    } catch (error) { setError('Error al agregar la pregunta'); setTimeout(() => setError(null), 5000); }
  };

  const handleDeleteQuestion = async (preguntaId, seccion) => {
    if (!window.confirm('Eliminar esta pregunta personalizada?')) return;
    try {
      await api.delete(`/api/evaluaciones/config/preguntas/${preguntaId}`);
      fetchPreguntasConfig();
    } catch (error) { setError('Error al eliminar la pregunta'); setTimeout(() => setError(null), 5000); }
  };

  const handleDuplicateQuestion = (pregunta, seccion) => {
    setNewQuestionSection(seccion);
    setNewQuestionText(pregunta.pregunta + ' (copia)');
    setNewQuestionType(pregunta.tipo);
    setShowAddQuestion(true);
  };

  const handleDragEnd = async (event, seccionKey) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const preguntas = getPreguntasSeccion(seccionKey);
    const oldIndex = preguntas.findIndex(p => p.id === active.id);
    const newIndex = preguntas.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(preguntas, oldIndex, newIndex);
    const customOnly = reordered.filter(p => p.id.startsWith('custom_'));
    setCustomPreguntas(prev => ({ ...prev, [seccionKey]: customOnly }));
    try {
      await api.post('/api/evaluaciones/config/preguntas/reorder', { seccion: seccionKey, order: reordered.map(p => p.id) });
    } catch (error) { }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'completada': return { class: 'badge-success', icon: <CheckCircle size={12} /> };
      case 'archivada': return { class: 'badge-default', icon: <Archive size={12} /> };
      default: return { class: 'badge-warning', icon: <Clock size={12} /> };
    }
  };

  const handleChangeEstado = async (evaluacionId, nuevoEstado) => {
    if (!canEdit) { setError('No tienes permisos'); setTimeout(() => setError(null), 5000); return; }
    const mensajes = { completada: 'Marcar como COMPLETADA?', archivada: 'Archivar?', borrador: 'Volver a BORRADOR?' };
    if (!window.confirm(mensajes[nuevoEstado])) return;
    try {
      setError(null);
      await api.patch(`/api/evaluaciones/${evaluacionId}/estado?estado=${nuevoEstado}`);
      fetchEvaluaciones();
    } catch (error) { setError('Error al cambiar estado'); setTimeout(() => setError(null), 5000); }
  };

  return (
    <div data-testid="evaluaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('evaluations.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" data-testid="btn-export-excel-evaluaciones"
            onClick={async () => { try { await api.download('/api/evaluaciones/export/excel', `evaluaciones_${new Date().toISOString().split('T')[0]}.xlsx`); } catch (err) { } }}
            title="Exportar Excel"><Download size={16} /> Excel</button>
          <button className="btn btn-secondary" data-testid="btn-export-pdf-evaluaciones"
            onClick={async () => { try { await api.download('/api/evaluaciones/export/pdf', `evaluaciones_${new Date().toISOString().split('T')[0]}.pdf`); } catch (err) { } }}
            title="Exportar PDF"><FileText size={16} /> PDF</button>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <button className="btn btn-secondary" onClick={() => setShowAddQuestion(true)} title={t('evaluations.addCustomQuestion')}>
              <Settings size={18} />
            </button>
          )}
          <PermissionButton permission="create" onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary" data-testid="btn-nueva-evaluacion">
            <Plus size={18} /> {t('evaluations.newEvaluation')}
          </PermissionButton>
        </div>
      </div>

      {error && <div className="alert alert-error mb-4" data-testid="error-message">{error}</div>}

      <EvaluacionesFilters
        filters={filters}
        setFilters={setFilters}
        filterOptions={evaluacionFilterOptions}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
      />

      {/* Modal Agregar Pregunta */}
      {showAddQuestion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', border: '2px solid hsl(var(--primary))' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontWeight: '600' }}>{t('evaluations.addNewQuestion')}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAddQuestion(false)}><X size={16} /></button>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{t('evaluations.section')} *</label>
                <select className="form-select" value={newQuestionSection} onChange={(e) => setNewQuestionSection(e.target.value)} data-testid="select-section">
                  <option value="">{t('evaluations.selectSection')}</option>
                  {SECCIONES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('evaluations.answerType')} *</label>
                <select className="form-select" value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} data-testid="select-type">
                  <option value="texto">{t('evaluations.text')}</option>
                  <option value="numero">{t('evaluations.number')}</option>
                  <option value="si_no">{t('evaluations.yesNo')}</option>
                  <option value="fecha">{t('common.date')}</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('evaluations.question')} *</label>
              <input type="text" className="form-input" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} placeholder={t('evaluations.writeQuestion')} data-testid="input-question" />
            </div>
            <button className="btn btn-primary" onClick={handleAddQuestion} data-testid="btn-add-question">
              <Plus size={16} /> {t('evaluations.addQuestion')}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <EvaluacionesForm
          formData={formData}
          setFormData={setFormData}
          editingId={editingId}
          respuestas={respuestas}
          handleRespuestaChange={handleRespuestaChange}
          handleSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingId(null); resetForm(); }}
          parcelas={parcelas}
          filteredParcelas={filteredParcelas}
          parcelaSearch={parcelaSearch}
          setParcelaSearch={setParcelaSearch}
          parcelaFilterOptions={parcelaFilterOptions}
          selectedParcelaInfo={selectedParcelaInfo}
          handleParcelaSelect={handleParcelaSelect}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          SECCIONES={SECCIONES}
          getPreguntasSeccion={getPreguntasSeccion}
          handleDragEnd={handleDragEnd}
          handleDuplicateQuestion={handleDuplicateQuestion}
          handleDeleteQuestion={handleDeleteQuestion}
          setNewQuestionSection={setNewQuestionSection}
          setShowAddQuestion={setShowAddQuestion}
          user={user}
        />
      )}

      <EvaluacionesTable
        evaluaciones={filteredEvaluaciones}
        loading={loading}
        canEdit={canEdit}
        canDelete={canDelete}
        onChangeEstado={handleChangeEstado}
        onDownloadPDF={handleDownloadPDF}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getEstadoBadge={getEstadoBadge}
      />
    </div>
  );
};

export default Evaluaciones;
