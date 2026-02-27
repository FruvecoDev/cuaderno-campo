// Offline Sync Service
import offlineDB from './offlineDB';
import api from './api';

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.listeners = new Set();
    this.syncInterval = null;
    this.notificationsEnabled = false;
    
    // Safely add event listeners with error handling
    try {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    } catch (err) {
      console.warn('Error setting up network listeners:', err);
    }
    
    // Check notification permission on init (safely)
    this.safeInit();
  }
  
  async safeInit() {
    try {
      await this.checkNotificationPermission();
    } catch (err) {
      console.warn('Error during sync service init:', err);
    }
  }

  // Check and request notification permission
  async checkNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      this.notificationsEnabled = true;
      return true;
    }
    
    return false;
  }

  // Request notification permission from user
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      this.notificationsEnabled = permission === 'granted';
      return this.notificationsEnabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Show a push notification
  showNotification(title, options = {}) {
    if (!this.notificationsEnabled || Notification.permission !== 'granted') {
      console.log('Notificaciones no permitidas');
      return;
    }
    
    try {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'fruveco-sync',
        renotify: true,
        ...options
      });
      
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
      // Focus app on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // Subscribe to sync events
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners (with error protection)
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        console.warn('Error in sync listener callback:', err);
      }
    });
  }

  handleOnline() {
    console.log('🟢 Connection restored');
    this.isOnline = true;
    this.notifyListeners({ type: 'online' });
    
    // Show notification when back online (safely)
    try {
      this.showNotification('Conexión restaurada', {
        body: 'Sincronizando datos pendientes...',
        icon: '/logo192.png'
      });
    } catch (err) {
      console.warn('Error showing notification:', err);
    }
    
    // Auto-sync when coming back online (safely)
    this.syncPendingItems().catch(err => {
      console.warn('Error during auto-sync:', err);
    });
  }

  handleOffline() {
    console.log('🔴 Connection lost');
    this.isOnline = false;
    this.notifyListeners({ type: 'offline' });
  }

  getToken() {
    // El token se guarda directamente como 'token' en localStorage
    return localStorage.getItem('token');
  }

  // Cache reference data from server
  async cacheReferenceData() {
    if (!this.isOnline) {
      console.log('Cannot cache data: offline');
      return false;
    }

    const token = this.getToken();
    if (!token) {
      console.log('Cannot cache data: no auth token');
      return false;
    }

    try {
      this.notifyListeners({ type: 'caching', message: 'Descargando datos para modo offline...' });

      // Fetch all reference data in parallel using the api service
      const [parcelasData, cultivosData, contratosData, proveedoresData] = await Promise.all([
        api.get('/api/parcelas'),
        api.get('/api/cultivos'),
        api.get('/api/contratos'),
        api.get('/api/proveedores')
      ]);

      const parcelas = parcelasData.parcelas || [];
      const cultivos = cultivosData.cultivos || [];
      const contratos = contratosData.contratos || [];
      const proveedores = proveedoresData.proveedores || [];

      await offlineDB.cacheReferenceData(parcelas, cultivos, contratos, proveedores);

      this.notifyListeners({ 
        type: 'cached', 
        message: `Datos cacheados: ${parcelas.length} parcelas, ${cultivos.length} cultivos, ${contratos.length} contratos`,
        counts: { parcelas: parcelas.length, cultivos: cultivos.length, contratos: contratos.length }
      });

      return true;
    } catch (error) {
      console.error('Error caching reference data:', error);
      this.notifyListeners({ type: 'error', message: 'Error al descargar datos offline' });
      return false;
    }
  }

  // Save visita offline
  async saveVisitaOffline(visitaData) {
    try {
      const id = await offlineDB.addToPendingSync('visita', visitaData);
      const count = await offlineDB.getPendingSyncCount();
      
      this.notifyListeners({ 
        type: 'itemAdded', 
        itemType: 'visita',
        pendingCount: count 
      });
      
      return { success: true, offlineId: id, message: 'Visita guardada localmente. Se sincronizará al reconectar.' };
    } catch (error) {
      console.error('Error saving visita offline:', error);
      return { success: false, error: error.message };
    }
  }

  // Save tratamiento offline
  async saveTratamientoOffline(tratamientoData) {
    try {
      const id = await offlineDB.addToPendingSync('tratamiento', tratamientoData);
      const count = await offlineDB.getPendingSyncCount();
      
      this.notifyListeners({ 
        type: 'itemAdded', 
        itemType: 'tratamiento',
        pendingCount: count 
      });
      
      return { success: true, offlineId: id, message: 'Tratamiento guardado localmente. Se sincronizará al reconectar.' };
    } catch (error) {
      console.error('Error saving tratamiento offline:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync all pending items
  async syncPendingItems() {
    if (!this.isOnline) {
      console.log('Cannot sync: offline');
      return { synced: 0, failed: 0 };
    }

    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { synced: 0, failed: 0 };
    }

    const token = this.getToken();
    if (!token) {
      console.log('Cannot sync: no auth token');
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'syncStart' });

    const pendingItems = await offlineDB.getPendingSyncItems();
    const pendingOnly = pendingItems.filter(item => item.status === 'pending');

    if (pendingOnly.length === 0) {
      this.isSyncing = false;
      this.notifyListeners({ type: 'syncComplete', synced: 0, failed: 0 });
      return { synced: 0, failed: 0 };
    }

    console.log(`Starting sync of ${pendingOnly.length} items`);

    let synced = 0;
    let failed = 0;

    for (const item of pendingOnly) {
      try {
        let endpoint = '';
        if (item.type === 'visita') {
          endpoint = `${BACKEND_URL}/api/visitas`;
        } else if (item.type === 'tratamiento') {
          endpoint = `${BACKEND_URL}/api/tratamientos`;
        } else {
          console.warn('Unknown item type:', item.type);
          continue;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          await offlineDB.removePendingSyncItem(item.id);
          synced++;
          console.log(`Synced ${item.type} #${item.id}`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Failed to sync ${item.type} #${item.id}:`, errorData);
          
          await offlineDB.updatePendingSyncItem(item.id, {
            status: item.attempts >= 2 ? 'failed' : 'pending',
            attempts: item.attempts + 1,
            lastError: errorData.detail || 'Error desconocido',
            lastAttempt: new Date().toISOString()
          });
          failed++;
        }
      } catch (error) {
        console.error(`Error syncing ${item.type} #${item.id}:`, error);
        await offlineDB.updatePendingSyncItem(item.id, {
          attempts: item.attempts + 1,
          lastError: error.message,
          lastAttempt: new Date().toISOString()
        });
        failed++;
      }
    }

    this.isSyncing = false;
    
    const remainingCount = await offlineDB.getPendingSyncCount();
    
    this.notifyListeners({ 
      type: 'syncComplete', 
      synced, 
      failed,
      remaining: remainingCount
    });

    // Show push notification with sync results
    if (synced > 0 || failed > 0) {
      const title = synced > 0 ? '✅ Sincronización completada' : '⚠️ Sincronización con errores';
      let body = '';
      
      if (synced > 0) {
        const items = synced === 1 ? 'registro' : 'registros';
        body = `${synced} ${items} sincronizado${synced > 1 ? 's' : ''} correctamente`;
      }
      
      if (failed > 0) {
        const failedItems = failed === 1 ? 'registro' : 'registros';
        body += body ? `. ${failed} ${failedItems} fallido${failed > 1 ? 's' : ''}` : `${failed} ${failedItems} fallido${failed > 1 ? 's' : ''}`;
      }
      
      this.showNotification(title, { body });
    }

    console.log(`Sync complete: ${synced} synced, ${failed} failed, ${remainingCount} remaining`);
    return { synced, failed, remaining: remainingCount };
  }

  // Get sync status
  async getSyncStatus() {
    const pendingItems = await offlineDB.getPendingSyncItems();
    const lastCache = await offlineDB.getLastCacheUpdate();
    
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pendingItems.filter(i => i.status === 'pending').length,
      failedCount: pendingItems.filter(i => i.status === 'failed').length,
      pendingItems: pendingItems,
      lastCacheUpdate: lastCache
    };
  }

  // Retry failed items
  async retryFailedItems() {
    const pendingItems = await offlineDB.getPendingSyncItems();
    const failedItems = pendingItems.filter(i => i.status === 'failed');
    
    for (const item of failedItems) {
      await offlineDB.updatePendingSyncItem(item.id, {
        status: 'pending',
        attempts: 0
      });
    }
    
    return this.syncPendingItems();
  }

  // Clear all failed items
  async clearFailedItems() {
    const pendingItems = await offlineDB.getPendingSyncItems();
    const failedItems = pendingItems.filter(i => i.status === 'failed');
    
    for (const item of failedItems) {
      await offlineDB.removePendingSyncItem(item.id);
    }
    
    const count = await offlineDB.getPendingSyncCount();
    this.notifyListeners({ type: 'itemsCleared', pendingCount: count });
  }
}

// Singleton instance
const syncService = new SyncService();

export { syncService };
export default syncService;
