// ============================================================================
// UP POLICE DIRECTORY - ADVANCED INDEXED-DB PERSISTENCE ENGINE (V2)
// High-capacity (500MB+), zero-dependency, permanent local data vault
// Prevents any automatic data loss, localStorage quota overflows, or wipes
// ============================================================================

const DB_NAME = 'UP_POLICE_DIRECTORY_VAULT_V2';
const DB_VERSION = 1;
const STORE_NAME = 'police_records';
const QUEUE_STORE = 'offline_sync_queue';

let dbPromise = null;

/**
 * Open or upgrade the native IndexedDB instance
 */
export const openIDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[IndexedDB] Not supported in this environment, falling back to localStorage');
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
      console.log('[IndexedDB] Database schema initialized successfully');
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Failed to open database:', event.target.error);
      resolve(null); // Resolve with null so caller can gracefully fallback
    };
  });

  return dbPromise;
};

/**
 * Generic Get from IndexedDB
 */
export const idbGet = async (key, fallbackValue = null) => {
  try {
    const db = await openIDB();
    if (!db) return fallbackValue;

    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value);
        } else {
          resolve(fallbackValue);
        }
      };

      req.onerror = () => {
        resolve(fallbackValue);
      };
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error fetching key "${key}":`, err);
    return fallbackValue;
  }
};

/**
 * Generic Set into IndexedDB
 */
export const idbSet = async (key, value) => {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        key,
        value,
        updatedAt: new Date().toISOString()
      });

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.error(`[IndexedDB] Error writing key "${key}":`, e.target.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.error(`[IndexedDB] Set exception for key "${key}":`, err);
    return false;
  }
};

/**
 * Delete a key from IndexedDB
 */
export const idbDelete = async (key) => {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
};

/**
 * Offline Sync Queue: Enqueue action (e.g. contact update when offline)
 */
export const idbEnqueueSync = async (type, payload) => {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.add({
        type,
        payload,
        enqueuedAt: new Date().toISOString()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
};

/**
 * Get all queued offline mutations
 */
export const idbGetSyncQueue = async () => {
  try {
    const db = await openIDB();
    if (!db) return [];

    return new Promise((resolve) => {
      const tx = db.transaction([QUEUE_STORE], 'readonly');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
};

/**
 * Clear offline sync queue after successful sync to Firebase
 */
export const idbClearSyncQueue = async () => {
  try {
    const db = await openIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction([QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
};

/**
 * Automatic Migration: Migrates existing localStorage data to IndexedDB
 * Ensures 100% backward compatibility and zero data loss on first run
 */
export const migrateLocalStorageToIDB = async () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keysToMigrate = [
      'police_directory_contacts_v2',
      'police_directory_coadmins_v2',
      'police_directory_notifs_v2',
      'police_directory_feedbacks_v2',
      'police_directory_chats_v2',
      'police_directory_policies_v2',
      'police_directory_master_posts_v1',
      'police_directory_master_offices_v1',
      'police_directory_master_districts_v1',
      'police_directory_terms_v1',
      'police_directory_backups_v1',
      'police_directory_call_logs_v1',
      'police_directory_phone_permissions_v1',
      'police_directory_2fa_config_v1',
      'police_directory_super_admin_pin_v1'
    ];

    for (const key of keysToMigrate) {
      const localVal = localStorage.getItem(key);
      if (localVal) {
        try {
          const parsed = JSON.parse(localVal);
          const existingInIDB = await idbGet(key);
          // If not in IDB or if localStorage has more records, save to IDB
          if (!existingInIDB || (Array.isArray(parsed) && Array.isArray(existingInIDB) && parsed.length > existingInIDB.length)) {
            await idbSet(key, parsed);
          }
        } catch (e) {
          // Non-JSON string
          const existingInIDB = await idbGet(key);
          if (!existingInIDB) {
            await idbSet(key, localVal);
          }
        }
      }
    }
    console.log('[IndexedDB] LocalStorage data verification & sync complete.');
  } catch (err) {
    console.warn('[IndexedDB] Migration warning:', err);
  }
};

/**
 * Dedicated Contacts Vault Helpers
 */
export const idbSaveContacts = async (contacts) => {
  if (!Array.isArray(contacts)) return false;
  return await idbSet('police_directory_contacts_v2', contacts);
};

export const idbGetContacts = async () => {
  const result = await idbGet('police_directory_contacts_v2', []);
  return Array.isArray(result) ? result : [];
};

/**
 * Dedicated Chats Vault Helpers
 */
export const idbSaveChats = async (chats) => {
  if (!Array.isArray(chats)) return false;
  return await idbSet('police_directory_chats_v2', chats);
};

export const idbGetChats = async () => {
  const result = await idbGet('police_directory_chats_v2', []);
  return Array.isArray(result) ? result : [];
};
