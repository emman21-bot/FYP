/**
 * Middleware to sanitize user inputs and prevent NoSQL injection
 * Removes any MongoDB operators from user input
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        // Remove keys that start with $ (MongoDB operators)
        if (key.startsWith('$')) {
          delete obj[key];
        } 
        // Recursively sanitize nested objects
        else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    }
    return obj;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

module.exports = sanitizeInput;
