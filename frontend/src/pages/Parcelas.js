import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Polygon, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Plus, Map as MapIcon, Edit2, Trash2, Filter, Settings, X, ClipboardCheck, Layers, Satellite, History, Beaker, Calendar, FileText, ChevronDown, ChevronUp, BookOpen, Loader2, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AdvancedParcelMap from '../components/AdvancedParcelMap';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Tile layers para diferentes vistas
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    name: 'Mapa Base'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    name: 'Satélite'
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Híbrido'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
    name: 'Topográfico'
  }
};

function DrawControl({ onPolygonCreated, onPolygonEdited, editablePolygon, isEditing }) {
  const map = useMap();
  const drawnItemsRef = useRef(null);
  const drawControlRef = useRef(null);
  
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
    
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: { 
          allowIntersection: false, 
          showArea: true, 
          metric: true,
          shapeOptions: {
            color: '#2d5a27',
            fillColor: '#4CAF50',
            fillOpacity: 0.3
          }
        },
        polyline: false, 
        circle: false, 
        rectangle: false, 
        marker: false, 
        circlemarker: false
      },
      edit: { 
        featureGroup: drawnItems, 
        remove: true,
        edit: true
      }
    });
    
    drawControlRef.current = drawControl;
    map.addControl(drawControl);
    
    // Evento: Polígono creado
    const handleCreated = (e) => {
      const layer = e.layer;
      // Limpiar polígonos anteriores (solo permitir uno)
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      const latlngs = layer.getLatLngs()[0];
      const coordinates = latlngs.map(point => ({ lat: point.lat, lng: point.lng }));
      onPolygonCreated(coordinates);
    };
    
    // Evento: Polígono editado
    const handleEdited = (e) => {
      const layers = e.layers;
      layers.eachLayer((layer) => {
        const latlngs = layer.getLatLngs()[0];
        const coordinates = latlngs.map(point => ({ lat: point.lat, lng: point.lng }));
        if (onPolygonEdited) {
          onPolygonEdited(coordinates);
        } else {
          onPolygonCreated(coordinates);
        }
      });
    };
    
    // Evento: Polígono eliminado
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
  }, [map, onPolygonCreated, onPolygonEdited, editablePolygon, isEditing]);
  
  return null;
}

// Componente para centrar el mapa en el polígono
function FitBounds({ polygon }) {
  const map = useMap();
  
  useEffect(() => {
    if (polygon && polygon.length > 0) {
      const bounds = L.latLngBounds(polygon.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, polygon]);
  
  return null;
}

// Default field configuration
const DEFAULT_FIELDS_CONFIG = {
  contrato_id: true,
  codigo_plantacion: true,
  proveedor: true,
  finca: true,
  cultivo: true,
  variedad: true,
  superficie_total: true,
  num_plantas: true,
  campana: true
};

const FIELD_LABELS = {
  contrato_id: 'Contrato',
  codigo_plantacion: 'Código Plantación',
  proveedor: 'Proveedor',
  finca: 'Finca',
  cultivo: 'Cultivo',
  variedad: 'Variedad',
  superficie_total: 'Superficie',
  num_plantas: 'Nº Plantas',
  campana: 'Campaña'
};

const Parcelas = () => {
  const { t } = useTranslation();
  const [parcelas, setParcelas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [searchContrato, setSearchContrato] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [polygon, setPolygon] = useState([]);
  const [mapType, setMapType] = useState('satellite'); // Tipo de mapa: osm, satellite, hybrid, topo
  const [showGeneralMap, setShowGeneralMap] = useState(false); // Mostrar mapa general de todas las parcelas
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // Cuaderno de campo
  const [generatingCuaderno, setGeneratingCuaderno] = useState(null);
  
  // Historial de tratamientos
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialParcela, setHistorialParcela] = useState(null);
  const [historialData, setHistorialData] = useState(null);
  const [historialLoading, setHistorialLoading] = useState(false);
  
  // Filtros de búsqueda de contratos (dentro del formulario)
  const [contratoSearch, setContratoSearch] = useState({
    proveedor: '',
    cultivo: '',
    campana: ''
  });
  
  // Opciones únicas para filtros de contratos (dentro del formulario)
  const [contratoFilterOptions, setContratoFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: []
  });
  
  // Filtros
  const [filters, setFilters] = useState({
    proveedor: '',
    cultivo: '',
    campana: '',
    codigo_plantacion: ''
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('parcelas_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones únicas para filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: [],
    parcelas: []
  });
  
  const [formData, setFormData] = useState({
    contrato_id: '',
    proveedor: '',
    cultivo: '',
    campana: '2025/26',
    variedad: '',
    superficie_total: '',
    codigo_plantacion: '',
    num_plantas: '',
    finca: ''
  });
  
  useEffect(() => {
    fetchParcelas();
    fetchContratos();
  }, []);
  
  // Extraer opciones únicas cuando cambian las parcelas
  useEffect(() => {
    const proveedores = [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))];
    const cultivos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
    const campanas = [...new Set(parcelas.map(p => p.campana).filter(Boolean))];
    const parcelasCodigos = [...new Set(parcelas.map(p => p.codigo_plantacion).filter(Boolean))];
    
    setFilterOptions({
      proveedores,
      cultivos,
      campanas,
      parcelas: parcelasCodigos
    });
  }, [parcelas]);
  
  // Extraer opciones únicas de contratos para el buscador del formulario
  useEffect(() => {
    const proveedores = [...new Set(contratos.map(c => c.proveedor).filter(Boolean))];
    const cultivos = [...new Set(contratos.map(c => c.cultivo).filter(Boolean))];
    const campanas = [...new Set(contratos.map(c => c.campana).filter(Boolean))];
    
    setContratoFilterOptions({
      proveedores,
      cultivos,
      campanas
    });
  }, [contratos]);
  
  // Guardar configuración de campos en localStorage
  useEffect(() => {
    localStorage.setItem('parcelas_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  // Cargar historial de tratamientos de una parcela
  const fetchHistorialTratamientos = async (parcela) => {
    setHistorialLoading(true);
    setHistorialParcela(parcela);
    setShowHistorial(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/tratamientos/parcela/${parcela._id}/historial`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistorialData(data);
      } else {
        console.error('Error fetching historial');
        setHistorialData(null);
      }
    } catch (error) {
      console.error('Error:', error);
      setHistorialData(null);
    } finally {
      setHistorialLoading(false);
    }
  };
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setParcelas(data.parcelas || []);
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchContratos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/contratos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setContratos(data.contratos || []);
    } catch (error) {
      console.error('Error fetching contratos:', error);
    }
  };

  // Filtrar parcelas
  const filteredParcelas = parcelas.filter(p => {
    if (filters.proveedor && p.proveedor !== filters.proveedor) return false;
    if (filters.cultivo && p.cultivo !== filters.cultivo) return false;
    if (filters.campana && p.campana !== filters.campana) return false;
    if (filters.codigo_plantacion && p.codigo_plantacion !== filters.codigo_plantacion) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ proveedor: '', cultivo: '', campana: '', codigo_plantacion: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  // Autocompletar campos cuando se selecciona un contrato
  useEffect(() => {
    if (formData.contrato_id) {
      const contrato = contratos.find(c => c._id === formData.contrato_id);
      if (contrato) {
        setFormData(prev => ({
          ...prev,
          proveedor: contrato.proveedor || '',
          cultivo: contrato.cultivo || '',
          campana: contrato.campana || '2025/26'
        }));
      }
    }
  }, [formData.contrato_id, contratos]);

  const handlePolygonCreated = (coords) => {
    setPolygon(coords);
    alert(`Polígono dibujado con ${coords.length} puntos`);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.contrato_id) {
      alert('Debes seleccionar un contrato. Toda parcela debe estar asociada a un contrato.');
      return;
    }
    
    if (!editingId && polygon.length < 3) {
      alert('Dibuja un polígono en el mapa primero');
      return;
    }
    
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/parcelas/${editingId}`
        : `${BACKEND_URL}/api/parcelas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        superficie_total: parseFloat(formData.superficie_total),
        num_plantas: parseInt(formData.num_plantas)
      };
      
      if (!editingId || polygon.length >= 3) {
        payload.recintos = [{ geometria: polygon }];
      }
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchParcelas();
        setPolygon([]);
        setSearchContrato('');
        setContratoSearch({ proveedor: '', cultivo: '', campana: '' });
        setFormData({
          contrato_id: '',
          proveedor: '', 
          cultivo: '', 
          campana: '2025/26', 
          variedad: '',
          superficie_total: '', 
          codigo_plantacion: '', 
          num_plantas: '', 
          finca: ''
        });
      }
    } catch (error) {
      console.error('Error saving parcela:', error);
    }
  };
  
  const handleEdit = (parcela) => {
    setEditingId(parcela._id);
    setFormData({
      contrato_id: parcela.contrato_id || '',
      proveedor: parcela.proveedor || '',
      cultivo: parcela.cultivo || '',
      campana: parcela.campana || '2025/26',
      variedad: parcela.variedad || '',
      superficie_total: parcela.superficie_total || '',
      codigo_plantacion: parcela.codigo_plantacion || '',
      num_plantas: parcela.num_plantas || '',
      finca: parcela.finca || ''
    });
    
    if (parcela.recintos && parcela.recintos.length > 0 && parcela.recintos[0].geometria) {
      setPolygon(parcela.recintos[0].geometria);
    }
    
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setPolygon([]);
    setSearchContrato('');
    setContratoSearch({ proveedor: '', cultivo: '', campana: '' });
    setFormData({
      contrato_id: '',
      proveedor: '', 
      cultivo: '', 
      campana: '2025/26', 
      variedad: '',
      superficie_total: '', 
      codigo_plantacion: '', 
      num_plantas: '', 
      finca: ''
    });
  };
  
  const handleDelete = async (parcelaId) => {
    if (!window.confirm(t('parcels.confirmDelete') || '¿Estás seguro de que quieres eliminar esta parcela?')) {
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas/${parcelaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchParcelas();
      } else {
        alert(t('messages.errorDeleting'));
      }
    } catch (error) {
      console.error('Error deleting parcela:', error);
      alert(t('messages.errorDeleting'));
    }
  };
  
  // Generate Field Notebook (Cuaderno de Campo)
  const handleGenerateCuaderno = async (parcelaId, campana) => {
    setGeneratingCuaderno(parcelaId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/cuaderno-campo/generar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          parcela_id: parcelaId,
          campana: campana,
          include_ai_summary: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error generando cuaderno');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'Cuaderno_Campo.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating cuaderno:', error);
      alert(error.message || t('fieldNotebook.errorGenerating'));
    } finally {
      setGeneratingCuaderno(null);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="parcelas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Parcelas</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title="Configurar campos visibles"
            data-testid="btn-config-fields"
          >
            <Settings size={18} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} data-testid="btn-nueva-parcela">
            <Plus size={18} /> Nueva Parcela
          </button>
        </div>
      </div>
      
      {/* Panel de configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Campos Visibles</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fieldsConfig[key]}
                  onChange={() => toggleFieldConfig(key)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Filtros de búsqueda */}
      <div className="card mb-6" data-testid="filters-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros de Búsqueda
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor</label>
            <select
              className="form-select"
              value={filters.proveedor}
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
              data-testid="filter-proveedor"
            >
              <option value="">Todos</option>
              {filterOptions.proveedores.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cultivo</label>
            <select
              className="form-select"
              value={filters.cultivo}
              onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
              data-testid="filter-cultivo"
            >
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
              data-testid="filter-campana"
            >
              <option value="">Todas</option>
              {filterOptions.campanas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Parcela</label>
            <select
              className="form-select"
              value={filters.codigo_plantacion}
              onChange={(e) => setFilters({...filters, codigo_plantacion: e.target.value})}
              data-testid="filter-parcela"
            >
              <option value="">Todas</option>
              {filterOptions.parcelas.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredParcelas.length} de {parcelas.length} parcelas
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{editingId ? 'Editar Parcela' : 'Crear Parcela'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="form-grid-responsive">
            <div>
              <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapIcon size={18} />
                Mapa Avanzado - Dibuja el polígono
              </h3>
              
              <AdvancedParcelMap
                polygon={polygon}
                setPolygon={setPolygon}
                isEditing={!!editingId}
                onPolygonCreated={handlePolygonCreated}
                height="500px"
              />
              
              {/* Nota informativa */}
              <div style={{ 
                marginTop: '0.75rem', 
                padding: '0.75rem',
                backgroundColor: 'hsl(var(--muted))',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                color: 'hsl(var(--muted-foreground))'
              }}>
                {editingId 
                  ? 'Dibuja un nuevo polígono para actualizar la geometría (opcional)' 
                  : 'Usa las herramientas del mapa para dibujar la parcela. Puedes importar archivos GeoJSON, KML o GPX.'}
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  Toda parcela debe asociarse a un contrato.
                  {editingId && ' El mapa es opcional. Solo dibuja si quieres cambiar la geometría.'}
                </p>
              </div>
              
              {fieldsConfig.contrato_id && (
                <div className="form-group">
                  <label className="form-label">Contrato * (Obligatorio)</label>
                  
                  {/* Filtros de búsqueda de contratos */}
                  <div style={{ 
                    backgroundColor: 'hsl(var(--muted))', 
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    marginBottom: '0.75rem' 
                  }}>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>
                      Buscar contrato por:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Proveedor</label>
                        <select
                          className="form-select"
                          value={contratoSearch.proveedor}
                          onChange={(e) => setContratoSearch({...contratoSearch, proveedor: e.target.value})}
                          style={{ fontSize: '0.875rem' }}
                          data-testid="contrato-search-proveedor"
                        >
                          <option value="">Todos</option>
                          {contratoFilterOptions.proveedores.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Cultivo</label>
                        <select
                          className="form-select"
                          value={contratoSearch.cultivo}
                          onChange={(e) => setContratoSearch({...contratoSearch, cultivo: e.target.value})}
                          style={{ fontSize: '0.875rem' }}
                          data-testid="contrato-search-cultivo"
                        >
                          <option value="">Todos</option>
                          {contratoFilterOptions.cultivos.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Campaña</label>
                        <select
                          className="form-select"
                          value={contratoSearch.campana}
                          onChange={(e) => setContratoSearch({...contratoSearch, campana: e.target.value})}
                          style={{ fontSize: '0.875rem' }}
                          data-testid="contrato-search-campana"
                        >
                          <option value="">Todas</option>
                          {contratoFilterOptions.campanas.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {(contratoSearch.proveedor || contratoSearch.cultivo || contratoSearch.campana) && (
                      <button
                        type="button"
                        onClick={() => setContratoSearch({ proveedor: '', cultivo: '', campana: '' })}
                        style={{ 
                          marginTop: '0.5rem', 
                          fontSize: '0.75rem', 
                          color: 'hsl(var(--primary))',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Limpiar filtros de búsqueda
                      </button>
                    )}
                  </div>
                  
                  {/* Selector de contrato filtrado */}
                  <select
                    className="form-select"
                    value={formData.contrato_id}
                    onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}
                    required
                    data-testid="select-contrato"
                  >
                    <option value="">-- Seleccionar contrato --</option>
                    {contratos
                      .filter(c => {
                        if (contratoSearch.proveedor && c.proveedor !== contratoSearch.proveedor) return false;
                        if (contratoSearch.cultivo && c.cultivo !== contratoSearch.cultivo) return false;
                        if (contratoSearch.campana && c.campana !== contratoSearch.campana) return false;
                        return true;
                      })
                      .map(c => (
                        <option key={c._id} value={c._id}>
                          {c.serie}-{c.año}-{String(c.numero).padStart(3, '0')} - {c.proveedor} - {c.cultivo} ({c.campana})
                        </option>
                      ))
                    }
                  </select>
                  {(contratoSearch.proveedor || contratoSearch.cultivo || contratoSearch.campana) && (
                    <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Mostrando {contratos.filter(c => {
                        if (contratoSearch.proveedor && c.proveedor !== contratoSearch.proveedor) return false;
                        if (contratoSearch.cultivo && c.cultivo !== contratoSearch.cultivo) return false;
                        if (contratoSearch.campana && c.campana !== contratoSearch.campana) return false;
                        return true;
                      }).length} de {contratos.length} contratos
                    </small>
                  )}
                </div>
              )}
              
              {fieldsConfig.codigo_plantacion && (
                <div className="form-group">
                  <label className="form-label">Código Plantación *</label>
                  <input type="text" className="form-input" value={formData.codigo_plantacion} onChange={(e) => setFormData({...formData, codigo_plantacion: e.target.value})} required />
                </div>
              )}
              
              {fieldsConfig.proveedor && (
                <div className="form-group">
                  <label className="form-label">Proveedor *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.proveedor} 
                    onChange={(e) => setFormData({...formData, proveedor: e.target.value})} 
                    disabled={formData.contrato_id !== ''}
                    required 
                  />
                  {formData.contrato_id && <small style={{ color: 'hsl(var(--muted-foreground))' }}>Autocompletado desde contrato</small>}
                </div>
              )}
              
              {fieldsConfig.finca && (
                <div className="form-group">
                  <label className="form-label">Finca *</label>
                  <input type="text" className="form-input" value={formData.finca} onChange={(e) => setFormData({...formData, finca: e.target.value})} required />
                </div>
              )}
              
              {fieldsConfig.cultivo && (
                <div className="form-group">
                  <label className="form-label">Cultivo *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.cultivo} 
                    onChange={(e) => setFormData({...formData, cultivo: e.target.value})} 
                    disabled={formData.contrato_id !== ''}
                    required 
                  />
                  {formData.contrato_id && <small style={{ color: 'hsl(var(--muted-foreground))' }}>Autocompletado desde contrato</small>}
                </div>
              )}
              
              {fieldsConfig.variedad && (
                <div className="form-group">
                  <label className="form-label">Variedad *</label>
                  <input type="text" className="form-input" value={formData.variedad} onChange={(e) => setFormData({...formData, variedad: e.target.value})} required />
                </div>
              )}
              
              <div className="grid-2">
                {fieldsConfig.superficie_total && (
                  <div className="form-group">
                    <label className="form-label">Superficie (ha) *</label>
                    <input type="number" step="0.01" className="form-input" value={formData.superficie_total} onChange={(e) => setFormData({...formData, superficie_total: e.target.value})} required />
                  </div>
                )}
                {fieldsConfig.num_plantas && (
                  <div className="form-group">
                    <label className="form-label">Nº Plantas *</label>
                    <input type="number" className="form-input" value={formData.num_plantas} onChange={(e) => setFormData({...formData, num_plantas: e.target.value})} required />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" data-testid="btn-guardar-parcela">
                  {editingId ? 'Actualizar Parcela' : 'Guardar Parcela'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Lista de Parcelas ({filteredParcelas.length})</h2>
        {loading ? <p>Cargando...</p> : filteredParcelas.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay parcelas que coincidan con los filtros' : 'No hay parcelas registradas'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="parcelas-table">
              <thead>
                <tr>
                  {fieldsConfig.codigo_plantacion ? <th>Código</th> : null}
                  {fieldsConfig.proveedor ? <th>Proveedor</th> : null}
                  {fieldsConfig.finca ? <th>Finca</th> : null}
                  {fieldsConfig.cultivo ? <th>Cultivo</th> : null}
                  {fieldsConfig.variedad ? <th>Variedad</th> : null}
                  {fieldsConfig.superficie_total ? <th>Superficie</th> : null}
                  {fieldsConfig.num_plantas ? <th>Plantas</th> : null}
                  {fieldsConfig.campana ? <th>Campaña</th> : null}
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcelas.map((p) => (
                  <tr key={p._id}>
                    {fieldsConfig.codigo_plantacion ? <td className="font-semibold">{p.codigo_plantacion}</td> : null}
                    {fieldsConfig.proveedor ? <td>{p.proveedor}</td> : null}
                    {fieldsConfig.finca ? <td>{p.finca}</td> : null}
                    {fieldsConfig.cultivo ? <td>{p.cultivo}</td> : null}
                    {fieldsConfig.variedad ? <td>{p.variedad}</td> : null}
                    {fieldsConfig.superficie_total ? <td>{p.superficie_total} ha</td> : null}
                    {fieldsConfig.num_plantas ? <td>{p.num_plantas?.toLocaleString()}</td> : null}
                    {fieldsConfig.campana ? <td>{p.campana}</td> : null}
                    <td><span className={`badge ${p.activo ? 'badge-success' : 'badge-default'}`}>{p.activo ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => navigate(`/evaluaciones?parcela_id=${p._id}`)} 
                          title="Nueva Hoja de Evaluación"
                          data-testid={`evaluacion-parcela-${p._id}`}
                        >
                          <ClipboardCheck size={14} />
                        </button>
                        <button 
                          className="btn btn-sm"
                          style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
                          onClick={() => fetchHistorialTratamientos(p)} 
                          title="Historial de Tratamientos" 
                          data-testid={`historial-parcela-${p._id}`}
                        >
                          <History size={14} />
                        </button>
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => handleGenerateCuaderno(p._id, p.campana)}
                          title={t('fieldNotebook.generate')}
                          disabled={generatingCuaderno === p._id}
                          data-testid={`cuaderno-parcela-${p._id}`}
                        >
                          {generatingCuaderno === p._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <BookOpen size={14} />
                          )}
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(p)} title="Editar" data-testid={`edit-parcela-${p._id}`}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-sm btn-error" onClick={() => handleDelete(p._id)} title="Eliminar" data-testid={`delete-parcela-${p._id}`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal de Historial de Tratamientos */}
      {showHistorial && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowHistorial(false)}
        >
          <div 
            className="card"
            style={{
              width: '90%',
              maxWidth: '900px',
              maxHeight: '85vh',
              overflow: 'auto',
              margin: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={24} style={{ color: '#166534' }} />
                Historial de Tratamientos
              </h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowHistorial(false)}>
                <X size={18} />
              </button>
            </div>
            
            {historialParcela && (
              <div style={{ 
                backgroundColor: 'hsl(var(--primary) / 0.1)', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  Parcela: {historialParcela.codigo_plantacion}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {historialParcela.proveedor}</div>
                  <div><strong>Cultivo:</strong> {historialParcela.cultivo}</div>
                  <div><strong>Superficie:</strong> {historialParcela.superficie_total} ha</div>
                  <div><strong>Campaña:</strong> {historialParcela.campana}</div>
                </div>
              </div>
            )}
            
            {historialLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Cargando historial...</p>
              </div>
            ) : historialData ? (
              <>
                {/* Estadísticas */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#166534' }}>
                      {historialData.estadisticas.total_tratamientos}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      Tratamientos Totales
                    </div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#eff6ff' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e40af' }}>
                      {historialData.estadisticas.productos_usados.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      Productos Diferentes
                    </div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#fef3c7' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#92400e' }}>
                      {historialData.estadisticas.tipos_aplicados.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      Tipos de Tratamiento
                    </div>
                  </div>
                </div>
                
                {/* Lista de tratamientos */}
                {historialData.historial.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                    <Beaker size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>No hay tratamientos registrados para esta parcela.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Producto</th>
                          <th>Tipo</th>
                          <th>Dosis</th>
                          <th>Superficie</th>
                          <th>Aplicador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialData.historial.map((t, idx) => (
                          <tr key={t._id || idx}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={14} />
                                {t.fecha_tratamiento ? new Date(t.fecha_tratamiento).toLocaleDateString('es-ES') : '-'}
                              </div>
                              {t.fecha_aplicacion && (
                                <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                                  Aplicado: {new Date(t.fecha_aplicacion).toLocaleDateString('es-ES')}
                                </small>
                              )}
                            </td>
                            <td>
                              {t.producto_fitosanitario_nombre ? (
                                <div>
                                  <strong style={{ color: '#166534' }}>{t.producto_fitosanitario_nombre}</strong>
                                </div>
                              ) : (
                                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Sin producto</span>
                              )}
                            </td>
                            <td>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                backgroundColor: 
                                  t.subtipo === 'Herbicida' ? '#fef3c7' :
                                  t.subtipo === 'Insecticida' ? '#fce7f3' :
                                  t.subtipo === 'Fungicida' ? '#dbeafe' : '#f3f4f6'
                              }}>
                                {t.subtipo || t.tipo_tratamiento}
                              </span>
                            </td>
                            <td>
                              {t.producto_fitosanitario_dosis ? (
                                <span>{t.producto_fitosanitario_dosis} {t.producto_fitosanitario_unidad}</span>
                              ) : '-'}
                            </td>
                            <td>{t.superficie_aplicacion ? `${t.superficie_aplicacion} ha` : '-'}</td>
                            <td>{t.aplicador_nombre || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Productos usados */}
                {historialData.estadisticas.productos_usados.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Productos Utilizados</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {historialData.estadisticas.productos_usados.map((prod, idx) => (
                        <span 
                          key={idx}
                          style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            color: '#166534'
                          }}
                        >
                          <Beaker size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          {prod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--destructive))' }}>
                <p>Error al cargar el historial de tratamientos.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Parcelas;
