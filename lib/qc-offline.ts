// Offline storage service for QC inspections using IndexedDB

export interface OfflineQCEntry {
  id: string;
  inspectionId: string;
  farmerDeliveryId: string;
  productId: string;
  farmerId: string;
  data: {
    actualQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    rejectionReasons: string[];
    qualityScore: number;
    notes: string;
    photos: File[];
    audioNotes: File[];
    geolocation?: {
      latitude: number;
      longitude: number;
      timestamp: number;
    };
    signature?: string;
    timestamp: number;
  };
  deviceId: string;
  synced: boolean;
  createdAt: number;
  syncAttempts: number;
  lastSyncAttempt?: number;
  syncError?: string;
}

class QCOfflineStorage {
  private dbName = 'AgroTrackQC';
  private dbVersion = 1;
  private storeName = 'qc_entries';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('inspectionId', 'inspectionId', { unique: false });
        }
      };
    });
  }

  async storeOfflineEntry(entry: Omit<OfflineQCEntry, 'id' | 'deviceId' | 'synced' | 'createdAt' | 'syncAttempts'>): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deviceId = this.getDeviceId();
    
    const fullEntry: OfflineQCEntry = {
      ...entry,
      id,
      deviceId,
      synced: false,
      createdAt: Date.now(),
      syncAttempts: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(fullEntry);

      request.onsuccess = () => {
        resolve(id);
      };

      request.onerror = () => {
        reject(new Error('Failed to store offline entry'));
      };
    });
  }

  async getUnsynced(): Promise<OfflineQCEntry[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('synced');
      const request = index.getAll(0); // Use 0 instead of false for IndexedDB key

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get unsynced entries'));
      };
    });
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.synced = true;
          entry.lastSyncAttempt = Date.now();
          
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update entry'));
        } else {
          reject(new Error('Entry not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get entry'));
      };
    });
  }

  async markSyncFailed(id: string, error: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.syncAttempts += 1;
          entry.lastSyncAttempt = Date.now();
          entry.syncError = error;
          
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update entry'));
        } else {
          reject(new Error('Entry not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get entry'));
      };
    });
  }

  async deleteEntry(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete entry'));
    });
  }

  async getAllEntries(): Promise<OfflineQCEntry[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get all entries'));
      };
    });
  }

  async getEntryById(id: string): Promise<OfflineQCEntry | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get entry'));
      };
    });
  }

  async clearSyncedEntries(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const syncedEntries = await this.getSynced();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      let completed = 0;
      const total = syncedEntries.length;
      
      if (total === 0) {
        resolve();
        return;
      }

      syncedEntries.forEach(entry => {
        const request = store.delete(entry.id);
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        
        request.onerror = () => {
          reject(new Error('Failed to clear synced entries'));
        };
      });
    });
  }

  private async getSynced(): Promise<OfflineQCEntry[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('synced');
      const request = index.getAll(1); // Use 1 instead of true for IndexedDB key

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get synced entries'));
      };
    });
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('agrotrack_device_id');
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('agrotrack_device_id', deviceId);
    }
    
    return deviceId;
  }

  async getStats(): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    failed: number;
  }> {
    const allEntries = await this.getAllEntries();
    
    return {
      total: allEntries.length,
      synced: allEntries.filter(e => e.synced).length,
      unsynced: allEntries.filter(e => !e.synced && e.syncAttempts === 0).length,
      failed: allEntries.filter(e => !e.synced && e.syncAttempts > 0).length
    };
  }
}

// Sync service for handling online/offline synchronization
export class QCSyncService {
  private storage = new QCOfflineStorage();
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Initialize storage
    this.storage.init();
  }

  async storeOfflineQC(
    inspectionId: string,
    farmerDeliveryId: string,
    productId: string,
    farmerId: string,
    qcData: any
  ): Promise<string> {
    return await this.storage.storeOfflineEntry({
      inspectionId,
      farmerDeliveryId,
      productId,
      farmerId,
      data: qcData
    });
  }

  async syncWhenOnline(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const unsyncedEntries = await this.storage.getUnsynced();
      
      for (const entry of unsyncedEntries) {
        try {
          // Convert files to FormData for upload
          const formData = new FormData();
          formData.append('inspectionData', JSON.stringify({
            farmerDeliveryId: entry.farmerDeliveryId,
            productId: entry.productId,
            farmerId: entry.farmerId,
            actualQuantity: entry.data.actualQuantity,
            acceptedQuantity: entry.data.acceptedQuantity,
            rejectedQuantity: entry.data.rejectedQuantity,
            rejectionReasons: entry.data.rejectionReasons,
            qualityScore: entry.data.qualityScore,
            notes: entry.data.notes,
            geolocation: entry.data.geolocation,
            signature: entry.data.signature,
            timestamp: entry.data.timestamp,
            deviceId: entry.deviceId
          }));

          // Add photos
          entry.data.photos.forEach((photo, index) => {
            formData.append(`photo_${index}`, photo);
          });

          // Add audio notes
          entry.data.audioNotes.forEach((audio, index) => {
            formData.append(`audio_${index}`, audio);
          });

          // Submit to server
          const response = await fetch('/api/admin/qc/submit-offline', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            await this.storage.markAsSynced(entry.id);
            // console.log(`Synced QC entry: ${entry.id}`);
          } else {
            const errorText = await response.text();
            await this.storage.markSyncFailed(entry.id, errorText);
            // console.error(`Failed to sync QC entry ${entry.id}:`, errorText);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.storage.markSyncFailed(entry.id, errorMessage);
          // console.error(`Sync error for entry ${entry.id}:`, error);
        }
      }

      // Clean up old synced entries (older than 7 days)
      await this.cleanupOldEntries();

    } finally {
      this.syncInProgress = false;
    }
  }

  private async cleanupOldEntries(): Promise<void> {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const allEntries = await this.storage.getAllEntries();
    
    const oldSyncedEntries = allEntries.filter(
      entry => entry.synced && entry.createdAt < sevenDaysAgo
    );

    for (const entry of oldSyncedEntries) {
      await this.storage.deleteEntry(entry.id);
    }
  }

  async getOfflineStats() {
    return await this.storage.getStats();
  }

  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncWhenOnline();
    }
  }
}

// Singleton instance
export const qcSyncService = new QCSyncService();
export const qcOfflineStorage = new QCOfflineStorage();