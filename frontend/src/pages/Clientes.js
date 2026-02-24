import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, X, Upload, User, Phone, Mail, MapPin, Building, Globe, TrendingUp, FileText, Package, Eye, Settings } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos visibles en tabla
const DEFAULT_FIELDS_CONFIG = {
  codigo: true,
  nombre: true,
  nif: true,
  tipo: true,
  poblacion: true,
  provincia: false,
  telefono: true,
  email: true,
  direccion: false,
  cod_postal: false,
  contacto: false,
  web: false,
  observaciones: false,
  estado: true
};

const FIELD_LABELS = {
  codigo: 'Código',
  nombre: 'Nombre',
  nif: 'NIF/CIF',
  tipo: 'Tipo',
  poblacion: 'Población',
  provincia: 'Provincia',
  telefono: 'Teléfono',
  email: 'Email',
  direccion: 'Dirección',
  cod_postal: 'Código Postal',
  contacto: 'Contacto',
  web: 'Web',
  observaciones: 'Observaciones',
  estado: 'Estado'
};

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
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('clientes_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Estado para el resumen de ventas
  const [showResumenVentas, setShowResumenVentas] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [resumenVentas, setResumenVentas] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();
  
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
    telefono: '',
    movil: '',
    fax: '',
    sii_tipo_id_pais: '',
    clave_identificacion: '',
    contacto: '',
    consultor: '',
    email: '',
    web: '',
    observaciones: '',
    idioma: 'Español',
    tipo: '',
    nombre_verifactu: '',
    protegido: false,
    activo: true
  };
  
  const [formData, setFormData] = useState(initialFormData);
  
  useEffect(() => {
    fetchClientes();
    fetchTipos();
    fetchProvincias();
  }, [searchTerm, filterTipo, filterProvincia, filterActivo]);
  
  const fetchClientes = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/clientes?limit=200`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterTipo) url += `&tipo=${encodeURIComponent(filterTipo)}`;
      if (filterProvincia) url += `&provincia=${encodeURIComponent(filterProvincia)}`;
      if (filterActivo !== '') url += `&activo=${filterActivo}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { status: response.status, message: data.detail };
      }
      
      setClientes(data.clientes || []);
    } catch (err) {
      console.error('Error fetching clientes:', err);
      const errorMsg = handlePermissionError(err, 'ver los clientes');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTipos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/clientes/tipos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTipos(data.tipos || []);
      }
    } catch (err) {
      console.error('Error fetching tipos:', err);
    }
  };
  
  const fetchProvincias = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/clientes/provincias`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProvincias(data.provincias || []);
      }
    } catch (err) {
      console.error('Error fetching provincias:', err);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId
        ? `${BACKEND_URL}/api/clientes/${editingId}`
        : `${BACKEND_URL}/api/clientes`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
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
      console.error('Error saving cliente:', err);
      setError('Error al guardar el cliente');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (cliente) => {
    setEditingId(cliente._id);
    setFormData({
      codigo: cliente.codigo || '',
      nombre: cliente.nombre || '',
      razon: cliente.razon || '',
      denominacion: cliente.denominacion || '',
      nif: cliente.nif || '',
      segundo_codigo: cliente.segundo_codigo || '',
      direccion: cliente.direccion || '',
      pais: cliente.pais || 'España',
      cod_postal: cliente.cod_postal || '',
      poblacion: cliente.poblacion || '',
      provincia: cliente.provincia || '',
      coor_gps: cliente.coor_gps || '',
      telefono: cliente.telefono || '',
      movil: cliente.movil || '',
      fax: cliente.fax || '',
      sii_tipo_id_pais: cliente.sii_tipo_id_pais || '',
      clave_identificacion: cliente.clave_identificacion || '',
      contacto: cliente.contacto || '',
      consultor: cliente.consultor || '',
      email: cliente.email || '',
      web: cliente.web || '',
      observaciones: cliente.observaciones || '',
      idioma: cliente.idioma || 'Español',
      tipo: cliente.tipo || '',
      nombre_verifactu: cliente.nombre_verifactu || '',
      protegido: cliente.protegido || false,
      activo: cliente.activo !== false
    });
    setShowForm(true);
  };
  
  // Función para ver resumen de ventas
  const handleVerResumenVentas = async (cliente) => {
    setSelectedCliente(cliente);
    setShowResumenVentas(true);
    setLoadingResumen(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/clientes/${cliente._id}/resumen-ventas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResumenVentas(data);
      } else {
        setError('Error al cargar resumen de ventas');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Error fetching resumen ventas:', err);
      setError('Error al cargar resumen de ventas');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoadingResumen(false);
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
      const response = await fetch(`${BACKEND_URL}/api/clientes/${clienteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchClientes();
      } else {
        setError(data.detail || 'Error al eliminar');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Error deleting cliente:', err);
      setError('Error al eliminar el cliente');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleToggleActivo = async (clienteId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/clientes/${clienteId}/toggle-activo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchClientes();
      }
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };
  
  const handleUploadFoto = async (clienteId, file) => {
    setUploadingFoto(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const response = await fetch(`${BACKEND_URL}/api/clientes/${clienteId}/foto`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });
      
      if (response.ok) {
        fetchClientes();
      }
    } catch (err) {
      console.error('Error uploading foto:', err);
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

  useEffect(() => {
    localStorage.setItem('clientes_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);

  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  return (
    <div data-testid="clientes-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Clientes</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title="Configurar columnas"
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
      
      {/* Configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Columnas Visibles</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
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
      
      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" data-testid="cliente-form">
          <h2 className="card-title">{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Sección: Identificación */}
            <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> Identificación
              </h4>
              <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="form-group">
                  <label className="form-label">Código</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    placeholder="Auto-generado"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                    data-testid="input-nombre-cliente"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Razón Social</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.razon}
                    onChange={(e) => setFormData({...formData, razon: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">NIF/CIF</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nif}
                    onChange={(e) => setFormData({...formData, nif: e.target.value})}
                    data-testid="input-nif-cliente"
                  />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Denominación</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.denominacion}
                    onChange={(e) => setFormData({...formData, denominacion: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">2º Código</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.segundo_codigo}
                    onChange={(e) => setFormData({...formData, segundo_codigo: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {tipos.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Sección: Dirección */}
            <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} /> Dirección
              </h4>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                />
              </div>
              <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="form-group">
                  <label className="form-label">País</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.pais}
                    onChange={(e) => setFormData({...formData, pais: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Código Postal</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cod_postal}
                    onChange={(e) => setFormData({...formData, cod_postal: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Población</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.poblacion}
                    onChange={(e) => setFormData({...formData, poblacion: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Provincia</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.provincia}
                    onChange={(e) => setFormData({...formData, provincia: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Coordenadas GPS</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.coor_gps}
                  onChange={(e) => setFormData({...formData, coor_gps: e.target.value})}
                  placeholder="Ej: 40.4168, -3.7038"
                />
              </div>
            </div>
            
            {/* Sección: Contacto */}
            <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} /> Contacto
              </h4>
              <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono/s</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Móvil</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.movil}
                    onChange={(e) => setFormData({...formData, movil: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">FAX</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.fax}
                    onChange={(e) => setFormData({...formData, fax: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Persona de Contacto</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.contacto}
                    onChange={(e) => setFormData({...formData, contacto: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    data-testid="input-email-cliente"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Web</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.web}
                    onChange={(e) => setFormData({...formData, web: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
            
            {/* Sección: Datos Adicionales */}
            <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={16} /> Datos Adicionales
              </h4>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">SII Tipo ID País</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sii_tipo_id_pais}
                    onChange={(e) => setFormData({...formData, sii_tipo_id_pais: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Clave Nº Identificación</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.clave_identificacion}
                    onChange={(e) => setFormData({...formData, clave_identificacion: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Consultor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.consultor}
                    onChange={(e) => setFormData({...formData, consultor: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Idioma</label>
                  <select
                    className="form-select"
                    value={formData.idioma}
                    onChange={(e) => setFormData({...formData, idioma: e.target.value})}
                  >
                    <option value="Español">Español</option>
                    <option value="Inglés">Inglés</option>
                    <option value="Francés">Francés</option>
                    <option value="Alemán">Alemán</option>
                    <option value="Italiano">Italiano</option>
                    <option value="Portugués">Portugués</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre Verifactu</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre_verifactu}
                    onChange={(e) => setFormData({...formData, nombre_verifactu: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.protegido}
                      onChange={(e) => setFormData({...formData, protegido: e.target.checked})}
                    />
                    Protegido
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    />
                    Activo
                  </label>
                </div>
              </div>
            </div>
            
            {/* Observaciones */}
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-textarea"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-cliente">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Tabla */}
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
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>NIF</th>
                  <th>Tipo</th>
                  <th>Población</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente._id}>
                    <td className="font-semibold">{cliente.codigo}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {cliente.foto_url ? (
                          <img 
                            src={`${BACKEND_URL}${cliente.foto_url}`} 
                            alt="" 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : null}
                        <div>
                          <div>{cliente.nombre}</div>
                          {cliente.razon ? <div style={{ fontSize: '0.75rem', color: '#666' }}>{cliente.razon}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td>{cliente.nif || '-'}</td>
                    <td>
                      {cliente.tipo ? (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1'
                        }}>
                          {cliente.tipo}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{cliente.poblacion || '-'}</td>
                    <td>{cliente.telefono || cliente.movil || '-'}</td>
                    <td>
                      {cliente.email ? (
                        <a href={`mailto:${cliente.email}`} style={{ color: 'var(--primary)' }}>
                          {cliente.email}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <span 
                        onClick={() => canEdit && handleToggleActivo(cliente._id)}
                        style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: canEdit ? 'pointer' : 'default',
                          backgroundColor: cliente.activo ? '#dcfce7' : '#fee2e2',
                          color: cliente.activo ? '#166534' : '#dc2626'
                        }}
                      >
                        {cliente.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
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
    </div>
  );
};

export default Clientes;
