import api from './api';

const progressService = {
  getProgressData: async () => {
    const response = await api.get('/progress');
    return response.data;
  },
  
  getVisitData: async () => {
    const response = await api.get('/visits');
    return response.data;
  },
  
  updateVisit: async (visitId, data) => {
    const response = await api.put(`/visits/${visitId}`, data);
    return response.data;
  },

  // NEW METHOD: Get coordinator participants progress
  getCoordinatorParticipantsProgress: async () => {
    const response = await api.get('/api/coordinator/participants/progress');
    return response.data;
  },

  // NEW METHOD: Get participant progress by ID
  getParticipantProgress: async (userId) => {
    const response = await api.get(`/api/coordinator/participants/${userId}/progress`);
    return response.data;
  }
};

export default progressService;