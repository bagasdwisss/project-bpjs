// src/services/scoreService.js
import api from './api';

export const scoreService = {
  getMyScores: () => api.get('/participant/scores'),
  getMyStatistics: () => api.get('/participant/scores/statistics'),
  getParticipantScores: (participantId) => api.get(`/participant/scores/participant/${participantId}`),
  createScore: (scoreData) => api.post('/participant/scores', scoreData),
  updateScore: (id, scoreData) => api.put(`/participant/scores/${id}`, scoreData),
  deleteScore: (id) => api.delete(`/participant/scores/${id}`),
  performanceAnalysis: () => api.get('/coordinator/analysis/performance')
};

export default scoreService;
