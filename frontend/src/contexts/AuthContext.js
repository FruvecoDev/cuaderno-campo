import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);
  
  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me', { timeout: 10000 });
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      // Only logout if it's an auth error (401/403), not network issues
      if (error.status === 401 || error.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);
  
  useEffect(() => {
    // Check if user is logged in on mount
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);
  
  const login = async (email, password) => {
    try {
      const data = await api.post('/api/auth/login', { email, password }, { includeAuth: false });
      
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('token', data.access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: api.getErrorMessage(error) };
    }
  };
  
  const initializeAdmin = async () => {
    try {
      const data = await api.post('/api/auth/init-admin', {}, { includeAuth: false });
      return { success: true, credentials: data.credentials };
    } catch (error) {
      return { success: false, error: api.getErrorMessage(error) };
    }
  };
  
  const hasPermission = (action) => {
    if (!user) return false;
    
    switch (action) {
      case 'create':
        return user.can_create;
      case 'edit':
        return user.can_edit;
      case 'delete':
        return user.can_delete;
      case 'export':
        return user.can_export;
      default:
        return false;
    }
  };
  
  // Check if user can perform operation type (compra, venta, or both)
  const canDoOperacion = (tipo) => {
    if (!user) return false;
    const userTipo = user.tipo_operacion || 'ambos';
    if (userTipo === 'ambos') return true;
    return userTipo === tipo;
  };
  
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    initializeAdmin,
    hasPermission,
    canDoOperacion,
    isAuthenticated: !!user
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};