import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Download, Settings, X, Filter, CheckCircle, Wrench, AlertTriangle, Cog, Eye, Upload, Trash2 } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useBulkSelect, BulkActionBar, bulkDeleteApi } from '../components/BulkActions';
import { useAuth } from '../contexts/AuthContext';
import MaquinariaTable from '../components/maquinaria/MaquinariaTable';
import MaquinariaForm from '../components/maquinaria/MaquinariaForm';
import MaquinariaHistorial from '../components/maquinaria/MaquinariaHistorial';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import '../App.css';

const DEFAULT_FIELDS_CONFIG = {
  nombre: true, tipo: true, marca: true, modelo: true, matricula: true,
  num_serie: false, año_fabricacion: true, capacidad: false, estado: true,
  observaciones: false, imagen_placa_ce: true,
};

const FIELD_LABELS = {
  marca: 'Marca', modelo: 'Modelo', matricula: 'Matricula',
  num_serie: 'N Serie', año_fabricacion: 'Ano Fabricacion', capacidad: 'Capacidad',
  estado: 'Estado', observaciones: 'Observaciones', imagen_placa_ce: 'Imagen Placa CE',
};

const DEFAULT_COLUMNS = [
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'marca', label: 'Marca', visible: true },
  { id: 'modelo', label: 'Modelo', visible: true },
  { id: 'matricula', label: 'Matricula', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
  { id: 'imagen_placa_ce', label: 'Placa CE', visible: true },
];

const TIPOS_MAQUINARIA = [
  'Tractor', 'Cuba de tratamiento', 'Pulverizador', 'Segadora', 'Cosechadora',
  'Arado', 'Sembradora', 'Remolque', 'Desbrozadora', 'Motobomba',
  'Apero', 'Vehiculo', 'Otro',
];

const ESTADOS_MAQUINARIA = ['Operativo', 'En mantenimiento', 'Averiado', 'Fuera de servicio', 'En revision'];


const Maquinaria = () => {
  const { t } = useTranslation();
  const [maquinaria, setMaquinaria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [maqModalTab, setMaqModalTab] = useState('general');
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete, canBulkDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('maquinaria_col_config', DEFAULT_COLUMNS);

  const [stats, setStats] = useState(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [selectedMaquinaria, setSelectedMaquinaria] = useState(null);
  const [historialData, setHistorialData] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [filters, setFilters] = useState({ tipo: '', estado: '' });
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('maquinaria_fields_config');
    return saved ? { ...DEFAULT_FIELDS_CONFIG, ...JSON.parse(saved) } : DEFAULT_FIELDS_CONFIG;
  });
  const [formData, setFormData] = useState({
    nombre: '', tipo: 'Tractor', marca: '', modelo: '', matricula: '',
    num_serie: '', año_fabricacion: '', capacidad: '', estado: 'Operativo', observaciones: '',
    fecha_proxima_itv: '', fecha_ultimo_mantenimiento: '', intervalo_mantenimiento_dias: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => { fetchMaquinaria(); fetchStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { localStorage.setItem('maquinaria_fields_config', JSON.stringify(fieldsConfig)); }, [fieldsConfig]);

  const fetchMaquinaria = async () => {
    try { setError(null); const data = await api.get('/api/maquinaria'); setMaquinaria(data.maquinaria || []); }
    catch (error) { const msg = handlePermissionError(error, 'ver la maquinaria'); setError(msg); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try { const data = await api.get('/api/maquinaria/stats/resumen'); setStats(data.stats); }
    catch (err) { }
  };

  const handleExportExcel = async () => {
    try { const params = filters.estado ? `?estado=${filters.estado}` : ''; await api.download(`/api/maquinaria/export/excel${params}`, `maquinaria_${new Date().toISOString().split('T')[0]}.xlsx`); }
    catch (err) { }
  };

  const handleVerHistorial = async (item) => {
    setSelectedMaquinaria(item); setShowHistorial(true); setLoadingHistorial(true);
    try { const data = await api.get(`/api/maquinaria/${item._id}/historial`); setHistorialData(data.historial); }
    catch (err) { setError('Error al cargar historial'); setTimeout(() => setError(null), 5000); }
    finally { setLoadingHistorial(false); }
  };

  const filteredMaquinaria = maquinaria.filter(m => {
    if (filters.tipo && m.tipo !== filters.tipo) return false;
    if (filters.estado && m.estado !== filters.estado) return false;
    return true;
  });

  const clearFilters = () => setFilters({ tipo: '', estado: '' });
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const tiposUnicos = [...new Set(maquinaria.map(m => m.tipo).filter(Boolean))];
  const estadosUnicos = [...new Set(maquinaria.map(m => m.estado).filter(Boolean))];

  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(filteredMaquinaria);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try { await bulkDeleteApi('maquinaria', selectedIds); clearSelection(); fetchMaquinaria(); } catch (e) {} finally { setBulkDeleting(false); }
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Operativo': return 'badge-success';
      case 'En mantenimiento': return 'badge-warning';
      case 'Averiado': return 'badge-error';
      default: return 'badge-default';
    }
  };

  const validateAndSetImage = (file) => {
    if (!file) return false;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { setError('Tipo no permitido. Use JPEG, PNG o WEBP'); setTimeout(() => setError(null), 5000); return false; }
    if (file.size > 10 * 1024 * 1024) { setError('Archivo excede 10MB'); setTimeout(() => setError(null), 5000); return false; }
    setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); return true;
  };

  const handleImageSelect = (e) => { const file = e.target.files[0]; validateAndSetImage(file); };

  const uploadImage = async (maquinariaId) => {
    if (!selectedImage) return;
    setUploadingImage(true);
    try { const fd = new FormData(); fd.append('file', selectedImage); await api.upload(`/api/maquinaria/${maquinariaId}/imagen-placa-ce`, fd); }
    catch (error) { setError('Error al subir imagen'); setTimeout(() => setError(null), 5000); }
    finally { setUploadingImage(false); }
  };

  const deleteImage = async (maquinariaId) => {
    if (!window.confirm('Eliminar la imagen de la placa CE?')) return;
    try { await api.delete(`/api/maquinaria/${maquinariaId}/imagen-placa-ce`); fetchMaquinaria(); }
    catch (error) { setError('Error al eliminar imagen'); setTimeout(() => setError(null), 5000); }
  };

  const viewImage = (item) => {
    let url = item.imagen_placa_ce_url;
    if (url) {
      if (url.startsWith('/api/uploads/')) url = `${BACKEND_URL}${url}`;
      else if (url.startsWith('/app/uploads/')) url = `${BACKEND_URL}/api/uploads${url.replace('/app/uploads', '')}`;
    } else { url = `${BACKEND_URL}/api/maquinaria/${item._id}/imagen-placa-ce`; }
    setModalImageUrl(url); setShowImageModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { setError('El nombre es obligatorio'); setTimeout(() => setError(null), 5000); return; }
    try {
      setError(null);
      const payload = { ...formData, año_fabricacion: formData.año_fabricacion ? parseInt(formData.año_fabricacion) : null, intervalo_mantenimiento_dias: formData.intervalo_mantenimiento_dias ? parseInt(formData.intervalo_mantenimiento_dias) : null };
      let data;
      if (editingId) { data = await api.put(`/api/maquinaria/${editingId}`, payload); }
      else { data = await api.post('/api/maquinaria', payload); }
      if (data.success) {
        const mid = data.data._id || editingId;
        if (selectedImage && mid) await uploadImage(mid);
        setShowForm(false); setEditingId(null); fetchMaquinaria(); resetForm();
      }
    } catch (error) { const msg = handlePermissionError(error, editingId ? 'actualizar' : 'crear'); setError(msg); setTimeout(() => setError(null), 5000); }
  };

  const resetForm = () => {
    setFormData({ nombre: '', tipo: 'Tractor', marca: '', modelo: '', matricula: '', num_serie: '', año_fabricacion: '', capacidad: '', estado: 'Operativo', observaciones: '', fecha_proxima_itv: '', fecha_ultimo_mantenimiento: '', intervalo_mantenimiento_dias: '' });
    setSelectedImage(null); setImagePreview(null);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({ nombre: item.nombre || '', tipo: item.tipo || 'Tractor', marca: item.marca || '', modelo: item.modelo || '', matricula: item.matricula || '', num_serie: item.num_serie || '', año_fabricacion: item.año_fabricacion || '', capacidad: item.capacidad || '', estado: item.estado || 'Operativo', observaciones: item.observaciones || '', fecha_proxima_itv: item.fecha_proxima_itv || '', fecha_ultimo_mantenimiento: item.fecha_ultimo_mantenimiento || '', intervalo_mantenimiento_dias: item.intervalo_mantenimiento_dias || '' });
    if (item.imagen_placa_ce_url) {
      let url = item.imagen_placa_ce_url;
      if (url.startsWith('/api/uploads/')) url = `${BACKEND_URL}${url}`;
      else if (url.startsWith('/app/uploads/')) url = `${BACKEND_URL}/api/uploads${url.replace('/app/uploads', '')}`;
      setImagePreview(url);
    } else { setImagePreview(null); }
    setSelectedImage(null); setShowForm(true); setMaqModalTab('general');
  };

  const handleDelete = async (id) => {
    if (!canDelete) { setError('No tienes permisos'); setTimeout(() => setError(null), 5000); return; }
    if (!window.confirm('Eliminar esta maquinaria?')) return;
    try { setError(null); await api.delete(`/api/maquinaria/${id}`); fetchMaquinaria(); }
    catch (error) { const msg = handlePermissionError(error, 'eliminar'); setError(msg); setTimeout(() => setError(null), 5000); }
  };

  return (
    <div data-testid="maquinaria-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Maquinaria</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleExportExcel} title="Exportar a Excel" data-testid="btn-export-excel-maquinaria"><Download size={18} /> Excel</button>
          <button className="btn btn-secondary" data-testid="btn-export-pdf-maquinaria"
            onClick={async () => { try { await api.download('/api/maquinaria/export/pdf', `maquinaria_${new Date().toISOString().split('T')[0]}.pdf`); } catch (err) { } }}
            title="Exportar a PDF"><Download size={18} /> PDF</button>
          <button className="btn btn-secondary" onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-maquinaria"><Settings size={18} /></button>
          <button className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFieldsConfig(!showFieldsConfig)} title="Configurar campos formulario" data-testid="btn-config-fields"><Filter size={18} /></button>
          <PermissionButton permission="create" onClick={() => { resetForm(); setMaqModalTab('general'); setShowForm(true); }} className="btn btn-primary" data-testid="btn-nueva-maquinaria"><Plus size={18} /> Nueva Maquinaria</PermissionButton>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}><Cog size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(var(--primary))' }} /><div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.total}</div><div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Maquinaria</div></div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}><CheckCircle size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(142 76% 36%)' }} /><div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.activa}</div><div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Activa</div></div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}><Wrench size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(38 92% 50%)' }} /><div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.en_mantenimiento}</div><div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>En Mantenimiento</div></div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}><AlertTriangle size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(0 84% 60%)' }} /><div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.con_itv_vencida || 0}</div><div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>ITV Vencida</div></div>
        </div>
      )}

      {error && <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}><p style={{ color: 'hsl(var(--destructive))' }}>{error}</p></div>}

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {/* Fields Config Panel */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Campos del Formulario</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={fieldsConfig[key]} onChange={() => setFieldsConfig(prev => ({...prev, [key]: !prev[key]}))} disabled={key === 'nombre' || key === 'tipo'} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontSize: '0.875rem' }}>{label} {(key === 'nombre' || key === 'tipo') && '(obligatorio)'}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6" data-testid="filters-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={18} /> Filtros</h3>
          {hasActiveFilters && <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Limpiar</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select className="form-select" value={filters.tipo} onChange={(e) => setFilters({...filters, tipo: e.target.value})} data-testid="filter-tipo">
              <option value="">Todos</option>
              {(tiposUnicos.length > 0 ? tiposUnicos : TIPOS_MAQUINARIA).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select className="form-select" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})} data-testid="filter-estado">
              <option value="">Todos</option>
              {(estadosUnicos.length > 0 ? estadosUnicos : ESTADOS_MAQUINARIA).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        {hasActiveFilters && <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Mostrando {filteredMaquinaria.length} de {maquinaria.length}</p>}
      </div>

      {/* Form - Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => { setEditingId(null); setShowForm(false); resetForm(); }}>
          <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()} data-testid="maquinaria-form">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Cog size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
                <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nueva'} Maquinaria</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{formData.nombre || 'Sin nombre'} {formData.marca && `- ${formData.marca}`}</span></div>
              </div>
              <button onClick={() => { setEditingId(null); setShowForm(false); resetForm(); }} className="config-modal-close-btn"><X size={18} /></button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'general', label: 'Datos Generales', icon: <Cog size={14} /> },
                { key: 'mantenimiento', label: 'ITV y Mantenimiento', icon: <Wrench size={14} /> },
                { key: 'imagen', label: 'Placa CE', icon: <Eye size={14} /> }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setMaqModalTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: maqModalTab === tab.key ? '700' : '500', color: maqModalTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: maqModalTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
              {maqModalTab === 'general' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificacion</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre *</label><input type="text" className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required placeholder="Ej: Tractor principal" data-testid="input-nombre" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tipo *</label><select className="form-select" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} required data-testid="select-tipo">{TIPOS_MAQUINARIA.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Estado</label><select className="form-select" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} data-testid="select-estado">{ESTADOS_MAQUINARIA.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Especificaciones</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Marca</label><input type="text" className="form-input" value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} placeholder="Ej: John Deere" data-testid="input-marca" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Modelo</label><input type="text" className="form-input" value={formData.modelo} onChange={(e) => setFormData({...formData, modelo: e.target.value})} placeholder="Ej: 6150M" data-testid="input-modelo" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Matricula</label><input type="text" className="form-input" value={formData.matricula} onChange={(e) => setFormData({...formData, matricula: e.target.value})} placeholder="Ej: 1234-ABC" data-testid="input-matricula" /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>N. Serie</label><input type="text" className="form-input" value={formData.num_serie} onChange={(e) => setFormData({...formData, num_serie: e.target.value})} data-testid="input-num-serie" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Ano Fabricacion</label><input type="number" min="1900" max={new Date().getFullYear() + 1} className="form-input" value={formData.año_fabricacion} onChange={(e) => setFormData({...formData, año_fabricacion: e.target.value})} placeholder="2020" data-testid="input-año" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Capacidad</label><input type="text" className="form-input" value={formData.capacidad} onChange={(e) => setFormData({...formData, capacidad: e.target.value})} placeholder="Ej: 1000L, 150CV" data-testid="input-capacidad" /></div>
                  </div>
                </div>
                <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="2" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} style={{ fontSize: '0.85rem', resize: 'vertical' }} data-testid="textarea-observaciones" /></div>
              </div>)}

              {maqModalTab === 'mantenimiento' && (<div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>ITV y Mantenimiento</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Proxima ITV</label><input type="date" className="form-input" value={formData.fecha_proxima_itv || ''} onChange={(e) => setFormData({...formData, fecha_proxima_itv: e.target.value})} data-testid="input-fecha-itv" /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Ultimo Mantenimiento</label><input type="date" className="form-input" value={formData.fecha_ultimo_mantenimiento || ''} onChange={(e) => setFormData({...formData, fecha_ultimo_mantenimiento: e.target.value})} data-testid="input-fecha-mantenimiento" /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Intervalo Mantenimiento (dias)</label><input type="number" min="1" className="form-input" value={formData.intervalo_mantenimiento_dias || ''} onChange={(e) => setFormData({...formData, intervalo_mantenimiento_dias: e.target.value ? parseInt(e.target.value) : ''})} placeholder="Ej: 180" data-testid="input-intervalo-mantenimiento" /></div>
                </div>
              </div>)}

              {maqModalTab === 'imagen' && (<div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Imagen Placa CE</h3>
                <div
                  style={{ border: isDragging ? '2px solid hsl(var(--primary))' : '2px dashed hsl(var(--border))', borderRadius: '8px', padding: '1.5rem', backgroundColor: isDragging ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)', transition: 'all 0.2s ease', textAlign: 'center' }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageSelect({ target: { files: e.dataTransfer.files } }); }}
                >
                  {imagePreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <img src={imagePreview} alt="Placa CE" style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}><Upload size={14} /> Cambiar<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{ display: 'none' }} /></label>
                        {selectedImage && <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setSelectedImage(null); setImagePreview(null); }}><X size={14} /> Quitar</button>}
                        {editingId && !selectedImage && <button type="button" className="btn btn-sm btn-error" onClick={() => deleteImage(editingId)}><Trash2 size={14} /> Eliminar</button>}
                      </div>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '2rem' }}>
                      <Upload size={40} style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.5 }} />
                      <span style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>Arrastra una imagen o haz clic para seleccionar</span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>JPEG, PNG o WEBP (max. 10MB)</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{ display: 'none' }} data-testid="input-imagen-placa" />
                    </label>
                  )}
                </div>
              </div>)}

              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setShowForm(false); resetForm(); }}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={uploadingImage} data-testid="btn-guardar">{uploadingImage ? 'Subiendo...' : (editingId ? 'Actualizar' : 'Crear')} Maquinaria</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowImageModal(false)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', backgroundColor: 'white', borderRadius: '8px', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowImageModal(false)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'hsl(var(--destructive))', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            <img src={`${modalImageUrl}?t=${Date.now()}`} alt="Placa CE" style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain' }} onError={(e) => { e.target.src = ''; setError('No se pudo cargar la imagen'); setShowImageModal(false); }} />
          </div>
        </div>
      )}

      {/* Table */}
      <MaquinariaTable
        maquinaria={filteredMaquinaria} loading={loading} hasActiveFilters={hasActiveFilters}
        visibleColumns={visibleColumns} canEdit={canEdit} canDelete={canDelete}
        getEstadoBadgeClass={getEstadoBadgeClass} onViewImage={viewImage}
        onViewHistorial={handleVerHistorial} onEdit={handleEdit} onDelete={handleDelete}
        canBulkDelete={canBulkDelete} selectedIds={selectedIds} toggleOne={toggleOne}
        toggleAll={toggleAll} allSelected={allSelected} someSelected={someSelected}
        clearSelection={clearSelection} bulkDeleting={bulkDeleting} handleBulkDelete={handleBulkDelete}
      />

      {/* Historial Modal */}
      {showHistorial && selectedMaquinaria && (
        <MaquinariaHistorial
          selectedMaquinaria={selectedMaquinaria} historialData={historialData}
          loadingHistorial={loadingHistorial} onClose={() => setShowHistorial(false)}
        />
      )}
    </div>
  );
};

export default Maquinaria;
