// services/authService.js

import api from './api';

const authService = {
  async login(uniqueId, password) {
    try {
      console.log('Sending login request...', { uniqueId });
      
      const response = await api.post('/login', {
        unique_id: uniqueId,
        password: password
      });

      console.log('Login response:', response.data);

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Simpan token dan user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return {
          success: true,
          user: user,
          token: token
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Login failed'
        };
      }
    } catch (error) {
      console.error('Auth service login error:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        console.error('Response error:', { status, data });
        
        let message = data.message || 'Login failed';
        
        return {
          success: false,
          message: message
        };
      } else if (error.request) {
        console.error('No response received:', error.request);
        return {
          success: false,
          message: 'No response from server. Check your connection.'
        };
      } else {
        console.error('Request setup error:', error.message);
        return {
          success: false,
          message: error.message || 'Login failed'
        };
      }
    }
  },

  async logout() {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  },

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  // ✅ Fungsi baru untuk mengubah password
  async changePassword(passwordData) {
    try {
      const response = await api.post('/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Gagal mengubah password');
    }
  }
};

export default authService;
