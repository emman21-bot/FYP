import api from './api';

export const healthDataAPI = {
  // Get health data for a user
  getHealthData: async (userEmail) => {
    try {
      const response = await api.get('/health-data', {
        params: { userEmail },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching health data:', error);
      throw error;
    }
  },

  // Get patient health data (for doctors) - NEW
  getPatientHealthDataForDoctor: async (patientEmail) => {
    try {
      const response = await api.get(`/health-data/patient/${encodeURIComponent(patientEmail)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient health data:', error);
      throw error;
    }
  },

  // Add new health data entry
  addHealthData: async (healthData) => {
    try {
      const response = await api.post('/health-data', healthData);
      return response.data;
    } catch (error) {
      console.error('Error adding health data:', error);
      throw error;
    }
  },

  // Get health data by type
  getHealthDataByType: async (userEmail, type) => {
    try {
      const response = await api.get('/health-data/type', {
        params: { userEmail, type },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching health data by type:', error);
      throw error;
    }
  },

  // Get health data for date range
  getHealthDataByDateRange: async (userEmail, startDate, endDate) => {
    try {
      const response = await api.get('/health-data/range', {
        params: { userEmail, startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching health data by date range:', error);
      throw error;
    }
  },

  // Delete health data entry
  deleteHealthData: async (entryId) => {
    try {
      const response = await api.delete(`/health-data/${entryId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting health data:', error);
      throw error;
    }
  },

  // Update health data entry
  updateHealthData: async (entryId, healthData) => {
    try {
      const response = await api.put(`/health-data/${entryId}`, healthData);
      return response.data;
    } catch (error) {
      console.error('Error updating health data:', error);
      throw error;
    }
  },
};
