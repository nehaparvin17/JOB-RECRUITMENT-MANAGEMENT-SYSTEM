const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/company/dashboard
 * Summary stats and recent applications for Recruiter Dashboard
 */
router.get('/dashboard', authenticateToken, requireRole('COMPANY'), (req, res) => {
  try {
    const companyId = req.user.id;

    // Total jobs posted by this company
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE company_id = ?').get(companyId).count;

    // Total applications received
    const totalApplications = db.prepare('SELECT COUNT(*) as count FROM applications WHERE company_id = ?').get(companyId).count;

    // Interviews count
    const interviewsCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE company_id = ? AND status = 'Interview'").get(companyId).count;

    // Hired count
    const hiredCount = db.prepare("SELECT COUNT(*) as count FROM applications WHERE company_id = ? AND status = 'Hired'").get(companyId).count;

    // Recent applications
    const recentApplications = db.prepare(`
      SELECT a.id, a.full_name as candidate, j.title as job_title, a.applied_date, a.status, a.resume_original_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.company_id = ?
      ORDER BY a.id DESC
      LIMIT 6
    `).all(companyId);

    return res.json({
      success: true,
      stats: {
        totalJobs,
        totalApplications,
        interviewsCount,
        hiredCount
      },
      recentApplications
    });
  } catch (error) {
    console.error('Company dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load company dashboard' });
  }
});

/**
 * GET /api/company/jobs
 * List of jobs posted by this company for "Manage Jobs" page
 */
router.get('/jobs', authenticateToken, requireRole('COMPANY'), (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applications_count
      FROM jobs j
      WHERE j.company_id = ?
      ORDER BY j.id DESC
    `).all(req.user.id);

    return res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Company jobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load company jobs' });
  }
});

/**
 * GET /api/company/profile
 */
router.get('/profile', authenticateToken, requireRole('COMPANY'), (req, res) => {
  return res.json({
    success: true,
    company: req.user
  });
});

/**
 * PUT /api/company/profile
 */
router.put('/profile', authenticateToken, requireRole('COMPANY'), (req, res) => {
  try {
    const { company_name, first_name, last_name, phone, location, headline, bio } = req.body;

    const update = db.prepare(`
      UPDATE users SET
        company_name = COALESCE(?, company_name),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        location = COALESCE(?, location),
        headline = COALESCE(?, headline),
        bio = COALESCE(?, bio),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      company_name ? company_name.trim() : null,
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      phone ? phone.trim() : null,
      location ? location.trim() : null,
      headline ? headline.trim() : null,
      bio ? bio.trim() : null,
      req.user.id
    );

    const updated = db.prepare(`
      SELECT id, first_name, last_name, email, role, company_name, phone, location, headline, bio, is_active
      FROM users WHERE id = ?
    `).get(req.user.id);

    return res.json({
      success: true,
      message: 'Company profile updated successfully.',
      company: updated
    });
  } catch (error) {
    console.error('Update company profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update company profile.' });
  }
});

module.exports = router;
