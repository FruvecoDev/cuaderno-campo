import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, MapPin, Home, Calendar, ListTodo,
  Sprout, Droplets, BookOpen, FileBarChart, Wheat, FolderOpen,
  LogOut, User, Users, Package, Leaf, Cog, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { section: 'General', items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    ]},
    { section: 'Gestión Principal', items: [
      { path: '/contratos', label: 'Contratos', icon: FileText, module: 'contratos' },
      { path: '/parcelas', label: 'Parcelas', icon: MapPin, module: 'parcelas' },
      { path: '/fincas', label: 'Fincas', icon: Home, module: 'fincas' },
    ]},
    { section: 'Actividades', items: [
      { path: '/visitas', label: 'Visitas', icon: Calendar, module: 'visitas' },
      { path: '/tareas', label: 'Tareas', icon: ListTodo, module: 'tareas' },
      { path: '/tratamientos', label: 'Tratamientos', icon: Sprout, module: 'tratamientos' },
      { path: '/irrigaciones', label: 'Irrigaciones', icon: Droplets, module: 'irrigaciones' },
    ]},
    { section: 'Administración', items: [
      { path: '/recetas', label: 'Recetas', icon: BookOpen, module: 'recetas' },
      { path: '/albaranes', label: 'Albaranes', icon: FileBarChart, module: 'albaranes' },
      { path: '/cosechas', label: 'Cosechas', icon: Wheat, module: 'cosechas' },
      { path: '/documentos', label: 'Documentos', icon: FolderOpen, module: 'documentos' },
    ]},
    { section: 'Catálogos', items: [
      { path: '/proveedores', label: 'Proveedores', icon: Package },
      { path: '/cultivos', label: 'Cultivos', icon: Leaf },
      { path: '/maquinaria', label: 'Maquinaria', icon: Cog },
    ]},
    { section: 'Sistema', items: [
      { path: '/usuarios', label: 'Usuarios', icon: Users, requireAdmin: true },
    ]}
  ];
  
  // Filter nav items based on user's module access
  const filteredNavItems = navItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Check admin requirement
      if (item.requireAdmin && user?.role !== 'Admin') {
        return false;
      }
      // If no module specified or user has access to this module
      return !item.module || user?.modules_access?.includes(item.module);
    })
  })).filter(section => section.items.length > 0); // Remove empty sections
  
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Wheat size={24} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontWeight: '700', fontSize: '1.25rem' }}>FRUVECO</span>
              <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'hsl(var(--muted-foreground))' }}>Cuaderno de Campo</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {filteredNavItems.map((section, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        
        <div style={{
          padding: '1rem',
          borderTop: '1px solid hsl(var(--border))',
          marginTop: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'hsl(var(--muted))',
            borderRadius: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'hsl(var(--primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <User size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                {user?.full_name || 'Usuario'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                {user?.role || 'Viewer'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.625rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              border: '1px solid hsl(var(--border))',
              background: 'transparent',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'hsl(var(--foreground))',
              transition: 'all 0.2s'
            }}
            data-testid="logout-button"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
      
      <div className="main-content">
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;