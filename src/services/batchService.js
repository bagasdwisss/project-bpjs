// src/services/batchService.js
import api from './api';

export const batchService = {
  getAll: () => api.get('/admin/batches'),
  getById: (id) => api.get(`/admin/batches/${id}`),
  create: (data) => api.post('/admin/batches', data),
  update: (id, data) => api.put(`/admin/batches/${id}`, data),
  delete: (id) => api.delete(`/admin/batches/${id}`),
  assignUsers: (id, userIds) => api.post(`/admin/batches/${id}/assign-users`, { user_ids: userIds })
};

export default batchService;
