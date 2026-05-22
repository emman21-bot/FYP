import api from './api';

/**
 * Care Relationship API - Manages doctor-patient relationships
 * Used by both patients and doctors to manage their care relationships
 */
export const careRelationshipAPI = {
  /**
   * Patient sends a care relationship request to a doctor
   * @param {string} doctorId - The ID of the doctor
   * @returns {Promise} Response from server
   */
  sendDoctorRequest: async (doctorId) => {
    const response = await api.post('/care-relationships/request', { doctorId });
    return response.data;
  },

  /**
   * Doctor approves a patient's care relationship request
   * @param {string} relationshipId - The ID of the care relationship
   * @param {string} notes - Optional notes from the doctor
   * @returns {Promise} Response from server
   */
  approvePatientRequest: async (relationshipId, notes = '') => {
    const response = await api.patch(`/care-relationships/${relationshipId}/approve`, { notes });
    return response.data;
  },

  /**
   * Doctor rejects a patient's care relationship request
   * @param {string} relationshipId - The ID of the care relationship
   * @param {string} reason - Reason for rejection
   * @returns {Promise} Response from server
   */
  rejectPatientRequest: async (relationshipId, reason = '') => {
    const response = await api.patch(`/care-relationships/${relationshipId}/reject`, { reason });
    return response.data;
  },

  /**
   * Get all care relationships for the logged-in user
   * - Patients see doctors they're connected to
   * - Doctors see patients connected to them
   * @param {string} status - Optional status filter ('active', 'requested', 'terminated')
   * @returns {Promise} Array of care relationships
   */
  getCareRelationships: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/care-relationships', { params });
    return response.data;
  },

  /**
   * Get doctor's active patients (only for doctors)
   * Retrieves all active care relationships where user is the doctor
   * @returns {Promise} Array of patient objects with relationship info
   */
  getDoctorPatients: async () => {
    try {
      const response = await api.get('/care-relationships', { params: { status: 'active' } });
      // The backend returns care relationships; for doctors, these are their patients
      if (response.data.success) {
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to fetch patients');
    } catch (error) {
      console.error('[CareRelationshipAPI] Error fetching doctor patients:', error.message);
      throw error;
    }
  },

  /**
   * End/terminate a care relationship
   * @param {string} relationshipId - The ID of the care relationship
   * @param {string} reason - Reason for termination
   * @returns {Promise} Response from server
   */
  terminateCareRelationship: async (relationshipId, reason = '') => {
    const response = await api.patch(`/care-relationships/${relationshipId}/end`, { reason });
    return response.data;
  }
};
