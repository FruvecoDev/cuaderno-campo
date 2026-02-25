import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, MapPin, Search, Home, ChevronDown, ChevronUp, Map, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Fincas = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedFinca, setExpandedFinca] = useState(null);
  
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
    parcelas_ids: []
  };
  
  const [formData, setFormData] = useState(emptyFormData);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchFincas();
    fetchStats();
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
        recoleccion_ano: formData.recoleccion_ano ? parseInt(formData.recoleccion_ano) : null
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
      parcelas_ids: finca.parcelas_ids || []
    });
    setEditingId(finca._id);
    setShowForm(true);
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

            {/* Sección 3: Datos SIGPAC */}
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #90caf9'
            }}>
              <h4 style={{ marginBottom: '1rem', color: '#1565c0', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Map size={18} />
                Datos SIGPAC
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Provincia</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.provincia} 
                    onChange={(e) => updateSigpac('provincia', e.target.value)}
                    data-testid="input-sigpac-provincia"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Municipio</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.municipio} 
                    onChange={(e) => updateSigpac('municipio', e.target.value)}
                    data-testid="input-sigpac-municipio"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cod. Agregado</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.cod_agregado} 
                    onChange={(e) => updateSigpac('cod_agregado', e.target.value)}
                    data-testid="input-sigpac-cod-agregado"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Zona</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.zona} 
                    onChange={(e) => updateSigpac('zona', e.target.value)}
                    data-testid="input-sigpac-zona"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Polígono</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.poligono} 
                    onChange={(e) => updateSigpac('poligono', e.target.value)}
                    data-testid="input-sigpac-poligono"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parcela</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.parcela} 
                    onChange={(e) => updateSigpac('parcela', e.target.value)}
                    data-testid="input-sigpac-parcela"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Recinto</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.recinto} 
                    onChange={(e) => updateSigpac('recinto', e.target.value)}
                    data-testid="input-sigpac-recinto"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cod. Uso</label>
                  <input 
                    className="form-input" 
                    value={formData.sigpac.cod_uso} 
                    onChange={(e) => updateSigpac('cod_uso', e.target.value)}
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
                            <div><strong>Cod. Uso:</strong> {finca.sigpac.cod_uso || '-'}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Recolección y Precios */}
                      <div>
                        <h5 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#e65100' }}>Recolección y Precios</h5>
                        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                          <div><strong>Semana Recolección:</strong> {finca.recoleccion_semana || '-'}</div>
                          <div><strong>Año:</strong> {finca.recoleccion_ano || '-'}</div>
                          <div><strong>Precio Corte:</strong> {finca.precio_corte?.toLocaleString() || '0'}</div>
                          <div><strong>Precio Transporte:</strong> {finca.precio_transporte?.toLocaleString() || '0'}</div>
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
    </div>
  );
};

export default Fincas;
