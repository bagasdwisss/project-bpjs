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
    console.log('API Response Success:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
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
      // Bisa tambahkan handling khusus untuk 403 di sini
    }

    return Promise.reject(error);
  }
);

export default api;