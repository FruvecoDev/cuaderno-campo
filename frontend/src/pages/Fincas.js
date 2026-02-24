import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, X, MapPin, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Fincas = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    nombre: '',
    campana: '',
    provincia: ''
  });
  
  const [formData, setFormData] = useState({
    campana: '2025/26',
    nombre: '',
    superficie_total: '',
    num_plantas: '',
    provincia: '',
    poblacion: '',
    observaciones: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchFincas();
  }, []);

  const fetchFincas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/fincas`, { headers });
      const data = await res.json();
      setFincas(data.fincas || []);
    } catch (err) {
      console.error('Error fetching fincas:', err);
    }
    setLoading(false);
  };

  // Filtrar fincas
  const filteredFincas = useMemo(() => {
    return fincas.filter(f => {
      if (filters.nombre && !f.nombre?.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
      if (filters.campana && f.campana !== filters.campana) return false;
      if (filters.provincia && !f.provincia?.toLowerCase().includes(filters.provincia.toLowerCase())) return false;
      return true;
    });
  }, [fincas, filters]);

  // Opciones de filtros
  const filterOptions = useMemo(() => ({
    campanas: [...new Set(fincas.map(f => f.campana).filter(Boolean))],
    provincias: [...new Set(fincas.map(f => f.provincia).filter(Boolean))]
  }), [fincas]);

  // Totales
  const totals = useMemo(() => ({
    superficie: filteredFincas.reduce((sum, f) => sum + (f.superficie_total || 0), 0),
    plantas: filteredFincas.reduce((sum, f) => sum + (f.num_plantas || 0), 0)
  }), [filteredFincas]);

  const resetForm = () => {
    setFormData({
      campana: '2025/26',
      nombre: '',
      superficie_total: '',
      num_plantas: '',
      provincia: '',
      poblacion: '',
      observaciones: ''
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/fincas/${editingId}`
        : `${BACKEND_URL}/api/fincas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          ...formData,
          superficie_total: parseFloat(formData.superficie_total),
          num_plantas: parseInt(formData.num_plantas)
        })
      });
      
      setShowForm(false);
      resetForm();
      fetchFincas();
    } catch (err) {
      console.error('Error saving finca:', err);
    }
  };

  const handleEdit = (finca) => {
    setFormData({
      campana: finca.campana || '2025/26',
      nombre: finca.nombre || '',
      superficie_total: finca.superficie_total || '',
      num_plantas: finca.num_plantas || '',
      provincia: finca.provincia || '',
      poblacion: finca.poblacion || '',
      observaciones: finca.observaciones || ''
    });
    setEditingId(finca._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta finca?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/fincas/${id}`, {
        method: 'DELETE',
        headers
      });
      fetchFincas();
    } catch (err) {
      console.error('Error deleting finca:', err);
    }
  };

  const clearFilters = () => {
    setFilters({ nombre: '', campana: '', provincia: '' });
  };

  const hasActiveFilters = filters.nombre || filters.campana || filters.provincia;

  return (
    <div data-testid="fincas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('farms.title')}</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          data-testid="btn-nueva-finca"
        >
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          {t('farms.newFarm')}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="form-finca">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600', margin: 0 }}>
              {editingId ? t('common.edit') + ' ' + t('farms.title') : t('farms.newFarm')}
            </h3>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => { setShowForm(false); resetForm(); }}
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t('farms.farmName')} *</label>
                <input 
                  className="form-input" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                  required 
                  data-testid="input-nombre"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('contracts.campaign')} *</label>
                <input 
                  className="form-input" 
                  value={formData.campana} 
                  onChange={(e) => setFormData({...formData, campana: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('parcels.surface')} ({t('units.hectares')}) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  value={formData.superficie_total} 
                  onChange={(e) => setFormData({...formData, superficie_total: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('parcels.parcelsCount')} *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.num_plantas} 
                  onChange={(e) => setFormData({...formData, num_plantas: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Provincia</label>
                <input 
                  className="form-input" 
                  value={formData.provincia} 
                  onChange={(e) => setFormData({...formData, provincia: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Población</label>
                <input 
                  className="form-input" 
                  value={formData.poblacion} 
                  onChange={(e) => setFormData({...formData, poblacion: e.target.value})} 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea 
                className="form-textarea" 
                value={formData.observaciones} 
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingId ? t('common.edit') : t('common.save')}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4" data-testid="filtros-fincas">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', margin: 0 }}>{t('common.filters')}</h3>
          {hasActiveFilters && (
            <button 
              className="btn btn-sm btn-secondary"
              onClick={clearFilters}
              data-testid="btn-limpiar-filtros"
            >
              <X size={14} style={{ marginRight: '0.25rem' }} />
              {t('common.clear')}
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('common.search')}</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '35px' }}
                placeholder="Nombre de finca..."
                value={filters.nombre}
                onChange={(e) => setFilters({...filters, nombre: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('contracts.campaign')}</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
            >
              <option value="">{t('common.all')}</option>
              {filterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Provincia</label>
            <select
              className="form-select"
              value={filters.provincia}
              onChange={(e) => setFilters({...filters, provincia: e.target.value})}
            >
              <option value="">Todas</option>
              {filterOptions.provincias.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1rem', 
        marginBottom: '1rem' 
      }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>{t('common.total')} {t('farms.title')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
            {filteredFincas.length}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>{t('farms.totalSurface')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
            {totals.superficie.toLocaleString()} {t('units.hectares')}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>{t('common.total')} {t('parcels.parcelsCount')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
            {totals.plantas.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          {t('farms.title')} ({filteredFincas.length})
        </h3>
        
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : filteredFincas.length === 0 ? (
          <p className="text-muted">{t('common.noData')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('farms.farmName')}</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>{t('contracts.campaign')}</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>{t('parcels.surface')}</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>{t('parcels.parcelsCount')}</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>{t('parcels.location')}</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFincas.map((finca, idx) => (
                  <tr 
                    key={finca._id}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa'
                    }}
                    data-testid={`finca-row-${finca._id}`}
                  >
                    <td style={{ padding: '12px', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} style={{ color: '#2d5a27' }} />
                        {finca.nombre}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: '#e8f5e9',
                        color: '#2d5a27',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}>
                        {finca.campana}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                      {finca.superficie_total?.toLocaleString()} ha
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {finca.num_plantas?.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', color: '#6c757d' }}>
                      {finca.provincia}{finca.poblacion ? ` - ${finca.poblacion}` : ''}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fincas;
