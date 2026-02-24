import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, FileText, MapPin, Home, Calendar, ListTodo,
  Sprout, Droplets, BookOpen, FileBarChart, Wheat, FolderOpen,
  LogOut, User, Users, Package, Leaf, Cog, ClipboardCheck, Beaker, BarChart3, Globe, Brain, UserCheck,
  ChevronDown, ChevronRight
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
  
  // Estado para secciones colapsadas
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const saved = localStorage.getItem('menu_collapsed_sections');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Guardar estado en localStorage
  useEffect(() => {
    localStorage.setItem('menu_collapsed_sections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);
  
  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { section: t('nav.general'), items: [
      { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, module: 'dashboard' },
      { path: '/asistente-ia', label: t('nav.aiAssistant'), icon: Brain, module: 'dashboard' },
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
      { path: '/tecnicos-aplicadores', label: t('nav.applicatorTechnicians'), icon: UserCheck },
      { path: '/articulos-explotacion', label: 'Artículos Explotación', icon: Package },
    ]},
    { section: t('nav.configuration'), items: [
      { path: '/usuarios', label: t('nav.users'), icon: Users, requireAdmin: true },
      { path: '/traducciones', label: t('nav.translations'), icon: Globe },
    ]}
  ];
  
  // Filter nav items based on user's menu_permissions
  const filteredNavItems = navItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Admin always has access to everything
      if (user?.role === 'Admin') {
        return true;
      }
      // Check admin requirement
      if (item.requireAdmin) {
        return false;
      }
      // Check menu_permissions if they exist
      if (user?.menu_permissions) {
        return user.menu_permissions[item.path] !== false;
      }
      // Legacy: If no menu_permissions, use modules_access
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
          {filteredNavItems.map((section, idx) => {
            const isCollapsed = collapsedSections[section.section];
            const hasActiveItem = section.items.some(item => location.pathname === item.path);
            
            return (
              <div key={idx} className="nav-section">
                <div 
                  className="nav-section-title"
                  onClick={() => toggleSection(section.section)}
                  style={{ 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    padding: '0.5rem 0.75rem',
                    marginBottom: isCollapsed ? '0' : '0.25rem',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s ease',
                    backgroundColor: hasActiveItem && isCollapsed ? 'hsl(var(--primary) / 0.1)' : 'transparent'
                  }}
                  title={isCollapsed ? 'Expandir sección' : 'Colapsar sección'}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    fontWeight: hasActiveItem ? '600' : '500'
                  }}>
                    {section.section}
                    {hasActiveItem && isCollapsed && (
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'hsl(var(--primary))'
                      }} />
                    )}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight size={16} style={{ opacity: 0.7 }} />
                  ) : (
                    <ChevronDown size={16} style={{ opacity: 0.7 }} />
                  )}
                </div>
                <div style={{
                  maxHeight: isCollapsed ? '0' : '500px',
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease-in-out',
                  opacity: isCollapsed ? 0 : 1
                }}>
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
              </div>
            );
          })}
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