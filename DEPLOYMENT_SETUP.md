# Ghana Election Platform - Deployment Setup

## Overview

This document provides setup instructions for the Ghana Election Platform with the latest configuration:

- **Ghana Numbers**: Uses Arkesel SMS gateway
- **International Numbers**: Uses Twilio SMS
- **Admin Authentication**: Phone + Password only
- **Site Manager**: Can register new admins using a secure key

## Environment Configuration

### Required Environment Variables

Copy the following to your production `.env` file:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database?schema=public

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Server Configuration
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# SMS Service Configuration
SMS_PROVIDER=arkesel

# Arkesel Configuration (for Ghana numbers)
ARKESEL_API_KEY=your_arkesel_api_key_here
ARKESEL_SENDER_ID="YOUR_SENDER_ID"
ARKESEL_SANDBOX=false

# Twilio Configuration (for international OTP verification)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Twilio Verify Service SID for OTP verification
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here

# Site Manager Configuration
SITE_MANAGER_KEY=your-super-secret-site-manager-key-change-in-production

# Storage Configuration
STORAGE_PROVIDER=aws
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=voting-candidate-images
CDN_BASE_URL=https://your-cdn-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Setup Instructions

### 1. Arkesel SMS Setup (Ghana Numbers)

1. Register at [Arkesel](https://arkesel.com)
2. Get your API key from the dashboard
3. Register a sender ID with Ghana's National Communications Authority
4. Add to environment:
   ```bash
   ARKESEL_API_KEY=your_api_key_here
   ARKESEL_SENDER_ID="YOUR_SENDER_ID"
   ARKESEL_SANDBOX=false
   ```

### 2. Twilio Verify Setup (International Numbers)

1. Register at [Twilio](https://twilio.com)
2. Get your Account SID and Auth Token from the console
3. **Create a Verify Service**
   - Go to **Verify** > **Services** in the Twilio Console
   - Click **Create new Service**
   - Enter a service name (e.g., "Ghana Election Verify")
   - Configure settings:
     - Code Length: 6 digits (recommended)
     - Default expiry: 5 minutes
     - Enable rate limiting and fraud protection
   - Get the Verify Service SID (starts with `VA`)
   - Configure:
     ```bash
     TWILIO_ACCOUNT_SID=your_account_sid_here
     TWILIO_AUTH_TOKEN=your_auth_token_here
     TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
     ```

**Benefits of Twilio Verify:**
- Fraud protection and rate limiting built-in
- Multiple verification channels (SMS, Voice, WhatsApp, Email)
- Automatic OTP generation and validation
- Compliance with security best practices
- No need to manage phone numbers or messaging services
- Better delivery rates through Twilio's global infrastructure

### 3. Database Setup

1. Create a PostgreSQL database
2. Update the `DATABASE_URL` in your environment
3. Run migrations:
   ```bash
   npm run db:migrate
   ```

### 4. Admin Setup

1. Set a secure site manager key:
   ```bash
   SITE_MANAGER_KEY=your-super-secret-site-manager-key
   ```

2. Create the first admin using the API:
   ```bash
   curl -X POST https://your-api-domain.com/api/auth/register-admin \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Admin Name",
       "phone": "+233240000000",
       "password": "secure_password",
       "role": "ADMIN",
       "siteManagerKey": "your-super-secret-site-manager-key"
     }'
   ```

## Key Features

### SMS Routing
- **Ghana numbers** (+233, 0XX): Routed to Arkesel
- **International numbers**: Routed to Twilio
- Automatic detection and routing based on phone number format

### Admin Authentication
- Admins login using phone number + password
- No email required
- JWT-based sessions

### Voter Registration
- Bulk upload via Excel/CSV files
- Individual voter creation
- Phone number validation for Ghana and international formats

### Voting Process
1. Voter enters phone number
2. OTP sent via appropriate SMS provider
3. Voter verifies OTP
4. Voter sees all positions and candidates
5. Voter submits votes for all positions
6. One-time voting enforced - cannot vote again

### Security Features
- Rate limiting on OTP requests and voting
- JWT token authentication
- Audit logging
- Input validation
- SQL injection protection

## Testing

### Test Arkesel Integration
```bash
npm run test:arkesel
```

### Test Twilio Verify Integration
```bash
npm run test:twilio
```

### Test OTP Flow
```bash
npm run test:otp-api
```

## Monitoring

The system logs all important events including:
- SMS sending attempts and results
- Login attempts
- Voting actions
- Admin actions
- Errors and failures

Check your application logs for monitoring and debugging.

## Security Considerations

1. **Environment Variables**: Never commit actual credentials to git
2. **HTTPS**: Always use HTTPS in production
3. **Database**: Use strong database credentials and restrict access
4. **SMS Providers**: Monitor SMS usage to prevent abuse
5. **Rate Limiting**: Configure appropriate rate limits for your expected load
6. **Backups**: Regular database backups
7. **Monitoring**: Set up alerts for errors and unusual activity

## Support

For technical support and configuration assistance, contact the development team.