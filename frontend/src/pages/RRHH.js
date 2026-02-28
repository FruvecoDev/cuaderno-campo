import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, Filter, X, User, QrCode, 
  CreditCard, Camera, Download, Upload, FileText, Clock,
  TrendingUp, Users, UserCheck, UserX, ChevronDown, Eye,
  Smartphone, Fingerprint, Check, PenTool
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import { QrReader } from 'react-qr-reader';
import SignatureCanvas from 'react-signature-canvas';
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
                            {emp.activo && (
                              <button
                                onClick={() => handleDelete(emp._id)}
                                className="btn btn-ghost btn-sm"
                                title="Dar de baja"
                                style={{ color: 'hsl(0 84% 60%)' }}
                              >
                                <Trash2 size={16} />
                              </button>
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
        <ControlHorario empleados={empleados} />
      )}

      {/* Tab Content: Productividad */}
      {activeTab === 'productividad' && (
        <Productividad empleados={empleados} />
      )}

      {/* Tab Content: Documentos */}
      {activeTab === 'documentos' && (
        <DocumentosEmpleado empleados={empleados} />
      )}

      {/* Tab Content: Prenómina */}
      {activeTab === 'prenomina' && (
        <Prenomina empleados={empleados} />
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
// Sub-componente: Control Horario
// ============================================================================
const ControlHorario = ({ empleados }) => {
  const [fichajes, setFichajes] = useState([]);
  const [fichajesHoy, setFichajesHoy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFicharModal, setShowFicharModal] = useState(false);
  const [metodoFichaje, setMetodoFichaje] = useState('manual');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [tipoFichaje, setTipoFichaje] = useState('entrada');
  
  // Estados para QR Scanner
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  
  // Estados para Facial
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [facialEmpleado, setFacialEmpleado] = useState('');
  
  // Estado para feedback
  const [fichajeResult, setFichajeResult] = useState(null);
  
  useEffect(() => {
    fetchFichajesHoy();
  }, []);
  
  // Limpiar cámara al cerrar modal
  useEffect(() => {
    if (!showFicharModal) {
      stopCamera();
      setScannerActive(false);
      setScanResult(null);
      setScanError(null);
      setCapturedPhoto(null);
      setFichajeResult(null);
    }
  }, [showFicharModal]);
  
  const fetchFichajesHoy = async () => {
    try {
      const data = await api.get('/api/rrhh/fichajes/hoy');
      setFichajesHoy(data);
      setFichajes(data.fichajes || []);
    } catch (err) {
      console.error('Error fetching fichajes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFicharManual = async () => {
    if (!empleadoSeleccionado) return;
    
    try {
      const now = new Date();
      const result = await api.post('/api/rrhh/fichajes', {
        empleado_id: empleadoSeleccionado,
        tipo: tipoFichaje,
        fecha: now.toISOString().split('T')[0],
        hora: now.toTimeString().split(' ')[0],
        metodo_identificacion: 'manual'
      });
      
      setFichajeResult({ success: true, data: result.data });
      setEmpleadoSeleccionado('');
      fetchFichajesHoy();
      
      setTimeout(() => {
        setShowFicharModal(false);
        setFichajeResult(null);
      }, 2000);
    } catch (err) {
      console.error('Error fichando:', err);
      setFichajeResult({ success: false, error: api.getErrorMessage(err) });
    }
  };
  
  // Handler para escaneo QR
  const handleQRScan = async (result, error) => {
    if (result) {
      const qrCode = result?.text;
      if (qrCode && !scanResult) {
        setScannerActive(false);
        setScanResult(qrCode);
        
        try {
          const now = new Date();
          const response = await api.post('/api/rrhh/fichajes/qr', {
            qr_code: qrCode,
            tipo: tipoFichaje
          });
          
          setFichajeResult({ success: true, data: response.data });
          fetchFichajesHoy();
          
          setTimeout(() => {
            setShowFicharModal(false);
            setFichajeResult(null);
            setScanResult(null);
          }, 2000);
        } catch (err) {
          setScanError(api.getErrorMessage(err));
          setFichajeResult({ success: false, error: api.getErrorMessage(err) });
        }
      }
    }
    if (error && error?.message !== 'No QR code found') {
      console.error('QR Error:', error);
    }
  };
  
  // Funciones para cámara (Facial)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setScanError('No se pudo acceder a la cámara');
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedPhoto(photoData);
      stopCamera();
    }
  };
  
  const handleFichaFacial = async () => {
    if (!facialEmpleado || !capturedPhoto) return;
    
    try {
      const response = await api.post('/api/rrhh/fichajes/facial', {
        empleado_id: facialEmpleado,
        foto_capturada: capturedPhoto,
        tipo: tipoFichaje
      });
      
      setFichajeResult({ success: true, data: response.data });
      fetchFichajesHoy();
      
      setTimeout(() => {
        setShowFicharModal(false);
        setFichajeResult(null);
        setCapturedPhoto(null);
        setFacialEmpleado('');
      }, 2000);
    } catch (err) {
      setFichajeResult({ success: false, error: api.getErrorMessage(err) });
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  return (
    <div>
      {/* Stats del día */}
      {fichajesHoy?.estadisticas && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
              {fichajesHoy.estadisticas.empleados_fichados}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Fichados Hoy</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>
              {fichajesHoy.estadisticas.pendientes_fichar}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Pendientes</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {fichajesHoy.estadisticas.empleados_activos}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Activos</div>
          </div>
        </div>
      )}
      
      {/* Botón Fichar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => setShowFicharModal(true)} className="btn btn-primary">
          <Clock size={18} />
          Registrar Fichaje
        </button>
      </div>
      
      {/* Lista de fichajes del día */}
      <div className="card">
        <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <h3 style={{ fontWeight: '600' }}>Fichajes de Hoy</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Hora</th>
                <th>Método</th>
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {fichajes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay fichajes registrados hoy
                  </td>
                </tr>
              ) : (
                fichajes.map(f => (
                  <tr key={f._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                        {f.empleado_nombre}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: f.tipo === 'entrada' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                        color: f.tipo === 'entrada' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
                      }}>
                        {f.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{f.hora}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {f.metodo_identificacion === 'qr' && <QrCode size={14} />}
                        {f.metodo_identificacion === 'nfc' && <CreditCard size={14} />}
                        {f.metodo_identificacion === 'facial' && <Camera size={14} />}
                        {f.metodo_identificacion === 'manual' && <User size={14} />}
                        {f.metodo_identificacion}
                      </span>
                    </td>
                    <td>{f.ubicacion_nombre || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Fichar */}
      {showFicharModal && (
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
        }} onClick={() => setShowFicharModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
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
              <h2 style={{ margin: 0 }}>Registrar Fichaje</h2>
              <button onClick={() => setShowFicharModal(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Método de fichaje */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'manual', label: 'Manual', icon: User },
                  { id: 'qr', label: 'QR', icon: QrCode },
                  { id: 'nfc', label: 'NFC', icon: CreditCard },
                  { id: 'facial', label: 'Facial', icon: Camera }
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetodoFichaje(m.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        border: metodoFichaje === m.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        background: metodoFichaje === m.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={24} />
                      <span style={{ fontSize: '0.75rem' }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {metodoFichaje === 'manual' && (
                <>
                  <div className="form-group">
                    <label>Empleado</label>
                    <select
                      className="form-select"
                      value={empleadoSeleccionado}
                      onChange={e => setEmpleadoSeleccionado(e.target.value)}
                    >
                      <option value="">Seleccionar empleado...</option>
                      {empleados.filter(e => e.activo).map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.codigo} - {emp.nombre} {emp.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Tipo</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleFicharManual}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={!empleadoSeleccionado}
                  >
                    Registrar Fichaje
                  </button>
                </>
              )}
              
              {metodoFichaje === 'qr' && (
                <div>
                  {/* Selector de tipo de fichaje */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Tipo de Fichaje</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                  
                  {!scannerActive && !scanResult && (
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setScannerActive(true)}
                        className="btn btn-primary"
                        style={{ padding: '1rem 2rem' }}
                      >
                        <QrCode size={24} />
                        Activar Cámara para Escanear QR
                      </button>
                    </div>
                  )}
                  
                  {scannerActive && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ 
                        width: '100%', 
                        maxWidth: '300px', 
                        margin: '0 auto',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        border: '2px solid hsl(var(--primary))'
                      }}>
                        <QrReader
                          onResult={handleQRScan}
                          constraints={{ facingMode: 'environment' }}
                          scanDelay={500}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                        Apunte al código QR del empleado
                      </p>
                      <button
                        onClick={() => setScannerActive(false)}
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: '1rem' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  
                  {scanError && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1rem', 
                      background: 'hsl(0 84% 60% / 0.1)', 
                      borderRadius: '0.5rem',
                      color: 'hsl(0 84% 60%)',
                      textAlign: 'center'
                    }}>
                      {scanError}
                    </div>
                  )}
                </div>
              )}
              
              {metodoFichaje === 'nfc' && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <CreditCard size={64} style={{ margin: '0 auto', opacity: 0.5 }} />
                  <p style={{ marginTop: '1rem', color: 'hsl(var(--muted-foreground))' }}>
                    Acerque la tarjeta NFC al lector
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                    (Requiere dispositivo con NFC habilitado - Chrome en Android)
                  </p>
                  
                  {/* Selector de tipo */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px', margin: '0 auto' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {metodoFichaje === 'facial' && (
                <div>
                  {/* Selector de empleado */}
                  <div className="form-group">
                    <label>Empleado</label>
                    <select
                      className="form-select"
                      value={facialEmpleado}
                      onChange={e => setFacialEmpleado(e.target.value)}
                    >
                      <option value="">Seleccionar empleado...</option>
                      {empleados.filter(e => e.activo).map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.codigo} - {emp.nombre} {emp.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Selector de tipo */}
                  <div className="form-group">
                    <label>Tipo</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                  
                  {/* Área de cámara */}
                  <div style={{ marginTop: '1rem' }}>
                    {!cameraActive && !capturedPhoto && (
                      <button
                        onClick={startCamera}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={!facialEmpleado}
                      >
                        <Camera size={18} />
                        Activar Cámara
                      </button>
                    )}
                    
                    {cameraActive && (
                      <div>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          style={{ 
                            width: '100%', 
                            maxWidth: '300px',
                            margin: '0 auto',
                            display: 'block',
                            borderRadius: '0.5rem',
                            border: '2px solid hsl(var(--primary))'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button onClick={stopCamera} className="btn btn-secondary" style={{ flex: 1 }}>
                            Cancelar
                          </button>
                          <button onClick={capturePhoto} className="btn btn-primary" style={{ flex: 1 }}>
                            <Camera size={18} />
                            Capturar Foto
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {capturedPhoto && (
                      <div>
                        <img 
                          src={capturedPhoto} 
                          alt="Foto capturada" 
                          style={{ 
                            width: '100%', 
                            maxWidth: '300px',
                            margin: '0 auto',
                            display: 'block',
                            borderRadius: '0.5rem',
                            border: '2px solid hsl(142 76% 36%)'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button 
                            onClick={() => { setCapturedPhoto(null); startCamera(); }} 
                            className="btn btn-secondary" 
                            style={{ flex: 1 }}
                          >
                            Repetir
                          </button>
                          <button 
                            onClick={handleFichaFacial} 
                            className="btn btn-primary" 
                            style={{ flex: 1 }}
                          >
                            <Check size={18} />
                            Confirmar Fichaje
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                </div>
              )}
              
              {/* Resultado del fichaje */}
              {fichajeResult && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: fichajeResult.success ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                  textAlign: 'center'
                }}>
                  {fichajeResult.success ? (
                    <>
                      <Check size={32} style={{ color: 'hsl(142 76% 36%)', margin: '0 auto' }} />
                      <div style={{ marginTop: '0.5rem', fontWeight: '600', color: 'hsl(142 76% 36%)' }}>
                        ¡Fichaje Registrado!
                      </div>
                      {fichajeResult.data && (
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {fichajeResult.data.empleado_nombre} - {fichajeResult.data.tipo}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <X size={32} style={{ color: 'hsl(0 84% 60%)', margin: '0 auto' }} />
                      <div style={{ marginTop: '0.5rem', fontWeight: '600', color: 'hsl(0 84% 60%)' }}>
                        Error
                      </div>
                      <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {fichajeResult.error}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-componente: Productividad
// ============================================================================
const Productividad = ({ empleados }) => {
  const [stats, setStats] = useState(null);
  const [tiempoReal, setTiempoReal] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [statsData, tiempoRealData] = await Promise.all([
        api.get('/api/rrhh/productividad/stats'),
        api.get('/api/rrhh/productividad/tiempo-real')
      ]);
      setStats(statsData);
      setTiempoReal(tiempoRealData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  return (
    <div>
      {/* Tiempo Real */}
      {tiempoReal && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(142 76% 36%)', animation: 'pulse 2s infinite' }}></span>
              Productividad en Tiempo Real
            </h3>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
              {tiempoReal.total_empleados_trabajando} empleados trabajando
            </span>
          </div>
          
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{tiempoReal.totales_hoy?.total_kilos?.toFixed(0) || 0} kg</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Hoy</div>
              </div>
              <div style={{ padding: '1rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{tiempoReal.totales_hoy?.total_horas?.toFixed(1) || 0} h</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Trabajadas</div>
              </div>
            </div>
            
            {tiempoReal.empleados_trabajando?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Empleados Activos</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tiempoReal.empleados_trabajando.map(emp => (
                    <div key={emp.empleado_id} style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: 'hsl(var(--primary) / 0.1)', 
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <User size={14} />
                      {emp.empleado_nombre}
                      {emp.kilos_hoy > 0 && <span style={{ fontWeight: '600' }}>({emp.kilos_hoy} kg)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Estadísticas del periodo */}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_kilos?.toFixed(0) || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Totales</div>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_hectareas?.toFixed(1) || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Hectáreas</div>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_horas?.toFixed(0) || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Trabajadas</div>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_registros || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Registros</div>
            </div>
          </div>
          
          {/* Top Empleados */}
          {stats.top_empleados?.length > 0 && (
            <div className="card">
              <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                <h3 style={{ fontWeight: '600' }}>Top 10 Empleados por Productividad</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Empleado</th>
                      <th>Kilos</th>
                      <th>Horas</th>
                      <th>Kg/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_empleados.map((emp, idx) => (
                      <tr key={emp.empleado_id}>
                        <td style={{ fontWeight: '600', color: idx < 3 ? 'hsl(var(--primary))' : 'inherit' }}>{idx + 1}</td>
                        <td>{emp.empleado_nombre}</td>
                        <td style={{ fontWeight: '600' }}>{emp.total_kilos?.toFixed(0)}</td>
                        <td>{emp.total_horas?.toFixed(1)}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            background: emp.kilos_hora > 50 ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))',
                            color: emp.kilos_hora > 50 ? 'hsl(142 76% 36%)' : 'inherit',
                            fontWeight: '600'
                          }}>
                            {emp.kilos_hora}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// Sub-componente: Prenómina
// ============================================================================
const Prenomina = ({ empleados }) => {
  const [prenominas, setPrenominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());
  const [calculando, setCalculando] = useState(false);
  
  useEffect(() => {
    fetchPrenominas();
  }, [mesSeleccionado, anoSeleccionado]);
  
  const fetchPrenominas = async () => {
    try {
      const data = await api.get(`/api/rrhh/prenominas?mes=${mesSeleccionado}&ano=${anoSeleccionado}`);
      setPrenominas(data.prenominas || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCalcularTodas = async () => {
    if (!window.confirm('¿Calcular prenóminas de todos los empleados activos?')) return;
    
    setCalculando(true);
    try {
      await api.post('/api/rrhh/prenominas/calcular-todos', {
        mes: mesSeleccionado,
        ano: anoSeleccionado
      });
      fetchPrenominas();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setCalculando(false);
    }
  };
  
  const handleExportar = async () => {
    try {
      const data = await api.get(`/api/rrhh/prenominas/export?mes=${mesSeleccionado}&ano=${anoSeleccionado}`);
      
      // Crear CSV
      const headers = ['Código', 'DNI', 'Nombre', 'Horas Normales', 'Horas Extra', 'Horas Nocturnas', 'Total Horas', 'Días', 'Importe Bruto', 'Importe Neto'];
      const rows = data.prenominas.map(p => [
        p.codigo_empleado, p.dni, p.nombre, p.horas_normales, p.horas_extra, p.horas_nocturnas, p.total_horas, p.dias_trabajados, p.importe_bruto, p.importe_neto
      ]);
      
      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prenominas_${anoSeleccionado}_${mesSeleccionado}.csv`;
      a.click();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  const totalBruto = prenominas.reduce((acc, p) => acc + (p.importe_bruto || 0), 0);
  
  return (
    <div>
      {/* Selector de periodo */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={mesSeleccionado}
          onChange={e => setMesSeleccionado(parseInt(e.target.value))}
          className="form-select"
          style={{ minWidth: '150px' }}
        >
          {meses.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
        </select>
        
        <select
          value={anoSeleccionado}
          onChange={e => setAnoSeleccionado(parseInt(e.target.value))}
          className="form-select"
          style={{ minWidth: '100px' }}
        >
          {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        
        <button
          onClick={handleCalcularTodas}
          className="btn btn-primary"
          disabled={calculando}
        >
          {calculando ? 'Calculando...' : 'Calcular Prenóminas'}
        </button>
        
        {prenominas.length > 0 && (
          <button onClick={handleExportar} className="btn btn-secondary">
            <Download size={18} />
            Exportar CSV
          </button>
        )}
        
        <div style={{ marginLeft: 'auto', padding: '0.75rem 1rem', background: 'hsl(var(--primary) / 0.1)', borderRadius: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Bruto: </span>
          <span style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{totalBruto.toFixed(2)} €</span>
        </div>
      </div>
      
      {/* Tabla de prenóminas */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>DNI</th>
                <th>H. Normales</th>
                <th>H. Extra</th>
                <th>Total Horas</th>
                <th>Días</th>
                <th>Importe Bruto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {prenominas.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay prenóminas para este periodo. Haga clic en "Calcular Prenóminas".
                  </td>
                </tr>
              ) : (
                prenominas.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '500' }}>{p.empleado_nombre}</td>
                    <td>{p.empleado_dni}</td>
                    <td>{p.horas_normales?.toFixed(1)}</td>
                    <td>{p.horas_extra?.toFixed(1)}</td>
                    <td style={{ fontWeight: '600' }}>{p.total_horas?.toFixed(1)}</td>
                    <td>{p.dias_trabajados}</td>
                    <td style={{ fontWeight: '600' }}>{p.importe_bruto?.toFixed(2)} €</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: p.estado === 'validada' ? 'hsl(142 76% 36% / 0.1)' : 
                                  p.estado === 'exportada' ? 'hsl(217 91% 60% / 0.1)' : 'hsl(var(--muted))',
                        color: p.estado === 'validada' ? 'hsl(142 76% 36%)' : 
                              p.estado === 'exportada' ? 'hsl(217 91% 60%)' : 'inherit'
                      }}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
  }, [empleadoSeleccionado]);
  
  const fetchDocumentos = async () => {
    try {
      let url = '/api/rrhh/documentos';
      if (empleadoSeleccionado) {
        url += `?empleado_id=${empleadoSeleccionado}`;
      }
      const data = await api.get(url);
      setDocumentos(data.documentos || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCrearDocumento = async () => {
    if (!empleadoSeleccionado || !nuevoDocData.nombre) return;
    
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
        formData.append('requiere_firma', nuevoDocData.requiere_firma);
        formData.append('fecha_creacion', new Date().toISOString().split('T')[0]);
        
        await api.upload('/api/rrhh/documentos/upload', formData);
      } else {
        // Sin archivo, solo crear metadatos
        await api.post('/api/rrhh/documentos', {
          empleado_id: empleadoSeleccionado,
          ...nuevoDocData,
          fecha_creacion: new Date().toISOString().split('T')[0]
        });
      }
      
      setShowNuevoDoc(false);
      setNuevoDocData({ nombre: '', tipo: 'contrato', descripcion: '', requiere_firma: true });
      setArchivoAdjunto(null);
      fetchDocumentos();
    } catch (err) {
      console.error('Error:', err);
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
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
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
                    <td>{doc.fecha_creacion || doc.created_at?.split('T')[0]}</td>
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
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'hsl(var(--muted) / 0.3)'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '0.5rem',
                      background: 'hsl(var(--primary) / 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={24} style={{ color: 'hsl(var(--primary))' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontWeight: '500', 
                        marginBottom: '0.125rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {archivoAdjunto.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                        {formatFileSize(archivoAdjunto.size)}
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
                <button onClick={() => { setShowNuevoDoc(false); setArchivoAdjunto(null); }} className="btn btn-secondary">
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
