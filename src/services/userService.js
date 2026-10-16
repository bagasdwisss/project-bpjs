import api from './api'; // Mengimpor instance axios yang sudah dikonfigurasi

/**
 * ============================
 * USER MANAGEMENT (Admin)
 * ============================
 */

/**
 * Mengambil daftar pengguna dari server.
 * @param {object} params - Parameter untuk filter, contoh: { role: 'participant' }
 * @returns {Promise<Array>} Daftar pengguna
 */
const getUsers = (params = {}) => {
  return api.get('/users', { params });
};

const getUsersByCoordinator = async (coordinatorId) => {
  try {
    const response = await apiClient.get(`/api/users/by-coordinator/${coordinatorId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Membuat pengguna baru.
 * @param {object} userData - Data pengguna dari form (name, email, role, coordinator)
 * @returns {Promise<object>} Data pengguna yang baru dibuat
 */
const createUser = (userData) => {
  return api.post('/users', userData);
};

/**
 * Mengupdate data pengguna yang sudah ada.
 * @param {number} id - ID pengguna yang akan diupdate
 * @param {object} userData - Data baru untuk pengguna
 * @returns {Promise<object>} Data pengguna yang sudah diupdate
 */
const updateUser = (id, userData) => {
  return api.put(`/users/${id}`, userData);
};

/**
 * Menghapus pengguna.
 * @param {number} id - ID pengguna yang akan dihapus
 * @returns {Promise}
 */
const deleteUser = (id) => {
  return api.delete(`/users/${id}`);
};

/**
 * Mengimpor pengguna dari file Excel.
 * CATATAN: Endpoint backend harus mendukung upload file Excel.
 * @param {File} file - File Excel yang akan diimpor
 * @returns {Promise<object>} Hasil dari proses import
 */
const importUsers = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/users/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};


/**
 * ============================
 * COORDINATOR AREA
 * ============================
 */

/**
 * Mendapatkan data koordinator yang sedang login.
 * @returns {Promise<object>} Data koordinator
 */
const getCoordinator = () => {
  return api.get('/coordinator');
};

/**
 * Mendapatkan semua koordinator dari sistem.
 * @returns {Promise<Array>} Daftar koordinator
 */
const getCoordinators = () => {
  return api.get('/coordinators');
};

/**
 * Mendapatkan daftar peserta yang berada di bawah koordinator yang sedang login.
 * @returns {Promise<Array>} Daftar peserta
 */
const getMyParticipants = async () => {
  try {
    const response = await api.get('/coordinator/participants');
    return response;
  } catch (error) {
    console.error('Error getting participants:', error);
    throw error;
  }
};

/**
 * Alternatif: Mendapatkan peserta berdasarkan koordinator.
 * @returns {Promise<Array>} Daftar peserta berdasarkan koordinator
 */
const getParticipantsByCoordinator = async () => {
  try {
    const response = await api.get('/coordinator/participants/by-coordinator');
    return response;
  } catch (error) {
    console.error('Error getting participants by coordinator:', error);
    throw error;
  }
};

/**
 * Mendapatkan detail satu peserta berdasarkan ID.
 * @param {number|string} id - ID peserta
 * @returns {Promise<object>} Detail peserta
 */
const getParticipantDetail = async (id) => {
  try {
    const response = await api.get(`/coordinator/participants/${id}`);
    return response;
  } catch (error) {
    console.error('Error getting participant detail:', error);
    throw error;
  }
};


/**
 * ============================
 * PROGRESS MANAGEMENT
 * ============================
 */

/**
 * Mendapatkan data progress seorang user dari database.
 * @param {number|string} userId - ID user yang akan diambil progressnya
 * @returns {Promise<object>} Data progress user
 */
const getUserProgress = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}/progress`);
    return response;
  } catch (error) {
    console.error(`Error getting progress for user ${userId}:`, error);
    // Return default data jika error
    return {
      data: {
        success: false,
        data: {
          user_id: userId,
          kunjungan_bpu: 0,
          hasil_akuisisi_bpu: 0,
          kunjungan_pu: 0,
          video_viralisasi: 0,
          kehadiran_seminar: 0,
          kehadiran_sosialisasi: 0,
          total_poin: 0,
          nilai: 0,
          grade: '-'
        }
      }
    };
  }
};

/**
 * Mendapatkan ringkasan progress semua peserta sekaligus dalam 1 request batch.
 * Menggantikan loop N+1 requests (menghemat puluhan request jaringan).
 */
const getProgressSummary = async () => {
  try {
    const response = await api.get('/users/progress/summary');
    return response;
  } catch (error) {
    console.error('Error getting progress summary:', error);
    return { data: { success: false, data: {} } };
  }
};

/**
 * Update data progress seorang user.
 * @param {number|string} userId - ID user yang akan diupdate progressnya
 * @param {object} progressData - Data progress yang akan diupdate
 * @param {number} progressData.kunjungan_bpu - Jumlah kunjungan BPU
 * @param {number} progressData.hasil_akuisisi_bpu - Jumlah hasil akuisisi BPU
 * @param {number} progressData.kunjungan_pu - Jumlah kunjungan PU
 * @param {number} progressData.video_viralisasi - Jumlah video viralisasi
 * @param {number} progressData.kehadiran_seminar - Jumlah kehadiran seminar
 * @param {number} progressData.kehadiran_sosialisasi - Jumlah kehadiran sosialisasi
 * @returns {Promise<object>} Data progress yang sudah diupdate
 */
const updateUserProgress = async (userId, progressData) => {
  try {
    const response = await api.put(`/users/${userId}/progress`, progressData);
    return response;
  } catch (error) {
    console.error(`Error updating progress for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan semua data progress peserta dari koordinator yang sedang login.
 * @returns {Promise<Array>} Daftar progress peserta
 */
const getCoordinatorParticipantsProgress = async () => {
  try {
    const response = await api.get('/coordinator/participants/progress');
    return response;
  } catch (error) {
    console.error('Error getting coordinator participants progress:', error);
    throw error;
  }
};

/**
 * Mendapatkan data user by ID (termasuk informasi role, dll)
 * @param {number|string} userId - ID user
 * @returns {Promise<object>} Data user
 */
const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response;
  } catch (error) {
    console.error(`Error getting user ${userId}:`, error);
    throw error;
  }
};

/**
 * Mendapatkan profile user yang sedang login
 * @returns {Promise<object>} Data profile user
 */
const getProfile = async () => {
  try {
    const response = await api.get('/profile');
    return response;
  } catch (error) {
    console.error('Error getting profile:', error);
    throw error;
  }
};

/**
 * Update profile user yang sedang login
 * @param {object} profileData - Data profile yang akan diupdate
 * @returns {Promise<object>} Data profile yang sudah diupdate
 */
const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/profile', profileData);
    return response;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};


/**
 * ============================
 * EXPORT SEMUA SERVICE
 * ============================
 */
const userService = {

  getUserProgress: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}/progress`);
      return response;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  },
  // Admin - User Management
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  importUsers,
  getUserById,

  // Coordinator
  getCoordinator,
  getCoordinators,
  getMyParticipants,
  getParticipantsByCoordinator,
  getParticipantDetail,

  // Progress Management
  getUserProgress,
  getProgressSummary,
  updateUserProgress,
  getCoordinatorParticipantsProgress,

  // Profile
  getProfile,
  updateProfile,
};

export default userService;