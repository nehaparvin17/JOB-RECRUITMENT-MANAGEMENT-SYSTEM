/**
 * JobHub Central API Client
 */
const API = {
  getToken() {
    return localStorage.getItem('jobhub_token');
  },

  setToken(token) {
    localStorage.setItem('jobhub_token', token);
  },

  removeToken() {
    localStorage.removeItem('jobhub_token');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('jobhub_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    localStorage.setItem('jobhub_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('jobhub_token');
    localStorage.removeItem('jobhub_user');
  },

  async request(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (data.message && data.message.includes('deactivated')) {
            this.clearAuth();
            window.location.hash = '#/login';
          }
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth endpoints
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  // Jobs endpoints
  getRecentJobs() {
    return this.request('/jobs/recent');
  },

  getFilterOptions() {
    return this.request('/jobs/filters');
  },

  searchJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/jobs${query ? `?${query}` : ''}`);
  },

  getJob(id) {
    return this.request(`/jobs/${id}`);
  },

  createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  },

  updateJob(id, jobData) {
    return this.request(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
  },

  deleteJob(id) {
    return this.request(`/jobs/${id}`, {
      method: 'DELETE'
    });
  },

  // Applications
  applyForJob(formData) {
    return this.request('/applications', {
      method: 'POST',
      body: formData
    });
  },

  getMyApplications() {
    return this.request('/applications/my');
  },

  cancelApplication(id) {
    return this.request(`/applications/my/${id}`, {
      method: 'DELETE'
    });
  },

  getCompanyApplications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/applications/company${query ? `?${query}` : ''}`);
  },

  updateApplicationStatus(id, status, notes = null) {
    return this.request(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
  },

  // Candidate
  getCandidateDashboard() {
    return this.request('/user/dashboard');
  },

  getCandidateProfile() {
    return this.request('/user/profile');
  },

  updateCandidateProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  uploadCandidateResume(formData) {
    return this.request('/user/resume', {
      method: 'POST',
      body: formData
    });
  },

  // Company
  getCompanyDashboard() {
    return this.request('/company/dashboard');
  },

  getCompanyJobs() {
    return this.request('/company/jobs');
  },

  getCompanyProfile() {
    return this.request('/company/profile');
  },

  updateCompanyProfile(data) {
    return this.request('/company/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Admin
  getAdminStats() {
    return this.request('/admin/stats');
  },

  getAdminUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/users${query ? `?${query}` : ''}`);
  },

  createAdminUser(data) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateAdminUser(id, data) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  toggleUserStatus(id) {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PATCH'
    });
  },

  deleteAdminUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  getAdminJobs() {
    return this.request('/admin/jobs');
  },

  getAdminApplications() {
    return this.request('/admin/applications');
  }
};
