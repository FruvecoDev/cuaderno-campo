import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Copy, GripVertical, X, Edit2, Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableQuestion = ({ pregunta, idx, isCustom, canDrag, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: pregunta.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    borderRadius: '0.375rem',
    backgroundColor: isCustom ? 'hsl(var(--primary) / 0.05)' : 'transparent',
    border: isCustom ? '1px dashed hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--border))',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {canDrag && (
        <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '0.25rem', color: 'hsl(var(--muted-foreground))' }}>
          <GripVertical size={16} />
        </div>
      )}
      {children}
    </div>
  );
};

const EvaluacionesForm = ({
  formData,
  setFormData,
  editingId,
  respuestas,
  handleRespuestaChange,
  handleSubmit,
  onCancel,
  parcelas,
  filteredParcelas,
  parcelaSearch,
  setParcelaSearch,
  parcelaFilterOptions,
  selectedParcelaInfo,
  handleParcelaSelect,
  expandedSections,
  toggleSection,
  SECCIONES,
  getPreguntasSeccion,
  handleDragEnd,
  handleDuplicateQuestion,
  handleDeleteQuestion,
  handleRestoreQuestion,
  hiddenPreguntas = {},
  preguntasDefault = {},
  setNewQuestionSection,
  setShowAddQuestion,
  fetchPreguntasConfig,
  user,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState('general');
  // Inline add question
  const [addingToSection, setAddingToSection] = React.useState(null);
  const [inlineText, setInlineText] = React.useState('');
  const [inlineType, setInlineType] = React.useState('texto');
  // Inline edit question
  const [editingQuestion, setEditingQuestion] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [editType, setEditType] = React.useState('texto');
  // Show hidden questions panel per section
  const [showHiddenForSection, setShowHiddenForSection] = React.useState(null);
  // Flat / grouped view toggle for the Cuestionarios tab
  const [flatView, setFlatView] = React.useState(() => {
    try { return localStorage.getItem('evaluaciones_flat_view') === '1'; } catch { return false; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('evaluaciones_flat_view', flatView ? '1' : '0'); } catch { /* ignore */ }
  }, [flatView]);
  // Section selector for the global add form (only in flat view)
  const [flatAddSection, setFlatAddSection] = React.useState(null);

  const handleInlineAdd = async (seccionKey) => {
    if (!inlineText.trim()) return;
    try {
      const api = (await import('../../services/api')).default;
      await api.post('/api/evaluaciones/config/preguntas', { seccion: seccionKey, pregunta: inlineText.trim(), tipo: inlineType });
      setAddingToSection(null);
      setInlineText('');
      setInlineType('texto');
      if (fetchPreguntasConfig) fetchPreguntasConfig();
    } catch (e) { console.error('[EvaluacionesForm.js]', e); }
  };

  const handleInlineEdit = async (preguntaId) => {
    if (!editText.trim()) return;
    try {
      const api = (await import('../../services/api')).default;
      await api.put(`/api/evaluaciones/config/preguntas/${preguntaId}`, { pregunta: editText.trim(), tipo: editType });
      setEditingQuestion(null);
      setEditText('');
      if (fetchPreguntasConfig) fetchPreguntasConfig();
    } catch (e) { console.error('[EvaluacionesForm.js]', e); }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const renderCampoRespuesta = (pregunta) => {
    const valor = respuestas[pregunta.id];
    if (pregunta.tipo === 'si_no') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => handleRespuestaChange(pregunta.id, true)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              border: valor === true ? '2px solid hsl(142, 76%, 36%)' : '1px solid hsl(var(--border))',
              backgroundColor: valor === true ? 'hsl(142, 76%, 36%)' : 'transparent',
              color: valor === true ? 'white' : 'inherit', cursor: 'pointer', fontWeight: '500'
            }}>{t('common.yes')}</button>
          <button type="button" onClick={() => handleRespuestaChange(pregunta.id, false)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.375rem',
              border: valor === false ? '2px solid hsl(0, 84%, 60%)' : '1px solid hsl(var(--border))',
              backgroundColor: valor === false ? 'hsl(0, 84%, 60%)' : 'transparent',
              color: valor === false ? 'white' : 'inherit', cursor: 'pointer', fontWeight: '500'
            }}>{t('common.no')}</button>
        </div>
      );
    }
    if (pregunta.tipo === 'numero') {
      return <input type="number" className="form-input" value={valor || ''} onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)} style={{ maxWidth: '150px' }} />;
    }
    if (pregunta.tipo === 'fecha') {
      return <input type="date" className="form-input" value={valor || ''} onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)} style={{ maxWidth: '200px' }} />;
    }
    return <input type="text" className="form-input" value={valor || ''} onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)} placeholder={t('evaluations.writeAnswer')} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem' }} data-testid="evaluacion-form">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Save size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
          <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? t('evaluations.editEvaluation') : t('evaluations.newEvaluation')}</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{selectedParcelaInfo ? `${selectedParcelaInfo.proveedor} - ${selectedParcelaInfo.cultivo}` : t('evaluations.selectParcel')}</span></div>
        </div>
        <button onClick={onCancel} className="config-modal-close-btn"><X size={18} /></button>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
        {[
          { key: 'general', label: t('evaluations.generalData'), icon: <Save size={14} /> },
          { key: 'parcela', label: t('evaluations.plantation'), icon: <Plus size={14} /> },
          { key: 'cuestionarios', label: t('evaluations.questionnaires'), icon: <ChevronDown size={14} /> }
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
        ))}
      </div>
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
        {activeTab === 'general' && (<div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>{t('evaluations.generalData')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('evaluations.startDate')} *</label><input type="date" className="form-input" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} required /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('evaluations.endDate')}</label><input type="date" className="form-input" value={formData.fecha_fin} onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('evaluations.technician')}</label><input type="text" className="form-input" value={formData.tecnico} onChange={(e) => setFormData({...formData, tecnico: e.target.value})} placeholder={user?.full_name || user?.username || ''} /></div>
          </div>
        </div>)}

        {activeTab === 'parcela' && (<div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>{t('evaluations.plantation')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('suppliers.title')}</label><select className="form-select" value={parcelaSearch.proveedor} onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})}><option value="">{t('common.all')}</option>{parcelaFilterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('crops.title')}</label><select className="form-select" value={parcelaSearch.cultivo} onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})}><option value="">{t('common.all')}</option>{parcelaFilterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t('contracts.campaign')}</label><select className="form-select" value={parcelaSearch.campana} onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})}><option value="">{t('common.all')}</option>{parcelaFilterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}><select className="form-select" value={formData.parcela_id} onChange={(e) => handleParcelaSelect(e.target.value)} required><option value="">{t('evaluations.selectParcel')}</option>{filteredParcelas.map(p => <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.superficie_total} ha</option>)}</select></div>
          {selectedParcelaInfo && (
            <div style={{ backgroundColor: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>{t('evaluations.plantationData')}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>{t('suppliers.title')}</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.proveedor}</p></div>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>{t('crops.title')}</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.cultivo} ({selectedParcelaInfo.variedad})</p></div>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>{t('contracts.campaign')}</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.campana}</p></div>
              </div>
            </div>
          )}
        </div>)}

        {activeTab === 'cuestionarios' && formData.parcela_id && (<div>
          {/* Toggle Vista agrupada / Vista plana */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))' }}>Vista:</span>
            <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
              <button
                type="button"
                onClick={() => setFlatView(false)}
                data-testid="vista-agrupada"
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', fontWeight: 600, background: !flatView ? 'hsl(var(--primary))' : 'white', color: !flatView ? 'white' : 'hsl(var(--foreground))', border: 'none', cursor: 'pointer' }}
              >
                Agrupada
              </button>
              <button
                type="button"
                onClick={() => setFlatView(true)}
                data-testid="vista-plana"
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', fontWeight: 600, background: flatView ? 'hsl(var(--primary))' : 'white', color: flatView ? 'white' : 'hsl(var(--foreground))', border: 'none', cursor: 'pointer' }}
              >
                Plana
              </button>
            </div>
          </div>

          {/* FLAT VIEW: todas las preguntas de todas las secciones, una tras otra */}
          {flatView && (() => {
            // Build a single flat list with the seccion attached for context.
            const flatItems = SECCIONES.flatMap(s =>
              (getPreguntasSeccion(s.key) || []).map(p => ({ ...p, _seccion: s.key, _seccionLabel: s.label }))
            );
            return (
              <div data-testid="cuestionarios-vista-plana">
                {/* Global "Añadir pregunta" panel */}
                {(user?.role === 'Admin' || user?.role === 'Manager') && (
                  <div style={{ padding: '0.6rem 0.75rem', background: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '8px', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px auto', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 600 }}>Sección</label>
                        <select
                          className="form-select"
                          value={flatAddSection || ''}
                          onChange={(e) => setFlatAddSection(e.target.value || null)}
                          data-testid="flat-add-seccion"
                        >
                          <option value="">— Selecciona sección —</option>
                          {SECCIONES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 600 }}>Nueva pregunta</label>
                        <input
                          type="text"
                          className="form-input"
                          value={inlineText}
                          onChange={(e) => setInlineText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && flatAddSection && (e.preventDefault(), handleInlineAdd(flatAddSection))}
                          placeholder="Escribe la pregunta..."
                          data-testid="flat-add-text"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 600 }}>Tipo</label>
                        <select className="form-select" value={inlineType} onChange={(e) => setInlineType(e.target.value)}>
                          <option value="texto">Texto</option>
                          <option value="si_no">Si/No</option>
                          <option value="numero">Numero</option>
                          <option value="fecha">Fecha</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!inlineText.trim() || !flatAddSection}
                        onClick={() => handleInlineAdd(flatAddSection)}
                        style={{ marginBottom: 0 }}
                        data-testid="flat-add-submit"
                      >
                        <Check size={14} /> Anadir
                      </button>
                    </div>
                  </div>
                )}

                {/* Continuous list of all questions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {flatItems.length === 0 ? (
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                      {t('evaluations.noQuestions')}
                    </p>
                  ) : flatItems.map((pregunta, idx) => {
                    const isCustom = pregunta.id.startsWith('custom_');
                    const seccionKey = pregunta._seccion;
                    return (
                      <div key={pregunta.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'white' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '999px', background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {pregunta._seccionLabel}
                            </span>
                            <label style={{ fontWeight: 500, fontSize: '0.85rem', margin: 0 }}>
                              {idx + 1}. {pregunta.pregunta}
                              {isCustom && <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', marginLeft: '0.4rem' }}>(personalizada)</span>}
                            </label>
                          </div>
                          {renderCampoRespuesta(pregunta)}
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, paddingTop: '0.1rem' }}>
                          {(user?.role === 'Admin' || user?.role === 'Manager') && (
                            <button type="button" onClick={() => handleDuplicateQuestion(pregunta, seccionKey)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)', cursor: 'pointer' }} title="Duplicar"><Copy size={14} /></button>
                          )}
                          {user?.role === 'Admin' && (
                            <button type="button" onClick={() => handleDeleteQuestion(pregunta.id, seccionKey)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)', cursor: 'pointer' }} title={isCustom ? 'Eliminar' : 'Ocultar pregunta predeterminada'}><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* GROUPED VIEW (original) */}
          {!flatView && SECCIONES.map(seccion => {
            const preguntas = getPreguntasSeccion(seccion.key);
            const isExpanded = expandedSections[seccion.key];
            const hiddenIds = (hiddenPreguntas && hiddenPreguntas[seccion.key]) || [];
            const hiddenCount = hiddenIds.length;
            const defaultsBySection = preguntasDefault[seccion.key] || [];
            const hiddenItems = hiddenIds
              .map(id => defaultsBySection.find(p => p.id === id))
              .filter(Boolean);
            const isShowingHidden = showHiddenForSection === seccion.key;
            return (
              <div key={seccion.key} style={{ marginBottom: '0.5rem', border: '1px solid hsl(var(--border))', borderRadius: '8px', overflow: 'hidden' }}>
                <button type="button" onClick={() => toggleSection(seccion.key)} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                  <span>{seccion.label} ({preguntas.length})</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {hiddenCount > 0 && (user?.role === 'Admin' || user?.role === 'Manager') && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setShowHiddenForSection(isShowingHidden ? null : seccion.key); if (!isExpanded) toggleSection(seccion.key); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); setShowHiddenForSection(isShowingHidden ? null : seccion.key); if (!isExpanded) toggleSection(seccion.key); } }}
                        style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: isShowingHidden ? 'hsl(38 92% 50%)' : 'hsl(38 92% 50% / 0.15)', color: isShowingHidden ? 'white' : 'hsl(38 92% 40%)', border: '1px solid hsl(38 92% 50% / 0.4)', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                        title={isShowingHidden ? 'Ocultar panel' : 'Ver preguntas ocultas'}
                        data-testid={`chip-ocultas-${seccion.key}`}
                      >
                        {hiddenCount} oculta{hiddenCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {(user?.role === 'Admin' || user?.role === 'Manager') && <button type="button" onClick={(e) => { e.stopPropagation(); setAddingToSection(addingToSection === seccion.key ? null : seccion.key); setInlineText(''); setInlineType('texto'); }} style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: addingToSection === seccion.key ? 'hsl(var(--destructive))' : 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title="Anadir pregunta">{addingToSection === seccion.key ? <X size={12} /> : <Plus size={12} />}</button>}
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {/* Panel de Preguntas Ocultas */}
                {isExpanded && isShowingHidden && hiddenItems.length > 0 && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'hsl(38 92% 50% / 0.06)', borderBottom: '1px solid hsl(38 92% 50% / 0.2)' }} data-testid={`panel-ocultas-${seccion.key}`}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(38 92% 40%)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Preguntas predeterminadas ocultas ({hiddenItems.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {hiddenItems.map(pq => (
                        <div key={pq.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: '6px', background: 'white', border: '1px solid hsl(var(--border))' }}>
                          <span style={{ fontSize: '0.82rem', color: 'hsl(var(--muted-foreground))', flex: 1, paddingRight: '0.5rem' }}>{pq.pregunta}</span>
                          {handleRestoreQuestion && (
                            <button
                              type="button"
                              onClick={() => handleRestoreQuestion(pq.id, seccion.key)}
                              style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', backgroundColor: 'hsl(142 76% 36%)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                              title="Restaurar pregunta"
                              data-testid={`btn-restaurar-${pq.id}`}
                            >
                              <Check size={12} /> Restaurar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Inline Add Question Form */}
                {addingToSection === seccion.key && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'hsl(var(--primary) / 0.05)', borderBottom: '1px solid hsl(var(--border))' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '0.5rem', alignItems: 'end' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Nueva pregunta</label><input type="text" className="form-input" value={inlineText} onChange={(e) => setInlineText(e.target.value)} placeholder="Escribe la pregunta..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInlineAdd(seccion.key))} autoFocus /></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Tipo</label><select className="form-select" value={inlineType} onChange={(e) => setInlineType(e.target.value)}><option value="texto">Texto</option><option value="si_no">Si/No</option><option value="numero">Numero</option><option value="fecha">Fecha</option></select></div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleInlineAdd(seccion.key)} disabled={!inlineText.trim()} style={{ marginBottom: 0 }}><Check size={14} /> Anadir</button>
                    </div>
                  </div>
                )}
                {isExpanded && (
                  <div style={{ padding: '0.75rem' }}>
                    {preguntas.length === 0 ? <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>{t('evaluations.noQuestions')}</p> : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, seccion.key)}>
                        <SortableContext items={preguntas.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          {preguntas.map((pregunta, idx) => {
                            const isCustom = pregunta.id.startsWith('custom_');
                            const canDrag = (user?.role === 'Admin' || user?.role === 'Manager');
                            const isEditing = editingQuestion === pregunta.id;
                            return (
                              <SortableQuestion key={pregunta.id} pregunta={pregunta} idx={idx} isCustom={isCustom} canDrag={canDrag}>
                                <div style={{ flex: 1 }}>
                                  {isEditing ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto auto', gap: '0.4rem', alignItems: 'end' }}>
                                      <input type="text" className="form-input" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInlineEdit(pregunta.id))} autoFocus style={{ fontSize: '0.85rem' }} />
                                      <select className="form-select" value={editType} onChange={(e) => setEditType(e.target.value)} style={{ fontSize: '0.8rem' }}><option value="texto">Texto</option><option value="si_no">Si/No</option><option value="numero">Numero</option><option value="fecha">Fecha</option></select>
                                      <button type="button" onClick={() => handleInlineEdit(pregunta.id)} style={{ padding: '0.3rem', borderRadius: '4px', backgroundColor: 'hsl(142 76% 36%)', color: 'white', border: 'none', cursor: 'pointer' }} title="Guardar"><Check size={14} /></button>
                                      <button type="button" onClick={() => setEditingQuestion(null)} style={{ padding: '0.3rem', borderRadius: '4px', backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))', cursor: 'pointer' }} title="Cancelar"><X size={14} /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.85rem' }}>{idx + 1}. {pregunta.pregunta}{isCustom && <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', marginLeft: '0.5rem' }}>(personalizada)</span>}</label>
                                      {renderCampoRespuesta(pregunta)}
                                    </>
                                  )}
                                </div>
                                {!isEditing && (
                                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                    {isCustom && (user?.role === 'Admin' || user?.role === 'Manager') && <button type="button" onClick={() => { setEditingQuestion(pregunta.id); setEditText(pregunta.pregunta); setEditType(pregunta.tipo); }} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(38 92% 50% / 0.1)', color: 'hsl(38 92% 50%)', border: '1px solid hsl(38 92% 50% / 0.3)', cursor: 'pointer' }} title="Editar pregunta"><Edit2 size={14} /></button>}
                                    {(user?.role === 'Admin' || user?.role === 'Manager') && <button type="button" onClick={() => handleDuplicateQuestion(pregunta, seccion.key)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)', cursor: 'pointer' }} title="Duplicar"><Copy size={14} /></button>}
                                    {isCustom && user?.role === 'Admin' && <button type="button" onClick={() => handleDeleteQuestion(pregunta.id, seccion.key)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)', cursor: 'pointer' }} title="Eliminar"><Trash2 size={14} /></button>}
                                    {!isCustom && user?.role === 'Admin' && <button type="button" onClick={() => handleDeleteQuestion(pregunta.id, seccion.key)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)', cursor: 'pointer' }} title="Ocultar pregunta predeterminada" data-testid={`btn-eliminar-pregunta-${pregunta.id}`}><Trash2 size={14} /></button>}
                                  </div>
                                )}
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
        </div>)}
        {activeTab === 'cuestionarios' && !formData.parcela_id && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><p style={{ fontSize: '0.85rem' }}>Selecciona una parcela en la pestana anterior para ver los cuestionarios</p></div>
        )}

        <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button><button type="submit" className="btn btn-primary" data-testid="btn-guardar-evaluacion">{t('common.save')} Evaluacion</button></div>
      </form>
    </div>
  );
};

export default EvaluacionesForm;
