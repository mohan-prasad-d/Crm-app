# Enhanced CRM Application v2.0

A production-ready Customer Relationship Management (CRM) system with advanced features including JWT authentication, role-based access control, real-time notifications, file uploads, analytics, and more.

## Features

### Core Features

- ✅ **User Management & Authentication**
  - JWT-based authentication
  - Secure password hashing with bcryptjs
  - User roles (Admin, Manager, Employee)

- ✅ **Role-Based Access Control (RBAC)**
  - Granular permission management
  - Module and action-based access control
  - Protected API endpoints

- ✅ **Lead Management**
  - Advanced search and filtering
  - Lead assignment to team members
  - Lead assignment history tracking
  - Multi-field search (name, email, phone, company)
  - Status tracking (New, Contacted, Qualified, Proposal, Won, Lost)

- ✅ **Contact Management**
  - Company-based organization
  - Related leads/deals display
  - Contact history

- ✅ **Deals Pipeline**
  - Kanban board view
  - Custom stages (Qualification, Proposal, Negotiation, Won, Lost)
  - Deal value tracking
  - Probability estimation
  - Drag-and-drop stage movement (API support)

- ✅ **Task Management**
  - Task assignment to team members
  - Priority levels (Low, Medium, High)
  - Due date tracking
  - Task status workflow
  - Task filtering and search

- ✅ **Activity Logging & Audit Trail**
  - Comprehensive audit logs
  - Track create, update, delete actions
  - User activity timeline
  - Change history with before/after values
  - IP address and user agent logging

- ✅ **Notifications System**
  - In-app notifications
  - Lead assignment notifications
  - Task deadline reminders
  - Deal status updates
  - Optional email notifications
  - Unread count tracking

- ✅ **File Attachments**
  - Upload documents to leads/contacts/deals
  - Secure file storage
  - File type validation (PDF, images, documents)
  - 10MB file size limit
  - Download and delete functionality

- ✅ **Comments & Collaboration**
  - Add comments to leads, contacts, deals, tasks
  - Team discussion inside CRM
  - Comment editing (own comments only)
  - Timestamp tracking

- ✅ **Dashboard & Analytics**
  - Real-time statistics
  - Revenue analytics
  - Lead conversion rates
  - Deal pipeline value
  - Monthly trend analysis
  - Top performing users
  - Personal performance metrics
  - Recent activity feed

- ✅ **Reports & Export**
  - CSV export for leads, contacts, deals
  - Monthly lead statistics
  - Deal summary by stage
  - User performance reports
  - Date range filtering

- ✅ **Pagination & Performance**
  - Server-side pagination
  - Configurable page limits
  - Database indexing
  - Query optimization

- ✅ **Error Handling & Logging**
  - Centralized error handler
  - Winston-based logging
  - File-based logs (error.log, combined.log)
  - Request logging with Morgan
  - Structured error responses

## Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 5.7+
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet
- **File Handling**: multer
- **Email**: nodemailer
- **Logging**: winston, morgan
- **Data Export**: csv-writer
- **Utilities**: moment, dotenv

### Frontend

- HTML5
- CSS3 (with responsive design)
- Vanilla JavaScript (ES6+)
- Chart.js (for analytics)

## Installation

### Prerequisites

- Node.js 14.0+
- npm or yarn
- MySQL 5.7 or higher

### Setup Steps

1. **Clone Repository**

```bash
git clone <repository-url>
cd crm-app
```

2. **Install Dependencies**

```bash
npm install
```

3. **Configure Environment**

```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

4. **Environment Variables**

```
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crm_system
DB_PORT=3306

JWT_SECRET=your-secret-key-change-in-production

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

5. **Start Server**

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

6. **Access Application**

- Open browser: `http://localhost:3000`
- Default login: Create account via registration

## API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe",
  "role": "Employee"
}

Response: 201 Created
{
  "success": true,
  "token": "jwt_token_here",
  "user": { id, username, email, role }
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure_password"
}

Response: 200 OK
{
  "success": true,
  "token": "jwt_token_here",
  "user": { id, username, email, role }
}
```

### Protected Endpoints (Require JWT Token)

```http
Authorization: Bearer <jwt_token>
```

#### Get All Leads

```http
GET /api/leads?page=1&limit=10&status=New&search=John&my_leads=true
```

#### Create Lead

```http
POST /api/leads
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john@company.com",
  "phone": "123-456-7890",
  "company": "Tech Corp",
  "source": "Website",
  "status": "New",
  "assigned_to": 2
}
```

#### Get Dashboard

```http
GET /api/dashboard
```

#### Get Notifications

```http
GET /api/notifications?unread_only=true
```

#### Add Comment

```http
POST /api/comments/lead/5
Content-Type: application/json

{
  "content": "This lead looks promising!"
}
```

#### Upload Attachment

```http
POST /api/attachments/lead/5
Content-Type: multipart/form-data

File: document.pdf
```

#### Export Leads

```http
GET /api/reports/export/leads?status=Won&date_from=2024-01-01
```

## User Roles & Permissions

### Admin

- Full access to all modules
- User management
- Settings management
- Can view all reports

### Manager

- Create, read, update, delete leads, contacts, deals, tasks
- Assign items to team members
- Can view reports
- Cannot manage users

### Employee

- Create, read, update leads, contacts, deals
- Can only update own tasks
- Limited reporting access

## Folder Structure

```
crm-app/
├── config/
│   ├── db.js                 # Database connection pool
│   └── initDB.js             # Database schema initialization
├── middleware/
│   ├── auth.js               # JWT authentication
│   └── rbac.js               # Role-based access control
├── utilities/
│   ├── logger.js             # Winston logger configuration
│   ├── errorHandler.js       # Centralized error handling
│   ├── validator.js          # Input validation
│   ├── auditLog.js           # Audit logging
│   ├── notificationService.js # Notification management
│   ├── emailService.js       # Email sending
│   ├── csvExport.js          # CSV export functionality
│   └── pagination.js         # Pagination helpers
├── routes/
│   ├── authRoutes.js         # Authentication endpoints
│   ├── leadsRoutes.js        # Lead management
│   ├── contactsRoutes.js     # Contact management
│   ├── dealsRoutes.js        # Deal/Pipeline management
│   ├── tasksRoutes.js        # Task management
│   ├── dashboardRoutes.js    # Dashboard & analytics
│   ├── usersRoutes.js        # User management
│   ├── notificationsRoutes.js # Notifications
│   ├── commentsRoutes.js     # Comments & collaboration
│   ├── attachmentsRoutes.js  # File uploads
│   └── reportsRoutes.js      # Reports & exports
├── public/
│   ├── index.html            # Frontend UI
│   ├── app.js                # Frontend logic
│   └── style.css             # Styling
├── uploads/                  # Uploaded files (gitignored)
├── logs/                     # Application logs (gitignored)
├── server.js                 # Express app setup
├── package.json              # Dependencies
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── DEPLOYMENT.md             # Production deployment guide
└── README.md                 # This file
```

## Database Schema

### Key Tables

- `users` - User accounts with roles
- `leads` - Sales leads with assignment tracking
- `contacts` - Business contacts
- `deals` - Pipeline deals with stages
- `tasks` - Team tasks and reminders
- `audit_logs` - Complete activity audit trail
- `activities` - User activity feed
- `notifications` - In-app notifications
- `comments` - Collaborative comments
- `attachments` - File uploads
- `email_logs` - Email send tracking

All tables include proper indexing for performance optimization.

## Security Features

- ✅ JWT token-based authentication (7-day expiry)
- ✅ Bcrypt password hashing
- ✅ CORS configuration
- ✅ Role-based access control (RBAC)
- ✅ Input validation and sanitization
- ✅ SQL injection protection (parameterized queries)
- ✅ File upload validation
- ✅ Audit logging for compliance
- ✅ IP address and user agent logging

## Performance Optimization

- Database connection pooling
- Server-side pagination (no loading all records)
- Indexed database columns
- Response compression ready
- Static file serving optimized
- Query optimization in all endpoints

## Logging

Application generates logs in `/logs` directory:

- `error.log` - Error messages only
- `combined.log` - All log levels

View logs:

```bash
tail -f logs/combined.log
pm2 logs
```

## Troubleshooting

### Database Connection Error

```
Solution: Verify MySQL is running and .env credentials are correct
mysql -u <user> -p<password> -h <host> -e "SELECT 1;"
```

### Port Already in Use

```
Solution: Change PORT in .env or kill the process
lsof -i :3000
kill -9 <PID>
```

### JWT Token Expired

```
Solution: Login again to get a new token or use refresh endpoint
POST /api/auth/refresh
```

## Future Enhancements

- [ ] Real-time collaboration with WebSockets
- [ ] Advanced analytics with Elasticsearch
- [ ] Mobile app (React Native)
- [ ] API rate limiting
- [ ] Two-factor authentication
- [ ] Custom fields/metadata
- [ ] Workflow automation
- [ ] Integration with email/calendar
- [ ] Voice/video call integration
- [ ] AI-powered lead scoring

## Support & Contributing

For issues, feature requests, or contributions, please open a GitHub issue.

## License

MIT License - Feel free to use in personal or commercial projects

## Author

Created as a production-ready CRM system with enterprise features.

---

**Version**: 2.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
