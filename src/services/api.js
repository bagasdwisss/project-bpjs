import axios from 'axios';

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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log untuk debugging
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });
    
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
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        console.log('Unauthorized on protected route, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
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

  // Bypass cache if explicitly requested
  if (config.skipCache) {
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