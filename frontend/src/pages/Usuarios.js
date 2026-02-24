import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, UserX, UserCheck, Shield, Settings, X, Check, Eye, EyeOff } from 'lucide-react';
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
    </div>
  );
};

export default Usuarios;
