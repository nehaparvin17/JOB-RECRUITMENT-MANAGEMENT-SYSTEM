const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 5001; // Run test on port 5001
process.env.PORT = PORT;

// Start server
require('dotenv').config();
const { initDatabase, db } = require('./src/config/db');
initDatabase();

const app = require('express')();
const cors = require('cors');
app.use(cors());
app.use(require('express').json());
app.use(require('express').urlencoded({ extended: true }));

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/jobs', require('./src/routes/jobRoutes'));
app.use('/api/applications', require('./src/routes/applicationRoutes'));
app.use('/api/company', require('./src/routes/companyRoutes'));
app.use('/api/user', require('./src/routes/userRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

const server = app.listen(PORT, async () => {
  console.log(`\n====================================================`);
  console.log(`  STARTING COMPREHENSIVE BACKEND & RBAC TEST SUITE  `);
  console.log(`====================================================\n`);

  let passed = 0;
  let failed = 0;

  async function request(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  function assert(testName, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. AUTH TESTS
    console.log('\n--- 1. AUTHENTICATION & LOGIN TESTS ---');
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@jobhub.com',
      password: 'admin123'
    });
    assert('Admin Login successful', adminLogin.status === 200 && adminLogin.body.user.role === 'ADMIN');
    const adminToken = adminLogin.body.token;

    const companyLogin = await request('POST', '/api/auth/login', {
      email: 'recruiter@abccompany.com',
      password: 'company123'
    });
    assert('Company Login successful', companyLogin.status === 200 && companyLogin.body.user.role === 'COMPANY');
    const companyToken = companyLogin.body.token;

    const userLogin = await request('POST', '/api/auth/login', {
      email: 'candidate@jobhub.com',
      password: 'user123'
    });
    assert('Candidate Login successful', userLogin.status === 200 && userLogin.body.user.role === 'USER');
    const userToken = userLogin.body.token;

    const invalidLogin = await request('POST', '/api/auth/login', {
      email: 'admin@jobhub.com',
      password: 'wrong_password_999'
    });
    assert('Reject Invalid Credentials', invalidLogin.status === 401);

    // 2. REGISTRATION TESTS
    console.log('\n--- 2. REGISTRATION TESTS ---');
    const uniqueEmail = `test_candidate_${Date.now()}@jobhub.com`;
    const regCandidate = await request('POST', '/api/auth/register', {
      first_name: 'Test',
      last_name: 'Candidate',
      email: uniqueEmail,
      password: 'password123',
      role: 'Candidate'
    });
    assert('Register new Candidate', regCandidate.status === 201 && regCandidate.body.user.role === 'USER');

    const duplicateReg = await request('POST', '/api/auth/register', {
      first_name: 'Duplicate',
      last_name: 'User',
      email: uniqueEmail,
      password: 'password123',
      role: 'Candidate'
    });
    assert('Reject Duplicate Email', duplicateReg.status === 409);

    // 3. CANDIDATE JOB SEEKER WORKFLOW
    console.log('\n--- 3. CANDIDATE WORKFLOW TESTS ---');
    const jobsList = await request('GET', '/api/jobs');
    assert('Public Browse Jobs', jobsList.status === 200 && jobsList.body.jobs.length > 0);

    const userDash = await request('GET', '/api/user/dashboard', null, userToken);
    assert('Candidate Dashboard stats access', userDash.status === 200 && userDash.body.stats.totalApplications >= 0);

    const userApps = await request('GET', '/api/applications/my', null, userToken);
    assert('Candidate View My Applications', userApps.status === 200 && Array.isArray(userApps.body.applications));

    // 4. COMPANY WORKFLOW TESTS
    console.log('\n--- 4. COMPANY WORKFLOW TESTS ---');
    const compDash = await request('GET', '/api/company/dashboard', null, companyToken);
    assert('Company Dashboard stats access', compDash.status === 200 && compDash.body.stats.totalJobs >= 0);

    const newJob = await request('POST', '/api/jobs', {
      title: 'Senior Cloud Architect',
      location: 'Kolkata',
      job_type: 'Full Time',
      department: 'Engineering',
      description: 'Lead enterprise cloud infrastructure migration.',
      requirements: 'AWS, Kubernetes, Terraform',
      skills: 'AWS, Docker, K8s',
      open_positions: 2,
      salary_range: '$120k - $150k'
    }, companyToken);
    assert('Company Post Job', newJob.status === 201 && newJob.body.job.id > 0);
    const createdJobId = newJob.body.job.id;

    const editJob = await request('PUT', `/api/jobs/${createdJobId}`, {
      title: 'Lead Cloud Architect'
    }, companyToken);
    assert('Company Edit Own Job', editJob.status === 200 && editJob.body.job.title === 'Lead Cloud Architect');

    const compApps = await request('GET', '/api/applications/company', null, companyToken);
    assert('Company View Received Applications', compApps.status === 200 && Array.isArray(compApps.body.applications));

    if (compApps.body.applications.length > 0) {
      const appId = compApps.body.applications[0].id;
      const updateStatus = await request('PATCH', `/api/applications/${appId}/status`, {
        status: 'Interview',
        notes: 'Promoted to technical interview stage.'
      }, companyToken);
      assert('Company Update Application Status', updateStatus.status === 200 && updateStatus.body.application.status === 'Interview');
    }

    // 5. ADMIN WORKFLOW TESTS
    console.log('\n--- 5. ADMIN WORKFLOW TESTS ---');
    const adminStats = await request('GET', '/api/admin/stats', null, adminToken);
    assert('Admin System Stats', adminStats.status === 200 && adminStats.body.stats.totalUsers > 0);

    const adminUsers = await request('GET', '/api/admin/users', null, adminToken);
    assert('Admin List All Users', adminUsers.status === 200 && adminUsers.body.users.length > 0);

    const adminJobs = await request('GET', '/api/admin/jobs', null, adminToken);
    assert('Admin List All Jobs', adminJobs.status === 200 && adminJobs.body.jobs.length > 0);

    const adminApps = await request('GET', '/api/admin/applications', null, adminToken);
    assert('Admin List All Applications', adminApps.status === 200 && adminApps.body.applications.length > 0);

    // 6. STRICT SECURITY & RBAC AUTHORIZATION TESTS (MUST FAIL / BE REJECTED)
    console.log('\n--- 6. SECURITY & RBAC ENFORCEMENT TESTS ---');

    // Candidate trying to access Admin API -> MUST BE 403
    const candidateToAdmin = await request('GET', '/api/admin/stats', null, userToken);
    assert('Candidate blocked from Admin API (403)', candidateToAdmin.status === 403);

    // Candidate trying to post a job -> MUST BE 403
    const candidatePostJob = await request('POST', '/api/jobs', {
      title: 'Hacked Job Title',
      location: 'Nowhere',
      job_type: 'Full Time',
      department: 'IT',
      description: 'Illegal job posting'
    }, userToken);
    assert('Candidate blocked from Posting Job (403)', candidatePostJob.status === 403);

    // Company trying to access Admin API -> MUST BE 403
    const companyToAdmin = await request('GET', '/api/admin/stats', null, companyToken);
    assert('Company blocked from Admin API (403)', companyToAdmin.status === 403);

    // Unauthenticated request to protected endpoints -> MUST BE 401
    const noAuthRequest = await request('GET', '/api/admin/stats', null, null);
    assert('Unauthenticated access blocked (401)', noAuthRequest.status === 401);

    // Company A trying to edit Company B's job (XYZ Tech recruiter trying to edit ABC Company's job)
    const company2Login = await request('POST', '/api/auth/login', {
      email: 'recruiter@xyztech.com',
      password: 'company123'
    });
    const company2Token = company2Login.body.token;

    // Job ID 1 belongs to Company ID 2 (ABC Company). Company 2 has ID 3 (XYZ Tech).
    const crossCompanyEdit = await request('PUT', '/api/jobs/1', {
      title: 'Stolen Job Title by Rival Company'
    }, company2Token);
    assert('Ownership Check: Company B cannot edit Company A job (403)', crossCompanyEdit.status === 403);

    const crossCompanyDelete = await request('DELETE', '/api/jobs/1', null, company2Token);
    assert('Ownership Check: Company B cannot delete Company A job (403)', crossCompanyDelete.status === 403);

    // Candidate A trying to view CV of an application they do not own
    // Let's create another candidate
    const otherUserLogin = await request('POST', '/api/auth/login', {
      email: 'kenji.tanaka@jobhub.com',
      password: 'user123'
    });
    const otherUserToken = otherUserLogin.body.token;

    // Application 1 belongs to Alex Johnson and ABC Company. Kenji Tanaka must NOT be able to view its CV!
    const unauthorizedCvAccess = await request('GET', '/api/applications/1/resume', null, otherUserToken);
    assert('Candidate cannot access other applicant CV (403)', unauthorizedCvAccess.status === 403);

    // Clean up created test job
    await request('DELETE', `/api/jobs/${createdJobId}`, null, companyToken);

    console.log(`\n====================================================`);
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
    console.log(`====================================================\n`);

    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  } catch (err) {
    console.error('Test execution error:', err);
    server.close(() => process.exit(1));
  }
});
