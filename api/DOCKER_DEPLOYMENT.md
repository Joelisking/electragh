# Docker Deployment Guide

This guide explains how to deploy the Ghana Election Platform API using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- Port 4000, 5432, 9000, 9001 available

## Quick Start

1. **Clone the repository and navigate to the API directory:**
   ```bash
   cd voting/api
   ```

2. **Review and update environment variables:**
   ```bash
   cp .docker.env .env.docker
   # Edit .env.docker with your production values
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Check service status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

## Services Included

| Service | Port | Description |
|---------|------|-------------|
| `api` | 4000 | Main API server |
| `postgres` | 5432 | PostgreSQL database |
| `minio` | 9000/9001 | S3-compatible object storage |

## Environment Configuration

### Required Environment Variables

The `.docker.env` file contains all necessary configuration. Key variables to update for production:

```env
# Security - CHANGE THESE IN PRODUCTION
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# SMS Configuration
SMS_PROVIDER=arkesel
ARKESEL_API_KEY=your_arkesel_api_key_here
ARKESEL_SENDER_ID="Your Sender ID"
ARKESEL_SANDBOX=false  # Set to false for production

# Database (automatically configured for Docker)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/voting?schema=public

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Production settings
NODE_ENV=production
```

### Optional: AWS S3 Configuration

For production, you may want to use AWS S3 instead of MinIO:

```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=voting-candidate-images
CDN_BASE_URL=https://your-cloudfront-domain.cloudfront.net
```

## Database Initialization

The API automatically:
1. Waits for PostgreSQL to be ready
2. Generates Prisma client
3. Pushes database schema
4. Seeds database (if `SEED_DATABASE=true`)

### Manual Database Operations

```bash
# Access the API container
docker-compose exec api bash

# Run migrations
npx prisma db push

# Seed database
npm run db:seed

# Open Prisma Studio
npx prisma studio
```

## Monitoring & Health Checks

### Health Check Endpoints

- **API Health**: `http://localhost:4000/health`
- **Database**: Automatic health checks in docker-compose
- **MinIO**: `http://localhost:9000/minio/health/live`

### View Service Status

```bash
# Check all services
docker-compose ps

# Check specific service logs
docker-compose logs api
docker-compose logs postgres
docker-compose logs minio

# Follow logs in real-time
docker-compose logs -f api
```

## Production Deployment

### 1. Security Checklist

- [ ] Change default JWT secrets
- [ ] Update database credentials
- [ ] Configure proper SMS provider credentials
- [ ] Set up proper SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting

### 2. Performance Tuning

```yaml
# Add to docker-compose.yml under api service
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

### 3. Backup Strategy

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres voting > backup.sql

# Backup MinIO data
docker-compose exec minio mc cp --recursive minio/voting-candidate-images ./backup/
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   ```bash
   # Check if postgres is running
   docker-compose ps postgres
   # Check logs
   docker-compose logs postgres
   ```

2. **API won't start**
   ```bash
   # Check environment variables
   docker-compose exec api env | grep DATABASE_URL
   # Check API logs
   docker-compose logs api
   ```

3. **MinIO bucket creation failed**
   ```bash
   # Recreate buckets
   docker-compose restart createbuckets
   ```

### Reset Everything

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Scaling for Production

### Load Balancing

For high availability, run multiple API instances:

```yaml
api:
  deploy:
    replicas: 3
  # ... rest of configuration
```

### External Database

For production, consider using managed PostgreSQL:

```env
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/voting
```

Then remove the postgres service from docker-compose.yml.

## Monitoring

### Recommended Monitoring Stack

- **Logs**: ELK Stack or Grafana Loki
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot or similar
- **Error Tracking**: Sentry

### Basic Monitoring Setup

```bash
# Monitor resource usage
docker stats

# Monitor API health
curl http://localhost:4000/health

# Check database connections
docker-compose exec postgres psql -U postgres -d voting -c "SELECT count(*) FROM pg_stat_activity;"
```

## Support

For deployment issues:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions