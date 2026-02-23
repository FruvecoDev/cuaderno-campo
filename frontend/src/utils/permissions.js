import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar permisos del usuario
 */
export const usePermissions = () => {
  const { user, hasPermission } = useAuth();
  
  return {
    canCreate: hasPermission('create'),
    canEdit: hasPermission('edit'),
    canDelete: hasPermission('delete'),
    canExport: hasPermission('export'),
    canManageUsers: user?.can_manage_users || false,
    canViewCosts: user?.can_view_costs !== false, // Default true
    user
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
