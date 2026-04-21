import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Copy, GripVertical, X } from 'lucide-react';
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
  const [activeTab, setActiveTab] = React.useState('general');

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
          {SECCIONES.map(seccion => {
            const preguntas = getPreguntasSeccion(seccion.key);
            const isExpanded = expandedSections[seccion.key];
            return (
              <div key={seccion.key} style={{ marginBottom: '0.5rem', border: '1px solid hsl(var(--border))', borderRadius: '8px', overflow: 'hidden' }}>
                <button type="button" onClick={() => toggleSection(seccion.key)} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                  <span>{seccion.label} ({preguntas.length})</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {(user?.role === 'Admin' || user?.role === 'Manager') && <button type="button" onClick={(e) => { e.stopPropagation(); setNewQuestionSection(seccion.key); setShowAddQuestion(true); }} style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Plus size={12} /></button>}
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0.75rem' }}>
                    {preguntas.length === 0 ? <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>{t('evaluations.noQuestions')}</p> : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, seccion.key)}>
                        <SortableContext items={preguntas.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          {preguntas.map((pregunta, idx) => {
                            const isCustom = pregunta.id.startsWith('custom_');
                            const canDrag = (user?.role === 'Admin' || user?.role === 'Manager');
                            return (
                              <SortableQuestion key={pregunta.id} pregunta={pregunta} idx={idx} isCustom={isCustom} canDrag={canDrag}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.85rem' }}>{idx + 1}. {pregunta.pregunta}{isCustom && <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', marginLeft: '0.5rem' }}>({t('evaluations.custom')})</span>}</label>
                                  {renderCampoRespuesta(pregunta)}
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                  {(user?.role === 'Admin' || user?.role === 'Manager') && <button type="button" onClick={() => handleDuplicateQuestion(pregunta, seccion.key)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)', cursor: 'pointer' }} title={t('evaluations.duplicateQuestion')}><Copy size={14} /></button>}
                                  {isCustom && user?.role === 'Admin' && <button type="button" onClick={() => handleDeleteQuestion(pregunta.id, seccion.key)} style={{ padding: '0.25rem', borderRadius: '4px', backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', border: '1px solid hsl(var(--destructive) / 0.3)', cursor: 'pointer' }} title={t('evaluations.deleteQuestion')}><Trash2 size={14} /></button>}
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
        </div>)}
        {activeTab === 'cuestionarios' && !formData.parcela_id && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><p style={{ fontSize: '0.85rem' }}>Selecciona una parcela en la pestana anterior para ver los cuestionarios</p></div>
        )}

        <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={onCancel}>{t('common.cancel')}</button><button type="submit" className="btn btn-primary" data-testid="btn-guardar-evaluacion">{editingId ? t('common.update') : t('common.save')} Evaluacion</button></div>
      </form>
    </div>
  );
};

export default EvaluacionesForm;
