# 💼 Job Requirement System (JobHub)

A full-stack, three-role Job Recruitment Management System built with **Node.js**, **Express**, **SQLite**, and modern **vanilla JavaScript, CSS, and HTML**.

---

## 🌟 Key Features

### 👤 1. Candidate / Job Seeker
- **User Authentication**: Secure registration and login with JWT and password hashing (bcrypt).
- **Job Browsing & Search**: Search and filter job listings by title, skills, location, type, and salary range.
- **Job Application**: Apply directly with resume uploads and track application status in real-time.
- **Profile Management**: Update profile details, qualifications, and uploaded resumes.

### 🏢 2. Company / Recruiter
- **Job Posting & Management**: Create, edit, and close job postings.
- **Applicant Tracking System (ATS)**: View candidates, download resumes, review applications, and update status (Pending, Reviewed, Shortlisted, Rejected, Hired).
- **Company Profile**: Customize company information and contact details.

### 🛡️ 3. Administrator
- **System Overview & Analytics**: Metrics on total jobs, applications, active users, and platform activity.
- **User & Company Management**: Moderate registered users, recruiters, and companies.
- **Job Moderation**: Audit and manage published job requirements.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (embedded, zero-configuration database)
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **File Uploads**: Multer
- **Frontend**: Responsive Vanilla HTML5, CSS3, and JavaScript SPA

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/)

### 1. Install dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```
*(On Windows: `copy .env.example .env`)*

Configure your `.env` settings if needed:
```env
PORT=5000
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### 3. Start the Application
Run the server:
```bash
npm start
```
Or for development:
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🔑 Default Test Accounts

Initial seed accounts are generated automatically upon first launch:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@jobhub.com` | `admin123` |
| **Company / Recruiter** | `recruiter@abccompany.com` | `company123` |
| **Candidate** | `candidate@jobhub.com` | `user123` |

---

## 📄 License
This project is open-source and available under the [ISC License](LICENSE).
