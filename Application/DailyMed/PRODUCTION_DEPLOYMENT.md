# Production Deployment & Configuration Guide

## Environment Variables

### Frontend Configuration (.env or app.json)

```json
{
  "expo": {
    "extra": {
      "apiEnv": "production",
      "apiLocalIp": "192.168.1.71",
      "ngrokUrl": "https://your-ngrok-url.ngrok-free.dev",
      "productionUrl": "https://api.dailymed.com"
    }
  }
}
```

### Backend Configuration (.env)

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dailymed?retryWrites=true&w=majority

# JWT Security
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=30d

# Email (Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=noreply@dailymed.com

# OTP
OTP_EXPIRE_MINUTES=10

# API Keys
ZOOM_ACCOUNT_ID=your-zoom-account-id
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
SECRET_TOKEN=your-secret-token

# Admin Credentials
ADMIN_EMAIL=admin@dailymed.com
ADMIN_PASSWORD=SecurePassword@2025

# ML Service
ML_SERVICE_URL=http://localhost:8000
```

### ML Service Configuration (.env)

```bash
# MongoDB Connection
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dailymed?retryWrites=true&w=majority

# Service Port
ML_SERVICE_PORT=8000

# Logging
DEBUG=False
```

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (frontend, backend, ML service)
- [ ] Security audit completed
- [ ] Database backups configured
- [ ] Secrets manager set up
- [ ] SSL/TLS certificates obtained
- [ ] CDN configured for static assets
- [ ] Rate limiting configured
- [ ] Logging and monitoring set up

### Frontend (React Native/Expo)

1. **Build for Production:**
   ```bash
   eas build --platform all --profile production
   ```

2. **Configure Production URLs:**
   - Update `app.json` with production API URL
   - Set `NODE_ENV=production`
   - Disable console logging

3. **Code Signing:**
   - Use EAS to sign APK and IPA files
   - Store certificates securely

4. **App Store Submission:**
   - iOS: Submit to Apple App Store
   - Android: Submit to Google Play Store

### Backend (Node.js/Express)

1. **Server Setup:**
   ```bash
   # Install dependencies
   npm install --production

   # Start with PM2 (process manager)
   pm2 start server.js --name "dailymed-api" --env production

   # Enable auto-restart
   pm2 startup
   pm2 save
   ```

2. **Reverse Proxy (Nginx):**
   ```nginx
   server {
     listen 443 ssl http2;
     server_name api.dailymed.com;

     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;

     location / {
       proxy_pass http://localhost:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

3. **Environment:**
   - Set `NODE_ENV=production`
   - Use strong JWT secrets
   - Enable rate limiting
   - Configure CORS properly

### ML Service (Python/FastAPI)

1. **Deployment:**
   ```bash
   # Install dependencies
   pip install -r requirements.txt

   # Run with Gunicorn
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   ```

2. **Environment:**
   - Point to production MongoDB
   - Use appropriate port (usually behind reverse proxy)
   - Set `DEBUG=False`

### Database (MongoDB)

1. **Security:**
   - Enable authentication
   - Use IP whitelist
   - Enable encryption at rest and in transit
   - Regular backups (daily)

2. **Optimization:**
   - Create indices on frequently queried fields
   - Enable connection pooling
   - Monitor slow queries

3. **Backup:**
   ```bash
   # Daily backup to S3
   mongodump --uri="mongodb+srv://..." | aws s3 cp - s3://dailymed-backups/backup-$(date +%Y%m%d).dump
   ```

## Security Hardening

### HTTPS/SSL
- Use Let's Encrypt for free certificates
- Auto-renewal via Certbot
- Strong cipher suites only

### API Security
```javascript
// In backend server.js
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Use helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

### Database Security
- Use strong passwords (20+ characters)
- Enable 2FA for MongoDB admin accounts
- Regular security updates
- Monitor access logs

### API Keys & Secrets
- Never commit secrets to version control
- Use environment variables or secrets manager
- Rotate keys regularly (every 90 days)
- Monitor key usage

## Monitoring & Logging

### Logging Service (Sentry)
```javascript
// In backend server.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
// ... route handlers ...
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring
- Monitor API response times
- Track database query performance
- Monitor ML model inference times
- Alert on anomalies

### Health Checks
```bash
# Frontend
GET /health

# Backend
GET /health

# ML Service
GET /health
```

## Scaling Considerations

### Load Balancing
- Use load balancer for multiple backend instances
- Session persistence with Redis
- Database read replicas for heavy read loads

### Caching
- Redis for session/token caching
- CDN for static assets
- API response caching (where appropriate)

### Database Optimization
- Connection pooling
- Query optimization
- Sharding for large collections

## Disaster Recovery

### Backup Strategy
- Daily automated backups
- Weekly encrypted backups to S3
- Monthly off-site backups
- Test restore procedures quarterly

### Failover
- Database replication
- Multi-region deployment (optional)
- DNS failover configuration

### Recovery Time Objectives
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 1 day

## Troubleshooting

### High Memory Usage
- Check for memory leaks
- Monitor long-running queries
- Reduce batch sizes

### Slow API Responses
- Check database query performance
- Monitor network latency
- Review rate limiting settings

### Database Connection Issues
- Verify connection string
- Check IP whitelist
- Monitor connection pool

## Support & Contact

- Issues: GitHub Issues
- Email: support@dailymed.com
- Status: https://status.dailymed.com

---

**Last Updated:** May 2026
**Version:** 1.0.0
