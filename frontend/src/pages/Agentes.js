import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Plus, Edit2, Trash2, Search, Filter, X, Upload, 
  Phone, Mail, Globe, MapPin, Building, Percent, Euro,
  ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import { useDropzone } from 'react-dropzone';
import '../App.css';


const PROVINCIAS_ESPANA = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona',
  'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca',
  'Gerona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares',
  'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lérida', 'Lugo', 'Madrid', 'Málaga',
  'Murcia', 'Navarra', 'Orense', 'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife',
  'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
  'Vizcaya', 'Zamora', 'Zaragoza'
];

const Agentes = () => {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('Compra'); // Compra o Venta
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterActivo, setFilterActivo] = useState('');
  
  // Form
  const [formData, setFormData] = useState({
    tipo: 'Compra',
    nombre: '',
    razon_social: '',
    denominacion: '',
    nif: '',
    direccion: '',
    direccion2: '',
    telefonos: '',
    fax: '',
    pais: 'España',
    codigo_postal: '',
    poblacion: '',
    provincia: '',
    persona_contacto: '',
    email: '',
    web: '',
    observaciones: '',
    activo: true
  });
  
  // Foto upload
  const [selectedFoto, setSelectedFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  
  // Comisiones
  const [showComisiones, setShowComisiones] = useState(false);
  const [selectedAgente, setSelectedAgente] = useState(null);
  const [comisiones, setComisiones] = useState([]);
  const [comisionForm, setComisionForm] = useState({
    tipo_comision: 'porcentaje',
    valor: '',
    aplicar_a: 'contrato',
    referencia_id: '',
    referencia_nombre: '',
    fecha_desde: '',
    fecha_hasta: '',
    activa: true
  });
  
  // Referencias para comisiones
  const [contratos, setContratos] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [parcelas, setParcelas] = useState([]);

  const canCreate = user?.can_create || user?.role === 'Admin';
  const canEdit = user?.can_edit || user?.role === 'Admin';
  const canDelete = user?.can_delete || user?.role === 'Admin';

  useEffect(() => {
    fetchAgentes();
    fetchReferencias();
  }, [activeTab]);

  const fetchAgentes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('tipo', activeTab);
      if (searchTerm) params.append('search', searchTerm);
      if (filterActivo !== '') params.append('activo', filterActivo);
      
      const response = await fetch(`${BACKEND_URL}/api/agentes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgentes(data.agentes || []);
      }
    } catch (err) {
      setError('Error cargando agentes');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferencias = async () => {
    try {
      // Fetch contratos
      const contratosRes = await fetch(`${BACKEND_URL}/api/contratos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contratosRes.ok) {
        const data = await contratosRes.json();
        setContratos(data.contratos || []);
      }
      
      // Fetch cultivos
      const cultivosRes = await fetch(`${BACKEND_URL}/api/catalogos/cultivos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (cultivosRes.ok) {
        const data = await cultivosRes.json();
        setCultivos(data.cultivos || []);
      }
      
      // Fetch parcelas
      const parcelasRes = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (parcelasRes.ok) {
        const data = await parcelasRes.json();
        setParcelas(data.parcelas || []);
      }
    } catch (err) {
      console.error('Error fetching referencias:', err);
    }
  };

  const fetchComisiones = async (agenteId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/agentes/${agenteId}/comisiones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setComisiones(data.comisiones || []);
      }
    } catch (err) {
      console.error('Error fetching comisiones:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/agentes/${editingId}`
        : `${BACKEND_URL}/api/agentes`;
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({...formData, tipo: activeTab})
      });
      
      if (response.ok) {
        const result = await response.json();
        const agenteId = editingId || result.data._id;
        
        // Upload foto if selected
        if (selectedFoto && agenteId) {
          const fotoFormData = new FormData();
          fotoFormData.append('file', selectedFoto);
          await fetch(`${BACKEND_URL}/api/agentes/${agenteId}/upload-foto`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fotoFormData
          });
        }
        
        resetForm();
        fetchAgentes();
      } else {
        const err = await response.json();
        setError(err.detail || 'Error guardando agente');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleEdit = (agente) => {
    setEditingId(agente._id);
    setFormData({
      tipo: agente.tipo || activeTab,
      nombre: agente.nombre || '',
      razon_social: agente.razon_social || '',
      denominacion: agente.denominacion || '',
      nif: agente.nif || '',
      direccion: agente.direccion || '',
      direccion2: agente.direccion2 || '',
      telefonos: agente.telefonos || '',
      fax: agente.fax || '',
      pais: agente.pais || 'España',
      codigo_postal: agente.codigo_postal || '',
      poblacion: agente.poblacion || '',
      provincia: agente.provincia || '',
      persona_contacto: agente.persona_contacto || '',
      email: agente.email || '',
      web: agente.web || '',
      observaciones: agente.observaciones || '',
      activo: agente.activo !== false
    });
    if (agente.foto_url) {
      setFotoPreview(`${BACKEND_URL}/api/agentes/${agente._id}/foto`);
    }
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este agente?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/agentes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchAgentes();
      }
    } catch (err) {
      setError('Error eliminando agente');
    }
  };

  const handleToggleActivo = async (id, currentStatus) => {
    try {
      await fetch(`${BACKEND_URL}/api/agentes/${id}/toggle-activo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAgentes();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: activeTab,
      nombre: '',
      razon_social: '',
      denominacion: '',
      nif: '',
      direccion: '',
      direccion2: '',
      telefonos: '',
      fax: '',
      pais: 'España',
      codigo_postal: '',
      poblacion: '',
      provincia: '',
      persona_contacto: '',
      email: '',
      web: '',
      observaciones: '',
      activo: true
    });
    setEditingId(null);
    setShowForm(false);
    setSelectedFoto(null);
    setFotoPreview(null);
    setError(null);
  };

  // Dropzone for foto
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] },
    maxFiles: 1
  });

  // Comisiones handlers
  const openComisiones = (agente) => {
    setSelectedAgente(agente);
    fetchComisiones(agente._id);
    setShowComisiones(true);
  };

  const handleAddComision = async () => {
    if (!comisionForm.valor) {
      alert('Debe indicar un valor de comisión');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/agentes/${selectedAgente._id}/comisiones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(comisionForm)
      });
      
      if (response.ok) {
        fetchComisiones(selectedAgente._id);
        setComisionForm({
          tipo_comision: 'porcentaje',
          valor: '',
          aplicar_a: 'contrato',
          referencia_id: '',
          referencia_nombre: '',
          fecha_desde: '',
          fecha_hasta: '',
          activa: true
        });
      }
    } catch (err) {
      console.error('Error adding comision:', err);
    }
  };

  const handleDeleteComision = async (comisionId) => {
    if (!window.confirm('¿Eliminar esta comisión?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/comisiones/${comisionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchComisiones(selectedAgente._id);
    } catch (err) {
      console.error('Error deleting comision:', err);
    }
  };

  const applyFilters = () => {
    fetchAgentes();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">
          <Users size={28} style={{ display: 'inline', marginRight: '0.75rem', color: 'hsl(var(--primary))' }} />
          Agentes de {activeTab}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filtros
          </button>
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}
              data-testid="btn-nuevo-agente"
            >
              <Plus size={18} />
              Nuevo Agente
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={`btn ${activeTab === 'Compra' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('Compra')}
          style={{ flex: 1 }}
        >
          Agentes de Compra
        </button>
        <button
          className={`btn ${activeTab === 'Venta' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('Venta')}
          style={{ flex: 1 }}
        >
          Agentes de Venta
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Buscar</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Nombre, código o NIF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
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
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={applyFilters} style={{ width: '100%' }}>
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '1rem' }}><X size={16} /></button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="card-title">
            {editingId ? 'Editar' : 'Nuevo'} Agente de {activeTab}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1.5rem' }}>
              {/* Left column - Form fields */}
              <div>
                <div className="grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Código</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingId ? formData.codigo : 'Auto-generado'}
                      disabled
                      style={{ backgroundColor: 'hsl(var(--muted))' }}
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
                      data-testid="input-nombre"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">N.I.F.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nif}
                      onChange={(e) => setFormData({...formData, nif: e.target.value})}
                      placeholder="12345678A"
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Razón Social</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.razon_social}
                      onChange={(e) => setFormData({...formData, razon_social: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Denominación</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.denominacion}
                      onChange={(e) => setFormData({...formData, denominacion: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.direccion}
                      onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dirección (línea 2)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.direccion2}
                      onChange={(e) => setFormData({...formData, direccion2: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid-4" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Cód. Postal</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.codigo_postal}
                      onChange={(e) => setFormData({...formData, codigo_postal: e.target.value})}
                      placeholder="12345"
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
                    <select
                      className="form-select"
                      value={formData.provincia}
                      onChange={(e) => setFormData({...formData, provincia: e.target.value})}
                    >
                      <option value="">Seleccionar...</option>
                      {PROVINCIAS_ESPANA.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">País</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.pais}
                      onChange={(e) => setFormData({...formData, pais: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Teléfono/s</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.telefonos}
                      onChange={(e) => setFormData({...formData, telefonos: e.target.value})}
                      placeholder="600 123 456"
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
                    <label className="form-label">Persona Contacto</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.persona_contacto}
                      onChange={(e) => setFormData({...formData, persona_contacto: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Web</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.web}
                      onChange={(e) => setFormData({...formData, web: e.target.value})}
                      placeholder="www.ejemplo.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={formData.observaciones}
                    onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                  />
                </div>
              </div>

              {/* Right column - Foto */}
              <div>
                <label className="form-label">Foto</label>
                <div
                  {...getRootProps()}
                  style={{
                    border: '2px dashed hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragActive ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                    minHeight: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <input {...getInputProps()} />
                  {fotoPreview ? (
                    <img 
                      src={fotoPreview} 
                      alt="Preview" 
                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }}
                    />
                  ) : (
                    <>
                      <Upload size={32} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
                      <p className="text-sm text-muted">Arrastra una imagen o haz clic</p>
                    </>
                  )}
                </div>
                {fotoPreview && (
                  <button 
                    type="button"
                    className="btn btn-sm btn-secondary" 
                    onClick={() => { setSelectedFoto(null); setFotoPreview(null); }}
                    style={{ marginTop: '0.5rem', width: '100%' }}
                  >
                    <X size={14} /> Quitar foto
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-center">Cargando...</p>
      ) : agentes.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <Users size={48} style={{ color: 'hsl(var(--muted-foreground))', margin: '0 auto 1rem' }} />
          <p className="text-muted">No hay agentes de {activeTab.toLowerCase()} registrados</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>N.I.F.</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Población</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((agente) => (
                <tr key={agente._id}>
                  <td className="font-semibold">{agente.codigo}</td>
                  <td>
                    <div>{agente.nombre}</div>
                    {agente.razon_social && (
                      <div className="text-sm text-muted">{agente.razon_social}</div>
                    )}
                  </td>
                  <td>{agente.nif || '-'}</td>
                  <td>{agente.telefonos || '-'}</td>
                  <td>{agente.email || '-'}</td>
                  <td>{agente.poblacion || '-'}</td>
                  <td>
                    <button
                      className={`badge ${agente.activo ? 'badge-success' : 'badge-secondary'}`}
                      onClick={() => canEdit && handleToggleActivo(agente._id, agente.activo)}
                      style={{ cursor: canEdit ? 'pointer' : 'default' }}
                    >
                      {agente.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => openComisiones(agente)}
                        title="Gestionar comisiones"
                      >
                        <Percent size={14} />
                      </button>
                      {canEdit && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(agente)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleDelete(agente._id)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Comisiones */}
      {showComisiones && selectedAgente && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>Comisiones</h2>
                <p className="text-muted text-sm">{selectedAgente.nombre} ({selectedAgente.codigo})</p>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowComisiones(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Form nueva comisión */}
            <div style={{ 
              background: 'hsl(var(--muted))', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem' 
            }}>
              <h4 style={{ marginBottom: '0.75rem' }}>Nueva Comisión</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-sm">Tipo</label>
                  <select
                    className="form-select"
                    value={comisionForm.tipo_comision}
                    onChange={(e) => setComisionForm({...comisionForm, tipo_comision: e.target.value})}
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="euro_kilo">€ por Kilo</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-sm">
                    Valor {comisionForm.tipo_comision === 'porcentaje' ? '(%)' : '(€/kg)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={comisionForm.valor}
                    onChange={(e) => setComisionForm({...comisionForm, valor: e.target.value})}
                    placeholder={comisionForm.tipo_comision === 'porcentaje' ? '5.00' : '0.10'}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-sm">Aplicar a</label>
                  <select
                    className="form-select"
                    value={comisionForm.aplicar_a}
                    onChange={(e) => setComisionForm({...comisionForm, aplicar_a: e.target.value, referencia_id: '', referencia_nombre: ''})}
                  >
                    <option value="contrato">Contrato</option>
                    <option value="cultivo">Cultivo</option>
                    <option value="parcela">Parcela</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-sm">Referencia</label>
                  <select
                    className="form-select"
                    value={comisionForm.referencia_id}
                    onChange={(e) => {
                      const selected = e.target.options[e.target.selectedIndex];
                      setComisionForm({
                        ...comisionForm, 
                        referencia_id: e.target.value,
                        referencia_nombre: selected.text
                      });
                    }}
                  >
                    <option value="">Todos</option>
                    {comisionForm.aplicar_a === 'contrato' && contratos.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.serie}-{c.año}-{String(c.numero).padStart(3,'0')} - {c.cultivo}
                      </option>
                    ))}
                    {comisionForm.aplicar_a === 'cultivo' && cultivos.map(c => (
                      <option key={c._id} value={c._id}>{c.nombre}</option>
                    ))}
                    {comisionForm.aplicar_a === 'parcela' && parcelas.map(p => (
                      <option key={p._id} value={p._id}>{p.codigo} - {p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-sm">Desde</label>
                  <input
                    type="date"
                    className="form-input"
                    value={comisionForm.fecha_desde}
                    onChange={(e) => setComisionForm({...comisionForm, fecha_desde: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-sm">Hasta</label>
                  <input
                    type="date"
                    className="form-input"
                    value={comisionForm.fecha_hasta}
                    onChange={(e) => setComisionForm({...comisionForm, fecha_hasta: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleAddComision} style={{ width: '100%' }}>
                    <Plus size={16} /> Añadir
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de comisiones */}
            {comisiones.length === 0 ? (
              <p className="text-center text-muted" style={{ padding: '2rem' }}>
                No hay comisiones configuradas
              </p>
            ) : (
              <table className="table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Aplicar a</th>
                    <th>Referencia</th>
                    <th>Periodo</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {comisiones.map(com => (
                    <tr key={com._id}>
                      <td>
                        {com.tipo_comision === 'porcentaje' ? (
                          <span className="badge badge-primary"><Percent size={12} /> Porcentaje</span>
                        ) : (
                          <span className="badge badge-secondary"><Euro size={12} /> €/Kilo</span>
                        )}
                      </td>
                      <td className="font-semibold">
                        {com.tipo_comision === 'porcentaje' ? `${com.valor}%` : `${com.valor} €/kg`}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{com.aplicar_a}</td>
                      <td>{com.referencia_nombre || 'Todos'}</td>
                      <td>
                        {com.fecha_desde || com.fecha_hasta ? (
                          <span className="text-sm">
                            {com.fecha_desde || '...'} - {com.fecha_hasta || '...'}
                          </span>
                        ) : (
                          <span className="text-muted">Sin límite</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${com.activa ? 'badge-success' : 'badge-secondary'}`}>
                          {com.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleDeleteComision(com._id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Agentes;
