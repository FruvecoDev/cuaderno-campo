import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, UserCheck, Upload, X, 
  AlertTriangle, CheckCircle, XCircle, FileImage, Calendar,
  Award, CreditCard, Eye, Download, FileText, Settings, User, Briefcase
} from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
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
  const { canCreate, canEdit, canDelete, canBulkDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('tecnicos_col_config', DEFAULT_COLUMNS);
  
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nivelesCapacitacion, setNivelesCapacitacion] = useState([]);
  const [activeTab, setActiveTab] = useState('personales');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');

  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(tecnicos);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try { await bulkDeleteApi('tecnicos', selectedIds); clearSelection(); fetchTecnicos(); } catch (e) {} finally { setBulkDeleting(false); }
  };
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
    setActiveTab('personales');
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
    setFilePreview(null);
    setActiveTab('personales');
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

      {/* Formulario Modal */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}
          onClick={resetForm}
        >
          <div
            className="card"
            style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={20} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Técnico Aplicador</h2>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    {formData.nombre || formData.apellidos ? `${formData.nombre} ${formData.apellidos}` : 'Datos personales y profesionales del técnico'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={resetForm} className="config-modal-close-btn" data-testid="btn-close-modal-tecnico">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'personales', label: 'Datos Personales', icon: <User size={14} /> },
                { key: 'profesionales', label: 'Datos Profesionales', icon: <Briefcase size={14} /> },
                { key: 'certificado', label: 'Certificado', icon: <Award size={14} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  data-testid={`tab-${tab.key}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, overflow: 'auto', paddingRight: '1rem' }}>

                {/* TAB: Datos Personales */}
                {activeTab === 'personales' && (
                  <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificación</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            required
                            data-testid="input-nombre"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Apellidos *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.apellidos}
                            onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                            required
                            data-testid="input-apellidos"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>D.N.I. *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.dni}
                            onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                            required
                            placeholder="12345678A"
                            data-testid="input-dni"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Observaciones</h3>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <textarea
                          className="form-input"
                          value={formData.observaciones}
                          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                          rows={4}
                          placeholder="Notas adicionales sobre el técnico..."
                          style={{ fontSize: '0.85rem', resize: 'vertical' }}
                          data-testid="input-observaciones"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Datos Profesionales */}
                {activeTab === 'profesionales' && (
                  <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Capacitación</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nivel de Capacitación *</label>
                          <select
                            className="form-input"
                            value={formData.nivel_capacitacion}
                            onChange={(e) => setFormData({ ...formData, nivel_capacitacion: e.target.value })}
                            required
                            data-testid="select-nivel"
                          >
                            <option value="">Seleccionar...</option>
                            {nivelesCapacitacion.map(nivel => (
                              <option key={nivel} value={nivel}>{nivel}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nº Carnet *</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formData.num_carnet}
                            onChange={(e) => setFormData({ ...formData, num_carnet: e.target.value })}
                            required
                            data-testid="input-carnet"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'hsl(var(--muted)/0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Vigencia</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Certificación *</label>
                          <input
                            type="date"
                            className="form-input"
                            value={formData.fecha_certificacion}
                            onChange={(e) => setFormData({ ...formData, fecha_certificacion: e.target.value })}
                            required
                            data-testid="input-fecha-cert"
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha Validez (auto)</label>
                          <input
                            type="date"
                            className="form-input"
                            value={calcularFechaValidez(formData.fecha_certificacion)}
                            disabled
                            style={{ backgroundColor: 'hsl(var(--muted))' }}
                          />
                        </div>
                      </div>
                      <small style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', display: 'block', marginTop: '0.5rem' }}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        La fecha de validez se calcula automáticamente (10 años después de la certificación)
                      </small>
                    </div>
                  </div>
                )}

                {/* TAB: Certificado */}
                {activeTab === 'certificado' && (
                  <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Imagen del Carnet / Certificado</h3>
                    <div
                      style={{
                        border: isDragging ? '2px solid hsl(var(--primary))' : '2px dashed hsl(var(--border))',
                        borderRadius: '10px',
                        padding: '2rem',
                        backgroundColor: isDragging ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)',
                        transition: 'all 0.2s ease',
                        minHeight: '280px',
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                          {filePreview && !filePreview.endsWith('.pdf') ? (
                            <img
                              src={filePreview}
                              alt="Preview"
                              style={{ maxWidth: '320px', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            />
                          ) : (
                            <div style={{ padding: '1.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={32} style={{ color: 'hsl(var(--primary))' }} />
                              <span style={{ fontWeight: '600' }}>PDF</span>
                            </div>
                          )}
                          {selectedFile && (
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', fontWeight: '600' }}>
                              Nuevo archivo: {selectedFile.name}
                            </span>
                          )}
                          {!selectedFile && editingId && (
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                              Imagen actualmente guardada
                            </span>
                          )}
                          <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                            <Upload size={14} style={{ marginRight: '0.35rem' }} /> Cambiar archivo
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
                          <div style={{ marginBottom: '0.75rem' }}>
                            <Upload size={48} style={{ color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
                          </div>
                          <span style={{
                            fontSize: '1rem',
                            color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                            fontWeight: '600',
                            display: 'block',
                            marginBottom: '0.35rem'
                          }}>
                            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para subir'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block' }}>
                            JPG, PNG, WEBP o PDF — máximo 10 MB
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
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm} data-testid="btn-cancelar-tecnico">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading} data-testid="btn-guardar-tecnico">
                  {uploading ? 'Subiendo...' : (editingId ? 'Actualizar' : 'Crear')} Técnico
                </button>
              </div>
            </form>
          </div>
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
            {canBulkDelete && <BulkActionBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} deleting={bulkDeleting} />}
            <table className="data-table">
              <thead>
                <tr>
                  {canBulkDelete && <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />}
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
                      {canBulkDelete && <BulkCheckboxCell id={tecnico._id} selected={selectedIds.has(tecnico._id)} onToggle={toggleOne} />}
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
