import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, Settings, X } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Configuración de campos visibles en tabla
const DEFAULT_FIELDS_CONFIG = {
  nombre: true,
  cif_nif: true,
  telefono: true,
  email: true,
  poblacion: true,
  provincia: false,
  direccion: false,
  codigo_postal: false,
  persona_contacto: false,
  observaciones: false,
  estado: true
};

const FIELD_LABELS = {
  nombre: 'Nombre',
  cif_nif: 'CIF/NIF',
  telefono: 'Teléfono',
  email: 'Email',
  poblacion: 'Población',
  provincia: 'Provincia',
  direccion: 'Dirección',
  codigo_postal: 'Código Postal',
  persona_contacto: 'Persona Contacto',
  observaciones: 'Observaciones',
  estado: 'Estado'
};

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('proveedores_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  const { t } = useTranslation();
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  const [formData, setFormData] = useState({
    nombre: '',
    cif_nif: '',
    direccion: '',
    poblacion: '',
    provincia: '',
    codigo_postal: '',
    telefono: '',
    email: '',
    persona_contacto: '',
    observaciones: '',
    activo: true
  });

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/proveedores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setProveedores(data.proveedores || []);
    } catch (error) {
      console.error('Error fetching proveedores:', error);
      const errorMsg = handlePermissionError(error, 'ver los proveedores');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/proveedores/${editingId}`
        : `${BACKEND_URL}/api/proveedores`;
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      setShowForm(false);
      setEditingId(null);
      fetchProveedores();
      resetForm();
    } catch (error) {
      console.error('Error saving proveedor:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el proveedor' : 'crear el proveedor');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (proveedor) => {
    setFormData(proveedor);
    setEditingId(proveedor._id);
    setShowForm(true);
  };

  const handleDelete = async (proveedorId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/proveedores/${proveedorId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchProveedores();
    } catch (error) {
      console.error('Error deleting proveedor:', error);
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
      codigo_postal: '',
      telefono: '',
      email: '',
      persona_contacto: '',
      observaciones: '',
      activo: true
    });
  };

  const filteredProveedores = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.cif_nif && p.cif_nif.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    localStorage.setItem('proveedores_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);

  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div data-testid="proveedores-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Proveedores</h1>
          <p className="text-muted">Gestiona el catálogo de proveedores</p>
        </div>
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
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="btn btn-primary"
            data-testid="btn-nuevo-proveedor"
          >
            <Plus size={18} />
            Nuevo Proveedor
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

      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{editingId ? 'Editar' : 'Nuevo'} Proveedor</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">CIF/NIF</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.cif_nif}
                  onChange={(e) => setFormData({ ...formData, cif_nif: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                className="form-input"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Población</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.poblacion}
                  onChange={(e) => setFormData({ ...formData, poblacion: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Provincia</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.provincia}
                  onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Código Postal</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.codigo_postal}
                  onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Persona de Contacto</label>
              <input
                type="text"
                className="form-input"
                value={formData.persona_contacto}
                onChange={(e) => setFormData({ ...formData, persona_contacto: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <span>Activo</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Proveedor
              </button>
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
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Lista de Proveedores</h2>
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

        {loading ? (
          <p>Cargando proveedores...</p>
        ) : filteredProveedores.length === 0 ? (
          <p className="text-muted">No hay proveedores registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {fieldsConfig.nombre && <th>Nombre</th>}
                  {fieldsConfig.cif_nif && <th>CIF/NIF</th>}
                  {fieldsConfig.telefono && <th>Teléfono</th>}
                  {fieldsConfig.email && <th>Email</th>}
                  {fieldsConfig.poblacion && <th>Población</th>}
                  {fieldsConfig.provincia && <th>Provincia</th>}
                  {fieldsConfig.direccion && <th>Dirección</th>}
                  {fieldsConfig.codigo_postal && <th>C.P.</th>}
                  {fieldsConfig.persona_contacto && <th>Contacto</th>}
                  {fieldsConfig.observaciones && <th>Observaciones</th>}
                  {fieldsConfig.estado && <th>Estado</th>}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredProveedores.map((proveedor) => (
                  <tr key={proveedor._id}>
                    {fieldsConfig.nombre && <td style={{ fontWeight: '600' }}>{proveedor.nombre}</td>}
                    {fieldsConfig.cif_nif && <td>{proveedor.cif_nif || '-'}</td>}
                    {fieldsConfig.telefono && <td>{proveedor.telefono || '-'}</td>}
                    {fieldsConfig.email && <td>{proveedor.email || '-'}</td>}
                    {fieldsConfig.poblacion && <td>{proveedor.poblacion || '-'}</td>}
                    {fieldsConfig.provincia && <td>{proveedor.provincia || '-'}</td>}
                    {fieldsConfig.direccion && <td>{proveedor.direccion || '-'}</td>}
                    {fieldsConfig.codigo_postal && <td>{proveedor.codigo_postal || '-'}</td>}
                    {fieldsConfig.persona_contacto && <td>{proveedor.persona_contacto || '-'}</td>}
                    {fieldsConfig.observaciones && (
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proveedor.observaciones || '-'}
                      </td>
                    )}
                    {fieldsConfig.estado && (
                      <td>
                        <span className={`badge ${proveedor.activo ? 'badge-success' : 'badge-secondary'}`}>
                          {proveedor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    )}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
    </div>
  );
};

export default Proveedores;
