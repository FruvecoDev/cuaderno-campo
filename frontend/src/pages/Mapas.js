import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { Map, Layers, MapPin, Edit2, Save, X, Maximize2, List, Filter, Leaf, Ruler, Pentagon, Trash2, Check, Upload, Search, Navigation, Eye, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GeoImportModal from '../components/GeoImportModal';
import html2canvas from 'html2canvas';
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
const FitBounds = ({ parcelas, disabled }) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // Only fit bounds on initial load, not when flyTo is active
    if (disabled || hasInitialized) return;
    
    const bounds = [];
    
    parcelas.forEach(p => {
      // Add all polygon bounds if available (support multiple recintos)
      if (p.recintos?.length > 0) {
        p.recintos.forEach(recinto => {
          if (recinto.geometria?.length > 0) {
            recinto.geometria.forEach(coord => {
              if (coord.lat && coord.lng) {
                bounds.push([coord.lat, coord.lng]);
              }
            });
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
      setHasInitialized(true);
    }
  }, [parcelas, map, disabled, hasInitialized]);
  
  return null;
};

// Component to fly to a specific parcela
const FlyToParcela = ({ parcela, onComplete }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!parcela) return;
    
    let targetLat, targetLng;
    let zoomLevel = 17;
    
    // If parcela has polygons, fly to bounds of all of them
    const allCoords = [];
    if (parcela.recintos?.length > 0) {
      parcela.recintos.forEach(recinto => {
        if (recinto.geometria?.length > 0) {
          recinto.geometria.forEach(c => allCoords.push([c.lat, c.lng]));
        }
      });
    }
    
    if (allCoords.length > 0) {
      // Fly to all polygons' bounds
      map.flyToBounds(allCoords, { padding: [80, 80], maxZoom: 18, duration: 1.5 });
    } else if (parcela.latitud && parcela.longitud) {
      // Fly to marker position
      targetLat = parcela.latitud;
      targetLng = parcela.longitud;
      map.flyTo([targetLat, targetLng], zoomLevel, { duration: 1.5 });
    }
    
    if (onComplete) {
      setTimeout(onComplete, 2000);
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
  const [drawnPolygons, setDrawnPolygons] = useState([]); // Array de polígonos dibujados
  const [filters, setFilters] = useState({ cultivo: '', finca: '', search: '' });
  const [showList, setShowList] = useState(true);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid default
  const [mapZoom, setMapZoom] = useState(6);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [flyToParcela, setFlyToParcela] = useState(null);
  const [mapType, setMapType] = useState('street'); // 'street' or 'satellite'
  const [disableFitBounds, setDisableFitBounds] = useState(false);
  const [capturingMap, setCapturingMap] = useState(false);
  const [editingRecintoIndex, setEditingRecintoIndex] = useState(null); // Índice del recinto que se está editando
  const [isDrawingActive, setIsDrawingActive] = useState(false); // Controla si la herramienta de dibujo está activa
  const featureGroupRef = useRef(null);
  const mapContainerRef = useRef(null);
  const drawnLayersRef = useRef({}); // Mapeo de layer IDs a polígonos
  const editControlRef = useRef(null); // Referencia al EditControl
  const mapInstanceRef = useRef(null); // Referencia al mapa para activar dibujo

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
        (p.recintos?.some(r => r.geometria?.length > 0))
      );
      if (withLocation.length > 0) {
        const p = withLocation[0];
        // Get center from all recintos
        const allCoords = [];
        if (p.recintos?.length > 0) {
          p.recintos.forEach(recinto => {
            if (recinto.geometria?.length > 0) {
              recinto.geometria.forEach(c => allCoords.push(c));
            }
          });
        }
        
        if (allCoords.length > 0) {
          const centerLat = allCoords.reduce((sum, c) => sum + c.lat, 0) / allCoords.length;
          const centerLng = allCoords.reduce((sum, c) => sum + c.lng, 0) / allCoords.length;
          setMapCenter([centerLat, centerLng]);
        } else if (p.latitud && p.longitud) {
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

  const handleSavePolygons = async () => {
    if (!selectedParcela || drawnPolygons.length === 0) return;
    
    setSaving(true);
    try {
      // Combinar recintos existentes con nuevos dibujados
      const existingRecintos = selectedParcela.recintos || [];
      
      // Si estamos editando un recinto específico, reemplazarlo
      let updatedRecintos;
      if (editingRecintoIndex !== null && drawnPolygons.length === 1) {
        updatedRecintos = [...existingRecintos];
        updatedRecintos[editingRecintoIndex] = {
          geometria: drawnPolygons[0],
          superficie_recinto: calculatePolygonArea(drawnPolygons[0])
        };
      } else {
        // Agregar nuevos polígonos a los existentes
        const newRecintos = drawnPolygons.map(poly => ({
          geometria: poly,
          superficie_recinto: calculatePolygonArea(poly)
        }));
        updatedRecintos = [...existingRecintos, ...newRecintos];
      }
      
      // Calcular el centro de todos los polígonos
      const allCoords = updatedRecintos.flatMap(r => r.geometria || []);
      let centerLat = 0, centerLng = 0;
      if (allCoords.length > 0) {
        centerLat = allCoords.reduce((sum, c) => sum + c.lat, 0) / allCoords.length;
        centerLng = allCoords.reduce((sum, c) => sum + c.lng, 0) / allCoords.length;
      }
      
      // Capture map image before saving
      let imagenMapaUrl = null;
      if (mapContainerRef.current) {
        try {
          setCapturingMap(true);
          const originalMapType = mapType;
          if (mapType !== 'satellite') {
            setMapType('satellite');
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
          const canvas = await html2canvas(mapContainerRef.current, {
            useCORS: true,
            allowTaint: true,
            scale: 1,
            logging: false
          });
          
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
          const formData = new FormData();
          formData.append('file', blob, `mapa_parcela_${selectedParcela._id}.png`);
          
          const uploadResponse = await api.postFormData('/api/upload/mapa-parcela', formData);
          imagenMapaUrl = uploadResponse.url;
          
          if (originalMapType !== 'satellite') {
            setMapType(originalMapType);
          }
        } catch (captureError) {
          console.error('Error capturing map:', captureError);
        } finally {
          setCapturingMap(false);
        }
      }
      
      const updatedParcela = {
        ...selectedParcela,
        latitud: centerLat,
        longitud: centerLng,
        imagen_mapa_url: imagenMapaUrl || selectedParcela.imagen_mapa_url,
        recintos: updatedRecintos
      };
      
      await api.put(`/api/parcelas/${selectedParcela._id}`, updatedParcela);
      
      // Update local state
      setParcelas(parcelas.map(p => 
        p._id === selectedParcela._id ? { ...p, ...updatedParcela } : p
      ));
      
      setDrawMode(false);
      setSelectedParcela(null);
      setDrawnPolygons([]);
      setEditingRecintoIndex(null);
      drawnLayersRef.current = {};
      
      // Clear drawn layers
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
    } catch (err) {
      console.error('Error saving polygons:', err);
      alert('Error al guardar los polígonos');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolygon = async (parcela, recintoIndex = null) => {
    const message = recintoIndex !== null 
      ? `¿Eliminar la zona ${recintoIndex + 1} de esta parcela?`
      : '¿Eliminar TODOS los polígonos de esta parcela?';
    
    if (!confirm(message)) return;
    
    try {
      let updatedRecintos;
      
      if (recintoIndex !== null) {
        // Eliminar solo el recinto específico
        updatedRecintos = parcela.recintos.filter((_, idx) => idx !== recintoIndex);
      } else {
        // Eliminar todos los recintos
        updatedRecintos = [];
      }
      
      const updatedParcela = {
        ...parcela,
        recintos: updatedRecintos
      };
      
      await api.put(`/api/parcelas/${parcela._id}`, updatedParcela);
      
      setParcelas(parcelas.map(p => 
        p._id === parcela._id ? { ...p, recintos: updatedRecintos } : p
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

  const openDrawMode = (parcela, recintoIndex = null) => {
    setSelectedParcela(parcela);
    setDrawMode(true);
    setEditMode(false);
    setDrawnPolygons([]);
    setEditingRecintoIndex(recintoIndex);
    drawnLayersRef.current = {};
    
    // Clear any existing drawings
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  // Function to capture map image and save to parcela
  const captureMapImage = async (parcela) => {
    if (!mapContainerRef.current) return;
    
    try {
      setCapturingMap(true);
      
      // Wait a moment for tiles to fully load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
        logging: false
      });
      
      // Convert to blob and upload
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      const formData = new FormData();
      formData.append('file', blob, `mapa_parcela_${parcela._id}.png`);
      
      const uploadResponse = await api.postFormData('/api/upload/mapa-parcela', formData);
      
      // Update parcela with new image URL
      await api.put(`/api/parcelas/${parcela._id}`, {
        ...parcela,
        imagen_mapa_url: uploadResponse.url,
        imagen_mapa_path: uploadResponse.path
      });
      
      // Reload parcelas
      const res = await api.get('/api/parcelas');
      setParcelas(res.parcelas || res || []);
      
      alert('Imagen del mapa guardada correctamente');
    } catch (error) {
      console.error('Error capturing map:', error);
      alert('Error al capturar la imagen del mapa');
    } finally {
      setCapturingMap(false);
    }
  };

  const handleDrawCreated = (e) => {
    const { layer } = e;
    const layerId = L.Util.stamp(layer);
    const coords = layer.getLatLngs()[0].map(latlng => ({
      lat: latlng.lat,
      lng: latlng.lng
    }));
    
    // Almacenar el mapeo de layer ID a polígono
    drawnLayersRef.current[layerId] = coords;
    
    // Actualizar el array de polígonos dibujados
    setDrawnPolygons(prev => [...prev, coords]);
    
    // Marcar que la herramienta de dibujo ya no está activa (el usuario cerró el polígono)
    setIsDrawingActive(false);
  };

  // Función para activar manualmente la herramienta de dibujo de polígonos
  const activatePolygonDrawing = () => {
    // Buscar el botón de dibujo de polígono en el DOM y hacer clic
    const drawButton = document.querySelector('.leaflet-draw-draw-polygon');
    if (drawButton) {
      drawButton.click();
      setIsDrawingActive(true);
    }
  };

  const handleDrawEdited = (e) => {
    const layers = e.layers;
    const updatedPolygons = [];
    
    layers.eachLayer((layer) => {
      const coords = layer.getLatLngs()[0].map(latlng => ({
        lat: latlng.lat,
        lng: latlng.lng
      }));
      updatedPolygons.push(coords);
    });
    
    // Actualizar los polígonos editados
    if (updatedPolygons.length > 0) {
      setDrawnPolygons(updatedPolygons);
    }
  };

  const handleDrawDeleted = (e) => {
    const layers = e.layers;
    const deletedIds = [];
    
    layers.eachLayer((layer) => {
      const layerId = L.Util.stamp(layer);
      deletedIds.push(layerId);
    });
    
    // Eliminar los polígonos borrados del mapeo
    deletedIds.forEach(id => {
      delete drawnLayersRef.current[id];
    });
    
    // Actualizar el estado con los polígonos restantes
    setDrawnPolygons(Object.values(drawnLayersRef.current));
  };

  const handleImportComplete = (result) => {
    // Reload parcelas after import
    fetchParcelas();
  };

  // Filter parcelas
  const filteredParcelas = parcelas.filter(p => {
    if (filters.cultivo && p.cultivo !== filters.cultivo) return false;
    if (filters.finca && p.finca_id !== filters.finca) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchCodigo = p.codigo_plantacion?.toLowerCase().includes(searchLower);
      const matchFinca = p.finca?.toLowerCase().includes(searchLower);
      const matchCultivo = p.cultivo?.toLowerCase().includes(searchLower);
      const matchProveedor = p.proveedor?.toLowerCase().includes(searchLower);
      if (!matchCodigo && !matchFinca && !matchCultivo && !matchProveedor) return false;
    }
    return true;
  });

  const parcelasConUbicacion = filteredParcelas.filter(p => 
    (p.latitud && p.longitud) || (p.recintos?.some(r => r.geometria?.length > 0))
  );
  const parcelasSinUbicacion = filteredParcelas.filter(p => 
    !p.latitud && !p.longitud && !p.recintos?.some(r => r.geometria?.length > 0)
  );
  const parcelasConPoligono = filteredParcelas.filter(p => p.recintos?.some(r => r.geometria?.length > 0));
  const totalZonas = filteredParcelas.reduce((sum, p) => sum + (p.recintos?.filter(r => r.geometria?.length > 0).length || 0), 0);

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
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>
            {parcelasConPoligono.length}
            {totalZonas > parcelasConPoligono.length && (
              <span style={{ fontSize: '0.8rem', fontWeight: '500', marginLeft: '0.25rem' }}>
                ({totalZonas} zonas)
              </span>
            )}
          </div>
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
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'hsl(var(--muted-foreground))'
            }} />
            <input 
              type="text"
              className="form-input"
              placeholder="Buscar parcela..."
              style={{ width: '200px', paddingLeft: '36px' }}
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              data-testid="filter-search"
            />
          </div>
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
            {fincas.filter(f => f.nombre && f.nombre.trim() !== '').map(f => (
              <option key={f._id} value={f._id}>{f.nombre}</option>
            ))}
          </select>
          {(filters.cultivo || filters.finca || filters.search) && (
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => setFilters({ cultivo: '', finca: '', search: '' })}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Pentagon size={20} style={{ color: 'hsl(210 100% 50%)' }} />
              <span style={{ fontWeight: '600' }}>
                {editingRecintoIndex !== null 
                  ? `Editando zona ${editingRecintoIndex + 1} de: `
                  : 'Añadiendo zonas a: '}
                <strong>{selectedParcela.codigo_plantacion}</strong>
              </span>
              {selectedParcela.recintos?.length > 0 && editingRecintoIndex === null && (
                <span style={{ 
                  background: 'hsl(var(--muted) / 0.3)', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>
                  Ya tiene {selectedParcela.recintos.length} zona(s)
                </span>
              )}
              {drawnPolygons.length > 0 && (
                <span style={{ 
                  background: 'hsl(142 76% 36% / 0.2)', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: 'hsl(142 76% 36%)'
                }}>
                  {drawnPolygons.length} nuevo(s) • Área total: {drawnPolygons.reduce((sum, poly) => sum + calculatePolygonArea(poly), 0).toFixed(2)} ha
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { 
                  setDrawMode(false); 
                  setSelectedParcela(null); 
                  setDrawnPolygons([]); 
                  setEditingRecintoIndex(null);
                  setIsDrawingActive(false);
                  drawnLayersRef.current = {};
                }}
              >
                <X size={16} /> Cancelar
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleSavePolygons}
                disabled={drawnPolygons.length === 0 || saving}
              >
                <Save size={16} /> {saving ? 'Guardando...' : `Guardar ${drawnPolygons.length} polígono(s)`}
              </button>
            </div>
          </div>
          
          {/* Barra de herramientas de dibujo */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            marginTop: '0.75rem',
            padding: '0.5rem',
            background: 'hsl(var(--card))',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))'
          }}>
            <button
              className={`btn btn-sm ${isDrawingActive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={activatePolygonDrawing}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontWeight: isDrawingActive ? '600' : '500'
              }}
            >
              <Pentagon size={16} />
              {isDrawingActive ? 'Dibujando...' : (drawnPolygons.length > 0 ? 'Dibujar otra zona' : 'Empezar a dibujar')}
            </button>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
              {isDrawingActive 
                ? 'Haz clic en el mapa para añadir puntos. Cierra el polígono haciendo clic en el primer punto.'
                : drawnPolygons.length > 0 
                  ? 'Puedes seguir añadiendo más zonas o guardar las actuales.'
                  : 'Haz clic en "Empezar a dibujar" y luego marca los puntos en el mapa.'}
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: showList ? '1fr 350px' : '1fr', gap: '1rem', height: drawMode ? 'calc(100% - 280px)' : 'calc(100% - 200px)' }}>
        {/* Map */}
        <div className="card" ref={mapContainerRef} style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', minHeight: '400px', position: 'relative' }}>
          {/* Capturing overlay */}
          {capturingMap && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              color: 'white',
              fontSize: '1.2rem'
            }}>
              <Camera size={24} style={{ marginRight: '10px' }} />
              Capturando imagen del mapa...
            </div>
          )}
          {/* Map type selector */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            display: 'flex',
            gap: '4px',
            background: 'white',
            padding: '4px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <button
              className={`btn btn-sm ${mapType === 'street' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapType('street')}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              title="Mapa callejero"
            >
              <Map size={14} /> Mapa
            </button>
            <button
              className={`btn btn-sm ${mapType === 'satellite' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapType('satellite')}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              title="Vista satélite"
            >
              <Layers size={14} /> Satélite
            </button>
          </div>
          
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
            data-testid="map-container"
          >
            {mapType === 'street' ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            ) : (
              <TileLayer
                attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}
            
            <FitBounds parcelas={parcelasConUbicacion} disabled={disableFitBounds} />
            
            {/* Fly to selected parcela */}
            {flyToParcela && (
              <FlyToParcela 
                parcela={flyToParcela} 
                onComplete={() => setFlyToParcela(null)} 
              />
            )}
            
            {/* Drawing controls - only show in draw mode */}
            {drawMode && (
              <FeatureGroup ref={featureGroupRef}>
                <EditControl
                  position="topright"
                  onCreated={handleDrawCreated}
                  onEdited={handleDrawEdited}
                  onDeleted={handleDrawDeleted}
                  draw={{
                    rectangle: false,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                    polyline: false,
                    polygon: {
                      allowIntersection: false,
                      repeatMode: true, // Permite dibujar múltiples polígonos consecutivamente
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
            
            {/* Render existing polygons - ALL recintos for each parcela */}
            {filteredParcelas.map(parcela => {
              const recintos = parcela.recintos || [];
              if (recintos.length === 0) return null;
              
              return recintos.map((recinto, recintoIndex) => {
                if (!recinto.geometria?.length) return null;
                
                const polygonCoords = recinto.geometria.map(c => [c.lat, c.lng]);
                const color = CROP_COLORS[parcela.cultivo] || CROP_COLORS.default;
                // Variar ligeramente el color para distinguir zonas de la misma parcela
                const opacity = 0.3 + (recintoIndex * 0.1);
                const strokeWeight = recintoIndex === 0 ? 3 : 2;
                
                return (
                  <Polygon
                    key={`polygon-${parcela._id}-${recintoIndex}`}
                    positions={polygonCoords}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: Math.min(opacity, 0.5),
                      weight: strokeWeight,
                      dashArray: recintoIndex > 0 ? '5, 5' : null
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '240px' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '1rem' }}>
                          {parcela.codigo_plantacion}
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '0.75rem', 
                            background: color + '33',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            color: color
                          }}>
                            Zona {recintoIndex + 1} de {recintos.length}
                          </span>
                        </h3>
                        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <Leaf size={14} style={{ color }} />
                            <strong>{parcela.cultivo || 'Sin cultivo'}</strong>
                          </div>
                          <div>Superficie parcela: <strong>{parcela.superficie_total} ha</strong></div>
                          {recinto.superficie_recinto && (
                            <div>Área esta zona: <strong>{recinto.superficie_recinto.toFixed(2)} ha</strong></div>
                          )}
                          {recintos.length > 1 && (
                            <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                              Área total zonas: <strong>
                                {recintos.reduce((sum, r) => sum + (r.superficie_recinto || 0), 0).toFixed(2)} ha
                              </strong>
                            </div>
                          )}
                          {parcela.variedad && <div>Variedad: {parcela.variedad}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => openDrawMode(parcela, recintoIndex)}
                            style={{ flex: 1 }}
                          >
                            <Edit2 size={14} /> Editar zona
                          </button>
                          <button 
                            className="btn btn-sm"
                            onClick={() => handleDeletePolygon(parcela, recintoIndex)}
                            style={{ flex: 1, background: 'hsl(0 84% 60%)', color: 'white' }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                        {recintos.length > 1 && (
                          <button 
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleDeletePolygon(parcela, null)}
                            style={{ width: '100%', marginTop: '0.5rem', color: 'hsl(0 84% 60%)' }}
                          >
                            <Trash2 size={14} /> Eliminar todas las zonas
                          </button>
                        )}
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => openDrawMode(parcela)}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          <Pentagon size={14} /> Añadir otra zona
                        </button>
                      </div>
                    </Popup>
                  </Polygon>
                );
              });
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
              const hasPolygon = p.recintos?.some(r => r.geometria?.length > 0);
              const numZonas = p.recintos?.filter(r => r.geometria?.length > 0).length || 0;
              return (
                <div 
                  key={p._id}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    background: hasPolygon ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted) / 0.3)',
                    border: hasPolygon ? '1px solid hsl(142 76% 36% / 0.3)' : '1px solid hsl(var(--border))',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => { setDisableFitBounds(true); setFlyToParcela(p); }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                    <button
                      className="btn btn-xs"
                      onClick={(e) => { e.stopPropagation(); setDisableFitBounds(true); setFlyToParcela(p); }}
                      style={{ 
                        padding: '0.15rem 0.4rem', 
                        fontSize: '0.65rem',
                        background: 'hsl(var(--primary))',
                        color: 'white'
                      }}
                      title="Ir a parcela"
                    >
                      <Navigation size={10} />
                    </button>
                    {hasPolygon && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Pentagon size={14} style={{ color: 'hsl(142 76% 36%)' }} />
                        {numZonas > 1 && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            background: 'hsl(142 76% 36% / 0.2)', 
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            color: 'hsl(142 76% 36%)'
                          }}>
                            {numZonas}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginLeft: '1.25rem' }}>
                    {p.cultivo || 'Sin cultivo'} • {p.superficie_total} ha
                    {p.finca && <span> • {p.finca}</span>}
                    {numZonas > 1 && <span style={{ color: 'hsl(142 76% 36%)' }}> • {numZonas} zonas</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-xs btn-secondary"
                      onClick={(e) => { e.stopPropagation(); openEditMode(p); }}
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <MapPin size={12} /> Punto
                    </button>
                    <button 
                      className="btn btn-xs btn-primary"
                      onClick={(e) => { e.stopPropagation(); openDrawMode(p); }}
                      style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <Pentagon size={12} /> {hasPolygon ? '+ Zona' : 'Polígono'}
                    </button>
                    {hasPolygon && (
                      <button 
                        className="btn btn-xs"
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          setDisableFitBounds(true);
                          setFlyToParcela(p);
                          setTimeout(async () => {
                            setMapType('satellite');
                            setTimeout(async () => {
                              await captureMapImage(p);
                            }, 1500);
                          }, 1500);
                        }}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', backgroundColor: '#0ea5e9', color: 'white' }}
                        title="Capturar imagen del mapa"
                      >
                        <Camera size={12} />
                      </button>
                    )}
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
