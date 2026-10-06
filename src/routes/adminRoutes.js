const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes in this router require ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

/**
 * GET /api/admin/stats
 * Platform wide statistics
 */
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalCandidates = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'USER'").get().count;
    const totalCompanies = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'COMPANY'").get().count;
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    const activeJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'Active'").get().count;
    const totalApplications = db.prepare('SELECT COUNT(*) as count FROM applications').get().count;
    const activeAccounts = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    const disabledAccounts = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 0').get().count;

    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count FROM applications GROUP BY status
    `).all();

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalCandidates,
        totalCompanies,
        totalJobs,
        activeJobs,
        totalApplications,
        activeAccounts,
        disabledAccounts,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
});

/**
 * GET /api/admin/users
 * List all users with optional role and search filter
 */
router.get('/users', (req, res) => {
  try {
    const { role, search } = req.query;

    let query = `
      SELECT id, first_name, last_name, email, role, company_name, phone, location, is_active, created_at,
             (SELECT COUNT(*) FROM jobs WHERE company_id = users.id) as jobs_count,
             (SELECT COUNT(*) FROM applications WHERE user_id = users.id) as applications_count
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'All') {
      query += ` AND role = ?`;
      params.push(role);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company_name LIKE ?)`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY id DESC`;

    const users = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list users' });
  }
});

/**
 * POST /api/admin/users
 * Admin creates user of any role
 */
router.post('/users', (req, res) => {
  try {
    const { first_name, last_name, email, password, role, company_name, phone, location } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, password, and role are required.'
      });
    }

    const validRoles = ['USER', 'COMPANY', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email address already in use.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const insert = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role, company_name, phone, location, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = insert.run(
      first_name.trim(),
      last_name.trim(),
      email.trim(),
      passwordHash,
      role,
      role === 'COMPANY' ? (company_name || `${first_name}'s Org`) : (company_name || null),
      phone ? phone.trim() : null,
      location ? location.trim() : null
    );

    const newUser = db.prepare(`
      SELECT id, first_name, last_name, email, role, company_name, phone, location, is_active, created_at
      FROM users WHERE id = ?
    `).get(Number(result.lastInsertRowid));

    return res.status(201).json({
      success: true,
      message: `User created with role ${role}.`,
      user: newUser
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Edit user information and role
 */
router.put('/users/:id', (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { first_name, last_name, email, role, company_name, phone, location, password } = req.body;

    let passwordHash = user.password_hash;
    if (password && password.trim().length >= 6) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    const update = db.prepare(`
      UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        company_name = COALESCE(?, company_name),
        phone = COALESCE(?, phone),
        location = COALESCE(?, location),
        password_hash = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      email ? email.trim() : null,
      role ? role : null,
      company_name !== undefined ? company_name : null,
      phone !== undefined ? phone : null,
      location !== undefined ? location : null,
      passwordHash,
      userId
    );

    const updatedUser = db.prepare(`
      SELECT id, first_name, last_name, email, role, company_name, phone, location, is_active, created_at
      FROM users WHERE id = ?
    `).get(userId);

    return res.json({
      success: true,
      message: 'User updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Admin edit user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Toggle enable/disable account
 */
router.patch('/users/:id/status', (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own admin account.' });
    }

    const user = db.prepare('SELECT id, is_active, first_name, last_name FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = user.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, userId);

    return res.json({
      success: true,
      message: `User account has been ${newStatus === 1 ? 'activated' : 'deactivated'}.`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user or company
 */
router.delete('/users/:id', (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return res.json({
      success: true,
      message: 'Account and associated records deleted successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

/**
 * GET /api/admin/jobs
 * List all jobs across platform
 */
router.get('/jobs', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*,
             u.email as company_email,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      ORDER BY j.id DESC
    `).all();

    return res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error('Admin list jobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list jobs' });
  }
});

/**
 * GET /api/admin/applications
 * List all applications across platform
 */
router.get('/applications', (req, res) => {
  try {
    const applications = db.prepare(`
      SELECT a.*,
             j.title as job_title,
             j.company_name,
             u.email as candidate_email,
             c.email as company_email
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      JOIN users c ON a.company_id = c.id
      ORDER BY a.id DESC
    `).all();

    return res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Admin list applications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list applications' });
  }
});

module.exports = router;
