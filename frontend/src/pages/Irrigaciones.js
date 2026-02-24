import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Settings, X, Droplets } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos
const DEFAULT_FIELDS_CONFIG = {
  fecha: true,
  sistema: true,
  duracion: true,
  volumen: true,
  coste: true,
  parcela_id: true
};

const FIELD_LABELS = {
  fecha: 'Fecha',
  sistema: 'Sistema',
  duracion: 'Duración',
  volumen: 'Volumen',
  coste: 'Coste',
  parcela_id: 'Parcela'
};

const Irrigaciones = () => {
  const [irrigaciones, setIrrigaciones] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Filtros
  const [filters, setFilters] = useState({
    sistema: '',
    parcela: ''
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('irrigaciones_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones de filtros
  const [filterOptions, setFilterOptions] = useState({
    sistemas: ['Goteo', 'Aspersión', 'Inundación', 'Microaspersión'],
    parcelas: []
  });
  
  const [formData, setFormData] = useState({
    fecha: '',
    sistema: 'Goteo',
    duracion: '',
    volumen: '',
    coste: '',
    parcela_id: ''
  });
  
  useEffect(() => {
    fetchIrrigaciones();
    fetchParcelas();
  }, []);
  
  useEffect(() => {
    const parcelasCodigos = parcelas.map(p => ({ id: p._id, codigo: p.codigo_plantacion }));
    setFilterOptions(prev => ({ ...prev, parcelas: parcelasCodigos }));
  }, [parcelas]);
  
  useEffect(() => {
    localStorage.setItem('irrigaciones_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setParcelas(data.parcelas || []);
      }
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    }
  };
  
  const fetchIrrigaciones = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/irrigaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setIrrigaciones(data.irrigaciones || []);
    } catch (error) {
      console.error('Error fetching irrigaciones:', error);
      const errorMsg = handlePermissionError(error, 'ver las irrigaciones');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar irrigaciones
  const filteredIrrigaciones = irrigaciones.filter(i => {
    if (filters.sistema && i.sistema !== filters.sistema) return false;
    if (filters.parcela && i.parcela_id !== filters.parcela) return false;
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ sistema: '', parcela: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/irrigaciones/${editingId}`
        : `${BACKEND_URL}/api/irrigaciones`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        duracion: parseFloat(formData.duracion),
        volumen: parseFloat(formData.volumen),
        coste: parseFloat(formData.coste)
      };
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchIrrigaciones();
        setFormData({ fecha: '', sistema: 'Goteo', duracion: '', volumen: '', coste: '', parcela_id: '' });
      }
    } catch (error) {
      console.error('Error saving irrigacion:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la irrigación' : 'crear la irrigación');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (irrigacion) => {
    setEditingId(irrigacion._id);
    setFormData({
      fecha: irrigacion.fecha || '',
      sistema: irrigacion.sistema || 'Goteo',
      duracion: irrigacion.duracion || '',
      volumen: irrigacion.volumen || '',
      coste: irrigacion.coste || '',
      parcela_id: irrigacion.parcela_id || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ fecha: '', sistema: 'Goteo', duracion: '', volumen: '', coste: '', parcela_id: '' });
  };
  
  const handleDelete = async (irrigacionId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar irrigaciones');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta irrigación?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/irrigaciones/${irrigacionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchIrrigaciones();
    } catch (error) {
      console.error('Error deleting irrigacion:', error);
      const errorMsg = handlePermissionError(error, 'eliminar la irrigación');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const getParcelaCodigo = (parcelaId) => {
    const parcela = parcelas.find(p => p._id === parcelaId);
    return parcela ? parcela.codigo_plantacion : 'N/A';
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="irrigaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Droplets size={28} /> {t('irrigations.title')}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title={t('common.settings')}
            data-testid="btn-config-fields"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            data-testid="btn-nueva-irrigacion"
          >
            <Plus size={18} /> {t('irrigations.newIrrigation')}
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>{t('common.settings')}</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={fieldsConfig[key]} onChange={() => toggleFieldConfig(key)} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Filtros */}
      <div className="card mb-6" data-testid="filters-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> {t('common.filters')}
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>{t('common.clear')}</button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('irrigations.method')}</label>
            <select className="form-select" value={filters.sistema} onChange={(e) => setFilters({...filters, sistema: e.target.value})} data-testid="filter-sistema">
              <option value="">{t('common.all')}</option>
              {filterOptions.sistemas.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('parcels.title')}</label>
            <select className="form-select" value={filters.parcela} onChange={(e) => setFilters({...filters, parcela: e.target.value})} data-testid="filter-parcela">
              <option value="">{t('common.all')}</option>
              {filterOptions.parcelas.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredIrrigaciones.length} de {irrigaciones.length} irrigaciones
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="irrigacion-form">
          <h2 className="card-title">{editingId ? t('common.edit') + ' ' + t('irrigations.title') : t('irrigations.newIrrigation')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              {fieldsConfig.fecha && (
                <div className="form-group">
                  <label className="form-label">{t('common.date')} *</label>
                  <input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required data-testid="input-fecha" />
                </div>
              )}
              {fieldsConfig.sistema && (
                <div className="form-group">
                  <label className="form-label">{t('irrigations.method')} *</label>
                  <select className="form-select" value={formData.sistema} onChange={(e) => setFormData({...formData, sistema: e.target.value})} required data-testid="select-sistema">
                    <option value="Goteo">{t('irrigations.drip')}</option>
                    <option value="Aspersión">{t('irrigations.sprinkler')}</option>
                    <option value="Inundación">{t('irrigations.flood')}</option>
                    <option value="Microaspersión">Microaspersión</option>
                  </select>
                </div>
              )}
              {fieldsConfig.duracion && (
                <div className="form-group">
                  <label className="form-label">{t('irrigations.duration')} (h) *</label>
                  <input type="number" step="0.1" min="0" className="form-input" value={formData.duracion} onChange={(e) => setFormData({...formData, duracion: e.target.value})} required data-testid="input-duracion" />
                </div>
              )}
              {fieldsConfig.volumen && (
                <div className="form-group">
                  <label className="form-label">{t('irrigations.waterVolume')} (m³) *</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={formData.volumen} onChange={(e) => setFormData({...formData, volumen: e.target.value})} required data-testid="input-volumen" />
                </div>
              )}
              {fieldsConfig.coste && (
                <div className="form-group">
                  <label className="form-label">{t('common.price')} (€) *</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={formData.coste} onChange={(e) => setFormData({...formData, coste: e.target.value})} required data-testid="input-coste" />
                </div>
              )}
              {fieldsConfig.parcela_id && (
                <div className="form-group">
                  <label className="form-label">{t('parcels.title')}</label>
                  <select className="form-select" value={formData.parcela_id} onChange={(e) => setFormData({...formData, parcela_id: e.target.value})} data-testid="select-parcela">
                    <option value="">{t('common.selectOption')}</option>
                    {parcelas.map(p => <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">{editingId ? t('common.edit') : t('common.save')}</button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">{t('irrigations.title')} ({filteredIrrigaciones.length})</h2>
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : filteredIrrigaciones.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? t('messages.noResults') : t('common.noData')}</p>
        ) : (
          <div className="table-container">
            <table data-testid="irrigaciones-table">
              <thead>
                <tr>
                  {fieldsConfig.fecha ? <th>{t('common.date')}</th> : null}
                  {fieldsConfig.sistema ? <th>{t('irrigations.method')}</th> : null}
                  {fieldsConfig.duracion ? <th>{t('irrigations.duration')} (h)</th> : null}
                  {fieldsConfig.volumen ? <th>{t('irrigations.waterVolume')} (m³)</th> : null}
                  {fieldsConfig.coste ? <th>{t('common.price')}</th> : null}
                  {fieldsConfig.parcela_id ? <th>{t('parcels.title')}</th> : null}
                  {(canEdit || canDelete) ? <th>{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredIrrigaciones.map((irrigacion) => (
                  <tr key={irrigacion._id}>
                    {fieldsConfig.fecha ? <td>{irrigacion.fecha ? new Date(irrigacion.fecha).toLocaleDateString() : '—'}</td> : null}
                    {fieldsConfig.sistema ? <td><span className="badge badge-default">{irrigacion.sistema}</span></td> : null}
                    {fieldsConfig.duracion ? <td>{irrigacion.duracion}</td> : null}
                    {fieldsConfig.volumen ? <td>{irrigacion.volumen}</td> : null}
                    {fieldsConfig.coste ? <td>€{(irrigacion.coste || 0).toFixed(2)}</td> : null}
                    {fieldsConfig.parcela_id ? <td>{getParcelaCodigo(irrigacion.parcela_id)}</td> : null}
                    {(canEdit || canDelete) ? (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(irrigacion)} title="Editar" data-testid={`edit-irrigacion-${irrigacion._id}`}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-error" onClick={() => handleDelete(irrigacion._id)} title="Eliminar" data-testid={`delete-irrigacion-${irrigacion._id}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
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

export default Irrigaciones;
