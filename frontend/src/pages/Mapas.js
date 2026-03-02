import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { Map, Layers, MapPin, Edit2, Save, X, Maximize2, List, Filter, Leaf, Ruler, Pentagon, Trash2, Check, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GeoImportModal from '../components/GeoImportModal';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
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

// Component to fit bounds to markers/polygons
const FitBounds = ({ parcelas }) => {
  const map = useMap();
  
  useEffect(() => {
    const bounds = [];
    
    parcelas.forEach(p => {
      // Add polygon bounds if available
      if (p.recintos?.[0]?.geometria?.length > 0) {
        p.recintos[0].geometria.forEach(coord => {
          if (coord.lat && coord.lng) {
            bounds.push([coord.lat, coord.lng]);
          }
        });
      }
      // Add marker position
      if (p.latitud && p.longitud) {
        bounds.push([p.latitud, p.longitud]);
      }
    });
    
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [parcelas, map]);
  
  return null;
};

// Component to fly to a specific parcela
const FlyToParcela = ({ parcela, onComplete }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!parcela) return;
    
    let targetLat, targetLng;
    let zoomLevel = 16;
    
    // If parcela has polygon, fly to its center
    if (parcela.recintos?.[0]?.geometria?.length > 0) {
      const geo = parcela.recintos[0].geometria;
      targetLat = geo.reduce((sum, c) => sum + c.lat, 0) / geo.length;
      targetLng = geo.reduce((sum, c) => sum + c.lng, 0) / geo.length;
      
      // Fit to polygon bounds
      const bounds = geo.map(c => [c.lat, c.lng]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    } else if (parcela.latitud && parcela.longitud) {
      // Fly to marker position
      targetLat = parcela.latitud;
      targetLng = parcela.longitud;
      map.flyTo([targetLat, targetLng], zoomLevel, { duration: 1.5 });
    }
    
    if (onComplete) {
      setTimeout(onComplete, 1500);
    }
  }, [parcela, map, onComplete]);
  
  return null;
};

// Calculate polygon area in hectares
const calculatePolygonArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  
  // Shoelace formula for area calculation
  const earthRadius = 6371000; // meters
  let area = 0;
  
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const lat1 = coordinates[i].lat * Math.PI / 180;
    const lat2 = coordinates[j].lat * Math.PI / 180;
    const lng1 = coordinates[i].lng * Math.PI / 180;
    const lng2 = coordinates[j].lng * Math.PI / 180;
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = Math.abs(area * earthRadius * earthRadius / 2);
  return area / 10000; // Convert m² to hectares
};

const Mapas = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcela, setSelectedParcela] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [editCoords, setEditCoords] = useState({ latitud: '', longitud: '' });
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [filters, setFilters] = useState({ cultivo: '', finca: '', search: '' });
  const [showList, setShowList] = useState(true);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid default
  const [mapZoom, setMapZoom] = useState(6);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [flyToParcela, setFlyToParcela] = useState(null);
  const featureGroupRef = useRef(null);

  useEffect(() => {
    fetchParcelas();
    fetchFincas();
  }, []);

  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/parcelas');
      setParcelas(data.parcelas || []);
      
      // Set center to first parcela with coords or polygon
      const withLocation = (data.parcelas || []).filter(p => 
        (p.latitud && p.longitud) || 
        (p.recintos?.[0]?.geometria?.length > 0)
      );
      if (withLocation.length > 0) {
        const p = withLocation[0];
        if (p.recintos?.[0]?.geometria?.length > 0) {
          const geo = p.recintos[0].geometria;
          const centerLat = geo.reduce((sum, c) => sum + c.lat, 0) / geo.length;
          const centerLng = geo.reduce((sum, c) => sum + c.lng, 0) / geo.length;
          setMapCenter([centerLat, centerLng]);
        } else {
          setMapCenter([p.latitud, p.longitud]);
        }
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
    
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolygon = async () => {
    if (!selectedParcela || !drawnPolygon) return;
    
    setSaving(true);
    try {
      // Calculate center of polygon for marker
      const centerLat = drawnPolygon.reduce((sum, c) => sum + c.lat, 0) / drawnPolygon.length;
      const centerLng = drawnPolygon.reduce((sum, c) => sum + c.lng, 0) / drawnPolygon.length;
      
      // Calculate area
      const calculatedArea = calculatePolygonArea(drawnPolygon);
      
      const updatedParcela = {
        ...selectedParcela,
        latitud: centerLat,
        longitud: centerLng,
        recintos: [{
          geometria: drawnPolygon,
          superficie_recinto: calculatedArea
        }]
      };
      
      await api.put(`/api/parcelas/${selectedParcela._id}`, updatedParcela);
      
      // Update local state
      setParcelas(parcelas.map(p => 
        p._id === selectedParcela._id ? { ...p, ...updatedParcela } : p
      ));
      
      setDrawMode(false);
      setSelectedParcela(null);
      setDrawnPolygon(null);
      
      // Clear drawn layers
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
    } catch (err) {
      console.error('Error saving polygon:', err);
      alert('Error al guardar el polígono');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolygon = async (parcela) => {
    if (!confirm('¿Eliminar el polígono de esta parcela?')) return;
    
    try {
      const updatedParcela = {
        ...parcela,
        recintos: []
      };
      
      await api.put(`/api/parcelas/${parcela._id}`, updatedParcela);
      
      setParcelas(parcelas.map(p => 
        p._id === parcela._id ? { ...p, recintos: [] } : p
      ));
    } catch (err) {
      console.error('Error deleting polygon:', err);
      alert('Error al eliminar el polígono');
    }
  };

  const openEditMode = (parcela) => {
    setSelectedParcela(parcela);
    setEditCoords({
      latitud: parcela.latitud || '',
      longitud: parcela.longitud || ''
    });
    setEditMode(true);
    setDrawMode(false);
  };

  const openDrawMode = (parcela) => {
    setSelectedParcela(parcela);
    setDrawMode(true);
    setEditMode(false);
    setDrawnPolygon(null);
    
    // Clear any existing drawings
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  const handleDrawCreated = (e) => {
    const { layer } = e;
    const coords = layer.getLatLngs()[0].map(latlng => ({
      lat: latlng.lat,
      lng: latlng.lng
    }));
    setDrawnPolygon(coords);
  };

  const handleDrawDeleted = () => {
    setDrawnPolygon(null);
  };

  const handleImportComplete = (result) => {
    // Reload parcelas after import
    fetchParcelas();
  };

  // Filter parcelas
  const filteredParcelas = parcelas.filter(p => {
    if (filters.cultivo && p.cultivo !== filters.cultivo) return false;
    if (filters.finca && p.finca_id !== filters.finca) return false;
    return true;
  });

  const parcelasConUbicacion = filteredParcelas.filter(p => 
    (p.latitud && p.longitud) || (p.recintos?.[0]?.geometria?.length > 0)
  );
  const parcelasSinUbicacion = filteredParcelas.filter(p => 
    !p.latitud && !p.longitud && !p.recintos?.[0]?.geometria?.length
  );
  const parcelasConPoligono = filteredParcelas.filter(p => p.recintos?.[0]?.geometria?.length > 0);

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
            className="btn btn-primary"
            onClick={() => setShowImportModal(true)}
            data-testid="btn-import-geo"
          >
            <Upload size={18} />
            Importar KML/GeoJSON
          </button>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))' }}>
          <MapPin size={20} style={{ margin: '0 auto', color: 'hsl(var(--primary))' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{parcelasConUbicacion.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Con ubicación</div>
        </div>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.05))' }}>
          <Pentagon size={20} style={{ margin: '0 auto', color: 'hsl(142 76% 36%)' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>{parcelasConPoligono.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>Con polígono</div>
        </div>
        <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.1), hsl(38 92% 50% / 0.05))' }}>
          <MapPin size={20} style={{ margin: '0 auto', color: 'hsl(38 92% 50%)' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>{parcelasSinUbicacion.length}</div>
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

      {/* Draw Mode Banner */}
      {drawMode && selectedParcela && (
        <div className="card mb-4" style={{ 
          padding: '0.75rem', 
          background: 'linear-gradient(135deg, hsl(210 100% 50% / 0.1), hsl(210 100% 50% / 0.05))',
          border: '2px solid hsl(210 100% 50%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pentagon size={20} style={{ color: 'hsl(210 100% 50%)' }} />
              <span style={{ fontWeight: '600' }}>
                Dibujando polígono para: <strong>{selectedParcela.codigo_plantacion}</strong>
              </span>
              {drawnPolygon && (
                <span style={{ 
                  background: 'hsl(142 76% 36% / 0.2)', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: 'hsl(142 76% 36%)'
                }}>
                  Área: {calculatePolygonArea(drawnPolygon).toFixed(2)} ha
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { setDrawMode(false); setSelectedParcela(null); setDrawnPolygon(null); }}
              >
                <X size={16} /> Cancelar
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleSavePolygon}
                disabled={!drawnPolygon || saving}
              >
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Polígono'}
              </button>
            </div>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
            Usa las herramientas de dibujo en el mapa para crear el polígono de la parcela. Haz clic en los vértices para definir el área.
          </p>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: showList ? '1fr 350px' : '1fr', gap: '1rem', height: drawMode ? 'calc(100% - 280px)' : 'calc(100% - 200px)' }}>
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
            
            <FitBounds parcelas={parcelasConUbicacion} />
            
            {/* Drawing controls - only show in draw mode */}
            {drawMode && (
              <FeatureGroup ref={featureGroupRef}>
                <EditControl
                  position="topright"
                  onCreated={handleDrawCreated}
                  onDeleted={handleDrawDeleted}
                  draw={{
                    rectangle: false,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                    polyline: false,
                    polygon: {
                      allowIntersection: false,
                      drawError: {
                        color: '#e1e4e8',
                        message: 'Los bordes no pueden cruzarse'
                      },
                      shapeOptions: {
                        color: CROP_COLORS[selectedParcela?.cultivo] || CROP_COLORS.default,
                        fillOpacity: 0.3
                      }
                    }
                  }}
                  edit={{
                    edit: true,
                    remove: true
                  }}
                />
              </FeatureGroup>
            )}
            
            {/* Render existing polygons */}
            {filteredParcelas.map(parcela => {
              const hasPolygon = parcela.recintos?.[0]?.geometria?.length > 0;
              if (!hasPolygon) return null;
              
              const polygonCoords = parcela.recintos[0].geometria.map(c => [c.lat, c.lng]);
              const color = CROP_COLORS[parcela.cultivo] || CROP_COLORS.default;
              
              return (
                <Polygon
                  key={`polygon-${parcela._id}`}
                  positions={polygonCoords}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '220px' }}>
                      <h3 style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '1rem' }}>
                        {parcela.codigo_plantacion}
                      </h3>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          <Leaf size={14} style={{ color }} />
                          <strong>{parcela.cultivo || 'Sin cultivo'}</strong>
                        </div>
                        <div>Superficie: <strong>{parcela.superficie_total} ha</strong></div>
                        {parcela.recintos[0].superficie_recinto && (
                          <div>Área polígono: <strong>{parcela.recintos[0].superficie_recinto.toFixed(2)} ha</strong></div>
                        )}
                        {parcela.variedad && <div>Variedad: {parcela.variedad}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => openDrawMode(parcela)}
                          style={{ flex: 1 }}
                        >
                          <Edit2 size={14} /> Redibujar
                        </button>
                        <button 
                          className="btn btn-sm"
                          onClick={() => handleDeletePolygon(parcela)}
                          style={{ flex: 1, background: 'hsl(0 84% 60%)', color: 'white' }}
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
            
            {/* Markers for parcelas without polygons */}
            {filteredParcelas.filter(p => p.latitud && p.longitud && !p.recintos?.[0]?.geometria?.length).map(parcela => (
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
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEditMode(parcela)}
                        style={{ flex: 1 }}
                      >
                        <MapPin size={14} /> Coordenadas
                      </button>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => openDrawMode(parcela)}
                        style={{ flex: 1 }}
                      >
                        <Pentagon size={14} /> Polígono
                      </button>
                    </div>
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
            
            {parcelasSinUbicacion.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'hsl(38 92% 50%)', marginBottom: '0.5rem' }}>
                  Sin ubicación ({parcelasSinUbicacion.length})
                </h4>
                {parcelasSinUbicacion.map(p => (
                  <div 
                    key={p._id}
                    style={{
                      padding: '0.5rem',
                      marginBottom: '0.5rem',
                      borderRadius: '8px',
                      background: 'hsl(38 92% 50% / 0.1)',
                      border: '1px solid hsl(38 92% 50% / 0.3)',
                    }}
                  >
                    <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.codigo_plantacion}</div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      {p.cultivo || 'Sin cultivo'} • {p.superficie_total} ha
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                      <button 
                        className="btn btn-xs btn-secondary"
                        onClick={() => openEditMode(p)}
                        style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        <MapPin size={12} /> Punto
                      </button>
                      <button 
                        className="btn btn-xs btn-primary"
                        onClick={() => openDrawMode(p)}
                        style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      >
                        <Pentagon size={12} /> Polígono
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <h4 style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
              Con ubicación ({parcelasConUbicacion.length})
            </h4>
            {parcelasConUbicacion.map(p => {
              const hasPolygon = p.recintos?.[0]?.geometria?.length > 0;
              return (
                <div 
                  key={p._id}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    background: hasPolygon ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted) / 0.3)',
                    border: hasPolygon ? '1px solid hsl(142 76% 36% / 0.3)' : '1px solid hsl(var(--border))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div 
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: hasPolygon ? '2px' : '50%',
                        background: CROP_COLORS[p.cultivo] || CROP_COLORS.default
                      }}
                    />
                    <div style={{ fontWeight: '500', fontSize: '0.85rem', flex: 1 }}>{p.codigo_plantacion}</div>
                    {hasPolygon && (
                      <Pentagon size={14} style={{ color: 'hsl(142 76% 36%)' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginLeft: '1.25rem' }}>
                    {p.cultivo || 'Sin cultivo'} • {p.superficie_total} ha
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-xs btn-secondary"
                      onClick={() => openEditMode(p)}
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <MapPin size={12} /> Punto
                    </button>
                    <button 
                      className="btn btn-xs btn-primary"
                      onClick={() => openDrawMode(p)}
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <Pentagon size={12} /> {hasPolygon ? 'Redibujar' : 'Polígono'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Coordinates Modal */}
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
              Tip: Puedes obtener las coordenadas desde Google Maps haciendo clic derecho sobre el punto deseado.
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
                disabled={!editCoords.latitud || !editCoords.longitud || saving}
                style={{ flex: 1 }}
                data-testid="btn-save-coords"
              >
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geo Import Modal */}
      <GeoImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default Mapas;
