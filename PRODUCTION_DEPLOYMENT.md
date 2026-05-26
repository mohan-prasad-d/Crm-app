# Production Deployment Guide - CRM v2.0

## Pre-Deployment Checklist

- [ ] All tests passing (see TESTING_GUIDE.md)
- [ ] Environment variables configured
- [ ] Database backups set up
- [ ] SSL certificates obtained
- [ ] Reverse proxy configured
- [ ] Process manager installed
- [ ] Log rotation configured
- [ ] Monitoring tools configured
- [ ] Backup strategy documented
- [ ] Disaster recovery plan tested

---

## System Requirements

### Minimum Server Specifications

- **CPU**: 2 cores (4+ recommended)
- **RAM**: 4GB (8GB+ recommended)
- **Disk**: 50GB SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### Software Requirements

- Node.js: v14.0.0 or higher (v18+ recommended)
- npm: 6.0.0 or higher
- MySQL: 5.7 or 8.0
- Nginx: 1.18 or higher
- PM2: 5.2.0 or higher

---

## Step 1: Prepare Production Environment

### 1.1 Create Production Server User

```bash
# Connect to your server
ssh root@your-server-ip

# Create non-root user for app
useradd -m -s /bin/bash crm-user
usermod -aG sudo crm-user

# Switch to new user
su - crm-user
```

### 1.2 Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y build-essential git curl wget
```

### 1.3 Install Node.js

```bash
# Using NodeSource repository (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x
```

### 1.4 Install MySQL Server

```bash
# Install MySQL
sudo apt-get install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create application database
sudo mysql -u root -p
```

```sql
CREATE DATABASE crm_production;
CREATE USER 'crm_app'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON crm_production.* TO 'crm_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 1.5 Install Nginx

```bash
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.6 Install PM2

```bash
sudo npm install -g pm2

# Enable PM2 to auto-start on reboot
pm2 startup
pm2 save
```

---

## Step 2: Deploy Application

### 2.1 Clone Repository

```bash
cd /home/crm-user
git clone https://github.com/your-username/crm-app.git
cd crm-app
```

### 2.2 Install Dependencies

```bash
npm install --production
```

### 2.3 Create Production .env File

```bash
nano .env
```

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=crm_app
DB_PASSWORD=strong_password_here
DB_NAME=crm_production
DB_MAX_CONNECTIONS=20
DB_QUEUE_LIMIT=5

# JWT Configuration
JWT_SECRET=your-very-long-random-secret-key-here-at-least-32-characters
JWT_EXPIRE_DAYS=7

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@crm.company.com
SMTP_ENABLED=true

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,txt,csv

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=./logs
LOG_MAX_SIZE=10m
LOG_MAX_FILES=30

# CORS Configuration
CORS_ORIGIN=https://crm.company.com
CORS_CREDENTIALS=true

# Analytics (Optional)
ENABLE_ANALYTICS=true
ANALYTICS_PROVIDER=google

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### 2.4 Initialize Database

```bash
node config/initDB.js

# If using existing database with data:
mysql -u crm_app -p crm_production < CRM-MYSQL.session.sql
```

### 2.5 Create Required Directories

```bash
mkdir -p uploads logs temp/exports
chmod 755 uploads logs temp/exports
```

---

## Step 3: Configure Nginx Reverse Proxy

### 3.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/crm
```

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name crm.company.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name crm.company.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/crm.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.company.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/crm_access.log combined;
    error_log /var/log/nginx/crm_error.log warn;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 1000;
    gzip_vary on;

    # Client Upload Limit
    client_max_body_size 10M;

    # Root for static files
    root /home/crm-user/crm-app/public;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File upload handling
    location /uploads/ {
        alias /home/crm-user/crm-app/uploads/;
        expires 7d;
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index-enhanced.html;
    }
}
```

### 3.2 Enable Site Configuration

```bash
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/crm

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 4: Set Up SSL Certificates

### 4.1 Install Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 4.2 Obtain SSL Certificate

```bash
sudo certbot certonly --nginx -d crm.company.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## Step 5: Configure Process Management

### 5.1 Start Application with PM2

```bash
cd /home/crm-user/crm-app

# Start application
pm2 start server.js --name "crm-app"

# Configure PM2 to auto-restart on reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs crm-app

# View status
pm2 status
```

### 5.2 Create PM2 Ecosystem File (Advanced)

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: "crm-app",
      script: "server.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
    },
  ],
};
```

```bash
# Start with ecosystem file
pm2 start ecosystem.config.js
pm2 save
```

---

## Step 6: Configure Logging & Monitoring

### 6.1 Log Rotation

```bash
sudo nano /etc/logrotate.d/crm-app
```

```
/home/crm-user/crm-app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 crm-user crm-user
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

### 6.2 Monitor Application Health

```bash
# Install monitoring tool (optional)
npm install -g pm2-plus

# Enable monitoring
pm2 install pm2-auto-pull

# Check logs
pm2 logs crm-app

# Monitor resource usage
pm2 monit
```

### 6.3 Set Up External Monitoring (Optional)

```bash
# Sentry for error tracking
npm install @sentry/node

# Datadog for metrics
npm install dd-trace
```

---

## Step 7: Database Optimization

### 7.1 Configure MySQL for Production

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add/modify these settings:

```ini
# Memory & Performance
max_connections=100
max_allowed_packet=16M
innodb_buffer_pool_size=2G
innodb_log_file_size=512M

# Query Optimization
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2

# Replication (if using)
server-id=1
log_bin=/var/log/mysql/mysql-bin.log
```

### 7.2 Enable Binary Logging for Backups

```bash
sudo service mysql restart
```

### 7.3 Create Regular Backups

```bash
# Create backup script
nano ~/backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="crm_production"
DB_USER="crm_app"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# Full backup
mysqldump -u$DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/crm_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "crm_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/crm_$DATE.sql.gz"
```

```bash
chmod +x ~/backup_db.sh

# Schedule with cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/crm-user/backup_db.sh") | crontab -
```

---

## Step 8: Security Hardening

### 8.1 Configure Firewall

```bash
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3306/tcp from localhost  # MySQL (localhost only)
sudo ufw status
```

### 8.2 SSH Security

```bash
sudo nano /etc/ssh/sshd_config
```

```
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl reload ssh
```

### 8.3 Environment Security

```bash
# Protect .env file
chmod 600 /home/crm-user/crm-app/.env

# Limit file permissions
chmod 755 /home/crm-user/crm-app
chmod 755 /home/crm-user/crm-app/logs
chmod 755 /home/crm-user/crm-app/uploads
```

### 8.4 Install Fail2Ban

```bash
sudo apt-get install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Step 9: Monitoring & Health Checks

### 9.1 Monitor Process Status

```bash
# PM2 Plus monitoring (recommended)
pm2 plus

# Or manual checks
pm2 status
pm2 logs crm-app --lines 50 --err
```

### 9.2 Monitor System Resources

```bash
# Installation
sudo apt-get install -y htop iotop

# Monitor CPU/Memory
htop

# Monitor Disk I/O
iotop
```

### 9.3 Health Check Endpoint

Add to server.js:

```javascript
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

Monitor with:

```bash
# Every 30 seconds
watch -n 30 'curl http://localhost:3000/health'
```

---

## Step 10: Scaling Considerations

### 10.1 Load Balancing

For multiple servers, use Nginx upstream:

```nginx
upstream crm_backend {
    server 10.0.1.10:3001;
    server 10.0.1.11:3001;
    server 10.0.1.12:3001;
}

server {
    # ... SSL config ...
    location /api/ {
        proxy_pass http://crm_backend;
    }
}
```

### 10.2 Database Replication

For high availability:

```bash
# Master-Slave replication setup
# See MySQL documentation for detailed steps
```

### 10.3 Redis Caching (Optional)

```bash
sudo apt-get install -y redis-server

# Add to Node.js app
npm install redis
```

---

## Step 11: Post-Deployment Verification

### 11.1 Test Application Access

```bash
# Test HTTPS redirect
curl -I http://crm.company.com
# Should redirect to https

# Test API endpoint
curl https://crm.company.com/api/health

# Test login
curl -X POST https://crm.company.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### 11.2 Run Test Suite

```bash
cd /home/crm-user/crm-app
npm test  # If tests configured
```

### 11.3 Performance Benchmarking

```bash
# Load testing
npm install -g loadtest

loadtest -n 1000 -c 100 \
  https://crm.company.com/api/leads
```

### 11.4 Security Audit

```bash
# Check headers
curl -I https://crm.company.com

# Run security scanner
npm audit

# Check SSL certificate
openssl s_client -connect crm.company.com:443
```

---

## Step 12: Maintenance & Updates

### 12.1 Regular Update Schedule

```bash
# Monthly security updates
sudo apt-get update && sudo apt-get upgrade -y

# Quarterly dependency updates
cd /home/crm-user/crm-app
npm audit fix
npm update
```

### 12.2 Database Maintenance

```bash
# Monthly optimization
OPTIMIZE TABLE leads, contacts, deals, tasks, activities;

# Check for errors
CHECK TABLE leads, contacts, deals, tasks, activities;
```

### 12.3 Log Management

```bash
# Review error logs weekly
tail -f /home/crm-user/crm-app/logs/error.log

# Archive old logs
find /home/crm-user/crm-app/logs -name "*.log" -mtime +30 -delete
```

---

## Troubleshooting

### Issue: Application won't start

```bash
# Check logs
pm2 logs crm-app

# Verify environment
cat .env | grep PORT

# Check port is available
sudo lsof -i :3001
```

### Issue: Database connection failed

```bash
# Test connection
mysql -u crm_app -p crm_production

# Check MySQL service
sudo systemctl status mysql

# Verify credentials in .env
```

### Issue: HTTPS redirect loop

```bash
# Check Nginx config
sudo nginx -t

# Verify SSL certificates
sudo certbot certificates
```

### Issue: High memory usage

```bash
# Monitor memory
pm2 monit

# Check for memory leaks
pm2 logs crm-app --err

# Increase restart threshold
pm2 start server.js --max-memory-restart 500M
```

---

## Disaster Recovery

### Database Restoration

```bash
# List available backups
ls -la /backups/crm/

# Restore from backup
mysql -u crm_app -p crm_production < /backups/crm/crm_20240115_020000.sql.gz
```

### Application Rollback

```bash
# Check Git history
git log --oneline

# Revert to previous version
git revert HEAD

# Restart application
pm2 restart crm-app
```

---

## Performance Optimization Tips

1. **Enable Gzip Compression** (Done in Nginx config)
2. **Use CDN for Static Assets** (Configure in Nginx)
3. **Implement Caching** (Redis or Memcached)
4. **Optimize Database Queries** (Add indexes, see TESTING_GUIDE.md)
5. **Connection Pooling** (Already configured in db.js)
6. **Load Balancing** (Nginx upstream)
7. **Enable Clustering** (PM2 cluster mode)

---

## Support & Documentation

- **API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing Guide**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Database Schema**: See [CRM-MYSQL.session.sql](./CRM-MYSQL.session.sql)
- **Environment Setup**: See [.env.example](./.env.example)

---

## Deployment Checklist Summary

- [ ] Server provisioned and configured
- [ ] Node.js and npm installed
- [ ] MySQL database created and optimized
- [ ] Application cloned and dependencies installed
- [ ] .env file created with production values
- [ ] Database initialized with schema
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificates installed (Let's Encrypt)
- [ ] PM2 configured and application running
- [ ] Backups automated and tested
- [ ] Monitoring configured
- [ ] Security hardening completed
- [ ] All tests passing
- [ ] Health checks configured
- [ ] DNS pointing to server
- [ ] HTTPS redirect working
- [ ] Application accessible in browser
- [ ] All modules functional
- [ ] Email notifications working
- [ ] File uploads working
- [ ] Database backups verified
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Runbooks prepared for operations team

---

**Deployment Completed!** 🚀

Your CRM application is now running in production. Monitor the logs, perform regular backups, and stay updated with security patches.
