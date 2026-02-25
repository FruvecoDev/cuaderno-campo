import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, useMap, Marker, Popup, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import { MapPin, Maximize2, Minimize2, Pencil, Trash2, Save, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

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
    const coordsMatch = wkt.match(/POLYGON\(\(([^)]+)\)\)/);
    if (!coordsMatch) return null;
    
    const coordsString = coordsMatch[1];
    const coords = coordsString.split(',').map(pair => {
      const [lon, lat] = pair.trim().split(' ').map(Number);
      return [lat, lon];
    });
    
    return coords;
  } catch (e) {
    console.error('Error parsing WKT:', e);
    return null;
  }
};

// Convert Leaflet coordinates to WKT format
const coordsToWKT = (coords) => {
  if (!coords || coords.length === 0) return null;
  
  const wktCoords = coords.map(([lat, lon]) => `${lon} ${lat}`).join(',');
  // Close the polygon if not already closed
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
    return `POLYGON((${wktCoords},${coords[0][1]} ${coords[0][0]}))`;
  }
  return `POLYGON((${wktCoords}))`;
};

// Calculate area of polygon in hectares
const calculateArea = (coords) => {
  if (!coords || coords.length < 3) return 0;
  
  // Shoelace formula for polygon area
  let area = 0;
  const n = coords.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Convert to approximate meters (rough approximation for Spain ~40° latitude)
    const lat1 = coords[i][0] * Math.PI / 180;
    const lat2 = coords[j][0] * Math.PI / 180;
    const lon1 = coords[i][1] * Math.PI / 180;
    const lon2 = coords[j][1] * Math.PI / 180;
    
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = Math.abs(area * 6378137 * 6378137 / 2);
  return area / 10000; // Convert m² to hectares
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
  onToggleExpand,
  enableDrawing = false,
  onGeometryChange,
  initialDrawnCoords,
  parcela, // New prop to display parcela geometry
  height = null, // Custom height
  showControls = false // Show/hide controls
}) => {
  const [polygonCoords, setPolygonCoords] = useState(null);
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Default: Madrid
  const [mapZoom, setMapZoom] = useState(6);
  const [baseLayer, setBaseLayer] = useState('satellite');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState(0);
  const [localExpanded, setLocalExpanded] = useState(false);
  const featureGroupRef = useRef(null);
  
  // Handle parcela geometry
  useEffect(() => {
    if (parcela) {
      // Check if parcela has recintos with geometry
      if (parcela.recintos && parcela.recintos.length > 0) {
        const recintosWithGeom = parcela.recintos.filter(r => r.geometria && r.geometria.length > 0);
        if (recintosWithGeom.length > 0) {
          // Get first recinto geometry
          const firstGeom = recintosWithGeom[0].geometria;
          // Convert to Leaflet format [lat, lng]
          const coords = firstGeom.map(p => [p.lat, p.lng]);
          setPolygonCoords(coords);
          const center = calculateCentroid(coords);
          if (center) {
            setMapCenter(center);
            setMapZoom(17);
          }
          return;
        }
      }
      // Fallback: use default center for Spain
      setPolygonCoords(null);
    }
  }, [parcela]);
  
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
  
  // Load initial drawn coordinates
  useEffect(() => {
    if (initialDrawnCoords && initialDrawnCoords.length > 0) {
      setDrawnPolygons([initialDrawnCoords]);
      const area = calculateArea(initialDrawnCoords);
      setCalculatedArea(area);
      const center = calculateCentroid(initialDrawnCoords);
      if (center) {
        setMapCenter(center);
        setMapZoom(17);
      }
    }
  }, [initialDrawnCoords]);
  
  // Handle polygon creation
  const handleCreated = useCallback((e) => {
    const { layer } = e;
    const coords = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
    
    setDrawnPolygons(prev => [...prev, coords]);
    
    const area = calculateArea(coords);
    setCalculatedArea(prev => prev + area);
    
    // Notify parent component
    if (onGeometryChange) {
      const wktString = coordsToWKT(coords);
      onGeometryChange({
        coords,
        wkt: wktString,
        area_ha: area,
        centroid: calculateCentroid(coords)
      });
    }
  }, [onGeometryChange]);
  
  // Handle polygon edit
  const handleEdited = useCallback((e) => {
    const layers = e.layers;
    let totalArea = 0;
    const newPolygons = [];
    
    layers.eachLayer((layer) => {
      const coords = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
      newPolygons.push(coords);
      totalArea += calculateArea(coords);
    });
    
    if (newPolygons.length > 0) {
      setDrawnPolygons(newPolygons);
      setCalculatedArea(totalArea);
      
      // Notify parent with first polygon
      if (onGeometryChange && newPolygons[0]) {
        const wktString = coordsToWKT(newPolygons[0]);
        onGeometryChange({
          coords: newPolygons[0],
          wkt: wktString,
          area_ha: totalArea,
          centroid: calculateCentroid(newPolygons[0])
        });
      }
    }
  }, [onGeometryChange]);
  
  // Handle polygon delete
  const handleDeleted = useCallback((e) => {
    const layers = e.layers;
    let deletedCount = 0;
    
    layers.eachLayer(() => {
      deletedCount++;
    });
    
    if (deletedCount > 0) {
      // Recalculate remaining polygons from feature group
      if (featureGroupRef.current) {
        const remainingPolygons = [];
        let totalArea = 0;
        
        featureGroupRef.current.eachLayer((layer) => {
          if (layer.getLatLngs) {
            const coords = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
            remainingPolygons.push(coords);
            totalArea += calculateArea(coords);
          }
        });
        
        setDrawnPolygons(remainingPolygons);
        setCalculatedArea(totalArea);
        
        // Notify parent
        if (onGeometryChange) {
          if (remainingPolygons.length > 0) {
            const wktString = coordsToWKT(remainingPolygons[0]);
            onGeometryChange({
              coords: remainingPolygons[0],
              wkt: wktString,
              area_ha: totalArea,
              centroid: calculateCentroid(remainingPolygons[0])
            });
          } else {
            onGeometryChange(null);
          }
        }
      }
    }
  }, [onGeometryChange]);
  
  // Clear all drawn polygons
  const clearAllDrawings = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setDrawnPolygons([]);
    setCalculatedArea(0);
    if (onGeometryChange) {
      onGeometryChange(null);
    }
  };
  
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
  
  const effectiveExpanded = isExpanded !== undefined ? isExpanded : localExpanded;
  const handleToggleExpand = onToggleExpand || (() => setLocalExpanded(!localExpanded));
  
  const containerStyle = effectiveExpanded ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'white'
  } : {
    height: height || (enableDrawing ? '500px' : '400px'),
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid #1565c0',
    position: 'relative'
  };
  
  return (
    <div style={containerStyle} data-testid="mapa-sigpac-container">
      {/* Header */}
      <div style={{
        backgroundColor: enableDrawing ? '#2e7d32' : '#1565c0',
        color: 'white',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {enableDrawing ? <Pencil size={20} /> : <MapPin size={20} />}
          <span style={{ fontWeight: '600' }}>
            {enableDrawing ? 'Dibujar Parcela en Mapa' : `Mapa SIGPAC ${denominacion ? `- ${denominacion}` : ''}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Calculated area display */}
          {enableDrawing && calculatedArea > 0 && (
            <span style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              padding: '4px 10px', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              Área: <strong>{calculatedArea.toFixed(4)} ha</strong>
            </span>
          )}
          
          {/* Clear drawings button */}
          {enableDrawing && drawnPolygons.length > 0 && (
            <button
              onClick={clearAllDrawings}
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
              title="Borrar todos los dibujos"
              data-testid="btn-clear-drawings"
            >
              <RotateCcw size={16} />
              Limpiar
            </button>
          )}
          
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
            onClick={handleToggleExpand}
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
            {effectiveExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {effectiveExpanded ? 'Reducir' : 'Ampliar'}
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
      
      {/* Drawing instructions */}
      {enableDrawing && (
        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          color: '#2e7d32',
          borderBottom: '1px solid #c8e6c9'
        }}>
          <strong>Instrucciones:</strong> Use las herramientas del lado izquierdo para dibujar el polígono de la parcela. 
          Haga clic en cada vértice y cierre el polígono haciendo clic en el primer punto.
        </div>
      )}
      
      {/* Map */}
      <div style={{ height: effectiveExpanded ? 'calc(100% - 52px)' : enableDrawing ? '412px' : 'calc(100% - 52px)' }}>
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
          
          {/* SIGPAC polygon (from search) */}
          {polygonCoords && !enableDrawing && (
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
          
          {/* Marker for centroid when no polygon */}
          {!polygonCoords && centroide && !enableDrawing && (
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
          
          {/* Drawing controls */}
          {enableDrawing && (
            <FeatureGroup ref={featureGroupRef}>
              <EditControl
                position="topleft"
                onCreated={handleCreated}
                onEdited={handleEdited}
                onDeleted={handleDeleted}
                draw={{
                  rectangle: false,
                  circle: false,
                  circlemarker: false,
                  marker: false,
                  polyline: false,
                  polygon: {
                    allowIntersection: false,
                    drawError: {
                      color: '#e1e100',
                      message: '<strong>Error:</strong> Los bordes no pueden cruzarse'
                    },
                    shapeOptions: {
                      color: '#2e7d32',
                      weight: 3,
                      fillColor: '#4caf50',
                      fillOpacity: 0.4
                    }
                  }
                }}
                edit={{
                  featureGroup: featureGroupRef.current,
                  remove: true
                }}
              />
            </FeatureGroup>
          )}
          
          {/* Show existing drawn polygons in view mode */}
          {!enableDrawing && drawnPolygons.map((coords, index) => (
            <Polygon
              key={`drawn-${index}`}
              positions={coords}
              pathOptions={{
                color: '#2e7d32',
                weight: 3,
                fillColor: '#4caf50',
                fillOpacity: 0.3
              }}
            />
          ))}
        </MapContainer>
      </div>
      
      {/* Info panel */}
      {(sigpacData || parcela) && !enableDrawing && (
        <div style={{
          position: 'absolute',
          bottom: effectiveExpanded ? '20px' : '10px',
          left: effectiveExpanded ? '20px' : '10px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '0.75rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
          maxWidth: '250px',
          zIndex: 1000
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1565c0' }}>
            {parcela ? 'Datos Parcela' : 'Datos SIGPAC'}
          </div>
          {parcela ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
              <span>Código:</span><strong>{parcela.codigo_plantacion || '-'}</strong>
              <span>Cultivo:</span><strong>{parcela.cultivo || '-'}</strong>
              <span>Variedad:</span><strong>{parcela.variedad || '-'}</strong>
              <span>Superficie:</span><strong>{parcela.superficie_total?.toFixed(2) || '0'} ha</strong>
            </div>
          ) : sigpacData ? (
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
          ) : null}
        </div>
      )}
      
      {/* Drawing info panel */}
      {enableDrawing && drawnPolygons.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: isExpanded ? '20px' : '10px',
          left: isExpanded ? '20px' : '10px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '0.75rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
          maxWidth: '280px',
          zIndex: 1000
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#2e7d32' }}>
            Parcela Dibujada
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
            <span>Polígonos:</span><strong>{drawnPolygons.length}</strong>
            <span>Área Total:</span><strong>{calculatedArea.toFixed(4)} ha</strong>
            <span>Vértices:</span><strong>{drawnPolygons.reduce((acc, p) => acc + p.length, 0)}</strong>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
            El área se calculará automáticamente al guardar
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaSigpac;
