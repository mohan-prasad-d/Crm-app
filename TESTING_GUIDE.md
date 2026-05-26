# CRM Application - Testing Guide v2.0

## Quick Start Testing

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure database in .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=crm_db
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### 2. Database Initialization

```bash
# For fresh start, MySQL will auto-initialize on first run
# OR manually run SQL from CRM-MYSQL.session.sql
mysql -u root -p < CRM-MYSQL.session.sql
```

### 3. Start Application

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Visit: `http://localhost:3000`

---

## Authentication Testing

### Test Case 1: User Registration

1. Navigate to login page
2. Click "Register" tab
3. Fill in: username, email, password (min 6 chars), names
4. Click "Create Account"
5. **Expected**: Redirected to dashboard with JWT token saved

### Test Case 2: User Login

1. Click "Login" tab
2. Enter username and password
3. Click "Login"
4. **Expected**: Redirected to dashboard, user info displayed in topbar

### Test Case 3: Token Refresh

1. Open browser DevTools → Application → LocalStorage
2. Note the authToken value
3. Wait for network call to verify Bearer token is sent
4. **Expected**: All API calls include `Authorization: Bearer {token}`

### Test Case 4: Session Persistence

1. Login successfully
2. Close browser (or clear localStorage)
3. Reload page
4. **Expected**: Redirected to login (no token = no access)

---

## Leads Management Testing

### Test Case 5: Create Lead

1. Login as any user
2. Click "Leads" in sidebar
3. Click "+ New Lead"
4. Fill form: Name (required), Email, Phone, Company, Source
5. Click "Create Lead"
6. **Expected**: Toast success message, lead appears in table

### Test Case 6: Search Leads

1. Go to Leads page
2. Enter search term in search box (e.g., "john", "acme")
3. **Expected**: Table filters in real-time to matching leads

### Test Case 7: Filter by Status

1. Go to Leads page
2. Select status from dropdown (New, Contacted, etc.)
3. **Expected**: Table shows only leads with selected status

### Test Case 8: Edit Lead

1. On Leads page, click ✎ icon on any row
2. Modal opens with populated form
3. Modify fields (name, status, notes, etc.)
4. Click "Save Lead"
5. **Expected**: Lead updated, toast confirmation, table refreshed

### Test Case 9: Delete Lead

1. On Leads page, click 🗑 icon
2. Confirmation dialog appears
3. Click "Confirm"
4. **Expected**: Lead removed from table, success toast

### Test Case 10: Pagination

1. Go to Leads page
2. Note page indicator shows "Page X of Y"
3. If multiple pages exist, navigate with pagination controls
4. **Expected**: Correct records displayed per page

---

## Dashboard Testing

### Test Case 11: Dashboard Stats

1. Click "Dashboard" in sidebar
2. **Expected**: 6 stat cards display:
   - Total Leads
   - Revenue (Won Deals)
   - Pipeline Value
   - Conversion Rate
   - My Leads
   - My Deals

### Test Case 12: Dashboard Charts

1. On Dashboard page, scroll down
2. **Expected**: Two charts render:
   - Monthly Lead Trends (line chart)
   - Deals by Stage (doughnut chart)

### Test Case 13: Recent Activity Feed

1. On Dashboard, right side shows "Recent Activity"
2. **Expected**: Last 10 activities displayed with descriptions and dates

### Test Case 14: Top Performers

1. On Dashboard, see "Top Performers" section
2. **Expected**: Users ranked by deal value with amounts

---

## UI/UX Testing

### Test Case 15: Navigation

1. Click each sidebar item (Leads, Contacts, Deals, etc.)
2. **Expected**: Page content changes, URL updates, active nav item highlighted

### Test Case 16: Responsive Design

1. Open page in desktop (1920px)
2. Resize to tablet (768px)
3. Resize to mobile (375px)
4. **Expected**:
   - Desktop: Sidebar visible, full layout
   - Tablet: Sidebar collapses, hamburger menu shows
   - Mobile: Sidebar hidden, hamburger menu accessible

### Test Case 17: Toast Notifications

1. Perform any action (create, edit, delete lead)
2. **Expected**: Green success toast appears top-right, fades after 3 seconds

### Test Case 18: Modal Forms

1. Click "Create" button on any module
2. Modal overlays page with form
3. Click X or outside modal to close
4. **Expected**: Modal smoothly opens/closes, form clears

### Test Case 19: Confirmation Dialogs

1. Delete any item
2. Confirmation dialog appears centered
3. Click Cancel or Confirm
4. **Expected**: Dialog closes, appropriate action taken

### Test Case 20: User Menu

1. Topbar shows user name and role
2. **Expected**: Current user info from JWT token displayed correctly

---

## Role-Based Access Control (RBAC) Testing

### Test Case 21: Employee Permissions

1. Login as Employee user
2. Try to access Users or Reports endpoints
3. **Expected**: Permission denied error or UI hides options

### Test Case 22: Manager Permissions

1. Login as Manager user
2. Access Reports page
3. **Expected**: Can view reports and analytics

### Test Case 23: Admin Permissions

1. Login as Admin user
2. All modules accessible
3. **Expected**: Full CRUD on all entities

---

## API Testing (using Postman/cURL)

### Test Case 24: GET /api/leads (Pagination)

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/leads?page=1&limit=20"
```

**Expected**: JSON with data array, pagination metadata

### Test Case 25: POST /api/leads (Create)

```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","email":"test@test.com","company":"Test Co"}' \
  http://localhost:3000/api/leads
```

**Expected**: 201 response with created lead object

### Test Case 26: PUT /api/leads/:id (Update)

```bash
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Qualified"}' \
  http://localhost:3000/api/leads/1
```

**Expected**: 200 response with updated lead

### Test Case 27: DELETE /api/leads/:id (Delete)

```bash
curl -X DELETE -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/leads/1
```

**Expected**: 200 response, lead removed from database

### Test Case 28: Invalid Token

```bash
curl -H "Authorization: Bearer INVALID_TOKEN" \
  http://localhost:3000/api/leads
```

**Expected**: 401 Unauthorized error

### Test Case 29: Missing Token

```bash
curl http://localhost:3000/api/leads
```

**Expected**: 401 Unauthorized error

---

## Data Validation Testing

### Test Case 30: Required Fields

1. Try to create Lead without Name field
2. **Expected**: Validation error message

### Test Case 31: Email Format

1. Try to register with invalid email
2. **Expected**: "Invalid email format" error

### Test Case 32: Password Strength

1. Try to register with password < 6 characters
2. **Expected**: "Password must be at least 6 characters" error

### Test Case 33: Duplicate Email

1. Register user with email "test@example.com"
2. Try to register another user with same email
3. **Expected**: "Email already in use" error

### Test Case 34: Phone Format

1. Create lead with invalid phone number
2. **Expected**: Either validation error or phone stored as-is (flexible format)

---

## Error Handling Testing

### Test Case 35: Database Connection Error

1. Stop MySQL server
2. Try to access any endpoint
3. **Expected**: 500 error, graceful error message, logged to error.log

### Test Case 36: File Upload Limit

1. Try to upload file > 10MB
2. **Expected**: "File size exceeds limit" error

### Test Case 37: Invalid File Type

1. Try to upload .exe file
2. **Expected**: "File type not allowed" error

### Test Case 38: Network Error Simulation

1. Close DevTools → Network → Throttle to offline
2. Try to load data
3. **Expected**: Network error handled gracefully

---

## Performance Testing

### Test Case 39: Large Dataset Pagination

1. Create 500+ leads
2. Load Leads page with limit=100
3. Measure load time
4. **Expected**: Load time < 2 seconds with pagination

### Test Case 40: Chart Rendering

1. Dashboard with 1000+ data points
2. Charts still render smoothly
3. **Expected**: No browser freeze, responsive interactions

### Test Case 41: Search Performance

1. Search across 500 leads
2. **Expected**: Results show within 500ms

### Test Case 42: Concurrent Requests

1. Open multiple pages simultaneously
2. Load dashboard, leads, deals at same time
3. **Expected**: All load without errors

---

## Logging & Audit Testing

### Test Case 43: Activity Logging

1. Create a new lead
2. Check `/logs/combined.log` file
3. **Expected**: Entry logged with timestamp, action, user

### Test Case 44: Error Logging

1. Cause an error (e.g., delete non-existent lead)
2. Check `/logs/error.log` file
3. **Expected**: Error logged with stack trace

### Test Case 45: Audit Trail

1. Create lead
2. Update lead status
3. Call GET `/api/dashboard/audit/logs`
4. **Expected**: Both create and update actions logged with before/after values

---

## Security Testing

### Test Case 46: XSS Prevention

1. Try to create lead with name = `<script>alert('xss')</script>`
2. **Expected**: Script stored as text, not executed

### Test Case 47: SQL Injection Prevention

1. Search for lead with term = `' OR '1'='1`
2. **Expected**: Treated as literal string, no injection

### Test Case 48: CSRF Protection

1. Try to perform action from external site
2. **Expected**: CORS policy blocks request

### Test Case 49: Password Security

1. Register user with password
2. Check database directly - password should be hashed
3. **Expected**: Password never stored in plaintext

### Test Case 50: Token Expiration

1. Get token, wait 7+ days (or edit JWT to past date)
2. Try to use expired token
3. **Expected**: 401 error, prompt to login again

---

## Cross-Browser Testing

### Chrome/Edge

- [ ] All features work
- [ ] Console has no errors
- [ ] Performance acceptable

### Firefox

- [ ] All features work
- [ ] Console has no errors

### Safari

- [ ] All features work
- [ ] LocalStorage works

### Mobile Browsers

- [ ] Responsive layout renders correctly
- [ ] Touch interactions work
- [ ] No layout shifts

---

## Load Testing

Using Apache Bench or Loadtest:

```bash
# Install loadtest
npm install -g loadtest

# Test GET /api/leads
loadtest -n 1000 -c 100 \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/leads

# Test POST /api/leads
loadtest -n 100 -c 10 -m POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -P '{"name":"Test","company":"Test"}' \
  http://localhost:3000/api/leads
```

**Expected Results**:

- 95th percentile response time < 500ms
- 99th percentile response time < 1000ms
- Error rate < 1%
- Throughput > 100 requests/second

---

## Checklist

- [ ] All 50 test cases passed
- [ ] No errors in browser console
- [ ] No errors in `/logs/error.log`
- [ ] Database integrity maintained
- [ ] UI responsive on all screen sizes
- [ ] Authentication working end-to-end
- [ ] RBAC enforced correctly
- [ ] Pagination working with large datasets
- [ ] Charts rendering correctly
- [ ] Toast notifications display properly
- [ ] Modal forms work correctly
- [ ] Search/filter functionality works
- [ ] All CRUD operations working
- [ ] Error messages helpful and clear
- [ ] Performance acceptable (< 2s page load)
- [ ] Security features validated

---

## Deployment Readiness Checklist

Before deploying to production:

- [ ] All environment variables set in `.env`
- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] CORS configured for correct domain
- [ ] File upload directory has proper permissions
- [ ] Log rotation configured
- [ ] Error monitoring (e.g., Sentry) configured
- [ ] Email service configured for notifications
- [ ] Load balancer configured (if using multiple servers)
- [ ] Database connection pooling optimized
- [ ] Reverse proxy (Nginx) configured
- [ ] PM2 or supervisor process manager configured
- [ ] All dependencies updated to latest safe versions
- [ ] Security audit completed
- [ ] Performance benchmarks met

---

## Known Issues & Workarounds

### Issue: SMTP not configured

**Symptom**: Email notifications not sent
**Fix**: Configure SMTP in `.env` or notifications will be created but not emailed

### Issue: Large file uploads timeout

**Symptom**: Upload fails for files > 5MB
**Fix**: Increase timeout in server.js, consider chunked uploads

### Issue: Database connection pool exhausted

**Symptom**: "Too many connections" error
**Fix**: Increase `DB_MAX_CONNECTIONS` in .env or optimize query patterns

---

## Test Data

Use this script to populate test data:

```bash
# Create test users, leads, contacts, deals, tasks
node scripts/seedTestData.js
```

---

## Continuous Integration (CI)

Add to GitHub Actions or GitLab CI:

```yaml
test:
  script:
    - npm install
    - npm run lint
    - npm test
  only:
    - merge_requests
```

---

## Support

For testing issues or questions:

1. Check `/logs` directory for detailed error messages
2. Review API_DOCUMENTATION.md for endpoint details
3. Check browser DevTools Network tab for failed requests
4. Review conversation_summary.md for implementation details
