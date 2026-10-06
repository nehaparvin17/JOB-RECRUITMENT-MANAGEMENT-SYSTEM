const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/jobs/recent
 * Returns recent 3 active jobs for the homepage
 */
router.get('/recent', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*, 
             u.company_name as verified_company_name,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      WHERE j.status = 'Active' AND u.is_active = 1
      ORDER BY j.id DESC
      LIMIT 3
    `).all();

    return res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch recent jobs' });
  }
});

/**
 * GET /api/jobs/filters
 * Returns unique filter options currently available
 */
router.get('/filters', (req, res) => {
  try {
    const locations = db.prepare(`SELECT DISTINCT location FROM jobs WHERE status = 'Active' ORDER BY location`).all().map(r => r.location);
    const departments = db.prepare(`SELECT DISTINCT department FROM jobs WHERE status = 'Active' ORDER BY department`).all().map(r => r.department);
    const jobTypes = db.prepare(`SELECT DISTINCT job_type FROM jobs WHERE status = 'Active' ORDER BY job_type`).all().map(r => r.job_type);

    return res.json({
      success: true,
      locations,
      departments,
      jobTypes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch filters' });
  }
});

/**
 * GET /api/jobs
 * Browse and search jobs with filters
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const { keyword, location, job_type, department, sort } = req.query;

    let query = `
      SELECT j.*, 
             u.company_name as verified_company_name,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      WHERE j.status = 'Active' AND u.is_active = 1
    `;
    const params = [];

    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      query += ` AND (j.title LIKE ? OR j.description LIKE ? OR j.skills LIKE ? OR j.company_name LIKE ?)`;
      params.push(kw, kw, kw, kw);
    }

    if (location && location.trim() && location !== 'All' && location !== 'Select Location') {
      query += ` AND j.location LIKE ?`;
      params.push(`%${location.trim()}%`);
    }

    if (job_type && job_type.trim() && job_type !== 'All') {
      query += ` AND j.job_type = ?`;
      params.push(job_type.trim());
    }

    if (department && department.trim() && department !== 'All' && department !== 'Select Department') {
      query += ` AND j.department = ?`;
      params.push(department.trim());
    }

    if (sort === 'oldest') {
      query += ` ORDER BY j.id ASC`;
    } else {
      query += ` ORDER BY j.id DESC`;
    }

    const jobs = db.prepare(query).all(...params);

    return res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ success: false, message: 'Failed to search jobs' });
  }
});

/**
 * GET /api/jobs/:id
 * Single job details + application status check for logged-in candidate
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const job = db.prepare(`
      SELECT j.*, 
             u.company_name as verified_company_name,
             u.bio as company_bio,
             u.location as company_headquarters,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicants_count
      FROM jobs j
      JOIN users u ON j.company_id = u.id
      WHERE j.id = ?
    `).get(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }

    let hasApplied = false;
    let applicationDetails = null;

    if (req.user && req.user.role === 'USER') {
      const existingApp = db.prepare(`
        SELECT id, status, applied_date, resume_original_name
        FROM applications
        WHERE job_id = ? AND user_id = ?
      `).get(jobId, req.user.id);

      if (existingApp) {
        hasApplied = true;
        applicationDetails = existingApp;
      }
    }

    return res.json({
      success: true,
      job,
      hasApplied,
      applicationDetails
    });
  } catch (error) {
    console.error('Error fetching job details:', error);
    return res.status(500).json({ success: false, message: 'Failed to load job details.' });
  }
});

/**
 * POST /api/jobs
 * Create job (Company or Admin)
 */
router.post('/', authenticateToken, requireRole('COMPANY', 'ADMIN'), (req, res) => {
  try {
    const {
      title,
      company_name,
      location,
      job_type,
      department,
      open_positions,
      salary_range,
      experience_level,
      description,
      requirements,
      skills,
      deadline_date
    } = req.body;

    if (!title || !location || !job_type || !department || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title, location, job type, department, and description are required.'
      });
    }

    let targetCompanyId = req.user.id;
    let targetCompanyName = req.user.company_name || `${req.user.first_name} ${req.user.last_name}`;

    // If Admin is posting on behalf of a company, allow passing company_id
    if (req.user.role === 'ADMIN' && req.body.company_id) {
      targetCompanyId = Number(req.body.company_id);
      const companyUser = db.prepare('SELECT company_name, first_name, last_name FROM users WHERE id = ?').get(targetCompanyId);
      if (companyUser) {
        targetCompanyName = companyUser.company_name || `${companyUser.first_name} ${companyUser.last_name}`;
      }
    } else if (company_name) {
      targetCompanyName = company_name;
    }

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const defaultDeadline = deadline_date || '30 days';

    const insert = db.prepare(`
      INSERT INTO jobs (
        company_id, title, company_name, location, job_type, department,
        open_positions, salary_range, experience_level, description,
        requirements, skills, status, posted_date, deadline_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
    `);

    const result = insert.run(
      targetCompanyId,
      title.trim(),
      targetCompanyName.trim(),
      location.trim(),
      job_type.trim(),
      department.trim(),
      open_positions ? Number(open_positions) : 1,
      salary_range ? salary_range.trim() : 'Competitive',
      experience_level ? experience_level.trim() : 'Entry to Mid',
      description.trim(),
      requirements ? requirements.trim() : 'Standard job requirements apply.',
      skills ? skills.trim() : 'General',
      today,
      defaultDeadline
    );

    const createdJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(Number(result.lastInsertRowid));

    return res.status(201).json({
      success: true,
      message: 'Job posting published successfully.',
      job: createdJob
    });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating job.' });
  }
});

/**
 * PUT /api/jobs/:id
 * Edit job (Company owner or Admin)
 */
router.put('/:id', authenticateToken, requireRole('COMPANY', 'ADMIN'), (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const existingJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);

    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // RBAC Ownership Check: If COMPANY, must own this job
    if (req.user.role === 'COMPANY' && existingJob.company_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify job postings belonging to another company.'
      });
    }

    const {
      title,
      location,
      job_type,
      department,
      open_positions,
      salary_range,
      experience_level,
      description,
      requirements,
      skills,
      status,
      deadline_date
    } = req.body;

    const update = db.prepare(`
      UPDATE jobs SET
        title = COALESCE(?, title),
        location = COALESCE(?, location),
        job_type = COALESCE(?, job_type),
        department = COALESCE(?, department),
        open_positions = COALESCE(?, open_positions),
        salary_range = COALESCE(?, salary_range),
        experience_level = COALESCE(?, experience_level),
        description = COALESCE(?, description),
        requirements = COALESCE(?, requirements),
        skills = COALESCE(?, skills),
        status = COALESCE(?, status),
        deadline_date = COALESCE(?, deadline_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      title ? title.trim() : null,
      location ? location.trim() : null,
      job_type ? job_type.trim() : null,
      department ? department.trim() : null,
      open_positions ? Number(open_positions) : null,
      salary_range ? salary_range.trim() : null,
      experience_level ? experience_level.trim() : null,
      description ? description.trim() : null,
      requirements ? requirements.trim() : null,
      skills ? skills.trim() : null,
      status ? status.trim() : null,
      deadline_date ? deadline_date.trim() : null,
      jobId
    );

    const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);

    return res.json({
      success: true,
      message: 'Job updated successfully.',
      job: updatedJob
    });
  } catch (error) {
    console.error('Update job error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating job.' });
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete job (Company owner or Admin)
 */
router.delete('/:id', authenticateToken, requireRole('COMPANY', 'ADMIN'), (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const existingJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);

    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // RBAC Ownership Check
    if (req.user.role === 'COMPANY' && existingJob.company_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot delete job postings belonging to another company.'
      });
    }

    db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);

    return res.json({
      success: true,
      message: 'Job posting deleted successfully.'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting job.' });
  }
});

module.exports = router;
