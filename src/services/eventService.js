import api from './api';

export const eventService = {
  // Get events for participant
  getParticipantEvents: async () => {
    try {
      const response = await api.get('/events/participant');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all events (for coordinator/admin)
  getEvents: async () => {
    try {
      const response = await api.get('/events');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create event (for coordinator/admin)
  createEvent: async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};