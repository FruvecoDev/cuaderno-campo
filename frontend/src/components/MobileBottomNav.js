import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Calendar, Sprout, MoreHorizontal, Plus, X, FileText, Wheat, ListTodo, Droplets } from 'lucide-react';

const MAIN_TABS = [
  { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { path: '/parcelas', label: 'Parcelas', icon: MapPin },
  { path: '/visitas', label: 'Visitas', icon: Calendar },
  { path: '/tratamientos', label: 'Tratam.', icon: Sprout },
];

const QUICK_ACTIONS = [
  { path: '/visitas', label: 'Nueva Visita', icon: Calendar, param: '?nueva=1' },
  { path: '/tratamientos', label: 'Nuevo Tratamiento', icon: Sprout, param: '?nuevo=1' },
  { path: '/tareas', label: 'Nueva Tarea', icon: ListTodo, param: '?nueva=1' },
  { path: '/cosechas', label: 'Nueva Cosecha', icon: Wheat, param: '?nueva=1' },
  { path: '/contratos', label: 'Nuevo Contrato', icon: FileText, param: '?nuevo=1' },
  { path: '/irrigaciones', label: 'Nueva Irrigacion', icon: Droplets, param: '?nueva=1' },
];

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowQuickActions(false)}
          data-testid="quick-actions-overlay"
        >
          <div
            style={{
              position: 'absolute', bottom: '80px', left: '50%',
              transform: 'translateX(-50%)',
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px', padding: '16px',
              animation: 'slideUp 0.25s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  onClick={() => {
                    navigate(action.path);
                    setShowQuickActions(false);
                  }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '6px',
                    padding: '14px 10px',
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    minWidth: '90px',
                    transition: 'transform 0.15s ease'
                  }}
                  data-testid={`quick-action-${action.label.toLowerCase().replace(/\s/g,'-')}`}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'hsl(var(--primary))'
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'hsl(var(--foreground))', textAlign: 'center' }}>
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 999,
          backgroundColor: 'hsl(var(--background))',
          borderTop: '1px solid hsl(var(--border))',
          display: 'none', /* shown via media query */
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '6px 0 max(6px, env(safe-area-inset-bottom))',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.06)'
        }}
        data-testid="mobile-bottom-nav"
      >
        {MAIN_TABS.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px',
                padding: '4px 12px', border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer',
                color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                transition: 'color 0.2s ease',
                minWidth: '60px'
              }}
              data-testid={`bottom-nav-${tab.label.toLowerCase()}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '0.65rem', fontWeight: active ? '600' : '400' }}>{tab.label}</span>
            </button>
          );
        })}

        {/* Center FAB */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          style={{
            width: '52px', height: '52px',
            borderRadius: '50%',
            backgroundColor: showQuickActions ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
            color: 'white',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px hsl(var(--primary) / 0.35)',
            transform: 'translateY(-14px)',
            transition: 'all 0.25s ease'
          }}
          data-testid="fab-quick-actions"
        >
          {showQuickActions ? <X size={24} /> : <Plus size={24} />}
        </button>

        {MAIN_TABS.slice(2).map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px',
                padding: '4px 12px', border: 'none',
                backgroundColor: 'transparent', cursor: 'pointer',
                color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                transition: 'color 0.2s ease',
                minWidth: '60px'
              }}
              data-testid={`bottom-nav-${tab.label.toLowerCase()}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '0.65rem', fontWeight: active ? '600' : '400' }}>{tab.label}</span>
            </button>
          );
        })}

        {/* More button - opens sidebar */}
        <button
          onClick={() => {
            const toggle = document.querySelector('[data-testid="mobile-menu-toggle"]');
            if (toggle) toggle.click();
          }}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '2px',
            padding: '4px 12px', border: 'none',
            backgroundColor: 'transparent', cursor: 'pointer',
            color: 'hsl(var(--muted-foreground))',
            transition: 'color 0.2s ease',
            minWidth: '60px'
          }}
          data-testid="bottom-nav-mas"
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span style={{ fontSize: '0.65rem', fontWeight: '400' }}>Mas</span>
        </button>
      </nav>
    </>
  );
};
