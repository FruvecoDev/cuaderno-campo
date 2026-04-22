import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, Settings, X, Download, Leaf, Eye, Droplets, Thermometer, Sprout } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
import { useAuth } from '../contexts/AuthContext';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import '../App.css';

const DEFAULT_COLUMNS = [
  { id: 'codigo_cultivo', label: 'ID', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'variedad', label: 'Variedad', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'unidad_medida', label: 'Unidad Medida', visible: true },
  { id: 'ciclo', label: 'Ciclo', visible: true },
  { id: 'temporada', label: 'Temporada', visible: false },
  { id: 'familia_botanica', label: 'Familia Botanica', visible: false },
  { id: 'estado', label: 'Estado', visible: true },
];

const Cultivos = () => {
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [tiposCultivo, setTiposCultivo] = useState([]);
  const [showTiposManager, setShowTiposManager] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [changelog, setChangelog] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const { t } = useTranslation();
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete, canBulkDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('cultivos_col_config', DEFAULT_COLUMNS);
  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(filteredCultivos);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const handleBulkDelete = async () => {
    if (!window.confirm(`Eliminar ${selectedIds.size} cultivo${selectedIds.size > 1 ? 's' : ''} seleccionado${selectedIds.size > 1 ? 's' : ''}?`)) return;
    setBulkDeleting(true);
    try { await bulkDeleteApi('cultivos', selectedIds); clearSelection(); fetchCultivos(); } catch (e) {} finally { setBulkDeleting(false); }
  };

  const initialFormData = {
    nombre: '',
    variedad: '',
    tipo: '',
    unidad_medida: 'kg',
    ciclo_cultivo: '',
    temporada: '',
    familia_botanica: '',
    nombre_cientifico: '',
    marco_plantacion: '',
    densidad_plantacion: '',
    profundidad_siembra: '',
    necesidades_riego: '',
    temperatura_optima: '',
    ph_suelo: '',
    observaciones: '',
    activo: true
  };
  
  const [formData, setFormData] = useState(initialFormData);

  const nextCodigo = (() => {
    if (!cultivos.length) return '000001';
    const maxCode = Math.max(...cultivos.map(c => parseInt(c.codigo_cultivo || '0', 10)));
    return String(maxCode + 1).padStart(6, '0');
  })();

  useEffect(() => {
    fetchCultivos();
    fetchTiposCultivo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCultivos = async () => {
    try {
      setError(null);
      const data = await api.get('/api/cultivos');
      setCultivos(data.cultivos || []);
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'ver los cultivos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiposCultivo = async () => {
    try {
      const data = await api.get('/api/tipos-cultivo');
      setTiposCultivo(data.tipos || []);
    } catch (error) {}
  };

  const handleAddTipo = async () => {
    if (!nuevoTipo.trim()) return;
    try {
      await api.post('/api/tipos-cultivo', { nombre: nuevoTipo.trim() });
      setNuevoTipo('');
      fetchTiposCultivo();
    } catch (error) {}
  };

  const handleDeleteTipo = async (tipoId) => {
    try {
      await api.delete(`/api/tipos-cultivo/${tipoId}`);
      fetchTiposCultivo();
    } catch (error) {}
  };

  const fetchChangelog = async (cultivoId) => {
    try {
      const data = await api.get(`/api/cultivos/${cultivoId}/changelog`);
      setChangelog(data.changelog || []);
    } catch (error) { setChangelog([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await api.put(`/api/cultivos/${editingId}`, formData);
      } else {
        await api.post('/api/cultivos', formData);
      }
      setShowForm(false);
      setEditingId(null);
      fetchCultivos();
      setFormData(initialFormData);
    } catch (error) {
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el cultivo' : 'crear el cultivo');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (cultivo) => {
    setFormData({
      nombre: cultivo.nombre || '',
      variedad: cultivo.variedad || '',
      tipo: cultivo.tipo || '',
      unidad_medida: cultivo.unidad_medida || 'kg',
      ciclo_cultivo: cultivo.ciclo_cultivo || '',
      temporada: cultivo.temporada || '',
      familia_botanica: cultivo.familia_botanica || '',
      nombre_cientifico: cultivo.nombre_cientifico || '',
      marco_plantacion: cultivo.marco_plantacion || '',
      densidad_plantacion: cultivo.densidad_plantacion || '',
      profundidad_siembra: cultivo.profundidad_siembra || '',
      necesidades_riego: cultivo.necesidades_riego || '',
      temperatura_optima: cultivo.temperatura_optima || '',
      ph_suelo: cultivo.ph_suelo || '',
      observaciones: cultivo.observaciones || '',
      activo: cultivo.activo !== false,
    });
    setEditingId(cultivo._id);
    setActiveTab('general');
    setShowForm(true);
  };

  const handleDelete = async (cultivoId) => {
    if (!window.confirm('Estas seguro de que quieres eliminar este cultivo?')) return;
    try {
      setError(null);
      await api.delete(`/api/cultivos/${cultivoId}`);
      fetchCultivos();
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'eliminar el cultivo');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setActiveTab('general');
  };

  const filteredCultivos = cultivos.filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.variedad && c.variedad.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && c.activo !== false) ||
      (filtroEstado === 'inactivos' && c.activo === false);
    return matchesSearch && matchesEstado;
  });

  return (
    <div data-testid="cultivos-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Cultivos</h1>
          <p className="text-muted">Gestiona el catalogo de cultivos y variedades</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-cultivos"><Settings size={18} /></button>
          <PermissionButton
            permission="create"
            onClick={() => { setFormData(initialFormData); setEditingId(null); setShowForm(true); }}
            className="btn btn-primary"
            data-testid="btn-nuevo-cultivo"
          >
            <Plus size={18} />
            Nuevo Cultivo
          </PermissionButton>
        </div>
      </div>
      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {/* Professional Tabbed Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(142 76% 36% / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Leaf size={20} style={{ color: 'hsl(142 76% 36%)' }} /></div>
                <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Cultivo</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>ID: {formData.codigo_cultivo || nextCodigo}</span></div>
              </div>
              <button onClick={closeModal} className="config-modal-close-btn"><X size={18} /></button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'general', label: 'Datos Generales', icon: <Leaf size={14} /> },
                { key: 'tecnico', label: 'Detalles Tecnicos', icon: <Sprout size={14} /> },
                { key: 'historial', label: 'Historial', icon: <Eye size={14} /> }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); if (tab.key === 'historial' && editingId) fetchChangelog(editingId); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
              {activeTab === 'general' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificacion</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 200px', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>ID Cultivo</label><input type="text" className="form-input" value={formData.codigo_cultivo || nextCodigo} disabled style={{ backgroundColor: 'hsl(var(--muted))', textAlign: 'center' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre *</label><input type="text" className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required data-testid="input-nombre-cultivo" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>Tipo <button type="button" onClick={() => setShowTiposManager(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', padding: 0 }} title="Gestionar tipos"><Settings size={12} /></button></label><select className="form-input" value={formData.tipo || ''} onChange={e => setFormData({ ...formData, tipo: e.target.value })} data-testid="select-tipo-cultivo"><option value="">-- Tipo --</option>{tiposCultivo.map(t => <option key={t._id} value={t.nombre}>{t.nombre}</option>)}</select></div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Caracteristicas</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Variedad</label><input type="text" className="form-input" placeholder="Ej: RAF, Piquillo, Galia" value={formData.variedad} onChange={e => setFormData({ ...formData, variedad: e.target.value })} data-testid="input-variedad-cultivo" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Unidad de Medida</label><select className="form-input" value={formData.unidad_medida} onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })}><option value="kg">Kilogramos (kg)</option><option value="toneladas">Toneladas (t)</option><option value="unidades">Unidades</option><option value="cajas">Cajas</option></select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Ciclo de Cultivo</label><select className="form-input" value={formData.ciclo_cultivo} onChange={e => setFormData({ ...formData, ciclo_cultivo: e.target.value })}><option value="">Seleccionar...</option><option value="Corto">Corto (3-4 meses)</option><option value="Medio">Medio (5-6 meses)</option><option value="Largo">Largo (7+ meses)</option></select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Temporada</label><select className="form-input" value={formData.temporada || ''} onChange={e => setFormData({ ...formData, temporada: e.target.value })}><option value="">Seleccionar...</option><option value="Primavera-Verano">Primavera-Verano</option><option value="Otono-Invierno">Otono-Invierno</option><option value="Todo el ano">Todo el ano</option></select></div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1.25rem', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="2" value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} style={{ fontSize: '0.85rem', resize: 'vertical' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre Cientifico</label><input type="text" className="form-input" placeholder="Ej: Solanum lycopersicum" value={formData.nombre_cientifico || ''} onChange={e => setFormData({ ...formData, nombre_cientifico: e.target.value })} style={{ fontSize: '0.85rem' }} /></div>
                  <div style={{ paddingTop: '1.5rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.activo ? 'hsl(142 76% 36%/0.1)' : 'hsl(var(--muted))', border: '1px solid ' + (formData.activo ? 'hsl(142 76% 36%/0.3)' : 'hsl(var(--border))') }}><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} style={{ width: '16px', height: '16px' }} /><span style={{ fontWeight: '600', fontSize: '0.85rem', color: formData.activo ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))' }}>{formData.activo ? 'Activo' : 'Inactivo'}</span></label></div>
                </div>
              </div>)}
              {activeTab === 'tecnico' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Clasificacion Botanica</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Familia Botanica</label><input type="text" className="form-input" placeholder="Ej: Solanaceae, Cucurbitaceae" value={formData.familia_botanica || ''} onChange={e => setFormData({ ...formData, familia_botanica: e.target.value })} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre Cientifico</label><input type="text" className="form-input" placeholder="Ej: Solanum lycopersicum" value={formData.nombre_cientifico || ''} onChange={e => setFormData({ ...formData, nombre_cientifico: e.target.value })} /></div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Parametros de Plantacion</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Marco de Plantacion</label><input type="text" className="form-input" placeholder="Ej: 1.5m x 0.5m" value={formData.marco_plantacion || ''} onChange={e => setFormData({ ...formData, marco_plantacion: e.target.value })} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Densidad Plantacion</label><input type="text" className="form-input" placeholder="Ej: 13.300 plantas/ha" value={formData.densidad_plantacion || ''} onChange={e => setFormData({ ...formData, densidad_plantacion: e.target.value })} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Profundidad de Siembra</label><input type="text" className="form-input" placeholder="Ej: 2-3 cm" value={formData.profundidad_siembra || ''} onChange={e => setFormData({ ...formData, profundidad_siembra: e.target.value })} /></div>
                  </div>
                </div>
                <div style={{ background: 'hsl(var(--muted)/0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Condiciones de Cultivo</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Droplets size={12} /> Necesidades de Riego</label><select className="form-input" value={formData.necesidades_riego || ''} onChange={e => setFormData({ ...formData, necesidades_riego: e.target.value })}><option value="">Seleccionar...</option><option value="Bajo">Bajo</option><option value="Medio">Medio</option><option value="Alto">Alto</option><option value="Muy alto">Muy alto</option></select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Thermometer size={12} /> Temperatura Optima</label><input type="text" className="form-input" placeholder="Ej: 18-25 C" value={formData.temperatura_optima || ''} onChange={e => setFormData({ ...formData, temperatura_optima: e.target.value })} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>pH Suelo Recomendado</label><input type="text" className="form-input" placeholder="Ej: 6.0-7.0" value={formData.ph_suelo || ''} onChange={e => setFormData({ ...formData, ph_suelo: e.target.value })} /></div>
                  </div>
                </div>
              </div>)}
              {activeTab === 'historial' && (<div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>Log de Cambios</h3>
                {!editingId ? <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><Eye size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} /><p style={{ fontSize: '0.85rem' }}>El historial estara disponible una vez guardado el cultivo</p></div> : changelog.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><p style={{ fontSize: '0.85rem' }}>Sin cambios registrados</p></div> :
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {changelog.map((entry, idx) => (<div key={entry._id || idx} style={{ borderLeft: '3px solid ' + (entry.action === 'creacion' ? 'hsl(142 76% 36%)' : entry.action === 'eliminacion' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'), padding: '0.75rem 1rem', marginBottom: '0.75rem', background: 'hsl(var(--muted)/0.2)', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', backgroundColor: entry.action === 'creacion' ? 'hsl(142 76% 36%/0.1)' : entry.action === 'eliminacion' ? 'hsl(var(--destructive)/0.1)' : 'hsl(var(--primary)/0.1)', color: entry.action === 'creacion' ? 'hsl(142 76% 36%)' : entry.action === 'eliminacion' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}>{entry.action}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{entry.user_name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{new Date(entry.timestamp).toLocaleString('es-ES')}</span>
                    </div>
                    {entry.changes && entry.changes.length > 0 && <div style={{ marginTop: '0.4rem' }}>{entry.changes.map((ch, ci) => (<div key={ci} style={{ fontSize: '0.8rem', padding: '0.2rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}><span style={{ fontWeight: '600', minWidth: '120px' }}>{ch.field}:</span>{ch.old && <span style={{ color: 'hsl(var(--destructive))', textDecoration: 'line-through' }}>{ch.old.substring(0, 80)}</span>}<span style={{ color: 'hsl(142 76% 36%)' }}>{ch.new?.substring(0, 80)}</span></div>))}</div>}
                  </div>))}
                </div>}
              </div>)}
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button><button type="submit" className="btn btn-primary" data-testid="btn-submit-cultivo">{editingId ? 'Actualizar' : 'Crear'} Cultivo</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Tipos Manager Modal */}
      {showTiposManager && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowTiposManager(false)}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Tipos de Cultivo</h3>
              <button onClick={() => setShowTiposManager(false)} className="config-modal-close-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" className="form-input" placeholder="Nuevo tipo..." value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTipo())} style={{ flex: 1 }} data-testid="input-nuevo-tipo-cultivo" />
              <button type="button" className="btn btn-primary" onClick={handleAddTipo} disabled={!nuevoTipo.trim()} data-testid="btn-add-tipo-cultivo"><Plus size={16} /></button>
            </div>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {tiposCultivo.map(tipo => (
                <div key={tipo._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem', background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: '0.9rem' }}>{tipo.nombre}</span>
                  <button onClick={() => handleDeleteTipo(tipo._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem' }} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              ))}
              {tiposCultivo.length === 0 && <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', padding: '1rem 0' }}>No hay tipos definidos</p>}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Lista de Cultivos</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ minWidth: '130px' }}>
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar cultivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                data-testid="search-cultivos"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>Cargando cultivos...</p>
        ) : filteredCultivos.length === 0 ? (
          <p className="text-muted">No hay cultivos registrados</p>
        ) : (
          <>
          {canBulkDelete && <BulkActionBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} deleting={bulkDeleting} />}
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {canBulkDelete && <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />}
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredCultivos.map((cultivo) => (
                  <tr key={cultivo._id}>
                    {canBulkDelete && <BulkCheckboxCell id={cultivo._id} selected={selectedIds.has(cultivo._id)} onToggle={toggleOne} />}
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'codigo_cultivo': return <td key="codigo_cultivo"><code style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.85rem' }}>{cultivo.codigo_cultivo || '-'}</code></td>;
                        case 'nombre': return <td key="nombre" style={{ fontWeight: '600' }}>{cultivo.nombre}</td>;
                        case 'variedad': return <td key="variedad">{cultivo.variedad || '-'}</td>;
                        case 'tipo': return <td key="tipo"><span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)' }}>{cultivo.tipo || '-'}</span></td>;
                        case 'unidad_medida': return <td key="unidad_medida">{cultivo.unidad_medida}</td>;
                        case 'ciclo': return <td key="ciclo">{cultivo.ciclo_cultivo || '-'}</td>;
                        case 'temporada': return <td key="temporada">{cultivo.temporada || '-'}</td>;
                        case 'familia_botanica': return <td key="familia_botanica">{cultivo.familia_botanica || '-'}</td>;
                        case 'estado': return <td key="estado"><span className={`badge ${cultivo.activo !== false ? 'badge-success' : 'badge-secondary'}`}>{cultivo.activo !== false ? 'Activo' : 'Inactivo'}</span></td>;
                        default: return null;
                      }
                    })}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(cultivo)} title="Editar cultivo" data-testid={`btn-edit-cultivo-${cultivo._id}`}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-error" onClick={() => handleDelete(cultivo._id)} title="Eliminar cultivo" data-testid={`btn-delete-cultivo-${cultivo._id}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Cultivos;
