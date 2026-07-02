import React, { useMemo, useEffect, useState } from 'react';
import { Map as MapIcon, Search, ExternalLink, Loader2, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import AdvancedParcelMap from '../AdvancedParcelMap';
import api from '../../services/api';
import { notify } from '../../lib/notify';

export const ParcelasForm = ({
  editingId, zones, setZones, handleZonesChanged, handleSubmit, handleCancelEdit,
  formData, setFormData, fieldsConfig, contratos, fincas,
  contratoSearch, setContratoSearch, contratoFilterOptions, getVariedadesParaCultivo,
  cultivos = [], onCultivosRefresh,
  // SIGPAC
  provincias, sigpacLoading, sigpacResult, sigpacError, buscarEnSigpac, updateSigpac
}) => {
  // Memoize filtered contracts list (filter runs on every render otherwise)
  const filteredContratos = useMemo(() => (
    contratos.filter(c => {
      if (contratoSearch.proveedor && c.proveedor !== contratoSearch.proveedor) return false;
      if (contratoSearch.cultivo && c.cultivo !== contratoSearch.cultivo) return false;
      if (contratoSearch.campana && c.campana !== contratoSearch.campana) return false;
      return true;
    })
  ), [contratos, contratoSearch]);

  // Memoize filtered fincas list
  const fincasConDenominacion = useMemo(() => (
    fincas.filter(f => f.denominacion)
  ), [fincas]);

  // Auto-select variedad when there is exactly one option for the current cultivo
  // (typical case: a cultivo has a single registered variedad → no need to ask).
  const variedadesDisponibles = useMemo(
    () => (typeof getVariedadesParaCultivo === 'function' ? getVariedadesParaCultivo() : []),
    // Depend on cultivo AND the cultivos catalog, so adding a new variedad
    // through the inline panel re-renders this list immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData.cultivo, cultivos]
  );
  useEffect(() => {
    if (
      variedadesDisponibles.length === 1 &&
      (!formData.variedad || !variedadesDisponibles.includes(formData.variedad))
    ) {
      setFormData(prev => ({ ...prev, variedad: variedadesDisponibles[0] }));
    }
    // Si el cultivo cambia y la variedad actual ya no aplica, limpiarla
    if (
      variedadesDisponibles.length > 1 &&
      formData.variedad &&
      !variedadesDisponibles.includes(formData.variedad)
    ) {
      setFormData(prev => ({ ...prev, variedad: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variedadesDisponibles]);

  // ----- Inline "Nueva variedad" -----
  const [showNewVariedad, setShowNewVariedad] = useState(false);
  const [newVariedadName, setNewVariedadName] = useState('');
  const [savingVariedad, setSavingVariedad] = useState(false);

  const currentCultivoObj = useMemo(
    () => cultivos.find(c => c.nombre?.toLowerCase() === (formData.cultivo || '').toLowerCase()),
    [cultivos, formData.cultivo]
  );

  const handleAddVariedad = async () => {
    const name = newVariedadName.trim();
    if (!name) return notify.warning('Escribe el nombre de la variedad');
    if (!currentCultivoObj?._id) {
      return notify.error('Primero selecciona un cultivo válido del catálogo');
    }
    setSavingVariedad(true);
    try {
      const res = await api.post(`/api/cultivos/${currentCultivoObj._id}/variedades`, { variedad: name });
      notify.success(`Variedad "${name}" añadida a ${currentCultivoObj.nombre}`);
      // Refrescar el catálogo y auto-seleccionar la nueva variedad
      if (typeof onCultivosRefresh === 'function') await onCultivosRefresh();
      setFormData(prev => ({ ...prev, variedad: name }));
      setNewVariedadName('');
      setShowNewVariedad(false);
      // eslint-disable-next-line no-unused-vars
      const _ = res;
    } catch (err) {
      notify.error('Error: ' + api.getErrorMessage(err));
    } finally {
      setSavingVariedad(false);
    }
  };

  return (
    <div className="card mb-6">
      <h2 className="card-title">{editingId ? 'Editar Parcela' : 'Crear Parcela'}</h2>
      <div className="form-grid-responsive">
        {/* Left column: Map + SIGPAC */}
        <div>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon size={18} /> Mapa Avanzado - Dibuja el polígono
          </h3>
          
          <AdvancedParcelMap
            zones={zones}
            setZones={setZones}
            isEditing={!!editingId}
            onZonesChanged={handleZonesChanged}
            height="500px"
          />
          
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '6px', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
            {editingId 
              ? 'Dibuja nuevos polígonos para actualizar las zonas. Puedes dibujar varias zonas independientes.' 
              : 'Dibuja una o varias zonas en el mapa. Cada zona puede tener cualquier cantidad de puntos.'}
          </div>
          
          {/* SIGPAC Section */}
          <div style={{ marginTop: '1rem', backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', border: '1px solid #90caf9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ color: '#1565c0', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MapIcon size={16} /> Localizar por SIGPAC
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-sm" style={{ backgroundColor: '#1565c0', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={buscarEnSigpac} disabled={sigpacLoading} data-testid="btn-buscar-sigpac-parcela">
                  {sigpacLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
                </button>
                <a href="https://sigpac.mapa.es/fega/visor/" target="_blank" rel="noopener noreferrer" className="btn btn-sm"
                  style={{ backgroundColor: '#fff', color: '#1565c0', border: '1px solid #1565c0', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.8rem', padding: '4px 10px' }}>
                  <ExternalLink size={12} /> Visor
                </a>
              </div>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem', fontStyle: 'italic' }}>
              Introduce los códigos SIGPAC y pulsa "Buscar" para localizar y dibujar automáticamente la parcela en el mapa.
            </p>
            
            {sigpacResult && (
              <div style={{ backgroundColor: '#c8e6c9', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <CheckCircle size={16} style={{ color: '#2e7d32' }} />
                <span style={{ color: '#2e7d32' }}><strong>Parcela encontrada:</strong> {sigpacResult.superficie_ha?.toFixed(4)} ha - Uso: {sigpacResult.uso_sigpac}</span>
              </div>
            )}
            
            {sigpacError && (
              <div style={{ backgroundColor: '#ffcdd2', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} style={{ color: '#c62828' }} />
                <span style={{ color: '#c62828' }}>{sigpacError}</span>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {[
                { key: 'provincia', label: 'Provincia *', type: 'select', options: provincias.map(p => ({ value: p.codigo, label: `${p.codigo} - ${p.nombre}` })) },
                { key: 'municipio', label: 'Municipio *', placeholder: 'Ej: 053' },
                { key: 'poligono', label: 'Polígono *', placeholder: 'Ej: 5' },
                { key: 'parcela', label: 'Parcela *', placeholder: 'Ej: 12' },
                { key: 'cod_agregado', label: 'Agregado', placeholder: '0' },
                { key: 'zona', label: 'Zona', placeholder: '0' },
                { key: 'recinto', label: 'Recinto', placeholder: '1' },
                { key: 'cod_uso', label: 'Cod. Uso', placeholder: 'TA', readOnly: !!sigpacResult }
              ].map(field => (
                <div className="form-group" style={{ marginBottom: 0 }} key={field.key}>
                  <label style={{ fontSize: '0.7rem', fontWeight: '500' }}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select className="form-select" style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      value={formData.sigpac[field.key]} onChange={(e) => updateSigpac(field.key, e.target.value)}
                      data-testid={`sigpac-${field.key}`}>
                      <option value="">Seleccionar...</option>
                      {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      value={formData.sigpac[field.key]} onChange={(e) => updateSigpac(field.key, e.target.value)}
                      placeholder={field.placeholder} readOnly={field.readOnly}
                      data-testid={`sigpac-${field.key}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right column: Form fields */}
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1rem', padding: '0.75rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
              Toda parcela debe asociarse a un contrato.
              {editingId && ' El mapa es opcional. Solo dibuja si quieres cambiar la geometría.'}
            </p>
          </div>
          
          {/* Contrato selector with filters */}
          {fieldsConfig.contrato_id && (
            <div className="form-group">
              <label className="form-label">Contrato * (Obligatorio)</label>
              <div style={{ backgroundColor: 'hsl(var(--muted))', padding: '1rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Buscar contrato por:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {['proveedor', 'cultivo', 'campana'].map(field => {
                    // Pluralización: proveedor→proveedores, cultivo→cultivos, campana→campanas
                    const optionsKey = field === 'campana' ? 'campanas'
                      : field === 'cultivo' ? 'cultivos'
                      : field + 'es';
                    return (
                    <div key={field}>
                      <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>{field === 'campana' ? 'Campaña' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                      <select className="form-select" value={contratoSearch[field]}
                        onChange={(e) => setContratoSearch({...contratoSearch, [field]: e.target.value})}
                        style={{ fontSize: '0.875rem' }} data-testid={`contrato-search-${field}`}>
                        <option value="">{field === 'campana' ? 'Todas' : 'Todos'}</option>
                        {contratoFilterOptions[optionsKey]?.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    );
                  })}
                </div>
                {(contratoSearch.proveedor || contratoSearch.cultivo || contratoSearch.campana) && (
                  <button type="button" onClick={() => setContratoSearch({ proveedor: '', cultivo: '', campana: '' })}
                    style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Limpiar filtros de búsqueda
                  </button>
                )}
              </div>
              
              <select className="form-select" value={formData.contrato_id}
                onChange={(e) => setFormData({...formData, contrato_id: e.target.value})} required data-testid="select-contrato">
                <option value="">-- Seleccionar contrato --</option>
                {filteredContratos.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.serie}-{c.año}-{String(c.numero).padStart(3, '0')} - {c.proveedor} - {c.cultivo} ({c.campana})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {fieldsConfig.codigo_plantacion && (
            <div className="form-group">
              <label className="form-label">Codigo Plantacion (Auto)</label>
              <input type="text" className="form-input" value={formData.codigo_plantacion} readOnly
                style={{ backgroundColor: 'hsl(var(--muted))', cursor: 'not-allowed' }} data-testid="input-codigo-plantacion" />
              <small style={{ color: 'hsl(var(--muted-foreground))' }}>Se genera automaticamente y no se puede modificar</small>
            </div>
          )}
          
          {fieldsConfig.proveedor && (
            <div className="form-group">
              <label className="form-label">Proveedor *</label>
              <input type="text" className="form-input" value={formData.proveedor}
                onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                disabled={formData.contrato_id !== ''} required />
              {formData.contrato_id && <small style={{ color: 'hsl(var(--muted-foreground))' }}>Autocompletado desde contrato</small>}
            </div>
          )}
          
          {fieldsConfig.finca && (
            <div className="form-group">
              <label className="form-label">Finca</label>
              <select className="form-select" value={formData.finca}
                onChange={(e) => setFormData({...formData, finca: e.target.value})} data-testid="select-finca">
                <option value="">-- Sin finca asignada --</option>
                {fincasConDenominacion.map(f => (
                  <option key={f._id} value={f.denominacion}>{f.denominacion} {f.provincia ? `(${f.provincia})` : ''}</option>
                ))}
              </select>
              <small style={{ color: 'hsl(var(--muted-foreground))' }}>Opcional - Selecciona una finca existente</small>
            </div>
          )}
          
          {fieldsConfig.cultivo && (
            <div className="form-group">
              <label className="form-label">Cultivo *</label>
              <input type="text" className="form-input" value={formData.cultivo}
                onChange={(e) => setFormData({...formData, cultivo: e.target.value})}
                disabled={formData.contrato_id !== ''} required />
              {formData.contrato_id && <small style={{ color: 'hsl(var(--muted-foreground))' }}>Autocompletado desde contrato</small>}
            </div>
          )}
          
          {fieldsConfig.variedad && (
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Variedad</label>
                {formData.cultivo && currentCultivoObj?._id && !showNewVariedad && (
                  <button
                    type="button"
                    onClick={() => { setShowNewVariedad(true); setNewVariedadName(''); }}
                    className="btn btn-xs btn-secondary"
                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    data-testid="btn-nueva-variedad"
                    title={`Añadir nueva variedad a ${formData.cultivo}`}
                  >
                    <Plus size={12} /> Nueva
                  </button>
                )}
              </div>
              {!showNewVariedad ? (
                <>
                  <select className="form-select" value={formData.variedad}
                    onChange={(e) => setFormData({...formData, variedad: e.target.value})} data-testid="select-variedad">
                    <option value="">-- Sin variedad --</option>
                    {variedadesDisponibles.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {!formData.cultivo
                      ? 'Selecciona un cultivo primero'
                      : variedadesDisponibles.length === 0
                        ? `Sin variedades definidas para ${formData.cultivo} — pulsa "Nueva" para crearla`
                        : variedadesDisponibles.length === 1
                          ? 'Autoseleccionada (única variedad para este cultivo)'
                          : `Variedades disponibles para ${formData.cultivo}`}
                  </small>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} data-testid="nueva-variedad-panel">
                  <input
                    type="text"
                    className="form-input"
                    value={newVariedadName}
                    onChange={(e) => setNewVariedadName(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariedad(); } }}
                    placeholder={`Nueva variedad de ${formData.cultivo}`}
                    autoFocus
                    data-testid="input-nueva-variedad"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariedad}
                    disabled={savingVariedad || !newVariedadName.trim()}
                    className="btn btn-sm btn-primary"
                    data-testid="btn-guardar-variedad"
                  >
                    {savingVariedad ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {savingVariedad ? 'Guardando' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewVariedad(false); setNewVariedadName(''); }}
                    className="btn btn-sm btn-ghost"
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="grid-2">
            {fieldsConfig.superficie_total && (
              <div className="form-group">
                <label className="form-label">Superficie (ha) *</label>
                <input type="number" step="0.01" className="form-input" value={formData.superficie_total}
                  onChange={(e) => setFormData({...formData, superficie_total: e.target.value})} required />
              </div>
            )}
            {fieldsConfig.num_plantas && (
              <div className="form-group">
                <label className="form-label">Nº Plantas</label>
                <input type="number" className="form-input" value={formData.num_plantas}
                  onChange={(e) => setFormData({...formData, num_plantas: e.target.value})}
                  placeholder="Opcional" data-testid="parcela-num-plantas-input" />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Opcional</small>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" data-testid="btn-guardar-parcela">
              {editingId ? 'Actualizar Parcela' : 'Guardar Parcela'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParcelasForm;
