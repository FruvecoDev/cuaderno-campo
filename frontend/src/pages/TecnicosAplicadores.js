import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, UserCheck, Upload, X, 
  AlertTriangle, CheckCircle, XCircle, FileImage, Calendar,
  Award, CreditCard, Eye, Download, FileText, Settings
} from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';

const DEFAULT_COLUMNS = [
  { id: 'nombre_completo', label: 'Nombre Completo', visible: true },
  { id: 'dni', label: 'D.N.I.', visible: true },
  { id: 'nivel', label: 'Nivel', visible: true },
  { id: 'num_carnet', label: 'Num Carnet', visible: true },
  { id: 'certificacion', label: 'Certificacion', visible: true },
  { id: 'validez', label: 'Validez', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
];


const TecnicosAplicadores = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('tecnicos_col_config', DEFAULT_COLUMNS);
  
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
  const [isDragging, setIsDragging] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // Validar y establecer archivo
  const validateAndSetFile = (file) => {
    if (!file) return false;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no permitido. Use JPEG, PNG, WEBP o PDF');
      setTimeout(() => setError(null), 5000);
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo de 10MB');
      setTimeout(() => setError(null), 5000);
      return false;
    }
    
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
    return true;
  };
  
  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  useEffect(() => {
    fetchTecnicos();
    fetchNiveles();
  }, [searchTerm, filterNivel, filterActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTecnicos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterNivel) params.append('nivel', filterNivel);
      if (filterActivo !== '') params.append('activo', filterActivo);
      
      const data = await api.get(`/api/tecnicos-aplicadores?${params}`);
      setTecnicos(data.tecnicos || []);
    } catch (err) {
      setError('Error al cargar técnicos aplicadores');
    } finally {
      setLoading(false);
    }
  };

  const fetchNiveles = async () => {
    try {
      const data = await api.get('/api/tecnicos-aplicadores/niveles');
      setNivelesCapacitacion(data.niveles || []);
    } catch (err) {

    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let result;
      if (editingId) {
        result = await api.put(`/api/tecnicos-aplicadores/${editingId}`, formData);
      } else {
        result = await api.post('/api/tecnicos-aplicadores', formData);
      }
      
      // Si hay archivo seleccionado, subir certificado
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
      return;
    }
    
    
    setUploading(true);
    try {
      const formDataFile = new FormData();
      formDataFile.append('file', selectedFile);
      
      await api.upload(`/api/tecnicos-aplicadores/${tecnicoId}/certificado`, formDataFile);
    } catch (err) {

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
    // Si tiene certificado, mostrar preview
    if (tecnico.imagen_certificado_url) {
      let url = tecnico.imagen_certificado_url;
      if (url.startsWith('/api/uploads/')) {
        url = `${BACKEND_URL}${url}`;
      } else if (url.startsWith('/app/uploads/')) {
        url = `${BACKEND_URL}/api/uploads${url.replace('/app/uploads', '')}`;
      }
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este técnico aplicador?')) {
      return;
    }
    
    try {
      await api.delete(`/api/tecnicos-aplicadores/${id}`);
      fetchTecnicos();
    } catch (err) {
      const errorMsg = handlePermissionError(err, 'eliminar');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      await api.put(`/api/tecnicos-aplicadores/${id}/toggle-activo`);
      fetchTecnicos();
    } catch (err) {

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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-tecnicos"><Settings size={18} /></button>
          <button
            className="btn btn-secondary"
            data-testid="btn-export-excel-tecnicos"
            onClick={async () => {
              try {
                await api.download('/api/tecnicos-aplicadores/export/excel', `tecnicos_aplicadores_${new Date().toISOString().split('T')[0]}.xlsx`);
              } catch (err) { }
            }}
            title="Exportar Excel"
          >
            <Download size={16} /> Excel
          </button>
          <button
            className="btn btn-secondary"
            data-testid="btn-export-pdf-tecnicos"
            onClick={async () => {
              try {
                await api.download('/api/tecnicos-aplicadores/export/pdf', `tecnicos_aplicadores_${new Date().toISOString().split('T')[0]}.pdf`);
              } catch (err) { }
            }}
            title="Exportar PDF"
          >
            <FileText size={16} /> PDF
          </button>
          <PermissionButton
            permission="create"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            data-testid="btn-nuevo-tecnico"
          >
            <Plus size={18} /> Nuevo Técnico
          </PermissionButton>
        </div>
      </div>

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

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
                <div 
                  style={{ 
                    border: isDragging ? '2px solid hsl(var(--primary))' : '2px dashed hsl(var(--border))', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    backgroundColor: isDragging ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)',
                    transition: 'all 0.2s ease',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {(selectedFile || filePreview) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      {filePreview && !filePreview.endsWith('.pdf') ? (
                        <img 
                          src={filePreview} 
                          alt="Preview" 
                          style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'contain', borderRadius: '4px' }} 
                        />
                      ) : (
                        <div style={{ padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '4px' }}>
                          📄 PDF
                        </div>
                      )}
                      {selectedFile && (
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))' }}>
                          Nueva imagen: {selectedFile.name}
                        </span>
                      )}
                      {!selectedFile && editingId && (
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          Imagen actual
                        </span>
                      )}
                      <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                        Cambiar
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', textAlign: 'center', width: '100%' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <Upload size={28} style={{ color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                      </div>
                      <span style={{ 
                        fontSize: '0.875rem', 
                        color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        fontWeight: isDragging ? '600' : '400',
                        display: 'block'
                      }}>
                        {isDragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginTop: '0.25rem' }}>
                        JPG, PNG, WEBP o PDF (máx. 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        data-testid="input-certificado"
                      />
                    </label>
                  )}
                </div>
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
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  <th>Cert.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map(tecnico => {
                  const estado = getEstadoBadge(tecnico);
                  return (
                    <tr key={tecnico._id}>
                      {visibleColumns.map(col => {
                        switch (col.id) {
                          case 'nombre_completo': return <td key="nombre_completo" style={{ fontWeight: '500' }}>{tecnico.nombre} {tecnico.apellidos}</td>;
                          case 'dni': return <td key="dni">{tecnico.dni}</td>;
                          case 'nivel': return <td key="nivel"><span className="badge badge-info"><Award size={12} style={{ marginRight: '0.25rem' }} />{tecnico.nivel_capacitacion}</span></td>;
                          case 'num_carnet': return <td key="num_carnet"><span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CreditCard size={14} />{tecnico.num_carnet}</span></td>;
                          case 'certificacion': return <td key="certificacion">{tecnico.fecha_certificacion}</td>;
                          case 'validez': return <td key="validez">{tecnico.fecha_validez}</td>;
                          case 'estado': return <td key="estado"><span className={`badge ${estado.class}`}>{estado.icon} {estado.label}</span></td>;
                          default: return null;
                        }
                      })}
                      <td>
                        {tecnico.imagen_certificado_url ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Ver certificado"
                            onClick={() => {
                              // Construir URL completa: si ya es absoluta, usarla; si es relativa, añadir BACKEND_URL
                              const url = tecnico.imagen_certificado_url.startsWith('http') 
                                ? tecnico.imagen_certificado_url 
                                : `${BACKEND_URL}${tecnico.imagen_certificado_url}`;
                              window.open(url, '_blank');
                            }}
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
