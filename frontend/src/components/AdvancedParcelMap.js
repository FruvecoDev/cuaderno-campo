import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { 
  Layers, Satellite, MapPin, Ruler, Download, Upload, Copy, 
  Crosshair, Search, Trash2, Square, Circle, Scissors, Combine,
  Navigation, ZoomIn, Check, X, FileJson, Map as MapIcon
} from 'lucide-react';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Tile layers
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    name: 'Mapa Base'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Satélite'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    name: 'Topográfico'
  }
};

// Colores por cultivo
const CULTIVO_COLORS = [
  '#2d5a27', '#1976d2', '#d32f2f', '#f57c00', '#7b1fa2',
  '#00796b', '#5d4037', '#455a64', '#c2185b', '#00838f'
];

const getCultivoColor = (cultivo, cultivosList) => {
  const index = cultivosList.indexOf(cultivo);
  return CULTIVO_COLORS[index % CULTIVO_COLORS.length];
};

// Calcular área de polígono en hectáreas
const calculateArea = (coords) => {
  if (!coords || coords.length < 3) return 0;
  const latlngs = coords.map(c => L.latLng(c.lat, c.lng));
  const polygon = L.polygon(latlngs);
  const area = L.GeometryUtil.geodesicArea(polygon.getLatLngs()[0]);
  return (area / 10000).toFixed(4); // Convert to hectares
};

// Calcular perímetro en metros
const calculatePerimeter = (coords) => {
  if (!coords || coords.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = L.latLng(coords[i].lat, coords[i].lng);
    const p2 = L.latLng(coords[(i + 1) % coords.length].lat, coords[(i + 1) % coords.length].lng);
    perimeter += p1.distanceTo(p2);
  }
  return perimeter.toFixed(2);
};

// Componente para mostrar coordenadas al hacer clic
function CoordinateDisplay({ onCoordinateClick }) {
  const [coords, setCoords] = useState(null);
  
  useMapEvents({
    click: (e) => {
      setCoords({ lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) });
      if (onCoordinateClick) onCoordinateClick(e.latlng);
    }
  });
  
  if (!coords) return null;
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '10px',
      background: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      zIndex: 1000,
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <strong>Lat:</strong> {coords.lat} | <strong>Lng:</strong> {coords.lng}
      <button 
        onClick={() => {
          navigator.clipboard.writeText(`${coords.lat}, ${coords.lng}`);
          alert('Coordenadas copiadas');
        }}
        style={{ marginLeft: '8px', cursor: 'pointer', background: 'none', border: 'none' }}
        title="Copiar coordenadas"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}

// Colores para distintas zonas
const ZONE_COLORS = [
  { color: '#2d5a27', fill: '#4CAF50' },
  { color: '#1565c0', fill: '#42a5f5' },
  { color: '#c62828', fill: '#ef5350' },
  { color: '#e65100', fill: '#ff9800' },
  { color: '#6a1b9a', fill: '#ab47bc' },
  { color: '#00695c', fill: '#26a69a' },
  { color: '#4e342e', fill: '#8d6e63' },
  { color: '#37474f', fill: '#78909c' },
];

const getZoneStyle = (index) => {
  const c = ZONE_COLORS[index % ZONE_COLORS.length];
  return { color: c.color, fillColor: c.fill, fillOpacity: 0.3, weight: 2 };
};

// Componente de control de dibujo avanzado - MULTI-ZONA
function AdvancedDrawControl({ 
  onZonesChanged, 
  editableZones, 
  isEditing,
  drawMode,
  onMeasureDistance
}) {
  const map = useMap();
  const drawnItemsRef = useRef(null);
  const drawControlRef = useRef(null);
  
  // Extraer todas las zonas del FeatureGroup
  const extractAllZones = useCallback((drawnItems) => {
    const newZones = [];
    drawnItems.eachLayer((layer) => {
      if (layer.getLatLngs) {
        const latlngs = layer.getLatLngs()[0];
        if (latlngs && latlngs.length >= 3) {
          newZones.push(latlngs.map(point => ({ lat: point.lat, lng: point.lng })));
        }
      }
    });
    return newZones;
  }, []);
  
  useEffect(() => {
    if (!map) return;
    
    // Limpiar controles anteriores
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
    }
    if (drawnItemsRef.current) {
      map.removeLayer(drawnItemsRef.current);
    }
    
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);
    
    // Cargar todas las zonas existentes
    if (editableZones && editableZones.length > 0) {
      editableZones.forEach((zone, idx) => {
        if (zone && zone.length >= 3) {
          const latlngs = zone.map(p => [p.lat, p.lng]);
          const style = getZoneStyle(idx);
          const polygon = L.polygon(latlngs, style);
          drawnItems.addLayer(polygon);
        }
      });
    }
    
    // Configurar opciones de dibujo
    const drawOptions = {
      polygon: drawMode === 'polygon' || drawMode === 'all' ? { 
        allowIntersection: false, 
        showArea: true, 
        metric: true,
        shapeOptions: { color: '#2d5a27', fillColor: '#4CAF50', fillOpacity: 0.3 }
      } : false,
      rectangle: drawMode === 'rectangle' || drawMode === 'all' ? {
        shapeOptions: { color: '#2d5a27', fillColor: '#4CAF50', fillOpacity: 0.3 }
      } : false,
      circle: drawMode === 'circle' || drawMode === 'all' ? {
        shapeOptions: { color: '#2d5a27', fillColor: '#4CAF50', fillOpacity: 0.3 }
      } : false,
      polyline: drawMode === 'measure' ? {
        shapeOptions: { color: '#ff0000', weight: 3 }
      } : false,
      marker: false,
      circlemarker: false
    };
    
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: drawOptions,
      edit: { 
        featureGroup: drawnItems, 
        remove: true,
        edit: true
      }
    });
    
    drawControlRef.current = drawControl;
    map.addControl(drawControl);
    
    // Evento: Figura creada - AÑADE al grupo (NO reemplaza)
    const handleCreated = (e) => {
      const layer = e.layer;
      const layerType = e.layerType;
      
      // Si es medición de distancia
      if (layerType === 'polyline') {
        const latlngs = layer.getLatLngs();
        let distance = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
          distance += latlngs[i].distanceTo(latlngs[i + 1]);
        }
        if (onMeasureDistance) {
          onMeasureDistance(distance);
        }
        const midPoint = latlngs[Math.floor(latlngs.length / 2)];
        L.popup()
          .setLatLng(midPoint)
          .setContent(`<strong>Distancia:</strong> ${distance.toFixed(2)} m`)
          .openOn(map);
        return;
      }
      
      let coordinates = [];
      
      if (layerType === 'polygon' || layerType === 'rectangle') {
        const latlngs = layer.getLatLngs()[0];
        coordinates = latlngs.map(point => ({ lat: point.lat, lng: point.lng }));
      } else if (layerType === 'circle') {
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const points = 32;
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          const lat = center.lat + (radius / 111320) * Math.cos(angle);
          const lng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
          coordinates.push({ lat, lng });
        }
      }
      
      if (coordinates.length >= 3) {
        // Aplicar estilo de color según el índice de la nueva zona
        const currentCount = drawnItems.getLayers().length;
        const style = getZoneStyle(currentCount);
        layer.setStyle(style);
        drawnItems.addLayer(layer);
        
        // Notificar todas las zonas actuales
        const allZones = extractAllZones(drawnItems);
        onZonesChanged(allZones);
      }
    };
    
    // Evento: Zonas editadas - recalcular todas
    const handleEdited = () => {
      const allZones = extractAllZones(drawnItems);
      onZonesChanged(allZones);
    };
    
    // Evento: Zonas eliminadas - recalcular restantes
    const handleDeleted = () => {
      const allZones = extractAllZones(drawnItems);
      onZonesChanged(allZones);
    };
    
    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);
    
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
      }
    };
  }, [map, onZonesChanged, editableZones, isEditing, drawMode, onMeasureDistance, extractAllZones]);
  
  return null;
}

// Componente para centrar el mapa - soporta múltiples zonas
function FitBounds({ zones, parcelas }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !map._container) return;
    
    let isMounted = true;
    
    const fitBounds = () => {
      if (!isMounted || !map || !map._container) return;
      
      try {
        const allCoords = [];
        
        // Recoger coordenadas de todas las zonas
        if (zones && zones.length > 0) {
          zones.forEach(zone => {
            if (zone && zone.length > 0) {
              zone.forEach(p => allCoords.push([p.lat, p.lng]));
            }
          });
        }
        
        // Recoger coordenadas de todas las parcelas (vista general)
        if (allCoords.length === 0 && parcelas && parcelas.length > 0) {
          parcelas.forEach(p => {
            if (p.recintos) {
              p.recintos.forEach(r => {
                if (r.geometria) {
                  r.geometria.forEach(c => allCoords.push([c.lat, c.lng]));
                }
              });
            }
          });
        }
        
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        
      }
    };
    
    const timeoutId = setTimeout(fitBounds, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [map, zones, parcelas]);
  
  return null;
}

// Componente para geolocalización
function GeolocationControl({ onLocate }) {
  const map = useMap();
  
  const handleLocate = () => {
    if (!map || !map._container) return;
    
    try {
      map.locate({ setView: true, maxZoom: 16 });
      map.on('locationfound', (e) => {
        L.marker(e.latlng).addTo(map)
          .bindPopup('Tu ubicación actual')
          .openPopup();
        if (onLocate) onLocate(e.latlng);
      });
      map.on('locationerror', () => {
        alert('No se pudo obtener tu ubicación');
      });
    } catch (e) {
      
    }
  };
  
  return (
    <button
      onClick={handleLocate}
      style={{
        position: 'absolute',
        top: '10px',
        left: '50px',
        zIndex: 1000,
        background: 'white',
        border: '2px solid rgba(0,0,0,0.2)',
        borderRadius: '4px',
        padding: '6px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
      title="Mi ubicación"
    >
      <Navigation size={16} />
    </button>
  );
}

// Componente principal del mapa avanzado - MULTI-ZONA
const AdvancedParcelMap = ({
  polygon,
  zones = [],
  setPolygon,
  setZones,
  parcelas = [],
  selectedParcelaId,
  onParcelaSelect,
  isEditing = false,
  showAllParcelas = false,
  height = '400px',
  onPolygonCreated,
  onZonesChanged: onZonesChangedProp,
  onPolygonEdited
}) => {
  const [mapType, setMapType] = useState('satellite');
  const [drawMode, setDrawMode] = useState('polygon');
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [measuredDistance, setMeasuredDistance] = useState(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);
  
  // Compatibilidad: usar zones si existe, si no convertir polygon a zones
  const effectiveZones = zones.length > 0 ? zones : (polygon && polygon.length >= 3 ? [polygon] : []);
  
  // Lista única de cultivos para colores
  const cultivosList = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
  
  // Manejar cambio de zonas (multi-polígono)
  const handleZonesChanged = useCallback((newZones) => {
    if (setZones) setZones(newZones);
    if (onZonesChangedProp) onZonesChangedProp(newZones);
    // Compatibilidad retroactiva: actualizar polygon con la primera zona
    if (setPolygon) {
      setPolygon(newZones.length > 0 ? newZones[0] : []);
    }
    if (onPolygonCreated && newZones.length > 0) {
      onPolygonCreated(newZones[0]);
    }
  }, [setZones, onZonesChangedProp, setPolygon, onPolygonCreated]);
  
  // Calcular totales de todas las zonas
  const totalArea = effectiveZones.reduce((sum, z) => sum + parseFloat(calculateArea(z) || 0), 0);
  const totalPoints = effectiveZones.reduce((sum, z) => sum + (z ? z.length : 0), 0);
  
  // Buscar dirección usando Nominatim
  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (mapRef.current) {
          mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 15);
          L.marker([parseFloat(lat), parseFloat(lon)])
            .addTo(mapRef.current)
            .bindPopup(data[0].display_name)
            .openPopup();
        }
      } else {
        alert('No se encontró la dirección');
      }
    } catch (error) {

      alert('Error al buscar dirección');
    }
  };
  
  // Exportar a GeoJSON - todas las zonas
  const exportToGeoJSON = () => {
    if (effectiveZones.length === 0) {
      alert('No hay polígonos para exportar');
      return;
    }
    
    const features = effectiveZones.map((zone, idx) => ({
      type: 'Feature',
      properties: { zone_index: idx },
      geometry: {
        type: 'Polygon',
        coordinates: [[...zone.map(p => [p.lng, p.lat]), [zone[0].lng, zone[0].lat]]]
      }
    }));
    
    const geojson = {
      type: 'FeatureCollection',
      features
    };
    
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parcela_zonas.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Exportar a KML - todas las zonas
  const exportToKML = () => {
    if (effectiveZones.length === 0) {
      alert('No hay polígonos para exportar');
      return;
    }
    
    const placemarks = effectiveZones.map((zone, idx) => {
      const coords = zone.map(p => `${p.lng},${p.lat},0`).join(' ');
      return `    <Placemark>
      <name>Zona ${idx + 1}</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords} ${zone[0].lng},${zone[0].lat},0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    }).join('\n');
    
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Parcela - ${effectiveZones.length} zonas</name>
${placemarks}
  </Document>
</kml>`;
    
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parcela_zonas.kml';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Copiar coordenadas de todas las zonas
  const copyCoordinates = () => {
    if (effectiveZones.length === 0) {
      alert('No hay polígonos para copiar');
      return;
    }
    
    const text = effectiveZones.map((zone, idx) => {
      const coords = zone.map(p => `${p.lat}, ${p.lng}`).join('\n');
      return `--- Zona ${idx + 1} ---\n${coords}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Coordenadas copiadas al portapapeles');
  };
  
  // Importar archivo - añade como nueva zona
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let importedZones = [];
        
        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          const geojson = JSON.parse(content);
          if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
            const coords = geojson.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
            coords.pop();
            importedZones.push(coords);
          } else if (geojson.type === 'FeatureCollection' && geojson.features) {
            geojson.features.forEach(feature => {
              if (feature.geometry?.type === 'Polygon') {
                const coords = feature.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
                coords.pop();
                importedZones.push(coords);
              }
            });
          }
        } else if (file.name.endsWith('.kml')) {
          const parser = new DOMParser();
          const kml = parser.parseFromString(content, 'text/xml');
          const coordElements = kml.querySelectorAll('coordinates');
          coordElements.forEach(coordEl => {
            const coordsText = coordEl.textContent;
            if (coordsText) {
              const points = coordsText.trim().split(/\s+/);
              const coordinates = points.map(p => {
                const [lng, lat] = p.split(',');
                return { lat: parseFloat(lat), lng: parseFloat(lng) };
              }).filter(c => !isNaN(c.lat) && !isNaN(c.lng));
              if (coordinates.length > 1) coordinates.pop();
              if (coordinates.length >= 3) importedZones.push(coordinates);
            }
          });
        } else if (file.name.endsWith('.gpx')) {
          const parser = new DOMParser();
          const gpx = parser.parseFromString(content, 'text/xml');
          const trackPoints = gpx.querySelectorAll('trkpt, rtept, wpt');
          const coordinates = Array.from(trackPoints).map(pt => ({
            lat: parseFloat(pt.getAttribute('lat')),
            lng: parseFloat(pt.getAttribute('lon'))
          }));
          if (coordinates.length >= 3) importedZones.push(coordinates);
        }
        
        if (importedZones.length > 0) {
          const newZones = [...effectiveZones, ...importedZones];
          handleZonesChanged(newZones);
          // Centrar mapa en las zonas importadas
          if (mapRef.current) {
            const allCoords = importedZones.flat();
            const bounds = L.latLngBounds(allCoords.map(c => [c.lat, c.lng]));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
          alert(`Importadas ${importedZones.length} zona(s) con ${importedZones.reduce((s, z) => s + z.length, 0)} puntos totales`);
        } else {
          alert('No se pudo extraer un polígono válido del archivo');
        }
      } catch (error) {

        alert('Error al leer el archivo');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  const mapCenter = effectiveZones.length > 0 && effectiveZones[0].length > 0
    ? [effectiveZones[0][0].lat, effectiveZones[0][0].lng] 
    : [37.3891, -5.9845]; // Sevilla default
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar superior */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        padding: '0.5rem',
        background: 'hsl(var(--muted))',
        borderRadius: '0.5rem'
      }}>
        {/* Selector de capa de mapa */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.entries(TILE_LAYERS).map(([key, layer]) => (
            <button
              key={key}
              onClick={() => setMapType(key)}
              className={`btn btn-sm ${mapType === key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 8px', fontSize: '12px' }}
              title={layer.name}
            >
              {key === 'satellite' ? <Satellite size={14} /> : key === 'topo' ? <Layers size={14} /> : <MapIcon size={14} />}
              <span style={{ marginLeft: '4px' }}>{layer.name}</span>
            </button>
          ))}
        </div>
        
        <div style={{ borderLeft: '1px solid hsl(var(--border))', margin: '0 4px' }} />
        
        {/* Herramientas de dibujo */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setDrawMode('polygon')}
            className={`btn btn-sm ${drawMode === 'polygon' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Dibujar polígono"
          >
            <MapPin size={14} />
          </button>
          <button
            onClick={() => setDrawMode('rectangle')}
            className={`btn btn-sm ${drawMode === 'rectangle' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Dibujar rectángulo"
          >
            <Square size={14} />
          </button>
          <button
            onClick={() => setDrawMode('circle')}
            className={`btn btn-sm ${drawMode === 'circle' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Dibujar círculo"
          >
            <Circle size={14} />
          </button>
        </div>
        
        <div style={{ borderLeft: '1px solid hsl(var(--border))', margin: '0 4px' }} />
        
        {/* Herramientas de medición */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => {
              setDrawMode('measure');
              setShowMeasure(true);
            }}
            className={`btn btn-sm ${showMeasure ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Medir distancia"
          >
            <Ruler size={14} />
          </button>
          <button
            onClick={() => setShowCoordinates(!showCoordinates)}
            className={`btn btn-sm ${showCoordinates ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Mostrar coordenadas"
          >
            <Crosshair size={14} />
          </button>
        </div>
        
        <div style={{ borderLeft: '1px solid hsl(var(--border))', margin: '0 4px' }} />
        
        {/* Búsqueda y geolocalización */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`btn btn-sm ${showSearch ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Buscar dirección"
          >
            <Search size={14} />
          </button>
        </div>
        
        <div style={{ borderLeft: '1px solid hsl(var(--border))', margin: '0 4px' }} />
        
        {/* Import/Export */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className={`btn btn-sm ${showImportExport ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 8px', fontSize: '12px' }}
            title="Importar/Exportar"
          >
            <FileJson size={14} />
          </button>
        </div>
      </div>
      
      {/* Panel de búsqueda de dirección */}
      {showSearch && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          background: 'hsl(var(--card))',
          borderRadius: '0.5rem',
          border: '1px solid hsl(var(--border))'
        }}>
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
            placeholder="Buscar dirección, localidad..."
            className="form-input"
            style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
          />
          <button onClick={handleSearchAddress} className="btn btn-primary btn-sm">
            <Search size={14} /> Buscar
          </button>
        </div>
      )}
      
      {/* Panel de importar/exportar */}
      {showImportExport && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.5rem',
          padding: '0.75rem',
          background: 'hsl(var(--card))',
          borderRadius: '0.5rem',
          border: '1px solid hsl(var(--border))'
        }}>
          <div>
            <strong style={{ fontSize: '12px', marginRight: '8px' }}>Importar:</strong>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.kml,.gpx"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <Upload size={14} /> GeoJSON/KML/GPX
            </button>
          </div>
          <div style={{ borderLeft: '1px solid hsl(var(--border))', margin: '0 4px' }} />
          <div>
            <strong style={{ fontSize: '12px', marginRight: '8px' }}>Exportar:</strong>
            <button onClick={exportToGeoJSON} className="btn btn-secondary btn-sm" style={{ fontSize: '12px', marginRight: '4px' }}>
              <Download size={14} /> GeoJSON
            </button>
            <button onClick={exportToKML} className="btn btn-secondary btn-sm" style={{ fontSize: '12px', marginRight: '4px' }}>
              <Download size={14} /> KML
            </button>
            <button onClick={copyCoordinates} className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }}>
              <Copy size={14} /> Copiar
            </button>
          </div>
        </div>
      )}
      
      {/* Info de zonas dibujadas */}
      {effectiveZones.length > 0 && (
        <div style={{
          marginBottom: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'hsl(142 76% 36% / 0.1)',
          borderRadius: '0.5rem',
          border: '1px solid hsl(142 76% 36% / 0.3)',
          fontSize: '13px'
        }} data-testid="zones-info-panel">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: effectiveZones.length > 1 ? '0.5rem' : 0 }}>
            <span><strong>Zonas:</strong> {effectiveZones.length}</span>
            <span><strong>Puntos totales:</strong> {totalPoints}</span>
            <span><strong>Area total:</strong> {totalArea.toFixed(4)} ha</span>
            <button 
              onClick={() => handleZonesChanged([])} 
              className="btn btn-sm"
              style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '11px', background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
              data-testid="btn-clear-all-zones"
            >
              <Trash2 size={12} /> Limpiar todo
            </button>
          </div>
          {effectiveZones.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {effectiveZones.map((zone, idx) => (
                <span key={idx} style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  background: `${ZONE_COLORS[idx % ZONE_COLORS.length].fill}22`,
                  border: `1px solid ${ZONE_COLORS[idx % ZONE_COLORS.length].color}`,
                  color: ZONE_COLORS[idx % ZONE_COLORS.length].color,
                  fontWeight: '500'
                }}>
                  Zona {idx + 1}: {zone.length} pts, {calculateArea(zone)} ha
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Distancia medida */}
      {measuredDistance !== null && (
        <div style={{
          padding: '0.5rem 0.75rem',
          marginBottom: '0.5rem',
          background: 'hsl(210 70% 35% / 0.1)',
          borderRadius: '0.5rem',
          border: '1px solid hsl(210 70% 35% / 0.3)',
          fontSize: '13px'
        }}>
          <strong>Distancia medida:</strong> {measuredDistance.toFixed(2)} metros ({(measuredDistance / 1000).toFixed(3)} km)
          <button 
            onClick={() => { setMeasuredDistance(null); setShowMeasure(false); setDrawMode('polygon'); }}
            style={{ marginLeft: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'hsl(var(--destructive))' }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* Mapa */}
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height, width: '100%', borderRadius: '0.5rem' }}
        ref={mapRef}
      >
        <TileLayer
          url={TILE_LAYERS[mapType].url}
          attribution={TILE_LAYERS[mapType].attribution}
        />
        
        <AdvancedDrawControl 
          onZonesChanged={handleZonesChanged}
          editableZones={effectiveZones}
          isEditing={isEditing}
          drawMode={drawMode}
          onMeasureDistance={(d) => setMeasuredDistance(d)}
        />
        
        <FitBounds zones={effectiveZones} parcelas={showAllParcelas ? parcelas : null} />
        
        <GeolocationControl />
        
        {showCoordinates && <CoordinateDisplay />}
        
        {/* Mostrar todas las parcelas - todos los recintos */}
        {showAllParcelas && parcelas.map((parcela) => {
          if (!parcela.recintos || parcela.recintos.length === 0) return null;
          const color = getCultivoColor(parcela.cultivo, cultivosList);
          const isSelected = parcela._id === selectedParcelaId;
          
          return parcela.recintos.map((recinto, rIdx) => {
            if (!recinto.geometria || recinto.geometria.length < 3) return null;
            return (
              <Polygon
                key={`${parcela._id}-zone-${rIdx}`}
                positions={recinto.geometria.map(c => [c.lat, c.lng])}
                pathOptions={{
                  color: isSelected ? '#ff0000' : color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.5 : 0.3,
                  weight: isSelected ? 3 : 2
                }}
                eventHandlers={{
                  click: () => onParcelaSelect && onParcelaSelect(parcela)
                }}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>{parcela.codigo_plantacion}</h4>
                    {parcela.recintos.length > 1 && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#1565c0' }}><strong>Zona {rIdx + 1}</strong> de {parcela.recintos.length}</p>
                    )}
                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Cultivo:</strong> {parcela.cultivo}</p>
                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Proveedor:</strong> {parcela.proveedor}</p>
                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Finca:</strong> {parcela.finca}</p>
                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Superficie:</strong> {parcela.superficie_total} ha</p>
                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Campana:</strong> {parcela.campana}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          });
        })}
      </MapContainer>
      
      {/* Leyenda de cultivos */}
      {showAllParcelas && cultivosList.length > 0 && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: 'hsl(var(--card))',
          borderRadius: '0.5rem',
          border: '1px solid hsl(var(--border))'
        }}>
          <strong style={{ fontSize: '12px' }}>Leyenda:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
            {cultivosList.map((cultivo, idx) => (
              <div key={cultivo} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  background: CULTIVO_COLORS[idx % CULTIVO_COLORS.length]
                }} />
                {cultivo}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedParcelMap;
