const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { uploadResume } = require('../middleware/upload');

/**
 * GET /api/user/dashboard
 * Candidate stats, application breakdown, recent applications, and trend data
 */
router.get('/dashboard', authenticateToken, requireRole('USER'), (req, res) => {
  try {
    const userId = req.user.id;

    // Total Applications
    const totalApplications = db.prepare('SELECT COUNT(*) as count FROM applications WHERE user_id = ?').get(userId).count;

    // In Review / Applied
    const inReview = db.prepare("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status IN ('Applied', 'In Review')").get(userId).count;

    // Interviews
    const interviews = db.prepare("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status = 'Interview'").get(userId).count;

    // Rejected
    const rejected = db.prepare("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status = 'Rejected'").get(userId).count;

    // Recent applications
    const recentApplications = db.prepare(`
      SELECT a.id, j.title as job_title, j.company_name, a.applied_date, a.status
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = ?
      ORDER BY a.id DESC
      LIMIT 5
    `).all(userId);

    return res.json({
      success: true,
      stats: {
        totalApplications,
        inReview,
        interviews,
        rejected
      },
      recentApplications
    });
  } catch (error) {
    console.error('Candidate dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load candidate dashboard' });
  }
});

/**
 * GET /api/user/profile
 */
router.get('/profile', authenticateToken, requireRole('USER'), (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/user/profile
 */
router.put('/profile', authenticateToken, requireRole('USER'), (req, res) => {
  try {
    const { first_name, last_name, phone, location, headline, bio } = req.body;

    const update = db.prepare(`
      UPDATE users SET
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
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      phone ? phone.trim() : null,
      location ? location.trim() : null,
      headline ? headline.trim() : null,
      bio ? bio.trim() : null,
      req.user.id
    );

    const updated = db.prepare(`
      SELECT id, first_name, last_name, email, role, phone, location, headline, bio, resume_path, resume_original_name, is_active
      FROM users WHERE id = ?
    `).get(req.user.id);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

/**
 * POST /api/user/resume
 * Candidate uploads/updates default profile resume
 */
router.post('/resume', authenticateToken, requireRole('USER'), (req, res) => {
  uploadResume.single('resume')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a resume file (PDF, DOC, DOCX).' });
    }

    try {
      db.prepare(`
        UPDATE users SET
          resume_path = ?,
          resume_original_name = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.file.filename, req.file.originalname, req.user.id);

      return res.json({
        success: true,
        message: 'Resume uploaded successfully.',
        resume_name: req.file.originalname
      });
    } catch (error) {
      console.error('Profile resume upload error:', error);
      return res.status(500).json({ success: false, message: 'Failed to save resume.' });
    }
  });
});

/**
 * GET /api/user/resume
 * Candidate downloads their own saved profile resume
 */
router.get('/resume', authenticateToken, requireRole('USER'), (req, res) => {
  try {
    if (!req.user.resume_path) {
      return res.status(404).json({ success: false, message: 'No resume uploaded yet.' });
    }

    const filePath = path.join(__dirname, '../../uploads/resumes', req.user.resume_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file not found on server.' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${req.user.resume_original_name || 'Resume.pdf'}"`);
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load resume.' });
  }
});

module.exports = router;
