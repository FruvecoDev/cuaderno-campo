import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, Filter, X, User, QrCode, 
  CreditCard, Camera, Download, Upload, FileText, Clock,
  TrendingUp, Users, UserCheck, UserX, ChevronDown, Eye,
  Smartphone, Fingerprint, Check, PenTool, RefreshCw, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import SignatureCanvas from 'react-signature-canvas';
import { ControlHorarioTab, ProductividadTab, PrenominaTab, AusenciasTab, DocumentosTab } from './RRHH/index';
import '../App.css';

const RRHH = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState('empleados');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Empleados
  const [empleados, setEmpleados] = useState([]);
  const [empleadoStats, setEmpleadoStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPuesto, setFilterPuesto] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  
  // Modal QR
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQRData] = useState(null);
  
  // Modal Detalle
  const [showDetalle, setShowDetalle] = useState(false);
  const [empleadoDetalle, setEmpleadoDetalle] = useState(null);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dni_nie: '',
    fecha_nacimiento: '',
    direccion: '',
    codigo_postal: '',
    localidad: '',
    provincia: '',
    telefono: '',
    email: '',
    fecha_alta: new Date().toISOString().split('T')[0],
    tipo_contrato: 'Temporal',
    puesto: 'Operario',
    departamento: '',
    categoria_profesional: '',
    iban: '',
    salario_hora: 0,
    salario_hora_extra: '',
    salario_hora_nocturna: '',
    salario_hora_festivo: '',
    notas: ''
  });

  const puestos = ['Operario', 'Encargado', 'Técnico', 'Administrativo', 'Conductor', 'Almacén'];
  const tiposContrato = ['Temporal', 'Indefinido', 'Fijo-Discontinuo', 'Prácticas', 'Formación'];

  useEffect(() => {
    fetchEmpleados();
    fetchStats();
  }, [filterPuesto, filterActivo]);

  const fetchEmpleados = async () => {
    try {
      let url = '/api/rrhh/empleados?';
      if (filterPuesto) url += `puesto=${filterPuesto}&`;
      if (filterActivo !== '') url += `activo=${filterActivo}`;
      
      const data = await api.get(url);
      setEmpleados(data.empleados || []);
    } catch (err) {
      console.error('Error fetching empleados:', err);
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/rrhh/empleados/stats');
      setEmpleadoStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salario_hora: parseFloat(formData.salario_hora) || 0,
        salario_hora_extra: formData.salario_hora_extra ? parseFloat(formData.salario_hora_extra) : null,
        salario_hora_nocturna: formData.salario_hora_nocturna ? parseFloat(formData.salario_hora_nocturna) : null,
        salario_hora_festivo: formData.salario_hora_festivo ? parseFloat(formData.salario_hora_festivo) : null
      };

      if (editingId) {
        await api.put(`/api/rrhh/empleados/${editingId}`, payload);
      } else {
        await api.post('/api/rrhh/empleados', payload);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchEmpleados();
      fetchStats();
    } catch (err) {
      console.error('Error saving empleado:', err);
      setError(api.getErrorMessage(err));
    }
  };

  const handleEdit = (empleado) => {
    setEditingId(empleado._id);
    setFormData({
      nombre: empleado.nombre || '',
      apellidos: empleado.apellidos || '',
      dni_nie: empleado.dni_nie || '',
      fecha_nacimiento: empleado.fecha_nacimiento || '',
      direccion: empleado.direccion || '',
      codigo_postal: empleado.codigo_postal || '',
      localidad: empleado.localidad || '',
      provincia: empleado.provincia || '',
      telefono: empleado.telefono || '',
      email: empleado.email || '',
      fecha_alta: empleado.fecha_alta || '',
      tipo_contrato: empleado.tipo_contrato || 'Temporal',
      puesto: empleado.puesto || 'Operario',
      departamento: empleado.departamento || '',
      categoria_profesional: empleado.categoria_profesional || '',
      iban: empleado.iban || '',
      salario_hora: empleado.salario_hora || 0,
      salario_hora_extra: empleado.salario_hora_extra || '',
      salario_hora_nocturna: empleado.salario_hora_nocturna || '',
      salario_hora_festivo: empleado.salario_hora_festivo || '',
      notas: empleado.notas || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Dar de baja a este empleado?')) return;
    try {
      await api.delete(`/api/rrhh/empleados/${id}`);
      fetchEmpleados();
      fetchStats();
    } catch (err) {
      console.error('Error deleting empleado:', err);
      setError(api.getErrorMessage(err));
    }
  };

  const handleDeletePermanente = async (id, nombre) => {
    if (!window.confirm(`¿ELIMINAR PERMANENTEMENTE a "${nombre}"?\n\nEsta acción NO se puede deshacer y eliminará todos los datos asociados (fichajes, documentos, prenóminas, etc.)`)) return;
    if (!window.confirm('¿Está COMPLETAMENTE SEGURO? Esta acción es IRREVERSIBLE.')) return;
    try {
      await api.delete(`/api/rrhh/empleados/${id}/permanente`);
      fetchEmpleados();
      fetchStats();
    } catch (err) {
      console.error('Error eliminando empleado:', err);
      setError(api.getErrorMessage(err));
    }
  };

  const handleReactivar = async (id) => {
    if (!window.confirm('¿Reactivar a este empleado?')) return;
    try {
      await api.put(`/api/rrhh/empleados/${id}/reactivar`);
      fetchEmpleados();
      fetchStats();
    } catch (err) {
      console.error('Error reactivando empleado:', err);
      setError(api.getErrorMessage(err));
    }
  };

  const handleShowQR = async (empleadoId) => {
    try {
      const data = await api.get(`/api/rrhh/empleados/${empleadoId}/qr`);
      setQRData(data);
      setShowQRModal(true);
    } catch (err) {
      console.error('Error getting QR:', err);
      setError(api.getErrorMessage(err));
    }
  };

  const handleShowDetalle = async (empleadoId) => {
    try {
      const data = await api.get(`/api/rrhh/empleados/${empleadoId}`);
      setEmpleadoDetalle(data.empleado);
      setShowDetalle(true);
    } catch (err) {
      console.error('Error getting detalle:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      dni_nie: '',
      fecha_nacimiento: '',
      direccion: '',
      codigo_postal: '',
      localidad: '',
      provincia: '',
      telefono: '',
      email: '',
      fecha_alta: new Date().toISOString().split('T')[0],
      tipo_contrato: 'Temporal',
      puesto: 'Operario',
      departamento: '',
      categoria_profesional: '',
      iban: '',
      salario_hora: 0,
      salario_hora_extra: '',
      salario_hora_nocturna: '',
      salario_hora_festivo: '',
      notas: ''
    });
  };

  const filteredEmpleados = empleados.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.nombre?.toLowerCase().includes(searchLower) ||
      emp.apellidos?.toLowerCase().includes(searchLower) ||
      emp.dni_nie?.toLowerCase().includes(searchLower) ||
      emp.codigo?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recursos Humanos</h1>
          <p className="text-muted-foreground">Gestión de personal, fichajes y productividad</p>
        </div>
      </div>

      {/* KPIs */}
      {empleadoStats && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'hsl(var(--primary) / 0.1)' }}>
                <Users size={24} style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{empleadoStats.total}</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Empleados</div>
              </div>
            </div>
          </div>
          
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'hsl(142 76% 36% / 0.1)' }}>
                <UserCheck size={24} style={{ color: 'hsl(142 76% 36%)' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{empleadoStats.activos}</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Activos</div>
              </div>
            </div>
          </div>
          
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'hsl(0 84% 60% / 0.1)' }}>
                <UserX size={24} style={{ color: 'hsl(0 84% 60%)' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{empleadoStats.inactivos}</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Bajas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'empleados', label: 'Empleados', icon: Users },
          { id: 'fichajes', label: 'Control Horario', icon: Clock },
          { id: 'productividad', label: 'Productividad', icon: TrendingUp },
          { id: 'documentos', label: 'Documentos', icon: FileText },
          { id: 'ausencias', label: 'Ausencias', icon: Calendar },
          { id: 'prenomina', label: 'Prenómina', icon: CreditCard }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                background: activeTab === tab.id ? 'hsl(var(--primary))' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'hsl(var(--foreground))',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content: Empleados */}
      {activeTab === 'empleados' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>
            
            <select
              value={filterPuesto}
              onChange={(e) => setFilterPuesto(e.target.value)}
              className="form-select"
              style={{ minWidth: '150px' }}
            >
              <option value="">Todos los puestos</option>
              {puestos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              className="form-select"
              style={{ minWidth: '120px' }}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Bajas</option>
            </select>
            
            <button
              onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              data-testid="btn-nuevo-empleado"
            >
              <Plus size={18} />
              {showForm && !editingId ? 'Cerrar Formulario' : 'Nuevo Empleado'}
            </button>
          </div>

          {/* Formulario Integrado (igual que Proveedores) */}
          {showForm && (
            <div className="card mb-6" data-testid="form-empleado">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem'
              }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  {editingId ? 'Editar Empleado' : 'Nuevo Empleado'}
                </h2>
                <button 
                  onClick={() => setShowForm(false)} 
                  className="btn btn-ghost btn-sm"
                  title="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {/* Datos Personales */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>
                      Datos Personales
                    </h3>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Apellidos *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.apellidos}
                      onChange={e => setFormData({...formData, apellidos: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">DNI/NIE *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.dni_nie}
                      onChange={e => setFormData({...formData, dni_nie: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Fecha Nacimiento</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_nacimiento}
                      onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.telefono}
                      onChange={e => setFormData({...formData, telefono: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.direccion}
                      onChange={e => setFormData({...formData, direccion: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Código Postal</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.codigo_postal}
                      onChange={e => setFormData({...formData, codigo_postal: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Localidad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.localidad}
                      onChange={e => setFormData({...formData, localidad: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Provincia</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.provincia}
                      onChange={e => setFormData({...formData, provincia: e.target.value})}
                    />
                  </div>
                  
                  {/* Datos Laborales */}
                  <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>
                      Datos Laborales
                    </h3>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Fecha Alta *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fecha_alta}
                      onChange={e => setFormData({...formData, fecha_alta: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Tipo Contrato</label>
                    <select
                      className="form-select"
                      value={formData.tipo_contrato}
                      onChange={e => setFormData({...formData, tipo_contrato: e.target.value})}
                    >
                      {tiposContrato.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Puesto</label>
                    <select
                      className="form-select"
                      value={formData.puesto}
                      onChange={e => setFormData({...formData, puesto: e.target.value})}
                    >
                      {puestos.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.departamento}
                      onChange={e => setFormData({...formData, departamento: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Categoría Profesional</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.categoria_profesional}
                      onChange={e => setFormData({...formData, categoria_profesional: e.target.value})}
                    />
                  </div>
                  
                  {/* Datos Económicos */}
                  <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>
                      Datos Económicos
                    </h3>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">IBAN</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.iban}
                      onChange={e => setFormData({...formData, iban: e.target.value})}
                      placeholder="ES00 0000 0000 0000 0000 0000"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Salario/Hora (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.salario_hora}
                      onChange={e => setFormData({...formData, salario_hora: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Salario Hora Extra (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.salario_hora_extra}
                      onChange={e => setFormData({...formData, salario_hora_extra: e.target.value})}
                      placeholder="Por defecto: salario x 1.25"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Salario Hora Nocturna (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.salario_hora_nocturna}
                      onChange={e => setFormData({...formData, salario_hora_nocturna: e.target.value})}
                      placeholder="Por defecto: salario x 1.25"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Salario Hora Festivo (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.salario_hora_festivo}
                      onChange={e => setFormData({...formData, salario_hora_festivo: e.target.value})}
                      placeholder="Por defecto: salario x 1.5"
                    />
                  </div>
                  
                  {/* Notas */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Notas</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={formData.notas}
                      onChange={e => setFormData({...formData, notas: e.target.value})}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingId ? 'Guardar Cambios' : 'Crear Empleado'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className="card">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>DNI/NIE</th>
                    <th>Puesto</th>
                    <th>Contrato</th>
                    <th>Fecha Alta</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmpleados.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                        No hay empleados registrados
                      </td>
                    </tr>
                  ) : (
                    filteredEmpleados.map(emp => (
                      <tr key={emp._id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{emp.codigo}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {emp.foto_url ? (
                              <img 
                                src={`${BACKEND_URL}${emp.foto_url}`} 
                                alt="" 
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: '500' }}>{emp.nombre} {emp.apellidos}</div>
                              {emp.email && <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{emp.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{emp.dni_nie}</td>
                        <td>{emp.puesto}</td>
                        <td>{emp.tipo_contrato}</td>
                        <td>{emp.fecha_alta}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: emp.activo ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                            color: emp.activo ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
                          }}>
                            {emp.activo ? 'Activo' : 'Baja'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleShowDetalle(emp._id)}
                              className="btn btn-ghost btn-sm"
                              title="Ver detalle"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleShowQR(emp._id)}
                              className="btn btn-ghost btn-sm"
                              title="Ver QR"
                            >
                              <QrCode size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(emp)}
                              className="btn btn-ghost btn-sm"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            {emp.activo ? (
                              <button
                                onClick={() => handleDelete(emp._id)}
                                className="btn btn-ghost btn-sm"
                                title="Dar de baja"
                                style={{ color: 'hsl(38 92% 50%)' }}
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReactivar(emp._id)}
                                  className="btn btn-ghost btn-sm"
                                  title="Reactivar empleado"
                                  style={{ color: 'hsl(142 76% 36%)' }}
                                >
                                  <RefreshCw size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeletePermanente(emp._id, `${emp.nombre} ${emp.apellidos}`)}
                                  className="btn btn-ghost btn-sm"
                                  title="Eliminar permanentemente"
                                  style={{ color: 'hsl(0 84% 60%)' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab Content: Fichajes */}
      {activeTab === 'fichajes' && (
        <ControlHorarioTab empleados={empleados} />
      )}

      {/* Tab Content: Productividad */}
      {activeTab === 'productividad' && (
        <ProductividadTab empleados={empleados} />
      )}

      {/* Tab Content: Documentos */}
      {activeTab === 'documentos' && (
        <DocumentosTab empleados={empleados} />
      )}

      {/* Tab Content: Ausencias */}
      {activeTab === 'ausencias' && (
        <AusenciasTab empleados={empleados} />
      )}

      {/* Tab Content: Prenómina */}
      {activeTab === 'prenomina' && (
        <PrenominaTab empleados={empleados} />
      )}


      {/* Modal QR */}
      {showQRModal && qrData && (
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
        }} onClick={() => setShowQRModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px', 
            textAlign: 'center' 
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>Código QR del Empleado</h2>
              <button onClick={() => setShowQRModal(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '1rem' }}>{qrData.empleado_nombre}</div>
              <img 
                src={qrData.qr_image} 
                alt="QR Code" 
                style={{ maxWidth: '250px', margin: '0 auto', display: 'block' }}
              />
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                Código: {qrData.qr_code}
              </div>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrData.qr_image;
                  link.download = `QR_${qrData.empleado_nombre.replace(/\s/g, '_')}.png`;
                  link.click();
                }}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                <Download size={18} />
                Descargar QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Empleado */}
      {showDetalle && empleadoDetalle && (
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
        }} onClick={() => setShowDetalle(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
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
              <h2 style={{ margin: 0 }}>Ficha del Empleado</h2>
              <button onClick={() => setShowDetalle(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {empleadoDetalle.foto_url ? (
                    <img src={`${BACKEND_URL}${empleadoDetalle.foto_url}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={40} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{empleadoDetalle.nombre} {empleadoDetalle.apellidos}</div>
                  <div style={{ color: 'hsl(var(--muted-foreground))' }}>{empleadoDetalle.codigo}</div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>DNI/NIE</div>
                  <div style={{ fontWeight: '500' }}>{empleadoDetalle.dni_nie}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Puesto</div>
                  <div style={{ fontWeight: '500' }}>{empleadoDetalle.puesto}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Tipo Contrato</div>
                  <div style={{ fontWeight: '500' }}>{empleadoDetalle.tipo_contrato}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Fecha Alta</div>
                  <div style={{ fontWeight: '500' }}>{empleadoDetalle.fecha_alta}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Teléfono</div>
                  <div style={{ fontWeight: '500' }}>{empleadoDetalle.telefono || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Email</div>
                  <div style={{ fontWeight: '500' }}>{empleadoDetalle.email || '-'}</div>
                </div>
              </div>
              
              {/* Métodos de identificación */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Métodos de Identificación</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: empleadoDetalle.qr_code ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <QrCode size={18} />
                    <span>QR {empleadoDetalle.qr_code ? '✓' : '-'}</span>
                  </div>
                  <div style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: empleadoDetalle.nfc_id ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={18} />
                    <span>NFC {empleadoDetalle.nfc_id ? '✓' : '-'}</span>
                  </div>
                  <div style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: empleadoDetalle.foto_url ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Camera size={18} />
                    <span>Facial {empleadoDetalle.foto_url ? '✓' : '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          padding: '1rem 1.5rem',
          background: 'hsl(0 84% 60%)',
          color: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default RRHH;
