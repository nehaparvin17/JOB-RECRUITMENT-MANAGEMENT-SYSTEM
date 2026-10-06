const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Candidate or Employer registration
 */
router.post('/register', (req, res) => {
  try {
    const { first_name, last_name, email, password, role, company_name } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Role mapping: "Candidate" -> 'USER', "Employer" -> 'COMPANY'
    let assignedRole = 'USER';
    if (role === 'Employer' || role === 'COMPANY') {
      assignedRole = 'COMPANY';
    } else if (role === 'Candidate' || role === 'USER') {
      assignedRole = 'USER';
    } else {
      assignedRole = 'USER';
    }

    // Check if email already registered
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const assignedCompany = assignedRole === 'COMPANY' ? (company_name || `${first_name}'s Organization`) : null;

    const insert = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, company_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const result = insert.run(
      first_name.trim(),
      last_name.trim(),
      email.trim(),
      password_hash,
      assignedRole,
      assignedCompany
    );

    const newUserId = Number(result.lastInsertRowid);

    const token = jwt.sign(
      { id: newUserId, email: email.trim(), role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const user = {
      id: newUserId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim(),
      role: assignedRole,
      company_name: assignedCompany,
      is_active: 1
    };

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.'
    });
  }
});

/**
 * POST /api/auth/login
 * User login for all roles (USER, COMPANY, ADMIN)
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const user = db.prepare(`
      SELECT id, first_name, last_name, email, password_hash, role, company_name, phone, location, headline, bio, resume_path, resume_original_name, is_active
      FROM users
      WHERE email = ?
    `).get(email.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated by an administrator. Please contact support.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password_hash before returning
    delete user.password_hash;

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user details
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
