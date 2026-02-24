import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, UserCheck, Upload, X, 
  AlertTriangle, CheckCircle, XCircle, FileImage, Calendar,
  Award, CreditCard, Eye
} from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TecnicosAplicadores = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nivelesCapacitacion, setNivelesCapacitacion] = useState([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    nivel_capacitacion: '',
    num_carnet: '',
    fecha_certificacion: '',
    observaciones: ''
  });
  
  // File upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchTecnicos();
    fetchNiveles();
  }, [searchTerm, filterNivel, filterActivo]);

  const fetchTecnicos = async () => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/tecnicos-aplicadores?`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (filterNivel) url += `nivel=${encodeURIComponent(filterNivel)}&`;
      if (filterActivo !== '') url += `activo=${filterActivo}&`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      setTecnicos(data.tecnicos || []);
    } catch (err) {
      setError('Error al cargar técnicos aplicadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchNiveles = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tecnicos-aplicadores/niveles`, { headers });
      const data = await res.json();
      setNivelesCapacitacion(data.niveles || []);
    } catch (err) {
      console.error('Error fetching niveles:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/tecnicos-aplicadores/${editingId}`
        : `${BACKEND_URL}/api/tecnicos-aplicadores`;
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw { status: res.status, message: errorData.detail };
      }
      
      // Si hay archivo seleccionado, subir certificado
      const result = await res.json();
      const tecnicoId = result.data?._id || editingId;
      if (selectedFile && tecnicoId) {
        await uploadCertificado(tecnicoId);
      }
      
      resetForm();
      fetchTecnicos();
    } catch (err) {
      const errorMsg = handlePermissionError(err, editingId ? 'actualizar' : 'crear');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const uploadCertificado = async (tecnicoId) => {
    if (!selectedFile) {
      console.log('No file selected for upload');
      return;
    }
    
    console.log('Uploading certificate for tecnico:', tecnicoId);
    
    setUploading(true);
    try {
      const formDataFile = new FormData();
      formDataFile.append('file', selectedFile);
      
      const response = await fetch(`${BACKEND_URL}/api/tecnicos-aplicadores/${tecnicoId}/certificado`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataFile
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        setError('Error al subir el certificado');
        setTimeout(() => setError(null), 5000);
      } else {
        console.log('Certificate uploaded successfully');
      }
    } catch (err) {
      console.error('Error uploading certificado:', err);
      setError('Error al subir el certificado');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleEdit = (tecnico) => {
    setFormData({
      nombre: tecnico.nombre || '',
      apellidos: tecnico.apellidos || '',
      dni: tecnico.dni || '',
      nivel_capacitacion: tecnico.nivel_capacitacion || '',
      num_carnet: tecnico.num_carnet || '',
      fecha_certificacion: tecnico.fecha_certificacion || '',
      observaciones: tecnico.observaciones || ''
    });
    setEditingId(tecnico._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este técnico aplicador?')) {
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/tecnicos-aplicadores/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw { status: res.status, message: errorData.detail };
      }
      
      fetchTecnicos();
    } catch (err) {
      const errorMsg = handlePermissionError(err, 'eliminar');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/tecnicos-aplicadores/${id}/toggle-activo`, {
        method: 'PUT',
        headers
      });
      fetchTecnicos();
    } catch (err) {
      console.error('Error toggling activo:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      dni: '',
      nivel_capacitacion: '',
      num_carnet: '',
      fecha_certificacion: '',
      observaciones: ''
    });
    setEditingId(null);
    setShowForm(false);
    setSelectedFile(null);
  };

  // Calcular fecha de validez (10 años después)
  const calcularFechaValidez = (fechaCert) => {
    if (!fechaCert) return '';
    const fecha = new Date(fechaCert);
    fecha.setFullYear(fecha.getFullYear() + 10);
    return fecha.toISOString().split('T')[0];
  };

  // Verificar si el certificado está vigente
  const isVigente = (fechaValidez) => {
    if (!fechaValidez) return false;
    return new Date(fechaValidez) >= new Date();
  };

  // Verificar si está próximo a vencer (menos de 6 meses)
  const isProximoVencer = (fechaValidez) => {
    if (!fechaValidez) return false;
    const hoy = new Date();
    const validez = new Date(fechaValidez);
    const seismeses = new Date();
    seismeses.setMonth(seismeses.getMonth() + 6);
    return validez >= hoy && validez <= seismeses;
  };

  const getEstadoBadge = (tecnico) => {
    if (!tecnico.activo) {
      return { class: 'badge-default', label: 'Inactivo', icon: <XCircle size={12} /> };
    }
    if (!isVigente(tecnico.fecha_validez)) {
      return { class: 'badge-danger', label: 'Caducado', icon: <AlertTriangle size={12} /> };
    }
    if (isProximoVencer(tecnico.fecha_validez)) {
      return { class: 'badge-warning', label: 'Próximo a vencer', icon: <AlertTriangle size={12} /> };
    }
    return { class: 'badge-success', label: 'Vigente', icon: <CheckCircle size={12} /> };
  };

  return (
    <div data-testid="tecnicos-aplicadores-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">
            <UserCheck size={28} style={{ marginRight: '0.5rem', display: 'inline' }} />
            Técnicos Aplicadores
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>
            Gestión de técnicos aplicadores certificados para tratamientos fitosanitarios
          </p>
        </div>
        <PermissionButton
          permission="create"
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          data-testid="btn-nuevo-tecnico"
        >
          <Plus size={18} /> Nuevo Técnico
        </PermissionButton>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Nombre, apellidos, DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                data-testid="search-input"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nivel de Capacitación</label>
            <select
              className="form-select"
              value={filterNivel}
              onChange={(e) => setFilterNivel(e.target.value)}
              data-testid="filter-nivel"
            >
              <option value="">Todos</option>
              {nivelesCapacitacion.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              data-testid="filter-activo"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6" style={{ border: '2px solid hsl(var(--primary))' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>
              {editingId ? 'Editar Técnico Aplicador' : 'Nuevo Técnico Aplicador'}
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={resetForm}>
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
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
                <label className="form-label">Apellidos *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                  required
                  data-testid="input-apellidos"
                />
              </div>
              <div className="form-group">
                <label className="form-label">D.N.I. *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.dni}
                  onChange={(e) => setFormData({...formData, dni: e.target.value})}
                  required
                  placeholder="12345678A"
                  data-testid="input-dni"
                />
              </div>
            </div>
            
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Nivel de Capacitación *</label>
                <select
                  className="form-select"
                  value={formData.nivel_capacitacion}
                  onChange={(e) => setFormData({...formData, nivel_capacitacion: e.target.value})}
                  required
                  data-testid="select-nivel"
                >
                  <option value="">Seleccionar...</option>
                  {nivelesCapacitacion.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nº Carnet *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.num_carnet}
                  onChange={(e) => setFormData({...formData, num_carnet: e.target.value})}
                  required
                  data-testid="input-carnet"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha Certificación *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_certificacion}
                  onChange={(e) => setFormData({...formData, fecha_certificacion: e.target.value})}
                  required
                  data-testid="input-fecha-cert"
                />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Fecha Validez (calculada automáticamente)</label>
                <input
                  type="date"
                  className="form-input"
                  value={calcularFechaValidez(formData.fecha_certificacion)}
                  disabled
                  style={{ backgroundColor: 'hsl(var(--muted))' }}
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                  10 años después de la fecha de certificación
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Imagen Certificado</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ flex: 1 }}
                    data-testid="input-certificado"
                  />
                  {selectedFile && (
                    <span style={{ fontSize: '0.875rem', color: 'hsl(var(--primary))' }}>
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Formatos: JPG, PNG, PDF
                </small>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                rows={2}
                data-testid="input-observaciones"
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? 'Subiendo...' : (editingId ? 'Actualizar' : 'Crear')} Técnico
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          Lista de Técnicos Aplicadores ({tecnicos.length})
        </h3>
        
        {loading ? (
          <p>Cargando...</p>
        ) : tecnicos.length === 0 ? (
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>No hay técnicos aplicadores registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>D.N.I.</th>
                  <th>Nivel</th>
                  <th>Nº Carnet</th>
                  <th>Certificación</th>
                  <th>Validez</th>
                  <th>Estado</th>
                  <th>Cert.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map(tecnico => {
                  const estado = getEstadoBadge(tecnico);
                  return (
                    <tr key={tecnico._id}>
                      <td style={{ fontWeight: '500' }}>
                        {tecnico.nombre} {tecnico.apellidos}
                      </td>
                      <td>{tecnico.dni}</td>
                      <td>
                        <span className="badge badge-info">
                          <Award size={12} style={{ marginRight: '0.25rem' }} />
                          {tecnico.nivel_capacitacion}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CreditCard size={14} />
                          {tecnico.num_carnet}
                        </span>
                      </td>
                      <td>{tecnico.fecha_certificacion}</td>
                      <td>{tecnico.fecha_validez}</td>
                      <td>
                        <span className={`badge ${estado.class}`}>
                          {estado.icon} {estado.label}
                        </span>
                      </td>
                      <td>
                        {tecnico.imagen_certificado_url ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Ver certificado"
                            onClick={() => window.open(tecnico.imagen_certificado_url, '_blank')}
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          <span style={{ color: 'hsl(var(--muted-foreground))' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className={`btn btn-sm ${tecnico.activo ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => handleToggleActivo(tecnico._id)}
                            title={tecnico.activo ? 'Desactivar' : 'Activar'}
                          >
                            {tecnico.activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          </button>
                          <PermissionButton
                            permission="edit"
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEdit(tecnico)}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </PermissionButton>
                          <PermissionButton
                            permission="delete"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(tecnico._id)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TecnicosAplicadores;
