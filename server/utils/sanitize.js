/**
 * Input Sanitization & Security Utilities
 * Protects against NoSQL injection, ReDoS, and malicious parameter tampering.
 */

/**
 * Escapes characters with special meaning in Regular Expressions.
 * @param {string} str - Raw input string
 * @returns {string} - Escaped safe string for RegExp
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Recursively removes keys starting with '$' or containing '.' to prevent NoSQL operator injection.
 * @param {any} target - Target object or array to sanitize
 * @returns {any} - Sanitized object
 */
const sanitizeNoSql = (target) => {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeNoSql(item)).filter((item) => item !== undefined);
  }

  const cleanObj = {};
  for (const [key, value] of Object.entries(target)) {
    // Prohibit keys starting with '$' or containing '.'
    if (!key.startsWith('$') && !key.includes('.')) {
      const sanitizedVal = sanitizeNoSql(value);
      // If object became empty after stripping operators, don't set it if original had operator keys
      if (
        typeof sanitizedVal === 'object' &&
        sanitizedVal !== null &&
        !Array.isArray(sanitizedVal) &&
        Object.keys(sanitizedVal).length === 0 &&
        Object.keys(value).length > 0
      ) {
        continue;
      }
      cleanObj[key] = sanitizedVal;
    }
  }

  return cleanObj;
};

/**
 * Express middleware to sanitize req.body, req.query, and req.params against NoSQL operator injection
 */
const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSql(req.params);
  }
  next();
};

module.exports = {
  escapeRegex,
  sanitizeNoSql,
  mongoSanitizeMiddleware,
};
