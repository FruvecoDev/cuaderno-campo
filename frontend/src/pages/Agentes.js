import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Edit2, Trash2, Search, X, Upload, Percent, Euro, Settings, Eye, CreditCard, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import { useDropzone } from 'react-dropzone';
import ProvinciaSelect from '../components/ProvinciaSelect';
import PaisSelect from '../components/PaisSelect';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
import '../App.css';

const DEFAULT_COLUMNS = [
  { id: 'codigo', label: 'Codigo', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'nif', label: 'N.I.F.', visible: true },
  { id: 'telefono', label: 'Telefono', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'poblacion', label: 'Poblacion', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
];

const Agentes = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('agentes_col_config', DEFAULT_COLUMNS);

  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [listTab, setListTab] = useState('Compra');
  const [modalTab, setModalTab] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('todos');

  const [selectedFoto, setSelectedFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  // Comisiones
  const [comisiones, setComisiones] = useState([]);
  const [comisionForm, setComisionForm] = useState({ tipo_comision: 'porcentaje', valor: '', aplicar_a: 'contrato', referencia_id: '', referencia_nombre: '', fecha_desde: '', fecha_hasta: '', activa: true });
  const [contratos, setContratos] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [parcelas, setParcelas] = useState([]);

  const canCreate = user?.can_create || user?.role === 'Admin';
  const canEdit = user?.can_edit || user?.role === 'Admin';
  const canDelete = user?.can_delete || user?.role === 'Admin';
  const canBulkDelete = user?.can_bulk_delete || user?.role === 'Admin';

  const initialFormData = {
    tipo: 'Compra', nombre: '', razon_social: '', denominacion: '', nif: '',
    direccion: '', direccion2: '', telefonos: '', fax: '',
    pais: 'España', codigo_postal: '', poblacion: '', provincia: '',
    persona_contacto: '', email: '', web: '', observaciones: '', activo: true
  };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => { fetchAgentes(); }, [listTab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReferencias(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAgentes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('tipo', listTab);
      if (searchTerm) params.append('search', searchTerm);
      if (filterActivo === 'activos') params.append('activo', 'true');
      if (filterActivo === 'inactivos') params.append('activo', 'false');
      const data = await api.get(`/api/agentes?${params}`);
      setAgentes(data.agentes || []);
    } catch (err) { setError('Error cargando agentes'); }
    finally { setLoading(false); }
  };

  const fetchReferencias = async () => {
    try {
      const [cData, cuData, pData] = await Promise.all([
        api.get('/api/contratos'),
        api.get('/api/cultivos'),
        api.get('/api/parcelas')
      ]);
      setContratos(cData.contratos || []);
      setCultivos(cuData.cultivos || []);
      setParcelas(pData.parcelas || []);
    } catch (err) {}
  };

  const fetchComisiones = async (agenteId) => {
    try { const data = await api.get(`/api/agentes/${agenteId}/comisiones`); setComisiones(data.comisiones || []); }
    catch (err) { setComisiones([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    try {
      let result;
      if (editingId) {
        result = await api.put(`/api/agentes/${editingId}`, { ...formData, tipo: listTab });
      } else {
        result = await api.post('/api/agentes', { ...formData, tipo: listTab });
      }
      const agenteId = editingId || result?.data?._id;
      if (selectedFoto && agenteId) {
        const fotoFormData = new FormData();
        fotoFormData.append('file', selectedFoto);
        await api.upload(`/api/agentes/${agenteId}/upload-foto`, fotoFormData);
      }
      closeModal();
      fetchAgentes();
    } catch (err) { setError(err.message || 'Error de conexion'); }
  };

  const handleEdit = (agente) => {
    setEditingId(agente._id);
    setFormData({
      tipo: agente.tipo || listTab, nombre: agente.nombre || '', razon_social: agente.razon_social || '',
      denominacion: agente.denominacion || '', nif: agente.nif || '', direccion: agente.direccion || '',
      direccion2: agente.direccion2 || '', telefonos: agente.telefonos || '', fax: agente.fax || '',
      pais: agente.pais || 'España', codigo_postal: agente.codigo_postal || '', poblacion: agente.poblacion || '',
      provincia: agente.provincia || '', persona_contacto: agente.persona_contacto || '', email: agente.email || '',
      web: agente.web || '', observaciones: agente.observaciones || '', activo: agente.activo !== false,
      codigo: agente.codigo || ''
    });
    if (agente.foto_url) setFotoPreview(`${BACKEND_URL}/api/agentes/${agente._id}/foto`);
    setModalTab('general');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Estas seguro de eliminar este agente?')) return;
    try { await api.delete(`/api/agentes/${id}`); fetchAgentes(); }
    catch (err) { setError('Error eliminando agente'); }
  };

  const handleToggleActivo = async (id) => {
    try { await api.patch(`/api/agentes/${id}/toggle-activo`); fetchAgentes(); } catch (err) {}
  };

  const closeModal = () => {
    setShowForm(false); setEditingId(null); setFormData(initialFormData);
    setModalTab('general'); setSelectedFoto(null); setFotoPreview(null);
    setError(null); setComisiones([]);
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) { setSelectedFoto(acceptedFiles[0]); setFotoPreview(URL.createObjectURL(acceptedFiles[0])); }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] }, maxFiles: 1 });

  // Comisiones handlers
  const handleAddComision = async () => {
    if (!comisionForm.valor || !editingId) return;
    try {
      await api.post(`/api/agentes/${editingId}/comisiones`, comisionForm);
      fetchComisiones(editingId);
      setComisionForm({ tipo_comision: 'porcentaje', valor: '', aplicar_a: 'contrato', referencia_id: '', referencia_nombre: '', fecha_desde: '', fecha_hasta: '', activa: true });
    } catch (err) {}
  };
  const handleDeleteComision = async (comisionId) => {
    if (!window.confirm('Eliminar esta comision?')) return;
    try { await api.delete(`/api/comisiones/${comisionId}`); fetchComisiones(editingId); } catch (err) {}
  };

  const filteredAgentes = agentes.filter(a => {
    const matchesSearch = !searchTerm || a.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || a.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) || a.nif?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterActivo === 'todos' || (filterActivo === 'activos' && a.activo !== false) || (filterActivo === 'inactivos' && a.activo === false);
    return matchesSearch && matchesEstado;
  });

  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(filteredAgentes);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const handleBulkDelete = async () => {
    if (!window.confirm(`Eliminar ${selectedIds.size} agente${selectedIds.size > 1 ? 's' : ''} seleccionado${selectedIds.size > 1 ? 's' : ''}?`)) return;
    setBulkDeleting(true);
    try { await bulkDeleteApi('agentes', selectedIds); clearSelection(); fetchAgentes(); } catch (e) {} finally { setBulkDeleting(false); }
  };

  return (
    <div data-testid="agentes-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Agentes</h1>
          <p className="text-muted">Gestiona agentes de compra y venta</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-agentes"><Settings size={18} /></button>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => { setFormData({ ...initialFormData, tipo: listTab }); setEditingId(null); setModalTab('general'); setShowForm(true); }} data-testid="btn-nuevo-agente">
              <Plus size={18} /> Nuevo Agente
            </button>
          )}
        </div>
      </div>
      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {/* Compra / Venta tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={`btn ${listTab === 'Compra' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setListTab('Compra')} style={{ flex: 1 }}>Agentes de Compra</button>
        <button className={`btn ${listTab === 'Venta' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setListTab('Venta')} style={{ flex: 1 }}>Agentes de Venta</button>
      </div>

      {error && <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}><p style={{ color: 'hsl(var(--destructive))' }}>{error}</p></div>}

      {/* Professional Tabbed Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
                <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Agente de {listTab}</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>ID: {formData.codigo || 'Auto'}</span></div>
              </div>
              <button onClick={closeModal} className="config-modal-close-btn"><X size={18} /></button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'general', label: 'Datos Generales', icon: <Users size={14} /> },
                { key: 'comisiones', label: 'Comisiones', icon: <CreditCard size={14} /> },
                { key: 'historial', label: 'Historial', icon: <Eye size={14} /> }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => { setModalTab(tab.key); if (tab.key === 'comisiones' && editingId) fetchComisiones(editingId); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: modalTab === tab.key ? '700' : '500', color: modalTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: modalTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
              {modalTab === 'general' && (<div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '1.5rem' }}>
                  <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificacion</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 170px', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Codigo</label><input type="text" className="form-input" value={formData.codigo || 'Auto'} disabled style={{ backgroundColor: 'hsl(var(--muted))', textAlign: 'center' }} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre *</label><input type="text" className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required data-testid="input-nombre" /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>NIF</label><input type="text" className="form-input" value={formData.nif} onChange={e => setFormData({ ...formData, nif: e.target.value })} placeholder="12345678A" /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Razon Social</label><input type="text" className="form-input" value={formData.razon_social} onChange={e => setFormData({ ...formData, razon_social: e.target.value })} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Denominacion</label><input type="text" className="form-input" value={formData.denominacion} onChange={e => setFormData({ ...formData, denominacion: e.target.value })} /></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Direccion</h3>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}><input type="text" className="form-input" placeholder="Calle, numero, piso..." value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} /></div>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}><input type="text" className="form-input" placeholder="Direccion (linea 2)" value={formData.direccion2} onChange={e => setFormData({ ...formData, direccion2: e.target.value })} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 100px 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Poblacion</label><input type="text" className="form-input" value={formData.poblacion} onChange={e => setFormData({ ...formData, poblacion: e.target.value })} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Provincia</label>{(!formData.pais || formData.pais === 'España') ? <ProvinciaSelect value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} /> : <input type="text" className="form-input" placeholder="Provincia / Region" value={formData.provincia} onChange={e => setFormData({ ...formData, provincia: e.target.value })} />}</div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>C.P.</label><input type="text" className="form-input" value={formData.codigo_postal} onChange={e => setFormData({ ...formData, codigo_postal: e.target.value })} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Pais</label><PaisSelect value={formData.pais} onChange={e => setFormData({ ...formData, pais: e.target.value, provincia: '' })} /></div>
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Contacto</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Telefono/s</label><input type="text" className="form-input" value={formData.telefonos} onChange={e => setFormData({ ...formData, telefonos: e.target.value })} placeholder="600 123 456" /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>FAX</label><input type="text" className="form-input" value={formData.fax} onChange={e => setFormData({ ...formData, fax: e.target.value })} /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Persona Contacto</label><input type="text" className="form-input" value={formData.persona_contacto} onChange={e => setFormData({ ...formData, persona_contacto: e.target.value })} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Email</label><input type="email" className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="email@ejemplo.com" /></div>
                        <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Web</label><input type="url" className="form-input" value={formData.web} onChange={e => setFormData({ ...formData, web: e.target.value })} placeholder="https://..." style={{ maxWidth: '378px' }} /></div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.25rem', alignItems: 'start' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="2" value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} style={{ fontSize: '0.85rem', resize: 'vertical' }} /></div>
                      <div style={{ paddingTop: '1.5rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.activo ? 'hsl(142 76% 36%/0.1)' : 'hsl(var(--muted))', border: '1px solid ' + (formData.activo ? 'hsl(142 76% 36%/0.3)' : 'hsl(var(--border))') }}><input type="checkbox" checked={formData.activo} onChange={e => setFormData({ ...formData, activo: e.target.checked })} style={{ width: '16px', height: '16px' }} /><span style={{ fontWeight: '600', fontSize: '0.85rem', color: formData.activo ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))' }}>{formData.activo ? 'Activo' : 'Inactivo'}</span></label></div>
                    </div>
                  </div>
                  {/* Right column - Foto */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Foto</label>
                    <div {...getRootProps()} style={{ border: '2px dashed hsl(var(--border))', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', cursor: 'pointer', backgroundColor: isDragActive ? 'hsl(var(--primary) / 0.1)' : 'transparent', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <input {...getInputProps()} />
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '130px', borderRadius: '8px' }} />
                      ) : (
                        <><Upload size={28} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.4rem' }} /><p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Arrastra una imagen</p></>
                      )}
                    </div>
                    {fotoPreview && <button type="button" onClick={() => { setSelectedFoto(null); setFotoPreview(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={12} /> Quitar</button>}
                  </div>
                </div>
              </div>)}

              {modalTab === 'comisiones' && (<div>
                {!editingId ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><CreditCard size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} /><p style={{ fontSize: '0.85rem' }}>Las comisiones estaran disponibles una vez guardado el agente</p></div>
                ) : (<div>
                  <div style={{ background: 'hsl(var(--muted)/0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Nueva Comision</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tipo</label><select className="form-input" value={comisionForm.tipo_comision} onChange={e => setComisionForm({ ...comisionForm, tipo_comision: e.target.value })}><option value="porcentaje">Porcentaje (%)</option><option value="euro_kilo">EUR por Kilo</option></select></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Valor {comisionForm.tipo_comision === 'porcentaje' ? '(%)' : '(EUR/kg)'}</label><input type="number" step="0.01" className="form-input" value={comisionForm.valor} onChange={e => setComisionForm({ ...comisionForm, valor: e.target.value })} placeholder={comisionForm.tipo_comision === 'porcentaje' ? '5.00' : '0.10'} /></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Aplicar a</label><select className="form-input" value={comisionForm.aplicar_a} onChange={e => setComisionForm({ ...comisionForm, aplicar_a: e.target.value, referencia_id: '', referencia_nombre: '' })}><option value="contrato">Contrato</option><option value="cultivo">Cultivo</option><option value="parcela">Parcela</option></select></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Referencia</label><select className="form-input" value={comisionForm.referencia_id} onChange={e => { const sel = e.target.options[e.target.selectedIndex]; setComisionForm({ ...comisionForm, referencia_id: e.target.value, referencia_nombre: sel.text }); }}><option value="">Todos</option>{comisionForm.aplicar_a === 'contrato' && contratos.map(c => <option key={c._id} value={c._id}>{c.numero_contrato} - {c.cultivo}</option>)}{comisionForm.aplicar_a === 'cultivo' && cultivos.map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}{comisionForm.aplicar_a === 'parcela' && parcelas.map(p => <option key={p._id} value={p._id}>{p.codigo || p.nombre}</option>)}</select></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Desde</label><input type="date" className="form-input" value={comisionForm.fecha_desde} onChange={e => setComisionForm({ ...comisionForm, fecha_desde: e.target.value })} /></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Hasta</label><input type="date" className="form-input" value={comisionForm.fecha_hasta} onChange={e => setComisionForm({ ...comisionForm, fecha_hasta: e.target.value })} /></div>
                      <div style={{ paddingTop: '1.5rem' }}><button type="button" className="btn btn-primary" onClick={handleAddComision} disabled={!comisionForm.valor}><Plus size={16} /> Anadir</button></div>
                    </div>
                  </div>
                  {comisiones.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><p style={{ fontSize: '0.85rem' }}>No hay comisiones configuradas</p></div> : (
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {comisiones.map(com => (
                        <div key={com._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', background: 'hsl(var(--muted)/0.2)', border: '1px solid hsl(var(--border))' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: com.tipo_comision === 'porcentaje' ? 'hsl(var(--primary)/0.1)' : 'hsl(38 92% 50%/0.1)', color: com.tipo_comision === 'porcentaje' ? 'hsl(var(--primary))' : 'hsl(38 92% 50%)' }}>{com.tipo_comision === 'porcentaje' ? <><Percent size={10} /> %</> : <><Euro size={10} /> EUR/kg</>}</span>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{com.tipo_comision === 'porcentaje' ? `${com.valor}%` : `${com.valor} EUR/kg`}</span>
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{com.aplicar_a}: {com.referencia_nombre || 'Todos'}</span>
                            {(com.fecha_desde || com.fecha_hasta) && <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{com.fecha_desde || '...'} - {com.fecha_hasta || '...'}</span>}
                          </div>
                          <button onClick={() => handleDeleteComision(com._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem' }}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>)}
              </div>)}

              {modalTab === 'historial' && (<div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>Log de Cambios</h3>
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><Eye size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} /><p style={{ fontSize: '0.85rem' }}>{!editingId ? 'El historial estara disponible una vez guardado el agente' : 'Sin cambios registrados'}</p></div>
              </div>)}

              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button><button type="submit" className="btn btn-primary" data-testid="btn-guardar">{editingId ? 'Actualizar' : 'Crear'} Agente</button></div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Agentes de {listTab}</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select className="form-select" value={filterActivo} onChange={e => { setFilterActivo(e.target.value); }} style={{ minWidth: '130px' }}>
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input type="text" className="form-input" placeholder="Buscar agentes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.5rem' }} data-testid="search-agentes" />
            </div>
          </div>
        </div>
        {loading ? <p>Cargando...</p> : filteredAgentes.length === 0 ? <p className="text-muted">No hay agentes de {listTab.toLowerCase()} registrados</p> : (
          <div style={{ overflowX: 'auto' }}>
            {canBulkDelete && <BulkActionBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} deleting={bulkDeleting} />}
            <table>
              <thead><tr>{canBulkDelete && <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />}{visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}<th>Acciones</th></tr></thead>
              <tbody>
                {filteredAgentes.map(agente => (
                  <tr key={agente._id}>
                    {canBulkDelete && <BulkCheckboxCell id={agente._id} selected={selectedIds.has(agente._id)} onToggle={toggleOne} />}
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'codigo': return <td key="codigo"><code style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.85rem' }}>{agente.codigo || '-'}</code></td>;
                        case 'nombre': return <td key="nombre"><div style={{ fontWeight: '600' }}>{agente.nombre}</div>{agente.razon_social && <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{agente.razon_social}</div>}</td>;
                        case 'nif': return <td key="nif">{agente.nif || '-'}</td>;
                        case 'telefono': return <td key="telefono">{agente.telefonos || '-'}</td>;
                        case 'email': return <td key="email">{agente.email || '-'}</td>;
                        case 'poblacion': return <td key="poblacion">{agente.poblacion || '-'}</td>;
                        case 'estado': return <td key="estado"><button className={`badge ${agente.activo !== false ? 'badge-success' : 'badge-secondary'}`} onClick={() => canEdit && handleToggleActivo(agente._id)} style={{ cursor: canEdit ? 'pointer' : 'default', border: 'none' }}>{agente.activo !== false ? 'Activo' : 'Inactivo'}</button></td>;
                        default: return null;
                      }
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {canEdit && <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(agente)} title="Editar"><Edit2 size={14} /></button>}
                        {canDelete && <button className="btn btn-sm btn-error" onClick={() => handleDelete(agente._id)} title="Eliminar"><Trash2 size={14} /></button>}
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

export default Agentes;
