/**
 * API Error Handling & Retry Utilities
 * Production-ready error handling, logging, and retry logic for API calls
 * 
 * Features:
 * - Automatic retry on transient failures
 * - Exponential backoff
 * - Error categorization and logging
 * - Request/response logging (dev only)
 * - Performance metrics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Error Categories
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Determine error type based on error object
 */
export const getErrorType = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;

  // Network errors
  if (error.message === 'Network Error' || error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') {
    return ErrorTypes.NETWORK;
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return ErrorTypes.TIMEOUT;
  }

  // HTTP status codes
  const status = error.response?.status;
  if (status === 401 || status === 403) {
    return ErrorTypes.AUTH;
  }

  if (status >= 400 && status < 500 && status !== 401 && status !== 403) {
    return ErrorTypes.VALIDATION;
  }

  if (status >= 500) {
    return ErrorTypes.SERVER;
  }

  return ErrorTypes.UNKNOWN;
};

/**
 * Get human-readable error message
 */
export const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
  if (!error) return defaultMessage;

  // Try to get message from response data first
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for validation errors
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[0].message || errors[0];
    }
  }

  // Check for axios error message
  if (error.message) {
    return error.message;
  }

  return defaultMessage;
};

/**
 * Retry Configuration
 */
export const RetryConfig = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
  // Errors that should NOT be retried
  NON_RETRYABLE_STATUSES: [400, 401, 403, 404, 422],
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  const errorType = getErrorType(error);
  
  // Only retry network, timeout, and server errors
  if (![ErrorTypes.NETWORK, ErrorTypes.TIMEOUT, ErrorTypes.SERVER].includes(errorType)) {
    return false;
  }

  // Don't retry certain HTTP statuses
  const status = error.response?.status;
  if (status && RetryConfig.NON_RETRYABLE_STATUSES.includes(status)) {
    return false;
  }

  return true;
};

/**
 * Calculate exponential backoff delay
 */
export const calculateBackoffDelay = (attempt) => {
  const delay = RetryConfig.INITIAL_DELAY * Math.pow(RetryConfig.BACKOFF_MULTIPLIER, attempt - 1);
  return Math.min(delay, RetryConfig.MAX_DELAY) + Math.random() * 1000;
};

/**
 * Sleep utility for delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry wrapper for axios calls
 * Automatically retries failed requests with exponential backoff
 * 
 * @param {function} requestFn - Async function that makes the API call
 * @param {object} options - Retry options
 * @returns {Promise} Result from requestFn
 */
export const withRetry = async (requestFn, options = {}) => {
  const {
    maxRetries = RetryConfig.MAX_RETRIES,
    onRetry = null,
    description = 'API call',
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt > maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay and log
      const delay = calculateBackoffDelay(attempt);
      const errorType = getErrorType(error);

      console.warn(
        `[API Retry] ${description} failed (${errorType}). Attempt ${attempt}/${maxRetries}. ` +
        `Retrying in ${Math.round(delay)}ms`
      );

      // Call onRetry callback if provided
      if (onRetry) {
        try {
          await onRetry({ attempt, delay, error });
        } catch (e) {
          console.error('[API Retry] onRetry callback error:', e);
        }
      }

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * API Request Logger
 * Logs requests and responses (development only)
 */
export class APILogger {
  static isEnabled = false; // Set to true to enable logging

  static setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  static logRequest(config) {
    if (!this.isEnabled) return;

    const { method, url, data, headers } = config;
    console.log('[API Request]', {
      method: method?.toUpperCase(),
      url,
      body: data ? JSON.parse(data) : null,
      timestamp: new Date().toISOString(),
    });
  }

  static logResponse(response) {
    if (!this.isEnabled) return;

    const { status, statusText, config, data } = response;
    console.log('[API Response]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      status: `${status} ${statusText}`,
      responseTime: `${performance.now()}ms`,
      data: data?.success !== false ? '[Success]' : data,
      timestamp: new Date().toISOString(),
    });
  }

  static logError(error) {
    if (!this.isEnabled) return;

    const { config, response } = error;
    console.error('[API Error]', {
      method: config?.method?.toUpperCase(),
      url: config?.url,
      status: response?.status,
      errorType: getErrorType(error),
      message: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Input Validation Helpers
 */
export const Validators = {
  /**
   * Validate email format
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  isValidPassword: (password) => {
    // At least 8 characters, 1 uppercase, 1 number
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  },

  /**
   * Validate phone number (basic)
   */
  isValidPhone: (phone) => {
    const phoneRegex = /^\d{10,}$/;
    return phoneRegex.test(phone?.replace(/\D/g, ''));
  },

  /**
   * Validate required field
   */
  isRequired: (value) => {
    return value !== null && value !== undefined && value !== '';
  },

  /**
   * Validate number range
   */
  inRange: (value, min, max) => {
    return value >= min && value <= max;
  },
};

/**
 * Request Debouncer
 * Prevents duplicate requests within a time window
 */
export class RequestDebouncer {
  constructor(delayMs = 500) {
    this.delayMs = delayMs;
    this.pendingRequests = new Map();
  }

  /**
   * Execute function with debouncing
   * If called multiple times within delayMs, only last call is executed
   */
  async debounce(key, fn) {
    // Clear previous timer if exists
    if (this.pendingRequests.has(key)) {
      clearTimeout(this.pendingRequests.get(key));
    }

    return new Promise((resolve, reject) => {
      const timerId = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.pendingRequests.delete(key);
        }
      }, this.delayMs);

      this.pendingRequests.set(key, timerId);
    });
  }

  /**
   * Cancel pending request
   */
  cancel(key) {
    if (this.pendingRequests.has(key)) {
      clearTimeout(this.pendingRequests.get(key));
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll() {
    this.pendingRequests.forEach((timerId) => clearTimeout(timerId));
    this.pendingRequests.clear();
  }
}

/**
 * Request Throttler
 * Ensures minimum time between identical requests
 */
export class RequestThrottler {
  constructor(delayMs = 1000) {
    this.delayMs = delayMs;
    this.lastExecutionTime = new Map();
  }

  /**
   * Execute function with throttling
   * If called before delayMs has passed since last execution, returns cached result
   */
  async throttle(key, fn, useCached = true) {
    const now = Date.now();
    const lastExecution = this.lastExecutionTime.get(key) || { time: 0 };

    if (now - lastExecution.time < this.delayMs) {
      if (useCached && lastExecution.result !== undefined) {
        console.log(`[Throttle] Using cached result for ${key}`);
        return lastExecution.result;
      }

      const waitTime = this.delayMs - (now - lastExecution.time);
      console.log(`[Throttle] Rate limited for ${key}. Wait ${waitTime}ms`);
      await sleep(waitTime);
    }

    try {
      const result = await fn();
      this.lastExecutionTime.set(key, { time: Date.now(), result });
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset throttle for a key
   */
  reset(key) {
    this.lastExecutionTime.delete(key);
  }

  /**
   * Reset all throttles
   */
  resetAll() {
    this.lastExecutionTime.clear();
  }
}

/**
 * Performance Monitor
 * Tracks API performance metrics
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Record API call duration
   */
  recordAPICall(endpoint, durationMs, success = true) {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }

    this.metrics.get(endpoint).push({
      duration: durationMs,
      success,
      timestamp: Date.now(),
    });

    // Keep only last 100 calls per endpoint
    if (this.metrics.get(endpoint).length > 100) {
      this.metrics.get(endpoint).shift();
    }
  }

  /**
   * Get average duration for endpoint
   */
  getAverageDuration(endpoint) {
    const calls = this.metrics.get(endpoint) || [];
    if (calls.length === 0) return 0;
    const sum = calls.reduce((acc, call) => acc + call.duration, 0);
    return sum / calls.length;
  }

  /**
   * Get success rate for endpoint
   */
  getSuccessRate(endpoint) {
    const calls = this.metrics.get(endpoint) || [];
    if (calls.length === 0) return 100;
    const successCount = calls.filter((call) => call.success).length;
    return (successCount / calls.length) * 100;
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary = {};
    this.metrics.forEach((calls, endpoint) => {
      summary[endpoint] = {
        totalCalls: calls.length,
        avgDuration: this.getAverageDuration(endpoint),
        successRate: this.getSuccessRate(endpoint),
      };
    });
    return summary;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }
}

export default {
  getErrorType,
  getErrorMessage,
  isRetryableError,
  calculateBackoffDelay,
  withRetry,
  APILogger,
  Validators,
  RequestDebouncer,
  RequestThrottler,
  PerformanceMonitor,
};
