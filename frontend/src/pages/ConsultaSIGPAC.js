import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, MapPin, Download, CheckCircle, AlertCircle, Layers, Map,
  ChevronDown, ChevronUp, Info, ExternalLink, Loader2
} from 'lucide-react';
import api from '../services/api';

const PROVINCIAS_ESPANA = {
  '01': 'Alava', '02': 'Albacete', '03': 'Alicante', '04': 'Almeria', '05': 'Avila',
  '06': 'Badajoz', '07': 'Baleares', '08': 'Barcelona', '09': 'Burgos', '10': 'Caceres',
  '11': 'Cadiz', '12': 'Castellon', '13': 'Ciudad Real', '14': 'Cordoba', '15': 'Coruna (A)',
  '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaen', '24': 'Leon', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Malaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
  '36': 'Pontevedra', '37': 'Salamanca', '38': 'S/C Tenerife', '39': 'Cantabria',
  '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel',
  '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora',
  '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

export default function ConsultaSIGPAC() {
  const [form, setForm] = useState({
    provincia: '', municipio: '', agregado: '0', zona: '0', poligono: '', parcela: ''
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importForm, setImportForm] = useState({ nombre: '', cultivo: '', campana: '', proveedor: '' });
  const [showImportForm, setShowImportForm] = useState(null);
  const [expandedRecinto, setExpandedRecinto] = useState({});

  const handleSearch = async () => {
    if (!form.provincia || !form.municipio || !form.poligono || !form.parcela) {
      setError('Provincia, Municipio, Poligono y Parcela son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    setImportSuccess(null);
    try {
      const params = new URLSearchParams(form);
      const data = await api.get(`/api/sigpac/consulta?${params.toString()}`);
      if (data.success) {
        setResults(data);
      } else {
        setError(data.message || 'Error al consultar SIGPAC');
      }
    } catch (e) {
      setError('Error de conexion con SIGPAC');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (recinto) => {
    setImporting(recinto?.recinto || 'main');
    try {
      const data = await api.post('/api/sigpac/importar', {
        sigpac_ref: {
          provincia: form.provincia,
          municipio: form.municipio,
          agregado: form.agregado,
          zona: form.zona,
          poligono: form.poligono,
          parcela: form.parcela,
          recinto: recinto?.recinto?.toString(),
        },
        nombre: importForm.nombre || `Parcela ${form.poligono}/${form.parcela}`,
        cultivo: importForm.cultivo,
        campana: importForm.campana,
        proveedor: importForm.proveedor,
      });
      if (data.success) {
        setImportSuccess(data.data);
        setShowImportForm(null);
      } else {
        setError(data.message || 'Error al importar');
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Error al importar parcela';
      setError(msg);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div data-testid="sigpac-page">
      <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Consulta SIGPAC
      </h1>
      <p style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
        Busca parcelas oficiales del Sistema de Informacion Geografica de Parcelas Agricolas y importalas directamente al sistema
      </p>

      {/* Search Form */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }} data-testid="sigpac-search-form">
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} /> Buscar Parcela por Referencia SIGPAC
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Provincia *</label>
            <select className="form-select" value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} data-testid="select-provincia">
              <option value="">Seleccionar...</option>
              {Object.entries(PROVINCIAS_ESPANA).map(([code, name]) => (
                <option key={code} value={code}>{code} - {name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Municipio *</label>
            <input className="form-input" value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} placeholder="Ej: 001" data-testid="input-municipio" />
          </div>
          <div>
            <label className="form-label">Agregado</label>
            <input className="form-input" value={form.agregado} onChange={e => setForm({ ...form, agregado: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="form-label">Zona</label>
            <input className="form-input" value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="form-label">Poligono *</label>
            <input className="form-input" value={form.poligono} onChange={e => setForm({ ...form, poligono: e.target.value })} placeholder="Ej: 15" data-testid="input-poligono" />
          </div>
          <div>
            <label className="form-label">Parcela *</label>
            <input className="form-input" value={form.parcela} onChange={e => setForm({ ...form, parcela: e.target.value })} placeholder="Ej: 120" data-testid="input-parcela" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleSearch} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-testid="btn-search-sigpac">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Consultando SIGPAC...' : 'Buscar Parcela'}
          </button>
          <a href="https://sigpac.mapa.es/fega/visor/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'hsl(var(--primary))' }}>
            <ExternalLink size={14} /> Abrir Visor SIGPAC
          </a>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c62828' }} data-testid="sigpac-error">
          <AlertCircle size={18} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c62828' }}>x</button>
        </div>
      )}

      {importSuccess && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px' }} data-testid="import-success">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} style={{ color: '#2e7d32' }} />
            <strong style={{ color: '#2e7d32' }}>Parcela importada correctamente</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#2e7d32' }}>
            Codigo: <strong>{importSuccess.codigo}</strong> |
            Referencia SIGPAC: <strong>{importSuccess.sigpac_referencia}</strong> |
            Superficie: <strong>{importSuccess.superficie_ha?.toFixed(2)} ha</strong> |
            Recintos: <strong>{importSuccess.recintos_importados}</strong>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div data-testid="sigpac-results">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} /> Resultado: {results.total_recintos} recinto(s) encontrado(s)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
              Ref: {results.referencia}
            </span>
          </div>

          {results.data?.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <MapPin size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
              <p className="text-muted">No se encontraron recintos para esta referencia SIGPAC</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Import all button */}
              <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Importar toda la parcela</strong>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    ({results.total_recintos} recintos, {results.data?.reduce((acc, r) => acc + (r.superficie_ha || 0), 0).toFixed(2)} ha total)
                  </span>
                </div>
                {showImportForm === 'all' ? (
                  <button onClick={() => setShowImportForm(null)} className="btn btn-secondary btn-sm">Cancelar</button>
                ) : (
                  <button onClick={() => setShowImportForm('all')} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="btn-import-all">
                    <Download size={14} /> Importar al Sistema
                  </button>
                )}
              </div>

              {showImportForm === 'all' && (
                <div className="card" style={{ padding: '1rem', borderLeft: '4px solid hsl(var(--primary))' }} data-testid="import-form">
                  <h4 style={{ marginBottom: '0.75rem' }}>Datos de importacion</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label className="form-label">Nombre</label>
                      <input className="form-input" value={importForm.nombre} onChange={e => setImportForm({ ...importForm, nombre: e.target.value })} placeholder="Nombre de la parcela" data-testid="input-import-nombre" />
                    </div>
                    <div>
                      <label className="form-label">Cultivo</label>
                      <input className="form-input" value={importForm.cultivo} onChange={e => setImportForm({ ...importForm, cultivo: e.target.value })} placeholder="Ej: Guisante" />
                    </div>
                    <div>
                      <label className="form-label">Campana</label>
                      <input className="form-input" value={importForm.campana} onChange={e => setImportForm({ ...importForm, campana: e.target.value })} placeholder="Ej: 2025/26" />
                    </div>
                    <div>
                      <label className="form-label">Proveedor</label>
                      <input className="form-input" value={importForm.proveedor} onChange={e => setImportForm({ ...importForm, proveedor: e.target.value })} placeholder="Nombre proveedor" />
                    </div>
                  </div>
                  <button onClick={() => handleImport(null)} disabled={importing} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="btn-confirm-import">
                    {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {importing ? 'Importando...' : 'Confirmar Importacion'}
                  </button>
                </div>
              )}

              {/* Individual recintos */}
              {results.data?.map((recinto, idx) => (
                <div key={idx} className="card" style={{ padding: '0.75rem 1rem', borderLeft: `4px solid ${recinto.uso_sigpac?.startsWith('TA') ? '#4caf50' : '#2196f3'}` }} data-testid={`recinto-${idx}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={14} />
                        Recinto {recinto.recinto || idx + 1}
                        {recinto.uso_sigpac && (
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
                            {recinto.uso_sigpac}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                        Superficie: <strong>{(recinto.superficie_ha || 0).toFixed(4)} ha</strong>
                        {recinto.coef_regadio > 0 && ` | Coef. Regadio: ${recinto.coef_regadio}`}
                        {recinto.referencia_catastral && ` | Ref: ${recinto.referencia_catastral}`}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedRecinto(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className="btn btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Info size={14} />
                      {expandedRecinto[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  {expandedRecinto[idx] && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {JSON.stringify({
                          provincia: recinto.provincia,
                          municipio: recinto.municipio,
                          poligono: recinto.poligono,
                          parcela: recinto.parcela,
                          recinto: recinto.recinto,
                          uso_sigpac: recinto.uso_sigpac,
                          superficie_ha: recinto.superficie_ha,
                          coef_regadio: recinto.coef_regadio,
                          has_geometry: !!recinto.geometry,
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="card" style={{ padding: '1rem', marginTop: '1.5rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Info size={16} /> Sobre SIGPAC
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6' }}>
          El <strong>Sistema de Informacion Geografica de Parcelas Agricolas (SIGPAC)</strong> es
          el sistema oficial del Ministerio de Agricultura de Espana para la identificacion de
          parcelas agricolas. Permite consultar datos oficiales como superficie, uso del suelo,
          y geometria de los recintos.
        </p>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', lineHeight: '1.6', marginTop: '0.5rem' }}>
          Para encontrar tu referencia SIGPAC, usa el <a href="https://sigpac.mapa.es/fega/visor/" target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--primary))' }}>Visor SIGPAC oficial</a> o
          consulta tu declaracion de la PAC.
        </p>
      </div>
    </div>
  );
}
