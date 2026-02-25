import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Componente de control de dibujo avanzado
function AdvancedDrawControl({ 
  onPolygonCreated, 
  onPolygonEdited, 
  editablePolygon, 
  isEditing,
  drawMode,
  onMeasureDistance
}) {
  const map = useMap();
  const drawnItemsRef = useRef(null);
  const drawControlRef = useRef(null);
  const measureLayerRef = useRef(null);
  
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
    
    // Si hay un polígono editable, añadirlo al grupo
    if (editablePolygon && editablePolygon.length > 0 && isEditing) {
      const latlngs = editablePolygon.map(p => [p.lat, p.lng]);
      const polygon = L.polygon(latlngs, { color: '#2d5a27', fillColor: '#4CAF50', fillOpacity: 0.3 });
      drawnItems.addLayer(polygon);
    }
    
    // Configurar opciones de dibujo según el modo
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
    
    // Evento: Figura creada
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
        // Añadir etiqueta de distancia
        const midPoint = latlngs[Math.floor(latlngs.length / 2)];
        L.popup()
          .setLatLng(midPoint)
          .setContent(`<strong>Distancia:</strong> ${distance.toFixed(2)} m`)
          .openOn(map);
        return;
      }
      
      // Limpiar polígonos anteriores (solo permitir uno)
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      
      let coordinates = [];
      
      if (layerType === 'polygon' || layerType === 'rectangle') {
        const latlngs = layer.getLatLngs()[0];
        coordinates = latlngs.map(point => ({ lat: point.lat, lng: point.lng }));
      } else if (layerType === 'circle') {
        // Convertir círculo a polígono aproximado (32 puntos)
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
      
      onPolygonCreated(coordinates);
    };
    
    // Evento: Polígono editado
    const handleEdited = (e) => {
      const layers = e.layers;
      layers.eachLayer((layer) => {
        if (layer.getLatLngs) {
          const latlngs = layer.getLatLngs()[0];
          const coordinates = latlngs.map(point => ({ lat: point.lat, lng: point.lng }));
          if (onPolygonEdited) {
            onPolygonEdited(coordinates);
          } else {
            onPolygonCreated(coordinates);
          }
        }
      });
    };
    
    // Evento: Eliminado
    const handleDeleted = () => {
      onPolygonCreated([]);
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
  }, [map, onPolygonCreated, onPolygonEdited, editablePolygon, isEditing, drawMode, onMeasureDistance]);
  
  return null;
}

// Componente para centrar el mapa
function FitBounds({ polygon, parcelas }) {
  const map = useMap();
  
  useEffect(() => {
    if (polygon && polygon.length > 0) {
      const bounds = L.latLngBounds(polygon.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (parcelas && parcelas.length > 0) {
      const allCoords = [];
      parcelas.forEach(p => {
        if (p.recintos && p.recintos[0]?.geometria) {
          p.recintos[0].geometria.forEach(c => allCoords.push([c.lat, c.lng]));
        }
      });
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, polygon, parcelas]);
  
  return null;
}

// Componente para geolocalización
function GeolocationControl({ onLocate }) {
  const map = useMap();
  
  const handleLocate = () => {
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

// Componente principal del mapa avanzado
const AdvancedParcelMap = ({
  polygon,
  setPolygon,
  parcelas = [],
  selectedParcelaId,
  onParcelaSelect,
  isEditing = false,
  showAllParcelas = false,
  height = '400px',
  onPolygonCreated,
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
  
  // Lista única de cultivos para colores
  const cultivosList = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
  
  // Manejar creación de polígono
  const handlePolygonCreated = (coords) => {
    if (setPolygon) setPolygon(coords);
    if (onPolygonCreated) onPolygonCreated(coords);
  };
  
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
      console.error('Error searching address:', error);
      alert('Error al buscar dirección');
    }
  };
  
  // Exportar a GeoJSON
  const exportToGeoJSON = () => {
    if (!polygon || polygon.length < 3) {
      alert('No hay polígono para exportar');
      return;
    }
    
    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[...polygon.map(p => [p.lng, p.lat]), [polygon[0].lng, polygon[0].lat]]]
      }
    };
    
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parcela.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Exportar a KML
  const exportToKML = () => {
    if (!polygon || polygon.length < 3) {
      alert('No hay polígono para exportar');
      return;
    }
    
    const coords = polygon.map(p => `${p.lng},${p.lat},0`).join(' ');
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Parcela</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords} ${polygon[0].lng},${polygon[0].lat},0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
    
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parcela.kml';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Copiar coordenadas al portapapeles
  const copyCoordinates = () => {
    if (!polygon || polygon.length < 3) {
      alert('No hay polígono para copiar');
      return;
    }
    
    const text = polygon.map(p => `${p.lat}, ${p.lng}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Coordenadas copiadas al portapapeles');
  };
  
  // Importar archivo
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let coordinates = [];
        
        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          // Parse GeoJSON
          const geojson = JSON.parse(content);
          if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
            coordinates = geojson.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
            coordinates.pop(); // Remove closing point
          } else if (geojson.type === 'FeatureCollection' && geojson.features?.[0]) {
            const feature = geojson.features[0];
            if (feature.geometry?.type === 'Polygon') {
              coordinates = feature.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }));
              coordinates.pop();
            }
          }
        } else if (file.name.endsWith('.kml')) {
          // Parse KML (básico)
          const parser = new DOMParser();
          const kml = parser.parseFromString(content, 'text/xml');
          const coordsText = kml.querySelector('coordinates')?.textContent;
          if (coordsText) {
            const points = coordsText.trim().split(/\s+/);
            coordinates = points.map(p => {
              const [lng, lat] = p.split(',');
              return { lat: parseFloat(lat), lng: parseFloat(lng) };
            });
            if (coordinates.length > 1) coordinates.pop(); // Remove closing point
          }
        } else if (file.name.endsWith('.gpx')) {
          // Parse GPX
          const parser = new DOMParser();
          const gpx = parser.parseFromString(content, 'text/xml');
          const trackPoints = gpx.querySelectorAll('trkpt, rtept, wpt');
          coordinates = Array.from(trackPoints).map(pt => ({
            lat: parseFloat(pt.getAttribute('lat')),
            lng: parseFloat(pt.getAttribute('lon'))
          }));
        }
        
        if (coordinates.length >= 3) {
          handlePolygonCreated(coordinates);
          // Centrar mapa en el polígono importado
          if (mapRef.current) {
            const bounds = L.latLngBounds(coordinates.map(c => [c.lat, c.lng]));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
          alert(`Polígono importado con ${coordinates.length} puntos`);
        } else {
          alert('No se pudo extraer un polígono válido del archivo');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error al leer el archivo');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };
  
  const mapCenter = polygon && polygon.length > 0 
    ? [polygon[0].lat, polygon[0].lng] 
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
      
      {/* Info del polígono actual */}
      {polygon && polygon.length >= 3 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'hsl(142 76% 36% / 0.1)',
          borderRadius: '0.5rem',
          border: '1px solid hsl(142 76% 36% / 0.3)',
          fontSize: '13px'
        }}>
          <span><strong>Puntos:</strong> {polygon.length}</span>
          <span><strong>Área:</strong> {calculateArea(polygon)} ha</span>
          <span><strong>Perímetro:</strong> {calculatePerimeter(polygon)} m</span>
          <button 
            onClick={() => handlePolygonCreated([])} 
            className="btn btn-sm"
            style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '11px', background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
          >
            <Trash2 size={12} /> Limpiar
          </button>
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
          onPolygonCreated={handlePolygonCreated}
          onPolygonEdited={onPolygonEdited}
          editablePolygon={polygon}
          isEditing={isEditing}
          drawMode={drawMode}
          onMeasureDistance={(d) => setMeasuredDistance(d)}
        />
        
        <FitBounds polygon={polygon} parcelas={showAllParcelas ? parcelas : null} />
        
        <GeolocationControl />
        
        {showCoordinates && <CoordinateDisplay />}
        
        {/* Mostrar todas las parcelas */}
        {showAllParcelas && parcelas.map((parcela) => {
          if (!parcela.recintos?.[0]?.geometria) return null;
          const coords = parcela.recintos[0].geometria;
          const color = getCultivoColor(parcela.cultivo, cultivosList);
          const isSelected = parcela._id === selectedParcelaId;
          
          return (
            <Polygon
              key={parcela._id}
              positions={coords.map(c => [c.lat, c.lng])}
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
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Cultivo:</strong> {parcela.cultivo}</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Proveedor:</strong> {parcela.proveedor}</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Finca:</strong> {parcela.finca}</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Superficie:</strong> {parcela.superficie_total} ha</p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Campaña:</strong> {parcela.campana}</p>
                </div>
              </Popup>
            </Polygon>
          );
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
