import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

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
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        // Token invalid, clear it
        logout();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);
  
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
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('token', data.access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const initializeAdmin = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/init-admin`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return { success: true, credentials: data.credentials };
      } else {
        return { success: false, error: data.detail };
      }
    } catch (error) {
      return { success: false, error: error.message };
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
  
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    initializeAdmin,
    hasPermission,
    isAuthenticated: !!user
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};