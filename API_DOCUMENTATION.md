# CRM API Documentation v2.0

## Authentication Endpoints

### POST `/api/auth/register`

**Description**: Register a new user account

**Request Body**:

```json
{
  "username": "string",
  "email": "string",
  "password": "string (min 6 chars)",
  "first_name": "string",
  "last_name": "string"
}
```

**Response** (201):

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "JWT_TOKEN",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "Employee"
  }
}
```

### POST `/api/auth/login`

**Description**: Authenticate user and receive JWT token

**Request Body**:

```json
{
  "username": "string",
  "password": "string"
}
```

**Response** (200):

```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "Employee"
  }
}
```

### GET `/api/auth/me`

**Description**: Get current authenticated user

**Headers**:

```
Authorization: Bearer JWT_TOKEN
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "Employee",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### POST `/api/auth/refresh`

**Description**: Refresh JWT token

**Headers**:

```
Authorization: Bearer JWT_TOKEN
```

**Response** (200):

```json
{
  "success": true,
  "token": "NEW_JWT_TOKEN"
}
```

---

## Leads Endpoints

### GET `/api/leads`

**Description**: List all leads with pagination and filtering

**Query Parameters**:

- `page` (integer): Page number (default: 1)
- `limit` (integer): Records per page (default: 10, max: 100)
- `search` (string): Search by name, email, phone, company
- `status` (string): Filter by status
- `source` (string): Filter by source
- `assigned_to` (integer): Filter by user ID
- `date_from` (date): Filter by creation date
- `date_to` (date): Filter by creation date

**Response** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890",
      "company": "ABC Corp",
      "status": "New",
      "source": "Website",
      "assigned_to": 2,
      "notes": "Promising lead",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_records": 50,
    "limit": 10
  }
}
```

### GET `/api/leads/:id`

**Description**: Get single lead with comments and attachments

**Response** (200):

```json
{
  "success": true,
  "data": {
    "lead": {
      /* lead object */
    },
    "comments": [
      /* array of comments */
    ],
    "attachments": [
      /* array of files */
    ],
    "activities": [
      /* array of activities */
    ]
  }
}
```

### POST `/api/leads`

**Description**: Create a new lead

**Request Body**:

```json
{
  "name": "string (required)",
  "email": "string",
  "phone": "string",
  "company": "string",
  "source": "Website|Referral|Cold Call|Email|Social Media",
  "notes": "string"
}
```

**Response** (201):

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    /* lead object */
  }
}
```

### PUT `/api/leads/:id`

**Description**: Update an existing lead

**Response** (200):

```json
{
  "success": true,
  "message": "Lead updated successfully",
  "data": {
    /* updated lead object */
  }
}
```

### PUT `/api/leads/:id/assign`

**Description**: Assign lead to a user

**Request Body**:

```json
{
  "assigned_to": 2
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Lead assigned successfully"
}
```

### DELETE `/api/leads/:id`

**Description**: Delete a lead

**Response** (200):

```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

## Contacts Endpoints

### GET `/api/contacts`

**Description**: List all contacts

**Query Parameters**: Same as leads (page, limit, search, etc.)

### POST `/api/contacts`

**Description**: Create a new contact

**Request Body**:

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "job_title": "string",
  "notes": "string"
}
```

### PUT `/api/contacts/:id`

**Description**: Update contact

### DELETE `/api/contacts/:id`

**Description**: Delete contact

---

## Deals Endpoints

### GET `/api/deals`

**Description**: List all deals

**Query Parameters**:

- `page`, `limit`, `search`
- `stage`: Filter by stage (Qualification|Proposal|Negotiation|Won|Lost)
- `min_value`, `max_value`: Filter by deal amount

### GET `/api/deals/kanban/board`

**Description**: Get deals grouped by stage for Kanban view

**Response** (200):

```json
{
  "success": true,
  "data": {
    "Qualification": [{ "id": 1, "title": "Deal 1", "value": 50000 /* ... */ }],
    "Proposal": [],
    "Negotiation": [],
    "Won": [],
    "Lost": []
  }
}
```

### POST `/api/deals`

**Description**: Create a new deal

**Request Body**:

```json
{
  "title": "string",
  "value": "number",
  "stage": "Qualification|Proposal|Negotiation|Won|Lost",
  "contact_id": "number",
  "assigned_to": "number",
  "expected_close_date": "date",
  "notes": "string"
}
```

### PATCH `/api/deals/:id/move`

**Description**: Move deal between stages

**Request Body**:

```json
{
  "stage": "Proposal"
}
```

### PUT `/api/deals/:id`

**Description**: Update deal

### DELETE `/api/deals/:id`

**Description**: Delete deal

---

## Tasks Endpoints

### GET `/api/tasks`

**Description**: List all tasks

**Query Parameters**:

- `page`, `limit`, `search`
- `status`: Filter by status (Open|In Progress|Completed|Cancelled)
- `priority`: Filter by priority (Low|Medium|High|Urgent)
- `assigned_to`: Filter by user
- `my_tasks`: Boolean, show only assigned to current user
- `due_soon`: Boolean, show tasks due in next 3 days

### POST `/api/tasks`

**Description**: Create a new task

**Request Body**:

```json
{
  "title": "string",
  "description": "string",
  "priority": "Low|Medium|High|Urgent",
  "due_date": "date",
  "assigned_to": "number",
  "related_lead_id": "number",
  "related_deal_id": "number"
}
```

### PUT `/api/tasks/:id`

**Description**: Update task

### PATCH `/api/tasks/:id/status`

**Description**: Update task status

**Request Body**:

```json
{
  "status": "In Progress"
}
```

### DELETE `/api/tasks/:id`

**Description**: Delete task

---

## Dashboard Endpoints

### GET `/api/dashboard`

**Description**: Get dashboard overview with stats, charts, and analytics

**Response** (200):

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 150,
      "totalContacts": 85,
      "totalDeals": 12,
      "pendingTasks": 8,
      "totalUsers": 5,
      "totalRevenue": 250000,
      "monthlyRevenue": 50000,
      "pipelineValue": 450000,
      "conversionRate": "8%"
    },
    "myStats": {
      "my_leads": 25,
      "my_deals": 3,
      "my_deal_value": 75000,
      "my_tasks": 5
    },
    "activities": [
      /* recent activities */
    ],
    "topUsers": [
      /* top performers */
    ],
    "breakdown": {
      "leadsByStatus": [
        /* status breakdown */
      ],
      "dealsByStage": [
        /* stage breakdown */
      ]
    }
  }
}
```

### GET `/api/dashboard/audit/logs`

**Description**: Get audit trail

**Query Parameters**:

- `entity_type`: Filter by entity type
- `days`: Number of days to retrieve (default: 30)

---

## Notifications Endpoints

### GET `/api/notifications`

**Description**: List all notifications

**Query Parameters**:

- `page`, `limit`
- `unread_only`: Boolean, show only unread

### GET `/api/notifications/unread/count`

**Description**: Get count of unread notifications

**Response** (200):

```json
{
  "success": true,
  "count": 3
}
```

### PUT `/api/notifications/:id/read`

**Description**: Mark notification as read

### PUT `/api/notifications/all/read`

**Description**: Mark all notifications as read

### DELETE `/api/notifications/:id`

**Description**: Delete notification

---

## Comments Endpoints

### GET `/api/comments/:entity_type/:entity_id`

**Description**: Get comments for an entity

**Path Parameters**:

- `entity_type`: lead|contact|deal|task
- `entity_id`: numeric ID

### POST `/api/comments`

**Description**: Add a comment

**Request Body**:

```json
{
  "entity_type": "lead|contact|deal|task",
  "entity_id": 1,
  "content": "Comment text"
}
```

### PUT `/api/comments/:id`

**Description**: Edit comment (own only)

### DELETE `/api/comments/:id`

**Description**: Delete comment (own only)

---

## Attachments Endpoints

### GET `/api/attachments/:entity_type/:entity_id`

**Description**: List files for an entity

### POST `/api/attachments`

**Description**: Upload file

**Form Data**:

- `file`: File to upload (max 10MB)
- `entity_type`: lead|contact|deal|task
- `entity_id`: numeric ID

### GET `/api/attachments/download/:id`

**Description**: Download file

### DELETE `/api/attachments/:id`

**Description**: Delete attachment

---

## Reports Endpoints

### GET `/api/reports/export/leads`

**Description**: Export leads to CSV

**Query Parameters**:

- `date_from`, `date_to`: Optional date filters

**Response**: CSV file download

### GET `/api/reports/export/contacts`

**Description**: Export contacts to CSV

### GET `/api/reports/export/deals`

**Description**: Export deals to CSV

### GET `/api/reports/monthly/leads`

**Description**: Get monthly lead statistics

### GET `/api/reports/deals/summary`

**Description**: Get deals grouped by stage with stats

### GET `/api/reports/users/performance`

**Description**: Get user performance metrics

---

## Users Management Endpoints

### GET `/api/users`

**Description**: List all users (Admin/Manager only)

**Query Parameters**:

- `page`, `limit`, `search`

### GET `/api/users/:id`

**Description**: Get user details

### POST `/api/users`

**Description**: Create new user (Admin only)

**Request Body**:

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "role": "Admin|Manager|Employee"
}
```

### PUT `/api/users/:id`

**Description**: Update user (Admin only)

### PUT `/api/users/:id/password`

**Description**: Change password

**Request Body**:

```json
{
  "current_password": "string",
  "new_password": "string"
}
```

### DELETE `/api/users/:id`

**Description**: Delete user (Admin only, cannot delete last admin)

---

## Error Responses

All endpoints return standardized error responses:

**400 - Bad Request**:

```json
{
  "success": false,
  "message": "Validation error description",
  "errors": ["Field-specific errors"]
}
```

**401 - Unauthorized**:

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**403 - Forbidden**:

```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

**500 - Internal Server Error**:

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (development only)"
}
```

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Token Expiry**: 7 days

**Token Refresh**: Call `/api/auth/refresh` before expiration

---

## Rate Limiting

- General endpoints: 100 requests per minute per IP
- Auth endpoints: 10 requests per minute per IP
- File uploads: 5 requests per minute per user

---

## Pagination

Default pagination applies to list endpoints:

- **Default limit**: 10 records
- **Max limit**: 100 records
- **Default page**: 1

Response includes metadata:

```json
"pagination": {
  "current_page": 1,
  "total_pages": 5,
  "total_records": 50,
  "limit": 10
}
```

---

## Roles & Permissions

### Admin

- Full access to all endpoints
- User management
- System settings
- Audit logs

### Manager

- Team member management
- Reports and analytics
- Lead/Deal management
- Partial user settings

### Employee

- Own leads and deals
- Basic reporting
- Task management
- Cannot manage other users

---

## Webhook Events (Future)

- `lead.created` - New lead added
- `deal.stage_changed` - Deal moved to new stage
- `task.due_soon` - Task due in 24 hours
- `user.login` - User logged in
- `file.uploaded` - New file attached

---

## Code Examples

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","password":"password123"}'

# Get leads (with token)
curl -X GET http://localhost:3000/api/leads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create lead
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","company":"XYZ Inc"}'
```

### JavaScript/Fetch

```javascript
// Login
const response = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "john_doe", password: "password123" }),
});
const { token } = await response.json();

// Get leads
const leads = await fetch("http://localhost:3000/api/leads", {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await leads.json();
```

### Python

```python
import requests

# Login
response = requests.post('http://localhost:3000/api/auth/login', json={
  'username': 'john_doe',
  'password': 'password123'
})
token = response.json()['token']

# Get leads
headers = {'Authorization': f'Bearer {token}'}
leads = requests.get('http://localhost:3000/api/leads', headers=headers)
data = leads.json()
```

---

## Support & Issues

- Documentation: See `/README.md`
- Deployment: See `/DEPLOYMENT.md`
- Issues: Check `/logs` directory for error logs
- Contact: Support team email
