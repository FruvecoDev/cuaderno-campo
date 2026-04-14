import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, Settings, X, Download, FileText, TrendingUp, Users, Eye, MapPin } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import ProvinciaSelect from '../components/ProvinciaSelect';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import '../App.css';

const DEFAULT_COLUMNS = [
  { id: 'codigo_proveedor', label: 'ID', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'cif_nif', label: 'CIF/NIF', visible: true },
  { id: 'telefono', label: 'Telefono', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'poblacion', label: 'Poblacion', visible: true },
  { id: 'provincia', label: 'Provincia', visible: false },
  { id: 'direccion', label: 'Direccion', visible: false },
  { id: 'codigo_postal', label: 'Codigo Postal', visible: false },
  { id: 'pais', label: 'Pais', visible: false },
  { id: 'persona_contacto', label: 'Persona Contacto', visible: false },
  { id: 'observaciones', label: 'Observaciones', visible: false },
  { id: 'estado', label: 'Estado', visible: true },
];

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialData, setHistorialData] = useState(null);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const { t } = useTranslation();
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('proveedores_col_config', DEFAULT_COLUMNS);
  
  const [formData, setFormData] = useState({
    nombre: '',
    cif_nif: '',
    direccion: '',
    poblacion: '',
    provincia: '',
    pais: 'España',
    codigo_postal: '',
    telefonos: [{ valor: '', etiqueta: '' }],
    emails: [{ valor: '', etiqueta: '' }],
    contactos: [{ nombre: '', cargo: '', telefono: '', email: '' }],
    observaciones: '',
    activo: true
  });

  const nextCodigo = (() => {
    if (!proveedores.length) return '000001';
    const maxCode = Math.max(...proveedores.map(p => parseInt(p.codigo_proveedor || '0', 10)));
    return String(maxCode + 1).padStart(6, '0');
  })();

  useEffect(() => {
    fetchProveedores();
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProveedores = async () => {
    try {
      setError(null);
      const data = await api.get('/api/proveedores');
      setProveedores(data.proveedores || []);
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'ver los proveedores');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/proveedores/stats/resumen');
      setStats(data.stats);
    } catch (error) {

    }
  };

  const handleVerHistorial = async (proveedor) => {
    setSelectedProveedor(proveedor);
    try {
      const data = await api.get(`/api/proveedores/${proveedor._id}/historial`);
      setHistorialData(data.historial);
      setShowHistorial(true);
    } catch (error) {

    }
  };

  const handleExportExcel = async () => {
    try {
      const params = filtroEstado !== 'todos' ? `?activo=${filtroEstado === 'activos'}` : '';
      await api.download(`/api/proveedores/export/excel${params}`, `proveedores_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {

      alert('Error al exportar');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        ...formData,
        telefonos: formData.telefonos.filter(t => t.valor.trim()),
        emails: formData.emails.filter(em => em.valor.trim()),
        contactos: formData.contactos.filter(c => c.nombre.trim()),
        telefono: formData.telefonos.find(t => t.valor.trim())?.valor || '',
        email: formData.emails.find(em => em.valor.trim())?.valor || '',
        persona_contacto: formData.contactos.find(c => c.nombre.trim())?.nombre || '',
      };
      if (editingId) {
        await api.put(`/api/proveedores/${editingId}`, payload);
      } else {
        await api.post('/api/proveedores', payload);
      }
      
      setShowForm(false);
      setEditingId(null);
      fetchProveedores();
      resetForm();
    } catch (error) {

      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el proveedor' : 'crear el proveedor');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (proveedor) => {
    setFormData({
      ...proveedor,
      pais: proveedor.pais || 'España',
      telefonos: proveedor.telefonos?.length ? proveedor.telefonos : (proveedor.telefono ? [{ valor: proveedor.telefono, etiqueta: '' }] : [{ valor: '', etiqueta: '' }]),
      emails: proveedor.emails?.length ? proveedor.emails : (proveedor.email ? [{ valor: proveedor.email, etiqueta: '' }] : [{ valor: '', etiqueta: '' }]),
      contactos: proveedor.contactos?.length ? proveedor.contactos : (proveedor.persona_contacto ? [{ nombre: proveedor.persona_contacto, cargo: '', telefono: '', email: '' }] : [{ nombre: '', cargo: '', telefono: '', email: '' }]),
    });
    setEditingId(proveedor._id);
    setShowForm(true);
  };

  const handleDelete = async (proveedorId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
      return;
    }
    
    try {
      setError(null);
      await api.delete(`/api/proveedores/${proveedorId}`);
      fetchProveedores();
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'eliminar el proveedor');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      cif_nif: '',
      direccion: '',
      poblacion: '',
      provincia: '',
      pais: 'España',
      codigo_postal: '',
      telefonos: [{ valor: '', etiqueta: '' }],
      emails: [{ valor: '', etiqueta: '' }],
      contactos: [{ nombre: '', cargo: '', telefono: '', email: '' }],
      observaciones: '',
      activo: true
    });
  };

  const filteredProveedores = proveedores.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cif_nif && p.cif_nif.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEstado = filtroEstado === 'todos' || 
      (filtroEstado === 'activos' && p.activo !== false) ||
      (filtroEstado === 'inactivos' && p.activo === false);
    return matchesSearch && matchesEstado;
  });

  // Column config handled by useColumnConfig hook

  return (
    <div data-testid="proveedores-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Proveedores</h1>
          <p className="text-muted">Gestiona el catálogo de proveedores</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            title="Exportar a Excel"
          >
            <Download size={18} />
            Excel
          </button>
          <button
            className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowConfig(true)}
            title="Configurar columnas"
            data-testid="btn-config-proveedores"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(true);
            }}
            className="btn btn-primary"
            data-testid="btn-nuevo-proveedor"
          >
            <Plus size={18} />
            Nuevo Proveedor
          </PermissionButton>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <Users size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(var(--primary))' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.total}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Proveedores</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <TrendingUp size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(142 76% 36%)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.activos}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Activos</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <MapPin size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(38 92% 50%)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.por_provincia?.length || 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Provincias</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <FileText size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(262 83% 58%)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.top_proveedores_compras?.length || 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Con Operaciones</div>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
        >
          <div className="card" style={{ maxWidth: '900px', width: '100%', maxHeight: '92vh', overflow: 'auto', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.02em' }}>{editingId ? 'Editar' : 'Nuevo'} Proveedor</h2>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Completa los datos del proveedor</span>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="config-modal-close-btn"><X size={18} /></button>
            </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Datos Generales</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 200px', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>ID Proveedor</label>
                  <input type="text" className="form-input" value={formData.codigo_proveedor || nextCodigo} disabled style={{ backgroundColor: 'hsl(var(--muted))', textAlign: 'center' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre / Razon Social *</label>
                  <input type="text" className="form-input" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>CIF / NIF</label>
                  <input type="text" className="form-input" value={formData.cif_nif} onChange={(e) => setFormData({ ...formData, cif_nif: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Direccion</h3>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <input type="text" className="form-input" placeholder="Calle, numero, piso..." value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 100px 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Poblacion</label><input type="text" className="form-input" value={formData.poblacion} onChange={(e) => setFormData({ ...formData, poblacion: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Provincia</label><ProvinciaSelect value={formData.provincia} onChange={(e) => setFormData({ ...formData, provincia: e.target.value })} testId="select-provincia-proveedor" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>C.P.</label><input type="text" className="form-input" value={formData.codigo_postal} onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Pais</label><input type="text" className="form-input" value={formData.pais || ''} onChange={(e) => setFormData({ ...formData, pais: e.target.value })} /></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'hsl(var(--muted) / 0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Telefonos</h3>
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setFormData({ ...formData, telefonos: [...formData.telefonos, { valor: '', etiqueta: '' }] })}><Plus size={14} /> Anadir</button>
                </div>
                {formData.telefonos.map((tel, idx) => (
                  <div key={`tel-${idx}`} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input type="tel" className="form-input" placeholder="Numero" value={tel.valor} onChange={(e) => { const arr = [...formData.telefonos]; arr[idx] = { ...arr[idx], valor: e.target.value }; setFormData({ ...formData, telefonos: arr }); }} style={{ flex: 2, fontSize: '0.85rem' }} />
                    <select className="form-input" value={tel.etiqueta} onChange={(e) => { const arr = [...formData.telefonos]; arr[idx] = { ...arr[idx], etiqueta: e.target.value }; setFormData({ ...formData, telefonos: arr }); }} style={{ flex: 1, fontSize: '0.85rem' }}><option value="">Tipo</option><option value="Fijo">Fijo</option><option value="Movil">Movil</option><option value="Fax">Fax</option></select>
                    {formData.telefonos.length > 1 && <button type="button" onClick={() => setFormData({ ...formData, telefonos: formData.telefonos.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem', flexShrink: 0 }}><X size={15} /></button>}
                  </div>
                ))}
              </div>
              <div style={{ background: 'hsl(var(--muted) / 0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Emails</h3>
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setFormData({ ...formData, emails: [...formData.emails, { valor: '', etiqueta: '' }] })}><Plus size={14} /> Anadir</button>
                </div>
                {formData.emails.map((em, idx) => (
                  <div key={`em-${idx}`} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input type="email" className="form-input" placeholder="correo@ejemplo.com" value={em.valor} onChange={(e) => { const arr = [...formData.emails]; arr[idx] = { ...arr[idx], valor: e.target.value }; setFormData({ ...formData, emails: arr }); }} style={{ flex: 2, fontSize: '0.85rem' }} />
                    <input type="text" className="form-input" placeholder="Dpto." value={em.etiqueta} onChange={(e) => { const arr = [...formData.emails]; arr[idx] = { ...arr[idx], etiqueta: e.target.value }; setFormData({ ...formData, emails: arr }); }} style={{ flex: 1, fontSize: '0.85rem' }} />
                    {formData.emails.length > 1 && <button type="button" onClick={() => setFormData({ ...formData, emails: formData.emails.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem', flexShrink: 0 }}><X size={15} /></button>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'hsl(var(--muted) / 0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Personas de Contacto</h3>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setFormData({ ...formData, contactos: [...formData.contactos, { nombre: '', cargo: '', telefono: '', email: '' }] })}><Plus size={14} /> Anadir contacto</button>
              </div>
              {formData.contactos.map((c, idx) => (
                <div key={`ct-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input type="text" className="form-input" placeholder="Nombre completo" value={c.nombre} onChange={(e) => { const arr = [...formData.contactos]; arr[idx] = { ...arr[idx], nombre: e.target.value }; setFormData({ ...formData, contactos: arr }); }} style={{ fontSize: '0.85rem' }} />
                  <input type="text" className="form-input" placeholder="Cargo" value={c.cargo} onChange={(e) => { const arr = [...formData.contactos]; arr[idx] = { ...arr[idx], cargo: e.target.value }; setFormData({ ...formData, contactos: arr }); }} style={{ fontSize: '0.85rem' }} />
                  <input type="tel" className="form-input" placeholder="Telefono" value={c.telefono} onChange={(e) => { const arr = [...formData.contactos]; arr[idx] = { ...arr[idx], telefono: e.target.value }; setFormData({ ...formData, contactos: arr }); }} style={{ fontSize: '0.85rem' }} />
                  <input type="email" className="form-input" placeholder="Email" value={c.email} onChange={(e) => { const arr = [...formData.contactos]; arr[idx] = { ...arr[idx], email: e.target.value }; setFormData({ ...formData, contactos: arr }); }} style={{ fontSize: '0.85rem' }} />
                  {formData.contactos.length > 1 && <button type="button" onClick={() => setFormData({ ...formData, contactos: formData.contactos.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem' }}><X size={15} /></button>}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label>
                <textarea className="form-input" rows="2" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} style={{ fontSize: '0.85rem', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.activo ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))', border: '1px solid ' + (formData.activo ? 'hsl(142 76% 36% / 0.3)' : 'hsl(var(--border))'), transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: formData.activo ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))' }}>{formData.activo ? 'Activo' : 'Inactivo'}</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Proveedor
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Lista de Proveedores</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              className="form-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ minWidth: '130px' }}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>Cargando proveedores...</p>
        ) : filteredProveedores.length === 0 ? (
          <p className="text-muted">No hay proveedores registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredProveedores.map((proveedor) => (
                  <tr key={proveedor._id}>
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'codigo_proveedor': return <td key="codigo_proveedor"><code style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.85rem' }}>{proveedor.codigo_proveedor || '-'}</code></td>;
                        case 'nombre': return <td key="nombre" style={{ fontWeight: '600' }}>{proveedor.nombre}</td>;
                        case 'cif_nif': return <td key="cif_nif">{proveedor.cif_nif || '-'}</td>;
                        case 'telefono': return <td key="telefono">{proveedor.telefonos?.length ? proveedor.telefonos.map(t => t.valor).join(', ') : proveedor.telefono || '-'}</td>;
                        case 'email': return <td key="email">{proveedor.emails?.length ? proveedor.emails.map(e => e.valor).join(', ') : proveedor.email || '-'}</td>;
                        case 'poblacion': return <td key="poblacion">{proveedor.poblacion || '-'}</td>;
                        case 'provincia': return <td key="provincia">{proveedor.provincia || '-'}</td>;
                        case 'direccion': return <td key="direccion">{proveedor.direccion || '-'}</td>;
                        case 'codigo_postal': return <td key="codigo_postal">{proveedor.codigo_postal || '-'}</td>;
                        case 'pais': return <td key="pais">{proveedor.pais || '-'}</td>;
                        case 'persona_contacto': return <td key="persona_contacto">{proveedor.contactos?.length ? proveedor.contactos.map(c => `${c.nombre}${c.cargo ? ` (${c.cargo})` : ''}`).join(', ') : proveedor.persona_contacto || '-'}</td>;
                        case 'observaciones': return <td key="observaciones" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proveedor.observaciones || '-'}</td>;
                        case 'estado': return <td key="estado"><span className={`badge ${proveedor.activo ? 'badge-success' : 'badge-secondary'}`}>{proveedor.activo ? 'Activo' : 'Inactivo'}</span></td>;
                        default: return null;
                      }
                    })}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleVerHistorial(proveedor)}
                            title="Ver historial"
                          >
                            <Eye size={14} />
                          </button>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(proveedor)}
                              title="Editar proveedor"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(proveedor._id)}
                              title="Eliminar proveedor"
                            >
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
        )}
      </div>

      {/* Modal de Historial */}
      {showHistorial && selectedProveedor && (
        <div onClick={() => setShowHistorial(false)} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh', 
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0 }}>Historial de {selectedProveedor.nombre}</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  {selectedProveedor.cif_nif || 'Sin CIF/NIF'}
                </p>
              </div>
              <button onClick={() => setShowHistorial(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {historialData && (
                <>
                  {/* Resumen */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
                        {historialData.total_compras?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '0 €'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Compras</div>
                    </div>
                    <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{historialData.num_operaciones || 0}</div>
                      <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Operaciones</div>
                    </div>
                  </div>

                  {/* Lista de operaciones */}
                  {(historialData.gastos?.length > 0 || historialData.albaranes?.length > 0) ? (
                    <div>
                      <h4 style={{ marginBottom: '0.75rem' }}>Últimas Operaciones</h4>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {historialData.gastos?.map(g => (
                          <div key={g._id} style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid hsl(var(--border))',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: '500' }}>{g.concepto || 'Gasto'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{g.fecha}</div>
                            </div>
                            <div style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>
                              {g.importe?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </div>
                          </div>
                        ))}
                        {historialData.albaranes?.map(a => (
                          <div key={a._id} style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid hsl(var(--border))',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: '500' }}>Albarán {a.numero || ''}</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{a.fecha}</div>
                            </div>
                            <div style={{ fontWeight: '600', color: 'hsl(142 76% 36%)' }}>
                              {a.total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                      No hay operaciones registradas con este proveedor
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proveedores;
