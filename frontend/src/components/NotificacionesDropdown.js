import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, X, Check, CheckCheck, AlertTriangle, Info, 
  CheckCircle, AlertCircle, Clock, ExternalLink, Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';


const TIPO_ICONS = {
  'info': { icon: Info, color: '#3b82f6' },
  'warning': { icon: AlertTriangle, color: '#f59e0b' },
  'success': { icon: CheckCircle, color: '#22c55e' },
  'error': { icon: AlertCircle, color: '#ef4444' },
  'alert': { icon: Bell, color: '#8b5cf6' }
};

const NotificacionesDropdown = () => {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchCount();
      // Poll for new notifications every 60 seconds
      const interval = setInterval(fetchCount, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCount = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notificaciones/count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNoLeidas(data.no_leidas || 0);
      }
    } catch (err) {
      console.error('Error fetching notification count:', err);
    }
  };

  const fetchNotificaciones = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notificaciones?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotificaciones(data.notificaciones || []);
        setNoLeidas(data.no_leidas || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotificaciones();
    }
    setIsOpen(!isOpen);
  };

  const handleMarcarLeida = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notificaciones/${id}/leer`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotificaciones(prev => 
          prev.map(n => n._id === id ? { ...n, leida: true } : n)
        );
        setNoLeidas(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notificaciones/leer-todas`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
        setNoLeidas(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleClickNotificacion = (notif) => {
    if (!notif.leida) {
      handleMarcarLeida(notif._id);
    }
    if (notif.enlace) {
      window.location.href = notif.enlace;
      setIsOpen(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button with Badge */}
      <button
        onClick={handleToggle}
        style={{
          position: 'relative',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          background: isOpen ? 'hsl(var(--muted))' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        data-testid="btn-notificaciones"
      >
        <Bell size={20} />
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: '700',
            minWidth: '16px',
            height: '16px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px'
          }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          width: '360px',
          maxHeight: '480px',
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          border: '1px solid hsl(var(--border))',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid hsl(var(--border))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontWeight: '600', margin: 0 }}>Notificaciones</h3>
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarTodasLeidas}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(var(--primary))',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <CheckCheck size={14} /> Marcar todas leídas
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                Cargando...
              </div>
            ) : notificaciones.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notificaciones.map(notif => {
                const tipoConfig = TIPO_ICONS[notif.tipo] || TIPO_ICONS['info'];
                const Icon = tipoConfig.icon;
                
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleClickNotificacion(notif)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid hsl(var(--border))',
                      cursor: notif.enlace ? 'pointer' : 'default',
                      backgroundColor: notif.leida ? 'transparent' : 'hsl(var(--muted) / 0.5)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.leida ? 'transparent' : 'hsl(var(--muted) / 0.5)'}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: `${tipoConfig.color}20`,
                        height: 'fit-content'
                      }}>
                        <Icon size={18} style={{ color: tipoConfig.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: notif.leida ? '400' : '600',
                          fontSize: '0.875rem',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.5rem'
                        }}>
                          <span style={{ flex: 1 }}>{notif.titulo}</span>
                          {notif.enlace && <ExternalLink size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
                        </div>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '0.8rem', 
                          color: 'hsl(var(--muted-foreground))',
                          lineHeight: '1.4'
                        }}>
                          {notif.mensaje}
                        </p>
                        <div style={{ 
                          marginTop: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                            <Clock size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                            {formatTime(notif.created_at)}
                          </span>
                          {!notif.leida && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarcarLeida(notif._id); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                color: 'hsl(var(--muted-foreground))'
                              }}
                              title="Marcar como leída"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div style={{
              padding: '0.75rem',
              borderTop: '1px solid hsl(var(--border))',
              textAlign: 'center'
            }}>
              <a
                href="/configuracion"
                style={{
                  color: 'hsl(var(--primary))',
                  textDecoration: 'none',
                  fontSize: '0.8rem'
                }}
              >
                Configurar notificaciones
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificacionesDropdown;
