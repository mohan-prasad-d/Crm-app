// ============================================================
// MINI CRM — app.js
// Complete SPA logic: routing, all modules, forms, charts
// ============================================================

'use strict';

// ============================================================
// STATE
// ============================================================
let currentPage = 'dashboard';
let editingId = null;
let editingModule = null;
let chartInstances = {};
let confirmCallback = null;
let authToken = null;
let currentUser = null;
let notificationPanelOpen = false;
let notifications = [];
let notificationCheckInterval = null;

// ============================================================
// ROUTER
// ============================================================
function showLoginPage() {
  const app = document.getElementById('app');
  const authScreen = document.getElementById('auth-screen');
  
  if (authScreen) {
    authScreen.style.display = 'flex';
  }
  
  if (app) {
    app.style.display = 'none';
  }
  
  // Setup login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.onsubmit = handleLogin;
    loginForm.reset();
    
    const usernameField = document.getElementById('username');
    if (usernameField) {
      setTimeout(() => usernameField.focus(), 100);
    }
  }

  // Setup signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.onsubmit = handleSignup;
    signupForm.reset();

    // Password strength indicator
    const passwordInput = document.getElementById('signup-password');
    const pwMeter = document.getElementById('signup-pw-meter');
    const pwBar = document.getElementById('signup-pw-bar');
    if (passwordInput && pwMeter && pwBar) {
      passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        if (val.length === 0) {
          pwMeter.style.display = 'none';
          return;
        }
        pwMeter.style.display = 'block';
        
        let strength = 0;
        if (val.length >= 6) strength += 20;
        if (val.length >= 10) strength += 20;
        if (/[A-Z]/.test(val)) strength += 20;
        if (/[0-9]/.test(val)) strength += 20;
        if (/[^A-Za-z0-9]/.test(val)) strength += 20;
        
        pwBar.style.width = strength + '%';
        if (strength < 40) {
          pwBar.style.backgroundColor = '#ef4444'; // Red
        } else if (strength < 80) {
          pwBar.style.backgroundColor = '#f59e0b'; // Amber
        } else {
          pwBar.style.backgroundColor = '#22c55e'; // Green
        }
      });
    }
  }

  // Default to login tab
  switchAuthTab('login');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (tab === 'login') {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    if (signupForm) signupForm.classList.remove('active');
    
    const usernameField = document.getElementById('username');
    if (usernameField) setTimeout(() => usernameField.focus(), 50);
  } else {
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabSignup) tabSignup.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.add('active');
    
    const signupFirstName = document.getElementById('signup-first-name');
    if (signupFirstName) setTimeout(() => signupFirstName.focus(), 50);
  }
}

async function showAppPage() {
  const authScreen = document.getElementById('auth-screen');
  const app = document.getElementById('app');
  
  if (authScreen) {
    authScreen.style.display = 'none';
  }
  
  if (app) {
    app.style.display = 'flex';
    app.style.width = '100%';
    app.style.height = '100%';
  }
  
  // Initialize global search now that #app is visible
  initGlobalSearch();

  // Ensure we load/update sidebar info
  if (authToken && !currentUser) {
    await loadCurrentUser();
  } else {
    updateSidebarUser();
  }
  
  // Start notification polling
  startNotificationPolling();
  
  navigate('dashboard');
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username')?.value?.trim();
  const password = document.getElementById('password')?.value;
  const button = e.target.querySelector('button[type="submit"]');
  
  if (!username || !password) {
    showToast('Please enter username and password', 'error');
    return;
  }
  
  if (button) button.disabled = true;
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (res.ok && data.token) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      currentUser = data.user || { username };
      showToast('✅ Logged in successfully!', 'success');
      setTimeout(() => showAppPage(), 500);
    } else {
      showToast('❌ ' + (data.message || 'Invalid credentials'), 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('❌ Login error: ' + err.message, 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function handleSignup(e) {
  e.preventDefault();

  const first_name = document.getElementById('signup-first-name')?.value?.trim();
  const last_name = document.getElementById('signup-last-name')?.value?.trim();
  const username = document.getElementById('signup-username')?.value?.trim();
  const email = document.getElementById('signup-email')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;
  const role = document.getElementById('signup-role')?.value;
  const button = e.target.querySelector('button[type="submit"]');

  if (!username || !email || !password) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  if (username.length < 3) {
    showToast('Username must be at least 3 characters long', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters long', 'error');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Creating Account...';
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        first_name,
        last_name,
        role
      })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      currentUser = data.user || { username, first_name, last_name, role };
      showToast('🎉 Account created successfully!', 'success');
      
      await loadCurrentUser();
      
      setTimeout(() => showAppPage(), 800);
    } else {
      showToast('❌ ' + (data.message || 'Registration failed'), 'error');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showToast('❌ Registration error: ' + err.message, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Create Account';
    }
  }
}

async function loadCurrentUser() {
  if (!authToken) return;
  
  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = data.data;
      updateSidebarUser();
    } else {
      console.warn('Failed to load user session, logging out.');
      logout();
    }
  } catch (err) {
    console.error('Error fetching current user info:', err);
  }
}

function updateSidebarUser() {
  if (!currentUser) return;
  
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  
  const name = currentUser.first_name 
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : currentUser.username;
    
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = currentUser.role || 'Employee';
  if (avatarEl) {
    avatarEl.textContent = name.charAt(0).toUpperCase();
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  stopNotificationPolling();
  showToast('Logged out', 'info');
  showLoginPage();
}

function navigate(page) {
  currentPage = page;
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Update page title in browser
  document.title = `Mini CRM — ${page.charAt(0).toUpperCase() + page.slice(1)}`;
  // Render the page
  renderPage(page);
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function renderPage(page) {
  const content = document.getElementById('page-content');
  // Destroy any chart instances
  Object.values(chartInstances).forEach(c => c && c.destroy && c.destroy());
  chartInstances = {};

  switch (page) {
    case 'dashboard':  renderDashboard(content); break;
    case 'leads':      renderLeads(content); break;
    case 'contacts':   renderContacts(content); break;
    case 'deals':      renderDeals(content); break;
    case 'tasks':      renderTasks(content); break;
    case 'activities': renderActivities(content); break;
    case 'lead-detail': renderLeadDetail(content, window.currentDetailId); break;
    case 'contact-detail': renderContactDetail(content, window.currentDetailId); break;
    default:           renderDashboard(content);
  }
}

function viewDetail(module, id) {
  window.currentDetailId = id;
  navigate(`${module}-detail`);
}

// ============================================================
// SIDEBAR TOGGLE (mobile)
// ============================================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// GLOBAL SEARCH
// ============================================================
let searchDebounce = null;
function initGlobalSearch() {
  const searchEl = document.getElementById('global-search');
  if (!searchEl) return;
  searchEl.addEventListener('input', e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const term = e.target.value.trim();
      if (!term) return;
      navigate('leads');
      setTimeout(() => {
        const si = document.getElementById('lead-search');
        if (si) { si.value = term; si.dispatchEvent(new Event('input')); }
      }, 100);
    }, 400);
  });
}

// ============================================================
// QUICK ADD
// ============================================================
function quickAdd() {
  switch (currentPage) {
    case 'leads':     openLeadModal(); break;
    case 'contacts':  openContactModal(); break;
    case 'deals':     openDealModal(); break;
    case 'tasks':     openTaskModal(); break;
    default:          navigate('leads'); setTimeout(openLeadModal, 150);
  }
}

// ============================================================
// UTILS
// ============================================================
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  n = parseFloat(n);
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000)   return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)     return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n.toFixed(0);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function badgeClass(val, type) {
  if (!val) return '';
  const map = {
    'New': 'new', 'Contacted': 'contacted', 'Qualified': 'qualified',
    'Proposal': 'proposal', 'Won': 'won', 'Lost': 'lost',
    'Low': 'low', 'Medium': 'medium', 'High': 'high',
    'Pending': 'pending', 'In Progress': 'inprogress', 'Completed': 'completed'
  };
  return `badge badge-${map[val] || val.toLowerCase().replace(/\s+/g, '')}`;
}

function stageColor(stage) {
  const m = {
    'Qualification': '#4f7cff', 'Proposal': '#06b6d4',
    'Negotiation': '#f59e0b', 'Closed Won': '#22c55e', 'Closed Lost': '#ef4444'
  };
  return m[stage] || '#8b9cc8';
}

function probColor(p) {
  if (p >= 70) return '#22c55e';
  if (p >= 40) return '#f59e0b';
  return '#ef4444';
}

function activityIcon(type) {
  const m = { 'Note': '📝', 'Call': '📞', 'Email': '📧', 'Meeting': '🤝', 'Task': '✅' };
  return m[type] || '📝';
}

async function apiFetch(url, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...opts.headers
  };
  
  // Add Authorization header if token exists
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const res = await fetch(url, {
    headers,
    ...opts
  });
  
  // If unauthorized, redirect to login
  if (res.status === 401) {
    authToken = null;
    localStorage.removeItem('authToken');
    showLoginPage();
    throw new Error('Authentication required');
  }
  
  return res.json();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  
  if (!container) {
    console.warn('Toast container not found, showing alert instead:', msg);
    alert(msg);
    return;
  }
  
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${esc(msg)}</span>`;
  container.appendChild(t);
  
  setTimeout(() => {
    if (t.parentNode) t.remove();
  }, 3200);
}

// ============================================================
// MODAL
// ============================================================
function openModal(title, bodyHTML, onSubmit) {
  editingId = null;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus first input
  setTimeout(() => {
    const first = document.querySelector('#modal-body input, #modal-body select');
    if (first) first.focus();
  }, 300);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleModalClick(e) {
  if (e.target === e.currentTarget) closeModal();
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function showConfirm(title, msg, cb) {
  confirmCallback = cb;
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-overlay').style.display = 'flex';
  document.getElementById('confirm-ok-btn').onclick = () => {
    closeConfirm();
    cb();
  };
}

function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ============================================================
// EXPORT TO CSV
// ============================================================
function exportCSV(data, filename) {
  if (!data || !data.length) { showToast('No data to export', 'info'); return; }
  const headers = Object.keys(data[0]);
  const rows = [headers.join(','), ...data.map(r =>
    headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(',')
  )];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showToast(`Exported ${data.length} records`, 'success');
}

// ============================================================
// ============================================================
//  1. DASHBOARD
// ============================================================
// ============================================================
async function renderDashboard(content) {
  const displayName = currentUser ? (currentUser.first_name || currentUser.username) : 'Admin';
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">📊 Dashboard</div>
        <div class="page-subtitle">Welcome back, ${esc(displayName)}! Here's your CRM overview.</div>
      </div>
    </div>

    <div class="stats-grid" id="dash-stats">
      ${[1,2,3,4,5,6].map(() => `
        <div class="stat-card">
          <div class="stat-icon blue" style="background:var(--bg3)"></div>
          <div><div class="stat-val" style="background:var(--bg3);width:60px;height:20px;border-radius:4px"></div></div>
        </div>`).join('')}
    </div>

    <div class="dash-grid-3" style="margin-bottom:20px">
      <div class="panel">
        <div class="panel-header"><div class="panel-title">📈 Leads This Month</div></div>
        <div class="panel-body"><canvas id="chart-monthly"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">🎯 Lead Status</div></div>
        <div class="panel-body"><canvas id="chart-leads"></canvas></div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">💰 Deals Pipeline</div>
        </div>
        <div class="panel-body"><canvas id="chart-deals"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🕐 Recent Activity</div>
        </div>
        <div class="panel-body" id="dash-activity">
          <div class="loader-cell" style="text-align:center;padding:20px;color:var(--text3)">Loading...</div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <div class="panel-header">
        <div class="panel-title">📌 Tasks Due Today</div>
        <button class="btn btn-sm btn-outline" onclick="navigate('tasks')">View All</button>
      </div>
      <div class="panel-body" id="dash-tasks">
        <div style="text-align:center;padding:20px;color:var(--text3)">Loading...</div>
      </div>
    </div>
  `;

  try {
    const result = await apiFetch('/api/dashboard');
    
    // Validate response
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid API response');
    }
    
    if (!result.success && result.success !== undefined) {
      throw new Error(result.message || 'Dashboard load failed');
    }
    
    const d = result.data || {};
    
    // Provide defaults for all data properties
    const data = {
      totalLeads: d.totalLeads || 0,
      totalContacts: d.totalContacts || 0,
      totalDeals: d.totalDeals || 0,
      pendingTasks: d.pendingTasks || 0,
      totalUsers: d.totalUsers || 0,
      totalRevenue: d.totalRevenue || 0,
      monthlyRevenue: d.monthlyRevenue || 0,
      pipelineValue: d.pipelineValue || 0,
      conversionRate: d.conversionRate || '0%',
      myStats: d.myStats || {},
      leadsByStatus: Array.isArray(d.leadsByStatus) ? d.leadsByStatus : [],
      dealsByStage: Array.isArray(d.dealsByStage) ? d.dealsByStage : [],
      activities: Array.isArray(d.activities) ? d.activities : [],
      tasksDueToday: Array.isArray(d.tasksDueToday) ? d.tasksDueToday : [],
      overdueTasks: Array.isArray(d.overdueTasks) ? d.overdueTasks : [],
      monthlyLeads: Array.isArray(d.monthlyLeads) ? d.monthlyLeads : [],
      topUsers: Array.isArray(d.topUsers) ? d.topUsers : []
    };

    // Stats
    document.getElementById('dash-stats').innerHTML = `
      <div class="stat-card blue">
        <div class="stat-icon blue">🎯</div>
        <div><div class="stat-val">${data.totalLeads}</div><div class="stat-lbl">Total Leads</div></div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green">🏆</div>
        <div><div class="stat-val">${fmtMoney(data.totalRevenue)}</div><div class="stat-lbl">Revenue Won</div></div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon amber">💰</div>
        <div><div class="stat-val">${data.totalDeals}</div><div class="stat-lbl">Open Deals</div></div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon red">✅</div>
        <div><div class="stat-val">${data.pendingTasks}</div><div class="stat-lbl">Tasks Due</div></div>
      </div>
    `;

    // Chart: Monthly leads
    const mCtx = document.getElementById('chart-monthly');
    if (mCtx && data.monthlyLeads && data.monthlyLeads.length) {
      chartInstances.monthly = new Chart(mCtx, {
        type: 'bar',
        data: {
          labels: data.monthlyLeads.map(r => r.month),
          datasets: [{
            label: 'Leads',
            data: data.monthlyLeads.map(r => r.count),
            backgroundColor: 'rgba(79,124,255,0.7)',
            borderRadius: 6,
            borderColor: '#4f7cff',
            borderWidth: 1
          }]
        },
        options: chartOpts('Leads per Month', false)
      });
    }

    // Chart: Lead status donut
    const lCtx = document.getElementById('chart-leads');
    if (lCtx && data.leadsByStatus && data.leadsByStatus.length) {
      chartInstances.leads = new Chart(lCtx, {
        type: 'doughnut',
        data: {
          labels: data.leadsByStatus.map(r => r.status),
          datasets: [{
            data: data.leadsByStatus.map(r => r.count),
            backgroundColor: ['#4f7cff','#06b6d4','#8b6bff','#f59e0b','#22c55e','#ef4444'],
            borderWidth: 0, hoverOffset: 6
          }]
        },
        options: {
          plugins: { legend: { position: 'right', labels: { color: '#8b9cc8', padding: 14, font: { size: 11 } } } },
          cutout: '68%',
          responsive: true,
          maintainAspectRatio: true
        }
      });
    } else if (lCtx) {
      lCtx.parentElement.innerHTML = '<div class="empty-state"><div class="ei">🎯</div><p>No lead data yet</p></div>';
    }

    // Chart: Deals pipeline bar
    const dCtx = document.getElementById('chart-deals');
    if (dCtx && data.dealsByStage && data.dealsByStage.length) {
      chartInstances.deals = new Chart(dCtx, {
        type: 'bar',
        data: {
          labels: data.dealsByStage.map(r => r.stage),
          datasets: [{
            label: 'Deals',
            data: data.dealsByStage.map(r => r.count),
            backgroundColor: data.dealsByStage.map(r => stageColor(r.stage) + 'cc'),
            borderRadius: 6, borderWidth: 0
          }]
        },
        options: chartOpts('Deals by Stage', false)
      });
    } else if (dCtx) {
      dCtx.parentElement.innerHTML = '<div class="empty-state"><div class="ei">💰</div><p>No deals yet</p></div>';
    }

    // Recent activity
    const actEl = document.getElementById('dash-activity');
    if (data.activities && data.activities.length) {
      actEl.innerHTML = `<div class="activity-feed">
        ${data.activities.map(a => `
          <div class="activity-item">
            <div class="activity-dot">${activityIcon(a.type)}</div>
            <div>
              <div class="activity-text">${esc(a.description)}</div>
              <div class="activity-time">${timeAgo(a.created_at)}</div>
            </div>
          </div>
        `).join('')}
      </div>`;
    } else {
      actEl.innerHTML = '<div class="empty-state"><div class="ei">🕐</div><h3>No activity yet</h3></div>';
    }

    // Tasks due today
    const taskEl = document.getElementById('dash-tasks');
    if (data.tasksDueToday && data.tasksDueToday.length) {
      taskEl.innerHTML = data.tasksDueToday.map(t => `
        <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:1.1rem">${t.priority === 'High' ? '🔴' : t.priority === 'Medium' ? '🟡' : '🟢'}</span>
          <div style="flex:1">
            <div style="font-size:.86rem;font-weight:600">${esc(t.title)}</div>
            <div style="font-size:.75rem;color:var(--text3)">${t.related_to || 'General'} · Due: ${fmtDate(t.due_date)}</div>
          </div>
          <span class="${badgeClass(t.priority)}">${t.priority}</span>
        </div>
      `).join('');
    } else {
      taskEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:.85rem">🎉 No tasks due today!</div>';
    }

  } catch (err) {
    console.error(err);
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

function chartOpts(title, legend = true) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: legend, labels: { color: '#8b9cc8', font: { size: 11 } } },
      tooltip: { backgroundColor: '#1c2337', titleColor: '#f0f4ff', bodyColor: '#8b9cc8', borderColor: '#ffffff15', borderWidth: 1 }
    },
    scales: {
      x: { ticks: { color: '#566380', font: { size: 10 } }, grid: { color: '#ffffff07' } },
      y: { ticks: { color: '#566380', font: { size: 10 } }, grid: { color: '#ffffff07' }, beginAtZero: true }
    }
  };
}

// ============================================================
// ============================================================
//  2. LEADS
// ============================================================
// ============================================================
let leadsData = [];

async function renderLeads(content) {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🎯 Leads</div>
        <div class="page-subtitle">Manage your sales leads and track their progress</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-sm" onclick="exportCSV(leadsData,'leads.csv')">⬇ Export</button>
        <button class="btn btn-primary btn-sm" onclick="openLeadModal()">＋ Add Lead</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span>🔍</span>
        <input type="text" id="lead-search" placeholder="Search by name, email, phone, company...">
      </div>
      <select class="filter-select" id="lead-status-filter">
        <option value="">All Status</option>
        <option>New</option><option>Contacted</option><option>Qualified</option>
        <option>Proposal</option><option>Won</option><option>Lost</option>
      </select>
      <select class="filter-select" id="lead-source-filter">
        <option value="">All Sources</option>
        <option>Website</option><option>Social Media</option><option>Referral</option>
        <option>Cold Call</option><option>Email</option><option>Other</option>
      </select>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Phone</th><th>Email</th>
              <th>Company</th><th>Source</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="leads-tbody">
            <tr class="loader-row"><td colspan="9"><div class="spinner"></div><div style="color:var(--text3);font-size:.84rem">Loading...</div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Debounced search/filter
  let t;
  const reloadLeads = () => {
    clearTimeout(t);
    t = setTimeout(loadLeads, 280);
  };
  document.getElementById('lead-search').addEventListener('input', reloadLeads);
  document.getElementById('lead-status-filter').addEventListener('change', loadLeads);
  document.getElementById('lead-source-filter').addEventListener('change', loadLeads);

  await loadLeads();
}

async function loadLeads() {
  const search = document.getElementById('lead-search')?.value.trim() || '';
  const status = document.getElementById('lead-status-filter')?.value || '';
  let url = '/api/leads?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (status) url += `status=${encodeURIComponent(status)}`;

  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;

  try {
    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);
    leadsData = result.data;

    if (!leadsData.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ei">🎯</div><h3>No leads found</h3><p>Add your first lead to get started</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = leadsData.map((l, i) => `
      <tr>
        <td class="td-id">${i + 1}</td>
        <td class="td-name">
          <a href="javascript:void(0)" class="td-link" onclick="viewDetail('lead', ${l.id})">${esc(l.name)}</a>
        </td>
        <td>${esc(l.phone) || '—'}</td>
        <td>${esc(l.email) || '—'}</td>
        <td>${esc(l.company) || '—'}</td>
        <td><span style="font-size:.8rem;color:var(--text3)">${esc(l.source) || '—'}</span></td>
        <td><span class="${badgeClass(l.status)}">${l.status}</span></td>
        <td>${fmtDate(l.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn edit" title="Edit" onclick="openLeadModal(${l.id})">✏️</button>
            <button class="row-btn del" title="Delete" onclick="deleteLead(${l.id},'${esc(l.name)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ei">⚠️</div><h3>Error loading leads</h3><p>${err.message}</p></div></td></tr>`;
  }
}

function openLeadModal(id = null) {
  editingId = id;
  editingModule = 'leads';
  const isEdit = !!id;

  const html = `
    <form onsubmit="submitLead(event)">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input id="l-name" type="text" placeholder="John Doe" required></div>
        <div class="form-group"><label>Phone</label><input id="l-phone" type="tel" placeholder="+91 98765 43210"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input id="l-email" type="email" placeholder="john@example.com"></div>
        <div class="form-group"><label>Company</label><input id="l-company" type="text" placeholder="Acme Corp"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Source</label>
          <select id="l-source">
            <option>Website</option><option>Social Media</option><option>Referral</option>
            <option>Cold Call</option><option>Email</option><option>Other</option>
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="l-status">
            <option>New</option><option>Contacted</option><option>Qualified</option>
            <option>Proposal</option><option>Won</option><option>Lost</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="l-notes" placeholder="Any notes about this lead..."></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="lead-submit-btn">${isEdit ? '💾 Save Changes' : '＋ Add Lead'}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'Edit Lead' : 'Add New Lead', html);

  if (isEdit) {
    apiFetch(`/api/leads/${id}`).then(r => {
      if (!r.success) return showToast('Failed to load lead', 'error');
      const l = r.data;
      document.getElementById('l-name').value = l.name || '';
      document.getElementById('l-phone').value = l.phone || '';
      document.getElementById('l-email').value = l.email || '';
      document.getElementById('l-company').value = l.company || '';
      document.getElementById('l-source').value = l.source || 'Other';
      document.getElementById('l-status').value = l.status || 'New';
      document.getElementById('l-notes').value = l.notes || '';
    });
  }
}

async function submitLead(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('l-name').value.trim(),
    phone: document.getElementById('l-phone').value.trim(),
    email: document.getElementById('l-email').value.trim(),
    company: document.getElementById('l-company').value.trim(),
    source: document.getElementById('l-source').value,
    status: document.getElementById('l-status').value,
    notes: document.getElementById('l-notes').value.trim()
  };
  const btn = document.getElementById('lead-submit-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const isEdit = !!editingId;
    const result = await apiFetch(isEdit ? `/api/leads/${editingId}` : '/api/leads', {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify(body)
    });
    if (!result.success) throw new Error(result.message);
    closeModal();
    showToast(isEdit ? 'Lead updated!' : 'Lead added!', 'success');
    await loadLeads();
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = editingId ? '💾 Save Changes' : '＋ Add Lead';
  }
}

function deleteLead(id, name) {
  showConfirm('Delete Lead?', `"${name}" will be permanently deleted.`, async () => {
    const r = await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
    if (r.success) { showToast('Lead deleted!', 'success'); await loadLeads(); }
    else showToast(r.message, 'error');
  });
}

// ============================================================
// ============================================================
//  3. CONTACTS
// ============================================================
// ============================================================
let contactsData = [];

async function renderContacts(content) {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">👥 Contacts</div>
        <div class="page-subtitle">Your business contacts and their details</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-sm" onclick="exportCSV(contactsData,'contacts.csv')">⬇ Export</button>
        <button class="btn btn-primary btn-sm" onclick="openContactModal()">＋ Add Contact</button>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span>🔍</span>
        <input type="text" id="contact-search" placeholder="Search by name, email, company...">
      </div>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Title</th><th>Phone</th>
              <th>Email</th><th>Company</th><th>Date Added</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="contacts-tbody">
            <tr class="loader-row"><td colspan="8"><div class="spinner"></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  let t;
  document.getElementById('contact-search').addEventListener('input', () => {
    clearTimeout(t); t = setTimeout(loadContacts, 280);
  });

  await loadContacts();
}

async function loadContacts() {
  const search = document.getElementById('contact-search')?.value.trim() || '';
  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;

  try {
    const result = await apiFetch(`/api/contacts?search=${encodeURIComponent(search)}`);
    if (!result.success) throw new Error(result.message);
    contactsData = result.data;

    if (!contactsData.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="ei">👥</div><h3>No contacts found</h3><p>Add your first contact</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = contactsData.map((c, i) => `
      <tr>
        <td class="td-id">${i + 1}</td>
        <td class="td-name">
          <a href="javascript:void(0)" class="td-link" onclick="viewDetail('contact', ${c.id})">${esc(c.name)}</a>
        </td>
        <td><span style="font-size:.8rem;color:var(--text3)">${esc(c.title) || '—'}</span></td>
        <td>${esc(c.phone) || '—'}</td>
        <td>${esc(c.email) || '—'}</td>
        <td>${esc(c.company) || '—'}</td>
        <td>${fmtDate(c.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn edit" onclick="openContactModal(${c.id})">✏️</button>
            <button class="row-btn del" onclick="deleteContact(${c.id},'${esc(c.name)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="ei">⚠️</div><h3>${err.message}</h3></div></td></tr>`;
  }
}

function openContactModal(id = null) {
  editingId = id;
  editingModule = 'contacts';
  const html = `
    <form onsubmit="submitContact(event)">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input id="c-name" type="text" placeholder="Jane Smith" required></div>
        <div class="form-group"><label>Job Title</label><input id="c-title" type="text" placeholder="Sales Manager"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Phone</label><input id="c-phone" type="tel" placeholder="+91 98765 43210"></div>
        <div class="form-group"><label>Email</label><input id="c-email" type="email" placeholder="jane@company.com"></div>
      </div>
      <div class="form-group"><label>Company</label><input id="c-company" type="text" placeholder="Company Name"></div>
      <div class="form-group"><label>Address</label><textarea id="c-address" placeholder="Full address..."></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${id ? '💾 Save Changes' : '＋ Add Contact'}</button>
      </div>
    </form>
  `;

  openModal(id ? 'Edit Contact' : 'Add Contact', html);

  if (id) {
    apiFetch(`/api/contacts/${id}`).then(r => {
      if (!r.success) return;
      const c = r.data;
      document.getElementById('c-name').value = c.name || '';
      document.getElementById('c-title').value = c.title || '';
      document.getElementById('c-phone').value = c.phone || '';
      document.getElementById('c-email').value = c.email || '';
      document.getElementById('c-company').value = c.company || '';
      document.getElementById('c-address').value = c.address || '';
    });
  }
}

async function submitContact(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('c-name').value.trim(),
    title: document.getElementById('c-title').value.trim(),
    phone: document.getElementById('c-phone').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    company: document.getElementById('c-company').value.trim(),
    address: document.getElementById('c-address').value.trim()
  };
  try {
    const r = await apiFetch(editingId ? `/api/contacts/${editingId}` : '/api/contacts', {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body)
    });
    if (!r.success) throw new Error(r.message);
    closeModal();
    showToast(editingId ? 'Contact updated!' : 'Contact added!', 'success');
    await loadContacts();
  } catch (err) { showToast(err.message, 'error'); }
}

function deleteContact(id, name) {
  showConfirm('Delete Contact?', `"${name}" will be permanently deleted.`, async () => {
    const r = await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (r.success) { showToast('Contact deleted!', 'success'); await loadContacts(); }
    else showToast(r.message, 'error');
  });
}

// ============================================================
// ============================================================
//  4. DEALS (KANBAN PIPELINE)
// ============================================================
// ============================================================
const STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

let dealsData = [];

async function renderDeals(content) {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">💰 Deals Pipeline</div>
        <div class="page-subtitle">Track deals from qualification to close</div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-sm" onclick="exportCSV(dealsData,'deals.csv')">⬇ Export</button>
        <button class="btn btn-primary btn-sm" onclick="openDealModal()">＋ New Deal</button>
      </div>
    </div>

    <div class="pipeline-summary" id="pipeline-summary">
      ${STAGES.map(s => `
        <div class="ps-card">
          <div class="ps-label">${s}</div>
          <div class="ps-val" id="ps-${s.replace(/\s+/g,'_')}">—</div>
        </div>
      `).join('')}
    </div>

    <div class="kanban-board" id="kanban-board">
      ${STAGES.map(s => `
        <div class="kanban-col" data-stage="${s}">
          <div class="kanban-col-header">
            <div class="kanban-col-title">${s}</div>
            <div class="kanban-count" id="kc-${s.replace(/\s+/g,'_')}">0</div>
          </div>
          <div class="kanban-cards" id="kk-${s.replace(/\s+/g,'_')}">
            <div style="text-align:center;padding:20px;color:var(--text3);font-size:.78rem">Loading...</div>
          </div>
          <div class="kanban-col-total" id="kt-${s.replace(/\s+/g,'_')}"></div>
        </div>
      `).join('')}
    </div>
  `;

  await loadDeals();
}

async function loadDeals() {
  try {
    const result = await apiFetch('/api/deals');
    if (!result.success) throw new Error(result.message);
    dealsData = result.data;

    // Group by stage
    const byStage = {};
    STAGES.forEach(s => byStage[s] = []);
    dealsData.forEach(d => {
      if (byStage[d.stage]) byStage[d.stage].push(d);
    });

    STAGES.forEach(stage => {
      const key = stage.replace(/\s+/g, '_');
      const cards = byStage[stage];
      const total = cards.reduce((sum, d) => sum + parseFloat(d.value || 0), 0);

      // Update count badge
      const countEl = document.getElementById(`kc-${key}`);
      if (countEl) countEl.textContent = cards.length;

      // Update pipeline summary
      const psEl = document.getElementById(`ps-${key}`);
      if (psEl) psEl.textContent = cards.length ? fmtMoney(total) : '₹0';

      // Update cards
      const colEl = document.getElementById(`kk-${key}`);
      if (!colEl) return;

      if (!cards.length) {
        colEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text3);font-size:.78rem;border:1px dashed var(--border);border-radius:12px">No deals</div>`;
      } else {
        colEl.innerHTML = cards.map(d => `
          <div class="deal-card" onclick="openDealModal(${d.id})">
            <div class="deal-card-title">${esc(d.title)}</div>
            <div class="deal-card-contact">👤 ${esc(d.contact_name) || 'No contact'}</div>
            <div style="margin-bottom:10px">
               <div style="display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:4px">
                  <span style="color:var(--text2)">Probability</span>
                  <span style="font-weight:700;color:${probColor(d.probability)}">${d.probability}%</span>
               </div>
               <div class="prob-bar">
                  <div class="prob-fill" style="width:${d.probability}%;background:${probColor(d.probability)}"></div>
               </div>
            </div>
            <div class="deal-card-footer">
              <div class="deal-card-value">${fmtMoney(d.value)}</div>
              <div class="deal-card-actions">
                <button class="row-btn edit" onclick="event.stopPropagation();openDealModal(${d.id})">✏️</button>
                <button class="row-btn del" onclick="event.stopPropagation();deleteDeal(${d.id},'${esc(d.title)}')">🗑️</button>
              </div>
            </div>
            ${d.close_date ? `<div style="font-size:.7rem;color:var(--text3);margin-top:8px">📅 Exp. Close: ${fmtDate(d.close_date)}</div>` : ''}
          </div>
        `).join('');
      }

      // Update total per column
      const totEl = document.getElementById(`kt-${key}`);
      if (totEl) totEl.textContent = cards.length ? `Total: ${fmtMoney(total)}` : '';
    });

  } catch (err) {
    showToast('Failed to load deals: ' + err.message, 'error');
  }
}

function openDealModal(id = null) {
  editingId = id;
  const html = `
    <form onsubmit="submitDeal(event)">
      <div class="form-group"><label>Deal Title *</label><input id="d-title" type="text" placeholder="e.g. Enterprise Package — Acme Corp" required></div>
      <div class="form-row">
        <div class="form-group"><label>Contact Name</label><input id="d-contact" type="text" placeholder="Contact person"></div>
        <div class="form-group"><label>Deal Value (₹)</label><input id="d-value" type="number" min="0" placeholder="50000"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Stage</label>
          <select id="d-stage">
            ${STAGES.map(s => `<option>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Probability (%)</label>
          <input id="d-prob" type="number" min="0" max="100" placeholder="50">
        </div>
      </div>
      <div class="form-group"><label>Expected Close Date</label>
        <input id="d-close" type="date">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${id ? '💾 Save Changes' : '＋ Create Deal'}</button>
      </div>
    </form>
  `;

  openModal(id ? 'Edit Deal' : 'New Deal', html);

  if (id) {
    apiFetch(`/api/deals/${id}`).then(r => {
      if (!r.success) return;
      const d = r.data;
      document.getElementById('d-title').value = d.title || '';
      document.getElementById('d-contact').value = d.contact_name || '';
      document.getElementById('d-value').value = d.value || '';
      document.getElementById('d-stage').value = d.stage || 'Qualification';
      document.getElementById('d-prob').value = d.probability || '';
      document.getElementById('d-close').value = d.close_date ? d.close_date.split('T')[0] : '';
    });
  }
}

async function submitDeal(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('d-title').value.trim(),
    contact_name: document.getElementById('d-contact').value.trim(),
    value: parseFloat(document.getElementById('d-value').value) || 0,
    stage: document.getElementById('d-stage').value,
    probability: parseInt(document.getElementById('d-prob').value) || 20,
    close_date: document.getElementById('d-close').value || null
  };
  try {
    const r = await apiFetch(editingId ? `/api/deals/${editingId}` : '/api/deals', {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body)
    });
    if (!r.success) throw new Error(r.message);
    closeModal();
    showToast(editingId ? 'Deal updated!' : 'Deal created!', 'success');
    await loadDeals();
  } catch (err) { showToast(err.message, 'error'); }
}

function deleteDeal(id, title) {
  showConfirm('Delete Deal?', `"${title}" will be permanently deleted.`, async () => {
    const r = await apiFetch(`/api/deals/${id}`, { method: 'DELETE' });
    if (r.success) { showToast('Deal deleted!', 'success'); await loadDeals(); }
    else showToast(r.message, 'error');
  });
}

// ============================================================
// ============================================================
//  5. TASKS
// ============================================================
// ============================================================
let tasksData = [];

async function renderTasks(content) {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">✅ Tasks</div>
        <div class="page-subtitle">Track your to-dos, follow-ups, and action items</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openTaskModal()">＋ Add Task</button>
    </div>

    <div class="toolbar">
      <select class="filter-select" id="task-status-filter">
        <option value="">All Status</option>
        <option>Pending</option><option>In Progress</option><option>Completed</option>
      </select>
      <select class="filter-select" id="task-priority-filter">
        <option value="">All Priority</option>
        <option>Low</option><option>Medium</option><option>High</option>
      </select>
    </div>

    <!-- Task list -->
    <div id="tasks-list">
      <div style="text-align:center;padding:40px;color:var(--text3)"><div class="spinner" style="margin:0 auto 12px"></div>Loading...</div>
    </div>
  `;

  document.getElementById('task-status-filter').addEventListener('change', loadTasks);
  document.getElementById('task-priority-filter').addEventListener('change', loadTasks);

  await loadTasks();
}

async function loadTasks() {
  const status = document.getElementById('task-status-filter')?.value || '';
  const priority = document.getElementById('task-priority-filter')?.value || '';
  let url = '/api/tasks?';
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (priority) url += `priority=${encodeURIComponent(priority)}`;

  const listEl = document.getElementById('tasks-list');
  if (!listEl) return;

  try {
    const result = await apiFetch(url);
    if (!result.success) throw new Error(result.message);
    tasksData = result.data;

    if (!tasksData.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="ei">✅</div><h3>No tasks found</h3><p>Add a task to stay on track</p></div>`;
      return;
    }

    const today = new Date().toDateString();
    listEl.innerHTML = tasksData.map(t => {
      const due = t.due_date ? new Date(t.due_date) : null;
      const isOverdue = due && due < new Date() && t.status !== 'Completed';
      const isToday = due && due.toDateString() === today;
      return `
        <div class="table-wrap" style="margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:16px;padding:14px 20px;flex-wrap:wrap">
            <button class="btn btn-xs ${t.status === 'Completed' ? 'btn-success' : 'btn-outline'}"
              onclick="toggleTaskStatus(${t.id}, '${t.status}')" title="Toggle status">
              ${t.status === 'Completed' ? '☑' : '☐'}
            </button>
            <div style="flex:1;min-width:180px">
              <div style="font-size:.9rem;font-weight:600;${t.status === 'Completed' ? 'text-decoration:line-through;color:var(--text3)' : ''}">
                ${esc(t.title)}
              </div>
              ${t.description ? `<div style="font-size:.78rem;color:var(--text3);margin-top:2px">${esc(t.description)}</div>` : ''}
              ${t.related_to ? `<div style="font-size:.75rem;color:var(--text3);margin-top:2px">📎 ${esc(t.related_to)}</div>` : ''}
            </div>
            <span class="${badgeClass(t.priority)}">${t.priority}</span>
            <span class="${badgeClass(t.status)}">${t.status}</span>
            <div style="font-size:.78rem;color:${isOverdue ? 'var(--red)' : isToday ? 'var(--amber)' : 'var(--text3)'}">
              📅 ${due ? (isOverdue ? '⚠ Overdue: ' : isToday ? '⏰ Today: ' : '') + fmtDate(t.due_date) : 'No due date'}
            </div>
            <div class="row-actions">
              <button class="row-btn edit" onclick="openTaskModal(${t.id})">✏️</button>
              <button class="row-btn del" onclick="deleteTask(${t.id},'${esc(t.title)}')">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><div class="ei">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

async function toggleTaskStatus(id, currentStatus) {
  const next = { 'Pending': 'In Progress', 'In Progress': 'Completed', 'Completed': 'Pending' };
  const task = tasksData.find(t => t.id === id);
  if (!task) return;
  const updated = { ...task, status: next[currentStatus] || 'Pending' };
  const r = await apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updated) });
  if (r.success) { showToast(`Task marked as ${updated.status}`, 'success'); await loadTasks(); }
  else showToast(r.message, 'error');
}

function openTaskModal(id = null) {
  editingId = id;
  const html = `
    <form onsubmit="submitTask(event)">
      <div class="form-group"><label>Task Title *</label><input id="t-title" type="text" placeholder="e.g. Follow up with John" required></div>
      <div class="form-group"><label>Description</label><textarea id="t-desc" placeholder="Additional details..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Due Date</label><input id="t-due" type="date"></div>
        <div class="form-group"><label>Priority</label>
          <select id="t-priority"><option>Low</option><option selected>Medium</option><option>High</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Status</label>
          <select id="t-status"><option>Pending</option><option>In Progress</option><option>Completed</option></select>
        </div>
        <div class="form-group"><label>Related To</label><input id="t-related" type="text" placeholder="Lead / Contact name..."></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${id ? '💾 Save Changes' : '＋ Add Task'}</button>
      </div>
    </form>
  `;

  openModal(id ? 'Edit Task' : 'Add Task', html);

  if (id) {
    apiFetch(`/api/tasks/${id}`).then(r => {
      if (!r.success) return;
      const t = r.data;
      document.getElementById('t-title').value = t.title || '';
      document.getElementById('t-desc').value = t.description || '';
      document.getElementById('t-due').value = t.due_date ? t.due_date.split('T')[0] : '';
      document.getElementById('t-priority').value = t.priority || 'Medium';
      document.getElementById('t-status').value = t.status || 'Pending';
      document.getElementById('t-related').value = t.related_to || '';
    });
  }
}

async function submitTask(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('t-title').value.trim(),
    description: document.getElementById('t-desc').value.trim(),
    due_date: document.getElementById('t-due').value || null,
    priority: document.getElementById('t-priority').value,
    status: document.getElementById('t-status').value,
    related_to: document.getElementById('t-related').value.trim()
  };
  try {
    const r = await apiFetch(editingId ? `/api/tasks/${editingId}` : '/api/tasks', {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body)
    });
    if (!r.success) throw new Error(r.message);
    closeModal();
    showToast(editingId ? 'Task updated!' : 'Task added!', 'success');
    await loadTasks();
  } catch (err) { showToast(err.message, 'error'); }
}

function deleteTask(id, title) {
  showConfirm('Delete Task?', `"${title}" will be permanently deleted.`, async () => {
    const r = await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (r.success) { showToast('Task deleted!', 'success'); await loadTasks(); }
    else showToast(r.message, 'error');
  });
}

// ============================================================
// ============================================================
//  6. ACTIVITIES FEED
// ============================================================
// ============================================================
async function renderActivities(content) {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🕐 Activity Feed</div>
        <div class="page-subtitle">All recent actions and history across the CRM</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openLogActivity()">＋ Log Activity</button>
    </div>
    <div class="panel" id="activity-panel">
      <div class="panel-body" id="activity-list">
        <div style="text-align:center;padding:40px;color:var(--text3)"><div class="spinner" style="margin:0 auto 12px"></div>Loading...</div>
      </div>
    </div>
  `;

  await loadActivities();
}

async function loadActivities() {
  try {
    const result = await apiFetch('/api/dashboard');
    if (!result.success) throw new Error(result.message);
    const list = result.data.activities;
    const el = document.getElementById('activity-list');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = '<div class="empty-state"><div class="ei">🕐</div><h3>No activities yet</h3><p>Activities are automatically logged when you add leads, contacts, or deals.</p></div>';
      return;
    }

    el.innerHTML = `<div class="activity-feed">
      ${list.map(a => `
        <div class="activity-item">
          <div class="activity-dot" style="background:var(--bg3)">${activityIcon(a.type)}</div>
          <div style="flex:1">
            <div class="activity-text">${esc(a.description)}</div>
            <div style="display:flex;gap:12px;margin-top:4px">
              <span class="activity-time">${fmtDate(a.created_at)} · ${timeAgo(a.created_at)}</span>
              ${a.module ? `<span style="font-size:.72rem;color:var(--blue);text-transform:capitalize">${a.module}</span>` : ''}
            </div>
          </div>
          <span style="font-size:.75rem;padding:3px 10px;background:var(--bg3);border-radius:20px;color:var(--text3)">${a.type}</span>
        </div>
      `).join('')}
    </div>`;
  } catch (err) {
    showToast('Failed to load activities', 'error');
  }
}

function openLogActivity() {
  const html = `
    <form onsubmit="submitActivity(event)">
      <div class="form-row">
        <div class="form-group"><label>Activity Type</label>
          <select id="a-type">
            <option>Note</option><option>Call</option><option>Email</option>
            <option>Meeting</option><option>Task</option>
          </select>
        </div>
        <div class="form-group"><label>Module</label>
          <select id="a-module">
            <option value="">General</option>
            <option>leads</option><option>contacts</option><option>deals</option><option>tasks</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Description *</label>
        <textarea id="a-desc" placeholder="What happened? e.g. Called John to discuss the proposal..." required style="min-height:100px"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">📝 Log Activity</button>
      </div>
    </form>
  `;
  openModal('Log Activity', html);
}

async function submitActivity(e) {
  e.preventDefault();
  const body = {
    type: document.getElementById('a-type').value,
    description: document.getElementById('a-desc').value.trim(),
    module: document.getElementById('a-module').value || null,
    module_id: null
  };
  if (!body.description) return showToast('Description is required', 'error');
  try {
    const r = await apiFetch('/api/dashboard/activity', { method: 'POST', body: JSON.stringify(body) });
    if (!r.success) throw new Error(r.message);
    closeModal();
    showToast('Activity logged!', 'success');
    await loadActivities();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
//  NOTIFICATIONS
// ============================================================
function toggleNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  notificationPanelOpen = !notificationPanelOpen;
  if (notificationPanelOpen) {
    panel.style.display = 'block';
    loadNotifications();
  } else {
    panel.style.display = 'none';
  }
}

async function loadNotifications() {
  try {
    const r = await apiFetch('/api/notifications');
    if (!r.success) throw new Error(r.message);
    
    notifications = r.data || [];
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    // Update badge
    const badge = document.getElementById('notif-badge');
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    
    // Render notifications
    renderNotificationsList();
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

function renderNotificationsList() {
  const list = document.getElementById('notification-list');
  if (!notifications || notifications.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text3);">No notifications</div>';
    return;
  }
  
  list.innerHTML = notifications.map(n => {
    const icon = getNotificationIcon(n.type);
    const timeAgo = formatTimeAgo(n.created_at);
    const unreadClass = !n.is_read ? 'unread' : '';
    
    return `
      <div class="notification-item ${unreadClass}" onclick="markNotificationAsReadUI(${n.id})">
        <div class="notification-content">
          <div class="notification-title">
            <span class="notification-icon">${icon}</span>
            ${esc(n.title || 'Notification')}
          </div>
          <div class="notification-message">${esc(n.message || '')}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
        <div class="notification-actions">
          <button class="notification-delete" onclick="deleteNotificationUI(event, ${n.id})" title="Delete">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function getNotificationIcon(type) {
  const icons = {
    'lead_assigned': '🎯',
    'task_deadline': '⏰',
    'deal_updated': '💰',
    'comment': '💬',
    'system': 'ℹ️'
  };
  return icons[type] || '🔔';
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function markNotificationAsReadUI(notifId) {
  try {
    const r = await apiFetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
    if (!r.success) throw new Error(r.message);
    await loadNotifications();
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

async function deleteNotificationUI(event, notifId) {
  event.stopPropagation();
  try {
    const r = await apiFetch(`/api/notifications/${notifId}`, { method: 'DELETE' });
    if (!r.success) throw new Error(r.message);
    await loadNotifications();
  } catch (err) {
    console.error('Failed to delete notification:', err);
  }
}

async function markAllNotificationsAsRead() {
  try {
    const r = await apiFetch('/api/notifications/all/read', { method: 'PUT' });
    if (!r.success) throw new Error(r.message);
    await loadNotifications();
    showToast('All notifications marked as read', 'success');
  } catch (err) {
    console.error('Failed to mark all as read:', err);
  }
}

function startNotificationPolling() {
  if (notificationCheckInterval) clearInterval(notificationCheckInterval);
  loadNotifications();
  notificationCheckInterval = setInterval(() => {
    loadNotifications();
  }, 30000); // Check every 30 seconds
}

function stopNotificationPolling() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
  }
}

// ============================================================
//  7. DETAIL VIEWS (LEADS & CONTACTS)
// ============================================================
async function renderLeadDetail(content, id) {
  if (!id) return navigate('leads');
  content.innerHTML = `<div style="text-align:center;padding:100px"><div class="spinner"></div></div>`;

  try {
    const r = await apiFetch(`/api/leads/${id}`);
    if (!r.success) throw new Error(r.message);
    const l = r.data.lead;

    content.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-subtitle"><a href="javascript:void(0)" onclick="navigate('leads')" style="color:var(--blue)">← Back to Leads</a></div>
          <div class="page-title">${esc(l.name)}</div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline btn-sm" onclick="openLeadModal(${l.id})">✏️ Edit</button>
          <button class="btn btn-primary btn-sm" onclick="openLogActivity()">＋ Log Activity</button>
        </div>
      </div>

      <div class="detail-view">
        <div class="detail-sidebar">
          <div class="profile-card">
            <div class="profile-avatar">${l.name.charAt(0)}</div>
            <div class="profile-name">${esc(l.name)}</div>
            <div class="profile-company">${esc(l.company) || 'No Company'}</div>
            <span class="${badgeClass(l.status)}">${l.status}</span>
          </div>

          <div class="panel">
            <div class="panel-header"><div class="panel-title">Contact Info</div></div>
            <div class="panel-body">
              <div class="info-grid">
                <div class="info-item"><div class="info-label">Email</div><div class="info-val">${esc(l.email) || '—'}</div></div>
                <div class="info-item"><div class="info-label">Phone</div><div class="info-val">${esc(l.phone) || '—'}</div></div>
                <div class="info-item"><div class="info-label">Source</div><div class="info-val">${esc(l.source) || '—'}</div></div>
                <div class="info-item"><div class="info-label">Created</div><div class="info-val">${fmtDate(l.created_at)}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-main">
          <div class="panel">
            <div class="panel-header"><div class="panel-title">📝 Notes</div></div>
            <div class="panel-body">
              <p style="font-size:.9rem;color:var(--text2);line-height:1.6">${esc(l.notes) || 'No notes added yet.'}</p>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><div class="panel-title">🕐 Activity Timeline</div></div>
            <div class="panel-body" id="lead-timeline">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    loadDetailTimeline('leads', id, 'lead-timeline');
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Lead not found</h3><button class="btn btn-primary" onclick="navigate('leads')">Back</button></div>`;
  }
}

async function renderContactDetail(content, id) {
  if (!id) return navigate('contacts');
  content.innerHTML = `<div style="text-align:center;padding:100px"><div class="spinner"></div></div>`;

  try {
    const r = await apiFetch(`/api/contacts/${id}`);
    if (!r.success) throw new Error(r.message);
    const c = r.data;

    content.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-subtitle"><a href="javascript:void(0)" onclick="navigate('contacts')" style="color:var(--blue)">← Back to Contacts</a></div>
          <div class="page-title">${esc(c.name)}</div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-outline btn-sm" onclick="openContactModal(${c.id})">✏️ Edit</button>
          <button class="btn btn-primary btn-sm" onclick="openLogActivity()">＋ Log Activity</button>
        </div>
      </div>

      <div class="detail-view">
        <div class="detail-sidebar">
          <div class="profile-card">
            <div class="profile-avatar" style="background:var(--purple)">${c.name.charAt(0)}</div>
            <div class="profile-name">${esc(c.name)}</div>
            <div class="profile-company">${esc(c.title) || 'Contact'} at ${esc(c.company) || '—'}</div>
          </div>

          <div class="panel">
            <div class="panel-header"><div class="panel-title">Contact Details</div></div>
            <div class="panel-body">
              <div class="info-grid">
                <div class="info-item"><div class="info-label">Email</div><div class="info-val">${esc(c.email) || '—'}</div></div>
                <div class="info-item"><div class="info-label">Phone</div><div class="info-val">${esc(c.phone) || '—'}</div></div>
                <div class="info-item"><div class="info-label">Address</div><div class="info-val">${esc(c.address) || '—'}</div></div>
                <div class="info-item"><div class="info-label">Member Since</div><div class="info-val">${fmtDate(c.created_at)}</div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-main">
          <div class="panel">
            <div class="panel-header"><div class="panel-title">🕐 Activity Timeline</div></div>
            <div class="panel-body" id="contact-timeline">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    loadDetailTimeline('contacts', id, 'contact-timeline');
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><h3>Contact not found</h3><button class="btn btn-primary" onclick="navigate('contacts')">Back</button></div>`;
  }
}

async function loadDetailTimeline(module, id, elId) {
  try {
    // We use dashboard/activity but filtered or leads logic
    // For now, let's fetch all activity and filter by module/id in JS (simple way)
    const result = await apiFetch('/api/dashboard');
    const el = document.getElementById(elId);
    if (!el) return;

    const list = result.data.activities.filter(a => a.module === module && a.module_id == id);

    if (!list.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px;font-size:.85rem">No activities recorded for this record.</div>';
      return;
    }

    el.innerHTML = `<div class="timeline">
      ${list.map(a => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <div class="timeline-type">${a.type}</div>
              <div class="timeline-date">${timeAgo(a.created_at)}</div>
            </div>
            <div class="timeline-desc">${esc(a.description)}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  } catch (e) {
    document.getElementById(elId).innerHTML = 'Error loading timeline';
  }
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('click', (e) => {
  const notifContainer = document.querySelector('.notif-bell-container');
  const notifPanel = document.getElementById('notification-panel');
  
  if (notifPanel && notifPanel.style.display !== 'none') {
    if (!notifContainer || !notifContainer.contains(e.target)) {
      notificationPanelOpen = false;
      notifPanel.style.display = 'none';
    }
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');
  
  // Check if logged in
  authToken = localStorage.getItem('authToken');
  console.log('Auth token found:', !!authToken);
  
  if (authToken) {
    console.log('Loading user session...');
    await loadCurrentUser();
    console.log('Showing app page (logged in)');
    showAppPage();
  } else {
    console.log('Showing login page');
    showLoginPage();
  }
  
  console.log('App initialized');
});
