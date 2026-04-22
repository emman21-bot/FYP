import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: '@dailymed_token',
  USER: '@dailymed_user',
  LOGIN_TIMESTAMP: '@dailymed_login_time',
};

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Save authentication data
 */
export const saveAuthData = async (token, user) => {
  try {
    const timestamp = Date.now().toString();
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, token],
      [STORAGE_KEYS.USER, JSON.stringify(user)],
      [STORAGE_KEYS.LOGIN_TIMESTAMP, timestamp],
    ]);
    return true;
  } catch (error) {
    console.error('Error saving auth data:', error);
    return false;
  }
};

/**
 * Get stored authentication data
 */
export const getAuthData = async () => {
  try {
    const [[, token], [, userStr], [, timestamp]] = await AsyncStorage.multiGet([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.LOGIN_TIMESTAMP,
    ]);

    if (!token || !userStr || !timestamp) {
      return null;
    }

    // Check if session is expired (7 days)
    const loginTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const sessionAge = currentTime - loginTime;

    if (sessionAge > SESSION_DURATION) {
      // Session expired, clear data
      await clearAuthData();
      return null;
    }

    const user = JSON.parse(userStr);
    return { token, user, isValid: true };
  } catch (error) {
    console.error('Error getting auth data:', error);
    return null;
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.LOGIN_TIMESTAMP,
    ]);
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};

/**
 * Check if user session is valid
 */
export const isSessionValid = async () => {
  const authData = await getAuthData();
  return authData !== null && authData.isValid;
};

/**
 * Get stored user data
 */
export const getStoredUser = async () => {
  const authData = await getAuthData();
  return authData?.user || null;
};

/**
 * Get stored token
 */
export const getStoredToken = async () => {
  const authData = await getAuthData();
  return authData?.token || null;
};
