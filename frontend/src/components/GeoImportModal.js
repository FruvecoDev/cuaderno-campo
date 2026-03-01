import React, { useState, useCallback } from 'react';
import { Upload, FileText, MapPin, Check, X, AlertCircle, Loader2, Pentagon, Leaf, Download } from 'lucide-react';
import api from '../services/api';

const GeoImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState(1); // 1: upload, 2: preview, 3: config, 4: result
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [config, setConfig] = useState({
    default_cultivo: '',
    default_campana: '2025/26'
  });
  const [selectedPolygons, setSelectedPolygons] = useState([]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile) => {
    const filename = selectedFile.name.toLowerCase();
    if (!filename.endsWith('.kml') && !filename.endsWith('.geojson') && !filename.endsWith('.json')) {
      setError('Formato no soportado. Use archivos .kml, .geojson o .json');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await api.postFormData('/api/geo-import/parse', formData);
      
      setParseResult(result);
      setSelectedPolygons(result.polygons.map((_, idx) => idx)); // Select all by default
      setStep(2);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setParsing(false);
    }
  };

  const togglePolygonSelection = (idx) => {
    setSelectedPolygons(prev => 
      prev.includes(idx) 
        ? prev.filter(i => i !== idx)
        : [...prev, idx]
    );
  };

  const selectAll = () => {
    if (parseResult) {
      setSelectedPolygons(parseResult.polygons.map((_, idx) => idx));
    }
  };

  const selectNone = () => {
    setSelectedPolygons([]);
  };

  const handleImport = async () => {
    if (!parseResult || selectedPolygons.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const polygonsToImport = selectedPolygons.map(idx => parseResult.polygons[idx]);
      
      const result = await api.post('/api/geo-import/create-parcelas', {
        polygons: polygonsToImport,
        default_cultivo: config.default_cultivo,
        default_campana: config.default_campana
      });

      setImportResult(result);
      setStep(4);
      
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      setError(err.message || 'Error al crear las parcelas');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setFile(null);
    setParseResult(null);
    setImportResult(null);
    setError(null);
    setSelectedPolygons([]);
    setConfig({ default_cultivo: '', default_campana: '2025/26' });
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '1rem'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ 
          maxWidth: '700px', 
          width: '100%', 
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid hsl(var(--border))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={22} style={{ color: 'hsl(var(--primary))' }} />
            Importar Polígonos KML/GeoJSON
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{ 
          padding: '0.75rem 1.5rem', 
          background: 'hsl(var(--muted) / 0.3)',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          {[
            { num: 1, label: 'Subir archivo' },
            { num: 2, label: 'Revisar' },
            { num: 3, label: 'Configurar' },
            { num: 4, label: 'Resultado' }
          ].map(({ num, label }) => (
            <div 
              key={num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: step >= num ? 1 : 0.4
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: step >= num ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: step >= num ? 'white' : 'hsl(var(--muted-foreground))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {step > num ? <Check size={14} /> : num}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: step === num ? '600' : '400' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Error Message */}
          {error && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'hsl(0 84% 60% / 0.1)', 
              border: '1px solid hsl(0 84% 60% / 0.3)',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'hsl(0 84% 60%)'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                background: dragActive ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              {parsing ? (
                <div>
                  <Loader2 size={48} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                  <p>Procesando archivo...</p>
                </div>
              ) : (
                <>
                  <Upload size={48} style={{ margin: '0 auto 1rem', color: 'hsl(var(--muted-foreground))' }} />
                  <h3 style={{ marginBottom: '0.5rem' }}>Arrastra tu archivo aquí</h3>
                  <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                    o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    accept=".kml,.geojson,.json"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                    id="geo-file-input"
                  />
                  <label htmlFor="geo-file-input" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <FileText size={18} />
                    Seleccionar archivo
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '1rem' }}>
                    Formatos soportados: KML (Google Earth, SIGPAC), GeoJSON
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && parseResult && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '500' }}>
                    <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {parseResult.filename}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                    {parseResult.format} • {parseResult.polygons_count} polígonos • {parseResult.total_area_ha} ha totales
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-sm btn-ghost" onClick={selectAll}>Todos</button>
                  <button className="btn btn-sm btn-ghost" onClick={selectNone}>Ninguno</button>
                </div>
              </div>

              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}>
                {parseResult.polygons.map((polygon, idx) => (
                  <div 
                    key={idx}
                    onClick={() => togglePolygonSelection(idx)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: idx < parseResult.polygons.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      background: selectedPolygons.includes(idx) ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '2px solid hsl(var(--primary))',
                      background: selectedPolygons.includes(idx) ? 'hsl(var(--primary))' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {selectedPolygons.includes(idx) && <Check size={12} color="white" />}
                    </div>
                    <Pentagon size={18} style={{ color: 'hsl(142 76% 36%)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{polygon.name}</div>
                      {polygon.description && (
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          {polygon.description.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>{polygon.area_ha.toFixed(2)} ha</div>
                      <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                        {polygon.coordinates.length} vértices
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: 'hsl(var(--muted) / 0.3)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{selectedPolygons.length} de {parseResult.polygons.length} seleccionados</span>
                <span style={{ fontWeight: '600' }}>
                  {selectedPolygons.reduce((sum, idx) => sum + parseResult.polygons[idx].area_ha, 0).toFixed(2)} ha
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <div>
              <p style={{ marginBottom: '1rem', color: 'hsl(var(--muted-foreground))' }}>
                Configura los valores por defecto para las nuevas parcelas:
              </p>
              
              <div className="form-group">
                <label className="form-label">Cultivo por defecto</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Tomate, Guisante..."
                  value={config.default_cultivo}
                  onChange={(e) => setConfig({...config, default_cultivo: e.target.value})}
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Dejar vacío si el cultivo varía por parcela
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Campaña</label>
                <select
                  className="form-select"
                  value={config.default_campana}
                  onChange={(e) => setConfig({...config, default_campana: e.target.value})}
                >
                  <option value="2024/25">2024/25</option>
                  <option value="2025/26">2025/26</option>
                  <option value="2026/27">2026/27</option>
                </select>
              </div>

              <div style={{ 
                padding: '1rem', 
                background: 'hsl(210 100% 50% / 0.1)',
                borderRadius: '8px',
                marginTop: '1rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Leaf size={18} style={{ color: 'hsl(210 100% 50%)' }} />
                  Resumen de importación
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  <li>Se crearán <strong>{selectedPolygons.length}</strong> nuevas parcelas</li>
                  <li>Superficie total: <strong>{parseResult ? selectedPolygons.reduce((sum, idx) => sum + parseResult.polygons[idx].area_ha, 0).toFixed(2) : 0} ha</strong></li>
                  <li>Los polígonos se guardarán con sus coordenadas</li>
                  <li>Se calculará el centro de cada parcela automáticamente</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && importResult && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'hsl(142 76% 36% / 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Check size={40} style={{ color: 'hsl(142 76% 36%)' }} />
              </div>
              
              <h3 style={{ marginBottom: '0.5rem' }}>¡Importación completada!</h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
                Se han creado {importResult.created_count} nuevas parcelas
              </p>

              {importResult.errors_count > 0 && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'hsl(38 92% 50% / 0.1)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'left'
                }}>
                  <p style={{ margin: 0, fontWeight: '500', color: 'hsl(38 92% 50%)' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                    {importResult.errors_count} errores durante la importación
                  </p>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                    {importResult.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err.name}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                {importResult.created_parcelas.map((parcela, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '0.5rem 1rem',
                      borderBottom: idx < importResult.created_parcelas.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={16} style={{ color: 'hsl(142 76% 36%)' }} />
                    <span style={{ flex: 1 }}>{parcela.codigo_plantacion}</span>
                    <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
                      {parcela.superficie_total.toFixed(2)} ha
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderTop: '1px solid hsl(var(--border))',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {step === 1 && (
            <button className="btn btn-secondary" onClick={handleClose} style={{ marginLeft: 'auto' }}>
              Cancelar
            </button>
          )}

          {step === 2 && (
            <>
              <button className="btn btn-secondary" onClick={() => { resetModal(); }}>
                <Upload size={16} /> Otro archivo
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => setStep(3)}
                disabled={selectedPolygons.length === 0}
              >
                Continuar ({selectedPolygons.length} seleccionados)
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Atrás
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Crear {selectedPolygons.length} parcelas
                  </>
                )}
              </button>
            </>
          )}

          {step === 4 && (
            <button className="btn btn-primary" onClick={handleClose} style={{ marginLeft: 'auto' }}>
              <Check size={16} /> Finalizar
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GeoImportModal;
