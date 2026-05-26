// ============================================================
// ENHANCED CRM FRONTEND - v2.0
// Modern UI with modals, toast notifications, Kanban, etc.
// ============================================================

'use strict';

// ============================================================
// STATE & CONFIGURATION
// ============================================================
let currentPage = 'dashboard';
let currentUser = null;
let authToken = null;
const API_BASE = '/api';

// Store references for editing
let editingId = null;
let editingModule = null;
let chartInstances = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', initApp);

// ============================================================
// AUTHENTICATION
// ============================================================
function initApp() {
  // Check if logged in
  const token = localStorage.getItem('authToken');
  if (!token) {
    showLoginPage();
    return;
  }

  authToken = token;
  loadCurrentUser();
  navigate('dashboard');
}

function showLoginPage() {
  document.body.innerHTML = `
    <div class="auth-container">
      <div class="auth-form-wrapper">
        <div class="auth-logo">💼</div>
        <h1>CRM System v2.0</h1>
        
        <div id="auth-message" style="display:none" class="auth-message"></div>
        
        <ul class="auth-tabs">
          <li class="auth-tab active" onclick="switchAuthTab('login')">Login</li>
          <li class="auth-tab" onclick="switchAuthTab('register')">Register</li>
        </ul>

        <!-- LOGIN FORM -->
        <form id="login-form" onsubmit="handleLogin(event)">
          <input type="text" placeholder="Username" id="login-username" required>
          <input type="password" placeholder="Password" id="login-password" required>
          <button type="submit" class="btn btn-primary btn-full">Login</button>
        </form>

        <!-- REGISTER FORM -->
        <form id="register-form" style="display:none" onsubmit="handleRegister(event)">
          <input type="text" placeholder="Username" id="reg-username" required>
          <input type="email" placeholder="Email" id="reg-email" required>
          <input type="password" placeholder="Password (min 6 chars)" id="reg-password" required>
          <input type="text" placeholder="First Name" id="reg-fname">
          <input type="text" placeholder="Last Name" id="reg-lname">
          <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
      </div>
    </div>
  `;
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      authToken = data.token;
      location.reload();
    } else {
      showAuthMessage('error', data.message);
    }
  } catch (error) {
    showAuthMessage('error', 'Login failed: ' + error.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const first_name = document.getElementById('reg-fname').value;
  const last_name = document.getElementById('reg-lname').value;

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, first_name, last_name })
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      authToken = data.token;
      location.reload();
    } else {
      showAuthMessage('error', data.message);
    }
  } catch (error) {
    showAuthMessage('error', 'Registration failed: ' + error.message);
  }
}

function showAuthMessage(type, message) {
  const msgDiv = document.getElementById('auth-message');
  msgDiv.className = `auth-message auth-message-${type}`;
  msgDiv.textContent = message;
  msgDiv.style.display = 'block';
}

async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.data;
    }
  } catch (error) {
    console.error('Failed to load user:', error);
  }
}

function logout() {
  localStorage.removeItem('authToken');
  authToken = null;
  location.reload();
}

// ============================================================
// ROUTER & PAGE NAVIGATION
// ============================================================
function navigate(page) {
  currentPage = page;
  
  // Update sidebar
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  
  document.title = `CRM — ${page.charAt(0).toUpperCase() + page.slice(1)}`;
  
  // Render page
  renderPage(page);
  
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('open');
  }
}

function renderPage(page) {
  const content = document.getElementById('page-content');
  if (!content) return;

  // Destroy chart instances
  Object.values(chartInstances).forEach(c => c && c.destroy?.());
  chartInstances = {};

  switch (page) {
    case 'dashboard': renderDashboard(content); break;
    case 'leads': renderLeads(content); break;
    case 'contacts': renderContacts(content); break;
    case 'deals': renderDeals(content); break;
    case 'kanban': renderKanban(content); break;
    case 'tasks': renderTasks(content); break;
    case 'activities': renderActivities(content); break;
    case 'notifications': renderNotifications(content); break;
    default: renderDashboard(content);
  }
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard(container) {
  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load dashboard');
    
    const { data } = await response.json();
    const { summary, myStats, activities, topUsers } = data;

    container.innerHTML = `
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your CRM overview.</p>
      </div>

      <div class="dashboard-grid">
        <!-- Stats Cards -->
        <div class="stat-card">
          <div class="stat-label">Total Leads</div>
          <div class="stat-value">${summary.totalLeads}</div>
          <div class="stat-trend">↑ New leads</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Revenue (Won Deals)</div>
          <div class="stat-value">$${(summary.totalRevenue || 0).toLocaleString()}</div>
          <div class="stat-trend">This month: $${(summary.monthlyRevenue || 0).toLocaleString()}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Pipeline Value</div>
          <div class="stat-value">$${(summary.pipelineValue || 0).toLocaleString()}</div>
          <div class="stat-trend">${summary.totalDeals} open deals</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Conversion Rate</div>
          <div class="stat-value">${summary.conversionRate}</div>
          <div class="stat-trend">Lead → Deal</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">My Leads</div>
          <div class="stat-value">${myStats.my_leads || 0}</div>
          <div class="stat-trend">Assigned to me</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">My Deals</div>
          <div class="stat-value">$${(myStats.my_deal_value || 0).toLocaleString()}</div>
          <div class="stat-trend">${myStats.my_deals || 0} deals</div>
        </div>
      </div>

      <!-- Charts & Activity -->
      <div class="dashboard-content">
        <div class="dashboard-left">
          <div class="chart-card">
            <h3>Monthly Lead Trends (Last 6 months)</h3>
            <canvas id="chart-trends" height="80"></canvas>
          </div>

          <div class="chart-card">
            <h3>Deals by Stage</h3>
            <canvas id="chart-stages" height="80"></canvas>
          </div>
        </div>

        <div class="dashboard-right">
          <div class="activity-card">
            <h3>Recent Activity</h3>
            <div class="activity-list">
              ${activities.slice(0, 10).map(a => `
                <div class="activity-item">
                  <span class="activity-icon">📝</span>
                  <div class="activity-text">
                    <p>${a.description}</p>
                    <small>${new Date(a.created_at).toLocaleDateString()}</small>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="activity-card">
            <h3>Top Performers</h3>
            <div class="performers-list">
              ${topUsers.map(u => `
                <div class="performer-item">
                  <span>${u.name}</span>
                  <span class="performer-value">$${(u.total_deal_value || 0).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    initDashboardCharts(data.breakdown);
  } catch (error) {
    container.innerHTML = `<div class="error-message">Error loading dashboard: ${error.message}</div>`;
  }
}

function initDashboardCharts(breakdown) {
  // Trends chart
  const trendCtx = document.getElementById('chart-trends');
  if (trendCtx) {
    chartInstances.trends = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: breakdown.leadsByStatus?.map(l => l.status) || [],
        datasets: [{
          label: 'Leads by Status',
          data: breakdown.leadsByStatus?.map(l => l.count) || [],
          borderColor: 'var(--blue)',
          backgroundColor: 'rgba(79,124,255,0.1)',
          tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Stages chart
  const stageCtx = document.getElementById('chart-stages');
  if (stageCtx) {
    chartInstances.stages = new Chart(stageCtx, {
      type: 'doughnut',
      data: {
        labels: breakdown.dealsByStage?.map(d => d.stage) || [],
        datasets: [{
          data: breakdown.dealsByStage?.map(d => d.count) || [],
          backgroundColor: ['#4f7cff', '#8b6bff', '#22c55e', '#f59e0b', '#ef4444']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

// ============================================================
// LEADS MODULE
// ============================================================
async function renderLeads(container) {
  try {
    const search = new URLSearchParams(window.location.search).get('search') || '';
    const response = await fetch(`${API_BASE}/leads?page=1&limit=20&search=${search}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) throw new Error('Failed to load leads');
    
    const result = await response.json();
    const leads = result.data;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Leads</h1>
          <p>Manage your sales leads</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateModal('lead')">+ New Lead</button>
      </div>

      <div class="filter-bar">
        <input type="text" id="leads-search" placeholder="Search leads..." value="${search}" 
               onchange="searchLeads(this.value)">
        <select onchange="filterLeads('status', this.value)">
          <option value="">All Status</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>
      </div>

      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Status</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${leads.map(lead => `
              <tr>
                <td class="name-cell"><strong>${lead.name}</strong></td>
                <td>${lead.email || '-'}</td>
                <td>${lead.company || '-'}</td>
                <td><span class="badge badge-${lead.status.toLowerCase()}">${lead.status}</span></td>
                <td>${lead.source || '-'}</td>
                <td class="action-cell">
                  <button class="btn-icon" onclick="editLead(${lead.id})" title="Edit">✎</button>
                  <button class="btn-icon" onclick="deleteLead(${lead.id})" title="Delete">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${result.pagination ? `
        <div class="pagination">
          <p>Page ${result.pagination.current_page} of ${result.pagination.total_pages} 
             (${result.pagination.total_records} total)</p>
        </div>
      ` : ''}
    `;
  } catch (error) {
    container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
  }
}

async function editLead(id) {
  try {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const result = await response.json();
    const lead = result.data.lead;

    showModal(`Edit Lead: ${lead.name}`, `
      <form onsubmit="saveLead(event, ${id})">
        <input type="text" placeholder="Name" value="${lead.name}" required>
        <input type="email" placeholder="Email" value="${lead.email || ''}">
        <input type="tel" placeholder="Phone" value="${lead.phone || ''}">
        <input type="text" placeholder="Company" value="${lead.company || ''}">
        <select>
          <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
          <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
          <option value="Qualified" ${lead.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
          <option value="Proposal" ${lead.status === 'Proposal' ? 'selected' : ''}>Proposal</option>
          <option value="Won" ${lead.status === 'Won' ? 'selected' : ''}>Won</option>
          <option value="Lost" ${lead.status === 'Lost' ? 'selected' : ''}>Lost</option>
        </select>
        <textarea placeholder="Notes">${lead.notes || ''}</textarea>
        <button type="submit" class="btn btn-primary">Save Lead</button>
      </form>
    `);
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function deleteLead(id) {
  showConfirm('Delete Lead?', 'This action cannot be undone.', async () => {
    try {
      const response = await fetch(`${API_BASE}/leads/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        showToast('Lead deleted successfully', 'success');
        navigate('leads');
      }
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    }
  });
}

function openCreateModal(module) {
  const forms = {
    lead: `
      <form onsubmit="createLead(event)">
        <input type="text" placeholder="Lead Name" id="lead-name" required>
        <input type="email" placeholder="Email" id="lead-email">
        <input type="tel" placeholder="Phone" id="lead-phone">
        <input type="text" placeholder="Company" id="lead-company">
        <select id="lead-source">
          <option value="Website">Website</option>
          <option value="Referral">Referral</option>
          <option value="Cold Call">Cold Call</option>
          <option value="Email">Email</option>
          <option value="Social Media">Social Media</option>
        </select>
        <button type="submit" class="btn btn-primary">Create Lead</button>
      </form>
    `
  };

  showModal(`New ${module.charAt(0).toUpperCase() + module.slice(1)}`, forms[module]);
}

async function createLead(e) {
  e.preventDefault();
  const name = document.getElementById('lead-name').value;
  const email = document.getElementById('lead-email').value;
  const phone = document.getElementById('lead-phone').value;
  const company = document.getElementById('lead-company').value;
  const source = document.getElementById('lead-source').value;

  try {
    const response = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, email, phone, company, source })
    });

    if (response.ok) {
      showToast('Lead created successfully!', 'success');
      closeModal();
      navigate('leads');
    } else {
      const error = await response.json();
      showToast(error.message || 'Error creating lead', 'error');
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function saveLead(e, id) {
  e.preventDefault();
  const form = e.target;
  const inputs = form.querySelectorAll('input, select, textarea');
  
  const data = {
    name: inputs[0].value,
    email: inputs[1].value,
    phone: inputs[2].value,
    company: inputs[3].value,
    status: inputs[4].value,
    notes: inputs[5].value
  };

  try {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      showToast('Lead updated successfully!', 'success');
      closeModal();
      navigate('leads');
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// ============================================================
// CONTACTS, DEALS, TASKS (simplified)
// ============================================================
async function renderContacts(container) {
  container.innerHTML = '<div class="page-header"><h1>Contacts</h1></div><p>Contacts module...</p>';
}

async function renderDeals(container) {
  container.innerHTML = '<div class="page-header"><h1>Deals</h1></div><p>Deals module...</p>';
}

async function renderKanban(container) {
  container.innerHTML = '<div class="page-header"><h1>Kanban Board</h1></div><p>Kanban view coming soon...</p>';
}

async function renderTasks(container) {
  container.innerHTML = '<div class="page-header"><h1>Tasks</h1></div><p>Tasks module...</p>';
}

async function renderActivities(container) {
  container.innerHTML = '<div class="page-header"><h1>Activities</h1></div><p>Activities feed...</p>';
}

async function renderNotifications(container) {
  container.innerHTML = '<div class="page-header"><h1>Notifications</h1></div><p>Notifications...</p>';
}

// ============================================================
// MODAL UTILITIES
// ============================================================
function showModal(title, content) {
  const modal = document.getElementById('modal-box');
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function handleModalClick(event) {
  if (event.target.id === 'modal-overlay') {
    closeModal();
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
// CONFIRMATION DIALOG
// ============================================================
function showConfirm(title, message, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = message;
  
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.onclick = () => {
    closeConfirm();
    onConfirm();
  };

  overlay.style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ============================================================
// UTILITIES
// ============================================================
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

function searchLeads(term) {
  window.location.search = `search=${encodeURIComponent(term)}`;
}

function filterLeads(field, value) {
  // Implement filter logic
}
