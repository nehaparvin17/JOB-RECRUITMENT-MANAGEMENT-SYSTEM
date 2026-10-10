/**
 * JobHub Main Application Controller & View Router
 * Renders all 9 screens exactly as shown in the mockup screenshots
 */

const App = {
  currentUser: null,
  currentRoute: '',

  async init() {
    // Check if user is logged in
    this.currentUser = API.getCurrentUser();
    if (this.currentUser && API.getToken()) {
      try {
        const res = await API.getMe();
        if (res.success && res.user) {
          this.currentUser = res.user;
          API.setCurrentUser(res.user);
        }
      } catch (e) {
        console.warn('Session expired or invalid, clearing auth');
        API.clearAuth();
        this.currentUser = null;
      }
    }

    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Initial route handling
    if (!window.location.hash) {
      window.location.hash = '#/';
    } else {
      this.handleRoute();
    }
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    this.currentRoute = hash;

    const [route, param] = hash.slice(2).split('/');

    // Route Guards
    if (route === 'candidate' && (!this.currentUser || this.currentUser.role !== 'USER')) {
      this.showToast('Please log in as a Job Seeker / Candidate to access this dashboard', 'error');
      window.location.hash = '#/login';
      return;
    }

    if (route === 'recruiter' && (!this.currentUser || this.currentUser.role !== 'COMPANY')) {
      this.showToast('Please log in as an Employer / Company to access this dashboard', 'error');
      window.location.hash = '#/login';
      return;
    }

    if (route === 'admin' && (!this.currentUser || this.currentUser.role !== 'ADMIN')) {
      this.showToast('Access Denied: Administrator role required', 'error');
      window.location.hash = '#/login';
      return;
    }

    // Determine layout: Public navbar vs Dashboard with Dark Navy Sidebar
    const isDashboard = ['candidate', 'recruiter', 'admin'].includes(route);

    if (isDashboard) {
      this.renderDashboardShell(route, param);
    } else {
      this.renderPublicShell(route, param);
    }
  },

  // Toast Notification Helper
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Modal Helper
  showModal(title, contentHtml, footerHtml = '') {
    const modalEl = document.getElementById('global-modal');
    if (!modalEl) return;

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = contentHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml;

    modalEl.classList.add('active');
  },

  closeModal() {
    const modalEl = document.getElementById('global-modal');
    if (modalEl) modalEl.classList.remove('active');
  },

  logout() {
    API.clearAuth();
    this.currentUser = null;
    this.showToast('You have been logged out successfully.', 'success');
    window.location.hash = '#/login';
  },

  // Quick Switcher for Testing All 3 Roles
  fillLoginForm(email, password) {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    if (emailInput && passInput) {
      emailInput.value = email;
      passInput.value = password;
    }
  },

  /* ========================================================================
     PUBLIC LAYOUT (Home, Jobs, Job Details, Login, Register)
     ======================================================================== */
  renderPublicShell(route, param) {
    const appEl = document.getElementById('app');

    let navUserActions = `
      <a href="#/login" class="btn-nav-login">Login</a>
      <a href="#/register" class="btn-gold">Register</a>
    `;

    if (this.currentUser) {
      let dashLink = '#/candidate/dashboard';
      if (this.currentUser.role === 'COMPANY') dashLink = '#/recruiter/dashboard';
      if (this.currentUser.role === 'ADMIN') dashLink = '#/admin/dashboard';

      navUserActions = `
        <a href="${dashLink}" class="btn-gold btn-gold-sm">Dashboard (${this.currentUser.role})</a>
        <button onclick="App.logout()" class="btn-nav-login" style="font-size:0.85rem;">Logout</button>
        <div class="user-avatar-circle">${this.currentUser.first_name[0]}</div>
      `;
    }

    const showNavSearch = ['jobs', 'job'].includes(route);

    appEl.innerHTML = `
      <nav class="main-navbar">
        <a href="#/" class="brand-logo">
          <div class="brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          JobHub
        </a>

        <ul class="nav-menu">
          <li><a href="#/" class="nav-link ${route === '' || route === 'home' ? 'active' : ''}">Home</a></li>
          <li><a href="#/jobs" class="nav-link ${route === 'jobs' ? 'active' : ''}">Jobs</a></li>
          <li><a href="#/jobs" class="nav-link">About</a></li>
          <li><a href="#/jobs" class="nav-link">Contact</a></li>
        </ul>

        ${showNavSearch ? `
          <div class="nav-search-bar">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" id="navbar-search-input" placeholder="Search jobs..." onkeypress="if(event.key==='Enter') App.handleNavSearch(this.value)">
          </div>
        ` : ''}

        <div class="nav-actions">
          ${navUserActions}
        </div>
      </nav>

      <main id="main-content"></main>
    `;

    // Render corresponding view inside #main-content
    if (!route || route === 'home') {
      this.renderHomeView();
    } else if (route === 'jobs') {
      this.renderJobsListView();
    } else if (route === 'job') {
      this.renderJobDetailsView(param);
    } else if (route === 'login') {
      this.renderLoginView();
    } else if (route === 'register') {
      this.renderRegisterView();
    } else {
      this.renderHomeView();
    }
  },

  handleNavSearch(kw) {
    window.location.hash = `#/jobs?keyword=${encodeURIComponent(kw)}`;
  },

  /* ========================================================================
     SCREEN 1: Home View (Hero + Recent Jobs)
     ======================================================================== */
  async renderHomeView() {
    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-container">
          <div class="hero-content">
            <h1>Find Your<br>Next Career</h1>
            <p class="hero-subtitle">Explore thousands of jobs and take the next step in your career.</p>

            <form class="hero-search-box" onsubmit="event.preventDefault(); App.handleHeroSearch();">
              <div class="search-field">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="hero-keyword" placeholder="Job title, keywords...">
              </div>
              <div class="search-divider"></div>
              <div class="search-field">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <input type="text" id="hero-location" placeholder="Search location...">
              </div>
              <button type="submit" class="btn-gold">Search</button>
            </form>
          </div>

          <div class="hero-image-wrapper">
            <img src="./assets/images/hero_businesswoman.jpg" alt="Professional businesswoman at desk with laptop">
          </div>
        </div>
      </section>

      <!-- Recent Jobs Section -->
      <section class="section-container">
        <div class="section-header-flex">
          <h2 class="section-title">Recent Jobs</h2>
          <a href="#/jobs" class="view-all-link">View All &rarr;</a>
        </div>

        <div id="recent-jobs-grid" class="recent-jobs-grid">
          <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748b;">Loading recent jobs...</div>
        </div>
      </section>
    `;

    try {
      const res = await API.getRecentJobs();
      const gridEl = document.getElementById('recent-jobs-grid');
      if (res.success && res.jobs.length > 0) {
        const iconClasses = ['icon-blue', 'icon-purple', 'icon-orange', 'icon-green'];
        gridEl.innerHTML = res.jobs.map((job, idx) => `
          <div class="job-card-public">
            <div>
              <div class="card-top">
                <div class="company-badge-icon ${iconClasses[idx % iconClasses.length]}">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </div>
                <div class="job-meta-header">
                  <h3>${this.escape(job.title)}</h3>
                  <div class="company-sub">${this.escape(job.company_name)}</div>
                </div>
              </div>

              <div class="job-tags-row">
                <span class="job-tag-item">📍 ${this.escape(job.location)}</span>
                <span class="job-tag-item">🕒 ${this.escape(job.job_type)}</span>
              </div>
            </div>

            <a href="#/job/${job.id}" class="card-bottom-btn">View Job</a>
          </div>
        `).join('');
      } else {
        gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">No recent jobs found.</p>`;
      }
    } catch (e) {
      console.error(e);
    }
  },

  handleHeroSearch() {
    const kw = document.getElementById('hero-keyword').value.trim();
    const loc = document.getElementById('hero-location').value.trim();
    const params = new URLSearchParams();
    if (kw) params.append('keyword', kw);
    if (loc) params.append('location', loc);
    window.location.hash = `#/jobs?${params.toString()}`;
  },

  /* ========================================================================
     SCREEN 2: Create Account / Register View
     ======================================================================== */
  renderRegisterView() {
    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `
      <div class="auth-page-container">
        <div class="auth-split-wrapper">
          <div class="auth-form-card">
            <div class="auth-header">
              <h2 class="auth-title">Create Account</h2>
              <p class="auth-subtitle">Join JobHub and start your journey.</p>
            </div>

            <form class="auth-form" onsubmit="event.preventDefault(); App.handleRegisterSubmit();">
              <div class="form-row-dual">
                <div class="input-icon-group">
                  <span class="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input type="text" id="reg-firstname" placeholder="First Name" required>
                </div>
                <div class="input-icon-group">
                  <span class="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input type="text" id="reg-lastname" placeholder="Last Name" required>
                </div>
              </div>

              <div class="input-icon-group">
                <span class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input type="email" id="reg-email" placeholder="Email" required>
              </div>

              <div class="input-icon-group">
                <span class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input type="password" id="reg-password" placeholder="Password (min 6 characters)" required minlength="6">
              </div>

              <div>
                <label class="form-label">Select type:</label>
                <div class="input-icon-group">
                  <span class="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <select id="reg-role" onchange="App.handleRoleChange(this.value)">
                    <option value="Candidate">Candidate (Job Seeker)</option>
                    <option value="Employer">Employer (Company)</option>
                  </select>
                </div>
              </div>

              <div id="company-name-group" style="display:none;">
                <label class="form-label">Company Name:</label>
                <div class="input-icon-group">
                  <span class="input-icon">🏢</span>
                  <input type="text" id="reg-company-name" placeholder="Your Company Name">
                </div>
              </div>

              <button type="submit" class="btn-auth-submit">Register</button>
            </form>

            <div class="auth-footer">
              Already have an account? <a href="#/login">Login</a>
            </div>
          </div>

          <div class="auth-image-side">
            <img src="./assets/images/register_specialist.jpg" alt="Customer support specialist with headset">
            <div class="floating-badge">
              <div class="check-circle">✓</div>
              <div>
                <div style="font-weight:700; font-size:0.85rem; color:#1e293b;">Verified Portal</div>
                <div style="font-size:0.75rem; color:#64748b;">Thousands of trusted employers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  handleRoleChange(role) {
    const compGroup = document.getElementById('company-name-group');
    if (compGroup) {
      compGroup.style.display = role === 'Employer' ? 'block' : 'none';
    }
  },

  async handleRegisterSubmit() {
    const first_name = document.getElementById('reg-firstname').value.trim();
    const last_name = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const company_name = document.getElementById('reg-company-name') ? document.getElementById('reg-company-name').value.trim() : '';

    try {
      const res = await API.register({ first_name, last_name, email, password, role, company_name });
      if (res.success) {
        API.setToken(res.token);
        API.setCurrentUser(res.user);
        this.currentUser = res.user;
        this.showToast('Account created successfully!', 'success');

        if (res.user.role === 'COMPANY') {
          window.location.hash = '#/recruiter/dashboard';
        } else {
          window.location.hash = '#/candidate/dashboard';
        }
      }
    } catch (err) {
      this.showToast(err.message || 'Registration failed', 'error');
    }
  },

  /* ========================================================================
     SCREEN 3: Welcome Back / Login View
     ======================================================================== */
  renderLoginView() {
    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `
      <div class="auth-page-container">
        <div class="auth-split-wrapper">
          <div class="auth-form-card">
            <div class="auth-header">
              <h2 class="auth-title">Welcome Back</h2>
              <p class="auth-subtitle">Login to continue to JobHub.</p>
            </div>

            <form class="auth-form" onsubmit="event.preventDefault(); App.handleLoginSubmit();">
              <div class="input-icon-group">
                <span class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input type="email" id="login-email" placeholder="Email" required>
              </div>

              <div class="input-icon-group">
                <span class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input type="password" id="login-password" placeholder="Password" required>
              </div>

              <div class="auth-extra-links">
                <a href="javascript:void(0)" onclick="App.showToast('Please contact administrator to reset password or use the demo accounts below.', 'info')" class="forgot-password-link">Forgot Password?</a>
              </div>

              <button type="submit" class="btn-auth-submit">Login</button>
            </form>

            <div class="auth-footer">
              Don't have an account? <a href="#/register">Register</a>
            </div>

            <!-- Quick test credentials box for rapid role testing -->
            <div class="demo-accounts-pillbox">
              <div class="demo-title">⚡ Quick Switch Demo Credentials:</div>
              <div class="demo-buttons-row">
                <button type="button" class="btn-demo-badge" onclick="App.fillLoginForm('candidate@jobhub.com', 'user123')">👤 Candidate</button>
                <button type="button" class="btn-demo-badge" onclick="App.fillLoginForm('recruiter@abccompany.com', 'company123')">🏢 Recruiter</button>
                <button type="button" class="btn-demo-badge" onclick="App.fillLoginForm('admin@jobhub.com', 'admin123')">🛡️ Admin</button>
              </div>
            </div>
          </div>

          <div class="auth-image-side">
            <img src="./assets/images/login_businessman.jpg" alt="Businessman in suit with laptop">
          </div>
        </div>
      </div>
    `;
  },

  async handleLoginSubmit() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await API.login(email, password);
      if (res.success) {
        API.setToken(res.token);
        API.setCurrentUser(res.user);
        this.currentUser = res.user;
        this.showToast(`Welcome back, ${res.user.first_name}!`, 'success');

        if (res.user.role === 'ADMIN') {
          window.location.hash = '#/admin/dashboard';
        } else if (res.user.role === 'COMPANY') {
          window.location.hash = '#/recruiter/dashboard';
        } else {
          window.location.hash = '#/candidate/dashboard';
        }
      }
    } catch (err) {
      this.showToast(err.message || 'Login failed. Invalid credentials.', 'error');
    }
  },

  /* ========================================================================
     SCREEN 4: Available Jobs (Search, Filter Sidebar, Jobs List)
     ======================================================================== */
  async renderJobsListView() {
    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `
      <div class="page-wrapper-jobs">
        <div class="jobs-layout-grid">
          <!-- Left Filter Sidebar -->
          <aside class="filter-sidebar-card">
            <h3 class="filter-title">Filter Jobs</h3>

            <div class="filter-group">
              <label class="filter-label">Job Title</label>
              <input type="text" id="filter-title" class="filter-input" placeholder="Job Title...">
            </div>

            <div class="filter-group">
              <label class="filter-label">Location</label>
              <select id="filter-location" class="filter-select">
                <option value="All">Select Location</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Job Type</label>
              <div class="job-type-options" id="filter-job-types">
                <label class="checkbox-label"><input type="radio" name="job_type" value="All" checked> All Types</label>
                <label class="checkbox-label"><input type="radio" name="job_type" value="Full Time"> Full Time</label>
                <label class="checkbox-label"><input type="radio" name="job_type" value="Part Time"> Part Time</label>
                <label class="checkbox-label"><input type="radio" name="job_type" value="Remote"> Remote</label>
                <label class="checkbox-label"><input type="radio" name="job_type" value="Internship"> Internship</label>
              </div>
            </div>

            <div class="filter-group">
              <label class="filter-label">Department</label>
              <select id="filter-department" class="filter-select">
                <option value="All">Select Department</option>
              </select>
            </div>

            <button type="button" class="btn-filter-apply" onclick="App.applyJobFilters()">Apply Filters</button>
            <button type="button" class="btn-filter-reset" onclick="App.resetJobFilters()">Clear All Filters</button>
          </aside>

          <!-- Right Main Available Jobs -->
          <section class="jobs-main-area">
            <div class="jobs-header-row">
              <h2>Available Jobs</h2>
              <div>
                <select id="sort-jobs-select" class="sort-select" onchange="App.applyJobFilters()">
                  <option value="latest">Sort by: Latest</option>
                  <option value="oldest">Sort by: Oldest</option>
                </select>
              </div>
            </div>

            <div id="available-jobs-list" class="jobs-list-container">
              <div style="text-align:center; padding: 3rem; color: #64748b;">Loading available jobs...</div>
            </div>
          </section>
        </div>
      </div>
    `;

    // Populate filter options dynamically
    try {
      const filters = await API.getFilterOptions();
      if (filters.success) {
        const locSelect = document.getElementById('filter-location');
        filters.locations.forEach(loc => {
          const opt = document.createElement('option');
          opt.value = loc;
          opt.textContent = loc;
          locSelect.appendChild(opt);
        });

        const deptSelect = document.getElementById('filter-department');
        filters.departments.forEach(dept => {
          const opt = document.createElement('option');
          opt.value = dept;
          opt.textContent = dept;
          deptSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Failed to load filter options', e);
    }

    // Check query params in URL
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const urlParams = new URLSearchParams(hashParts[1]);
      if (urlParams.get('keyword')) document.getElementById('filter-title').value = urlParams.get('keyword');
      if (urlParams.get('location')) document.getElementById('filter-location').value = urlParams.get('location');
    }

    this.applyJobFilters();
  },

  async applyJobFilters() {
    const title = document.getElementById('filter-title').value.trim();
    const location = document.getElementById('filter-location').value;
    const department = document.getElementById('filter-department').value;
    const sort = document.getElementById('sort-jobs-select').value;
    
    let job_type = 'All';
    const checkedRadio = document.querySelector('input[name="job_type"]:checked');
    if (checkedRadio) job_type = checkedRadio.value;

    const params = {};
    if (title) params.keyword = title;
    if (location && location !== 'All') params.location = location;
    if (department && department !== 'All') params.department = department;
    if (job_type && job_type !== 'All') params.job_type = job_type;
    if (sort) params.sort = sort;

    const listEl = document.getElementById('available-jobs-list');
    try {
      const res = await API.searchJobs(params);
      if (res.success && res.jobs.length > 0) {
        const iconClasses = ['icon-blue', 'icon-purple', 'icon-orange', 'icon-green'];
        listEl.innerHTML = res.jobs.map((job, idx) => {
          const skillsList = job.skills.split(',').slice(0, 3).map(s => `<span class="skill-tag-pill">${this.escape(s.trim())}</span>`).join('');
          return `
            <div class="job-card-row">
              <div class="job-card-left">
                <div class="company-badge-icon ${iconClasses[idx % iconClasses.length]}">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </div>
                <div class="job-card-info">
                  <h3>${this.escape(job.title)}</h3>
                  <div class="company-name">${this.escape(job.company_name)}</div>
                  <div class="job-meta-pills">
                    <span class="pill-item">📍 ${this.escape(job.location)}</span>
                    <span class="pill-item">🕒 ${this.escape(job.job_type)}</span>
                    <span class="pill-item">👥 ${job.open_positions} positions</span>
                    ${skillsList}
                  </div>
                </div>
              </div>
              <div>
                <a href="#/job/${job.id}" class="btn-view-details">View Details</a>
              </div>
            </div>
          `;
        }).join('');
      } else {
        listEl.innerHTML = `<div style="text-align:center; padding: 3rem; background:white; border-radius:12px; border:1px solid #e2e8f0; color:#64748b;">No matching jobs found. Try adjusting your search or filters.</div>`;
      }
    } catch (e) {
      listEl.innerHTML = `<div style="text-align:center; padding: 2rem; color:red;">Failed to search jobs.</div>`;
    }
  },

  resetJobFilters() {
    document.getElementById('filter-title').value = '';
    document.getElementById('filter-location').value = 'All';
    document.getElementById('filter-department').value = 'All';
    const allRadio = document.querySelector('input[name="job_type"][value="All"]');
    if (allRadio) allRadio.checked = true;
    this.applyJobFilters();
  },

  /* ========================================================================
     SCREEN 5: Job Details View
     ======================================================================== */
  async renderJobDetailsView(jobId) {
    const mainEl = document.getElementById('main-content');
    mainEl.innerHTML = `<div class="page-wrapper-jobs"><p style="padding:2rem;">Loading job details...</p></div>`;

    try {
      const res = await API.getJob(jobId);
      if (!res.success || !res.job) {
        mainEl.innerHTML = `<div class="page-wrapper-jobs"><p style="color:red; padding:2rem;">Job not found.</p></div>`;
        return;
      }

      const job = res.job;
      const hasApplied = res.hasApplied;
      const skillsArray = job.skills.split(',').map(s => s.trim()).filter(Boolean);
      const reqLines = job.requirements.split('\n').map(l => l.trim()).filter(Boolean);

      let applyButtonHtml = '';
      if (hasApplied) {
        applyButtonHtml = `
          <div style="background:#e0f2fe; color:#0284c7; padding:0.6rem 1.25rem; border-radius:9999px; font-weight:600; font-size:0.9rem;">
            ✓ You have applied (${res.applicationDetails.status})
          </div>
        `;
      } else if (!this.currentUser) {
        applyButtonHtml = `
          <a href="#/login" class="btn-gold">Login to Apply</a>
        `;
      } else if (this.currentUser.role === 'USER') {
        applyButtonHtml = `
          <button class="btn-gold" onclick="App.openApplyModal(${job.id}, '${this.escape(job.title)}')">Apply Now</button>
        `;
      } else {
        applyButtonHtml = `
          <span style="font-size:0.85rem; color:#64748b;">Logged in as ${this.currentUser.role}</span>
        `;
      }

      mainEl.innerHTML = `
        <div class="page-wrapper-jobs">
          <a href="#/jobs" class="back-to-jobs-link">
            &larr; Back to Jobs
          </a>

          <!-- Job Details Header -->
          <div class="job-details-header-card">
            <div class="job-details-title-row">
              <div class="company-badge-icon icon-blue" style="width:56px; height:56px; font-size:1.5rem;">
                💼
              </div>
              <div>
                <h1 style="font-size:1.8rem; font-weight:800; color:var(--primary-navy); margin-bottom:0.25rem;">${this.escape(job.title)}</h1>
                <div style="font-size:1.05rem; color:var(--text-muted); margin-bottom:0.6rem;">${this.escape(job.company_name)}</div>
                <div class="job-meta-pills">
                  <span class="pill-item">📍 ${this.escape(job.location)}</span>
                  <span class="pill-item">🕒 ${this.escape(job.job_type)}</span>
                  <span class="pill-item">👥 ${job.open_positions} positions</span>
                  <span class="pill-item">💰 ${this.escape(job.salary_range || 'Competitive')}</span>
                </div>
              </div>
            </div>

            <div class="job-details-actions">
              <button class="btn-social-apply btn-linkedin" onclick="App.showToast('LinkedIn EasyApply integration ready', 'info')">
                in Apply with LinkedIn
              </button>
              <button class="btn-social-apply btn-github" onclick="App.showToast('GitHub Profile sync ready', 'info')">
                Apply with GitHub
              </button>
              ${applyButtonHtml}
            </div>
          </div>

          <!-- Job Details Content Grid -->
          <div class="job-details-grid">
            <!-- Left Main Details -->
            <div class="job-details-main-content">
              <div class="job-section-block">
                <h4>Job Description</h4>
                <p>${this.escape(job.description).replace(/\n/g, '<br>')}</p>
              </div>

              <div class="job-section-block">
                <h4>Requirements</h4>
                <ul class="requirements-list">
                  ${reqLines.map(r => `<li>${this.escape(r)}</li>`).join('')}
                </ul>
              </div>

              <div class="job-section-block">
                <h4>Skills Required</h4>
                <div class="skills-pill-cloud">
                  ${skillsArray.map(s => `<span class="skill-badge-lg">${this.escape(s)}</span>`).join('')}
                </div>
              </div>
            </div>

            <!-- Right Sidebar: Job Info -->
            <aside class="job-info-sidebar-card">
              <h4>Job Info</h4>
              <div class="info-item-row">
                <span class="label">Department</span>
                <span class="value">${this.escape(job.department)}</span>
              </div>
              <div class="info-item-row">
                <span class="label">Posted On</span>
                <span class="value">${this.escape(job.posted_date)}</span>
              </div>
              <div class="info-item-row">
                <span class="label">Last Date</span>
                <span class="value">${this.escape(job.deadline_date)}</span>
              </div>
              <div class="info-item-row">
                <span class="label">Job Type</span>
                <span class="value">${this.escape(job.job_type)}</span>
              </div>
              <div class="info-item-row">
                <span class="label">Open Positions</span>
                <span class="value">${job.open_positions}</span>
              </div>
              <div class="info-item-row">
                <span class="label">Location</span>
                <span class="value">${this.escape(job.location)}</span>
              </div>
            </aside>
          </div>
        </div>
      `;
    } catch (e) {
      console.error(e);
      mainEl.innerHTML = `<div class="page-wrapper-jobs"><p style="color:red; padding:2rem;">Failed to load job details.</p></div>`;
    }
  },

  openApplyModal(jobId, jobTitle) {
    const hasProfileResume = !!(this.currentUser && this.currentUser.resume_path);

    const contentHtml = `
      <form id="apply-job-form" onsubmit="event.preventDefault(); App.handleApplySubmit(${jobId});">
        <div style="margin-bottom:1.25rem;">
          <label class="form-label">Full Name</label>
          <input type="text" id="apply-fullname" class="filter-input" value="${this.escape(this.currentUser.first_name + ' ' + this.currentUser.last_name)}" required>
        </div>

        <div style="margin-bottom:1.25rem;">
          <label class="form-label">Email Address</label>
          <input type="email" id="apply-email" class="filter-input" value="${this.escape(this.currentUser.email)}" required>
        </div>

        <div style="margin-bottom:1.25rem;">
          <label class="form-label">Phone Number</label>
          <input type="text" id="apply-phone" class="filter-input" value="${this.escape(this.currentUser.phone || '')}" placeholder="+1-555-0100">
        </div>

        <div style="margin-bottom:1.25rem;">
          <label class="form-label">Cover Letter / Note</label>
          <textarea id="apply-coverletter" class="filter-input" rows="3" placeholder="Briefly describe why you are a great fit..."></textarea>
        </div>

        <div style="margin-bottom:1.25rem; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:1rem;">
          <label class="form-label">CV / Resume (PDF, DOC, DOCX - max 5MB)</label>
          ${hasProfileResume ? `
            <div style="margin-bottom:0.75rem;">
              <label class="checkbox-label" style="font-weight:600; color:#0369a1;">
                <input type="checkbox" id="apply-use-saved" checked onchange="document.getElementById('apply-new-file-box').style.display = this.checked ? 'none' : 'block';">
                Use my saved CV (${this.escape(this.currentUser.resume_original_name || 'Resume.pdf')})
              </label>
            </div>
          ` : ''}

          <div id="apply-new-file-box" style="${hasProfileResume ? 'display:none;' : ''}">
            <input type="file" id="apply-resume-file" accept=".pdf,.doc,.docx" ${!hasProfileResume ? 'required' : ''}>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button type="button" class="btn-filter-reset" onclick="App.closeModal()">Cancel</button>
      <button type="submit" form="apply-job-form" class="btn-gold">Submit Application</button>
    `;

    this.showModal(`Apply for ${jobTitle}`, contentHtml, footerHtml);
  },

  async handleApplySubmit(jobId) {
    const form = document.getElementById('apply-job-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const full_name = document.getElementById('apply-fullname').value.trim();
    const email = document.getElementById('apply-email').value.trim();
    const phone = document.getElementById('apply-phone').value.trim();
    const cover_letter = document.getElementById('apply-coverletter').value.trim();

    const useSavedCheckbox = document.getElementById('apply-use-saved');
    const useSaved = useSavedCheckbox && useSavedCheckbox.checked;

    const fileInput = document.getElementById('apply-resume-file');
    const file = fileInput && fileInput.files[0];

    if (!useSaved && !file) {
      this.showToast('Please upload your CV/Resume file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('full_name', full_name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('cover_letter', cover_letter);
    if (useSaved) {
      formData.append('use_saved_resume', 'true');
    } else if (file) {
      formData.append('resume', file);
    }

    try {
      const res = await API.applyForJob(formData);
      if (res.success) {
        this.closeModal();
        this.showToast('Your application was submitted successfully!', 'success');
        this.renderJobDetailsView(jobId);
      }
    } catch (err) {
      this.showToast(err.message || 'Application submission failed.', 'error');
    }
  },

  /* ========================================================================
     DASHBOARD SHELL: Sidebar (Dark Navy) + Topbar + Dynamic Body
     ======================================================================== */
  renderDashboardShell(role, subpage) {
    const appEl = document.getElementById('app');

    let sidebarMenuHtml = '';
    let topRoleLabel = '';

    if (role === 'candidate') {
      topRoleLabel = 'Candidate';
      sidebarMenuHtml = `
        <li class="sidebar-item ${!subpage || subpage === 'dashboard' ? 'active' : ''}">
          <a href="#/candidate/dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
        </li>
        <li class="sidebar-item">
          <a href="#/jobs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Browse Jobs</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'applications' ? 'active' : ''}">
          <a href="#/candidate/applications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>My Applications</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'profile' ? 'active' : ''}">
          <a href="#/candidate/profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </a>
        </li>
      `;
    } else if (role === 'recruiter') {
      topRoleLabel = 'Recruiter';
      sidebarMenuHtml = `
        <li class="sidebar-item ${!subpage || subpage === 'dashboard' ? 'active' : ''}">
          <a href="#/recruiter/dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'jobs' ? 'active' : ''}">
          <a href="#/recruiter/jobs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Manage Jobs</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'applications' ? 'active' : ''}">
          <a href="#/recruiter/applications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Applications</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'profile' ? 'active' : ''}">
          <a href="#/recruiter/profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </a>
        </li>
      `;
    } else if (role === 'admin') {
      topRoleLabel = 'Administrator';
      sidebarMenuHtml = `
        <li class="sidebar-item ${!subpage || subpage === 'dashboard' ? 'active' : ''}">
          <a href="#/admin/dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'users' ? 'active' : ''}">
          <a href="#/admin/users">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
            </svg>
            <span>Manage Users</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'jobs' ? 'active' : ''}">
          <a href="#/admin/jobs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>Manage Jobs</span>
          </a>
        </li>
        <li class="sidebar-item ${subpage === 'applications' ? 'active' : ''}">
          <a href="#/admin/applications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>Applications</span>
          </a>
        </li>
      `;
    }

    appEl.innerHTML = `
      <div class="dashboard-layout">
        <!-- Dark Navy Sidebar -->
        <aside class="dash-sidebar">
          <a href="#/" class="sidebar-logo">
            <div class="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <span>JobHub</span>
          </a>

          <ul class="sidebar-menu">
            ${sidebarMenuHtml}
          </ul>

          <div class="sidebar-footer">
            <ul class="sidebar-menu">
              <li class="sidebar-item">
                <a href="javascript:void(0)" onclick="App.logout()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </a>
              </li>
            </ul>
          </div>
        </aside>

        <!-- Main Dashboard Content -->
        <div class="dash-main">
          <!-- Topbar -->
          <header class="dash-topbar">
            <div class="topbar-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" placeholder="Search..." onkeypress="if(event.key==='Enter') App.showToast('Global search query submitted', 'info')">
            </div>

            <div class="topbar-profile">
              <div class="topbar-user-info">
                <div class="topbar-user-name">${this.escape(this.currentUser.first_name + ' ' + this.currentUser.last_name)}</div>
                <div class="topbar-user-role">${topRoleLabel}</div>
              </div>
              <div class="user-avatar-circle">${this.currentUser.first_name[0]}</div>
            </div>
          </header>

          <!-- Dashboard Body Area -->
          <div id="dash-body-content" class="dash-body"></div>
        </div>
      </div>
    `;

    // Render inner page
    if (role === 'candidate') {
      if (!subpage || subpage === 'dashboard') this.renderCandidateDashboard();
      else if (subpage === 'applications') this.renderCandidateApplications();
      else if (subpage === 'profile') this.renderCandidateProfile();
    } else if (role === 'recruiter') {
      if (!subpage || subpage === 'dashboard') this.renderRecruiterDashboard();
      else if (subpage === 'jobs') this.renderRecruiterJobs();
      else if (subpage === 'applications') this.renderRecruiterApplications();
      else if (subpage === 'profile') this.renderRecruiterProfile();
    } else if (role === 'admin') {
      if (!subpage || subpage === 'dashboard') this.renderAdminDashboard();
      else if (subpage === 'users') this.renderAdminUsers();
      else if (subpage === 'jobs') this.renderAdminJobs();
      else if (subpage === 'applications') this.renderAdminApplications();
    }
  },

  /* ========================================================================
     SCREEN 6: Candidate Dashboard View
     ======================================================================== */
  async renderCandidateDashboard() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading candidate dashboard...</p>`;

    try {
      const res = await API.getCandidateDashboard();
      const stats = res.stats || { totalApplications: 0, inReview: 0, interviews: 0, rejected: 0 };
      const recent = res.recentApplications || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>Candidate Dashboard</h1>
            <p>Here is your job application process.</p>
          </div>
        </div>

        <!-- 4 Stat Cards matching Screen 6 -->
        <div class="stats-cards-grid">
          <div class="stat-card stat-purple">
            <div class="stat-card-header">
              <span>Total Application</span>
              <span>📈</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${stats.totalApplications}</div>
              <svg class="stat-sparkline" viewBox="0 0 60 28" fill="none">
                <path d="M2 24 L18 16 L34 20 L58 4" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"></path>
              </svg>
            </div>
          </div>

          <div class="stat-card stat-blue">
            <div class="stat-card-header">
              <span>In Review</span>
              <span>🔄</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${stats.inReview}</div>
              <svg class="stat-sparkline" viewBox="0 0 60 28" fill="none">
                <path d="M2 18 L18 22 L34 12 L58 8" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"></path>
              </svg>
            </div>
          </div>

          <div class="stat-card stat-green">
            <div class="stat-card-header">
              <span>Interviews</span>
              <span>📅</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${stats.interviews}</div>
              <svg class="stat-sparkline" viewBox="0 0 60 28" fill="none">
                <path d="M2 22 L18 14 L34 16 L58 6" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"></path>
              </svg>
            </div>
          </div>

          <div class="stat-card stat-red">
            <div class="stat-card-header">
              <span>Rejected</span>
              <span>✕</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${stats.rejected}</div>
              <svg class="stat-sparkline" viewBox="0 0 60 28" fill="none">
                <path d="M2 10 L18 16 L34 14 L58 24" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Two Columns: Recent Applications + Application History Chart -->
        <div class="candidate-dash-grid">
          <div class="dash-panel">
            <div class="dash-panel-header">
              <h3>Recent Applications</h3>
              <a href="#/candidate/applications" class="view-all-link" style="font-size:0.85rem;">View All</a>
            </div>

            <div class="custom-table-container">
              <table class="dash-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Applied Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${recent.length > 0 ? recent.map(app => `
                    <tr>
                      <td style="font-weight:600;">${this.escape(app.job_title)}</td>
                      <td>${this.escape(app.company_name)}</td>
                      <td style="color:#64748b;">${this.escape(app.applied_date)}</td>
                    </tr>
                  `).join('') : `<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No applications yet.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="dash-panel">
            <div class="dash-panel-header">
              <h3>Application History</h3>
            </div>
            <div style="padding: 1rem 0; display:flex; flex-direction:column; align-items:center;">
              <svg width="100%" height="180" viewBox="0 0 360 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#cf8a3c" stop-opacity="0.3"></stop>
                    <stop offset="100%" stop-color="#cf8a3c" stop-opacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path d="M 10 140 Q 60 120, 100 130 T 190 70 T 280 90 T 350 40 L 350 170 L 10 170 Z" fill="url(#chartGrad)"></path>
                <path d="M 10 140 Q 60 120, 100 130 T 190 70 T 280 90 T 350 40" fill="none" stroke="#cf8a3c" stroke-width="3" stroke-linecap="round"></path>
                <circle cx="10" cy="140" r="4" fill="#cf8a3c"></circle>
                <circle cx="100" cy="130" r="4" fill="#cf8a3c"></circle>
                <circle cx="190" cy="70" r="4" fill="#cf8a3c"></circle>
                <circle cx="280" cy="90" r="4" fill="#cf8a3c"></circle>
                <circle cx="350" cy="40" r="5" fill="#cf8a3c"></circle>
              </svg>
              <div style="display:flex; justify-content:space-between; width:100%; font-size:0.75rem; color:#94a3b8; padding-top:0.5rem;">
                <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load candidate dashboard.</p>`;
    }
  },

  /* ========================================================================
     SCREEN 7: Candidate "My Applications" View
     ======================================================================== */
  async renderCandidateApplications() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading applications...</p>`;

    try {
      const res = await API.getMyApplications();
      const apps = res.applications || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>My Applications</h1>
            <p>Track all jobs you have applied for and their current review status.</p>
          </div>
        </div>

        <div class="dash-panel">
          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${apps.length > 0 ? apps.map(app => `
                  <tr>
                    <td style="font-weight:700;">${this.escape(app.job_title)}</td>
                    <td>${this.escape(app.company_name)}</td>
                    <td style="color:#64748b;">${this.escape(app.applied_date)}</td>
                    <td>
                      <span class="status-badge ${this.getStatusBadgeClass(app.status)}">${this.escape(app.status)}</span>
                    </td>
                    <td>
                      <button class="table-action-btn btn-table-view" onclick="App.viewMyApplicationModal(${app.id}, '${this.escape(app.job_title)}')">🔍 View</button>
                      <button class="table-action-btn btn-table-cancel" onclick="App.handleCancelApplication(${app.id})">Cancel 🗑️</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="5" style="text-align:center; padding:3rem; color:#94a3b8;">You have not applied for any jobs yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load applications.</p>`;
    }
  },

  async handleCancelApplication(id) {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    try {
      const res = await API.cancelApplication(id);
      if (res.success) {
        this.showToast('Application withdrawn successfully', 'success');
        this.renderCandidateApplications();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to withdraw application', 'error');
    }
  },

  viewMyApplicationModal(appId, title) {
    this.showModal(`Application Details: ${title}`, `
      <div style="line-height:1.8;">
        <p><strong>Status:</strong> <span class="status-badge badge-interview">Under Review</span></p>
        <p style="margin-top:0.75rem;"><strong>Uploaded CV:</strong> <a href="/api/applications/${appId}/resume" target="_blank" style="color:var(--accent-gold); font-weight:600; text-decoration:underline;">Download/View Submitted Resume 📄</a></p>
        <p style="margin-top:0.75rem; color:#64748b; font-size:0.9rem;">The hiring team is currently evaluating your profile. You will receive updates as your application progresses.</p>
      </div>
    `, `<button class="btn-gold" onclick="App.closeModal()">Close</button>`);
  },

  /* ========================================================================
     Candidate Profile View
     ======================================================================== */
  async renderCandidateProfile() {
    const bodyEl = document.getElementById('dash-body-content');
    const u = this.currentUser;

    bodyEl.innerHTML = `
      <div class="dash-header-banner">
        <div class="dash-header-text">
          <h1>Profile Management</h1>
          <p>Update your personal information and default CV/Resume.</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:2rem;">
        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Personal Information</h3>
          </div>
          <form onsubmit="event.preventDefault(); App.handleCandidateProfileUpdate();" style="display:flex; flex-direction:column; gap:1rem;">
            <div class="form-row-dual">
              <div>
                <label class="form-label">First Name</label>
                <input type="text" id="prof-firstname" class="filter-input" value="${this.escape(u.first_name || '')}" required>
              </div>
              <div>
                <label class="form-label">Last Name</label>
                <input type="text" id="prof-lastname" class="filter-input" value="${this.escape(u.last_name || '')}" required>
              </div>
            </div>

            <div>
              <label class="form-label">Phone Number</label>
              <input type="text" id="prof-phone" class="filter-input" value="${this.escape(u.phone || '')}">
            </div>

            <div>
              <label class="form-label">Location / City</label>
              <input type="text" id="prof-location" class="filter-input" value="${this.escape(u.location || '')}">
            </div>

            <div>
              <label class="form-label">Professional Headline</label>
              <input type="text" id="prof-headline" class="filter-input" value="${this.escape(u.headline || '')}" placeholder="e.g. Senior Data Analyst & Python Engineer">
            </div>

            <div>
              <label class="form-label">Bio / Summary</label>
              <textarea id="prof-bio" class="filter-input" rows="3">${this.escape(u.bio || '')}</textarea>
            </div>

            <button type="submit" class="btn-gold" style="align-self:flex-start; margin-top:0.5rem;">Save Changes</button>
          </form>
        </div>

        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Default CV / Resume</h3>
          </div>
          <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; padding:1.5rem; text-align:center; margin-bottom:1.5rem;">
            ${u.resume_path ? `
              <div style="font-size:2.5rem; margin-bottom:0.5rem;">📄</div>
              <div style="font-weight:700; color:var(--primary-navy); margin-bottom:0.25rem;">${this.escape(u.resume_original_name || 'Resume.pdf')}</div>
              <div style="font-size:0.85rem; color:#64748b; margin-bottom:1rem;">Ready for instant 1-click applications</div>
              <a href="/api/user/resume" target="_blank" class="btn-table-view" style="padding:0.4rem 1rem; border-radius:9999px;">View / Download</a>
            ` : `
              <div style="font-size:2.5rem; color:#94a3b8; margin-bottom:0.5rem;">📁</div>
              <div style="font-size:0.9rem; color:#64748b;">No resume uploaded yet.</div>
            `}
          </div>

          <form onsubmit="event.preventDefault(); App.handleCandidateResumeUpload();" style="display:flex; flex-direction:column; gap:0.75rem;">
            <label class="form-label">Upload New Resume (PDF, DOC, DOCX):</label>
            <input type="file" id="prof-new-resume" accept=".pdf,.doc,.docx" class="filter-input" required>
            <button type="submit" class="btn-gold" style="align-self:flex-start;">Upload & Save</button>
          </form>
        </div>
      </div>
    `;
  },

  async handleCandidateProfileUpdate() {
    const first_name = document.getElementById('prof-firstname').value.trim();
    const last_name = document.getElementById('prof-lastname').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const location = document.getElementById('prof-location').value.trim();
    const headline = document.getElementById('prof-headline').value.trim();
    const bio = document.getElementById('prof-bio').value.trim();

    try {
      const res = await API.updateCandidateProfile({ first_name, last_name, phone, location, headline, bio });
      if (res.success) {
        this.currentUser = { ...this.currentUser, ...res.user };
        API.setCurrentUser(this.currentUser);
        this.showToast('Profile updated successfully!', 'success');
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to update profile', 'error');
    }
  },

  async handleCandidateResumeUpload() {
    const fileInput = document.getElementById('prof-new-resume');
    if (!fileInput.files[0]) return;

    const fd = new FormData();
    fd.append('resume', fileInput.files[0]);

    try {
      const res = await API.uploadCandidateResume(fd);
      if (res.success) {
        this.showToast('Resume uploaded successfully!', 'success');
        const meRes = await API.getMe();
        if (meRes.success) {
          this.currentUser = meRes.user;
          API.setCurrentUser(meRes.user);
          this.renderCandidateProfile();
        }
      }
    } catch (e) {
      this.showToast(e.message || 'Upload failed', 'error');
    }
  },

  /* ========================================================================
     SCREEN 8: Recruiter Dashboard View
     ======================================================================== */
  async renderRecruiterDashboard() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading recruiter dashboard...</p>`;

    try {
      const res = await API.getCompanyDashboard();
      const stats = res.stats || { totalJobs: 0, totalApplications: 0, interviewsCount: 0, hiredCount: 0 };
      const recent = res.recentApplications || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>Recruiter Dashboard</h1>
            <p>Manage jobs, see applications, and conduct interviews.</p>
          </div>
          <button class="btn-gold" onclick="App.openAddJobModal()">+ Add Job</button>
        </div>

        <!-- 4 Stat Cards matching Screen 8 -->
        <div class="stats-cards-grid">
          <div class="stat-card stat-bg-green">
            <div class="stat-card-header">
              <span>Total Jobs</span>
              <span style="color:#2e7d32; font-size:1.2rem;">💼</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number" style="color:#2e7d32;">${stats.totalJobs}</div>
            </div>
          </div>

          <div class="stat-card stat-bg-orange">
            <div class="stat-card-header">
              <span>Applications</span>
              <span style="color:#e65100; font-size:1.2rem;">📄</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number" style="color:#e65100;">${stats.totalApplications}</div>
            </div>
          </div>

          <div class="stat-card stat-bg-blue">
            <div class="stat-card-header">
              <span>Interviews</span>
              <span style="color:#1565c0; font-size:1.2rem;">👥</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number" style="color:#1565c0;">${stats.interviewsCount}</div>
            </div>
          </div>

          <div class="stat-card stat-bg-green">
            <div class="stat-card-header">
              <span>Hired</span>
              <span style="color:#2e7d32; font-size:1.2rem;">✓</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number" style="color:#2e7d32;">${stats.hiredCount}</div>
            </div>
          </div>
        </div>

        <!-- Recent Applications Table -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <h3>Recent Applications</h3>
            <a href="#/recruiter/applications" class="view-all-link" style="font-size:0.85rem;">View All</a>
          </div>

          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Title</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recent.length > 0 ? recent.map(app => `
                  <tr>
                    <td style="font-weight:700;">${this.escape(app.candidate)}</td>
                    <td>${this.escape(app.job_title)}</td>
                    <td style="color:#64748b;">${this.escape(app.applied_date)}</td>
                    <td>
                      <span class="status-badge ${this.getStatusBadgeClass(app.status)}">${this.escape(app.status)}</span>
                    </td>
                    <td>
                      <a href="/api/applications/${app.id}/resume" target="_blank" class="table-action-btn btn-table-view">CV 📄</a>
                      <button class="table-action-btn btn-table-edit" onclick="App.openUpdateStatusModal(${app.id}, '${this.escape(app.candidate)}', '${app.status}')">Status</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="5" style="text-align:center; padding:2.5rem; color:#94a3b8;">No applications received yet.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load recruiter dashboard.</p>`;
    }
  },

  /* ========================================================================
     SCREEN 9: Recruiter "Manage Jobs" View
     ======================================================================== */
  async renderRecruiterJobs() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading company jobs...</p>`;

    try {
      const res = await API.getCompanyJobs();
      const jobs = res.jobs || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>Manage Jobs</h1>
            <p>View, edit, or create your company's open job vacancies.</p>
          </div>
          <button class="btn-gold" onclick="App.openAddJobModal()">+ Add Job</button>
        </div>

        <div class="dash-panel">
          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Applicants</th>
                  <th>Postings</th>
                  <th>Applications</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.length > 0 ? jobs.map(job => `
                  <tr>
                    <td style="font-weight:700;">${this.escape(job.title)}</td>
                    <td>${job.applicants_count}</td>
                    <td>${job.open_positions}</td>
                    <td>${job.applications_count}</td>
                    <td>
                      <span class="status-badge ${job.status === 'Active' ? 'badge-active' : 'badge-rejected'}">${this.escape(job.status)}</span>
                    </td>
                    <td>
                      <button class="table-action-btn btn-table-edit" onclick="App.openEditJobModal(${job.id})">Edit</button>
                      <button class="table-action-btn btn-table-view" onclick="window.location.hash='#/recruiter/applications?job_id=${job.id}'">View Candidates</button>
                      <button class="table-action-btn btn-table-cancel" onclick="App.handleDeleteJob(${job.id})">Delete</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="6" style="text-align:center; padding:3rem; color:#94a3b8;">No jobs posted yet. Click "+ Add Job" above to create your first posting.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Suggestion Banner matching bottom of Screen 9 -->
        <div class="suggestion-banner-box">
          <div class="suggestion-content">
            <div class="suggestion-icon">🎉</div>
            <div class="suggestion-text">
              <h4>New Job Post</h4>
              <p>Suggestion banner for your new Job advert to attract top qualified talent.</p>
            </div>
          </div>
          <button class="btn-gold" onclick="App.openAddJobModal()">Post New Job</button>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load jobs.</p>`;
    }
  },

  openAddJobModal() {
    const contentHtml = `
      <form id="add-job-form" onsubmit="event.preventDefault(); App.handleAddJobSubmit();" style="display:flex; flex-direction:column; gap:1rem;">
        <div>
          <label class="form-label">Job Title *</label>
          <input type="text" id="add-job-title" class="filter-input" placeholder="e.g. Senior Backend Engineer" required>
        </div>

        <div class="form-row-dual">
          <div>
            <label class="form-label">Location *</label>
            <input type="text" id="add-job-location" class="filter-input" placeholder="e.g. Kolkata or Remote" required>
          </div>
          <div>
            <label class="form-label">Job Type *</label>
            <select id="add-job-type" class="filter-select">
              <option value="Full Time">Full Time</option>
              <option value="Part Time">Part Time</option>
              <option value="Remote">Remote</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>

        <div class="form-row-dual">
          <div>
            <label class="form-label">Department *</label>
            <select id="add-job-dept" class="filter-select">
              <option value="IT">IT</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
          <div>
            <label class="form-label">Open Positions</label>
            <input type="number" id="add-job-positions" class="filter-input" value="1" min="1">
          </div>
        </div>

        <div class="form-row-dual">
          <div>
            <label class="form-label">Salary Range</label>
            <input type="text" id="add-job-salary" class="filter-input" placeholder="e.g. $60,000 - $80,000 / year">
          </div>
          <div>
            <label class="form-label">Application Deadline</label>
            <input type="text" id="add-job-deadline" class="filter-input" placeholder="e.g. 30 Oct 2026">
          </div>
        </div>

        <div>
          <label class="form-label">Skills Required (comma-separated) *</label>
          <input type="text" id="add-job-skills" class="filter-input" placeholder="e.g. Python, SQL, Docker" required>
        </div>

        <div>
          <label class="form-label">Job Description *</label>
          <textarea id="add-job-desc" class="filter-input" rows="3" placeholder="Overview of the role..." required></textarea>
        </div>

        <div>
          <label class="form-label">Job Requirements *</label>
          <textarea id="add-job-reqs" class="filter-input" rows="3" placeholder="Enter key requirements (one per line)..." required></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button type="button" class="btn-filter-reset" onclick="App.closeModal()">Cancel</button>
      <button type="submit" form="add-job-form" class="btn-gold">Publish Job</button>
    `;

    this.showModal('Create New Job Posting', contentHtml, footerHtml);
  },

  async handleAddJobSubmit() {
    const title = document.getElementById('add-job-title').value.trim();
    const location = document.getElementById('add-job-location').value.trim();
    const job_type = document.getElementById('add-job-type').value;
    const department = document.getElementById('add-job-dept').value;
    const open_positions = document.getElementById('add-job-positions').value;
    const salary_range = document.getElementById('add-job-salary').value.trim();
    const deadline_date = document.getElementById('add-job-deadline').value.trim();
    const skills = document.getElementById('add-job-skills').value.trim();
    const description = document.getElementById('add-job-desc').value.trim();
    const requirements = document.getElementById('add-job-reqs').value.trim();

    try {
      const res = await API.createJob({
        title, location, job_type, department, open_positions, salary_range, deadline_date, skills, description, requirements
      });

      if (res.success) {
        this.closeModal();
        this.showToast('Job posting published successfully!', 'success');
        if (this.currentRoute.includes('recruiter/jobs')) {
          this.renderRecruiterJobs();
        } else {
          this.renderRecruiterDashboard();
        }
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to post job', 'error');
    }
  },

  async openEditJobModal(jobId) {
    try {
      const res = await API.getJob(jobId);
      const j = res.job;

      const contentHtml = `
        <form id="edit-job-form" onsubmit="event.preventDefault(); App.handleEditJobSubmit(${jobId});" style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label class="form-label">Job Title *</label>
            <input type="text" id="edit-job-title" class="filter-input" value="${this.escape(j.title)}" required>
          </div>

          <div class="form-row-dual">
            <div>
              <label class="form-label">Location</label>
              <input type="text" id="edit-job-location" class="filter-input" value="${this.escape(j.location)}" required>
            </div>
            <div>
              <label class="form-label">Job Type</label>
              <select id="edit-job-type" class="filter-select">
                <option value="Full Time" ${j.job_type === 'Full Time' ? 'selected' : ''}>Full Time</option>
                <option value="Part Time" ${j.job_type === 'Part Time' ? 'selected' : ''}>Part Time</option>
                <option value="Remote" ${j.job_type === 'Remote' ? 'selected' : ''}>Remote</option>
                <option value="Internship" ${j.job_type === 'Internship' ? 'selected' : ''}>Internship</option>
              </select>
            </div>
          </div>

          <div class="form-row-dual">
            <div>
              <label class="form-label">Status</label>
              <select id="edit-job-status" class="filter-select">
                <option value="Active" ${j.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Closed" ${j.status === 'Closed' ? 'selected' : ''}>Closed</option>
              </select>
            </div>
            <div>
              <label class="form-label">Open Positions</label>
              <input type="number" id="edit-job-positions" class="filter-input" value="${j.open_positions}">
            </div>
          </div>

          <div>
            <label class="form-label">Skills (comma-separated)</label>
            <input type="text" id="edit-job-skills" class="filter-input" value="${this.escape(j.skills)}">
          </div>

          <div>
            <label class="form-label">Description</label>
            <textarea id="edit-job-desc" class="filter-input" rows="3">${this.escape(j.description)}</textarea>
          </div>
        </form>
      `;

      const footerHtml = `
        <button type="button" class="btn-filter-reset" onclick="App.closeModal()">Cancel</button>
        <button type="submit" form="edit-job-form" class="btn-gold">Save Changes</button>
      `;

      this.showModal(`Edit Job: ${j.title}`, contentHtml, footerHtml);
    } catch (e) {
      this.showToast('Failed to load job for editing', 'error');
    }
  },

  async handleEditJobSubmit(jobId) {
    const title = document.getElementById('edit-job-title').value.trim();
    const location = document.getElementById('edit-job-location').value.trim();
    const job_type = document.getElementById('edit-job-type').value;
    const status = document.getElementById('edit-job-status').value;
    const open_positions = document.getElementById('edit-job-positions').value;
    const skills = document.getElementById('edit-job-skills').value.trim();
    const description = document.getElementById('edit-job-desc').value.trim();

    try {
      const res = await API.updateJob(jobId, { title, location, job_type, status, open_positions, skills, description });
      if (res.success) {
        this.closeModal();
        this.showToast('Job updated successfully', 'success');
        this.renderRecruiterJobs();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to update job', 'error');
    }
  },

  async handleDeleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job posting? This cannot be undone.')) return;
    try {
      const res = await API.deleteJob(jobId);
      if (res.success) {
        this.showToast('Job posting deleted', 'success');
        this.renderRecruiterJobs();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to delete job', 'error');
    }
  },

  /* ========================================================================
     Recruiter "Applications Review" View
     ======================================================================== */
  async renderRecruiterApplications() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading received applications...</p>`;

    try {
      const res = await API.getCompanyApplications();
      const apps = res.applications || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>Candidate Applications</h1>
            <p>Review applicants, evaluate resumes, and update hiring statuses.</p>
          </div>
        </div>

        <div class="dash-panel">
          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Title</th>
                  <th>Email / Phone</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${apps.length > 0 ? apps.map(app => `
                  <tr>
                    <td>
                      <div style="font-weight:700;">${this.escape(app.full_name)}</div>
                      <div style="font-size:0.8rem; color:#64748b;">${this.escape(app.candidate_headline || 'Candidate')}</div>
                    </td>
                    <td>${this.escape(app.job_title)}</td>
                    <td style="font-size:0.85rem;">
                      <div>${this.escape(app.email)}</div>
                      <div style="color:#64748b;">${this.escape(app.phone || '')}</div>
                    </td>
                    <td style="color:#64748b;">${this.escape(app.applied_date)}</td>
                    <td>
                      <span class="status-badge ${this.getStatusBadgeClass(app.status)}">${this.escape(app.status)}</span>
                    </td>
                    <td>
                      <a href="/api/applications/${app.id}/resume" target="_blank" class="table-action-btn btn-table-view">View CV 📄</a>
                      <button class="table-action-btn btn-table-edit" onclick="App.openUpdateStatusModal(${app.id}, '${this.escape(app.full_name)}', '${app.status}', '${this.escape(app.notes || '')}')">Update</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="6" style="text-align:center; padding:3rem; color:#94a3b8;">No applications found.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load applications.</p>`;
    }
  },

  openUpdateStatusModal(appId, candidateName, currentStatus, currentNotes = '') {
    const statuses = ['Applied', 'In Review', 'Interview', 'Shortlisted', 'Hired', 'Rejected'];

    const contentHtml = `
      <form id="update-status-form" onsubmit="event.preventDefault(); App.handleUpdateStatusSubmit(${appId});" style="display:flex; flex-direction:column; gap:1.25rem;">
        <div>
          <label class="form-label">Recruitment Status</label>
          <select id="app-status-select" class="filter-select">
            ${statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="form-label">Internal Recruiter Notes</label>
          <textarea id="app-notes-input" class="filter-input" rows="3" placeholder="Add interview feedback or notes...">${this.escape(currentNotes)}</textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <button type="button" class="btn-filter-reset" onclick="App.closeModal()">Cancel</button>
      <button type="submit" form="update-status-form" class="btn-gold">Update Status</button>
    `;

    this.showModal(`Update Application: ${candidateName}`, contentHtml, footerHtml);
  },

  async handleUpdateStatusSubmit(appId) {
    const status = document.getElementById('app-status-select').value;
    const notes = document.getElementById('app-notes-input').value.trim();

    try {
      const res = await API.updateApplicationStatus(appId, status, notes);
      if (res.success) {
        this.closeModal();
        this.showToast(`Application marked as ${status}`, 'success');
        if (this.currentRoute.includes('recruiter/applications')) {
          this.renderRecruiterApplications();
        } else if (this.currentRoute.includes('admin/applications')) {
          this.renderAdminApplications();
        } else {
          this.renderRecruiterDashboard();
        }
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to update status', 'error');
    }
  },

  /* ========================================================================
     Recruiter Company Profile View
     ======================================================================== */
  renderRecruiterProfile() {
    const bodyEl = document.getElementById('dash-body-content');
    const u = this.currentUser;

    bodyEl.innerHTML = `
      <div class="dash-header-banner">
        <div class="dash-header-text">
          <h1>Company Profile</h1>
          <p>Manage employer brand and organization information.</p>
        </div>
      </div>

      <div class="dash-panel" style="max-width:800px;">
        <form onsubmit="event.preventDefault(); App.handleRecruiterProfileUpdate();" style="display:flex; flex-direction:column; gap:1.25rem;">
          <div>
            <label class="form-label">Company Name *</label>
            <input type="text" id="comp-name" class="filter-input" value="${this.escape(u.company_name || '')}" required>
          </div>

          <div class="form-row-dual">
            <div>
              <label class="form-label">Primary Contact Person</label>
              <input type="text" id="comp-contact" class="filter-input" value="${this.escape(u.first_name + ' ' + u.last_name)}">
            </div>
            <div>
              <label class="form-label">Phone Number</label>
              <input type="text" id="comp-phone" class="filter-input" value="${this.escape(u.phone || '')}">
            </div>
          </div>

          <div>
            <label class="form-label">Headquarters / Location</label>
            <input type="text" id="comp-location" class="filter-input" value="${this.escape(u.location || '')}">
          </div>

          <div>
            <label class="form-label">Company Bio & Overview</label>
            <textarea id="comp-bio" class="filter-input" rows="4">${this.escape(u.bio || '')}</textarea>
          </div>

          <button type="submit" class="btn-gold" style="align-self:flex-start;">Save Profile</button>
        </form>
      </div>
    `;
  },

  async handleRecruiterProfileUpdate() {
    const company_name = document.getElementById('comp-name').value.trim();
    const phone = document.getElementById('comp-phone').value.trim();
    const location = document.getElementById('comp-location').value.trim();
    const bio = document.getElementById('comp-bio').value.trim();

    try {
      const res = await API.updateCompanyProfile({ company_name, phone, location, bio });
      if (res.success) {
        this.currentUser = { ...this.currentUser, ...res.company };
        API.setCurrentUser(this.currentUser);
        this.showToast('Company profile saved successfully', 'success');
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to update company profile', 'error');
    }
  },

  /* ========================================================================
     ADMIN DASHBOARD & MANAGEMENT (Highest Privileged Role)
     ======================================================================== */
  async renderAdminDashboard() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading system administrator statistics...</p>`;

    try {
      const res = await API.getAdminStats();
      const s = res.stats;

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>System Administrator Dashboard</h1>
            <p>Overall platform health, user accounts, company profiles, and global applications.</p>
          </div>
          <button class="btn-gold" onclick="App.openAdminCreateUserModal()">+ Add New User / Company</button>
        </div>

        <div class="stats-cards-grid">
          <div class="stat-card stat-blue">
            <div class="stat-card-header">
              <span>Total Users</span>
              <span>👥</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${s.totalUsers}</div>
              <span style="font-size:0.85rem; color:#64748b;">${s.totalCandidates} Candidates / ${s.totalCompanies} Companies</span>
            </div>
          </div>

          <div class="stat-card stat-purple">
            <div class="stat-card-header">
              <span>Active Job Postings</span>
              <span>💼</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${s.activeJobs}</div>
              <span style="font-size:0.85rem; color:#64748b;">Total: ${s.totalJobs}</span>
            </div>
          </div>

          <div class="stat-card stat-green">
            <div class="stat-card-header">
              <span>Total Applications</span>
              <span>📄</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${s.totalApplications}</div>
            </div>
          </div>

          <div class="stat-card stat-orange">
            <div class="stat-card-header">
              <span>Account Status</span>
              <span>🛡️</span>
            </div>
            <div class="stat-card-value-row">
              <div class="stat-number">${s.activeAccounts}</div>
              <span style="font-size:0.85rem; color:#ef4444;">${s.disabledAccounts} Disabled</span>
            </div>
          </div>
        </div>

        <div class="candidate-dash-grid">
          <div class="dash-panel">
            <div class="dash-panel-header">
              <h3>Quick Administrative Actions</h3>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              <a href="#/admin/users" class="btn-gold" style="border-radius:8px;">Manage All Users & Permissions</a>
              <a href="#/admin/jobs" class="btn-table-edit" style="padding:0.75rem 1rem; border-radius:8px; font-weight:600;">Manage All Global Jobs</a>
              <a href="#/admin/applications" class="btn-table-view" style="padding:0.75rem 1rem; border-radius:8px; font-weight:600;">View & Manage All Applications</a>
            </div>
          </div>

          <div class="dash-panel">
            <div class="dash-panel-header">
              <h3>Application Breakdown</h3>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${s.statusBreakdown && s.statusBreakdown.length > 0 ? s.statusBreakdown.map(st => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid #f1f5f9;">
                  <span class="status-badge ${this.getStatusBadgeClass(st.status)}">${st.status}</span>
                  <span style="font-weight:700; color:var(--primary-navy);">${st.count}</span>
                </div>
              `).join('') : '<p style="color:#94a3b8;">No applications recorded yet.</p>'}
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load admin stats.</p>`;
    }
  },

  async renderAdminUsers() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading user directory...</p>`;

    try {
      const res = await API.getAdminUsers();
      const users = res.users || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>User & Role Management</h1>
            <p>Admin control over accounts, roles, activation status, and data.</p>
          </div>
          <button class="btn-gold" onclick="App.openAdminCreateUserModal()">+ Add User</button>
        </div>

        <div class="dash-panel">
          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Organization</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td style="font-weight:700;">${this.escape(u.first_name + ' ' + u.last_name)}</td>
                    <td>${this.escape(u.email)}</td>
                    <td>
                      <span class="status-badge ${u.role === 'ADMIN' ? 'badge-rejected' : u.role === 'COMPANY' ? 'badge-interview' : 'badge-applied'}">${u.role}</span>
                    </td>
                    <td>${this.escape(u.company_name || '-')}</td>
                    <td>
                      <span class="status-badge ${u.is_active ? 'badge-active' : 'badge-rejected'}">
                        ${u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      ${u.id !== this.currentUser.id ? `
                        <button class="table-action-btn ${u.is_active ? 'btn-table-cancel' : 'btn-table-view'}" onclick="App.handleToggleUserStatus(${u.id})">
                          ${u.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button class="table-action-btn btn-table-cancel" onclick="App.handleAdminDeleteUser(${u.id})">Delete</button>
                      ` : '<span style="font-size:0.8rem; color:#64748b;">Current Account</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load user directory.</p>`;
    }
  },

  openAdminCreateUserModal() {
    const contentHtml = `
      <form id="admin-create-user-form" onsubmit="event.preventDefault(); App.handleAdminCreateUserSubmit();" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-row-dual">
          <div>
            <label class="form-label">First Name *</label>
            <input type="text" id="adm-user-fname" class="filter-input" required>
          </div>
          <div>
            <label class="form-label">Last Name *</label>
            <input type="text" id="adm-user-lname" class="filter-input" required>
          </div>
        </div>

        <div>
          <label class="form-label">Email Address *</label>
          <input type="email" id="adm-user-email" class="filter-input" required>
        </div>

        <div>
          <label class="form-label">Password *</label>
          <input type="password" id="adm-user-password" class="filter-input" required minlength="6">
        </div>

        <div class="form-row-dual">
          <div>
            <label class="form-label">Role *</label>
            <select id="adm-user-role" class="filter-select">
              <option value="USER">USER (Candidate)</option>
              <option value="COMPANY">COMPANY (Employer)</option>
              <option value="ADMIN">ADMIN (Administrator)</option>
            </select>
          </div>
          <div>
            <label class="form-label">Company / Organization</label>
            <input type="text" id="adm-user-company" class="filter-input" placeholder="If role is COMPANY">
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <button type="button" class="btn-filter-reset" onclick="App.closeModal()">Cancel</button>
      <button type="submit" form="admin-create-user-form" class="btn-gold">Create Account</button>
    `;

    this.showModal('Create User or Company Account', contentHtml, footerHtml);
  },

  async handleAdminCreateUserSubmit() {
    const first_name = document.getElementById('adm-user-fname').value.trim();
    const last_name = document.getElementById('adm-user-lname').value.trim();
    const email = document.getElementById('adm-user-email').value.trim();
    const password = document.getElementById('adm-user-password').value;
    const role = document.getElementById('adm-user-role').value;
    const company_name = document.getElementById('adm-user-company').value.trim();

    try {
      const res = await API.createAdminUser({ first_name, last_name, email, password, role, company_name });
      if (res.success) {
        this.closeModal();
        this.showToast(`Account created for ${email}`, 'success');
        this.renderAdminUsers();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to create user', 'error');
    }
  },

  async handleToggleUserStatus(userId) {
    try {
      const res = await API.toggleUserStatus(userId);
      if (res.success) {
        this.showToast(res.message, 'success');
        this.renderAdminUsers();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to update account status', 'error');
    }
  },

  async handleAdminDeleteUser(userId) {
    if (!confirm('Are you sure you want to delete this account and all associated jobs/applications?')) return;
    try {
      const res = await API.deleteAdminUser(userId);
      if (res.success) {
        this.showToast('Account deleted successfully', 'success');
        this.renderAdminUsers();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to delete user', 'error');
    }
  },

  async renderAdminJobs() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading global jobs...</p>`;

    try {
      const res = await API.getAdminJobs();
      const jobs = res.jobs || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>Global Job Postings</h1>
            <p>Admin authority to review, edit, or delete any job posting on JobHub.</p>
          </div>
        </div>

        <div class="dash-panel">
          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Applicants</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.map(j => `
                  <tr>
                    <td style="font-weight:700;">${this.escape(j.title)}</td>
                    <td>${this.escape(j.company_name)}</td>
                    <td>${this.escape(j.location)}</td>
                    <td>
                      <span class="status-badge ${j.status === 'Active' ? 'badge-active' : 'badge-rejected'}">${j.status}</span>
                    </td>
                    <td>${j.applicants_count}</td>
                    <td>
                      <button class="table-action-btn btn-table-edit" onclick="App.openEditJobModal(${j.id})">Edit</button>
                      <button class="table-action-btn btn-table-cancel" onclick="App.handleAdminDeleteJob(${j.id})">Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load jobs.</p>`;
    }
  },

  async handleAdminDeleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    try {
      const res = await API.deleteJob(jobId);
      if (res.success) {
        this.showToast('Job posting deleted', 'success');
        this.renderAdminJobs();
      }
    } catch (e) {
      this.showToast(e.message || 'Failed to delete job', 'error');
    }
  },

  async renderAdminApplications() {
    const bodyEl = document.getElementById('dash-body-content');
    bodyEl.innerHTML = `<p>Loading all applications...</p>`;

    try {
      const res = await API.getAdminApplications();
      const apps = res.applications || [];

      bodyEl.innerHTML = `
        <div class="dash-header-banner">
          <div class="dash-header-text">
            <h1>All Platform Applications</h1>
            <p>Admin overview of candidate submissions across all employers.</p>
          </div>
        </div>

        <div class="dash-panel">
          <div class="custom-table-container">
            <table class="dash-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${apps.map(a => `
                  <tr>
                    <td style="font-weight:700;">${this.escape(a.full_name)}</td>
                    <td>${this.escape(a.job_title)}</td>
                    <td>${this.escape(a.company_name)}</td>
                    <td style="color:#64748b;">${this.escape(a.applied_date)}</td>
                    <td>
                      <span class="status-badge ${this.getStatusBadgeClass(a.status)}">${a.status}</span>
                    </td>
                    <td>
                      <a href="/api/applications/${a.id}/resume" target="_blank" class="table-action-btn btn-table-view">CV 📄</a>
                      <button class="table-action-btn btn-table-edit" onclick="App.openUpdateStatusModal(${a.id}, '${this.escape(a.full_name)}', '${a.status}', '${this.escape(a.notes || '')}')">Status</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      bodyEl.innerHTML = `<p style="color:red;">Failed to load applications.</p>`;
    }
  },

  /* ========================================================================
     Helpers
     ======================================================================== */
  getStatusBadgeClass(status) {
    switch (status) {
      case 'Interview': return 'badge-interview';
      case 'Applied': return 'badge-applied';
      case 'In Review': return 'badge-interview';
      case 'Shortlisted': return 'badge-shortlisted';
      case 'Hired': return 'badge-hired';
      case 'Rejected': return 'badge-rejected';
      case 'Active': return 'badge-active';
      default: return 'badge-applied';
    }
  },

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
