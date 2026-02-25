// Offline Database Service using IndexedDB
const DB_NAME = 'fruveco_offline_db';
const DB_VERSION = 1;

// Store names
const STORES = {
  PARCELAS: 'parcelas',
  CULTIVOS: 'cultivos',
  CONTRATOS: 'contratos',
  PROVEEDORES: 'proveedores',
  PENDING_SYNC: 'pending_sync',
  SYNC_STATUS: 'sync_status'
};

class OfflineDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (this.isReady) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores for cached data
        if (!db.objectStoreNames.contains(STORES.PARCELAS)) {
          db.createObjectStore(STORES.PARCELAS, { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains(STORES.CULTIVOS)) {
          db.createObjectStore(STORES.CULTIVOS, { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains(STORES.CONTRATOS)) {
          db.createObjectStore(STORES.CONTRATOS, { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains(STORES.PROVEEDORES)) {
          db.createObjectStore(STORES.PROVEEDORES, { keyPath: '_id' });
        }

        // Create store for pending sync items
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const syncStore = db.createObjectStore(STORES.PENDING_SYNC, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create store for sync status
        if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
          db.createObjectStore(STORES.SYNC_STATUS, { keyPath: 'key' });
        }

        console.log('IndexedDB stores created');
      };
    });
  }

  // Generic methods
  async getAll(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async putMany(storeName, items) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clear(storeName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specific methods for offline functionality

  // Cache reference data from API
  async cacheReferenceData(parcelas, cultivos, contratos, proveedores) {
    try {
      if (parcelas?.length) {
        await this.clear(STORES.PARCELAS);
        await this.putMany(STORES.PARCELAS, parcelas);
      }
      if (cultivos?.length) {
        await this.clear(STORES.CULTIVOS);
        await this.putMany(STORES.CULTIVOS, cultivos);
      }
      if (contratos?.length) {
        await this.clear(STORES.CONTRATOS);
        await this.putMany(STORES.CONTRATOS, contratos);
      }
      if (proveedores?.length) {
        await this.clear(STORES.PROVEEDORES);
        await this.putMany(STORES.PROVEEDORES, proveedores);
      }

      // Update sync status
      await this.put(STORES.SYNC_STATUS, {
        key: 'lastCacheUpdate',
        value: new Date().toISOString()
      });

      console.log('Reference data cached successfully');
      return true;
    } catch (error) {
      console.error('Error caching reference data:', error);
      return false;
    }
  }

  // Get cached reference data
  async getCachedParcelas() {
    return this.getAll(STORES.PARCELAS);
  }

  async getCachedCultivos() {
    return this.getAll(STORES.CULTIVOS);
  }

  async getCachedContratos() {
    return this.getAll(STORES.CONTRATOS);
  }

  async getCachedProveedores() {
    return this.getAll(STORES.PROVEEDORES);
  }

  // Add item to pending sync queue
  async addToPendingSync(type, data) {
    await this.init();
    const item = {
      type, // 'visita' or 'tratamiento'
      data,
      createdAt: new Date().toISOString(),
      status: 'pending',
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.PENDING_SYNC, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_SYNC);
      const request = store.add(item);

      request.onsuccess = () => {
        console.log(`Added ${type} to pending sync queue`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending sync items
  async getPendingSyncItems() {
    return this.getAll(STORES.PENDING_SYNC);
  }

  // Update pending sync item status
  async updatePendingSyncItem(id, updates) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORES.PENDING_SYNC, 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_SYNC);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          const updated = { ...item, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve(updated);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Remove synced item
  async removePendingSyncItem(id) {
    return this.delete(STORES.PENDING_SYNC, id);
  }

  // Get pending sync count
  async getPendingSyncCount() {
    const items = await this.getPendingSyncItems();
    return items.filter(i => i.status === 'pending').length;
  }

  // Get last cache update time
  async getLastCacheUpdate() {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(STORES.SYNC_STATUS, 'readonly');
      const store = transaction.objectStore(STORES.SYNC_STATUS);
      const request = store.get('lastCacheUpdate');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
    });
  }
}

// Singleton instance
const offlineDB = new OfflineDB();

export { offlineDB, STORES };
export default offlineDB;
