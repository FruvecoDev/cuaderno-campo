import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, MapPin, Search, Home, ChevronDown, ChevronUp, Map, Layers, Loader2, ExternalLink, CheckCircle, AlertCircle, Eye, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Lazy load map component
const MapaSigpac = lazy(() => import('../components/MapaSigpac'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Diccionario de usos SIGPAC
const USOS_SIGPAC = {
  "AG": "Corrientes y superficies de agua",
  "CA": "Viales",
  "CF": "Cítricos - Frutal",
  "CI": "Cítricos",
  "ED": "Edificaciones",
  "FO": "Forestal",
  "FY": "Frutal",
  "HR": "Huerta",
  "IM": "Improductivos",
  "IV": "Invernadero",
  "OV": "Olivar",
  "PA": "Pasto con arbolado",
  "PR": "Pasto arbustivo",
  "PS": "Pastizal",
  "TA": "Tierra arable",
  "VI": "Viñedo",
  "ZU": "Zona urbana"
};

const Fincas = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedFinca, setExpandedFinca] = useState(null);
  
  // Estado para búsqueda SIGPAC
  const [sigpacLoading, setSigpacLoading] = useState(false);
  const [sigpacResult, setSigpacResult] = useState(null);
  const [sigpacError, setSigpacError] = useState(null);
  const [provincias, setProvincias] = useState([]);
  
  // Estado para el mapa
  const [showMap, setShowMap] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapData, setMapData] = useState(null);
  
  // Estado para dibujo de parcelas
  const [showDrawingMap, setShowDrawingMap] = useState(false);
  const [drawingMapExpanded, setDrawingMapExpanded] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    provincia: '',
    finca_propia: ''
  });
  
  // Form data completo basado en la imagen
  const emptyFormData = {
    // Datos principales
    denominacion: '',
    provincia: '',
    poblacion: '',
    poligono: '',
    parcela: '',
    subparcela: '',
    
    // Superficie y producción
    hectareas: 0,
    areas: 0,
    toneladas: 0,
    produccion_esperada: 0,
    produccion_disponible: 0,
    
    // Propiedad
    finca_propia: false,
    
    // Datos SIGPAC
    sigpac: {
      provincia: '',
      municipio: '',
      cod_agregado: '',
      zona: '',
      poligono: '',
      parcela: '',
      recinto: '',
      cod_uso: ''
    },
    
    // Recolección
    recoleccion_semana: '',
    recoleccion_ano: new Date().getFullYear(),
    
    // Precios
    precio_corte: 0,
    precio_transporte: 0,
    proveedor_corte: '',
    
    // Observaciones
    observaciones: '',
    
    // Parcelas asociadas
    parcelas_ids: [],
    
    // Geometría dibujada manualmente
    geometria_manual: null
  };
  
  const [formData, setFormData] = useState(emptyFormData);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // Manejar cambios de geometría dibujada
  const handleGeometryChange = (geometryData) => {
    setDrawnGeometry(geometryData);
    if (geometryData) {
      setFormData(prev => ({
        ...prev,
        hectareas: geometryData.area_ha || prev.hectareas,
        geometria_manual: {
          wkt: geometryData.wkt,
          coords: geometryData.coords,
          centroide: geometryData.centroid
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        geometria_manual: null
      }));
    }
  };

  useEffect(() => {
    fetchFincas();
    fetchStats();
    fetchProvincias();
  }, []);

  const fetchFincas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/fincas`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFincas(data.fincas || []);
      }
    } catch (err) {
      console.error('Error fetching fincas:', err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/fincas/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchProvincias = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sigpac/provincias`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProvincias(data.provincias);
        }
      }
    } catch (err) {
      console.error('Error fetching provincias:', err);
    }
  };

  // Búsqueda en SIGPAC
  const buscarEnSigpac = async () => {
    const { provincia, municipio, poligono, parcela, cod_agregado, zona, recinto } = formData.sigpac;
    
    if (!provincia || !municipio || !poligono || !parcela) {
      setSigpacError('Debe completar al menos: Provincia, Municipio, Polígono y Parcela');
      return;
    }
    
    setSigpacLoading(true);
    setSigpacError(null);
    setSigpacResult(null);
    
    try {
      const params = new URLSearchParams({
        provincia,
        municipio,
        poligono,
        parcela,
        agregado: cod_agregado || '0',
        zona: zona || '0'
      });
      
      if (recinto) {
        params.append('recinto', recinto);
      }
      
      const res = await fetch(`${BACKEND_URL}/api/sigpac/consulta?${params}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setSigpacResult(data);
        
        // Auto-rellenar campos con los datos de SIGPAC
        if (data.sigpac) {
          setFormData(prev => ({
            ...prev,
            sigpac: {
              ...prev.sigpac,
              ...data.sigpac
            },
            // Si hay superficie, actualizar hectáreas
            hectareas: data.superficie_ha || prev.hectareas
          }));
        }
        
        // Guardar datos para el mapa
        setMapData({
          sigpac: data.sigpac,
          wkt: data.geometria_wkt,
          centroide: data.centroide,
          superficie_ha: data.superficie_ha,
          uso_sigpac: data.uso_sigpac
        });
        
        // Mostrar el mapa automáticamente si hay geometría
        if (data.geometria_wkt || data.centroide) {
          setShowMap(true);
        }
      } else {
        setSigpacError(data.message || data.error || 'Error al consultar SIGPAC');
        setMapData(null);
      }
    } catch (err) {
      console.error('Error consultando SIGPAC:', err);
      setSigpacError('Error de conexión al servicio SIGPAC');
      setMapData(null);
    }
    
    setSigpacLoading(false);
  };
  
  // Función para ver mapa de una finca existente
  const verMapaFinca = async (finca) => {
    if (finca.sigpac && finca.sigpac.provincia && finca.sigpac.municipio && finca.sigpac.poligono && finca.sigpac.parcela) {
      // Buscar datos en SIGPAC para obtener geometría
      try {
        const params = new URLSearchParams({
          provincia: finca.sigpac.provincia,
          municipio: finca.sigpac.municipio,
          poligono: finca.sigpac.poligono,
          parcela: finca.sigpac.parcela,
          agregado: finca.sigpac.cod_agregado || '0',
          zona: finca.sigpac.zona || '0'
        });
        
        if (finca.sigpac.recinto) {
          params.append('recinto', finca.sigpac.recinto);
        }
        
        const res = await fetch(`${BACKEND_URL}/api/sigpac/consulta?${params}`, { headers });
        const data = await res.json();
        
        if (data.success) {
          setMapData({
            sigpac: finca.sigpac,
            wkt: data.geometria_wkt,
            centroide: data.centroide,
            superficie_ha: data.superficie_ha,
            uso_sigpac: data.uso_sigpac,
            denominacion: finca.denominacion || finca.nombre
          });
          setShowMap(true);
        } else {
          alert('No se encontró la parcela en SIGPAC');
        }
      } catch (err) {
        console.error('Error consultando SIGPAC para mapa:', err);
        alert('Error al cargar datos del mapa');
      }
    } else {
      alert('Esta finca no tiene datos SIGPAC completos');
    }
  };

  // Filtrar fincas
  const filteredFincas = useMemo(() => {
    return fincas.filter(f => {
      const searchLower = filters.search.toLowerCase();
      if (filters.search) {
        const matchesSearch = 
          f.denominacion?.toLowerCase().includes(searchLower) ||
          f.nombre?.toLowerCase().includes(searchLower) ||
          f.provincia?.toLowerCase().includes(searchLower) ||
          f.poblacion?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.provincia && f.provincia !== filters.provincia) return false;
      if (filters.finca_propia === 'true' && !f.finca_propia) return false;
      if (filters.finca_propia === 'false' && f.finca_propia) return false;
      return true;
    });
  }, [fincas, filters]);

  // Opciones de filtros
  const filterOptions = useMemo(() => ({
    provincias: [...new Set(fincas.map(f => f.provincia).filter(Boolean))]
  }), [fincas]);

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setSigpacResult(null);
    setSigpacError(null);
    setDrawnGeometry(null);
    setShowDrawingMap(false);
    setShowMap(false);
    setMapData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/fincas/${editingId}`
        : `${BACKEND_URL}/api/fincas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        hectareas: parseFloat(formData.hectareas) || 0,
        areas: parseFloat(formData.areas) || 0,
        toneladas: parseFloat(formData.toneladas) || 0,
        produccion_esperada: parseFloat(formData.produccion_esperada) || 0,
        produccion_disponible: parseFloat(formData.produccion_disponible) || 0,
        precio_corte: parseFloat(formData.precio_corte) || 0,
        precio_transporte: parseFloat(formData.precio_transporte) || 0,
        recoleccion_semana: formData.recoleccion_semana ? parseInt(formData.recoleccion_semana) : null,
        recoleccion_ano: formData.recoleccion_ano ? parseInt(formData.recoleccion_ano) : null,
        // Incluir geometría dibujada si existe
        geometria_manual: drawnGeometry ? {
          wkt: drawnGeometry.wkt,
          coords: drawnGeometry.coords,
          centroide: drawnGeometry.centroid,
          area_ha: drawnGeometry.area_ha
        } : formData.geometria_manual
      };
      
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchFincas();
        fetchStats();
      } else {
        const error = await res.json();
        alert(error.detail || 'Error al guardar la finca');
      }
    } catch (err) {
      console.error('Error saving finca:', err);
      alert('Error al guardar la finca');
    }
  };

  const handleEdit = (finca) => {
    setFormData({
      denominacion: finca.denominacion || finca.nombre || '',
      provincia: finca.provincia || '',
      poblacion: finca.poblacion || '',
      poligono: finca.poligono || '',
      parcela: finca.parcela || '',
      subparcela: finca.subparcela || '',
      hectareas: finca.hectareas || 0,
      areas: finca.areas || 0,
      toneladas: finca.toneladas || 0,
      produccion_esperada: finca.produccion_esperada || 0,
      produccion_disponible: finca.produccion_disponible || 0,
      finca_propia: finca.finca_propia || false,
      sigpac: finca.sigpac || {
        provincia: '',
        municipio: '',
        cod_agregado: '',
        zona: '',
        poligono: '',
        parcela: '',
        recinto: '',
        cod_uso: ''
      },
      recoleccion_semana: finca.recoleccion_semana || '',
      recoleccion_ano: finca.recoleccion_ano || new Date().getFullYear(),
      precio_corte: finca.precio_corte || 0,
      precio_transporte: finca.precio_transporte || 0,
      proveedor_corte: finca.proveedor_corte || '',
      observaciones: finca.observaciones || '',
      parcelas_ids: finca.parcelas_ids || [],
      geometria_manual: finca.geometria_manual || null
    });
    setEditingId(finca._id);
    setShowForm(true);
    setSigpacResult(null);
    setSigpacError(null);
    
    // Cargar geometría dibujada si existe
    if (finca.geometria_manual && finca.geometria_manual.coords) {
      setDrawnGeometry({
        coords: finca.geometria_manual.coords,
        wkt: finca.geometria_manual.wkt,
        area_ha: finca.geometria_manual.area_ha,
        centroid: finca.geometria_manual.centroide
      });
    } else {
      setDrawnGeometry(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta finca?')) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/fincas/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchFincas();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting finca:', err);
    }
  };

  const clearFilters = () => {
    setFilters({ search: '', provincia: '', finca_propia: '' });
  };

  const hasActiveFilters = filters.search || filters.provincia || filters.finca_propia;

  const updateSigpac = (field, value) => {
    setFormData(prev => ({
      ...prev,
      sigpac: {
        ...prev.sigpac,
        [field]: value
      }
    }));
    // Limpiar resultados previos al cambiar datos
    if (sigpacResult) {
      setSigpacResult(null);
    }
  };

  // Obtener descripción del uso SIGPAC
  const getUsoDescripcion = (codigo) => {
    return USOS_SIGPAC[codigo] || codigo || '-';
  };

  return (
    <div data-testid="fincas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Home size={32} style={{ color: '#2d5a27' }} />
          Fincas
        </h1>
        <button 
          className="btn btn-primary" 
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          data-testid="btn-nueva-finca"
        >
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Nueva Finca
        </button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Total Fincas</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2d5a27' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Fincas Propias</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1976d2' }}>{stats.propias}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Alquiladas</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f57c00' }}>{stats.alquiladas}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Total Hectáreas</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#388e3c' }}>{stats.total_hectareas?.toLocaleString()}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Prod. Esperada (t)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7b1fa2' }}>{stats.total_produccion_esperada?.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Formulario completo */}
      {showForm && (
        <div className="card mb-6" data-testid="form-finca">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600', margin: 0 }}>
              {editingId ? 'Editar Finca' : 'Nueva Finca'}
            </h3>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => { setShowForm(false); resetForm(); }}
            >
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Sección 1: Datos principales */}
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem' 
            }}>
              <h4 style={{ marginBottom: '1rem', color: '#2d5a27', fontWeight: '600', fontSize: '0.95rem' }}>
                Datos de la Finca
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Denominación *</label>
                  <input 
                    className="form-input" 
                    value={formData.denominacion} 
                    onChange={(e) => setFormData({...formData, denominacion: e.target.value})} 
                    required 
                    placeholder="Nombre de la finca"
                    data-testid="input-denominacion"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Provincia</label>
                  <input 
                    className="form-input" 
                    value={formData.provincia} 
                    onChange={(e) => setFormData({...formData, provincia: e.target.value})}
                    placeholder="Ej: Sevilla"
                    data-testid="input-provincia"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Población</label>
                  <input 
                    className="form-input" 
                    value={formData.poblacion} 
                    onChange={(e) => setFormData({...formData, poblacion: e.target.value})}
                    placeholder="Ej: Lebrija"
                    data-testid="input-poblacion"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Polígono</label>
                  <input 
                    className="form-input" 
                    value={formData.poligono} 
                    onChange={(e) => setFormData({...formData, poligono: e.target.value})}
                    data-testid="input-poligono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parcela</label>
                  <input 
                    className="form-input" 
                    value={formData.parcela} 
                    onChange={(e) => setFormData({...formData, parcela: e.target.value})}
                    data-testid="input-parcela"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subparcela</label>
                  <input 
                    className="form-input" 
                    value={formData.subparcela} 
                    onChange={(e) => setFormData({...formData, subparcela: e.target.value})}
                    data-testid="input-subparcela"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.finca_propia} 
                      onChange={(e) => setFormData({...formData, finca_propia: e.target.checked})}
                      style={{ width: '18px', height: '18px' }}
                      data-testid="input-finca-propia"
                    />
                    <span style={{ fontWeight: '500' }}>Finca Propia</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sección 2: Superficie y Producción */}
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem' 
            }}>
              <h4 style={{ marginBottom: '1rem', color: '#2d5a27', fontWeight: '600', fontSize: '0.95rem' }}>
                Superficie y Producción
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Hectáreas</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    className="form-input" 
                    value={formData.hectareas} 
                    onChange={(e) => setFormData({...formData, hectareas: e.target.value})}
                    data-testid="input-hectareas"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Áreas</label>
                  <input 
                    type="number" 
                    step="0.001"
                    className="form-input" 
                    value={formData.areas} 
                    onChange={(e) => setFormData({...formData, areas: e.target.value})}
                    data-testid="input-areas"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Toneladas</label>
                  <input 
                    type="number" 
                    step="0.001"
                    className="form-input" 
                    value={formData.toneladas} 
                    onChange={(e) => setFormData({...formData, toneladas: e.target.value})}
                    data-testid="input-toneladas"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Producción Esperada</label>
                  <input 
                    type="number" 
                    step="0.001"
                    className="form-input" 
                    value={formData.produccion_esperada} 
                    onChange={(e) => setFormData({...formData, produccion_esperada: e.target.value})}
                    data-testid="input-produccion-esperada"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Producción Disponible</label>
                  <input 
                    type="number" 
                    step="0.001"
                    className="form-input" 
                    value={formData.produccion_disponible} 
                    onChange={(e) => setFormData({...formData, produccion_disponible: e.target.value})}
                    data-testid="input-produccion-disponible"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Datos SIGPAC con integración */}
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #90caf9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: '#1565c0', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Map size={18} />
                  Datos SIGPAC
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ 
                      backgroundColor: '#1565c0', 
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={buscarEnSigpac}
                    disabled={sigpacLoading}
                    data-testid="btn-buscar-sigpac"
                  >
                    {sigpacLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Buscar en SIGPAC
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ 
                      backgroundColor: '#2e7d32', 
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={() => setShowDrawingMap(!showDrawingMap)}
                    data-testid="btn-dibujar-parcela"
                  >
                    <Pencil size={14} />
                    {showDrawingMap ? 'Ocultar Dibujo' : 'Dibujar Parcela'}
                  </button>
                  <a
                    href="https://sigpac.mapa.es/fega/visor/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm"
                    style={{ 
                      backgroundColor: '#fff', 
                      color: '#1565c0',
                      border: '1px solid #1565c0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={14} />
                    Visor SIGPAC
                  </a>
                </div>
              </div>
              
              {/* Mensaje de ayuda */}
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem', fontStyle: 'italic' }}>
                Introduzca los códigos SIGPAC y pulse "Buscar en SIGPAC", o use "Dibujar Parcela" para marcar manualmente los límites en el mapa.
              </p>
              
              {/* Resultado de búsqueda SIGPAC */}
              {sigpacResult && (
                <div style={{ 
                  backgroundColor: '#c8e6c9', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <CheckCircle size={20} style={{ color: '#2e7d32', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#2e7d32' }}>Parcela encontrada en SIGPAC</strong>
                      {mapData && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ 
                            backgroundColor: '#1565c0', 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => setShowMap(!showMap)}
                          data-testid="btn-toggle-map"
                        >
                          <Eye size={14} />
                          {showMap ? 'Ocultar Mapa' : 'Ver en Mapa'}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      <span style={{ marginRight: '1rem' }}>
                        <strong>Superficie:</strong> {sigpacResult.superficie_ha?.toFixed(4)} ha
                      </span>
                      <span style={{ marginRight: '1rem' }}>
                        <strong>Uso:</strong> {sigpacResult.uso_sigpac} ({getUsoDescripcion(sigpacResult.uso_sigpac)})
                      </span>
                      {sigpacResult.pendiente && (
                        <span>
                          <strong>Pendiente:</strong> {sigpacResult.pendiente}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mapa SIGPAC */}
              {showMap && mapData && (
                <div style={{ marginBottom: '1rem' }}>
                  <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Cargando mapa...</div>}>
                    <MapaSigpac
                      sigpacData={mapData.sigpac}
                      wkt={mapData.wkt}
                      centroide={mapData.centroide}
                      denominacion={formData.denominacion || mapData.denominacion}
                      onClose={() => setShowMap(false)}
                      isExpanded={mapExpanded}
                      onToggleExpand={() => setMapExpanded(!mapExpanded)}
                    />
                  </Suspense>
                </div>
              )}
              
              {/* Mapa para dibujar parcelas manualmente */}
              {showDrawingMap && (
                <div style={{ marginBottom: '1rem' }}>
                  <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Cargando mapa...</div>}>
                    <MapaSigpac
                      enableDrawing={true}
                      onGeometryChange={handleGeometryChange}
                      initialDrawnCoords={formData.geometria_manual?.coords}
                      onClose={() => setShowDrawingMap(false)}
                      isExpanded={drawingMapExpanded}
                      onToggleExpand={() => setDrawingMapExpanded(!drawingMapExpanded)}
                    />
                  </Suspense>
                </div>
              )}
              
              {/* Indicador de parcela dibujada */}
              {drawnGeometry && !showDrawingMap && (
                <div style={{ 
                  backgroundColor: '#e8f5e9', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #a5d6a7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle size={20} style={{ color: '#2e7d32' }} />
                    <div>
                      <strong style={{ color: '#2e7d32' }}>Parcela dibujada manualmente</strong>
                      <div style={{ fontSize: '0.85rem', color: '#555' }}>
                        Área calculada: <strong>{drawnGeometry.area_ha?.toFixed(4)} ha</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ backgroundColor: '#2e7d32', color: 'white' }}
                    onClick={() => setShowDrawingMap(true)}
                    data-testid="btn-editar-dibujo"
                  >
                    <Edit2 size={14} style={{ marginRight: '4px' }} />
                    Editar
                  </button>
                </div>
              )}
              
              {/* Error de búsqueda SIGPAC */}
              {sigpacError && (
                <div style={{ 
                  backgroundColor: '#ffcdd2', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <AlertCircle size={20} style={{ color: '#c62828' }} />
                  <span style={{ color: '#c62828' }}>{sigpacError}</span>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Provincia *</label>
                  <select
                    className="form-select"
                    value={formData.sigpac.provincia}
                    onChange={(e) => updateSigpac('provincia', e.target.value)}
                    data-testid="input-sigpac-provincia"
                  >
                    <option value="">Seleccionar...</option>
                    {provincias.map(p => (
                      <option key={p.codigo} value={p.codigo}>{p.codigo} - {p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Municipio *</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.municipio} 
                    onChange={(e) => updateSigpac('municipio', e.target.value)}
                    placeholder="Ej: 053"
                    data-testid="input-sigpac-municipio"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Agregado</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.cod_agregado} 
                    onChange={(e) => updateSigpac('cod_agregado', e.target.value)}
                    placeholder="0"
                    data-testid="input-sigpac-cod-agregado"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Zona</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.zona} 
                    onChange={(e) => updateSigpac('zona', e.target.value)}
                    placeholder="0"
                    data-testid="input-sigpac-zona"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Polígono *</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.poligono} 
                    onChange={(e) => updateSigpac('poligono', e.target.value)}
                    placeholder="Ej: 5"
                    data-testid="input-sigpac-poligono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parcela *</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.parcela} 
                    onChange={(e) => updateSigpac('parcela', e.target.value)}
                    placeholder="Ej: 12"
                    data-testid="input-sigpac-parcela"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Recinto</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.recinto} 
                    onChange={(e) => updateSigpac('recinto', e.target.value)}
                    placeholder="1"
                    data-testid="input-sigpac-recinto"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cod. Uso</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.cod_uso} 
                    onChange={(e) => updateSigpac('cod_uso', e.target.value)}
                    placeholder="TA"
                    data-testid="input-sigpac-cod-uso"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Recolección y Precios */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Recolección */}
              <div style={{ 
                backgroundColor: '#fff3e0', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid #ffcc80'
              }}>
                <h4 style={{ marginBottom: '1rem', color: '#e65100', fontWeight: '600', fontSize: '0.95rem' }}>
                  Recolección
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Semana</label>
                    <input 
                      type="number" 
                      min="1" max="52"
                      className="form-input" 
                      value={formData.recoleccion_semana} 
                      onChange={(e) => setFormData({...formData, recoleccion_semana: e.target.value})}
                      placeholder="1-52"
                      data-testid="input-recoleccion-semana"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Año</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={formData.recoleccion_ano} 
                      onChange={(e) => setFormData({...formData, recoleccion_ano: e.target.value})}
                      data-testid="input-recoleccion-ano"
                    />
                  </div>
                </div>
              </div>

              {/* Precios */}
              <div style={{ 
                backgroundColor: '#fce4ec', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid #f48fb1'
              }}>
                <h4 style={{ marginBottom: '1rem', color: '#c2185b', fontWeight: '600', fontSize: '0.95rem' }}>
                  Precios
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Precio Corte</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      className="form-input" 
                      value={formData.precio_corte} 
                      onChange={(e) => setFormData({...formData, precio_corte: e.target.value})}
                      data-testid="input-precio-corte"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Transporte</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      className="form-input" 
                      value={formData.precio_transporte} 
                      onChange={(e) => setFormData({...formData, precio_transporte: e.target.value})}
                      data-testid="input-precio-transporte"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prov. Corte</label>
                    <input 
                      className="form-input" 
                      value={formData.proveedor_corte} 
                      onChange={(e) => setFormData({...formData, proveedor_corte: e.target.value})}
                      data-testid="input-proveedor-corte"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Observaciones</label>
              <textarea 
                className="form-textarea" 
                value={formData.observaciones} 
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                rows={3}
                placeholder="Notas adicionales sobre la finca..."
                data-testid="input-observaciones"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-finca">
                {editingId ? 'Actualizar Finca' : 'Guardar Finca'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4" data-testid="filtros-fincas">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', margin: 0 }}>Filtros</h3>
          {hasActiveFilters && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={clearFilters}
              data-testid="btn-limpiar-filtros"
            >
              <X size={14} style={{ marginRight: '0.25rem' }} />
              Limpiar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '35px' }}
                placeholder="Nombre, provincia, población..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                data-testid="input-filtro-buscar"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Provincia</label>
            <select
              className="form-select"
              value={filters.provincia}
              onChange={(e) => setFilters({...filters, provincia: e.target.value})}
              data-testid="select-filtro-provincia"
            >
              <option value="">Todas</option>
              {filterOptions.provincias.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={filters.finca_propia}
              onChange={(e) => setFilters({...filters, finca_propia: e.target.value})}
              data-testid="select-filtro-tipo"
            >
              <option value="">Todas</option>
              <option value="true">Propias</option>
              <option value="false">Alquiladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Fincas */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} />
          Listado de Fincas ({filteredFincas.length})
        </h3>
        
        {loading ? (
          <p>Cargando...</p>
        ) : filteredFincas.length === 0 ? (
          <p className="text-muted">No hay fincas registradas</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredFincas.map((finca) => (
              <div 
                key={finca._id}
                className="card"
                style={{ 
                  padding: '1rem',
                  border: '1px solid #e0e0e0',
                  borderLeft: `4px solid ${finca.finca_propia ? '#2d5a27' : '#f57c00'}`,
                  marginBottom: 0
                }}
                data-testid={`finca-card-${finca._id}`}
              >
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Home size={20} style={{ color: '#2d5a27' }} />
                      <h4 style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>
                        {finca.denominacion || finca.nombre}
                      </h4>
                      <span style={{
                        backgroundColor: finca.finca_propia ? '#e8f5e9' : '#fff3e0',
                        color: finca.finca_propia ? '#2d5a27' : '#e65100',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {finca.finca_propia ? 'Propia' : 'Alquilada'}
                      </span>
                    </div>
                    
                    {/* Info resumida */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.9rem', color: '#555' }}>
                      {(finca.provincia || finca.poblacion) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={14} />
                          {finca.provincia}{finca.poblacion ? `, ${finca.poblacion}` : ''}
                        </div>
                      )}
                      {finca.hectareas > 0 && (
                        <div><strong>{finca.hectareas.toLocaleString()}</strong> ha</div>
                      )}
                      {finca.produccion_esperada > 0 && (
                        <div>Prod. esperada: <strong>{finca.produccion_esperada.toLocaleString()}</strong> t</div>
                      )}
                      {finca.num_parcelas > 0 && (
                        <div><strong>{finca.num_parcelas}</strong> parcelas</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Botón Ver Mapa */}
                    {finca.sigpac && finca.sigpac.provincia && finca.sigpac.poligono && (
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '6px 10px' }}
                        onClick={() => verMapaFinca(finca)}
                        title="Ver ubicación en mapa"
                        data-testid={`btn-map-${finca._id}`}
                      >
                        <Map size={14} />
                      </button>
                    )}
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '6px 10px' }}
                      onClick={() => setExpandedFinca(expandedFinca === finca._id ? null : finca._id)}
                      data-testid={`btn-expand-${finca._id}`}
                    >
                      {expandedFinca === finca._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '6px 10px' }}
                      onClick={() => handleEdit(finca)}
                      data-testid={`btn-edit-${finca._id}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '6px 10px' }}
                      onClick={() => handleDelete(finca._id)}
                      data-testid={`btn-delete-${finca._id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Detalle expandido */}
                {expandedFinca === finca._id && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      {/* Ubicación */}
                      <div>
                        <h5 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#2d5a27' }}>Ubicación</h5>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                          <div><strong>Provincia:</strong> {finca.provincia || '-'}</div>
                          <div><strong>Población:</strong> {finca.poblacion || '-'}</div>
                          <div><strong>Polígono:</strong> {finca.poligono || '-'}</div>
                          <div><strong>Parcela:</strong> {finca.parcela || '-'}</div>
                          <div><strong>Subparcela:</strong> {finca.subparcela || '-'}</div>
                        </div>
                      </div>
                      
                      {/* Superficie y Producción */}
                      <div>
                        <h5 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#388e3c' }}>Superficie y Producción</h5>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                          <div><strong>Hectáreas:</strong> {finca.hectareas?.toLocaleString() || '0'}</div>
                          <div><strong>Áreas:</strong> {finca.areas?.toLocaleString() || '0'}</div>
                          <div><strong>Toneladas:</strong> {finca.toneladas?.toLocaleString() || '0'}</div>
                          <div><strong>Prod. Esperada:</strong> {finca.produccion_esperada?.toLocaleString() || '0'}</div>
                          <div><strong>Prod. Disponible:</strong> {finca.produccion_disponible?.toLocaleString() || '0'}</div>
                        </div>
                      </div>
                      
                      {/* SIGPAC */}
                      {finca.sigpac && (
                        <div>
                          <h5 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1565c0' }}>Datos SIGPAC</h5>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <div><strong>Provincia:</strong> {finca.sigpac.provincia || '-'}</div>
                            <div><strong>Municipio:</strong> {finca.sigpac.municipio || '-'}</div>
                            <div><strong>Cod. Agregado:</strong> {finca.sigpac.cod_agregado || '-'}</div>
                            <div><strong>Zona:</strong> {finca.sigpac.zona || '-'}</div>
                            <div><strong>Polígono:</strong> {finca.sigpac.poligono || '-'}</div>
                            <div><strong>Parcela:</strong> {finca.sigpac.parcela || '-'}</div>
                            <div><strong>Recinto:</strong> {finca.sigpac.recinto || '-'}</div>
                            <div><strong>Cod. Uso:</strong> {finca.sigpac.cod_uso ? `${finca.sigpac.cod_uso} (${getUsoDescripcion(finca.sigpac.cod_uso)})` : '-'}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Recolección y Precios */}
                      <div>
                        <h5 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#e65100' }}>Recolección y Precios</h5>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                          <div><strong>Semana Recolección:</strong> {finca.recoleccion_semana || '-'}</div>
                          <div><strong>Año:</strong> {finca.recoleccion_ano || '-'}</div>
                          <div><strong>Precio Corte:</strong> {finca.precio_corte?.toLocaleString() || '0'} €</div>
                          <div><strong>Precio Transporte:</strong> {finca.precio_transporte?.toLocaleString() || '0'} €</div>
                          <div><strong>Prov. Corte:</strong> {finca.proveedor_corte || '-'}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Observaciones */}
                    {finca.observaciones && (
                      <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#555' }}>Observaciones</h5>
                        <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>{finca.observaciones}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Mapa flotante para ver fincas desde el listado */}
      {showMap && mapData && !showForm && (
        <div style={{
          position: 'fixed',
          top: mapExpanded ? 0 : '50%',
          left: mapExpanded ? 0 : '50%',
          transform: mapExpanded ? 'none' : 'translate(-50%, -50%)',
          width: mapExpanded ? '100%' : '80%',
          maxWidth: mapExpanded ? '100%' : '900px',
          height: mapExpanded ? '100%' : '500px',
          zIndex: 9999,
          boxShadow: mapExpanded ? 'none' : '0 4px 20px rgba(0,0,0,0.3)',
          borderRadius: mapExpanded ? 0 : '8px',
          overflow: 'hidden'
        }}>
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white' }}>Cargando mapa...</div>}>
            <MapaSigpac
              sigpacData={mapData.sigpac}
              wkt={mapData.wkt}
              centroide={mapData.centroide}
              denominacion={mapData.denominacion}
              onClose={() => { setShowMap(false); setMapData(null); }}
              isExpanded={mapExpanded}
              onToggleExpand={() => setMapExpanded(!mapExpanded)}
            />
          </Suspense>
        </div>
      )}
      
      {/* Overlay para el mapa flotante */}
      {showMap && mapData && !showForm && !mapExpanded && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9998
          }}
          onClick={() => { setShowMap(false); setMapData(null); }}
        />
      )}
    </div>
  );
};

export default Fincas;
