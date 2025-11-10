# Production Deployment - Quick Start

This document provides a quick reference for deploying the Ghana Election Platform API to production with AWS S3.

## 🚀 Quick Deploy Checklist

### 1. AWS S3 Setup
```bash
# Create S3 bucket in AWS Console or via CLI
aws s3 mb s3://voting-candidate-images --region us-east-1

# Set bucket policy for public read access
aws s3api put-bucket-policy --bucket voting-candidate-images --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::voting-candidate-images/*"
  }]
}'
```

### 2. Environment Configuration
```bash
# Copy and edit production environment file
cp .env.production.example .env.production

# Required variables for AWS S3:
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=voting-candidate-images
CDN_BASE_URL=https://your-cloudfront-url (optional)
```

### 3. Build and Deploy
```bash
# Build Docker image
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f api

# Verify health
curl http://localhost:4000/health
```

## 📋 Environment Variables Reference

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/voting` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Generate with `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Generate with `openssl rand -base64 32` |
| `STORAGE_PROVIDER` | Must be `s3` for production | `s3` |
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `wJalrXUtnFEMI/K7MDENG...` |
| `AWS_REGION` | AWS region for S3 bucket | `us-east-1` |
| `AWS_S3_BUCKET` | S3 bucket name | `voting-candidate-images` |
| `FRONTEND_URL` | Production frontend URL | `https://your-domain.com` |
| `NODE_ENV` | Environment | `production` |

### Optional but Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `CDN_BASE_URL` | CloudFront URL for images | S3 direct URL |
| `SEED_DATABASE` | Seed on first deploy | `false` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## 🔐 Security Checklist

- [ ] Generate strong JWT secrets: `openssl rand -base64 32`
- [ ] Change default admin password immediately after first login
- [ ] Use environment variables, never commit secrets to git
- [ ] Enable HTTPS/SSL (use reverse proxy or cloud provider)
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set up AWS IAM user with minimal S3 permissions
- [ ] Enable AWS S3 bucket versioning
- [ ] Set up database backups
- [ ] Configure firewall rules

## 🏗️ Docker Compose Architecture

```yaml
services:
  api:
    - Connects to AWS S3 for image storage
    - Connects to PostgreSQL database
    - Exposes port 4000
    - Health check: /health endpoint
    - Auto-runs migrations on startup
  
  postgres:
    - PostgreSQL 16 database
    - Data persisted in volume
    - Health check: pg_isready
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:4000/health
# Response: {"status":"healthy","timestamp":"...","environment":"production"}
```

### Container Logs
```bash
docker-compose logs -f api          # Follow API logs
docker-compose logs --tail 100 api  # Last 100 lines
```

### Container Status
```bash
docker-compose ps                   # All containers
docker stats                        # Resource usage
```

## 🔧 Troubleshooting

### API won't start
```bash
# Check logs
docker-compose logs api

# Common issues:
# - DATABASE_URL incorrect or database unreachable
# - Missing required environment variables
# - Port 4000 already in use
```

### S3 Upload Failures
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://voting-candidate-images

# Common issues:
# - Incorrect AWS credentials
# - IAM user lacks S3 permissions
# - Bucket name mismatch
# - Wrong AWS region
```

### Database Connection Issues
```bash
# Test database connection
docker-compose exec api npx prisma db push

# Common issues:
# - DATABASE_URL format incorrect
# - Database not accessible from container
# - Database user lacks permissions
```

## 📦 Deployment Platforms

### AWS ECS
```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag api-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/voting-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/voting-api:latest

# Deploy to ECS via console or CLI
```

### Google Cloud Run
```bash
gcloud builds submit --tag gcr.io/<project-id>/voting-api
gcloud run deploy voting-api \
  --image gcr.io/<project-id>/voting-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Railway/Render
1. Connect GitHub repository
2. Add environment variables from .env.production
3. Deploy automatically on push

## 🔄 Updates and Rollbacks

### Update Deployment
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Verify
docker-compose logs -f api
```

### Rollback
```bash
# Stop current deployment
docker-compose down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## 📚 Additional Documentation

- Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Database schema: [prisma/schema.prisma](./prisma/schema.prisma)
- API documentation: Available at `/api-docs` when server is running

## 🆘 Support

- Check logs: `docker-compose logs -f api`
- Health endpoint: `http://localhost:4000/health`
- Database status: `docker-compose exec api npx prisma db push`
- S3 connectivity: Check AWS IAM permissions and bucket configuration
