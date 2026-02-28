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
import { ControlHorarioTab, ProductividadTab, PrenominaTab, AusenciasTab } from './RRHH/index';
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
        <DocumentosEmpleado empleados={empleados} />
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

// ============================================================================
// Sub-componente: Documentos del Empleado con Firma Digital
// ============================================================================
const DocumentosEmpleado = ({ empleados }) => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNuevoDoc, setShowNuevoDoc] = useState(false);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [documentoAFirmar, setDocumentoAFirmar] = useState(null);
  const [nuevoDocData, setNuevoDocData] = useState({
    nombre: '',
    tipo: 'contrato',
    descripcion: '',
    requiere_firma: true
  });
  
  // Estado para archivo adjunto
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Referencia al canvas de firma
  const sigCanvasRef = useRef(null);
  const [firmaGuardada, setFirmaGuardada] = useState(null);
  const dropdownRef = useRef(null);
  
  // Filtrar empleados por búsqueda (nombre o DNI)
  const empleadosFiltrados = empleados.filter(emp => {
    if (!busquedaEmpleado) return emp.activo;
    const busqueda = busquedaEmpleado.toLowerCase();
    const nombreCompleto = `${emp.nombre} ${emp.apellidos}`.toLowerCase();
    const dni = (emp.dni_nie || '').toLowerCase();
    const codigo = (emp.codigo || '').toLowerCase();
    return emp.activo && (
      nombreCompleto.includes(busqueda) || 
      dni.includes(busqueda) ||
      codigo.includes(busqueda)
    );
  });
  
  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Filtros de fecha
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Obtener empleado seleccionado
  const empleadoActual = empleados.find(e => e._id === empleadoSeleccionado);
  
  const tiposDocumento = [
    { value: 'contrato', label: 'Contrato de Trabajo' },
    { value: 'anexo', label: 'Anexo Contrato' },
    { value: 'nomina', label: 'Nómina' },
    { value: 'certificado', label: 'Certificado' },
    { value: 'formacion', label: 'Formación PRL' },
    { value: 'epi', label: 'Entrega EPI' },
    { value: 'otro', label: 'Otro' }
  ];
  
  useEffect(() => {
    fetchDocumentos();
  }, [empleadoSeleccionado, filtroFechaDesde, filtroFechaHasta, filtroTipo, filtroEstado]);
  
  const fetchDocumentos = async () => {
    try {
      let params = new URLSearchParams();
      if (empleadoSeleccionado) {
        params.append('empleado_id', empleadoSeleccionado);
      }
      if (filtroFechaDesde) {
        params.append('fecha_desde', filtroFechaDesde);
      }
      if (filtroFechaHasta) {
        params.append('fecha_hasta', filtroFechaHasta);
      }
      if (filtroTipo) {
        params.append('tipo', filtroTipo);
      }
      if (filtroEstado) {
        params.append('estado', filtroEstado);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/api/rrhh/documentos?${queryString}` : '/api/rrhh/documentos';
      const data = await api.get(url);
      setDocumentos(data.documentos || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCrearDocumento = async () => {
    if (!empleadoSeleccionado || !nuevoDocData.nombre) {
      console.log('Validation failed:', { empleadoSeleccionado, nombre: nuevoDocData.nombre });
      return;
    }
    
    try {
      setUploading(true);
      
      // Si hay archivo adjunto, usamos FormData
      if (archivoAdjunto) {
        const formData = new FormData();
        formData.append('file', archivoAdjunto);
        formData.append('empleado_id', empleadoSeleccionado);
        formData.append('nombre', nuevoDocData.nombre);
        formData.append('tipo', nuevoDocData.tipo);
        formData.append('descripcion', nuevoDocData.descripcion || '');
        formData.append('requiere_firma', nuevoDocData.requiere_firma.toString());
        formData.append('fecha_creacion', new Date().toISOString().split('T')[0]);
        
        console.log('Uploading document with file...');
        const result = await api.upload('/api/rrhh/documentos/upload', formData);
        console.log('Upload result:', result);
      } else {
        // Sin archivo, solo crear metadatos
        console.log('Creating document without file...');
        const result = await api.post('/api/rrhh/documentos', {
          empleado_id: empleadoSeleccionado,
          ...nuevoDocData,
          fecha_creacion: new Date().toISOString().split('T')[0]
        });
        console.log('Create result:', result);
      }
      
      setShowNuevoDoc(false);
      setNuevoDocData({ nombre: '', tipo: 'contrato', descripcion: '', requiere_firma: true });
      removeArchivoAdjunto();
      fetchDocumentos();
    } catch (err) {
      console.error('Error creating document:', err);
      alert('Error al crear el documento: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Funciones para drag & drop
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
      handleFileSelect(files[0]);
    }
  };
  
  const handleFileSelect = (file) => {
    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de archivo no permitido. Use PDF, Word o imágenes.');
      return;
    }
    
    // Validar tamaño (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }
    
    setArchivoAdjunto(file);
    
    // Crear URL de vista previa
    const previewUrl = URL.createObjectURL(file);
    setArchivoPreview(previewUrl);
    
    // Auto-completar nombre si está vacío
    if (!nuevoDocData.nombre) {
      const nombreSinExtension = file.name.replace(/\.[^/.]+$/, '');
      setNuevoDocData(prev => ({ ...prev, nombre: nombreSinExtension }));
    }
  };
  
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };
  
  const removeArchivoAdjunto = () => {
    // Limpiar URL de preview para liberar memoria
    if (archivoPreview) {
      URL.revokeObjectURL(archivoPreview);
    }
    setArchivoAdjunto(null);
    setArchivoPreview(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Funciones de exportación
  const handleExportExcel = async () => {
    try {
      let params = new URLSearchParams();
      if (empleadoSeleccionado) {
        params.append('empleado_id', empleadoSeleccionado);
      }
      if (filtroFechaDesde) {
        params.append('fecha_desde', filtroFechaDesde);
      }
      if (filtroFechaHasta) {
        params.append('fecha_hasta', filtroFechaHasta);
      }
      if (filtroTipo) {
        params.append('tipo', filtroTipo);
      }
      if (filtroEstado) {
        params.append('estado', filtroEstado);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/api/rrhh/documentos/export/excel?${queryString}` : '/api/rrhh/documentos/export/excel';
      await api.download(url, `documentos_rrhh_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('Error al exportar a Excel');
    }
  };
  
  const handleExportPdf = async () => {
    try {
      let params = new URLSearchParams();
      if (empleadoSeleccionado) {
        params.append('empleado_id', empleadoSeleccionado);
      }
      if (filtroFechaDesde) {
        params.append('fecha_desde', filtroFechaDesde);
      }
      if (filtroFechaHasta) {
        params.append('fecha_hasta', filtroFechaHasta);
      }
      if (filtroTipo) {
        params.append('tipo', filtroTipo);
      }
      if (filtroEstado) {
        params.append('estado', filtroEstado);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/api/rrhh/documentos/export/pdf?${queryString}` : '/api/rrhh/documentos/export/pdf';
      await api.download(url, `informe_documentos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar el informe PDF');
    }
  };
  
  // Determinar si el archivo es imagen
  const isImageFile = (file) => {
    return file && file.type.startsWith('image/');
  };
  
  // Determinar si el archivo es PDF
  const isPdfFile = (file) => {
    return file && file.type === 'application/pdf';
  };
  
  // Formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const handleAbrirFirma = (doc) => {
    setDocumentoAFirmar(doc);
    setFirmaGuardada(null);
    setShowFirmaModal(true);
  };
  
  const handleLimpiarFirma = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setFirmaGuardada(null);
  };
  
  const handleCapturarFirma = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      const firmaDataUrl = sigCanvasRef.current.toDataURL('image/png');
      setFirmaGuardada(firmaDataUrl);
    }
  };
  
  const handleGuardarFirma = async () => {
    if (!firmaGuardada || !documentoAFirmar) return;
    
    try {
      await api.put(`/api/rrhh/documentos/${documentoAFirmar._id}/firmar`, {
        firma_url: firmaGuardada
      });
      
      setShowFirmaModal(false);
      setDocumentoAFirmar(null);
      setFirmaGuardada(null);
      fetchDocumentos();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleEliminarDocumento = async (docId) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    
    try {
      await api.delete(`/api/rrhh/documentos/${docId}`);
      fetchDocumentos();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  // Obtener nombre de empleado
  const getEmpleadoNombre = (empId) => {
    const emp = empleados.find(e => e._id === empId);
    return emp ? `${emp.nombre} ${emp.apellidos}` : 'Desconocido';
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  const docsPendientesFirma = documentos.filter(d => d.requiere_firma && !d.firmado).length;
  const docsFirmados = documentos.filter(d => d.firmado).length;
  
  return (
    <div>
      {/* KPIs de documentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
            {documentos.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Documentos</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>
            {docsPendientesFirma}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Pendientes de Firma</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>
            {docsFirmados}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Firmados</div>
        </div>
      </div>
      
      {/* Toolbar con Buscador */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Buscador de empleados */}
        <div ref={dropdownRef} style={{ position: 'relative', minWidth: '350px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'hsl(var(--muted-foreground))'
            }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre, DNI o código..."
              value={empleadoActual ? `${empleadoActual.codigo} - ${empleadoActual.nombre} ${empleadoActual.apellidos}` : busquedaEmpleado}
              onChange={e => {
                setBusquedaEmpleado(e.target.value);
                setEmpleadoSeleccionado('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              style={{ paddingLeft: '40px', paddingRight: empleadoSeleccionado ? '36px' : '12px' }}
            />
            {empleadoSeleccionado && (
              <button
                onClick={() => {
                  setEmpleadoSeleccionado('');
                  setBusquedaEmpleado('');
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'hsl(var(--muted-foreground))'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Dropdown de resultados */}
          {showDropdown && !empleadoSeleccionado && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              marginTop: '4px',
              maxHeight: '250px',
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              {/* Opción para ver todos */}
              <div
                onClick={() => {
                  setEmpleadoSeleccionado('');
                  setBusquedaEmpleado('');
                  setShowDropdown(false);
                }}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--muted) / 0.3)',
                  fontWeight: '500'
                }}
                onMouseEnter={e => e.target.style.background = 'hsl(var(--muted))'}
                onMouseLeave={e => e.target.style.background = 'hsl(var(--muted) / 0.3)'}
              >
                📋 Ver todos los documentos
              </div>
              
              {empleadosFiltrados.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                  No se encontraron empleados
                </div>
              ) : (
                empleadosFiltrados.slice(0, 10).map(emp => (
                  <div
                    key={emp._id}
                    onClick={() => {
                      setEmpleadoSeleccionado(emp._id);
                      setBusquedaEmpleado('');
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid hsl(var(--border) / 0.5)'
                    }}
                    onMouseEnter={e => e.target.style.background = 'hsl(var(--muted))'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: '500' }}>{emp.nombre} {emp.apellidos}</div>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                        {emp.codigo} • DNI: {emp.dni_nie || 'N/A'}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      background: 'hsl(var(--primary) / 0.1)', 
                      color: 'hsl(var(--primary))',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {emp.puesto || 'Sin puesto'}
                    </span>
                  </div>
                ))
              )}
              {empleadosFiltrados.length > 10 && (
                <div style={{ 
                  padding: '0.5rem 1rem', 
                  textAlign: 'center', 
                  fontSize: '0.75rem',
                  color: 'hsl(var(--muted-foreground))',
                  background: 'hsl(var(--muted) / 0.3)'
                }}>
                  +{empleadosFiltrados.length - 10} empleados más...
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Filtros de fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="form-input"
            style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
            title="Fecha desde"
          />
          <span style={{ color: 'hsl(var(--muted-foreground))' }}>-</span>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="form-input"
            style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
            title="Fecha hasta"
          />
          {(filtroFechaDesde || filtroFechaHasta) && (
            <button
              onClick={() => { setFiltroFechaDesde(''); setFiltroFechaHasta(''); }}
              className="btn btn-ghost btn-sm"
              title="Limpiar filtros de fecha"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Filtro por Tipo */}
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="form-select"
          style={{ minWidth: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
        >
          <option value="">Todos los tipos</option>
          {tiposDocumento.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        
        {/* Filtro por Estado */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="form-select"
          style={{ minWidth: '130px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
        >
          <option value="">Todos los estados</option>
          <option value="firmado">Firmados</option>
          <option value="pendiente">Pendientes firma</option>
          <option value="no_requiere">No requiere firma</option>
        </select>
        
        {/* Botón limpiar todos los filtros */}
        {(filtroTipo || filtroEstado || filtroFechaDesde || filtroFechaHasta) && (
          <button
            onClick={() => { 
              setFiltroFechaDesde(''); 
              setFiltroFechaHasta(''); 
              setFiltroTipo('');
              setFiltroEstado('');
            }}
            className="btn btn-ghost btn-sm"
            title="Limpiar todos los filtros"
            style={{ color: 'hsl(0 84% 60%)' }}
          >
            <X size={16} />
            Limpiar
          </button>
        )}
        
        {/* Botones de exportación */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary"
            disabled={documentos.length === 0}
            title="Exportar a Excel"
          >
            <FileText size={16} />
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="btn btn-secondary"
            disabled={documentos.length === 0}
            title="Generar Informe PDF"
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
        
        <button
          onClick={() => setShowNuevoDoc(true)}
          className="btn btn-primary"
          disabled={!empleadoSeleccionado}
          style={{ marginLeft: 'auto' }}
        >
          <Plus size={18} />
          Nuevo Documento
        </button>
      </div>
      
      {/* Lista de documentos */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Fecha Doc.</th>
                <th>Fecha Registro</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    {empleadoSeleccionado 
                      ? 'No hay documentos para este empleado' 
                      : 'Seleccione un empleado o vea todos los documentos'}
                  </td>
                </tr>
              ) : (
                documentos.map(doc => (
                  <tr key={doc._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ position: 'relative' }}>
                          <FileText size={18} style={{ color: 'hsl(var(--primary))' }} />
                          {doc.archivo_url && (
                            <div style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: 'hsl(142 76% 36%)',
                              border: '2px solid hsl(var(--card))'
                            }} title="Con archivo adjunto" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{doc.nombre}</div>
                          {doc.archivo_nombre_original && (
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Download size={10} />
                              {doc.archivo_nombre_original}
                            </div>
                          )}
                          {doc.descripcion && !doc.archivo_nombre_original && (
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                              {doc.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{getEmpleadoNombre(doc.empleado_id)}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        background: 'hsl(var(--muted))'
                      }}>
                        {tiposDocumento.find(t => t.value === doc.tipo)?.label || doc.tipo}
                      </span>
                    </td>
                    <td>{doc.fecha_creacion || '-'}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        }) : '-'}
                      </div>
                      {doc.created_at && (
                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                          {new Date(doc.created_at).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      {doc.firmado ? (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: 'hsl(142 76% 36% / 0.1)',
                          color: 'hsl(142 76% 36%)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Check size={14} />
                          Firmado
                        </span>
                      ) : doc.requiere_firma ? (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: 'hsl(38 92% 50% / 0.1)',
                          color: 'hsl(38 92% 50%)'
                        }}>
                          Pendiente
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          background: 'hsl(var(--muted))'
                        }}>
                          Sin firma
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {doc.archivo_url && (
                          <a
                            href={`${BACKEND_URL}${doc.archivo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            title="Descargar archivo"
                            style={{ color: 'hsl(142 76% 36%)' }}
                          >
                            <Download size={16} />
                          </a>
                        )}
                        {doc.requiere_firma && !doc.firmado && (
                          <button
                            onClick={() => handleAbrirFirma(doc)}
                            className="btn btn-ghost btn-sm"
                            title="Firmar documento"
                            style={{ color: 'hsl(var(--primary))' }}
                          >
                            <PenTool size={16} />
                          </button>
                        )}
                        {doc.firmado && doc.firma_empleado_url && (
                          <button
                            onClick={() => {
                              setDocumentoAFirmar(doc);
                              setFirmaGuardada(doc.firma_empleado_url);
                              setShowFirmaModal(true);
                            }}
                            className="btn btn-ghost btn-sm"
                            title="Ver firma"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminarDocumento(doc._id)}
                          className="btn btn-ghost btn-sm"
                          title="Eliminar"
                          style={{ color: 'hsl(0 84% 60%)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Nuevo Documento */}
      {showNuevoDoc && (
        <div onClick={() => setShowNuevoDoc(false)} style={{
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
            maxWidth: '550px',
            width: '100%',
            maxHeight: '85vh', 
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>Nuevo Documento</h2>
              <button onClick={() => setShowNuevoDoc(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Zona de arrastre de archivo */}
              <div className="form-group">
                <label>Archivo Adjunto</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  style={{ display: 'none' }}
                />
                
                {!archivoAdjunto ? (
                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                      borderRadius: '0.75rem',
                      padding: '2rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragging ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--muted) / 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Upload 
                      size={40} 
                      style={{ 
                        margin: '0 auto 0.75rem', 
                        color: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                      }} 
                    />
                    <p style={{ 
                      fontWeight: '500', 
                      marginBottom: '0.25rem',
                      color: isDragging ? 'hsl(var(--primary))' : 'inherit'
                    }}>
                      {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo aquí'}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                      o haz clic para seleccionar
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                      PDF, Word, Imágenes • Máx. 10MB
                    </p>
                  </div>
                ) : (
                  <div style={{
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    background: 'hsl(var(--muted) / 0.3)'
                  }}>
                    {/* Vista previa de imagen */}
                    {isImageFile(archivoAdjunto) && (
                      <div 
                        onClick={() => setShowPreview(true)}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          background: '#f8f9fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          maxHeight: '200px',
                          overflow: 'hidden'
                        }}
                      >
                        <img 
                          src={archivoPreview} 
                          alt="Vista previa"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            objectFit: 'contain'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Eye size={12} />
                          Click para ampliar
                        </div>
                      </div>
                    )}
                    
                    {/* Vista previa de PDF */}
                    {isPdfFile(archivoAdjunto) && (
                      <div style={{
                        position: 'relative',
                        height: '180px',
                        background: '#525659'
                      }}>
                        <iframe
                          src={`${archivoPreview}#toolbar=0&navpanes=0`}
                          title="Vista previa PDF"
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none'
                          }}
                        />
                        <div 
                          onClick={() => setShowPreview(true)}
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} />
                          Ver completo
                        </div>
                      </div>
                    )}
                    
                    {/* Icono para Word docs */}
                    {!isImageFile(archivoAdjunto) && !isPdfFile(archivoAdjunto) && (
                      <div style={{
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'hsl(var(--primary) / 0.05)'
                      }}>
                        <FileText size={48} style={{ color: 'hsl(var(--primary))', marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          Documento Word
                        </span>
                      </div>
                    )}
                    
                    {/* Info del archivo */}
                    <div style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderTop: '1px solid hsl(var(--border))'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.5rem',
                        background: isImageFile(archivoAdjunto) 
                          ? 'hsl(262 83% 58% / 0.1)' 
                          : isPdfFile(archivoAdjunto) 
                            ? 'hsl(0 84% 60% / 0.1)'
                            : 'hsl(217 91% 60% / 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isImageFile(archivoAdjunto) ? (
                          <Camera size={20} style={{ color: 'hsl(262 83% 58%)' }} />
                        ) : isPdfFile(archivoAdjunto) ? (
                          <FileText size={20} style={{ color: 'hsl(0 84% 60%)' }} />
                        ) : (
                          <FileText size={20} style={{ color: 'hsl(217 91% 60%)' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ 
                          fontWeight: '500', 
                          marginBottom: '0.125rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.9rem'
                        }}>
                          {archivoAdjunto.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          {formatFileSize(archivoAdjunto.size)} • {
                            isImageFile(archivoAdjunto) ? 'Imagen' :
                            isPdfFile(archivoAdjunto) ? 'PDF' : 'Documento'
                          }
                        </p>
                      </div>
                      <button
                        onClick={removeArchivoAdjunto}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'hsl(0 84% 60%)' }}
                        title="Eliminar archivo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Nombre del Documento *</label>
                <input
                  type="text"
                  className="form-input"
                  value={nuevoDocData.nombre}
                  onChange={e => setNuevoDocData({...nuevoDocData, nombre: e.target.value})}
                  placeholder="Ej: Contrato Temporal 2025"
                />
              </div>
              
              <div className="form-group">
                <label>Tipo de Documento</label>
                <select
                  className="form-select"
                  value={nuevoDocData.tipo}
                  onChange={e => setNuevoDocData({...nuevoDocData, tipo: e.target.value})}
                >
                  {tiposDocumento.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={nuevoDocData.descripcion}
                  onChange={e => setNuevoDocData({...nuevoDocData, descripcion: e.target.value})}
                  placeholder="Descripción opcional del documento..."
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={nuevoDocData.requiere_firma}
                    onChange={e => setNuevoDocData({...nuevoDocData, requiere_firma: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Requiere firma del empleado</span>
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => { setShowNuevoDoc(false); removeArchivoAdjunto(); }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button 
                  onClick={handleCrearDocumento} 
                  className="btn btn-primary"
                  disabled={!nuevoDocData.nombre || uploading}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" style={{ marginRight: '0.5rem' }}></div>
                      Subiendo...
                    </>
                  ) : (
                    'Crear Documento'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Vista Previa Ampliada */}
      {showPreview && archivoPreview && (
        <div 
          onClick={() => setShowPreview(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '2rem'
          }}
        >
          <button 
            onClick={() => setShowPreview(false)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <X size={24} />
          </button>
          
          {isImageFile(archivoAdjunto) && (
            <img 
              src={archivoPreview}
              alt="Vista previa ampliada"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            />
          )}
          
          {isPdfFile(archivoAdjunto) && (
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                width: '90%',
                height: '90vh',
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <iframe
                src={archivoPreview}
                title="Vista previa PDF completa"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            </div>
          )}
          
          {/* Info del archivo en la parte inferior */}
          <div style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <span style={{ fontWeight: '500' }}>{archivoAdjunto?.name}</span>
            <span style={{ opacity: 0.7 }}>{archivoAdjunto && formatFileSize(archivoAdjunto.size)}</span>
          </div>
        </div>
      )}
      
      {/* Modal Firma Digital */}
      {showFirmaModal && documentoAFirmar && (
        <div onClick={() => setShowFirmaModal(false)} style={{
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '85vh', 
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>{documentoAFirmar.firmado ? 'Ver Firma' : 'Firmar Documento'}</h2>
              <button onClick={() => setShowFirmaModal(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Info del documento */}
              <div style={{ 
                padding: '1rem', 
                background: 'hsl(var(--muted))', 
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{documentoAFirmar.nombre}</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  Empleado: {getEmpleadoNombre(documentoAFirmar.empleado_id)}
                </div>
                {documentoAFirmar.fecha_firma && (
                  <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
                    Firmado el: {documentoAFirmar.fecha_firma}
                  </div>
                )}
              </div>
              
              {/* Área de firma */}
              {documentoAFirmar.firmado && firmaGuardada ? (
                // Mostrar firma existente
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
                    Firma registrada:
                  </div>
                  <img 
                    src={firmaGuardada} 
                    alt="Firma" 
                    style={{ 
                      maxWidth: '100%', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      background: 'white'
                    }}
                  />
                </div>
              ) : (
                // Canvas para firmar
                <>
                  <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>
                    Firme en el recuadro a continuación:
                  </div>
                  
                  {!firmaGuardada ? (
                    <div style={{ 
                      border: '2px dashed hsl(var(--border))',
                      borderRadius: '0.5rem',
                      background: 'white',
                      marginBottom: '1rem'
                    }}>
                      <SignatureCanvas
                        ref={sigCanvasRef}
                        canvasProps={{
                          width: 550,
                          height: 200,
                          className: 'signature-canvas',
                          style: { width: '100%', height: '200px' }
                        }}
                        backgroundColor="white"
                        penColor="black"
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: 'hsl(142 76% 36%)', marginBottom: '0.5rem' }}>
                        Vista previa de la firma:
                      </div>
                      <img 
                        src={firmaGuardada} 
                        alt="Firma capturada" 
                        style={{ 
                          maxWidth: '100%', 
                          border: '2px solid hsl(142 76% 36%)',
                          borderRadius: '0.5rem'
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!firmaGuardada && (
                        <button onClick={handleLimpiarFirma} className="btn btn-secondary">
                          Limpiar
                        </button>
                      )}
                      {firmaGuardada && (
                        <button 
                          onClick={() => setFirmaGuardada(null)} 
                          className="btn btn-secondary"
                        >
                          Repetir Firma
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!firmaGuardada ? (
                        <button onClick={handleCapturarFirma} className="btn btn-primary">
                          <Check size={18} />
                          Capturar Firma
                        </button>
                      ) : (
                        <button onClick={handleGuardarFirma} className="btn btn-primary">
                          <PenTool size={18} />
                          Guardar y Firmar
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RRHH;
