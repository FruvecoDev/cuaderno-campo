import React from 'react';
import { Plus, X, Leaf, Sprout, Eye, Settings, Droplets, Thermometer } from 'lucide-react';

/**
 * Modal tabulado para crear/editar un cultivo.
 *
 * Extraído de Cultivos.js para reducir su tamaño y aislar la lógica del formulario.
 * Consumido por Cultivos.js. No añade estado nuevo: recibe formData y setters como props.
 */
const CultivoFormModal = ({
  show,
  editingId,
  activeTab,
  setActiveTab,
  onClose,
  onSubmit,
  formData,
  setFormData,
  nextCodigo,
  tiposCultivo,
  onOpenTiposManager,
  nuevaVariedad,
  setNuevaVariedad,
  addVariedad,
  removeVariedad,
  changelog,
  onLoadChangelog,
}) => {
  if (!show) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      data-testid="cultivo-form-modal"
    >
      <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(142 76% 36% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Leaf size={20} style={{ color: 'hsl(142 76% 36%)' }} /></div>
            <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Cultivo</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>ID: {formData.codigo_cultivo || nextCodigo}</span></div>
          </div>
          <button onClick={onClose} className="config-modal-close-btn"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
          {[
            { key: 'general', label: 'Datos Generales', icon: <Leaf size={14} /> },
            { key: 'tecnico', label: 'Detalles Tecnicos', icon: <Sprout size={14} /> },
            { key: 'historial', label: 'Historial', icon: <Eye size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); if (tab.key === 'historial' && editingId) onLoadChangelog(editingId); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
          {activeTab === 'general' && (
            <div>
              {/* Identificación */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificacion</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 200px', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>ID Cultivo</label><input type="text" className="form-input" value={formData.codigo_cultivo || nextCodigo} disabled style={{ backgroundColor: 'hsl(var(--muted))', textAlign: 'center' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre *</label><input type="text" className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required data-testid="input-nombre-cultivo" /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      Tipo
                      <button type="button" onClick={onOpenTiposManager} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', padding: 0 }} title="Gestionar tipos"><Settings size={12} /></button>
                    </label>
                    <select className="form-input" value={formData.tipo || ''} onChange={e => setFormData({ ...formData, tipo: e.target.value })} data-testid="select-tipo-cultivo">
                      <option value="">-- Tipo --</option>
                      {tiposCultivo.map(t => <option key={t._id} value={t.nombre}>{t.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Características */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Caracteristicas</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Unidad de Medida</label><select className="form-input" value={formData.unidad_medida} onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })}><option value="kg">Kilogramos (kg)</option><option value="toneladas">Toneladas (t)</option><option value="unidades">Unidades</option><option value="cajas">Cajas</option></select></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Ciclo de Cultivo</label><select className="form-input" value={formData.ciclo_cultivo} onChange={e => setFormData({ ...formData, ciclo_cultivo: e.target.value })}><option value="">Seleccionar...</option><option value="Corto">Corto (3-4 meses)</option><option value="Medio">Medio (5-6 meses)</option><option value="Largo">Largo (7+ meses)</option></select></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Temporada</label><select className="form-input" value={formData.temporada || ''} onChange={e => setFormData({ ...formData, temporada: e.target.value })}><option value="">Seleccionar...</option><option value="Primavera-Verano">Primavera-Verano</option><option value="Otono-Invierno">Otono-Invierno</option><option value="Todo el ano">Todo el ano</option></select></div>
                </div>

                {/* Variedades chip-input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Variedades
                    <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'hsl(var(--muted-foreground))' }}>
                      (puedes añadir varias — la primera se toma como principal)
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: RAF, Piquillo, Galia — pulsa Enter o Añadir"
                      value={nuevaVariedad}
                      onChange={e => setNuevaVariedad(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariedad(); } }}
                      data-testid="input-variedad-cultivo"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={addVariedad}
                      disabled={!nuevaVariedad.trim()}
                      data-testid="btn-add-variedad-cultivo"
                    >
                      <Plus size={14} /> Añadir
                    </button>
                  </div>
                  {(formData.variedades || []).length > 0 && (
                    <div
                      data-testid="variedades-list"
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem', padding: '0.5rem', background: 'hsl(var(--muted)/0.3)', border: '1px solid hsl(var(--border))', borderRadius: '6px', minHeight: '40px' }}
                    >
                      {formData.variedades.map((v, idx) => (
                        <span
                          key={`${v}-${idx}`}
                          data-testid={`variedad-chip-${idx}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '500', background: idx === 0 ? 'hsl(142 76% 36% / 0.15)' : 'hsl(var(--background))', color: idx === 0 ? 'hsl(142 76% 30%)' : 'hsl(var(--foreground))', border: '1px solid ' + (idx === 0 ? 'hsl(142 76% 36% / 0.35)' : 'hsl(var(--border))') }}
                        >
                          {idx === 0 && <span title="Variedad principal" style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>★</span>}
                          {v}
                          <button
                            type="button"
                            onClick={() => removeVariedad(idx)}
                            data-testid={`btn-remove-variedad-${idx}`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', color: 'hsl(var(--muted-foreground))' }}
                            title="Eliminar variedad"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones / científico / activo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1.25rem', alignItems: 'start', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="2" value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} style={{ fontSize: '0.85rem', resize: 'vertical' }} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre Cientifico</label><input type="text" className="form-input" placeholder="Ej: Solanum lycopersicum" value={formData.nombre_cientifico || ''} onChange={e => setFormData({ ...formData, nombre_cientifico: e.target.value })} style={{ fontSize: '0.85rem' }} /></div>
                <div style={{ paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.activo ? 'hsl(142 76% 36%/0.1)' : 'hsl(var(--muted))', border: '1px solid ' + (formData.activo ? 'hsl(142 76% 36%/0.3)' : 'hsl(var(--border))') }}>
                    <input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: formData.activo ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))' }}>{formData.activo ? 'Activo' : 'Inactivo'}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tecnico' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Clasificacion Botanica</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Familia Botanica</label><input type="text" className="form-input" placeholder="Ej: Solanaceae, Cucurbitaceae" value={formData.familia_botanica || ''} onChange={e => setFormData({ ...formData, familia_botanica: e.target.value })} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre Cientifico</label><input type="text" className="form-input" placeholder="Ej: Solanum lycopersicum" value={formData.nombre_cientifico || ''} onChange={e => setFormData({ ...formData, nombre_cientifico: e.target.value })} /></div>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Parametros de Plantacion</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Marco de Plantacion</label><input type="text" className="form-input" placeholder="Ej: 1.5m x 0.5m" value={formData.marco_plantacion || ''} onChange={e => setFormData({ ...formData, marco_plantacion: e.target.value })} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Densidad Plantacion</label><input type="text" className="form-input" placeholder="Ej: 13.300 plantas/ha" value={formData.densidad_plantacion || ''} onChange={e => setFormData({ ...formData, densidad_plantacion: e.target.value })} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Profundidad de Siembra</label><input type="text" className="form-input" placeholder="Ej: 2-3 cm" value={formData.profundidad_siembra || ''} onChange={e => setFormData({ ...formData, profundidad_siembra: e.target.value })} /></div>
                </div>
              </div>
              <div style={{ background: 'hsl(var(--muted)/0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Condiciones de Cultivo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Droplets size={12} /> Necesidades de Riego</label><select className="form-input" value={formData.necesidades_riego || ''} onChange={e => setFormData({ ...formData, necesidades_riego: e.target.value })}><option value="">Seleccionar...</option><option value="Bajo">Bajo</option><option value="Medio">Medio</option><option value="Alto">Alto</option><option value="Muy alto">Muy alto</option></select></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Thermometer size={12} /> Temperatura Optima</label><input type="text" className="form-input" placeholder="Ej: 18-25 C" value={formData.temperatura_optima || ''} onChange={e => setFormData({ ...formData, temperatura_optima: e.target.value })} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>pH Suelo Recomendado</label><input type="text" className="form-input" placeholder="Ej: 6.0-7.0" value={formData.ph_suelo || ''} onChange={e => setFormData({ ...formData, ph_suelo: e.target.value })} /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>Log de Cambios</h3>
              {!editingId ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}>
                  <Eye size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem' }}>El historial estara disponible una vez guardado el cultivo</p>
                </div>
              ) : changelog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.85rem' }}>Sin cambios registrados</p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {changelog.map((entry, idx) => (
                    <div key={entry._id || idx} style={{ borderLeft: '3px solid ' + (entry.action === 'creacion' ? 'hsl(142 76% 36%)' : entry.action === 'eliminacion' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'), padding: '0.75rem 1rem', marginBottom: '0.75rem', background: 'hsl(var(--muted)/0.2)', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', backgroundColor: entry.action === 'creacion' ? 'hsl(142 76% 36%/0.1)' : entry.action === 'eliminacion' ? 'hsl(var(--destructive)/0.1)' : 'hsl(var(--primary)/0.1)', color: entry.action === 'creacion' ? 'hsl(142 76% 36%)' : entry.action === 'eliminacion' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}>{entry.action}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{entry.user_name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{new Date(entry.timestamp).toLocaleString('es-ES')}</span>
                      </div>
                      {entry.changes && entry.changes.length > 0 && (
                        <div style={{ marginTop: '0.4rem' }}>
                          {entry.changes.map((ch, ci) => (
                            <div key={`${entry._id || entry.timestamp || 'entry'}-${ch.field}-${ci}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '600', minWidth: '120px' }}>{ch.field}:</span>
                              {ch.old && <span style={{ color: 'hsl(var(--destructive))', textDecoration: 'line-through' }}>{String(ch.old).substring(0, 80)}</span>}
                              <span style={{ color: 'hsl(142 76% 36%)' }}>{ch.new ? String(ch.new).substring(0, 80) : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" data-testid="btn-submit-cultivo">{editingId ? 'Actualizar' : 'Crear'} Cultivo</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CultivoFormModal;
