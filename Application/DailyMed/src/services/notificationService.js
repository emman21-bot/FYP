/**
 * Expo Push Notification Service
 * Manages all push notification functionality for DailyMed
 * 
 * Handles:
 * - Permission requests
 * - Token management
 * - Notification listeners
 * - Local notifications (for dev/testing)
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Configure how notifications appear in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Notification Service
 * Centralized notification management
 */
export class NotificationService {
  /**
   * Request notification permissions
   * @returns {Promise<boolean>} True if permissions granted
   */
  static async requestPermissions() {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('[Notifications] Push notifications not supported on simulator/emulator');
        return false;
      }

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted:', finalStatus);
        return false;
      }

      console.log('[Notifications] Permissions granted successfully');
      return true;
    } catch (error) {
      console.error('[Notifications] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Get notification token for push notifications
   * Store this on the backend to send notifications to this device
   * @returns {Promise<string|null>} Notification token or null if unavailable
   */
  static async getNotificationToken() {
    try {
      // Check if already cached
      const cachedToken = await AsyncStorage.getItem('@dailymed_notification_token');
      if (cachedToken) {
        return cachedToken;
      }

      // Get Expo push token
      const projectId = require('expo-constants').default.expoConfig?.extra?.projectId ||
                       require('expo-constants').default.expoConfig?.projectId;

      if (!projectId) {
        console.warn('[Notifications] Project ID not found in app.json');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // Cache the token
      if (token) {
        await AsyncStorage.setItem('@dailymed_notification_token', token);
        console.log('[Notifications] Token obtained and cached:', token.substring(0, 20) + '...');
      }

      return token;
    } catch (error) {
      console.error('[Notifications] Error getting token:', error);
      return null;
    }
  }

  /**
   * Save notification token to backend
   * @param {string} token - The notification token
   * @param {function} api - API function to save token
   * @returns {Promise<boolean>} Success status
   */
  static async saveTokenToBackend(token, api) {
    try {
      if (!token || !api) {
        console.warn('[Notifications] Token or API function missing');
        return false;
      }

      // Call backend API to save token
      const response = await api(token);

      if (response.success) {
        console.log('[Notifications] Token saved to backend successfully');
        return true;
      } else {
        console.warn('[Notifications] Backend failed to save token:', response.message);
        return false;
      }
    } catch (error) {
      console.error('[Notifications] Error saving token to backend:', error);
      return false;
    }
  }

  /**
   * Listen for incoming notifications
   * Setup foreground notification handler
   * @param {function} onNotification - Callback when notification received
   * @returns {function} Unsubscribe function
   */
  static listenForNotifications(onNotification) {
    try {
      // Listen for notifications received in foreground
      const subscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[Notifications] Notification received:', notification);

        // Extract notification data
        const { title, body } = notification.request.content;
        const data = notification.request.content.data;

        if (onNotification) {
          onNotification({
            title,
            body,
            data,
            type: data?.type || 'general',
          });
        }
      });

      return subscription;
    } catch (error) {
      console.error('[Notifications] Error setting up listener:', error);
      return null;
    }
  }

  /**
   * Listen for notification responses (when user taps notification)
   * @param {function} onResponse - Callback when notification tapped
   * @returns {function} Unsubscribe function
   */
  static listenForNotificationResponses(onResponse) {
    try {
      // Listen for notification taps/interactions
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const { title, body } = response.notification.request.content;
        const data = response.notification.request.content.data;

        console.log('[Notifications] User tapped notification:', data);

        if (onResponse) {
          onResponse({
            title,
            body,
            data,
            type: data?.type || 'general',
          });
        }
      });

      return subscription;
    } catch (error) {
      console.error('[Notifications] Error setting up response listener:', error);
      return null;
    }
  }

  /**
   * Send a local notification (for testing/development)
   * @param {object} options - Notification options
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body/message
   * @param {number} options.delay - Delay in milliseconds (default: 1000)
   * @param {object} options.data - Custom data to attach
   */
  static async sendLocalNotification(options = {}) {
    try {
      const { title = 'Test', body = 'Test notification', delay = 1000, data = {} } = options;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: 'high',
          data,
        },
        trigger: { seconds: delay / 1000 },
      });

      console.log('[Notifications] Local notification scheduled');
    } catch (error) {
      console.error('[Notifications] Error sending local notification:', error);
    }
  }

  /**
   * Initialize notification system
   * Call this in App.js on startup
   * @returns {Promise<object>} Initialization status
   */
  static async initialize() {
    try {
      console.log('[Notifications] Initializing...');

      // Request permissions
      const permissionGranted = await this.requestPermissions();

      if (!permissionGranted) {
        console.warn('[Notifications] Permissions not granted');
        return { success: false, message: 'Permissions denied' };
      }

      // Get token
      const token = await this.getNotificationToken();

      if (!token) {
        console.warn('[Notifications] Could not obtain token');
        return { success: false, message: 'Token unavailable' };
      }

      console.log('[Notifications] Initialization complete');
      return { success: true, token };
    } catch (error) {
      console.error('[Notifications] Initialization error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Cleanup notification listeners
   * Call this in cleanup code
   * @param {function} subscription - Subscription to remove
   */
  static removeListener(subscription) {
    try {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
        console.log('[Notifications] Listener removed');
      }
    } catch (error) {
      console.error('[Notifications] Error removing listener:', error);
    }
  }
}

/**
 * Notification Types & Templates
 * Used by backend to send appropriate notifications
 */
export const notificationTypes = {
  MEDICATION_REMINDER: {
    title: '💊 Medication Reminder',
    template: 'medicationReminder',
  },
  APPOINTMENT_REMINDER: {
    title: '📅 Appointment Reminder',
    template: 'appointmentReminder',
  },
  ABNORMAL_VITALS: {
    title: '⚠️ Abnormal Vitals Alert',
    template: 'abnormalVitals',
  },
  DOCTOR_REQUEST: {
    title: '👨‍⚕️ Doctor Request',
    template: 'doctorRequest',
  },
  APPOINTMENT_CONFIRMATION: {
    title: '✓ Appointment Confirmed',
    template: 'appointmentConfirmation',
  },
  TEST_RESULT: {
    title: '🩺 Test Results',
    template: 'testResult',
  },
  GENERAL: {
    title: 'DailyMed',
    template: 'general',
  },
};

export default NotificationService;
