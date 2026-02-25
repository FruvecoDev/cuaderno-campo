import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Helper function to parse WKT POLYGON to Leaflet coordinates
const parseWKTPolygon = (wkt) => {
  if (!wkt || !wkt.includes('POLYGON')) return null;
  
  try {
    // Extract coordinates from WKT
    // Format: POLYGON((lon1 lat1, lon2 lat2, ...))
    const coordsMatch = wkt.match(/POLYGON\(\(([^)]+)\)\)/);
    if (!coordsMatch) return null;
    
    const coordsString = coordsMatch[1];
    const coords = coordsString.split(',').map(pair => {
      const [lon, lat] = pair.trim().split(' ').map(Number);
      return [lat, lon]; // Leaflet uses [lat, lon]
    });
    
    return coords;
  } catch (e) {
    console.error('Error parsing WKT:', e);
    return null;
  }
};

// Calculate centroid of polygon
const calculateCentroid = (coords) => {
  if (!coords || coords.length === 0) return null;
  
  let latSum = 0, lonSum = 0;
  coords.forEach(([lat, lon]) => {
    latSum += lat;
    lonSum += lon;
  });
  
  return [latSum / coords.length, lonSum / coords.length];
};

// Component to fit bounds when polygon changes
const FitBounds = ({ coords }) => {
  const map = useMap();
  
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [coords, map]);
  
  return null;
};

// Component to fly to location
const FlyToLocation = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 16, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  
  return null;
};

const MapaSigpac = ({ 
  sigpacData, 
  wkt, 
  centroide,
  denominacion,
  onClose,
  isExpanded,
  onToggleExpand 
}) => {
  const [polygonCoords, setPolygonCoords] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Default: Madrid
  const [mapZoom, setMapZoom] = useState(6);
  const [baseLayer, setBaseLayer] = useState('satellite');
  
  useEffect(() => {
    if (wkt) {
      const coords = parseWKTPolygon(wkt);
      if (coords) {
        setPolygonCoords(coords);
        const center = calculateCentroid(coords);
        if (center) {
          setMapCenter(center);
          setMapZoom(17);
        }
      }
    } else if (centroide) {
      setMapCenter([centroide.lat, centroide.lon]);
      setMapZoom(17);
      setPolygonCoords(null);
    }
  }, [wkt, centroide]);
  
  const baseLayers = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      name: 'Satélite'
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      name: 'Callejero'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenTopoMap',
      name: 'Topográfico'
    }
  };
  
  const containerStyle = isExpanded ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'white'
  } : {
    height: '400px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid #1565c0'
  };
  
  return (
    <div style={containerStyle} data-testid="mapa-sigpac-container">
      {/* Header */}
      <div style={{
        backgroundColor: '#1565c0',
        color: 'white',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={20} />
          <span style={{ fontWeight: '600' }}>
            Mapa SIGPAC {denominacion ? `- ${denominacion}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Layer selector */}
          <select
            value={baseLayer}
            onChange={(e) => setBaseLayer(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
            data-testid="select-map-layer"
          >
            {Object.entries(baseLayers).map(([key, layer]) => (
              <option key={key} value={key}>{layer.name}</option>
            ))}
          </select>
          <button
            onClick={onToggleExpand}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            data-testid="btn-toggle-expand-map"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {isExpanded ? 'Reducir' : 'Ampliar'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              data-testid="btn-close-map"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Map */}
      <div style={{ height: isExpanded ? 'calc(100% - 52px)' : '348px' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution={baseLayers[baseLayer].attribution}
            url={baseLayers[baseLayer].url}
          />
          
          {polygonCoords && (
            <>
              <Polygon
                positions={polygonCoords}
                pathOptions={{
                  color: '#ff6b00',
                  weight: 3,
                  fillColor: '#ff6b00',
                  fillOpacity: 0.3
                }}
              />
              <FitBounds coords={polygonCoords} />
            </>
          )}
          
          {!polygonCoords && centroide && (
            <>
              <Marker position={[centroide.lat, centroide.lon]}>
                <Popup>
                  <strong>{denominacion || 'Parcela SIGPAC'}</strong>
                  {sigpacData && (
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      <div>Provincia: {sigpacData.provincia}</div>
                      <div>Municipio: {sigpacData.municipio}</div>
                      <div>Polígono: {sigpacData.poligono}</div>
                      <div>Parcela: {sigpacData.parcela}</div>
                    </div>
                  )}
                </Popup>
              </Marker>
              <FlyToLocation center={[centroide.lat, centroide.lon]} zoom={17} />
            </>
          )}
        </MapContainer>
      </div>
      
      {/* Info panel */}
      {sigpacData && (
        <div style={{
          position: 'absolute',
          bottom: isExpanded ? '20px' : '10px',
          left: isExpanded ? '20px' : '10px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '0.75rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
          maxWidth: '250px',
          zIndex: 1000
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1565c0' }}>
            Datos SIGPAC
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
            <span>Provincia:</span><strong>{sigpacData.provincia}</strong>
            <span>Municipio:</span><strong>{sigpacData.municipio}</strong>
            <span>Polígono:</span><strong>{sigpacData.poligono}</strong>
            <span>Parcela:</span><strong>{sigpacData.parcela}</strong>
            {sigpacData.recinto && (
              <><span>Recinto:</span><strong>{sigpacData.recinto}</strong></>
            )}
            {sigpacData.cod_uso && (
              <><span>Uso:</span><strong>{sigpacData.cod_uso}</strong></>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaSigpac;
