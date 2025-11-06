# Environment Configuration

This document outlines all the environment variables needed to configure the voting API system.

## Required Environment Variables

### Database Configuration

```env
DATABASE_URL="postgresql://username:password@localhost:5432/voting_db"
```

### JWT Configuration

```env
JWT_SECRET="your_jwt_secret_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_here"
```

### SMS Provider Configuration

#### Option 1: Arkesel (Recommended)

```env
SMS_PROVIDER=arkesel
ARKESEL_API_KEY=your_arkesel_api_key_here
ARKESEL_SENDER_ID=ELECTION
ARKESEL_SANDBOX=true  # Set to false for production
```

#### Option 2: Hubtel (Alternative)

```env
SMS_PROVIDER=hubtel
HUBTEL_CLIENT_ID=your_hubtel_client_id_here
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret_here
HUBTEL_SENDER_ID=ELECTION
```

#### Option 3: Mock (Development Only)

```env
SMS_PROVIDER=mock
```

### AWS S3 Configuration (for image storage)

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name_here
```

### Redis Configuration (for rate limiting and caching)

```env
REDIS_URL="redis://localhost:6379"
```

### Server Configuration

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Rate Limiting Configuration

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
OTP_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
OTP_RATE_LIMIT_MAX_REQUESTS=3
VOTING_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
VOTING_RATE_LIMIT_MAX_REQUESTS=1
```

## Complete .env File Example

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/voting_db"

# JWT Configuration
JWT_SECRET="your_jwt_secret_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_here"

# SMS Provider Configuration
SMS_PROVIDER=arkesel

# Arkesel Configuration (for SMS and OTP)
ARKESEL_API_KEY=your_arkesel_api_key_here
ARKESEL_SENDER_ID=ELECTION
ARKESEL_SANDBOX=true  # Set to false for production

# AWS S3 Configuration (for image storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name_here

# Redis Configuration (for rate limiting and caching)
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
OTP_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
OTP_RATE_LIMIT_MAX_REQUESTS=3
VOTING_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
VOTING_RATE_LIMIT_MAX_REQUESTS=1
```

## Environment-Specific Configurations

### Development Environment

- Use `SMS_PROVIDER=mock` for testing without SMS costs
- Set `ARKESEL_SANDBOX=true` if using Arkesel
- Use local database and Redis instances

### Staging Environment

- Use `SMS_PROVIDER=arkesel` with sandbox mode
- Set `ARKESEL_SANDBOX=true`
- Use staging database and Redis instances

### Production Environment

- Use `SMS_PROVIDER=arkesel` with production credentials
- Set `ARKESEL_SANDBOX=false`
- Use production database and Redis instances
- Ensure all secrets are properly secured

## Security Considerations

1. **Never commit .env files to version control**
2. **Use strong, unique secrets for JWT tokens**
3. **Rotate API keys regularly**
4. **Use environment-specific configurations**
5. **Store sensitive data in secure secret management systems**

## Testing Configuration

For testing SMS functionality:

```env
# Test with Arkesel sandbox
SMS_PROVIDER=arkesel
ARKESEL_API_KEY=your_test_api_key_here
ARKESEL_SENDER_ID=TEST
ARKESEL_SANDBOX=true
```

Run the test script:

```bash
npm run test:arkesel
```

## Migration from Hubtel to Arkesel

To migrate from Hubtel to Arkesel:

1. **Update SMS_PROVIDER**:

   ```env
   SMS_PROVIDER=arkesel
   ```

2. **Add Arkesel credentials**:

   ```env
   ARKESEL_API_KEY=your_arkesel_api_key_here
   ARKESEL_SENDER_ID=ELECTION
   ARKESEL_SANDBOX=true  # Start with sandbox
   ```

3. **Remove Hubtel credentials** (optional):

   ```env
   # HUBTEL_CLIENT_ID=...
   # HUBTEL_CLIENT_SECRET=...
   # HUBTEL_SENDER_ID=...
   ```

4. **Test thoroughly**:

   ```bash
   npm run test:arkesel
   ```

5. **Deploy to production**:
   ```env
   ARKESEL_SANDBOX=false
   ```
