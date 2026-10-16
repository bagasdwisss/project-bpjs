import api from './api';

const attendanceService = {
  // Get user's attendance records
  getMyAttendance: async () => {
    try {
      const response = await api.get('/participant/attendance');
      
      console.log('Raw API Response:', response); // ✅ Debug log

      // Pastikan response memiliki full_name dari user
      if (response.data.success) {
        const dataWithNames = response.data.data.map(att => ({
          ...att,
          full_name: att.full_name || (att.user ? att.user.full_name : 'N/A')
        }));

        console.log('Processed Data:', dataWithNames); // ✅ Debug log

        return {
          success: true,
          data: dataWithNames
        };
      }

      // Jika struktur response tidak memiliki properti success (fallback ke versi lama)
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Attendance service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to load attendance data',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Check in attendance with GPS location
  checkIn: async (notes = '', gpsLocation = '') => {
    try {
      const response = await api.post('/participant/attendance/check-in', { 
        notes, 
        gps_location: gpsLocation 
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Check-in error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check in',
        error: error.response?.data?.error || error.message
      };
    }
  },

  // Get attendance statistics
  getMyStatistics: async () => {
    try {
      const response = await api.get('/participant/attendance/statistics');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Attendance statistics error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to load attendance statistics',
        error: error.response?.data?.error || error.message
      };
    }
  }
};

export default attendanceService;
