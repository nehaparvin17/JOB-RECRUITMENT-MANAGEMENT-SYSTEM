CREATE DATABASE IF NOT EXISTS job_recruitment;
USE job_recruitment;

-- USERS TABLE
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Candidate', 'Recruiter') NOT NULL
);

-- JOBS TABLE
CREATE TABLE jobs (
    job_id INT PRIMARY KEY AUTO_INCREMENT,
    recruiter_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    company VARCHAR(150) NOT NULL,
    location VARCHAR(100),
    salary VARCHAR(50),
    description TEXT,
    skills VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recruiter_id) REFERENCES users(user_id)
);

-- APPLICATIONS TABLE
CREATE TABLE applications (
    application_id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    candidate_id INT NOT NULL,
    status ENUM('Applied', 'Shortlisted', 'Rejected', 'Selected')
        DEFAULT 'Applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id),
    FOREIGN KEY (candidate_id) REFERENCES users(user_id)
);