import React from 'react';
import { Info, Camera, Upload, Loader2, Sparkles, X, Image, Bug, CheckCircle, FileText, Eye, MapPin } from 'lucide-react';
import { BACKEND_URL } from '../../services/api';

const PLAGAS_ENFERMEDADES = [
  { key: 'trips', label: 'Trips' },
  { key: 'mosca_blanca', label: 'Mosca blanca' },
  { key: 'minador', label: 'Minador' },
  { key: 'arana_roja', label: 'Arana roja' },
  { key: 'oruga', label: 'Oruga' },
  { key: 'pulgon', label: 'Pulgon' },
  { key: 'botrytis', label: 'Botrytis' },
  { key: 'mildiu', label: 'Mildiu' },
  { key: 'oidio', label: 'Oidio' },
  { key: 'ascochyta', label: 'Ascochyta' }
];

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'grave': return { bg: 'hsl(0, 84%, 95%)', color: 'hsl(0, 84%, 40%)', border: 'hsl(0, 84%, 60%)' };
    case 'moderado': return { bg: 'hsl(38, 92%, 95%)', color: 'hsl(38, 92%, 40%)', border: 'hsl(38, 92%, 50%)' };
    case 'leve': return { bg: 'hsl(142, 76%, 95%)', color: 'hsl(142, 76%, 30%)', border: 'hsl(142, 76%, 40%)' };
    default: return { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: 'hsl(var(--border))' };
  }
};

export const VisitasForm = ({
  editingId, formData, setFormData,
  fieldsConfig, handleSubmit, handleCancelEdit,
  parcelas, parcelaSearch, setParcelaSearch,
  parcelaFilterOptions, selectedParcelaInfo,
  cuestionarioPlagas, setCuestionarioPlagas,
  fotos, fileInputRef, uploadingFotos, uploadError,
  handleFileSelect, deleteFoto,
  analyzeFoto, analyzeAllFotos, analyzingFoto, analyzingAll,
  setShowAnalysisModal
}) => {
  const [activeTab, setActiveTab] = React.useState('general');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem' }} data-testid="visita-form">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
          <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nueva'} Visita</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{selectedParcelaInfo ? `${selectedParcelaInfo.proveedor} - ${selectedParcelaInfo.cultivo}` : 'Selecciona una parcela'}</span></div>
        </div>
        <button onClick={handleCancelEdit} className="config-modal-close-btn"><X size={18} /></button>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
        {[
          { key: 'general', label: 'Datos Generales', icon: <FileText size={14} /> },
          { key: 'parcela', label: 'Parcela', icon: <MapPin size={14} /> },
          ...(formData.objetivo === 'Plagas y Enfermedades' ? [{ key: 'plagas', label: 'Plagas', icon: <Bug size={14} /> }] : []),
          { key: 'fotos', label: `Fotos (${fotos.length})`, icon: <Camera size={14} /> }
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
        ))}
      </div>
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
        {activeTab === 'general' && (<div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Datos de la Visita</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Objetivo *</label><select className="form-select" value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} required data-testid="select-objetivo"><option value="Control Rutinario">Control Rutinario</option><option value="Informe">Informe</option><option value="Evaluacion">Evaluacion</option><option value="Plagas y Enfermedades">Plagas y Enfermedades</option><option value="Cosecha">Cosecha</option></select></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Visita *</label><input type="date" className="form-input" value={formData.fecha_visita} onChange={(e) => setFormData({...formData, fecha_visita: e.target.value})} required data-testid="input-fecha-visita" /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Planificada</label><input type="date" className="form-input" value={formData.fecha_planificada} onChange={(e) => { const v = e.target.value; setFormData({...formData, fecha_planificada: v, ...(v ? { fecha_visita: v } : {})}); }} data-testid="input-fecha-planificada" /></div>
            </div>
          </div>
          <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="4" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Notas, incidencias observadas, recomendaciones..." style={{ fontSize: '0.85rem', resize: 'vertical' }} data-testid="textarea-observaciones" /></div>
        </div>)}

        {activeTab === 'parcela' && (<div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Buscar Parcela</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Proveedor</label><select className="form-select" value={parcelaSearch.proveedor} onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})} data-testid="parcela-search-proveedor"><option value="">Todos</option>{parcelaFilterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Cultivo</label><select className="form-select" value={parcelaSearch.cultivo} onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})} data-testid="parcela-search-cultivo"><option value="">Todos</option>{parcelaFilterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Campana</label><select className="form-select" value={parcelaSearch.campana} onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})} data-testid="parcela-search-campana"><option value="">Todas</option>{parcelaFilterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            {(parcelaSearch.proveedor || parcelaSearch.cultivo || parcelaSearch.campana) && <button type="button" onClick={() => setParcelaSearch({ proveedor: '', cultivo: '', campana: '' })} style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginBottom: '0.5rem' }}>Limpiar filtros</button>}
          </div>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Parcela *</label><select className="form-select" value={formData.parcela_id} onChange={(e) => setFormData({...formData, parcela_id: e.target.value})} required data-testid="select-parcela"><option value="">Seleccionar parcela...</option>{parcelas.filter(p => { if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false; if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false; if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false; return true; }).map(p => <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.campana}</option>)}</select></div>
          {selectedParcelaInfo && (
            <div style={{ backgroundColor: 'hsl(var(--primary) / 0.05)', border: '1px solid hsl(var(--primary) / 0.2)', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>Datos heredados de la parcela</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Proveedor</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.proveedor}</p></div>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Cultivo</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.cultivo} {selectedParcelaInfo.variedad && `(${selectedParcelaInfo.variedad})`}</p></div>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Campana</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.campana}</p></div>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Finca</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.finca || '-'}</p></div>
                <div><span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>Superficie</span><p style={{ fontWeight: '600', margin: '0.15rem 0 0 0', fontSize: '0.9rem' }}>{selectedParcelaInfo.superficie_total} ha</p></div>
              </div>
            </div>
          )}
        </div>)}

        {activeTab === 'plagas' && formData.objetivo === 'Plagas y Enfermedades' && (<div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>Cuestionario de Plagas y Enfermedades</h3>
          <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}><strong>0</strong> = Sin presencia, <strong>1</strong> = Presencia baja, <strong>2</strong> = Presencia alta</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {PLAGAS_ENFERMEDADES.map((plaga) => (
              <div key={plaga.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                <label style={{ fontWeight: '500', fontSize: '0.85rem' }}>{plaga.label}</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[0, 1, 2].map((valor) => (
                    <button key={valor} type="button" onClick={() => setCuestionarioPlagas(prev => ({...prev, [plaga.key]: valor}))} style={{ width: '32px', height: '32px', borderRadius: '50%', border: cuestionarioPlagas[plaga.key] === valor ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))', backgroundColor: cuestionarioPlagas[plaga.key] === valor ? valor === 0 ? 'hsl(142, 76%, 36%)' : valor === 1 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)' : 'hsl(var(--background))', color: cuestionarioPlagas[plaga.key] === valor ? 'white' : 'inherit', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem' }} data-testid={`plaga-${plaga.key}-${valor}`}>{valor}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>)}

        {activeTab === 'fotos' && (
          <FotosSection
            editingId={editingId} fotos={fotos} fileInputRef={fileInputRef}
            uploadingFotos={uploadingFotos} uploadError={uploadError}
            handleFileSelect={handleFileSelect} deleteFoto={deleteFoto}
            analyzeFoto={analyzeFoto} analyzeAllFotos={analyzeAllFotos}
            analyzingFoto={analyzingFoto} analyzingAll={analyzingAll}
            setShowAnalysisModal={setShowAnalysisModal}
          />
        )}

        <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button><button type="submit" className="btn btn-primary" data-testid="btn-guardar-visita">{editingId ? 'Actualizar' : 'Crear'} Visita</button></div>
      </form>
    </div>
  );
};

const FotosSection = ({
  editingId, fotos, fileInputRef, uploadingFotos, uploadError,
  handleFileSelect, deleteFoto,
  analyzeFoto, analyzeAllFotos, analyzingFoto, analyzingAll,
  setShowAnalysisModal
}) => {
  return (
    <div data-testid="fotos-section">
      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Fotos de la Visita</h3>
      <div
        style={{ border: '2px dashed hsl(var(--border))', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted) / 0.3)', cursor: 'pointer' }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'hsl(var(--border))'; const files = Array.from(e.dataTransfer.files); if (files.length > 0) { const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); fileInputRef.current.files = dt.files; handleFileSelect({ target: { files: dt.files } }); } }}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple style={{ display: 'none' }} data-testid="input-fotos" />
        {uploadingFotos ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /><span>Subiendo fotos...</span></div>
        ) : (
          <><Upload size={32} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} /><p style={{ margin: 0, color: 'hsl(var(--muted-foreground))' }}>Arrastra fotos aqui o <span style={{ color: 'hsl(var(--primary))', fontWeight: '500' }}>haz clic para seleccionar</span></p><p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>JPG, PNG, WebP (max. 10MB)</p></>
        )}
      </div>
      {uploadError && <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'hsl(var(--destructive) / 0.1)', borderRadius: '6px', color: 'hsl(var(--destructive))', fontSize: '0.85rem' }}>{uploadError}</div>}
      {fotos.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: '500', margin: 0 }}>{fotos.length} foto{fotos.length !== 1 ? 's' : ''}</p>
            {editingId && fotos.length > 0 && !fotos.some(f => f.pending) && (
              <button type="button" onClick={() => analyzeAllFotos(editingId)} disabled={analyzingAll} className="btn btn-sm" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }} data-testid="btn-analizar-todas">{analyzingAll ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}{analyzingAll ? 'Analizando...' : 'Analizar todas con IA'}</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {fotos.map((foto, index) => {
              const hasAnalysis = foto.ai_analysis && !foto.ai_analysis.error;
              const analysis = foto.ai_analysis;
              const severityStyle = hasAnalysis && analysis.detected ? getSeverityColor(analysis.severity) : null;
              return (
                <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: hasAnalysis && analysis.detected ? `2px solid ${severityStyle?.border}` : '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted))' }}>
                  <div style={{ aspectRatio: '1', position: 'relative' }}>
                    <img src={foto.pending ? foto.preview : `${BACKEND_URL}${foto.url}`} alt={foto.filename || `Foto ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    {foto.pending && <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'hsl(38 92% 50%)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '4px' }}>Pendiente</div>}
                    {hasAnalysis && <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: analysis.detected ? severityStyle?.bg : 'hsl(142, 76%, 95%)', color: analysis.detected ? severityStyle?.color : 'hsl(142, 76%, 30%)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>{analysis.detected ? <Bug size={10} /> : <CheckCircle size={10} />}{analysis.detected ? analysis.severity?.toUpperCase() : 'SANA'}</div>}
                    <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                      {editingId && !foto.pending && <button type="button" onClick={() => analyzeFoto(editingId, index)} disabled={analyzingFoto === index} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Analizar con IA" data-testid={`analyze-foto-${index}`}>{analyzingFoto === index ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}</button>}
                      <button type="button" onClick={() => deleteFoto(editingId, index)} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'hsl(var(--destructive))', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar" data-testid={`delete-foto-${index}`}><X size={14} /></button>
                    </div>
                  </div>
                  {hasAnalysis && analysis.detected && <div style={{ padding: '0.4rem', backgroundColor: severityStyle?.bg, borderTop: `1px solid ${severityStyle?.border}`, cursor: 'pointer' }} onClick={() => setShowAnalysisModal(analysis)}><p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '600', color: severityStyle?.color }}>{analysis.pest_or_disease}</p></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
