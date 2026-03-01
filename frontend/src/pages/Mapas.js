import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { Map, Layers, MapPin, Edit2, Save, X, Maximize2, List, Filter, Leaf, Ruler } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../App.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons by crop type
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

const CROP_COLORS = {
  'Guisante': '#22c55e',
  'Tomate': '#ef4444',
  'Test Cultivo': '#3b82f6',
  'default': '#6b7280'
};

// Component to fit bounds to markers
const FitBounds = ({ parcelas }) => {
  const map = useMap();
  
  useEffect(() => {
    const validParcelas = parcelas.filter(p => p.latitud && p.longitud);
    if (validParcelas.length > 0) {
      const bounds = validParcelas.map(p => [p.latitud, p.longitud]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [parcelas, map]);
  
  return null;
};

const Mapas = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcela, setSelectedParcela] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editCoords, setEditCoords] = useState({ latitud: '', longitud: '' });
  const [filters, setFilters] = useState({ cultivo: '', finca: '' });
  const [showList, setShowList] = useState(false);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid default
  const [mapZoom, setMapZoom] = useState(6);

  useEffect(() => {
    fetchParcelas();
    fetchFincas();
  }, []);

  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/parcelas');
      setParcelas(data.parcelas || []);
      
      // Set center to first parcela with coords or default
      const withCoords = (data.parcelas || []).filter(p => p.latitud && p.longitud);
      if (withCoords.length > 0) {
        setMapCenter([withCoords[0].latitud, withCoords[0].longitud]);
        setMapZoom(12);
      }
    } catch (err) {
      console.error('Error fetching parcelas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFincas = async () => {
    try {
      const data = await api.get('/api/fincas');
      setFincas(data.fincas || []);
    } catch (err) {
      console.error('Error fetching fincas:', err);
    }
  };

  const handleSaveCoords = async () => {
    if (!selectedParcela) return;
    
    try {
      await api.put(`/api/parcelas/${selectedParcela._id}`, {
        ...selectedParcela,
        latitud: parseFloat(editCoords.latitud),
        longitud: parseFloat(editCoords.longitud)
      });
      
      // Update local state
      setParcelas(parcelas.map(p => 
        p._id === selectedParcela._id 
          ? { ...p, latitud: parseFloat(editCoords.latitud), longitud: parseFloat(editCoords.longitud) }
          : p
      ));
      
      setEditMode(false);
      setSelectedParcela(null);
    } catch (err) {
      console.error('Error saving coords:', err);
      alert('Error al guardar coordenadas');
    }
  };

  const openEditMode = (parcela) => {
    setSelectedParcela(parcela);
    setEditCoords({
      latitud: parcela.latitud || '',
      longitud: parcela.longitud || ''
    });
    setEditMode(true);
  };

  // Filter parcelas
  const filteredParcelas = parcelas.filter(p => {
    if (filters.cultivo && p.cultivo !== filters.cultivo) return false;
    if (filters.finca && p.finca_id !== filters.finca) return false;
    return true;
  });

  const parcelasConCoords = filteredParcelas.filter(p => p.latitud && p.longitud);
  const parcelasSinCoords = filteredParcelas.filter(p => !p.latitud || !p.longitud);

  // Get unique cultivos for filter
  const cultivosUnicos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <p>Cargando mapa...</p>
      </div>
    );
  }

  return (
    <div data-testid="mapas-page" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Map size={28} />
          Mapa de Parcelas
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showList ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowList(!showList)}
            data-testid="btn-toggle-list"
          >
            <List size={18} />
            {showList ? 'Ocultar Lista' : 'Ver Lista'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))' }}>
          <MapPin size={20} style={{ margin: '0 auto', color: 'hsl(var(--primary))' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{parcelasConCoords.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Con ubicación</div>
        </div>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.1), hsl(38 92% 50% / 0.05))' }}>
          <MapPin size={20} style={{ margin: '0 auto', color: 'hsl(38 92% 50%)' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>{parcelasSinCoords.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Sin ubicación</div>
        </div>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center' }}>
          <Ruler size={20} style={{ margin: '0 auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            {filteredParcelas.reduce((sum, p) => sum + (p.superficie_total || 0), 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Hectáreas totales</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={filters.cultivo}
            onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
            data-testid="filter-cultivo"
          >
            <option value="">Todos los cultivos</option>
            {cultivosUnicos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={filters.finca}
            onChange={(e) => setFilters({...filters, finca: e.target.value})}
            data-testid="filter-finca"
          >
            <option value="">Todas las fincas</option>
            {fincas.map(f => (
              <option key={f._id} value={f._id}>{f.nombre}</option>
            ))}
          </select>
          {(filters.cultivo || filters.finca) && (
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => setFilters({ cultivo: '', finca: '' })}
            >
              <X size={16} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: showList ? '1fr 350px' : '1fr', gap: '1rem', height: 'calc(100% - 200px)' }}>
        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', minHeight: '400px' }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            data-testid="map-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <FitBounds parcelas={parcelasConCoords} />
            
            {parcelasConCoords.map(parcela => (
              <Marker
                key={parcela._id}
                position={[parcela.latitud, parcela.longitud]}
                icon={createCustomIcon(CROP_COLORS[parcela.cultivo] || CROP_COLORS.default)}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '1rem' }}>
                      {parcela.codigo_plantacion}
                    </h3>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <Leaf size={14} style={{ color: CROP_COLORS[parcela.cultivo] || CROP_COLORS.default }} />
                        <strong>{parcela.cultivo || 'Sin cultivo'}</strong>
                      </div>
                      <div>Superficie: <strong>{parcela.superficie_total} ha</strong></div>
                      {parcela.variedad && <div>Variedad: {parcela.variedad}</div>}
                    </div>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => openEditMode(parcela)}
                      style={{ width: '100%' }}
                    >
                      <Edit2 size={14} /> Editar ubicación
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* List panel */}
        {showList && (
          <div className="card" style={{ padding: '1rem', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '0.9rem' }}>
              Parcelas ({filteredParcelas.length})
            </h3>
            
            {parcelasSinCoords.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'hsl(38 92% 50%)', marginBottom: '0.5rem' }}>
                  Sin ubicación ({parcelasSinCoords.length})
                </h4>
                {parcelasSinCoords.map(p => (
                  <div 
                    key={p._id}
                    style={{
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
                      borderRadius: '8px',
                      background: 'hsl(38 92% 50% / 0.1)',
                      border: '1px solid hsl(38 92% 50% / 0.3)',
                      cursor: 'pointer'
                    }}
                    onClick={() => openEditMode(p)}
                  >
                    <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.codigo_plantacion}</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      {p.cultivo || 'Sin cultivo'} • {p.superficie_total} ha
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(38 92% 50%)', marginTop: '0.25rem' }}>
                      Clic para añadir ubicación
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <h4 style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
              Con ubicación ({parcelasConCoords.length})
            </h4>
            {parcelasConCoords.map(p => (
              <div 
                key={p._id}
                style={{
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  borderRadius: '8px',
                  background: 'hsl(var(--muted) / 0.3)',
                  border: '1px solid hsl(var(--border))',
                  cursor: 'pointer'
                }}
                onClick={() => openEditMode(p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div 
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: CROP_COLORS[p.cultivo] || CROP_COLORS.default
                    }}
                  />
                  <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.codigo_plantacion}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginLeft: '1.25rem' }}>
                  {p.cultivo || 'Sin cultivo'} • {p.superficie_total} ha
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editMode && selectedParcela && (
        <div 
          onClick={() => { setEditMode(false); setSelectedParcela(null); }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '2rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card"
            style={{ maxWidth: '400px', width: '100%', padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontWeight: '600' }}>
                <MapPin size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Ubicación de {selectedParcela.codigo_plantacion}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditMode(false); setSelectedParcela(null); }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '8px' }}>
              <div><strong>Cultivo:</strong> {selectedParcela.cultivo || 'No definido'}</div>
              <div><strong>Superficie:</strong> {selectedParcela.superficie_total} ha</div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input 
                type="number"
                step="0.000001"
                className="form-input"
                value={editCoords.latitud}
                onChange={(e) => setEditCoords({...editCoords, latitud: e.target.value})}
                placeholder="Ej: 40.416775"
                data-testid="input-latitud"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input 
                type="number"
                step="0.000001"
                className="form-input"
                value={editCoords.longitud}
                onChange={(e) => setEditCoords({...editCoords, longitud: e.target.value})}
                placeholder="Ej: -3.703790"
                data-testid="input-longitud"
              />
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
              💡 Tip: Puedes obtener las coordenadas desde Google Maps haciendo clic derecho sobre el punto deseado.
            </p>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => { setEditMode(false); setSelectedParcela(null); }}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSaveCoords}
                disabled={!editCoords.latitud || !editCoords.longitud}
                style={{ flex: 1 }}
                data-testid="btn-save-coords"
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mapas;
