/**
 * Centralized API Configuration
 * 
 * This module manages all API endpoints across different environments:
 * - Development (local, Android emulator, iOS simulator)
 * - Ngrok (tunnel for remote testing)
 * - Production
 * 
 * USAGE:
 * 1. In app.json, add extra config to set the environment:
 *    "extra": {
 *      "apiEnv": "development",  // or "ngrok" or "production"
 *      "apiLocalIp": "192.168.1.71",  // Your machine's local IP
 *      "ngrokUrl": "https://xxxx.ngrok-free.dev"  // Your ngrok tunnel URL
 *    }
 * 
 * 2. Or update the DEFAULT values below for quick changes
 */

// ============================================================================
// DEFAULT CONFIGURATION - Update these for your environment
// ============================================================================

const DEFAULT_ENV = 'development'; // 'development' | 'ngrok' | 'production'
const DEFAULT_LOCAL_IP = '192.168.10.6'; // Your local machine IP for development
const DEFAULT_NGROK_URL = 'https://goofy-shingle-unsterile.ngrok-free.dev'; // Your ngrok URL
const DEFAULT_PRODUCTION_URL = 'https://api.dailymed.com'; // Your production URL

// ============================================================================
// Configuration by Environment
// ============================================================================

const getEnvironmentConfig = () => {
  let env = process.env.API_ENV || process.env.EXPO_PUBLIC_API_ENV || DEFAULT_ENV;
  let customBaseUrl = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
  let ngrokUrl = DEFAULT_NGROK_URL;
  let productionUrl = DEFAULT_PRODUCTION_URL;
  let localIp = DEFAULT_LOCAL_IP;

  // Try to get from app.json extra config if available
  try {
    const Constants = require('expo-constants').default;
    if (Constants.expoConfig?.extra) {
      env = Constants.expoConfig.extra.apiEnv || env;
      customBaseUrl = Constants.expoConfig.extra.apiBaseUrl || customBaseUrl;
      ngrokUrl = Constants.expoConfig.extra.ngrokUrl || ngrokUrl;
      productionUrl = Constants.expoConfig.extra.productionUrl || productionUrl;
      localIp = Constants.expoConfig.extra.apiLocalIp || localIp;
    }
  } catch (e) {
    console.log('[API Config] Using default configuration (expo-constants not available)');
  }

  if (customBaseUrl) {
    return {
      baseURL: `${customBaseUrl.replace(/\/+$/, '')}/api`,
      env: 'custom',
      timeout: 15000,
    };
  }

  switch (env) {
    case 'ngrok': {
      return {
        baseURL: `${ngrokUrl.replace(/\/+$/, '')}/api`,
        env: 'ngrok',
        timeout: 15000,
      };
    }

    case 'production': {
      return {
        baseURL: `${productionUrl.replace(/\/+$/, '')}/api`,
        env: 'production',
        timeout: 10000,
      };
    }

    case 'development':
    default: {
      const apiUrl = `http://${localIp}:5000/api`;
      return {
        baseURL: apiUrl,
        env: 'development',
        timeout: 10000,
      };
    }
  }
};

// ============================================================================
// Export Configuration
// ============================================================================

export const apiConfig = getEnvironmentConfig();

/**
 * Get the current API base URL
 * @returns {string} The base URL for API calls
 */
export const getAPIBaseURL = () => {
  return apiConfig.baseURL;
};

/**
 * Get the current environment
 * @returns {string} Current environment: 'development' | 'ngrok' | 'production'
 */
export const getAPIEnvironment = () => {
  return apiConfig.env;
};

/**
 * Get request timeout
 * @returns {number} Timeout in milliseconds
 */
export const getRequestTimeout = () => {
  return apiConfig.timeout;
};

/**
 * Check if running in production
 * @returns {boolean}
 */
export const isProduction = () => {
  return apiConfig.env === 'production';
};

/**
 * Check if running in development
 * @returns {boolean}
 */
export const isDevelopment = () => {
  return apiConfig.env === 'development';
};

/**
 * Log current API configuration (useful for debugging)
 */
export const logAPIConfig = () => {
  console.log(`[API Config] Environment: ${apiConfig.env}`);
  console.log(`[API Config] Base URL: ${apiConfig.baseURL}`);
  console.log(`[API Config] Timeout: ${apiConfig.timeout}ms`);
};

export default apiConfig;
