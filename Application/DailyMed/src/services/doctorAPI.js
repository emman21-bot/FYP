import api from './api';

export const doctorAPI = {
  // Get all doctors
  getAllDoctors: async () => {
    try {
      const response = await api.get('/doctors');
      return response.data;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  },

  // Get doctor by ID
  getDoctorById: async (doctorId) => {
    try {
      const response = await api.get(`/doctors/${doctorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor:', error);
      throw error;
    }
  },

  // Get doctor profile
  getDoctorProfile: async (userId) => {
    try {
      const response = await api.get(`/doctors/profile/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor profile:', error);
      throw error;
    }
  },

  // Update doctor profile
  updateDoctorProfile: async (userId, profileData) => {
    try {
      const response = await api.put(`/doctors/profile/${userId}`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating doctor profile:', error);
      throw error;
    }
  },

  // Search doctors
  searchDoctors: async (query) => {
    try {
      const response = await api.get('/doctors/search', {
        params: query,
      });
      return response.data;
    } catch (error) {
      console.error('Error searching doctors:', error);
      throw error;
    }
  },
};
