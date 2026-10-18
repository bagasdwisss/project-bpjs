// src/utils/offlineQueue.js - IndexedDB Offline Queue & Background Sync for Attendance
const DB_NAME = 'bpjstk_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'attendance_queue';

const openDb = () => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB tidak didukung pada browser ini.'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveOfflineAttendance = async (payload) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      ...payload,
      is_offline_sync: true,
      captured_at_epoch: Date.now(),
      created_at_local: new Date().toISOString()
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const getOfflineAttendances = async () => {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
};

export const removeOfflineAttendance = async (id) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const syncOfflineAttendanceQueue = async (apiClient) => {
  const items = await getOfflineAttendances();
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const { id, captured_at_epoch, created_at_local, ...payload } = item;
      const res = await apiClient.post('/participant/attendance/check-in', {
        ...payload,
        is_offline_sync: true
      });
      if (res.data?.success) {
        await removeOfflineAttendance(id);
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      console.warn('Failed to sync item #' + item.id, err.message);
      failed++;
    }
  }

  return { synced, failed, total: items.length };
};
