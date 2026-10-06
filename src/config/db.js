const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('USER', 'COMPANY', 'ADMIN')),
      company_name TEXT,
      phone TEXT,
      location TEXT,
      headline TEXT,
      bio TEXT,
      resume_path TEXT,
      resume_original_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Jobs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      company_name TEXT NOT NULL,
      location TEXT NOT NULL,
      job_type TEXT NOT NULL,
      department TEXT NOT NULL,
      open_positions INTEGER DEFAULT 1,
      salary_range TEXT,
      experience_level TEXT,
      description TEXT NOT NULL,
      requirements TEXT NOT NULL,
      skills TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Closed')),
      posted_date TEXT NOT NULL,
      deadline_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Applications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      cover_letter TEXT,
      resume_path TEXT NOT NULL,
      resume_original_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Applied' CHECK(status IN ('Applied', 'In Review', 'Interview', 'Shortlisted', 'Rejected', 'Hired')),
      notes TEXT,
      applied_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(job_id, user_id)
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('Seeding initial data...');

  // Ensure uploads directory exists
  const uploadDir = path.join(__dirname, '../../uploads/resumes');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create sample dummy PDF/text files for seeded resumes
  const sampleResume1 = 'sample_alex_johnson_resume.pdf';
  const sampleResume2 = 'sample_marts_garcia_resume.pdf';
  fs.writeFileSync(path.join(uploadDir, sampleResume1), 'Sample Resume Content for Alex Johnson (Job Seeker / Candidate)\nSkills: Python, SQL, Data Visualization, Excel\nExperience: 3 years in Analytics.');
  fs.writeFileSync(path.join(uploadDir, sampleResume2), 'Sample Resume Content for Marts Garcia\nSkills: Python, Machine Learning, Fast-API.');

  // Password hashes
  const adminHash = bcrypt.hashSync('admin123', 10);
  const companyHash = bcrypt.hashSync('company123', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  // 1. Seed Admin
  const insertUser = db.prepare(`
    INSERT INTO users (first_name, last_name, email, password_hash, role, company_name, phone, location, headline, bio, resume_path, resume_original_name, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('System', 'Administrator', 'admin@jobhub.com', adminHash, 'ADMIN', 'JobHub Global', '+1-800-JOB-HUB', 'Headquarters', 'System Administrator', 'Main platform administrator managing roles, accounts, and system operations.', null, null, 1);

  // 2. Seed Employers/Companies
  insertUser.run('Sarah', 'Connor', 'recruiter@abccompany.com', companyHash, 'COMPANY', 'ABC Company', '+91-9876543210', 'Kolkata', 'Talent Acquisition Lead', 'ABC Company is a leading technology solutions provider specializing in business intelligence and cloud engineering.', null, null, 1);
  insertUser.run('Michael', 'Scott', 'recruiter@xyztech.com', companyHash, 'COMPANY', 'XYZ Tech', '+1-555-0199', 'Remote', 'Head of People Operations', 'XYZ Tech creates modern open-source software and scalable distributed microservices.', null, null, 1);
  insertUser.run('Priya', 'Sharma', 'recruiter@softedge.com', companyHash, 'COMPANY', 'SoftEdge', '+91-9812345678', 'Bangalore', 'HR Director', 'SoftEdge provides enterprise software consulting and scalable web engineering.', null, null, 1);

  // 3. Seed Candidates/Users
  insertUser.run('Alex', 'Johnson', 'candidate@jobhub.com', userHash, 'USER', null, '+91-9988776655', 'Kolkata', 'Data Analyst & Python Developer', 'Passionate data analyst with 3 years of experience turning raw data into actionable business intelligence.', sampleResume1, 'Alex_Johnson_Resume.pdf', 1);
  insertUser.run('Marts', 'Garcia', 'marts.garcia@jobhub.com', userHash, 'USER', null, '+91-9123456780', 'Bangalore', 'Full Stack Developer', 'Software developer specializing in Python and React.', sampleResume2, 'Marts_Garcia_CV.pdf', 1);
  insertUser.run('Kenji', 'Tanaka', 'kenji.tanaka@jobhub.com', userHash, 'USER', null, '+81-90-1234-5678', 'Tokyo / Remote', 'Junior Software Engineer', 'Enthusiastic developer learning modern backend architectures.', null, null, 1);

  // Seed Jobs (Company 1 = ID 2, Company 2 = ID 3, Company 3 = ID 4)
  const insertJob = db.prepare(`
    INSERT INTO jobs (company_id, title, company_name, location, job_type, department, open_positions, salary_range, experience_level, description, requirements, skills, status, posted_date, deadline_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertJob.run(
    2,
    'Data Analyst',
    'ABC Company',
    'Kolkata',
    'Full Time',
    'IT',
    3,
    '$50,000 - $70,000 / year',
    '2-4 Years',
    'We are looking for a data analyst to join our team. You will work with data to experience, list, built reports and support decision making across cross-functional teams.',
    'Good knowledge of Python / SQL\nExperience with Excel / Power BI\nStrong analytical skills\nExcellent communication skills\nBachelor degree in Computer Science, Math, or related field',
    'Python, SQL, Excel, Data Visualization',
    'Active',
    '05 Oct 2026',
    '25 Oct 2026'
  );

  insertJob.run(
    3,
    'Python Developer',
    'XYZ Tech',
    'Remote',
    'Full Time',
    'Engineering',
    2,
    '$80,000 - $110,000 / year',
    '3+ Years',
    'We are looking for a Python Developer to join our backend architecture team. You will build and scale high-throughput REST APIs and data processing pipelines.',
    'Proficiency in Python 3 and modern asynchronous libraries\nExperience with FastAPI, Django, or Flask\nExperience with SQL and relational databases\nUnderstanding of containerization with Docker and CI/CD pipelines',
    'Python, Django, FastAPI, Docker, PostgreSQL',
    'Active',
    '03 Oct 2026',
    '28 Oct 2026'
  );

  insertJob.run(
    4,
    'Web Developer',
    'SoftEdge',
    'Bangalore',
    'Part Time',
    'Engineering',
    4,
    '$25 - $40 / hour',
    '1-3 Years',
    'SoftEdge is seeking a talented Web Developer to craft responsive, accessible, and high-performance user interfaces for our global client platforms.',
    'Strong mastery of modern HTML5, CSS3, and JavaScript\nExperience with client-side state management and RESTful APIs\nUnderstanding of cross-browser compatibility and responsive layouts\nStrong eye for visual design and pixel-perfect attention to detail',
    'JavaScript, CSS3, HTML5, React, Git',
    'Active',
    '01 Oct 2026',
    '20 Oct 2026'
  );

  insertJob.run(
    4,
    'Java Developer',
    'SoftEdge',
    'Bangalore',
    'Full Time',
    'IT',
    2,
    '$65,000 - $90,000 / year',
    '3-5 Years',
    'Join our enterprise backend team developing robust microservices and core banking integrations using modern Java and Spring Boot ecosystems.',
    'Strong knowledge of Core Java 17+ and Spring Boot framework\nExperience designing RESTful web services and relational databases\nFamiliarity with messaging brokers (Kafka/RabbitMQ) is a plus\nCommitment to unit testing and code quality',
    'Java, Spring Boot, Microservices, PostgreSQL, Docker',
    'Active',
    '29 Sep 2026',
    '18 Oct 2026'
  );

  insertJob.run(
    2,
    'UI/UX Designer',
    'ABC Company',
    'Kolkata',
    'Full Time',
    'Design',
    1,
    '$45,000 - $65,000 / year',
    '2+ Years',
    'We are seeking an experienced UI/UX Designer to design elegant, user-centric interfaces and design systems for enterprise web applications.',
    'Proven portfolio demonstrating web and mobile app interfaces\nExpertise in Figma, wireframing, and interactive prototyping\nDeep understanding of design heuristics and usability testing\nGreat collaborative skills with product managers and engineers',
    'Figma, UI Design, Wireframing, User Research',
    'Active',
    '02 Oct 2026',
    '30 Oct 2026'
  );

  // Seed Applications
  const insertApp = db.prepare(`
    INSERT INTO applications (job_id, user_id, company_id, full_name, email, phone, cover_letter, resume_path, resume_original_name, status, notes, applied_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Candidate Alex Johnson (ID 5) applied to:
  // Job 1 (Data Analyst at ABC Company, company_id = 2) -> Status: 'Interview'
  insertApp.run(1, 5, 2, 'Alex Johnson', 'candidate@jobhub.com', '+91-9988776655', 'I am enthusiastic about the Data Analyst role at ABC Company.', sampleResume1, 'Alex_Johnson_Resume.pdf', 'Interview', 'Candidate showed strong SQL knowledge in preliminary screen.', '05 Oct 2026');

  // Job 2 (Python Developer at XYZ Tech, company_id = 3) -> Status: 'Applied'
  insertApp.run(2, 5, 3, 'Alex Johnson', 'candidate@jobhub.com', '+91-9988776655', 'Excited about backend engineering with Python.', sampleResume1, 'Alex_Johnson_Resume.pdf', 'Applied', null, '05 Oct 2026');

  // Job 3 (Web Developer at SoftEdge, company_id = 4) -> Status: 'Shortlisted'
  insertApp.run(3, 5, 4, 'Alex Johnson', 'candidate@jobhub.com', '+91-9988776655', 'I build accessible and high speed web interfaces.', sampleResume1, 'Alex_Johnson_Resume.pdf', 'Shortlisted', 'Shortlisted for technical challenge.', '01 Oct 2026');

  // Job 4 (Java Developer at SoftEdge, company_id = 4) -> Status: 'Rejected'
  insertApp.run(4, 5, 4, 'Alex Johnson', 'candidate@jobhub.com', '+91-9988776655', 'Application for Java developer role.', sampleResume1, 'Alex_Johnson_Resume.pdf', 'Rejected', 'Role requires deeper Core Java expertise.', '29 Sep 2026');

  // Candidate Marts Garcia (ID 6) applied to:
  // Job 1 (Data Analyst at ABC Company) -> Status: 'Applied'
  insertApp.run(1, 6, 2, 'Marts Garcia', 'marts.garcia@jobhub.com', '+91-9123456780', 'Applying for the Data Analyst role.', sampleResume2, 'Marts_Garcia_CV.pdf', 'Applied', null, '05 Oct 2026');

  console.log('Database seeded successfully with initial users, jobs, and applications!');
}

module.exports = {
  db,
  initDatabase
};
