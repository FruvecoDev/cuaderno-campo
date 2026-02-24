import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, UserX, UserCheck, Shield, Settings, X, Check, Eye, EyeOff, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

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
  const { token, user: currentUser } = useAuth();
  
  const ROLES = [
    { value: 'Admin', label: t('users.admin'), description: t('users.adminDesc') },
    { value: 'Manager', label: t('users.manager'), description: t('users.managerDesc') },
    { value: 'Technician', label: t('users.technician'), description: t('users.technicianDesc') },
    { value: 'Viewer', label: t('users.viewer'), description: t('users.viewerDesc') }
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
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/menu-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.menu_items || []);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const openPermissionsModal = (user) => {
    setSelectedUserForPermissions(user);
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
      const response = await fetch(`${BACKEND_URL}/api/auth/users/${selectedUserForPermissions._id}/menu-permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ menu_permissions: menuPermissions })
      });
      
      if (response.ok) {
        setShowPermissionsModal(false);
        setSelectedUserForPermissions(null);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
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
      const response = await fetch(`${BACKEND_URL}/api/auth/users/${selectedUserForPassword._id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });
      
      if (response.ok) {
        setShowPasswordModal(false);
        setSelectedUserForPassword(null);
        alert('Contraseña actualizada correctamente');
      } else {
        const error = await response.json();
        setPasswordError(error.detail || 'Error al cambiar contraseña');
      }
    } catch (error) {
      console.error('Error changing password:', error);
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
      const response = await fetch(`${BACKEND_URL}/api/auth/users/${selectedUserForEdit._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      
      if (response.ok) {
        setShowEditModal(false);
        setSelectedUserForEdit(null);
        fetchUsers();
      } else {
        const error = await response.json();
        setEditError(error.detail || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setEditError('Error al actualizar usuario');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowForm(false);
        fetchUsers();
        setFormData({ email: '', password: '', full_name: '', role: 'Viewer' });
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(t('messages.errorSaving'));
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleEditRole = async (userId, newRole) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        fetchUsers();
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin': return 'badge-error';
      case 'Manager': return 'badge-warning';
      case 'Technician': return 'badge-info';
      case 'Viewer': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

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
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          data-testid="btn-nuevo-usuario"
        >
          <Plus size={18} />
          {t('users.newUser')}
        </button>
      </div>

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
                  <th>{t('users.userName')}</th>
                  <th>{t('auth.email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('users.createdAt')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{user.full_name}</div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {editingUser === user._id ? (
                        <select
                          className="form-select"
                          value={user.role}
                          onChange={(e) => handleEditRole(user._id, e.target.value)}
                          style={{ minWidth: '150px' }}
                        >
                          {ROLES.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {user._id !== currentUser._id && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setEditingUser(editingUser === user._id ? null : user._id)}
                              title={t('users.editRole')}
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
                ))}
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
    </div>
  );
};

export default Usuarios;
