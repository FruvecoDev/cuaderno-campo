import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, X, Upload, User, Phone, Mail, MapPin, Building, Globe, TrendingUp, FileText, Package, Eye, Settings, Download, Users, CreditCard, Award, Truck } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ProvinciaSelect from '../components/ProvinciaSelect';
import PaisSelect from '../components/PaisSelect';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import '../App.css';

const DEFAULT_COLUMNS = [
  { id: 'codigo', label: 'Codigo', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'nif', label: 'NIF/CIF', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'poblacion', label: 'Poblacion', visible: true },
  { id: 'provincia', label: 'Provincia', visible: false },
  { id: 'telefono', label: 'Telefono', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'direccion', label: 'Direccion', visible: false },
  { id: 'cod_postal', label: 'Codigo Postal', visible: false },
  { id: 'contacto', label: 'Contacto', visible: false },
  { id: 'web', label: 'Web', visible: false },
  { id: 'observaciones', label: 'Observaciones', visible: false },
  { id: 'estado', label: 'Estado', visible: true },
];

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterProvincia, setFilterProvincia] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [tipos, setTipos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  
  // Estado para el resumen de ventas
  const [showResumenVentas, setShowResumenVentas] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [resumenVentas, setResumenVentas] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  
  // Estado para historial
  const [showHistorial, setShowHistorial] = useState(false);
  const [historialData, setHistorialData] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  
  // Estado para stats
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [tiposClienteCrud, setTiposClienteCrud] = useState([]);
  const [showTiposManager, setShowTiposManager] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [tiposOperacion, setTiposOperacion] = useState([]);
  const [showTiposOpManager, setShowTiposOpManager] = useState(false);
  const [nuevoTipoOp, setNuevoTipoOp] = useState('');
  const [changelog, setChangelog] = useState([]);
  const [formasPago, setFormasPago] = useState([]);
  const [tiposIva, setTiposIva] = useState([]);
  const [showFormasPagoManager, setShowFormasPagoManager] = useState(false);
  const [nuevaFormaPago, setNuevaFormaPago] = useState('');
  const [showTiposIvaManager, setShowTiposIvaManager] = useState(false);
  const [nuevoTipoIva, setNuevoTipoIva] = useState({ nombre: '', valor: '' });
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('clientes_col_config', DEFAULT_COLUMNS);
  
  const initialFormData = {
    codigo: '',
    nombre: '',
    razon: '',
    denominacion: '',
    nif: '',
    segundo_codigo: '',
    direccion: '',
    pais: 'España',
    cod_postal: '',
    poblacion: '',
    provincia: '',
    coor_gps: '',
    telefonos: [{ valor: '', etiqueta: '' }],
    emails: [{ valor: '', etiqueta: '' }],
    contactos: [{ nombre: '', cargo: '', telefono: '', email: '' }],
    telefono: '',
    movil: '',
    fax: '',
    contacto: '',
    consultor: '',
    email: '',
    web: '',
    observaciones: '',
    avisos: '',
    idioma: 'Español',
    tipo: '',
    datos_gestion: { forma_pago: '', dias_pago: '', moneda: 'EUR', iva: '', irpf: '', subcuenta: '', subcuenta_gastos: '', tipo_operacion: '' },
    datos_bancarios: { banco: '', sucursal: '', iban: '', entidad: '', sucursal_num: '', dc: '', cuenta: '', swift_bic: '' },
    certificaciones: [],
    centros_descarga: [],
    activo: true
  };
  
  const [formData, setFormData] = useState(initialFormData);

  const nextCodigo = (() => {
    if (!clientes.length) return '000001';
    const maxCode = Math.max(...clientes.map(c => parseInt(c.codigo || '0', 10)));
    return String(maxCode + 1).padStart(6, '0');
  })();

  useEffect(() => {
    fetchClientes();
    fetchTipos();
    fetchProvincias();
    fetchStats();
    fetchTiposClienteCrud();
    fetchTiposOperacion();
    fetchFormasPago();
    fetchTiposIva();
  }, [searchTerm, filterTipo, filterProvincia, filterActivo]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchClientes = async () => {
    try {
      setLoading(true);
      let params = new URLSearchParams();
      params.append('limit', '200');
      if (searchTerm) params.append('search', searchTerm);
      if (filterTipo) params.append('tipo', filterTipo);
      if (filterProvincia) params.append('provincia', filterProvincia);
      if (filterActivo !== '') params.append('activo', filterActivo);
      
      const data = await api.get(`/api/clientes?${params}`);
      setClientes(data.clientes || []);
    } catch (err) {

      const errorMsg = handlePermissionError(err, 'ver los clientes');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTipos = async () => {
    try {
      const data = await api.get('/api/clientes/tipos');
      setTipos(data.tipos || []);
    } catch (err) {

    }
  };
  
  const fetchProvincias = async () => {
    try {
      const data = await api.get('/api/clientes/provincias');
      setProvincias(data.provincias || []);
    } catch (err) {

    }
  };
  
  const fetchStats = async () => {
    try {
      const data = await api.get('/api/clientes/stats/resumen');
      setStats(data.stats);
    } catch (err) {

    }
  };

  const fetchTiposClienteCrud = async () => {
    try { const data = await api.get('/api/tipos-cliente'); setTiposClienteCrud(data.tipos || []); } catch (e) {}
  };
  const fetchTiposOperacion = async () => {
    try { const data = await api.get('/api/tipos-operacion-cliente'); setTiposOperacion(data.tipos || []); } catch (e) {}
  };
  const handleAddTipoCl = async () => {
    if (!nuevoTipo.trim()) return;
    try { await api.post('/api/tipos-cliente', { nombre: nuevoTipo.trim() }); setNuevoTipo(''); fetchTiposClienteCrud(); } catch (e) {}
  };
  const handleDeleteTipoCl = async (id) => {
    try { await api.delete(`/api/tipos-cliente/${id}`); fetchTiposClienteCrud(); } catch (e) {}
  };
  const handleAddTipoOp = async () => {
    if (!nuevoTipoOp.trim()) return;
    try { await api.post('/api/tipos-operacion-cliente', { nombre: nuevoTipoOp.trim() }); setNuevoTipoOp(''); fetchTiposOperacion(); } catch (e) {}
  };
  const handleDeleteTipoOp = async (id) => {
    try { await api.delete(`/api/tipos-operacion-cliente/${id}`); fetchTiposOperacion(); } catch (e) {}
  };
  const fetchChangelog = async (id) => {
    try { const data = await api.get(`/api/clientes/${id}/changelog`); setChangelog(data.changelog || []); } catch (e) { setChangelog([]); }
  };
  const fetchFormasPago = async () => { try { const d = await api.get('/api/formas-pago'); setFormasPago(d.items || []); } catch (e) {} };
  const fetchTiposIva = async () => { try { const d = await api.get('/api/tipos-iva'); setTiposIva(d.items || []); } catch (e) {} };
  const handleAddFormaPago = async () => { if (!nuevaFormaPago.trim()) return; try { await api.post('/api/formas-pago', { nombre: nuevaFormaPago.trim() }); setNuevaFormaPago(''); fetchFormasPago(); } catch (e) {} };
  const handleDeleteFormaPago = async (id) => { try { await api.delete(`/api/formas-pago/${id}`); fetchFormasPago(); } catch (e) {} };
  const handleAddTipoIva = async () => { if (!nuevoTipoIva.nombre.trim()) return; try { await api.post('/api/tipos-iva', nuevoTipoIva); setNuevoTipoIva({ nombre: '', valor: '' }); fetchTiposIva(); } catch (e) {} };
  const handleDeleteTipoIva = async (id) => { try { await api.delete(`/api/tipos-iva/${id}`); fetchTiposIva(); } catch (e) {} };
  
  const handleExportExcel = async () => {
    try {
      const params = filterActivo ? `?activo=${filterActivo === 'activos'}` : '';
      await api.download(`/api/clientes/export/excel${params}`, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {

      alert('Error al exportar');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let data;
      if (editingId) {
        data = await api.put(`/api/clientes/${editingId}`, formData);
      } else {
        data = await api.post('/api/clientes', formData);
      }
      
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setFormData(initialFormData);
        fetchClientes();
        fetchProvincias();
      } else {
        setError(data.detail || 'Error al guardar');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {

      setError('Error al guardar el cliente');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (cliente) => {
    setEditingId(cliente._id);
    setFormData({
      ...initialFormData,
      ...cliente,
      pais: cliente.pais || 'España',
      telefonos: cliente.telefonos?.length ? cliente.telefonos : (cliente.telefono ? [{ valor: cliente.telefono, etiqueta: 'Fijo' }] : [{ valor: '', etiqueta: '' }]),
      emails: cliente.emails?.length ? cliente.emails : (cliente.email ? [{ valor: cliente.email, etiqueta: '' }] : [{ valor: '', etiqueta: '' }]),
      contactos: cliente.contactos?.length ? cliente.contactos : (cliente.contacto ? [{ nombre: cliente.contacto, cargo: '', telefono: '', email: '' }] : [{ nombre: '', cargo: '', telefono: '', email: '' }]),
      datos_gestion: cliente.datos_gestion || initialFormData.datos_gestion,
      datos_bancarios: cliente.datos_bancarios || initialFormData.datos_bancarios,
      certificaciones: cliente.certificaciones || [],
      centros_descarga: cliente.centros_descarga || [],
      avisos: cliente.avisos || '',
      activo: cliente.activo !== false,
    });
    setActiveTab('general');
    setShowForm(true);
  };
  
  // Función para ver resumen de ventas
  const handleVerResumenVentas = async (cliente) => {
    setSelectedCliente(cliente);
    setShowResumenVentas(true);
    setLoadingResumen(true);
    
    try {
      const data = await api.get(`/api/clientes/${cliente._id}/resumen-ventas`);
      setResumenVentas(data);
    } catch (err) {

      setError('Error al cargar resumen de ventas');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingResumen(false);
    }
  };
  
  // Función para ver historial completo
  const handleVerHistorial = async (cliente) => {
    setSelectedCliente(cliente);
    setShowHistorial(true);
    setLoadingHistorial(true);
    
    try {
      const data = await api.get(`/api/clientes/${cliente._id}/historial`);
      setHistorialData(data.historial);
    } catch (err) {

      setError('Error al cargar el historial');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingHistorial(false);
    }
  };
  
  const handleDelete = async (clienteId) => {
    if (!canDelete) {
      setError('No tienes permiso para eliminar');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
      const data = await api.delete(`/api/clientes/${clienteId}`);
      
      if (data.success) {
        fetchClientes();
      } else {
        setError(data.detail || 'Error al eliminar');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {

      setError('Error al eliminar el cliente');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleToggleActivo = async (clienteId) => {
    try {
      await api.patch(`/api/clientes/${clienteId}/toggle-activo`);
      fetchClientes();
    } catch (err) {

    }
  };
  
  const handleUploadFoto = async (clienteId, file) => {
    setUploadingFoto(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      await api.upload(`/api/clientes/${clienteId}/foto`, formDataUpload);
      fetchClientes();
    } catch (err) {

    } finally {
      setUploadingFoto(false);
    }
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterTipo('');
    setFilterProvincia('');
    setFilterActivo('');
  };
  
  const hasFilters = searchTerm || filterTipo || filterProvincia || filterActivo !== '';
  
  // KPIs
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter(c => c.activo).length;
  const clientesConEmail = clientes.filter(c => c.email).length;

  // Column config handled by useColumnConfig hook
  
  return (
    <div data-testid="clientes-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Clientes</h1>
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
            data-testid="btn-config-clientes"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            data-testid="btn-nuevo-cliente"
          >
            <Plus size={18} />
            Nuevo Cliente
          </PermissionButton>
        </div>
      </div>
      
      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />
      
      {/* KPIs */}
      <div className="grid-3 mb-6">
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>{totalClientes}</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Total Clientes</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>{clientesActivos}</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Activos</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{clientesConEmail}</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Con Email</div>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="card mb-6">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '35px' }}
                placeholder="Nombre, código, NIF, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-clientes"
              />
            </div>
          </div>
          
          <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
            <label className="form-label">Provincia</label>
            <select
              className="form-select"
              value={filterProvincia}
              onChange={(e) => setFilterProvincia(e.target.value)}
            >
              <option value="">Todas</option>
              {provincias.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ minWidth: '120px', marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
          
          {hasFilters && (
            <button
              className="btn btn-secondary"
              onClick={clearFilters}
              style={{ marginBottom: '0' }}
            >
              <X size={16} />
              Limpiar
            </button>
          )}
        </div>
      </div>
      
      {/* Modal Formulario */}
      {showForm && (
        <div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)'}} onClick={()=>{setShowForm(false);setEditingId(null);setFormData(initialFormData);setActiveTab('general');}}>
          <div className="card" style={{maxWidth:'960px',width:'100%',height:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',position:'relative',padding:'2rem',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',paddingBottom:'1rem',borderBottom:'2px solid hsl(var(--border))'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}><div style={{width:'40px',height:'40px',borderRadius:'10px',background:'hsl(var(--primary)/0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><Users size={20} style={{color:'hsl(var(--primary))'}}/></div><div><h2 style={{margin:0,fontSize:'1.3rem',fontWeight:'700'}}>{editingId?'Editar':'Nuevo'} Cliente</h2><span style={{fontSize:'0.8rem',color:'hsl(var(--muted-foreground))'}}>ID: {formData.codigo||nextCodigo}</span></div></div>
              <button onClick={()=>{setShowForm(false);setEditingId(null);setFormData(initialFormData);setActiveTab('general');}} className="config-modal-close-btn"><X size={18}/></button>
            </div>
            <div style={{display:'flex',gap:'0',marginBottom:'1.5rem',borderBottom:'2px solid hsl(var(--border))'}}>
              {[{key:'general',label:'Datos Generales',icon:<Users size={14}/>},{key:'gestion',label:'Datos Gestion',icon:<CreditCard size={14}/>},{key:'documentos',label:'Documentos',icon:<FileText size={14}/>},{key:'certificaciones',label:'Certificaciones',icon:<Award size={14}/>},{key:'centros',label:'Centros Descarga',icon:<Truck size={14}/>},{key:'historial',label:'Historial',icon:<Eye size={14}/>}].map(tab=>(<button key={tab.key} type="button" onClick={()=>{setActiveTab(tab.key);if(tab.key==='historial'&&editingId)fetchChangelog(editingId);}} style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.6rem 1rem',fontSize:'0.8rem',fontWeight:activeTab===tab.key?'700':'500',color:activeTab===tab.key?'hsl(var(--primary))':'hsl(var(--muted-foreground))',background:'none',border:'none',borderBottom:activeTab===tab.key?'2px solid hsl(var(--primary))':'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap',marginBottom:'-2px'}}>{tab.icon}{tab.label}</button>))}
            </div>
            <form onSubmit={handleSubmit} style={{flex:1,overflow:'auto',minHeight:0,paddingRight:'1rem'}}>
              {activeTab==='general'&&(<div>
                <div style={{marginBottom:'1.5rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',marginBottom:'0.75rem'}}>Identificacion</h3>
                  <div style={{display:'grid',gridTemplateColumns:'110px 1fr 170px 200px',gap:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Codigo</label><input type="text" className="form-input" value={formData.codigo||nextCodigo} disabled style={{backgroundColor:'hsl(var(--muted))',textAlign:'center'}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Nombre / Razon Social *</label><input type="text" className="form-input" value={formData.nombre} onChange={e=>setFormData({...formData,nombre:e.target.value})} required/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600',display:'flex',alignItems:'center',gap:'0.35rem'}}>Tipo <button type="button" onClick={()=>setShowTiposManager(true)} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',padding:0}} title="Gestionar tipos"><Settings size={12}/></button></label><select className="form-input" value={formData.tipo||''} onChange={e=>setFormData({...formData,tipo:e.target.value})}><option value="">-- Tipo --</option>{tiposClienteCrud.map(t=><option key={t._id} value={t.nombre}>{t.nombre}</option>)}</select></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>NIF / CIF</label><input type="text" className="form-input" value={formData.nif} onChange={e=>setFormData({...formData,nif:e.target.value})}/></div></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginTop:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Denominacion</label><input type="text" className="form-input" value={formData.denominacion} onChange={e=>setFormData({...formData,denominacion:e.target.value})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Razon Social</label><input type="text" className="form-input" value={formData.razon} onChange={e=>setFormData({...formData,razon:e.target.value})}/></div></div>
                </div>
                <div style={{marginBottom:'1.5rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',marginBottom:'0.75rem'}}>Direccion</h3>
                  <div className="form-group" style={{marginBottom:'0.75rem'}}><input type="text" className="form-input" placeholder="Calle, numero, piso..." value={formData.direccion} onChange={e=>setFormData({...formData,direccion:e.target.value})}/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1.5fr 1.5fr 100px 1fr',gap:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Poblacion</label><input type="text" className="form-input" value={formData.poblacion} onChange={e=>setFormData({...formData,poblacion:e.target.value})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Provincia</label>{(!formData.pais||formData.pais==='España')?<ProvinciaSelect value={formData.provincia} onChange={e=>setFormData({...formData,provincia:e.target.value})}/>:<input type="text" className="form-input" placeholder="Provincia / Region" value={formData.provincia} onChange={e=>setFormData({...formData,provincia:e.target.value})}/>}</div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>C.P.</label><input type="text" className="form-input" value={formData.cod_postal} onChange={e=>setFormData({...formData,cod_postal:e.target.value})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Pais</label><PaisSelect value={formData.pais} onChange={e=>setFormData({...formData,pais:e.target.value,provincia:''})}/></div></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem',marginBottom:'1.5rem'}}><div style={{background:'hsl(var(--muted)/0.3)',borderRadius:'8px',padding:'1rem',border:'1px solid hsl(var(--border))'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',margin:0}}>Telefonos</h3><button type="button" style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',fontWeight:'600',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.25rem'}} onClick={()=>setFormData({...formData,telefonos:[...formData.telefonos,{valor:'',etiqueta:''}]})}><Plus size={14}/> Anadir</button></div>{formData.telefonos.map((tel,idx)=>(<div key={`tel-${idx}`} style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem',alignItems:'center'}}><input type="tel" className="form-input" placeholder="Numero" value={tel.valor} onChange={e=>{const a=[...formData.telefonos];a[idx]={...a[idx],valor:e.target.value};setFormData({...formData,telefonos:a});}} style={{flex:2,fontSize:'0.85rem'}}/><select className="form-input" value={tel.etiqueta} onChange={e=>{const a=[...formData.telefonos];a[idx]={...a[idx],etiqueta:e.target.value};setFormData({...formData,telefonos:a});}} style={{flex:1,fontSize:'0.85rem'}}><option value="">Tipo</option><option value="Fijo">Fijo</option><option value="Movil">Movil</option><option value="Fax">Fax</option></select>{formData.telefonos.length>1&&<button type="button" onClick={()=>setFormData({...formData,telefonos:formData.telefonos.filter((_,i)=>i!==idx)})} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))',padding:'0.25rem'}}><X size={15}/></button>}</div>))}</div><div style={{background:'hsl(var(--muted)/0.3)',borderRadius:'8px',padding:'1rem',border:'1px solid hsl(var(--border))'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',margin:0}}>Emails</h3><button type="button" style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',fontWeight:'600',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.25rem'}} onClick={()=>setFormData({...formData,emails:[...formData.emails,{valor:'',etiqueta:''}]})}><Plus size={14}/> Anadir</button></div>{formData.emails.map((em,idx)=>(<div key={`em-${idx}`} style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem',alignItems:'center'}}><input type="email" className="form-input" placeholder="correo@ejemplo.com" value={em.valor} onChange={e=>{const a=[...formData.emails];a[idx]={...a[idx],valor:e.target.value};setFormData({...formData,emails:a});}} style={{flex:2,fontSize:'0.85rem'}}/><input type="text" className="form-input" placeholder="Dpto." value={em.etiqueta} onChange={e=>{const a=[...formData.emails];a[idx]={...a[idx],etiqueta:e.target.value};setFormData({...formData,emails:a});}} style={{flex:1,fontSize:'0.85rem'}}/>{formData.emails.length>1&&<button type="button" onClick={()=>setFormData({...formData,emails:formData.emails.filter((_,i)=>i!==idx)})} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))',padding:'0.25rem'}}><X size={15}/></button>}</div>))}</div></div>
                <div style={{background:'hsl(var(--muted)/0.3)',borderRadius:'8px',padding:'1rem',border:'1px solid hsl(var(--border))',marginBottom:'1.5rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',margin:0}}>Personas de Contacto</h3><button type="button" style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',fontWeight:'600',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.25rem'}} onClick={()=>setFormData({...formData,contactos:[...formData.contactos,{nombre:'',cargo:'',telefono:'',email:''}]})}><Plus size={14}/> Anadir contacto</button></div>{formData.contactos.map((c,idx)=>(<div key={`ct-${idx}`} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:'0.5rem',marginBottom:'0.5rem',alignItems:'center'}}><input type="text" className="form-input" placeholder="Nombre" value={c.nombre} onChange={e=>{const a=[...formData.contactos];a[idx]={...a[idx],nombre:e.target.value};setFormData({...formData,contactos:a});}} style={{fontSize:'0.85rem'}}/><input type="text" className="form-input" placeholder="Cargo" value={c.cargo} onChange={e=>{const a=[...formData.contactos];a[idx]={...a[idx],cargo:e.target.value};setFormData({...formData,contactos:a});}} style={{fontSize:'0.85rem'}}/><input type="tel" className="form-input" placeholder="Telefono" value={c.telefono} onChange={e=>{const a=[...formData.contactos];a[idx]={...a[idx],telefono:e.target.value};setFormData({...formData,contactos:a});}} style={{fontSize:'0.85rem'}}/><input type="email" className="form-input" placeholder="Email" value={c.email} onChange={e=>{const a=[...formData.contactos];a[idx]={...a[idx],email:e.target.value};setFormData({...formData,contactos:a});}} style={{fontSize:'0.85rem'}}/>{formData.contactos.length>1&&<button type="button" onClick={()=>setFormData({...formData,contactos:formData.contactos.filter((_,i)=>i!==idx)})} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))',padding:'0.25rem'}}><X size={15}/></button>}</div>))}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'1rem',alignItems:'start',marginBottom:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Observaciones</label><textarea className="form-input" rows="2" value={formData.observaciones} onChange={e=>setFormData({...formData,observaciones:e.target.value})} style={{fontSize:'0.85rem',resize:'vertical'}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Avisos</label><textarea className="form-input" rows="2" value={formData.avisos||''} onChange={e=>setFormData({...formData,avisos:e.target.value})} style={{fontSize:'0.85rem',resize:'vertical'}}/></div><div style={{paddingTop:'1.5rem'}}><label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',padding:'0.5rem 1rem',borderRadius:'8px',background:formData.activo?'hsl(142 76% 36%/0.1)':'hsl(var(--muted))',border:'1px solid '+(formData.activo?'hsl(142 76% 36%/0.3)':'hsl(var(--border))')}}><input type="checkbox" checked={formData.activo} onChange={e=>setFormData({...formData,activo:e.target.checked})} style={{width:'16px',height:'16px'}}/><span style={{fontWeight:'600',fontSize:'0.85rem',color:formData.activo?'hsl(142 76% 36%)':'hsl(var(--muted-foreground))'}}>{formData.activo?'Activo':'Inactivo'}</span></label></div></div>
                <div style={{display:'grid',gridTemplateColumns:'378px 1fr',gap:'1rem',marginBottom:'0.5rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Web</label><input type="url" className="form-input" placeholder="https://..." value={formData.web} onChange={e=>setFormData({...formData,web:e.target.value})} style={{fontSize:'0.85rem'}}/></div><div></div></div>
              </div>)}
              {activeTab==='gestion'&&(<div>
                <div style={{marginBottom:'1.5rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',marginBottom:'0.75rem'}}>Datos Fiscales y Contables</h3><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600',display:'flex',alignItems:'center',gap:'0.35rem'}}>Forma de Pago <button type="button" onClick={()=>setShowFormasPagoManager(true)} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',padding:0}}><Settings size={12}/></button></label><select className="form-input" value={formData.datos_gestion?.forma_pago||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,forma_pago:e.target.value}})}><option value="">-- Seleccionar --</option>{formasPago.map(f=><option key={f._id} value={f.nombre}>{f.nombre}</option>)}</select></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Dias de Pago</label><input type="text" className="form-input" placeholder="30, 60, 90" value={formData.datos_gestion?.dias_pago||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,dias_pago:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Moneda</label><select className="form-input" value={formData.datos_gestion?.moneda||'EUR'} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,moneda:e.target.value}})}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600',display:'flex',alignItems:'center',gap:'0.35rem'}}>Tipo Operacion <button type="button" onClick={()=>setShowTiposOpManager(true)} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',padding:0}}><Settings size={12}/></button></label><select className="form-input" value={formData.datos_gestion?.tipo_operacion||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,tipo_operacion:e.target.value}})}><option value="">-- Seleccionar --</option>{tiposOperacion.map(t=><option key={t._id} value={t.nombre}>{t.nombre}</option>)}</select></div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600',display:'flex',alignItems:'center',gap:'0.35rem'}}>IVA <button type="button" onClick={()=>setShowTiposIvaManager(true)} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',padding:0}}><Settings size={12}/></button></label><select className="form-input" value={formData.datos_gestion?.iva||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,iva:e.target.value}})}><option value="">-- Seleccionar --</option>{tiposIva.map(t=><option key={t._id} value={t.valor}>{t.nombre}</option>)}</select></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>IRPF (%)</label><input type="text" className="form-input" placeholder="0" value={formData.datos_gestion?.irpf||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,irpf:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Subcuenta</label><input type="text" className="form-input" value={formData.datos_gestion?.subcuenta||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,subcuenta:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Subcuenta Gastos</label><input type="text" className="form-input" value={formData.datos_gestion?.subcuenta_gastos||''} onChange={e=>setFormData({...formData,datos_gestion:{...formData.datos_gestion,subcuenta_gastos:e.target.value}})}/></div></div></div>
                <div style={{background:'hsl(var(--muted)/0.3)',borderRadius:'8px',padding:'1rem',border:'1px solid hsl(var(--border))'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',marginBottom:'0.75rem'}}>Datos para Transferencia</h3><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Banco</label><input type="text" className="form-input" value={formData.datos_bancarios?.banco||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,banco:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Sucursal</label><input type="text" className="form-input" value={formData.datos_bancarios?.sucursal||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,sucursal:e.target.value}})}/></div></div><div className="form-group" style={{marginBottom:'0.75rem'}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>IBAN</label><input type="text" className="form-input" placeholder="ES00 0000 0000 00 0000000000" value={formData.datos_bancarios?.iban||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,iban:e.target.value}})}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 1fr 1fr',gap:'0.75rem'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Entidad</label><input type="text" className="form-input" value={formData.datos_bancarios?.entidad||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,entidad:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Sucursal</label><input type="text" className="form-input" value={formData.datos_bancarios?.sucursal_num||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,sucursal_num:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>D.C.</label><input type="text" className="form-input" value={formData.datos_bancarios?.dc||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,dc:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Cuenta</label><input type="text" className="form-input" value={formData.datos_bancarios?.cuenta||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,cuenta:e.target.value}})}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.75rem',fontWeight:'600'}}>Swift / BIC</label><input type="text" className="form-input" value={formData.datos_bancarios?.swift_bic||''} onChange={e=>setFormData({...formData,datos_bancarios:{...formData.datos_bancarios,swift_bic:e.target.value}})}/></div></div></div>
              </div>)}
              {activeTab==='documentos'&&(<div style={{textAlign:'center',padding:'2rem',color:'hsl(var(--muted-foreground))'}}><FileText size={40} style={{margin:'0 auto 1rem',opacity:0.4}}/><p style={{fontSize:'0.9rem',fontWeight:'500'}}>Guarda el cliente primero para adjuntar documentos</p></div>)}
              {activeTab==='certificaciones'&&(<div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',margin:0}}>Certificaciones</h3><button type="button" style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',fontWeight:'600',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.25rem'}} onClick={()=>setFormData({...formData,certificaciones:[...(formData.certificaciones||[]),{nombre:'',fecha_emision:'',fecha_validez:'',observaciones:''}]})}><Plus size={14}/> Anadir</button></div>{(formData.certificaciones||[]).length===0&&<div style={{textAlign:'center',padding:'2rem',color:'hsl(var(--muted-foreground))',background:'hsl(var(--muted)/0.3)',borderRadius:'8px'}}><Award size={32} style={{margin:'0 auto 0.5rem',opacity:0.4}}/><p style={{fontSize:'0.85rem'}}>Sin certificaciones</p></div>}{(formData.certificaciones||[]).map((cert,idx)=>(<div key={`cert-${idx}`} style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1.5fr auto',gap:'0.5rem',marginBottom:'0.5rem',background:'hsl(var(--muted)/0.3)',padding:'0.75rem',borderRadius:'8px',border:'1px solid hsl(var(--border))',alignItems:'center'}}><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.7rem',fontWeight:'600'}}>Certificacion</label><input type="text" className="form-input" placeholder="BRC, Global GAP..." value={cert.nombre} onChange={e=>{const a=[...formData.certificaciones];a[idx]={...a[idx],nombre:e.target.value};setFormData({...formData,certificaciones:a});}} style={{fontSize:'0.85rem'}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.7rem',fontWeight:'600'}}>Emision</label><input type="date" className="form-input" value={cert.fecha_emision||''} onChange={e=>{const a=[...formData.certificaciones];a[idx]={...a[idx],fecha_emision:e.target.value};setFormData({...formData,certificaciones:a});}} style={{fontSize:'0.85rem'}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.7rem',fontWeight:'600'}}>Validez</label><input type="date" className="form-input" value={cert.fecha_validez||''} onChange={e=>{const a=[...formData.certificaciones];a[idx]={...a[idx],fecha_validez:e.target.value};setFormData({...formData,certificaciones:a});}} style={{fontSize:'0.85rem'}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label" style={{fontSize:'0.7rem',fontWeight:'600'}}>Notas</label><input type="text" className="form-input" value={cert.observaciones||''} onChange={e=>{const a=[...formData.certificaciones];a[idx]={...a[idx],observaciones:e.target.value};setFormData({...formData,certificaciones:a});}} style={{fontSize:'0.85rem'}}/></div><button type="button" onClick={()=>setFormData({...formData,certificaciones:formData.certificaciones.filter((_,i)=>i!==idx)})} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))',padding:'0.25rem',marginTop:'1.2rem'}}><X size={15}/></button></div>))}</div>)}
              {activeTab==='centros'&&(<div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',margin:0}}>Centros de Descarga</h3><button type="button" style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--primary))',fontWeight:'600',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.25rem'}} onClick={()=>setFormData({...formData,centros_descarga:[...(formData.centros_descarga||[]),{nombre:'',direccion:'',poblacion:'',provincia:'',codigo_postal:'',contacto:'',telefono:''}]})}><Plus size={14}/> Anadir centro</button></div>{(formData.centros_descarga||[]).length===0&&<div style={{textAlign:'center',padding:'2rem',color:'hsl(var(--muted-foreground))',background:'hsl(var(--muted)/0.3)',borderRadius:'8px'}}><Truck size={32} style={{margin:'0 auto 0.5rem',opacity:0.4}}/><p style={{fontSize:'0.85rem'}}>Sin centros de descarga</p></div>}{(formData.centros_descarga||[]).map((centro,idx)=>(<div key={`cd-${idx}`} style={{background:'hsl(var(--muted)/0.3)',padding:'1rem',borderRadius:'8px',border:'1px solid hsl(var(--border))',marginBottom:'0.75rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}><span style={{fontWeight:'600',fontSize:'0.8rem'}}>Centro {idx+1}</span><button type="button" onClick={()=>setFormData({...formData,centros_descarga:formData.centros_descarga.filter((_,i)=>i!==idx)})} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))'}}><X size={15}/></button></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.5rem'}}><input type="text" className="form-input" placeholder="Nombre" value={centro.nombre} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],nombre:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/><input type="text" className="form-input" placeholder="Direccion" value={centro.direccion||''} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],direccion:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 1fr 1fr',gap:'0.5rem'}}><input type="text" className="form-input" placeholder="Poblacion" value={centro.poblacion||''} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],poblacion:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/><input type="text" className="form-input" placeholder="Provincia" value={centro.provincia||''} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],provincia:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/><input type="text" className="form-input" placeholder="C.P." value={centro.codigo_postal||''} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],codigo_postal:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/><input type="text" className="form-input" placeholder="Contacto" value={centro.contacto||''} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],contacto:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/><input type="tel" className="form-input" placeholder="Telefono" value={centro.telefono||''} onChange={e=>{const a=[...formData.centros_descarga];a[idx]={...a[idx],telefono:e.target.value};setFormData({...formData,centros_descarga:a});}} style={{fontSize:'0.85rem'}}/></div></div>))}</div>)}
              {activeTab==='historial'&&(<div><h3 style={{fontSize:'0.75rem',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.08em',color:'hsl(var(--muted-foreground))',marginBottom:'1rem'}}>Log de Cambios</h3>{!editingId?<div style={{textAlign:'center',padding:'2rem',color:'hsl(var(--muted-foreground))',background:'hsl(var(--muted)/0.3)',borderRadius:'8px'}}><p style={{fontSize:'0.85rem'}}>El historial estara disponible una vez guardado el cliente</p></div>:changelog.length===0?<div style={{textAlign:'center',padding:'2rem',color:'hsl(var(--muted-foreground))',background:'hsl(var(--muted)/0.3)',borderRadius:'8px'}}><p style={{fontSize:'0.85rem'}}>Sin cambios registrados</p></div>:<div style={{maxHeight:'400px',overflow:'auto'}}>{changelog.map((entry,idx)=>(<div key={entry._id||idx} style={{borderLeft:'3px solid '+(entry.action==='creacion'?'hsl(142 76% 36%)':entry.action==='eliminacion'?'hsl(var(--destructive))':'hsl(var(--primary))'),padding:'0.75rem 1rem',marginBottom:'0.75rem',background:'hsl(var(--muted)/0.2)',borderRadius:'0 8px 8px 0'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{padding:'0.15rem 0.5rem',borderRadius:'4px',fontSize:'0.7rem',fontWeight:'600',textTransform:'uppercase',backgroundColor:entry.action==='creacion'?'hsl(142 76% 36%/0.1)':entry.action==='eliminacion'?'hsl(var(--destructive)/0.1)':'hsl(var(--primary)/0.1)',color:entry.action==='creacion'?'hsl(142 76% 36%)':entry.action==='eliminacion'?'hsl(var(--destructive))':'hsl(var(--primary))'}}>{entry.action}</span><span style={{fontSize:'0.8rem',fontWeight:'600'}}>{entry.user_name}</span></div><span style={{fontSize:'0.75rem',color:'hsl(var(--muted-foreground))'}}>{new Date(entry.timestamp).toLocaleString('es-ES')}</span></div>{entry.changes&&entry.changes.length>0&&<div style={{marginTop:'0.4rem'}}>{entry.changes.map((ch,ci)=>(<div key={ci} style={{fontSize:'0.8rem',padding:'0.2rem 0',display:'flex',gap:'0.5rem',flexWrap:'wrap'}}><span style={{fontWeight:'600',minWidth:'120px'}}>{ch.field}:</span>{ch.old&&<span style={{color:'hsl(var(--destructive))',textDecoration:'line-through'}}>{ch.old.substring(0,80)}</span>}<span style={{color:'hsl(142 76% 36%)'}}>{ch.new?.substring(0,80)}</span></div>))}</div>}</div>))}</div>}</div>)}
              <div style={{borderTop:'1px solid hsl(var(--border))',paddingTop:'1rem',marginTop:'1.25rem',display:'flex',justifyContent:'flex-end',gap:'0.75rem'}}><button type="button" className="btn btn-secondary" onClick={()=>{setShowForm(false);setEditingId(null);setFormData(initialFormData);setActiveTab('general');}}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId?'Actualizar':'Crear'} Cliente</button></div>
            </form>
          </div>
        </div>
      )}
      {showTiposManager&&(<div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:'1rem',backdropFilter:'blur(4px)'}} onClick={()=>setShowTiposManager(false)}><div className="card" style={{maxWidth:'450px',width:'100%',padding:'1.5rem',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',paddingBottom:'0.75rem',borderBottom:'2px solid hsl(var(--border))'}}><h3 style={{margin:0,fontSize:'1.1rem',fontWeight:'700'}}>Tipos de Cliente</h3><button onClick={()=>setShowTiposManager(false)} className="config-modal-close-btn"><X size={16}/></button></div><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}><input type="text" className="form-input" placeholder="Nuevo tipo..." value={nuevoTipo} onChange={e=>setNuevoTipo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),handleAddTipoCl())} style={{flex:1}}/><button type="button" className="btn btn-primary" onClick={handleAddTipoCl} disabled={!nuevoTipo.trim()}><Plus size={16}/></button></div><div style={{maxHeight:'300px',overflow:'auto'}}>{tiposClienteCrud.map(tipo=>(<div key={tipo._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.75rem',borderRadius:'6px',marginBottom:'0.35rem',background:'hsl(var(--muted)/0.3)',border:'1px solid hsl(var(--border))'}}><span style={{fontSize:'0.9rem'}}>{tipo.nombre}</span><button onClick={()=>handleDeleteTipoCl(tipo._id)} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))',padding:'0.25rem'}}><Trash2 size={14}/></button></div>))}</div></div></div>)}
      {showTiposOpManager&&(<div style={{position:'fixed',inset:0,backgroundColor:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:'1rem',backdropFilter:'blur(4px)'}} onClick={()=>setShowTiposOpManager(false)}><div className="card" style={{maxWidth:'450px',width:'100%',padding:'1.5rem',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',paddingBottom:'0.75rem',borderBottom:'2px solid hsl(var(--border))'}}><h3 style={{margin:0,fontSize:'1.1rem',fontWeight:'700'}}>Tipos de Operacion</h3><button onClick={()=>setShowTiposOpManager(false)} className="config-modal-close-btn"><X size={16}/></button></div><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}><input type="text" className="form-input" placeholder="Nuevo tipo..." value={nuevoTipoOp} onChange={e=>setNuevoTipoOp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),handleAddTipoOp())} style={{flex:1}}/><button type="button" className="btn btn-primary" onClick={handleAddTipoOp} disabled={!nuevoTipoOp.trim()}><Plus size={16}/></button></div><div style={{maxHeight:'300px',overflow:'auto'}}>{tiposOperacion.map(tipo=>(<div key={tipo._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.75rem',borderRadius:'6px',marginBottom:'0.35rem',background:'hsl(var(--muted)/0.3)',border:'1px solid hsl(var(--border))'}}><span style={{fontSize:'0.9rem'}}>{tipo.nombre}</span><button onClick={()=>handleDeleteTipoOp(tipo._id)} style={{background:'none',border:'none',cursor:'pointer',color:'hsl(var(--destructive))',padding:'0.25rem'}}><Trash2 size={14}/></button></div>))}</div></div></div>)}
      {showFormasPagoManager && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowFormasPagoManager(false)}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Formas de Pago</h3>
              <button onClick={() => setShowFormasPagoManager(false)} className="config-modal-close-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" className="form-input" placeholder="Nueva forma de pago..." value={nuevaFormaPago} onChange={(e) => setNuevaFormaPago(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFormaPago())} style={{ flex: 1 }} />
              <button type="button" className="btn btn-primary" onClick={handleAddFormaPago} disabled={!nuevaFormaPago.trim()}><Plus size={16} /></button>
            </div>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {formasPago.map(f => (
                <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem', background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: '0.9rem' }}>{f.nombre}</span>
                  <button onClick={() => handleDeleteFormaPago(f._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showTiposIvaManager && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowTiposIvaManager(false)}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Tipos de IVA</h3>
              <button onClick={() => setShowTiposIvaManager(false)} className="config-modal-close-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" className="form-input" placeholder="Nombre (Ej: General 21%)" value={nuevoTipoIva.nombre} onChange={(e) => setNuevoTipoIva({ ...nuevoTipoIva, nombre: e.target.value })} style={{ flex: 2 }} />
              <input type="text" className="form-input" placeholder="%" value={nuevoTipoIva.valor} onChange={(e) => setNuevoTipoIva({ ...nuevoTipoIva, valor: e.target.value })} style={{ flex: 1, maxWidth: '80px' }} />
              <button type="button" className="btn btn-primary" onClick={handleAddTipoIva} disabled={!nuevoTipoIva.nombre.trim()}><Plus size={16} /></button>
            </div>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {tiposIva.map(t => (
                <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem', background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: '0.9rem' }}>{t.nombre}</span>
                  <button onClick={() => handleDeleteTipoIva(t._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <h2 className="card-title">Listado de Clientes</h2>
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : clientes.length === 0 ? (
          <p className="text-muted">{t('common.noData')}</p>
        ) : (
          <div className="table-container">
            <table data-testid="clientes-table">
              <thead>
                <tr>
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente._id}>
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'codigo': return <td key="codigo"><code style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.85rem' }}>{cliente.codigo || '-'}</code></td>;
                        case 'nombre': return <td key="nombre"><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{cliente.foto_url ? <img src={`${BACKEND_URL}${cliente.foto_url}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} /> : null}<div><div>{cliente.nombre}</div>{cliente.razon ? <div style={{ fontSize: '0.75rem', color: '#666' }}>{cliente.razon}</div> : null}</div></div></td>;
                        case 'nif': return <td key="nif">{cliente.nif || '-'}</td>;
                        case 'tipo': return <td key="tipo">{cliente.tipo ? <span style={{ padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1' }}>{cliente.tipo}</span> : '-'}</td>;
                        case 'poblacion': return <td key="poblacion">{cliente.poblacion || '-'}</td>;
                        case 'provincia': return <td key="provincia">{cliente.provincia || '-'}</td>;
                        case 'telefono': return <td key="telefono">{cliente.telefono || cliente.movil || '-'}</td>;
                        case 'email': return <td key="email">{cliente.email ? <a href={`mailto:${cliente.email}`} style={{ color: 'var(--primary)' }}>{cliente.email}</a> : '-'}</td>;
                        case 'direccion': return <td key="direccion">{cliente.direccion || '-'}</td>;
                        case 'cod_postal': return <td key="cod_postal">{cliente.cod_postal || '-'}</td>;
                        case 'contacto': return <td key="contacto">{cliente.contacto || '-'}</td>;
                        case 'web': return <td key="web">{cliente.web ? <a href={cliente.web} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>{cliente.web}</a> : '-'}</td>;
                        case 'observaciones': return <td key="observaciones" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente.observaciones || '-'}</td>;
                        case 'estado': return <td key="estado"><span onClick={() => canEdit && handleToggleActivo(cliente._id)} style={{ padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: canEdit ? 'pointer' : 'default', backgroundColor: cliente.activo ? '#dcfce7' : '#fee2e2', color: cliente.activo ? '#166534' : '#dc2626' }}>{cliente.activo ? 'Activo' : 'Inactivo'}</span></td>;
                        default: return null;
                      }
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleVerResumenVentas(cliente)}
                          title="Ver resumen de ventas"
                          data-testid={`ventas-cliente-${cliente._id}`}
                        >
                          <TrendingUp size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleVerHistorial(cliente)}
                          title="Ver historial completo"
                          data-testid={`historial-cliente-${cliente._id}`}
                        >
                          <Eye size={14} />
                        </button>
                        {canEdit ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEdit(cliente)}
                            title="Editar"
                            data-testid={`edit-cliente-${cliente._id}`}
                          >
                            <Edit2 size={14} />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            className="btn btn-sm btn-error"
                            onClick={() => handleDelete(cliente._id)}
                            title="Eliminar"
                            data-testid={`delete-cliente-${cliente._id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal Resumen de Ventas */}
      {showResumenVentas && selectedCliente && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 1
            }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={24} />
                  Resumen de Ventas
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--muted-foreground))' }}>
                  {selectedCliente.nombre} {selectedCliente.razon ? `(${selectedCliente.razon})` : ''}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowResumenVentas(false);
                  setSelectedCliente(null);
                  setResumenVentas(null);
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              {loadingResumen ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Cargando resumen...</p>
                </div>
              ) : resumenVentas ? (
                <>
                  {/* KPIs del cliente */}
                  <div className="grid-4" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div style={{
                      backgroundColor: '#dbeafe',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e40af' }}>
                        {resumenVentas.resumen?.total_contratos || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>Contratos de Venta</div>
                    </div>
                    <div style={{
                      backgroundColor: '#dcfce7',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#166534' }}>
                        {(resumenVentas.resumen?.total_cantidad_kg || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#166534' }}>Kg Totales</div>
                    </div>
                    <div style={{
                      backgroundColor: '#fef3c7',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#92400e' }}>
                        €{(resumenVentas.resumen?.total_importe || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Importe Contratos</div>
                    </div>
                    <div style={{
                      backgroundColor: '#f3e8ff',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7c3aed' }}>
                        {resumenVentas.resumen?.total_albaranes || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#7c3aed' }}>Albaranes</div>
                    </div>
                  </div>
                  
                  {/* Ventas por Campaña */}
                  {resumenVentas.ventas_por_campana?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} />
                        Ventas por Campaña
                      </h3>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Campaña</th>
                              <th>Nº Contratos</th>
                              <th>Cultivos</th>
                              <th>Cantidad (kg)</th>
                              <th>Importe (€)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumenVentas.ventas_por_campana.map((venta, idx) => (
                              <tr key={idx}>
                                <td className="font-semibold">{venta.campana}</td>
                                <td>{venta.num_contratos}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    {venta.cultivos?.filter(c => c).map((cultivo, cidx) => (
                                      <span
                                        key={cidx}
                                        style={{
                                          padding: '0.125rem 0.5rem',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem',
                                          backgroundColor: '#e0f2fe',
                                          color: '#0369a1'
                                        }}
                                      >
                                        {cultivo}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td>{venta.cantidad_total?.toLocaleString()}</td>
                                <td className="font-semibold">€{venta.importe_total?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Lista de Contratos */}
                  {resumenVentas.contratos?.length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={18} />
                        Detalle de Contratos
                      </h3>
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Contrato</th>
                              <th>Fecha</th>
                              <th>Campaña</th>
                              <th>Cultivo</th>
                              <th>Cantidad (kg)</th>
                              <th>Precio (€/kg)</th>
                              <th>Total (€)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumenVentas.contratos.map((contrato) => (
                              <tr key={contrato._id}>
                                <td className="font-semibold">
                                  {contrato.serie || 'MP'}-{contrato.año}-{String(contrato.numero || 0).padStart(3, '0')}
                                </td>
                                <td>{contrato.fecha_contrato ? new Date(contrato.fecha_contrato).toLocaleDateString() : '-'}</td>
                                <td>{contrato.campana}</td>
                                <td>{contrato.cultivo}</td>
                                <td>{contrato.cantidad?.toLocaleString()}</td>
                                <td>€{contrato.precio?.toFixed(2)}</td>
                                <td className="font-semibold">
                                  €{((contrato.cantidad || 0) * (contrato.precio || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {resumenVentas.contratos?.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                      <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                      <p>Este cliente aún no tiene contratos de venta registrados.</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>No se pudo cargar el resumen</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Historial Completo */}
      {showHistorial && selectedCliente && (
        <div 
          onClick={() => setShowHistorial(false)} 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: 'hsl(var(--card))',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '85vh', 
              overflow: 'auto'
            }}
          >
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'hsl(var(--card))',
              zIndex: 1
            }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={24} />
                  Historial de {selectedCliente.nombre}
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  {selectedCliente.nif || 'Sin NIF'} - {selectedCliente.poblacion || 'Sin ubicación'}
                </p>
              </div>
              <button onClick={() => setShowHistorial(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {loadingHistorial ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Cargando historial...</p>
                </div>
              ) : historialData ? (
                <>
                  {/* Resumen */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
                        {historialData.total_ventas?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '0 €'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Ventas</div>
                    </div>
                    <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{historialData.num_contratos || 0}</div>
                      <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Contratos</div>
                    </div>
                    <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{historialData.num_albaranes || 0}</div>
                      <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Albaranes</div>
                    </div>
                  </div>

                  {/* Gráfico de Tendencia - Contratos por Campaña */}
                  {historialData.contratos?.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} />
                        Evolución de Ventas
                      </h4>
                      <div style={{ height: '180px', background: 'hsl(var(--muted) / 0.2)', borderRadius: '8px', padding: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={
                            // Agrupar contratos por campaña
                            Object.entries(
                              historialData.contratos.reduce((acc, c) => {
                                const campana = c.campana || 'Sin campaña';
                                if (!acc[campana]) acc[campana] = { campana, kg: 0, importe: 0 };
                                acc[campana].kg += c.cantidad || 0;
                                acc[campana].importe += (c.cantidad || 0) * (c.precio || 0);
                                return acc;
                              }, {})
                            ).map(([_, v]) => v).sort((a, b) => a.campana.localeCompare(b.campana))
                          }>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="campana" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'kg' ? `${value.toLocaleString()} kg` : `€${value.toLocaleString()}`,
                                name === 'kg' ? 'Cantidad' : 'Importe'
                              ]}
                              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            />
                            <Bar dataKey="kg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="kg" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Lista de contratos */}
                  {historialData.contratos?.length > 0 ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} />
                        Contratos
                      </h4>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {historialData.contratos.map(c => (
                          <div key={c._id} style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid hsl(var(--border))',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: '500' }}>
                                {c.serie || 'MP'}-{c.año}-{String(c.numero || 0).padStart(3, '0')}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                {c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString('es-ES') : '-'}
                                {c.cultivo && ` • ${c.cultivo}`}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>
                                {c.cantidad?.toLocaleString()} kg
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                €{c.precio}/kg
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '1rem' }}>
                      No hay contratos registrados con este cliente
                    </p>
                  )}

                  {/* Lista de albaranes */}
                  {historialData.albaranes?.length > 0 && (
                    <div>
                      <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={18} />
                        Albaranes de Venta
                      </h4>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {historialData.albaranes.map(a => (
                          <div key={a._id} style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid hsl(var(--border))',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: '500' }}>Albarán {a.numero || ''}</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                {a.fecha ? new Date(a.fecha).toLocaleDateString('es-ES') : '-'}
                              </div>
                            </div>
                            <div style={{ fontWeight: '600', color: 'hsl(142 76% 36%)' }}>
                              {a.total?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                  <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>No hay historial disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
