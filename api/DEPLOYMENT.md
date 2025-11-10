# Production Deployment Guide

This guide covers deploying the Ghana Election Platform API to production with AWS S3 for image storage.

## Prerequisites

- AWS Account with S3 bucket created
- PostgreSQL database (AWS RDS, Heroku Postgres, etc.)
- Docker and Docker Compose installed
- Domain name configured (optional but recommended)

## Step 1: Create AWS S3 Bucket

1. Log into AWS Console
2. Navigate to S3 service
3. Create a new bucket (e.g., `voting-candidate-images`)
4. Set bucket permissions:
   - Block all public access: **OFF** (to allow public image access)
   - Or configure bucket policy for CloudFront distribution
5. Enable versioning (optional but recommended)
6. Create IAM user with S3 permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::voting-candidate-images",
           "arn:aws:s3:::voting-candidate-images/*"
         ]
       }
     ]
   }
   ```
7. Save the Access Key ID and Secret Access Key

## Step 2: Set Up CloudFront (Optional but Recommended)

1. Navigate to CloudFront in AWS Console
2. Create a new distribution
3. Set origin domain to your S3 bucket
4. Configure cache behaviors and TTL
5. Copy the CloudFront distribution URL (e.g., `https://d111111abcdef8.cloudfront.net`)

## Step 3: Configure Environment Variables

1. Copy the production environment template:
   ```bash
   cp .env.production.example .env.production
   ```

2. Fill in your production values:
   ```bash
   # Database - Use your production PostgreSQL connection string
   DATABASE_URL=postgresql://user:pass@host:5432/voting?schema=public
   
   # JWT Secrets - Generate strong random values
   JWT_SECRET=$(openssl rand -base64 32)
   JWT_REFRESH_SECRET=$(openssl rand -base64 32)
   
   # AWS S3
   STORAGE_PROVIDER=s3
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=voting-candidate-images
   CDN_BASE_URL=https://d111111abcdef8.cloudfront.net
   
   # Frontend URL
   FRONTEND_URL=https://your-domain.com
   
   # SMS Service (Production credentials)
   ARKESEL_API_KEY=your-production-api-key
   ARKESEL_SANDBOX=false
   ```

## Step 4: Update Docker Compose for Production

The `docker-compose.yml` is already configured for AWS S3. It will:
- Use AWS S3 instead of MinIO
- Read AWS credentials from environment variables
- Connect to your production PostgreSQL database

## Step 5: Deploy with Docker

### Option A: Docker Compose Deployment

```bash
# Build the production image
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api

# Verify health
curl http://localhost:4000/health
```

### Option B: Deploy to Cloud Platform

#### AWS ECS/Fargate:

```bash
# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t voting-api .
docker tag voting-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/voting-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/voting-api:latest
```

Then create ECS task definition with environment variables from `.env.production`

#### Google Cloud Run:

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/<project-id>/voting-api
gcloud run deploy voting-api \
  --image gcr.io/<project-id>/voting-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars-file .env.production
```

#### Azure Container Instances:

```bash
# Build and push to ACR
az acr build --registry <registry-name> --image voting-api:latest .
az container create \
  --resource-group <resource-group> \
  --name voting-api \
  --image <registry-name>.azurecr.io/voting-api:latest \
  --dns-name-label voting-api \
  --ports 4000 \
  --environment-variables-file .env.production
```

## Step 6: Database Setup

The Docker entrypoint automatically:
1. Generates Prisma Client
2. Runs database migrations (`prisma db push`)
3. Seeds database if `SEED_DATABASE=true`

For first deployment, set `SEED_DATABASE=true` to create the initial election and admin user.

**Default Admin Credentials (CHANGE IMMEDIATELY):**
- Phone: +233000000000
- Password: Admin@123

## Step 7: SSL/TLS Configuration

Use a reverse proxy (nginx, Traefik, or cloud load balancer) to handle HTTPS:

### Example nginx configuration:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 8: Monitoring and Logs

```bash
# View logs
docker-compose logs -f api

# Check container status
docker-compose ps

# Monitor resource usage
docker stats

# Health check endpoint
curl https://api.your-domain.com/health
```

## Step 9: Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set up firewall rules (only expose ports 80, 443)
- [ ] Enable AWS S3 bucket versioning
- [ ] Configure CloudFront for DDoS protection
- [ ] Set up CloudWatch/monitoring alerts
- [ ] Regular database backups
- [ ] Keep Docker images updated

## Troubleshooting

### Container won't start:
```bash
docker-compose logs api
```

### Database connection issues:
- Verify DATABASE_URL is correct
- Check if database is accessible from container
- Ensure database has correct permissions

### S3 upload failures:
- Verify AWS credentials are correct
- Check IAM user has S3 permissions
- Ensure bucket name matches exactly
- Verify region is correct

### Image URLs not working:
- Check S3 bucket permissions
- Verify CDN_BASE_URL if using CloudFront
- Test direct S3 URL access

## Rollback Procedure

```bash
# Stop current deployment
docker-compose down

# Restore previous image
docker pull voting-api:previous-tag

# Restart with previous version
docker-compose up -d
```

## Backup Strategy

1. **Database**: Use PostgreSQL automated backups (RDS automated backups or pg_dump)
2. **S3 Images**: Enable S3 versioning and cross-region replication
3. **Configuration**: Store .env files in secure vault (AWS Secrets Manager, HashiCorp Vault)

## Support

For issues or questions, refer to:
- Application logs: `docker-compose logs -f api`
- Health endpoint: `https://api.your-domain.com/health`
- Database status: Check RDS/database provider dashboard
- S3 status: Check AWS CloudWatch metrics
