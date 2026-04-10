import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Copy, GripVertical } from 'lucide-react';
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
  setNewQuestionSection,
  setShowAddQuestion,
  user,
}) => {
  const { t } = useTranslation();

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
    <div className="card mb-6" data-testid="evaluacion-form">
      <h2 className="card-title">{editingId ? t('evaluations.editEvaluation') : t('evaluations.newEvaluation')}</h2>
      <form onSubmit={handleSubmit}>
        {/* Datos Generales */}
        <div style={{ backgroundColor: 'hsl(var(--muted))', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{t('evaluations.generalData')}</h3>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">{t('evaluations.startDate')} *</label>
              <input type="date" className="form-input" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('evaluations.endDate')}</label>
              <input type="date" className="form-input" value={formData.fecha_fin} onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('evaluations.technician')}</label>
              <input type="text" className="form-input" value={formData.tecnico} onChange={(e) => setFormData({...formData, tecnico: e.target.value})} placeholder={user?.full_name || user?.username || t('evaluations.technicianName')} />
            </div>
          </div>
        </div>

        {/* Selector de Parcela */}
        <div style={{ backgroundColor: 'hsl(var(--primary) / 0.05)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid hsl(var(--primary) / 0.2)' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{t('evaluations.plantation')} *</h3>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>{t('evaluations.searchParcelBy')}</p>
          <div className="grid-3" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('suppliers.title')}</label>
              <select className="form-select" value={parcelaSearch.proveedor} onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})}>
                <option value="">{t('common.all')}</option>
                {parcelaFilterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('crops.title')}</label>
              <select className="form-select" value={parcelaSearch.cultivo} onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})}>
                <option value="">{t('common.all')}</option>
                {parcelaFilterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('contracts.campaign')}</label>
              <select className="form-select" value={parcelaSearch.campana} onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})}>
                <option value="">{t('common.all')}</option>
                {parcelaFilterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <select className="form-select" value={formData.parcela_id} onChange={(e) => handleParcelaSelect(e.target.value)} required>
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
                <div key={seccion.key} style={{ marginBottom: '0.5rem', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <button type="button" onClick={() => toggleSection(seccion.key)}
                    style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                    <span>{seccion.icon} {seccion.label} ({preguntas.length})</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {(user?.role === 'Admin' || user?.role === 'Manager') && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setNewQuestionSection(seccion.key); setShowAddQuestion(true); }}
                          style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                          title={t('evaluations.addQuestionToSection')} data-testid={`btn-add-question-${seccion.key}`}>
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
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, seccion.key)}>
                          <SortableContext items={preguntas.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            {preguntas.map((pregunta, idx) => {
                              const isCustom = pregunta.id.startsWith('custom_');
                              const canDrag = (user?.role === 'Admin' || user?.role === 'Manager');
                              return (
                                <SortableQuestion key={pregunta.id} pregunta={pregunta} idx={idx} isCustom={isCustom} canDrag={canDrag}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                      {idx + 1}. {pregunta.pregunta}
                                      {isCustom && <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', marginLeft: '0.5rem' }}>({t('evaluations.custom')})</span>}
                                    </label>
                                    {renderCampoRespuesta(pregunta)}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                    {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                      <button type="button" onClick={() => handleDuplicateQuestion(pregunta, seccion.key)}
                                        style={{ padding: '0.25rem', borderRadius: '0.25rem', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)', cursor: 'pointer' }}
                                        title={t('evaluations.duplicateQuestion')} data-testid={`btn-duplicate-question-${pregunta.id}`}>
                                        <Copy size={14} />
                                      </button>
                                    )}
                                    {isCustom && user?.role === 'Admin' && (
                                      <button type="button" onClick={() => handleDeleteQuestion(pregunta.id, seccion.key)}
                                        style={{ padding: '0.25rem', borderRadius: '0.25rem', backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)', cursor: 'pointer' }}
                                        title={t('evaluations.deleteQuestion')} data-testid={`btn-delete-question-${pregunta.id}`}>
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
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EvaluacionesForm;
