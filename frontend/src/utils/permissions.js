import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar permisos del usuario
 */
export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (permission) => {
    if (!user) return false;
    return user[`can_${permission}`] === true;
  };
  
  return {
    canCreate: hasPermission('create'),
    canEdit: hasPermission('edit'),
    canDelete: hasPermission('delete'),
    canExport: hasPermission('export'),
    canManageUsers: user?.can_manage_users === true,
    canViewCosts: user?.can_view_costs !== false, // Default true for backward compatibility
    user,
    hasPermission
  };
};

/**
 * Componente de botón con control de permisos
 */
export const PermissionButton = ({ 
  permission, 
  onClick, 
  children, 
  className = 'btn btn-primary',
  disabled = false,
  ...props 
}) => {
  const { user } = useAuth();
  
  // Check if user has the required permission
  const hasPermission = permission ? user?.[`can_${permission}`] : true;
  
  if (!hasPermission) {
    return null; // Don't render button if no permission
  }
  
  return (
    <button 
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Componente wrapper para mostrar contenido solo si tiene permiso
 */
export const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { user } = useAuth();
  
  const hasPermission = permission ? user?.[`can_${permission}`] : true;
  
  return hasPermission ? children : fallback;
};

/**
 * Componente wrapper para mostrar contenido solo si tiene acceso al módulo
 */
export const ModuleGuard = ({ module, children, fallback = null }) => {
  const { user } = useAuth();
  
  const hasAccess = user?.modules_access?.includes(module);
  
  return hasAccess ? children : fallback;
};

/**
 * Hook para manejar errores de permisos y mostrar mensajes amigables
 */
export const usePermissionError = () => {
  const handlePermissionError = (error, action = 'realizar esta acción') => {
    if (error.status === 403 || error.message?.includes('Permission denied')) {
      return `No tienes permisos para ${action}. Contacta al administrador si necesitas acceso.`;
    }
    if (error.status === 401) {
      return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    }
    return error.message || 'Ocurrió un error inesperado';
  };
  
  return { handlePermissionError };
};
