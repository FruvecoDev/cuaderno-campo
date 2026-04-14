import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, UserX, UserCheck, Shield, Settings, X, Check, Eye, EyeOff, Key, ShoppingBag, Link, Unlink, Users, Leaf, FileText, Clipboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';

const DEFAULT_COLUMNS = [
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'email', label: 'Email', visible: true },
  { id: 'rol', label: 'Rol', visible: true },
  { id: 'empleado', label: 'Empleado Vinculado', visible: true },
  { id: 'tipo_operacion', label: 'Tipo Operacion', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
  { id: 'fecha_creacion', label: 'Fecha Creacion', visible: true },
];


const Usuarios = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuPermissions, setMenuPermissions] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  // Permission profiles
  const [permissionProfiles, setPermissionProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  // Edit user modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({ full_name: '', email: '', role: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  // Tipo operacion modal
  const [showTipoOperacionModal, setShowTipoOperacionModal] = useState(false);
  const [selectedUserForTipoOp, setSelectedUserForTipoOp] = useState(null);
  const [tipoOperacionValue, setTipoOperacionValue] = useState('ambos');
  const [savingTipoOp, setSavingTipoOp] = useState(false);
  // Vincular empleado modal
  const [showVincularEmpleadoModal, setShowVincularEmpleadoModal] = useState(false);
  const [selectedUserForVincular, setSelectedUserForVincular] = useState(null);
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');
  const [savingVinculacion, setSavingVinculacion] = useState(false);
  const { token, user: currentUser } = useAuth();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('usuarios_col_config', DEFAULT_COLUMNS);
  
  const ROLES = [
    { value: 'Admin', label: t('users.admin'), description: t('users.adminDesc') },
    { value: 'Manager', label: t('users.manager'), description: t('users.managerDesc') },
    { value: 'Technician', label: t('users.technician'), description: t('users.technicianDesc') },
    { value: 'Viewer', label: t('users.viewer'), description: t('users.viewerDesc') },
    { value: 'Empleado', label: 'Empleado', description: 'Acceso al Portal del Empleado únicamente' }
  ];
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'Viewer'
  });

  useEffect(() => {
    fetchUsers();
    fetchMenuItems();
    fetchEmpleadosDisponibles();
    fetchPermissionProfiles();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get('/api/auth/users');
      setUsers(data.users || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const data = await api.get('/api/auth/menu-items');
      setMenuItems(data.menu_items || []);
    } catch (error) {

    }
  };

  const fetchPermissionProfiles = async () => {
    try {
      const data = await api.get('/api/auth/permission-profiles');
      setPermissionProfiles(data.profiles || []);
    } catch (error) {

    }
  };

  const fetchEmpleadosDisponibles = async () => {
    try {
      const data = await api.get('/api/auth/empleados-disponibles');
      setEmpleadosDisponibles(data.empleados || []);
    } catch (error) {

    }
  };

  const openPermissionsModal = (user) => {
    setSelectedUserForPermissions(user);
    setSelectedProfile(null); // Reset profile selection
    // Initialize permissions from user or default to all true
    const defaultPerms = {};
    menuItems.forEach(item => {
      defaultPerms[item.path] = true;
    });
    setMenuPermissions(user.menu_permissions || defaultPerms);
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    
    setSavingPermissions(true);
    try {
      await api.put(`/api/auth/users/${selectedUserForPermissions._id}/menu-permissions`, { menu_permissions: menuPermissions });
      setShowPermissionsModal(false);
      setSelectedUserForPermissions(null);
      fetchUsers();
    } catch (error) {

      alert('Error guardando permisos');
    } finally {
      setSavingPermissions(false);
    }
  };

  const togglePermission = (path) => {
    setMenuPermissions(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const toggleSection = (section) => {
    const sectionItems = menuItems.filter(item => item.section === section);
    const allEnabled = sectionItems.every(item => menuPermissions[item.path]);
    
    const newPerms = { ...menuPermissions };
    sectionItems.forEach(item => {
      newPerms[item.path] = !allEnabled;
    });
    setMenuPermissions(newPerms);
  };

  // Apply a predefined permission profile
  const applyProfile = (profile) => {
    if (!profile) return;
    setSelectedProfile(profile.id);
    setMenuPermissions({ ...profile.permissions });
  };

  // Password change functions
  const openPasswordModal = (user) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }
    
    setSavingPassword(true);
    try {
      await api.put(`/api/auth/users/${selectedUserForPassword._id}/password`, { new_password: newPassword });
      setShowPasswordModal(false);
      setSelectedUserForPassword(null);
      alert('Contraseña actualizada correctamente');
    } catch (error) {

      setPasswordError('Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  // Edit user functions
  const openEditModal = (user) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'Viewer'
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setEditError('');
    
    if (!editFormData.full_name.trim()) {
      setEditError('El nombre es obligatorio');
      return;
    }
    
    if (!editFormData.email.trim() || !editFormData.email.includes('@')) {
      setEditError('Introduce un email válido');
      return;
    }
    
    setSavingEdit(true);
    try {
      await api.put(`/api/auth/users/${selectedUserForEdit._id}`, editFormData);
      setShowEditModal(false);
      setSelectedUserForEdit(null);
      fetchUsers();
    } catch (error) {

      setEditError('Error al actualizar usuario');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/register', formData);
      setShowForm(false);
      fetchUsers();
      setFormData({ email: '', password: '', full_name: '', role: 'Viewer' });
    } catch (error) {

      alert(t('messages.errorSaving'));
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.put(`/api/auth/users/${userId}`, { is_active: !currentStatus });
      fetchUsers();
    } catch (error) {

    }
  };

  const handleEditRole = async (userId, newRole) => {
    try {
      await api.put(`/api/auth/users/${userId}`, { role: newRole });
      fetchUsers();
      setEditingUser(null);
    } catch (error) {

    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin': return 'badge-error';
      case 'Manager': return 'badge-warning';
      case 'Technician': return 'badge-info';
      case 'Viewer': return 'badge-secondary';
      case 'Empleado': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  // Tipo operacion functions
  const openTipoOperacionModal = (user) => {
    setSelectedUserForTipoOp(user);
    setTipoOperacionValue(user.tipo_operacion || 'ambos');
    setShowTipoOperacionModal(true);
  };

  const handleSaveTipoOperacion = async () => {
    if (!selectedUserForTipoOp) return;
    
    setSavingTipoOp(true);
    try {
      await api.put(`/api/auth/users/${selectedUserForTipoOp._id}/tipo-operacion`, { tipo_operacion: tipoOperacionValue });
      setShowTipoOperacionModal(false);
      setSelectedUserForTipoOp(null);
      fetchUsers();
    } catch (error) {

      alert('Error guardando tipo de operación');
    } finally {
      setSavingTipoOp(false);
    }
  };

  const getTipoOperacionBadge = (tipo) => {
    switch (tipo) {
      case 'compra': return { label: 'Compra', color: '#3b82f6', bg: '#dbeafe' };
      case 'venta': return { label: 'Venta', color: '#10b981', bg: '#d1fae5' };
      case 'ambos': return { label: 'Ambos', color: '#8b5cf6', bg: '#ede9fe' };
      default: return { label: 'Ambos', color: '#8b5cf6', bg: '#ede9fe' };
    }
  };

  // Vincular empleado functions
  const openVincularEmpleadoModal = async (user) => {
    setSelectedUserForVincular(user);
    setEmpleadoSeleccionado(user.empleado_id || '');
    setBusquedaEmpleado('');
    setShowVincularEmpleadoModal(true);
    
    try {
      const data = await api.get('/api/auth/empleados-disponibles');
      setEmpleadosDisponibles(data.empleados || []);
    } catch (error) {

      setEmpleadosDisponibles([]);
    }
  };

  const handleSaveVinculacion = async () => {
    if (!selectedUserForVincular) return;
    
    setSavingVinculacion(true);
    try {
      await api.put(`/api/auth/users/${selectedUserForVincular._id}/vincular-empleado`, { 
        empleado_id: empleadoSeleccionado || null 
      });
      setShowVincularEmpleadoModal(false);
      setSelectedUserForVincular(null);
      fetchUsers();
    } catch (error) {

      alert(error.response?.data?.detail || 'Error al vincular empleado');
    } finally {
      setSavingVinculacion(false);
    }
  };

  const getEmpleadoInfo = (user) => {
    if (!user.empleado_id) return null;
    const emp = empleadosDisponibles.find(e => e._id === user.empleado_id);
    return emp;
  };

  const empleadosFiltrados = empleadosDisponibles.filter(emp => {
    if (!busquedaEmpleado) return true;
    const busqueda = busquedaEmpleado.toLowerCase();
    const nombreCompleto = `${emp.nombre} ${emp.apellidos}`.toLowerCase();
    const codigo = (emp.codigo || '').toLowerCase();
    const dni = (emp.dni_nie || '').toLowerCase();
    return nombreCompleto.includes(busqueda) || codigo.includes(busqueda) || dni.includes(busqueda);
  });

  if (!currentUser?.can_manage_users) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <Shield size={48} style={{ margin: '0 auto 1rem', color: 'hsl(var(--muted-foreground))' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>{t('users.restrictedAccess')}</h2>
        <p className="text-muted">{t('users.adminOnly')}</p>
      </div>
    );
  }

  return (
    <div data-testid="usuarios-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('users.title')}</h1>
          <p className="text-muted">{t('users.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-usuarios"><Settings size={18} /></button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
            data-testid="btn-nuevo-usuario"
          >
            <Plus size={18} />
            {t('users.newUser')}
          </button>
        </div>
      </div>

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{t('users.createUser')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('users.fullName')} *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.email')} *</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('auth.password')} *</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('users.role')} *</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">{t('users.createUser')}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t('users.systemUsers')}</h2>
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : users.length === 0 ? (
          <p className="text-muted">{t('users.noUsers')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const tipoOp = getTipoOperacionBadge(user.tipo_operacion);
                  return (
                  <tr key={user._id}>
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'nombre': return <td key="nombre"><div style={{ fontWeight: '600' }}>{user.full_name}</div></td>;
                        case 'email': return <td key="email">{user.email}</td>;
                        case 'rol': return <td key="rol"><span className={`badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span></td>;
                        case 'empleado': return <td key="empleado">{user.empleado_id ? (<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Link size={14} style={{ color: 'hsl(142 76% 36%)' }} /><span style={{ fontSize: '0.875rem' }}>{empleadosDisponibles.find(e => e._id === user.empleado_id)?.nombre || 'Vinculado'}</span></div>) : (<span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>Sin vincular</span>)}</td>;
                        case 'tipo_operacion': return <td key="tipo_operacion"><span onClick={() => user._id !== currentUser._id && openTipoOperacionModal(user)} style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: tipoOp.bg, color: tipoOp.color, cursor: user._id !== currentUser._id ? 'pointer' : 'default' }} title={user._id !== currentUser._id ? 'Clic para cambiar' : ''}>{tipoOp.label}</span></td>;
                        case 'estado': return <td key="estado"><span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>{user.is_active ? t('common.active') : t('common.inactive')}</span></td>;
                        case 'fecha_creacion': return <td key="fecha_creacion">{new Date(user.created_at).toLocaleDateString()}</td>;
                        default: return null;
                      }
                    })}
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {user._id !== currentUser._id && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => openEditModal(user)}
                              title="Editar usuario"
                              data-testid={`btn-edit-${user._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => openPermissionsModal(user)}
                              title="Configurar permisos de menú"
                              data-testid={`btn-permisos-${user._id}`}
                            >
                              <Settings size={14} />
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => openTipoOperacionModal(user)}
                              title="Tipo de operación (Compra/Venta)"
                              data-testid={`btn-tipo-op-${user._id}`}
                              style={{ 
                                backgroundColor: '#8b5cf6', 
                                color: 'white',
                                border: 'none'
                              }}
                            >
                              <ShoppingBag size={14} />
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => openPasswordModal(user)}
                              title="Cambiar contraseña"
                              data-testid={`btn-password-${user._id}`}
                              style={{ 
                                backgroundColor: '#f59e0b', 
                                color: 'white',
                                border: 'none'
                              }}
                            >
                              <Key size={14} />
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => openVincularEmpleadoModal(user)}
                              title="Vincular con empleado"
                              data-testid={`btn-vincular-${user._id}`}
                              style={{ 
                                backgroundColor: user.empleado_id ? '#10b981' : '#6366f1', 
                                color: 'white',
                                border: 'none'
                              }}
                            >
                              {user.empleado_id ? <Link size={14} /> : <Users size={14} />}
                            </button>
                            <button
                              className={`btn btn-sm ${user.is_active ? 'btn-error' : 'btn-success'}`}
                              onClick={() => handleToggleActive(user._id, user.is_active)}
                              title={user.is_active ? t('users.deactivate') : t('users.activate')}
                            >
                              {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          </>
                        )}
                        {user._id === currentUser._id && (
                          <span className="text-muted text-sm">({t('users.you')})</span>
                        )}
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

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">{t('users.roleDescriptions')}</h3>
        <div className="grid-2" style={{ gap: '1rem' }}>
          {ROLES.map(role => (
            <div key={role.value} style={{ padding: '1rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className={`badge ${getRoleBadgeClass(role.value)}`}>{role.label}</span>
              </div>
              <p className="text-sm text-muted">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Permisos de Menú */}
      {showPermissionsModal && selectedUserForPermissions && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Permisos de Menú</h2>
                <p className="text-muted text-sm" style={{ margin: '0.25rem 0 0 0' }}>
                  Usuario: <strong>{selectedUserForPermissions.full_name}</strong> ({selectedUserForPermissions.email})
                </p>
              </div>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setShowPermissionsModal(false)}
                style={{ padding: '0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {/* Perfiles Predefinidos */}
              {permissionProfiles.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                    Aplicar Perfil Predefinido
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    {permissionProfiles.map(profile => {
                      const IconComponent = profile.icon === 'Leaf' ? Leaf : 
                                           profile.icon === 'FileText' ? FileText : 
                                           profile.icon === 'Users' ? Users : 
                                           profile.icon === 'Shield' ? Shield : 
                                           profile.icon === 'Eye' ? Eye : Clipboard;
                      return (
                        <button
                          key={profile.id}
                          onClick={() => applyProfile(profile)}
                          className={`btn btn-sm ${selectedProfile === profile.id ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            textAlign: 'left',
                            height: 'auto',
                            flexDirection: 'column',
                            alignItems: 'flex-start'
                          }}
                          title={profile.description}
                          data-testid={`profile-${profile.id}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <IconComponent size={16} />
                            <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>{profile.name}</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: 1.3 }}>
                            {profile.description.slice(0, 50)}...
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Group by section */}
              {[...new Set(menuItems.map(item => item.section))].map(section => {
                const sectionItems = menuItems.filter(item => item.section === section);
                const enabledCount = sectionItems.filter(item => menuPermissions[item.path]).length;
                const allEnabled = enabledCount === sectionItems.length;
                const someEnabled = enabledCount > 0 && !allEnabled;
                
                return (
                  <div key={section} style={{ marginBottom: '1rem' }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.75rem',
                        background: 'hsl(var(--muted))',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '0.5rem'
                      }}
                      onClick={() => toggleSection(section)}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: '2px solid hsl(var(--primary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: allEnabled ? 'hsl(var(--primary))' : 'transparent'
                      }}>
                        {allEnabled && <Check size={14} color="white" />}
                        {someEnabled && !allEnabled && <div style={{ width: '10px', height: '2px', background: 'hsl(var(--primary))' }} />}
                      </div>
                      <span style={{ fontWeight: '600', flex: 1 }}>{section}</span>
                      <span className="badge badge-secondary">{enabledCount}/{sectionItems.length}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', paddingLeft: '1rem' }}>
                      {sectionItems.map(item => (
                        <label
                          key={item.path}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: menuPermissions[item.path] ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                            border: '1px solid',
                            borderColor: menuPermissions[item.path] ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={menuPermissions[item.path] || false}
                            onChange={() => togglePermission(item.path)}
                            style={{ display: 'none' }}
                          />
                          {menuPermissions[item.path] ? (
                            <Eye size={16} style={{ color: 'hsl(var(--primary))' }} />
                          ) : (
                            <EyeOff size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                          )}
                          <span style={{ 
                            fontSize: '0.875rem',
                            color: menuPermissions[item.path] ? 'inherit' : 'hsl(var(--muted-foreground))'
                          }}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              justifyContent: 'flex-end', 
              marginTop: '1rem', 
              paddingTop: '1rem', 
              borderTop: '1px solid hsl(var(--border))' 
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPermissionsModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSavePermissions}
                disabled={savingPermissions}
              >
                {savingPermissions ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cambio de Contraseña */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'hsl(var(--warning) / 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Key size={20} style={{ color: 'hsl(var(--warning))' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Cambiar Contraseña</h2>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>{selectedUserForPassword.full_name}</p>
                </div>
              </div>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setShowPasswordModal(false)}
                style={{ padding: '0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>
            
            {passwordError && (
              <div style={{ 
                padding: '0.75rem', 
                background: 'hsl(var(--destructive) / 0.1)', 
                border: '1px solid hsl(var(--destructive) / 0.3)',
                borderRadius: '8px',
                color: 'hsl(var(--destructive))',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {passwordError}
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nueva Contraseña</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirmar Contraseña</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la contraseña"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPasswordModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSavePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Usuario */}
      {showEditModal && selectedUserForEdit && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'hsl(var(--primary) / 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Edit2 size={20} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Editar Usuario</h2>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>Modificar datos del usuario</p>
                </div>
              </div>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setShowEditModal(false)}
                style={{ padding: '0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>
            
            {editError && (
              <div style={{ 
                padding: '0.75rem', 
                background: 'hsl(var(--destructive) / 0.1)', 
                border: '1px solid hsl(var(--destructive) / 0.3)',
                borderRadius: '8px',
                color: 'hsl(var(--destructive))',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {editError}
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nombre Completo *</label>
              <input
                type="text"
                className="form-input"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
                placeholder="Nombre del usuario"
                autoFocus
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                placeholder="email@ejemplo.com"
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Rol</label>
              <select
                className="form-select"
                value={editFormData.role}
                onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tipo de Operación */}
      {showTipoOperacionModal && selectedUserForTipoOp && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Tipo de Operación</h2>
                <p className="text-muted text-sm" style={{ margin: '0.25rem 0 0 0' }}>
                  {selectedUserForTipoOp.full_name}
                </p>
              </div>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setShowTipoOperacionModal(false)}
                style={{ padding: '0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'hsl(var(--muted-foreground))' }}>
              Define qué tipo de operaciones puede realizar este usuario:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '8px',
                border: tipoOperacionValue === 'compra' ? '2px solid #3b82f6' : '1px solid hsl(var(--border))',
                backgroundColor: tipoOperacionValue === 'compra' ? '#dbeafe' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="tipoOperacion"
                  value="compra"
                  checked={tipoOperacionValue === 'compra'}
                  onChange={(e) => setTipoOperacionValue(e.target.value)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#3b82f6' }}>Compra</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    Albaranes de compra, Contratos de compra, Proveedores
                  </div>
                </div>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '8px',
                border: tipoOperacionValue === 'venta' ? '2px solid #10b981' : '1px solid hsl(var(--border))',
                backgroundColor: tipoOperacionValue === 'venta' ? '#d1fae5' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="tipoOperacion"
                  value="venta"
                  checked={tipoOperacionValue === 'venta'}
                  onChange={(e) => setTipoOperacionValue(e.target.value)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>Venta</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    Albaranes de venta, Contratos de venta, Clientes
                  </div>
                </div>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '8px',
                border: tipoOperacionValue === 'ambos' ? '2px solid #8b5cf6' : '1px solid hsl(var(--border))',
                backgroundColor: tipoOperacionValue === 'ambos' ? '#ede9fe' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="tipoOperacion"
                  value="ambos"
                  checked={tipoOperacionValue === 'ambos'}
                  onChange={(e) => setTipoOperacionValue(e.target.value)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#8b5cf6' }}>Ambos</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    Acceso completo a operaciones de compra y venta
                  </div>
                </div>
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowTipoOperacionModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveTipoOperacion}
                disabled={savingTipoOp}
              >
                {savingTipoOp ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vincular Empleado */}
      {showVincularEmpleadoModal && selectedUserForVincular && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '550px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'hsl(var(--primary) / 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Users size={20} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Vincular con Empleado</h2>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>{selectedUserForVincular.full_name}</p>
                </div>
              </div>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setShowVincularEmpleadoModal(false)}
                style={{ padding: '0.5rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'hsl(var(--muted-foreground))' }}>
              Vincula este usuario a un perfil de empleado para que pueda acceder al Portal del Empleado.
            </p>
            
            {/* Buscador */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Buscar empleado</label>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por nombre, código o DNI..."
                value={busquedaEmpleado}
                onChange={(e) => setBusquedaEmpleado(e.target.value)}
              />
            </div>
            
            {/* Lista de empleados */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              border: '1px solid hsl(var(--border))', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              {/* Opción para desvincular */}
              <div
                onClick={() => setEmpleadoSeleccionado('')}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderBottom: '1px solid hsl(var(--border))',
                  background: !empleadoSeleccionado ? 'hsl(var(--primary) / 0.1)' : 'transparent'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: !empleadoSeleccionado ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!empleadoSeleccionado && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(var(--primary))' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: 'hsl(var(--muted-foreground))' }}>Sin vincular</div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    No asociar a ningún empleado
                  </div>
                </div>
              </div>

              {empleadosFiltrados.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                  No se encontraron empleados
                </div>
              ) : (
                empleadosFiltrados.map(emp => (
                  <div
                    key={emp._id}
                    onClick={() => !emp.vinculado || emp._id === selectedUserForVincular.empleado_id ? setEmpleadoSeleccionado(emp._id) : null}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: emp.vinculado && emp._id !== selectedUserForVincular.empleado_id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderBottom: '1px solid hsl(var(--border) / 0.5)',
                      background: empleadoSeleccionado === emp._id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                      opacity: emp.vinculado && emp._id !== selectedUserForVincular.empleado_id ? 0.5 : 1
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: empleadoSeleccionado === emp._id ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {empleadoSeleccionado === emp._id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(var(--primary))' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{emp.nombre} {emp.apellidos}</div>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                        {emp.codigo} - DNI: {emp.dni_nie || 'N/A'} - {emp.puesto || 'Sin puesto'}
                      </div>
                    </div>
                    {emp.vinculado && emp._id !== selectedUserForVincular.empleado_id && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'hsl(var(--muted))',
                        color: 'hsl(var(--muted-foreground))'
                      }}>
                        Ya vinculado
                      </span>
                    )}
                    {emp._id === selectedUserForVincular.empleado_id && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'hsl(142 76% 36% / 0.1)',
                        color: 'hsl(142 76% 36%)'
                      }}>
                        Actual
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowVincularEmpleadoModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveVinculacion}
                disabled={savingVinculacion}
              >
                {savingVinculacion ? 'Guardando...' : (empleadoSeleccionado ? 'Vincular' : 'Desvincular')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
