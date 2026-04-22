import apiClient from './api';

export const careRelationshipAPI = {
  // Patient sends request to doctor
  sendDoctorRequest: async (doctorId) => {
    const response = await apiClient.post('/care-relationships/request', { doctorId });
    return response.data;
  },

  // Doctor approves patient request
  approvePatientRequest: async (relationshipId, notes = '') => {
    const response = await apiClient.patch(`/care-relationships/${relationshipId}/approve`, { notes });
    return response.data;
  },

  // Doctor rejects patient request
  rejectPatientRequest: async (relationshipId, reason = '') => {
    const response = await apiClient.patch(`/care-relationships/${relationshipId}/reject`, { reason });
    return response.data;
  },

  // Get all care relationships (filtered by role)
  getCareRelationships: async (status = null) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/care-relationships', { params });
    return response.data;
  },

  // End/terminate care relationship
  terminateCareRelationship: async (relationshipId, reason = '') => {
    const response = await apiClient.patch(`/care-relationships/${relationshipId}/end`, { reason });
    return response.data;
  }
};
