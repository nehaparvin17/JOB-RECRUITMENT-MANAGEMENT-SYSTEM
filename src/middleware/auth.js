const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'jobhub_production_grade_secret_key_three_role_system_2026_9901888f';

/**
 * Verifies JWT token and loads active user from database
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token required.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    try {
      const user = db.prepare(`
        SELECT id, first_name, last_name, email, role, company_name, phone, location, headline, bio, resume_path, resume_original_name, is_active, created_at
        FROM users
        WHERE id = ?
      `).get(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account not found.'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated by an administrator. Please contact support.'
        });
      }

      req.user = user;
      next();
    } catch (dbErr) {
      console.error('Auth DB error:', dbErr);
      return res.status(500).json({ success: false, message: 'Internal server authentication error' });
    }
  });
}

/**
 * Role-Based Access Control middleware
 * @param  {...string} roles Allowed roles ('USER', 'COMPANY', 'ADMIN')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware: populates req.user if valid token present, otherwise proceeds as guest
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      req.user = null;
      return next();
    }

    try {
      const user = db.prepare(`
        SELECT id, first_name, last_name, email, role, company_name, phone, location, headline, bio, resume_path, resume_original_name, is_active
        FROM users
        WHERE id = ? AND is_active = 1
      `).get(decoded.id);

      req.user = user || null;
      next();
    } catch (e) {
      req.user = null;
      next();
    }
  });
}

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  JWT_SECRET
};
