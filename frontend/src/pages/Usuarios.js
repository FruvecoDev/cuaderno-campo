import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, UserX, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ROLES = [
  { value: 'Admin', label: 'Administrador', description: 'Acceso total + gestión usuarios' },
  { value: 'Manager', label: 'Manager', description: 'Crear/Editar/Exportar (no Eliminar)' },
  { value: 'Technician', label: 'Técnico', description: 'Operaciones de campo (sin contratos)' },
  { value: 'Viewer', label: 'Visualizador', description: 'Solo lectura + exportar' }
];

const Usuarios = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { token, user: currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'Viewer'
  });

  useEffect(() => {
    fetchUsers();
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
      alert('Error al crear usuario');
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
        <h2 style={{ marginBottom: '0.5rem' }}>Acceso Restringido</h2>
        <p className="text-muted">Solo los administradores pueden gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div data-testid="usuarios-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Gestión de Usuarios</h1>
          <p className="text-muted">Administra usuarios y sus permisos</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          data-testid="btn-nuevo-usuario"
        >
          <Plus size={18} />
          Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">Crear Nuevo Usuario</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nombre Completo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
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
                <label className="form-label">Contraseña *</label>
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
                <label className="form-label">Rol *</label>
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
              <button type="submit" className="btn btn-primary">Crear Usuario</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Usuarios del Sistema</h2>
        {loading ? (
          <p>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="text-muted">No hay usuarios registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  <th>Acciones</th>
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
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {user._id !== currentUser._id && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setEditingUser(editingUser === user._id ? null : user._id)}
                              title="Editar rol"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className={`btn btn-sm ${user.is_active ? 'btn-error' : 'btn-success'}`}
                              onClick={() => handleToggleActive(user._id, user.is_active)}
                              title={user.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          </>
                        )}
                        {user._id === currentUser._id && (
                          <span className="text-muted text-sm">(Tú)</span>
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
        <h3 className="card-title">Descripción de Roles</h3>
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
