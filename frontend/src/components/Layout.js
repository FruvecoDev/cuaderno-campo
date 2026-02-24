import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, FileText, MapPin, Home, Calendar, ListTodo,
  Sprout, Droplets, BookOpen, FileBarChart, Wheat, FolderOpen,
  LogOut, User, Users, Package, Leaf, Cog, ClipboardCheck, Beaker, BarChart3, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LanguageSelector from './LanguageSelector';
import '../App.css';
import logo from '../assets/logo.png';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { section: t('nav.general'), items: [
      { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, module: 'dashboard' },
    ]},
    { section: t('nav.mainManagement'), items: [
      { path: '/contratos', label: t('nav.contracts'), icon: FileText, module: 'contratos' },
      { path: '/parcelas', label: t('nav.parcels'), icon: MapPin, module: 'parcelas' },
      { path: '/fincas', label: t('nav.farms'), icon: Home, module: 'fincas' },
    ]},
    { section: t('nav.activities'), items: [
      { path: '/visitas', label: t('nav.visits'), icon: Calendar, module: 'visitas' },
      { path: '/tareas', label: t('nav.tasks'), icon: ListTodo, module: 'tareas' },
      { path: '/tratamientos', label: t('nav.treatments'), icon: Sprout, module: 'tratamientos' },
      { path: '/irrigaciones', label: t('nav.irrigations'), icon: Droplets, module: 'irrigaciones' },
      { path: '/evaluaciones', label: t('nav.evaluations'), icon: ClipboardCheck, module: 'evaluaciones' },
    ]},
    { section: t('nav.administration'), items: [
      { path: '/recetas', label: t('nav.recipes'), icon: BookOpen, module: 'recetas' },
      { path: '/albaranes', label: t('nav.deliveryNotes'), icon: FileBarChart, module: 'albaranes' },
      { path: '/cosechas', label: t('nav.harvests'), icon: Wheat, module: 'cosechas' },
      { path: '/documentos', label: t('nav.documents'), icon: FolderOpen, module: 'documentos' },
      { path: '/informes-gastos', label: t('nav.expenseReports'), icon: BarChart3, module: 'albaranes' },
    ]},
    { section: t('nav.catalogs'), items: [
      { path: '/proveedores', label: t('nav.providers'), icon: Package },
      { path: '/cultivos', label: t('nav.crops'), icon: Leaf },
      { path: '/maquinaria', label: t('nav.machinery'), icon: Cog },
      { path: '/fitosanitarios', label: t('nav.phytosanitary'), icon: Beaker },
    ]},
    { section: t('nav.configuration'), items: [
      { path: '/usuarios', label: t('nav.users'), icon: Users, requireAdmin: true },
      { path: '/traducciones', label: t('nav.translations'), icon: Globe },
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
          <div className="sidebar-title" style={{ justifyContent: 'center' }}>
            <img 
              src={logo} 
              alt="Logo" 
              style={{ 
                maxWidth: '160px', 
                height: 'auto',
                objectFit: 'contain'
              }} 
            />
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
            <LanguageSelector variant="minimal" />
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
            {t('auth.logout')}
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