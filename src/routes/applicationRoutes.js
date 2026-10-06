const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { uploadResume } = require('../middleware/upload');

/**
 * POST /api/applications
 * Candidate applies for a job
 */
router.post('/', authenticateToken, requireRole('USER'), (req, res) => {
  uploadResume.single('resume')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    try {
      const { job_id, full_name, email, phone, cover_letter, use_saved_resume } = req.body;

      if (!job_id) {
        return res.status(400).json({ success: false, message: 'Job ID is required.' });
      }

      const job = db.prepare('SELECT id, company_id, title, status FROM jobs WHERE id = ?').get(Number(job_id));
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job posting not found.' });
      }

      if (job.status !== 'Active') {
        return res.status(400).json({ success: false, message: 'This job posting is no longer active.' });
      }

      // Check if already applied
      const existing = db.prepare('SELECT id FROM applications WHERE job_id = ? AND user_id = ?').get(job.id, req.user.id);
      if (existing) {
        return res.status(409).json({ success: false, message: 'You have already applied for this job.' });
      }

      let resumePath = null;
      let resumeOriginalName = null;

      if (req.file) {
        resumePath = req.file.filename;
        resumeOriginalName = req.file.originalname;

        // Optionally update candidate's profile default resume if they don't have one
        if (!req.user.resume_path) {
          db.prepare('UPDATE users SET resume_path = ?, resume_original_name = ? WHERE id = ?')
            .run(resumePath, resumeOriginalName, req.user.id);
        }
      } else if (use_saved_resume === 'true' && req.user.resume_path) {
        resumePath = req.user.resume_path;
        resumeOriginalName = req.user.resume_original_name || 'Resume.pdf';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please upload your CV/Resume (PDF, DOC, DOCX) to apply.'
        });
      }

      const applicantName = full_name ? full_name.trim() : `${req.user.first_name} ${req.user.last_name}`;
      const applicantEmail = email ? email.trim() : req.user.email;
      const applicantPhone = phone ? phone.trim() : (req.user.phone || '');
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const insert = db.prepare(`
        INSERT INTO applications (
          job_id, user_id, company_id, full_name, email, phone,
          cover_letter, resume_path, resume_original_name, status, applied_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Applied', ?)
      `);

      const result = insert.run(
        job.id,
        req.user.id,
        job.company_id,
        applicantName,
        applicantEmail,
        applicantPhone,
        cover_letter ? cover_letter.trim() : '',
        resumePath,
        resumeOriginalName,
        today
      );

      return res.status(201).json({
        success: true,
        message: 'Your job application has been submitted successfully!',
        applicationId: Number(result.lastInsertRowid)
      });
    } catch (error) {
      console.error('Job application error:', error);
      return res.status(500).json({ success: false, message: 'Server error processing application.' });
    }
  });
});

/**
 * GET /api/applications/my
 * Candidate views all their submitted applications
 */
router.get('/my', authenticateToken, requireRole('USER'), (req, res) => {
  try {
    const applications = db.prepare(`
      SELECT a.*,
             j.title as job_title,
             j.location as job_location,
             j.job_type,
             j.department,
             j.company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = ?
      ORDER BY a.id DESC
    `).all(req.user.id);

    return res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Fetch my applications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your applications.' });
  }
});

/**
 * DELETE /api/applications/my/:id
 * Candidate withdraws/cancels an application
 */
router.delete('/my/:id', authenticateToken, requireRole('USER'), (req, res) => {
  try {
    const appId = Number(req.params.id);
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (app.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only withdraw your own applications.' });
    }

    db.prepare('DELETE FROM applications WHERE id = ?').run(appId);

    return res.json({
      success: true,
      message: 'Application withdrawn successfully.'
    });
  } catch (error) {
    console.error('Cancel application error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel application.' });
  }
});

/**
 * GET /api/applications/company
 * Recruiter/Company views applications for their jobs
 */
router.get('/company', authenticateToken, requireRole('COMPANY'), (req, res) => {
  try {
    const { job_id, status } = req.query;

    let query = `
      SELECT a.*,
             j.title as job_title,
             j.location as job_location,
             j.job_type,
             u.location as candidate_location,
             u.headline as candidate_headline
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      WHERE a.company_id = ?
    `;
    const params = [req.user.id];

    if (job_id) {
      query += ` AND a.job_id = ?`;
      params.push(Number(job_id));
    }

    if (status && status !== 'All') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.id DESC`;

    const applications = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Fetch company applications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
  }
});

/**
 * PATCH /api/applications/:id/status
 * Company or Admin updates application status
 */
router.patch('/:id/status', authenticateToken, requireRole('COMPANY', 'ADMIN'), (req, res) => {
  try {
    const appId = Number(req.params.id);
    const { status, notes } = req.body;

    const validStatuses = ['Applied', 'In Review', 'Interview', 'Shortlisted', 'Rejected', 'Hired'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Ownership check: If COMPANY, must own this application
    if (req.user.role === 'COMPANY' && app.company_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify applications belonging to other companies.'
      });
    }

    const update = db.prepare(`
      UPDATE applications SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(status || null, notes !== undefined ? notes : null, appId);

    const updatedApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);

    return res.json({
      success: true,
      message: `Application status updated to ${status || updatedApp.status}.`,
      application: updatedApp
    });
  } catch (error) {
    console.error('Update application status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application status.' });
  }
});

/**
 * GET /api/applications/:id/resume
 * Secure CV download / preview with strict authorization checks
 */
router.get('/:id/resume', authenticateToken, (req, res) => {
  try {
    const appId = Number(req.params.id);
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // STRICT AUTHORIZATION CHECK:
    // Only the candidate who applied, the company that posted the job, or an ADMIN can view/download
    const isCandidate = (req.user.id === app.user_id);
    const isCompanyOwner = (req.user.id === app.company_id);
    const isAdmin = (req.user.role === 'ADMIN');

    if (!isCandidate && !isCompanyOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view or download this candidate CV.'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/resumes', app.resume_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'CV file not found on server.' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${app.resume_original_name}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download resume error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve resume file.' });
  }
});

module.exports = router;
