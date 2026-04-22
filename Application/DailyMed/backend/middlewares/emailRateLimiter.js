/**
 * Email-based rate limiter middleware
 * Tracks attempts per email address instead of per IP
 */

const rateStore = new Map();

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateStore.entries()) {
    if (now > data.resetTime) {
      rateStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

/**
 * Create email-based rate limiter
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message when limit exceeded
 */
const createEmailRateLimiter = (options) => {
  const { windowMs, max, message } = options;

  return async (req, res, next) => {
    const email = req.body.email;

    if (!email) {
      // If no email in request, allow it (will be caught by validation)
      return next();
    }

    const key = `${req.path}:${email.toLowerCase()}`;
    const now = Date.now();

    // Get or create rate limit data for this email
    let limitData = rateStore.get(key);

    if (!limitData || now > limitData.resetTime) {
      // Create new rate limit window
      limitData = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateStore.set(key, limitData);
    }

    // Increment request count
    limitData.count++;

    // Check if limit exceeded
    if (limitData.count > max) {
      const retryAfter = Math.ceil((limitData.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.',
        retryAfter,
      });
    }

    next();
  };
};

// Email-based rate limiters for authentication
const emailAuthLimiter = createEmailRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per email per 15 minutes
  message: 'Too many attempts with this email. Please try again after 15 minutes.',
});

const emailOtpLimiter = createEmailRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP requests per email per minute
  message: 'Too many OTP requests for this email. Please wait a minute.',
});

const emailPasswordResetLimiter = createEmailRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per email per hour
  message: 'Too many password reset attempts. Please try again after an hour.',
});

module.exports = {
  emailAuthLimiter,
  emailOtpLimiter,
  emailPasswordResetLimiter,
};
