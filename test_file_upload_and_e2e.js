const { db, initDatabase } = require('./src/config/db');
initDatabase();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/jobs', require('./src/routes/jobRoutes'));
app.use('/api/applications', require('./src/routes/applicationRoutes'));
app.use('/api/company', require('./src/routes/companyRoutes'));
app.use('/api/user', require('./src/routes/userRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

const PORT = 5002;

const server = app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`   RUNNING FILE UPLOAD & END-TO-END DATA SAVE TESTS   `);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - ${extra}`);
      failed++;
    }
  }

  const BASE = `http://localhost:${PORT}/api`;

  try {
    // 1. REGISTER NEW CANDIDATE
    console.log('--- 1. CANDIDATE REGISTRATION & LOGIN ---');
    const timestamp = Date.now();
    const candidateEmail = `candidate_${timestamp}@example.com`;
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Rahul',
        last_name: 'Sharma',
        email: candidateEmail,
        password: 'password123',
        role: 'Candidate'
      })
    });
    const regData = await regRes.json();
    assert('Candidate registered and token returned', regRes.status === 201 && regData.token);
    const candidateToken = regData.token;

    // 2. CANDIDATE SAVE / UPDATE PROFILE DATA
    console.log('\n--- 2. CANDIDATE SAVE PROFILE DATA ---');
    const updateProfileRes = await fetch(`${BASE}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${candidateToken}`
      },
      body: JSON.stringify({
        first_name: 'Rahul',
        last_name: 'Sharma',
        phone: '+91-9876543210',
        location: 'Bengaluru, India',
        headline: 'Senior Full Stack Developer (Node.js & React)',
        bio: 'Passionate software engineer with 5+ years of full stack experience.'
      })
    });
    const updateProfileData = await updateProfileRes.json();
    assert('Candidate profile data saved in database', 
      updateProfileRes.status === 200 && 
      updateProfileData.user.headline === 'Senior Full Stack Developer (Node.js & React)' &&
      updateProfileData.user.location === 'Bengaluru, India'
    );

    // 3. CANDIDATE UPLOAD PROFILE RESUME (.pdf)
    console.log('\n--- 3. CANDIDATE PROFILE RESUME FILE UPLOAD ---');
    const samplePdfContent = Buffer.from('%PDF-1.4 Mock Candidate Resume Content for Rahul Sharma');
    const resumeBlob = new Blob([samplePdfContent], { type: 'application/pdf' });
    const profileFormData = new FormData();
    profileFormData.append('resume', resumeBlob, 'Rahul_Sharma_Resume.pdf');

    const uploadResumeRes = await fetch(`${BASE}/user/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${candidateToken}`
      },
      body: profileFormData
    });
    const uploadResumeData = await uploadResumeRes.json();
    assert('Resume uploaded successfully to backend', uploadResumeRes.status === 200 && uploadResumeData.success);

    // Verify user profile now has the resume attached
    const profileCheck = await fetch(`${BASE}/user/profile`, {
      headers: { 'Authorization': `Bearer ${candidateToken}` }
    });
    const profileCheckData = await profileCheck.json();
    assert('User profile record updated with resume filename', 
      profileCheckData.user.resume_path && profileCheckData.user.resume_original_name === 'Rahul_Sharma_Resume.pdf'
    );

    // Check file exists in uploads/resumes/
    const uploadedFilePath = path.join(__dirname, 'uploads/resumes', profileCheckData.user.resume_path);
    assert('Resume file physically exists in uploads/resumes folder', fs.existsSync(uploadedFilePath));

    // 4. CANDIDATE DOWNLOAD OWN SAVED RESUME
    console.log('\n--- 4. CANDIDATE DOWNLOAD OWN RESUME ---');
    const downloadResumeRes = await fetch(`${BASE}/user/resume`, {
      headers: { 'Authorization': `Bearer ${candidateToken}` }
    });
    const downloadedText = await downloadResumeRes.text();
    assert('Resume file content retrieved correctly', downloadResumeRes.status === 200 && downloadedText.includes('Rahul Sharma'));

    // 5. TEST INVALID FILE UPLOAD EXTENSION (SECURITY CHECK)
    console.log('\n--- 5. SECURITY: REJECT DISALLOWED FILE EXTENSIONS ---');
    const badFileContent = Buffer.from('malicious script');
    const badBlob = new Blob([badFileContent], { type: 'application/javascript' });
    const badFormData = new FormData();
    badFormData.append('resume', badBlob, 'malicious.js');

    const badUploadRes = await fetch(`${BASE}/user/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${candidateToken}` },
      body: badFormData
    });
    const badUploadData = await badUploadRes.json();
    assert('Reject disallowed file format (.js)', badUploadRes.status === 400 && !badUploadData.success);

    // 6. COMPANY POSTS A JOB
    console.log('\n--- 6. COMPANY POSTS JOB ---');
    const compLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'recruiter@abccompany.com',
        password: 'company123'
      })
    });
    const compLoginData = await compLoginRes.json();
    const companyToken = compLoginData.token;

    const jobPostRes = await fetch(`${BASE}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${companyToken}`
      },
      body: JSON.stringify({
        title: 'Principal Software Engineer',
        location: 'Bengaluru, India',
        job_type: 'Full Time',
        department: 'Engineering',
        salary_range: '$140k - $170k',
        open_positions: 3,
        description: 'Lead next-generation platform development.',
        requirements: 'Node.js, Express, SQLite, React',
        skills: 'Node.js, SQLite, System Design'
      })
    });
    const jobPostData = await jobPostRes.json();
    assert('Company successfully published job', jobPostRes.status === 201 && jobPostData.job.id);
    const newJobId = jobPostData.job.id;

    // 7. CANDIDATE APPLIES WITH DIRECT FILE UPLOAD
    console.log('\n--- 7. CANDIDATE APPLIES FOR JOB WITH RESUME ATTACHMENT ---');
    const appDocContent = Buffer.from('%PDF-1.4 Application Specific CV for Rahul Sharma - Principal Engineer');
    const appDocBlob = new Blob([appDocContent], { type: 'application/pdf' });
    
    const applyFormData = new FormData();
    applyFormData.append('job_id', newJobId);
    applyFormData.append('full_name', 'Rahul Sharma');
    applyFormData.append('email', candidateEmail);
    applyFormData.append('phone', '+91-9876543210');
    applyFormData.append('cover_letter', 'I am thrilled to apply for Principal Software Engineer.');
    applyFormData.append('resume', appDocBlob, 'Rahul_Sharma_Principal_CV.pdf');

    const applyRes = await fetch(`${BASE}/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${candidateToken}`
      },
      body: applyFormData
    });
    const applyData = await applyRes.json();
    assert('Candidate submitted application with resume file', applyRes.status === 201 && applyData.applicationId);
    const applicationId = applyData.applicationId;

    // 8. COMPANY VIEWS APPLICATION & REVIEWS RESUME
    console.log('\n--- 8. COMPANY REVIEWS APPLICATION & DOWNLOADS RESUME ---');
    const compAppsRes = await fetch(`${BASE}/applications/company?job_id=${newJobId}`, {
      headers: { 'Authorization': `Bearer ${companyToken}` }
    });
    const compAppsData = await compAppsRes.json();
    assert('Company receives application in dashboard', compAppsData.applications.length > 0 && compAppsData.applications[0].full_name === 'Rahul Sharma');

    // Download applicant's resume as company
    const compResumeRes = await fetch(`${BASE}/applications/${applicationId}/resume`, {
      headers: { 'Authorization': `Bearer ${companyToken}` }
    });
    const compResumeText = await compResumeRes.text();
    assert('Company can download applicant resume file', compResumeRes.status === 200 && compResumeText.includes('Principal Engineer'));

    // 9. COMPANY UPDATES APPLICATION STATUS (ATS Workflow)
    console.log('\n--- 9. COMPANY UPDATES STATUS TO INTERVIEW & HIRED ---');
    const statusUpdateRes = await fetch(`${BASE}/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${companyToken}`
      },
      body: JSON.stringify({
        status: 'Interview',
        notes: 'Candidate passed initial resume screening.'
      })
    });
    const statusUpdateData = await statusUpdateRes.json();
    assert('Application status updated to Interview', statusUpdateData.application.status === 'Interview');

    // 10. CANDIDATE SEES UPDATED STATUS IN DASHBOARD
    console.log('\n--- 10. CANDIDATE DASHBOARD REFLECTS UPDATED APPLICATION ---');
    const candDashRes = await fetch(`${BASE}/user/dashboard`, {
      headers: { 'Authorization': `Bearer ${candidateToken}` }
    });
    const candDashData = await candDashRes.json();
    assert('Candidate dashboard reflects 1 interview', candDashData.stats.interviews === 1);

    console.log(`\n======================================================`);
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
});
