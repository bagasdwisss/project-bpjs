import axios from 'axios';
import { getDeviceFingerprint } from '../utils/deviceFingerprint.js';

// API Base URL - defaults to /api for relative same-origin on Vercel and local Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Penting untuk CORS dan Sanctum
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const isAuthRoute = config.url?.includes('/login') || config.url?.includes('/logout');

    // Attach Device Fingerprint Header (Feature 5)
    config.headers['x-device-fingerprint'] = getDeviceFingerprint();

    // Cek batas inaktivitas 15 menit sebelum request dikirim
    if (token && !isAuthRoute) {
      const storedLastActive = parseInt(localStorage.getItem('last_active_time') || '0', 10);
      const configuredMinutes = parseInt(localStorage.getItem('sys_inactivity_minutes') || '15', 10);
      const INACTIVITY_TIMEOUT_MS = (configuredMinutes > 0 ? configuredMinutes : 15) * 60 * 1000;
      if (storedLastActive && Date.now() - storedLastActive > INACTIVITY_TIMEOUT_MS) {
        console.warn(`API call blocked: Inactivity timeout > ${configuredMinutes} minutes`);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('last_active_time');
        window.location.href = '/login?reason=idle_timeout';
        return Promise.reject(new Error(`Sesi berakhir karena tidak ada interaksi selama ${configuredMinutes} menit.`));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Suppress console error noise for background session checks or 401 unauth checks
    const isBackgroundCheck = error.config?.url?.includes('session-check') || error.config?.url?.includes('session-stream');
    if (!isBackgroundCheck && import.meta.env.DEV) {
      console.error('API Response Error:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        console.log('Unauthorized on protected route, redirecting to login...');
        const errorCode = error.response?.data?.code;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('last_active_time');
        if (errorCode === 'CONCURRENT_LOGIN_DETECTED' || errorCode === 'SESSION_HIJACK_DETECTED') {
          window.location.href = '/login?reason=concurrent_session';
        } else {
          window.location.href = '/login?reason=session_expired';
        }
      }
    }

    if (error.response?.status === 503 || error.response?.data?.code === 'MAINTENANCE_MODE_ACTIVE') {
      window.dispatchEvent(new CustomEvent('maintenance-mode', { detail: error.response?.data }));
    }
    
    if (error.response?.status === 403) {
      console.log('Access forbidden');
    }

    return Promise.reject(error);
  }
);

// ==========================================
// OPTIMASI HEMAT REQUEST: In-Flight Deduplication & In-Memory Cache
// ==========================================
const requestCache = new Map();
const inFlightRequests = new Map();

const generateCacheKey = (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${method}:${url}:${params}`;
};

export const clearApiCache = () => {
  requestCache.clear();
};

api.clearCache = clearApiCache;

// Wrap api.request to provide automatic request deduplication and caching
const originalRequest = api.request.bind(api);

api.request = async function (config) {
  if (typeof config === 'string') {
    config = { url: config };
  }
  const method = (config.method || 'get').toLowerCase();

  // Any mutation (POST, PUT, DELETE, PATCH) invalidates the GET cache to guarantee freshness
  if (method !== 'get') {
    requestCache.clear();
    return originalRequest(config);
  }

  // Bypass cache if explicitly requested or for session validation
  if (config.skipCache || config.url?.includes('session-check')) {
    return originalRequest(config);
  }

  const cacheKey = generateCacheKey(config);
  const now = Date.now();
  const ttl = config.cacheTTL || 15000; // 15 detik default TTL

  // 1. Check in-memory fresh cache
  const cached = requestCache.get(cacheKey);
  if (cached && now - cached.timestamp < ttl) {
    return Promise.resolve({ ...cached.response, fromCache: true });
  }

  // 2. In-flight request deduplication: jika request yang sama sedang berjalan, gabungkan promise
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Eksekusi request jaringan dan simpan promise untuk deduplikasi
  const requestPromise = originalRequest(config)
    .then((response) => {
      if (response && response.status === 200) {
        requestCache.set(cacheKey, {
          timestamp: Date.now(),
          response
        });
      }
      return response;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export default api;