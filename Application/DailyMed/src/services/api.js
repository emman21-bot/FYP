import axios from 'axios';
import { getStoredToken, saveAuthData, clearAuthData } from '../utils/authStorage';

// Base API URL - Update this with your backend server URL
// For local development on physical device, use your computer's IP address
// For Android emulator, use 10.0.2.2
// For iOS simulator, use localhost
const API_BASE_URL = 'http://192.168.1.71:5000/api'; // Change this based on your setup

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await clearAuthData();
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
    console.log('API updateUserStatus called with:', { userId, accountStatus, isVerified, payload });
    const response = await api.put(`/admin/users/${userId}/status`, payload);
    console.log('API updateUserStatus response:', response.data);
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
