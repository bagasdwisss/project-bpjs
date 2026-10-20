// src/utils/backgroundSync.js - Smart PWA Background Sync API for Offline Attendance
const SYNC_QUEUE_KEY = 'bpjstk_offline_attendance_queue';

/**
 * Retrieves the list of pending offline attendance records
 */
export function getPendingSyncQueue() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Queues an attendance record for background synchronization
 */
export async function queueAttendanceForSync(attendancePayload) {
  const queue = getPendingSyncQueue();
  const entry = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    payload: attendancePayload,
    queuedAt: new Date().toISOString(),
    retryCount: 0
  };

  queue.push(entry);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

  // Request Service Worker Background Sync if supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-attendance');
      return { success: true, queued: true, method: 'BACKGROUND_SYNC_API', entryId: entry.id };
    } catch (_) {
      // Fallback to queue with window online event listener
    }
  }

  return { success: true, queued: true, method: 'LOCAL_QUEUE_RETRY', entryId: entry.id };
}

/**
 * Flushes all pending queued records to the server
 */
export async function flushPendingSyncQueue(apiClient) {
  const queue = getPendingSyncQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  const remaining = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await apiClient('/participant/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.id
        },
        body: JSON.stringify(item.payload)
      });
      flushed++;
    } catch (err) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastError = err.message;
      if (item.retryCount < 5) {
        remaining.push(item);
      }
      failed++;
    }
  }

  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  return { flushed, failed, remainingCount: remaining.length };
}

// Auto flush when network reconnects
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Dispatch custom event for app components to trigger flush
    window.dispatchEvent(new CustomEvent('bpjstk:sync-ready'));
  });
}

export default {
  getPendingSyncQueue,
  queueAttendanceForSync,
  flushPendingSyncQueue
};
