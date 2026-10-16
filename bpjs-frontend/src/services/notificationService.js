// src/services/notificationService.js

import api from './api';

export const notificationService = {
  // Untuk peserta
  getAll: (params = {}) => api.get('/notifications', { params }),
  
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  
  delete: (id) => api.delete(`/notifications/${id}`),
  
  clearAllRead: () => api.delete('/notifications/clear/read'),
  
  getUnreadCount: () => api.get('/notifications/unread-count'),

  // Untuk koordinator
  getCoordinatorNotifications: (params = {}) => api.get('/notifications/coordinator', { params }),
  
  create: (data) => api.post('/notifications/coordinator', data),
  
  coordinatorDelete: (id) => api.delete(`/notifications/coordinator/${id}`),
  
  getParticipants: () => api.get('/notifications/coordinator/participants'),
  
  // TAMBAHKAN METHOD BROADCAST UNTUK MENGIRIM KE SEMUA PESERTA
  broadcastToParticipants: (data) => api.post('/notifications/coordinator/broadcast', data)
};