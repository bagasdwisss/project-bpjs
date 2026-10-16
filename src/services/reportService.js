// src/services/reportService.js
import api from './api';

export const reportService = {
  generate: (data) => api.post('/admin/reports/generate', data),
  history: () => api.get('/admin/reports/history'),
  download: (id) => api.get(`/admin/reports/${id}/download`),
  generateCertificate: (data) => api.post('/coordinator/certificates/generate', data),
  certificateHistory: () => api.get('/coordinator/certificates/history'),
  createBackup: () => api.post('/admin/backup/create'),
  listBackups: () => api.get('/admin/backup/list'),
  restoreBackup: (id) => api.post(`/admin/backup/${id}/restore`),
  getSystemStats: () => api.get('/admin/monitoring/system-stats'),
  getActivityLogs: () => api.get('/admin/monitoring/activity-logs'),
  getActiveUsers: () => api.get('/admin/monitoring/active-users')
};

export default reportService;
