import axios from 'axios';
import { getStoredToken, saveAuthData, clearAuthData } from '../utils/authStorage';
import { getAPIBaseURL, getRequestTimeout, logAPIConfig } from '../config/api';

/**
 * Initialize and configure the main axios instance
 * Uses centralized API configuration for environment management
 */
const createAPIClient = () => {
  const api = axios.create({
    baseURL: getAPIBaseURL(),
    timeout: getRequestTimeout(),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Log configuration on app startup (development only)
  try {
    if (__DEV__) {
      logAPIConfig();
    }
  } catch (e) {
    // __DEV__ not available, skip logging
  }

  return api;
};

const api = createAPIClient();

/**
 * Request interceptor: Adds JWT token to all requests
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[API] Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handles errors and invalid tokens
 * - 401: Invalid/expired token - clears auth data
 * - 5xx: Server errors - logs for debugging
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      try {
        await clearAuthData();
      } catch (e) {
        console.error('[API] Error clearing auth data:', e);
      }
    }

    // Log server errors for debugging (development only)
    if (error.response?.status >= 500) {
      console.error('[API] Server error:', error.response?.status, error.response?.data);
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    if (response.data.success && response.data.data.token) {
      // Save token and user data with timestamp
      await saveAuthData(response.data.data.token, response.data.data.user);
    }
    return response.data;
  },

  // Resend OTP
  resendOTP: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success && response.data.data.token) {
      // Save token and user data with timestamp
      await saveAuthData(response.data.data.token, response.data.data.user);
    }
    return response.data;
  },

  // Get current user
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    // Clear all auth data
    await clearAuthData();
    return response.data;
  },

  // Forgot Password - Request OTP
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Verify Reset OTP (for password reset flow)
  verifyResetOTP: async (email, otp) => {
    const response = await api.post('/auth/verify-reset-otp', { email, otp });
    return response.data;
  },

  // Reset Password
  resetPassword: async (email, password) => {
    const response = await api.post('/auth/reset-password', { email, password });
    return response.data;
  },
};

// User Profile API endpoints
export const userProfileAPI = {
  // Get user profile/settings
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  // Update profile information
  updateProfile: async (profileData) => {
    const response = await api.put('/user/profile', profileData);
    return response.data;
  },

  // Update medical information
  updateMedicalInfo: async (medicalData) => {
    const response = await api.put('/user/medical', medicalData);
    return response.data;
  },

  // Update notification preferences
  updateNotificationPreferences: async (notificationData) => {
    const response = await api.put('/user/notifications', notificationData);
    return response.data;
  },
};

// Health Data API endpoints
export const healthDataAPI = {
  // Add new health data reading
  addHealthData: async (healthData) => {
    const response = await api.post('/health-data', healthData);
    return response.data;
  },

  // Get health data with pagination
  getHealthData: async (page = 1, limit = 10) => {
    const response = await api.get(`/health-data?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get single health data entry
  getHealthDataById: async (id) => {
    const response = await api.get(`/health-data/${id}`);
    return response.data;
  },

  // Update health data entry
  updateHealthData: async (id, healthData) => {
    const response = await api.put(`/health-data/${id}`, healthData);
    return response.data;
  },

  // Delete health data entry
  deleteHealthData: async (id) => {
    const response = await api.delete(`/health-data/${id}`);
    return response.data;
  },

  // Get health data statistics
  getHealthDataStats: async (days = 30) => {
    const response = await api.get(`/health-data/stats?days=${days}`);
    return response.data;
  },
};

// Analytics API endpoints
export const analyticsAPI = {
  // Get patient analytics for doctor (trends + predictions)
  getPatientAnalyticsForDoctor: async (patientEmail) => {
    const response = await api.get(`/analytics/patient/${encodeURIComponent(patientEmail)}`);
    return response.data;
  },
};

// Admin API endpoints
export const adminAPI = {
  // Get all users with filters and pagination
  getAllUsers: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/admin/users?${params}`);
    return response.data;
  },

  // Get single user by ID
  getUserById: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  // Update user account status and/or verification status
  updateUserStatus: async (userId, accountStatus, isVerified) => {
    const payload = {};
    if (accountStatus !== undefined && accountStatus !== null) {
      payload.accountStatus = accountStatus;
    }
    if (isVerified !== undefined && isVerified !== null) {
      payload.isVerified = isVerified;
    }
    const response = await api.put(`/admin/users/${userId}/status`, payload);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Get user statistics
  getUserStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },
};

// Medications API endpoints
export const medicationsAPI = {
  // Add new medication
  addMedication: async (medicationData) => {
    const response = await api.post('/medications', medicationData);
    return response.data;
  },

  // Get all medications for logged-in user
  getMedications: async () => {
    const response = await api.get('/medications');
    return response.data;
  },

  // Update medication
  updateMedication: async (id, medicationData) => {
    const response = await api.put(`/medications/${id}`, medicationData);
    return response.data;
  },

  // Update medication status only
  updateMedicationStatus: async (id, status) => {
    const response = await api.patch(`/medications/${id}/status`, { status });
    return response.data;
  },

  // Delete medication
  deleteMedication: async (id) => {
    const response = await api.delete(`/medications/${id}`);
    return response.data;
  },
};

// Notification API endpoints
export const notificationAPI = {
  /**
   * Save push notification token to backend
   * Should be called after obtaining Expo push token
   * @param {string} token - Expo push notification token
   */
  saveNotificationToken: async (token) => {
    const response = await api.post('/notifications/token', { token });
    return response.data;
  },

  /**
   * Get all notifications for current user
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   */
  getNotifications: async (page = 1, limit = 10) => {
    const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - ID of notification
   */
  markAsRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Delete a notification
   * @param {string} notificationId - ID of notification
   */
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Update notification preferences
   * @param {object} preferences - Notification preferences
   */
  updatePreferences: async (preferences) => {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data;
  },
};

// Storage helpers
export const storage = {
  getToken: async () => {
    return await AsyncStorage.getItem('token');
  },

  getUser: async () => {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  clear: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
};

export default api;
