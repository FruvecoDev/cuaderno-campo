import React from 'react';
import { Info, Camera, Upload, Loader2, Sparkles, X, Image, Bug, CheckCircle } from 'lucide-react';
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
  return (
    <div className="card mb-6" data-testid="visita-form">
      <h2 className="card-title">{editingId ? 'Editar Visita' : 'Crear Visita'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            <Info size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            <strong>Modelo simplificado:</strong> Solo selecciona la Parcela. El Contrato, Proveedor, Cultivo y Campana se heredan automaticamente.
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
                <option value="Evaluacion">Evaluacion</option>
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
          
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Fecha Planificada
              <span style={{ 
                fontSize: '0.7rem', backgroundColor: '#e3f2fd', color: '#1976d2', 
                padding: '2px 6px', borderRadius: '4px' 
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
                if (nuevaFechaPlanificada) {
                  setFormData({...formData, fecha_planificada: nuevaFechaPlanificada, fecha_visita: nuevaFechaPlanificada});
                } else {
                  setFormData({...formData, fecha_planificada: nuevaFechaPlanificada});
                }
              }}
              data-testid="input-fecha-planificada"
            />
            <small style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>
              Al establecer fecha planificada, la fecha de visita se actualizara automaticamente
            </small>
          </div>
        </div>
        
        {/* SELECTOR DE PARCELA CON BUSQUEDA */}
        <div className="form-group">
          <label className="form-label">Parcela * (Obligatorio - define el contexto)</label>
          
          <div style={{ 
            backgroundColor: 'hsl(var(--muted))', padding: '1rem', 
            borderRadius: '0.5rem', marginBottom: '0.75rem' 
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
                <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Campana</label>
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
                  marginTop: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--primary))',
                  background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                Limpiar filtros de busqueda
              </button>
            )}
          </div>
          
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
        
        {/* Info heredada de la parcela */}
        {selectedParcelaInfo && (
          <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos heredados de la parcela:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div><strong>Proveedor:</strong> {selectedParcelaInfo.proveedor}</div>
              <div><strong>Cultivo:</strong> {selectedParcelaInfo.cultivo}</div>
              <div><strong>Variedad:</strong> {selectedParcelaInfo.variedad}</div>
              <div><strong>Campana:</strong> {selectedParcelaInfo.campana}</div>
              <div><strong>Finca:</strong> {selectedParcelaInfo.finca}</div>
              <div><strong>Superficie:</strong> {selectedParcelaInfo.superficie_total} ha</div>
            </div>
          </div>
        )}
        
        {/* CUESTIONARIO DE PLAGAS */}
        {formData.objetivo === 'Plagas y Enfermedades' && fieldsConfig.cuestionario_plagas && (
          <div className="card" style={{ 
            backgroundColor: 'hsl(var(--warning) / 0.1)', marginBottom: '1.5rem', 
            padding: '1.5rem', border: '1px solid hsl(var(--warning) / 0.3)', borderRadius: '0.5rem'
          }} data-testid="cuestionario-plagas">
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: 'hsl(var(--warning))' }}>
              Cuestionario de Plagas y Enfermedades
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
              Evalue cada plaga/enfermedad: <strong>0</strong> = Sin presencia, <strong>1</strong> = Presencia baja, <strong>2</strong> = Presencia alta
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {PLAGAS_ENFERMEDADES.map((plaga) => (
                <div key={plaga.key} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', backgroundColor: 'hsl(var(--background))',
                  borderRadius: '0.375rem', border: '1px solid hsl(var(--border))'
                }}>
                  <label style={{ fontWeight: '500', fontSize: '0.875rem' }}>{plaga.label}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[0, 1, 2].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setCuestionarioPlagas(prev => ({...prev, [plaga.key]: valor}))}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          border: cuestionarioPlagas[plaga.key] === valor 
                            ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                          backgroundColor: cuestionarioPlagas[plaga.key] === valor 
                            ? valor === 0 ? 'hsl(142, 76%, 36%)' : valor === 1 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)'
                            : 'hsl(var(--background))',
                          color: cuestionarioPlagas[plaga.key] === valor ? 'white' : 'inherit',
                          fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
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
        
        {/* SECCION DE FOTOS */}
        <FotosSection
          editingId={editingId}
          fotos={fotos}
          fileInputRef={fileInputRef}
          uploadingFotos={uploadingFotos}
          uploadError={uploadError}
          handleFileSelect={handleFileSelect}
          deleteFoto={deleteFoto}
          analyzeFoto={analyzeFoto}
          analyzeAllFotos={analyzeAllFotos}
          analyzingFoto={analyzingFoto}
          analyzingAll={analyzingAll}
          setShowAnalysisModal={setShowAnalysisModal}
        />
        
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" data-testid="btn-guardar-visita">
            {editingId ? 'Actualizar Visita' : 'Guardar Visita'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
            Cancelar
          </button>
        </div>
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
    <div className="form-group" data-testid="fotos-section">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Camera size={18} />
        Fotos de la Visita
        <span style={{ 
          fontSize: '0.7rem', backgroundColor: '#e8f5e9', color: '#2e7d32', 
          padding: '2px 6px', borderRadius: '4px' 
        }}>
          Opcional - JPG, PNG, WebP (max. 10MB)
        </span>
      </label>
      
      <div 
        style={{
          border: '2px dashed hsl(var(--border))', borderRadius: '0.5rem',
          padding: '1.5rem', textAlign: 'center',
          backgroundColor: 'hsl(var(--muted) / 0.3)', cursor: 'pointer',
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
              Arrastra fotos aqui o <span style={{ color: 'hsl(var(--primary))', fontWeight: '500' }}>haz clic para seleccionar</span>
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
              Maximo 10 fotos por subida
            </p>
          </>
        )}
      </div>
      
      {uploadError && (
        <div style={{ 
          marginTop: '0.5rem', padding: '0.5rem', 
          backgroundColor: 'hsl(var(--destructive) / 0.1)', borderRadius: '0.375rem',
          color: 'hsl(var(--destructive))', fontSize: '0.875rem'
        }}>
          {uploadError}
        </div>
      )}
      
      {fotos.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', margin: 0 }}>
              {fotos.length} foto{fotos.length !== 1 ? 's' : ''} adjunta{fotos.length !== 1 ? 's' : ''}
            </p>
            {editingId && fotos.length > 0 && !fotos.some(f => f.pending) && (
              <button
                type="button"
                onClick={() => analyzeAllFotos(editingId)}
                disabled={analyzingAll}
                className="btn btn-sm"
                style={{
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  border: '1px solid hsl(var(--primary) / 0.3)',
                  display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}
                data-testid="btn-analizar-todas"
              >
                {analyzingAll ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Sparkles size={14} />
                )}
                {analyzingAll ? 'Analizando...' : 'Analizar todas con IA'}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {fotos.map((foto, index) => {
              const hasAnalysis = foto.ai_analysis && !foto.ai_analysis.error;
              const analysis = foto.ai_analysis;
              const severityStyle = hasAnalysis && analysis.detected ? getSeverityColor(analysis.severity) : null;
              
              return (
                <div 
                  key={index}
                  style={{
                    position: 'relative', borderRadius: '0.5rem', overflow: 'hidden',
                    border: hasAnalysis && analysis.detected 
                      ? `2px solid ${severityStyle?.border}` : '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--muted))'
                  }}
                >
                  <div style={{ aspectRatio: '1', position: 'relative' }}>
                    <img
                      src={foto.pending ? foto.preview : `${BACKEND_URL}${foto.url}`}
                      alt={foto.filename || `Foto ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div style={{
                      display: 'none', width: '100%', height: '100%',
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'hsl(var(--muted))'
                    }}>
                      <Image size={32} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    </div>
                    
                    {foto.pending && (
                      <div style={{
                        position: 'absolute', top: '4px', left: '4px',
                        backgroundColor: 'hsl(var(--warning))', color: 'white',
                        fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px'
                      }}>
                        Pendiente
                      </div>
                    )}
                    
                    {hasAnalysis && (
                      <div style={{
                        position: 'absolute', top: '4px', left: '4px',
                        backgroundColor: analysis.detected ? severityStyle?.bg : 'hsl(142, 76%, 95%)',
                        color: analysis.detected ? severityStyle?.color : 'hsl(142, 76%, 30%)',
                        fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                        display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600'
                      }}>
                        {analysis.detected ? <Bug size={10} /> : <CheckCircle size={10} />}
                        {analysis.detected ? analysis.severity?.toUpperCase() : 'SANA'}
                      </div>
                    )}
                    
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      display: 'flex', gap: '4px'
                    }}>
                      {editingId && !foto.pending && (
                        <button
                          type="button"
                          onClick={() => analyzeFoto(editingId, index)}
                          disabled={analyzingFoto === index}
                          style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            backgroundColor: 'hsl(var(--primary))', color: 'white',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          title="Analizar con IA"
                          data-testid={`analyze-foto-${index}`}
                        >
                          {analyzingFoto === index ? (
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Sparkles size={12} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteFoto(editingId, index)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          backgroundColor: 'hsl(var(--destructive))', color: 'white',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Eliminar foto"
                        data-testid={`delete-foto-${index}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {hasAnalysis && analysis.detected && (
                    <div 
                      style={{
                        padding: '0.5rem', backgroundColor: severityStyle?.bg,
                        borderTop: `1px solid ${severityStyle?.border}`, cursor: 'pointer'
                      }}
                      onClick={() => setShowAnalysisModal(analysis)}
                    >
                      <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '600', color: severityStyle?.color }}>
                        {analysis.pest_or_disease}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))' }}>
                        Confianza: {analysis.confidence}% - Clic para ver mas
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
