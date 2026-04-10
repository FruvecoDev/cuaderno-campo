import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Search, MapPin, Download, CheckCircle, AlertCircle, Layers, Map,
  ChevronDown, ChevronUp, Info, ExternalLink, Loader2, Eye, EyeOff, Maximize2, Minimize2
} from 'lucide-react';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';

// Fix marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

// FitBounds component
const FitBoundsHelper = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && map) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 }); } catch (e) {}
    }
  }, [bounds, map]);
  return null;
};

// FlyTo component
const FlyToHelper = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      try { map.flyTo(center, zoom || 16, { duration: 1.5 }); } catch (e) {}
    }
  }, [center, zoom, map]);
  return null;
};

const SIGPAC_WMS_URL = 'https://wms.mapa.gob.es/sigpac/wms';

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
  // Map state
  const [showMap, setShowMap] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showWMS, setShowWMS] = useState(true);
  const [baseLayer, setBaseLayer] = useState('satellite');
  const [mapCenter, setMapCenter] = useState([39.5, -3.0]); // Center of Spain
  const [mapZoom, setMapZoom] = useState(6);
  const [geojsonData, setGeojsonData] = useState(null);

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
        // Also fetch GeoJSON for map display
        try {
          const geoData = await api.get(`/api/sigpac/recintos?${params.toString()}`);
          if (geoData.success && geoData.geojson) {
            setGeojsonData(geoData.geojson);
          }
        } catch (geoErr) {
          // GeoJSON is optional, don't block search results
          console.debug('GeoJSON fetch optional:', geoErr);
        }
        // Approximate center based on province code
        const provinceCenters = {
          '30': [37.98, -1.13], '41': [37.39, -5.99], '46': [39.47, -0.38],
          '04': [36.84, -2.46], '14': [37.88, -4.78], '18': [37.18, -3.60],
          '23': [37.77, -3.79], '29': [36.72, -4.42], '03': [38.35, -0.49],
          '08': [41.39, 2.17], '28': [40.42, -3.70], '50': [41.65, -0.88],
        };
        const center = provinceCenters[form.provincia] || [39.5, -3.0];
        setMapCenter(center);
        setMapZoom(14);
        setShowMap(true);
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

      {/* Interactive Map */}
      {showMap && (
        <div style={{ marginBottom: '1.5rem' }} data-testid="sigpac-map-section">
          <div style={{
            borderRadius: mapExpanded ? '0' : '8px',
            overflow: 'hidden',
            border: '2px solid #1565c0',
            ...(mapExpanded ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, borderRadius: 0 } : {})
          }}>
            {/* Map header */}
            <div style={{
              backgroundColor: '#1565c0', color: 'white', padding: '0.5rem 1rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Map size={18} /> Mapa SIGPAC Interactivo
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => setShowWMS(!showWMS)} style={{
                  background: showWMS ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  border: 'none', color: 'white', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem'
                }} data-testid="btn-toggle-wms" title="Mostrar/Ocultar capa SIGPAC oficial">
                  {showWMS ? <Eye size={14} /> : <EyeOff size={14} />}
                  Capa SIGPAC
                </button>
                <select value={baseLayer} onChange={e => setBaseLayer(e.target.value)} style={{
                  padding: '3px 6px', borderRadius: '4px', border: 'none', fontSize: '0.8rem'
                }} data-testid="select-base-layer">
                  <option value="satellite">Satelite</option>
                  <option value="osm">Callejero</option>
                  <option value="topo">Topografico</option>
                </select>
                <button onClick={() => setMapExpanded(!mapExpanded)} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                  padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }} data-testid="btn-expand-map">
                  {mapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button onClick={() => setShowMap(false)} style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
                  padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>x</button>
              </div>
            </div>

            {/* Map body */}
            <div style={{ height: mapExpanded ? 'calc(100vh - 42px)' : '420px' }}>
              <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} key={`map-${mapExpanded}`}>
                {baseLayer === 'satellite' && (
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri" />
                )}
                {baseLayer === 'osm' && (
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OSM" />
                )}
                {baseLayer === 'topo' && (
                  <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution="OpenTopoMap" />
                )}

                {/* SIGPAC WMS Overlay */}
                {showWMS && (
                  <WMSTileLayer
                    url={SIGPAC_WMS_URL}
                    layers="AU.Sigpac:recinto"
                    format="image/png"
                    transparent={true}
                    opacity={0.6}
                    attribution="SIGPAC - Ministerio de Agricultura"
                  />
                )}

                {/* GeoJSON parcels from search results */}
                {geojsonData?.features?.map((feature, idx) => {
                  if (!feature.geometry) return null;
                  const { type, coordinates } = feature.geometry;
                  if (type === 'Polygon') {
                    const positions = coordinates[0]?.map(c => [c[1], c[0]]) || [];
                    return (
                      <Polygon key={`poly-${idx}`} positions={positions} pathOptions={{
                        color: '#ff6b00', weight: 3, fillColor: '#ff6b00', fillOpacity: 0.25
                      }}>
                        <Popup>
                          <strong>Recinto {feature.properties?.recinto || idx + 1}</strong><br />
                          Uso: {feature.properties?.uso_sigpac || '-'}<br />
                          Sup: {(feature.properties?.dn_surface || 0).toFixed(4)} ha
                        </Popup>
                      </Polygon>
                    );
                  }
                  if (type === 'MultiPolygon') {
                    return coordinates.map((poly, pi) => {
                      const positions = poly[0]?.map(c => [c[1], c[0]]) || [];
                      return <Polygon key={`mpoly-${idx}-${pi}`} positions={positions} pathOptions={{
                        color: '#ff6b00', weight: 3, fillColor: '#ff6b00', fillOpacity: 0.25
                      }} />;
                    });
                  }
                  return null;
                })}

                {/* Marker for search result center */}
                {results && results.success && (
                  <Marker position={mapCenter}>
                    <Popup>
                      <strong>Ref: {results.referencia}</strong><br />
                      {results.total_recintos} recinto(s)
                    </Popup>
                  </Marker>
                )}

                <FlyToHelper center={mapCenter} zoom={mapZoom} />
              </MapContainer>
            </div>

            {/* Map legend */}
            <div style={{
              backgroundColor: '#f5f5f5', padding: '0.4rem 1rem', fontSize: '0.75rem',
              display: 'flex', gap: '1.5rem', alignItems: 'center', color: '#555',
              borderTop: '1px solid #ddd'
            }}>
              {showWMS && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 12, height: 12, background: 'rgba(100,100,255,0.4)', border: '1px solid #66f', display: 'inline-block', borderRadius: 2 }}></span>
                  Recintos SIGPAC (WMS oficial)
                </span>
              )}
              {geojsonData && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 12, height: 12, background: 'rgba(255,107,0,0.25)', border: '2px solid #ff6b00', display: 'inline-block', borderRadius: 2 }}></span>
                  Parcela consultada
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Fuente: Ministerio de Agricultura, Pesca y Alimentacion</span>
            </div>
          </div>
        </div>
      )}

      {!showMap && (
        <button onClick={() => setShowMap(true)} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-testid="btn-show-map">
          <Map size={16} /> Mostrar Mapa
        </button>
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
