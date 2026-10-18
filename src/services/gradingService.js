import api from './api';
import axios from 'axios';

const gradingService = {
  // Get all participants for grading
  getParticipants: async (filters = {}, cancelToken = null) => {
    try {
      const config = { params: filters };
      if (cancelToken) {
        config.cancelToken = cancelToken;
      }
      
      const response = await api.get('/grading/participants', config);
      return response.data;
    } catch (error) {
      // Don't throw error if it's a cancellation
      if (axios.isCancel(error)) {
        console.log('Request canceled:', error.message);
        throw error; // Re-throw to be handled by caller
      }
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },

  // ✅ Create progress entry for participant
  createProgressEntry: async (participantId) => {
    try {
      const response = await api.post('/grading/participants/create-progress', {
        participant_id: participantId,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },

  // ✅ Get participants without progress entries - uses authenticated user's info
  getParticipantsWithoutProgress: async () => {
    try {
      const response = await api.get('/grading/participants/without-progress');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch available participants';
      throw new Error(errorMessage);
    }
  },

  // Get coordinators list
  getCoordinators: async () => {
    try {
      const response = await api.get('/grading/coordinators');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },

  // Update scores
  updateScores: async (progressId, scores) => {
    try {
      const response = await api.put(`/grading/participants/${progressId}/scores`, scores);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },

  // Update progress components
  updateProgress: async (progressId, progressData) => {
    try {
      const response = await api.put(`/grading/participants/${progressId}/progress`, progressData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },

  // Get participant detail
  getParticipantDetail: async (progressId) => {
    try {
      const response = await api.get(`/grading/participants/${progressId}`);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch participant details';
      throw new Error(errorMessage);
    }
  },

  // Get dynamic grading configuration (targets, weights, grade cutoffs)
  getConfiguration: async () => {
    try {
      const response = await api.get('/grading/configuration');
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },

  // Update dynamic grading configuration
  updateConfiguration: async (configData) => {
    try {
      const response = await api.put('/grading/configuration', configData);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(errorMessage);
    }
  },
};

export default gradingService;
