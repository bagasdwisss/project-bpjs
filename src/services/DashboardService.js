import api from './api';

const dashboardService = {
  getParticipantDashboard: async () => {
    try {
      const response = await api.get('/dashboard/participant');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Dashboard service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to load dashboard data',
        error: error.response?.data?.error || error.message
      };
    }
  },

  getCoordinatorDashboard: async () => {
    try {
      const response = await api.get('/dashboard/coordinator');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Coordinator dashboard service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to load coordinator dashboard data',
        error: error.response?.data?.error || error.message
      };
    }
  },

  getAdminDashboard: async () => {
    try {
      const response = await api.get('/dashboard/admin');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Admin dashboard service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to load admin dashboard data',
        error: error.response?.data?.error || error.message
      };
    }
  }
};

export default dashboardService;