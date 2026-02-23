import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, MapPin, Home, Calendar, ListTodo,
  Sprout, Droplets, BookOpen, FileBarChart, Wheat, FolderOpen,
  LogOut, User
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
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'Gestión Principal', items: [
      { path: '/contratos', label: 'Contratos', icon: FileText },
      { path: '/parcelas', label: 'Parcelas', icon: MapPin },
      { path: '/fincas', label: 'Fincas', icon: Home },
    ]},
    { section: 'Actividades', items: [
      { path: '/visitas', label: 'Visitas', icon: Calendar },
      { path: '/tareas', label: 'Tareas', icon: ListTodo },
      { path: '/tratamientos', label: 'Tratamientos', icon: Sprout },
      { path: '/irrigaciones', label: 'Irrigaciones', icon: Droplets },
    ]},
    { section: 'Administración', items: [
      { path: '/recetas', label: 'Recetas', icon: BookOpen },
      { path: '/albaranes', label: 'Albaranes', icon: FileBarChart },
      { path: '/cosechas', label: 'Cosechas', icon: Wheat },
      { path: '/documentos', label: 'Documentos', icon: FolderOpen },
    ]}
  ];
  
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Wheat size={24} />
            AgroGest Pro
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((section, idx) => (
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