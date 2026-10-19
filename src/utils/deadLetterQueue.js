// src/utils/deadLetterQueue.js - Dead Letter Queue (DLQ) & Exponential Backoff for Failed Transactions
import axios from 'axios';

const DLQ_STORAGE_KEY = 'bpjstk_dead_letter_queue';
const MAX_RETRIES = 5;

const getQueue = () => {
  try {
    const raw = localStorage.getItem(DLQ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue) => {
  try {
    localStorage.setItem(DLQ_STORAGE_KEY, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dlq-change', { detail: { count: queue.length } }));
    }
  } catch (e) {
    console.error('Failed to save DLQ:', e);
  }
};

/**
 * Enqueue a critical failed transaction into DLQ
 */
export const enqueueFailedTransaction = (type, endpoint, method, payload, errorMessage) => {
  const queue = getQueue();
  const newItem = {
    id: `dlq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    endpoint,
    method: method.toUpperCase(),
    payload,
    errorMessage,
    retryCount: 0,
    nextRetryAt: Date.now() + 2000, // First retry after 2 seconds
    createdAt: Date.now()
  };

  queue.push(newItem);
  saveQueue(queue);
  console.warn(`📥 [DLQ] Transaksi disimpan ke antrean darurat: ${type} (${endpoint})`);
  return newItem;
};

/**
 * Process pending items in DLQ using Exponential Backoff
 */
export const processDeadLetterQueue = async () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const remainingQueue = [];

  for (const item of queue) {
    if (now < item.nextRetryAt) {
      remainingQueue.push(item);
      continue;
    }

    try {
      console.log(`🔄 [DLQ] Mengirim ulang ${item.type} (Coba ${item.retryCount + 1}/${MAX_RETRIES})...`);
      
      const res = await axios({
        method: item.method,
        url: item.endpoint,
        data: item.payload,
        timeout: 10000,
        headers: {
          'X-Requested-From-DLQ': 'true'
        }
      });

      if (res.status >= 200 && res.status < 300) {
        console.log(`✅ [DLQ] Transaksi ${item.type} berhasil dipulihkan & disinkronisasi.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dlq-recovered', { detail: item }));
        }
        continue; // Successfully resolved, do not keep in queue
      }
    } catch (err) {
      item.retryCount++;
      item.errorMessage = err.message || 'Network error';

      if (item.retryCount < MAX_RETRIES) {
        // Exponential backoff: 2^retry * 1500ms + random jitter
        const backoffMs = Math.pow(2, item.retryCount) * 1500 + Math.random() * 1000;
        item.nextRetryAt = Date.now() + backoffMs;
        remainingQueue.push(item);
        console.warn(`⏳ [DLQ] Coba ulang berikutnya dijadwalkan dalam ${Math.round(backoffMs / 1000)} detik`);
      } else {
        console.error(`❌ [DLQ] Transaksi ${item.type} melebihi batas percobaan (${MAX_RETRIES}). Disimpan ke arsip gagal.`);
        remainingQueue.push({ ...item, isDead: true });
      }
    }
  }

  saveQueue(remainingQueue);
};

export const getPendingDlqCount = () => {
  return getQueue().filter(i => !i.isDead).length;
};

export const clearDlq = () => {
  saveQueue([]);
};

// Periodically process queue every 15 seconds
if (typeof window !== 'undefined') {
  setInterval(processDeadLetterQueue, 15000);
  window.addEventListener('online', processDeadLetterQueue);
}

export default {
  enqueueFailedTransaction,
  processDeadLetterQueue,
  getPendingDlqCount,
  clearDlq
};
