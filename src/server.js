require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const companyRoutes = require('./routes/companyRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize database tables and initial seed data
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files and uploads
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'JobHub Three-Role API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application (SPA) catch-all route: serve index.html
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` JobHub Portal Server running on http://localhost:${PORT}`);
  console.log(` Default Test Accounts:`);
  console.log(`   - ADMIN:     admin@jobhub.com / admin123`);
  console.log(`   - COMPANY:   recruiter@abccompany.com / company123`);
  console.log(`   - CANDIDATE: candidate@jobhub.com / user123`);
  console.log(`====================================================`);
});
