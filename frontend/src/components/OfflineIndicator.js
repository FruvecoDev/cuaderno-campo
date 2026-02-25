import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertCircle, Download } from 'lucide-react';
import syncService from '../services/syncService';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Subscribe to sync events
    const unsubscribe = syncService.subscribe((event) => {
      switch (event.type) {
        case 'online':
          setIsOnline(true);
          showNotification('Conexión restaurada', 'success');
          break;
        case 'offline':
          setIsOnline(false);
          showNotification('Sin conexión - Modo offline activo', 'warning');
          break;
        case 'syncStart':
          setIsSyncing(true);
          break;
        case 'syncComplete':
          setIsSyncing(false);
          if (event.synced > 0) {
            showNotification(`${event.synced} elementos sincronizados`, 'success');
          }
          updateStatus();
          break;
        case 'itemAdded':
          setPendingCount(event.pendingCount);
          showNotification(`${event.itemType === 'visita' ? 'Visita' : 'Tratamiento'} guardado offline`, 'info');
          break;
        case 'caching':
          showNotification(event.message, 'info');
          break;
        case 'cached':
          showNotification(event.message, 'success');
          break;
        case 'error':
          showNotification(event.message, 'error');
          break;
        default:
          break;
      }
    });

    // Initial status
    updateStatus();

    // Set up interval to check status
    const interval = setInterval(updateStatus, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updateStatus = async () => {
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
    setPendingCount(status.pendingCount);
    setIsOnline(status.isOnline);
    setIsSyncing(status.isSyncing);
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCacheData = async () => {
    await syncService.cacheReferenceData();
    await updateStatus();
  };

  const handleSync = async () => {
    await syncService.syncPendingItems();
  };

  const handleRetryFailed = async () => {
    await syncService.retryFailedItems();
  };

  const getStatusColor = () => {
    if (!isOnline) return '#ef4444'; // red
    if (pendingCount > 0) return '#f59e0b'; // amber
    return '#22c55e'; // green
  };

  const getStatusText = () => {
    if (!isOnline) return 'Sin conexión';
    if (isSyncing) return 'Sincronizando...';
    if (pendingCount > 0) return `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`;
    return 'Conectado';
  };

  return (
    <>
      {/* Notification toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 9999,
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: notification.type === 'success' ? '#dcfce7' :
                            notification.type === 'warning' ? '#fef3c7' :
                            notification.type === 'error' ? '#fee2e2' : '#dbeafe',
            color: notification.type === 'success' ? '#166534' :
                   notification.type === 'warning' ? '#92400e' :
                   notification.type === 'error' ? '#991b1b' : '#1e40af',
            animation: 'slideIn 0.3s ease'
          }}
        >
          {notification.type === 'success' && <Check size={18} />}
          {notification.type === 'warning' && <AlertCircle size={18} />}
          {notification.type === 'error' && <AlertCircle size={18} />}
          {notification.type === 'info' && <Cloud size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{notification.message}</span>
        </div>
      )}

      {/* Status indicator button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--card))',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          data-testid="offline-indicator"
        >
          {isOnline ? (
            <Wifi size={16} style={{ color: getStatusColor() }} />
          ) : (
            <WifiOff size={16} style={{ color: getStatusColor() }} />
          )}
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: '500',
            color: getStatusColor()
          }}>
            {getStatusText()}
          </span>
          {isSyncing && (
            <RefreshCw size={14} className="animate-spin" style={{ color: '#3b82f6' }} />
          )}
        </button>

        {/* Details dropdown */}
        {showDetails && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: '280px',
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
              borderBottom: '1px solid hsl(var(--border))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isOnline ? <Cloud size={18} color="#166534" /> : <CloudOff size={18} color="#991b1b" />}
                <span style={{ 
                  fontWeight: '600', 
                  color: isOnline ? '#166534' : '#991b1b'
                }}>
                  {isOnline ? 'Conectado' : 'Modo Offline'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Pendientes de sync:</span>
                <span style={{ fontWeight: '600' }}>{syncStatus?.pendingCount || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Fallidos:</span>
                <span style={{ fontWeight: '600', color: syncStatus?.failedCount > 0 ? '#ef4444' : 'inherit' }}>
                  {syncStatus?.failedCount || 0}
                </span>
              </div>
              {syncStatus?.lastCacheUpdate && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Última cache:</span>
                  <span style={{ fontSize: '0.75rem' }}>
                    {new Date(syncStatus.lastCacheUpdate).toLocaleString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ 
              padding: '0.75rem 1rem', 
              borderTop: '1px solid hsl(var(--border))',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <button
                onClick={handleCacheData}
                disabled={!isOnline}
                className="btn btn-sm"
                style={{ 
                  width: '100%', 
                  justifyContent: 'center',
                  opacity: isOnline ? 1 : 0.5
                }}
              >
                <Download size={14} style={{ marginRight: '0.25rem' }} />
                Descargar datos offline
              </button>
              
              {pendingCount > 0 && isOnline && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="btn btn-sm btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <RefreshCw size={14} style={{ marginRight: '0.25rem' }} className={isSyncing ? 'animate-spin' : ''} />
                  Sincronizar ahora
                </button>
              )}
              
              {syncStatus?.failedCount > 0 && (
                <button
                  onClick={handleRetryFailed}
                  className="btn btn-sm"
                  style={{ width: '100%', justifyContent: 'center', color: '#f59e0b' }}
                >
                  <AlertCircle size={14} style={{ marginRight: '0.25rem' }} />
                  Reintentar fallidos ({syncStatus.failedCount})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default OfflineIndicator;
