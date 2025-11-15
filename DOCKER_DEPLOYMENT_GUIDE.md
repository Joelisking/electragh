# Docker + GCP Cloud Run Deployment Guide (Supabase + Upstash)

Complete guide for deploying ElectraGH to GCP Cloud Run using Docker, Supabase PostgreSQL, and Upstash Redis - all within **$180 budget**.

## Cost Breakdown (Updated for Supabase)

| Service | Configuration | Cost (2 days) |
|---------|---------------|---------------|
| Cloud Run (API) | 512Mi, 1 CPU, min=1 | $40-50 |
| Cloud Run (Web) | 256Mi, 1 CPU, min=0 | $15-20 |
| **Supabase** | **Free tier (500MB)** | **$0** ✨ |
| Redis (Upstash) | Free tier | $0 ✨ |
| Networking | Cloud Run egress | $3-5 |
| Cloud Build | 2 builds | $0 (free tier) |
| **TOTAL** | | **$58-75** 🎉 |

**Savings vs Cloud SQL**: $30-40 per 2-day period!

---

## Prerequisites

1. **GCP Account** with billing enabled
2. **Supabase Account** (free) - https://supabase.com
3. **Upstash Account** (free) - https://upstash.com
4. **Docker** installed locally (for testing)
5. **Google Cloud CLI** installed

---

## Step 1: Set Up Supabase Database (FREE)

### 1.1 Create Supabase Project
```bash
# Go to https://supabase.com/dashboard
# Click "New Project"
# Fill in:
#   - Project name: electragh
#   - Database password: [strong password]
#   - Region: Choose closest to your users (e.g., us-east-1)
```

### 1.2 Get Connection Strings
```bash
# In Supabase Dashboard → Settings → Database
# You'll see two connection strings:

# Connection Pooler (RECOMMENDED - unlimited connections):
postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres

# Direct Connection (15 connections max - for migrations only):
postgresql://postgres.PROJECT_REF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
```

**Important**:
- Use **port 6543** (Transaction mode) for your app - unlimited connections via PgBouncer
- Use **port 5432** only for running migrations

### 1.3 Database Limits (Free Tier)
- **Storage**: 500MB (enough for 5,000+ voters with audit logs)
- **Direct connections**: 15 max
- **Pooled connections**: Unlimited via port 6543
- **Bandwidth**: 5GB/month (plenty for voting app)

---

## Step 2: Set Up Upstash Redis (FREE)

### 2.1 Create Redis Database
```bash
# Go to https://console.upstash.com
# Click "Create Database"
# Select:
#   - Name: electragh-cache
#   - Type: Regional (faster) or Global (more reliable)
#   - Region: Same as your app (e.g., us-east-1)
#   - TLS: Enabled
```

### 2.2 Get Connection URL
```bash
# In Upstash Console → Database → Details
# Copy the connection string:

rediss://default:[PASSWORD]@[REGION]-[ID].upstash.io:6379
```

### 2.3 Redis Limits (Free Tier)
- **Commands**: 10,000 per day (more than enough!)
- **Storage**: 256MB
- **Connections**: 1,000 max concurrent
- **Bandwidth**: Included

---

## Step 3: Configure Environment Variables

### 3.1 Create Production Secrets in GCP
```bash
# Set your project
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

gcloud config set project $PROJECT_ID

# Create secrets for sensitive data
echo -n "postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" | \
  gcloud secrets create database-url --data-file=-

echo -n "rediss://default:PASSWORD@REGION-ID.upstash.io:6379" | \
  gcloud secrets create redis-url --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-refresh-secret --data-file=-
```

### 3.2 Environment Variables Summary

**Required for API:**
```bash
DATABASE_URL=          # Supabase connection pooler (port 6543)
REDIS_URL=             # Upstash Redis URL
JWT_SECRET=            # Random 32+ character string
JWT_REFRESH_SECRET=    # Different random 32+ character string
FRONTEND_URL=          # Your frontend Cloud Run URL
NODE_ENV=production
PORT=8080

# SMS (Arkesel or Twilio)
ARKESEL_API_KEY=       # Your Arkesel API key
ARKESEL_SENDER_ID=     # Your sender ID

# AWS S3 (for candidate photos)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=
```

**Required for Web:**
```bash
NEXT_PUBLIC_API_URL=   # Your API Cloud Run URL
```

---

## Step 4: Build and Deploy with Docker

### 4.1 Build and Deploy API

```bash
cd /home/user/electragh/api

# Build Docker image
gcloud builds submit --tag gcr.io/$PROJECT_ID/electragh-api

# Deploy to Cloud Run
gcloud run deploy electragh-api \
  --image gcr.io/$PROJECT_ID/electragh-api \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --concurrency 80 \
  --timeout 60 \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --update-secrets "DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,JWT_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest" \
  --set-env-vars "FRONTEND_URL=https://electragh-web-xxx.run.app,ARKESEL_API_KEY=your-key,ARKESEL_SENDER_ID=ElectraGH" \
  --set-env-vars "AWS_ACCESS_KEY_ID=your-key,AWS_SECRET_ACCESS_KEY=your-secret,AWS_S3_BUCKET=your-bucket,AWS_REGION=us-east-1" \
  --cpu-throttling \
  --execution-environment gen2

# Get the deployed URL
API_URL=$(gcloud run services describe electragh-api --region=$REGION --format='value(status.url)')
echo "API deployed at: $API_URL"
```

### 4.2 Build and Deploy Frontend

```bash
cd /home/user/electragh/web

# Build Docker image with API URL as build arg
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/electragh-web \
  --substitutions=NEXT_PUBLIC_API_URL=$API_URL

# Deploy to Cloud Run
gcloud run deploy electragh-web \
  --image gcr.io/$PROJECT_ID/electragh-web \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 100 \
  --timeout 30 \
  --set-env-vars "NEXT_PUBLIC_API_URL=$API_URL" \
  --cpu-throttling \
  --execution-environment gen2

# Get the deployed URL
WEB_URL=$(gcloud run services describe electragh-web --region=$REGION --format='value(status.url)')
echo "Frontend deployed at: $WEB_URL"
```

### 4.3 Update API with Frontend URL

```bash
# Update FRONTEND_URL in API service
gcloud run services update electragh-api \
  --update-env-vars FRONTEND_URL=$WEB_URL \
  --region=$REGION
```

---

## Step 5: Run Database Migrations

The database migrations run automatically via the `docker-entrypoint.sh` script when the container starts. However, you can run them manually:

```bash
# Get a shell in the running container
gcloud run services describe electragh-api --region=$REGION --format='value(status.latestReadyRevisionName)' | \
  xargs -I {} gcloud run revisions describe {} --region=$REGION

# Or run migrations locally against Supabase
cd /home/user/electragh/api
export DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
npx prisma db push
```

**Note**: Use port **5432** for migrations, but **6543** for the app!

---

## Step 6: Verify Deployment

### 6.1 Health Check
```bash
# Check API health
curl $API_URL/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-15T...",
  "environment": "production",
  "services": {
    "database": "connected",
    "cache": "connected"
  }
}
```

### 6.2 Test Database Connection
```bash
# Check Supabase dashboard
# Go to Database → Tables
# You should see: users, voters, elections, positions, candidates, etc.
```

### 6.3 Test Redis Connection
```bash
# Check Upstash dashboard
# Go to your database → Stats
# You should see connection activity
```

---

## Docker Commands Reference

### Local Testing

```bash
# Test API locally
cd api
docker build -t electragh-api .
docker run -p 4000:4000 \
  -e DATABASE_URL="your-supabase-url" \
  -e REDIS_URL="your-upstash-url" \
  -e JWT_SECRET="test-secret" \
  -e JWT_REFRESH_SECRET="test-refresh-secret" \
  electragh-api

# Test Web locally
cd web
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 \
  -t electragh-web .
docker run -p 3000:3000 electragh-web
```

### Build Optimization

```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Build with cache
docker build --cache-from gcr.io/$PROJECT_ID/electragh-api:latest \
  -t gcr.io/$PROJECT_ID/electragh-api:latest .
```

---

## Optimizations for Supabase Free Tier

### 1. Connection Pooling (CRITICAL)

**Always use port 6543** for your app:
```bash
# ✅ CORRECT (unlimited connections via PgBouncer)
DATABASE_URL=postgresql://...@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# ❌ WRONG (limited to 15 connections)
DATABASE_URL=postgresql://...@aws-0-REGION.pooler.supabase.com:5432/postgres
```

### 2. Minimize Direct Connections

The app is already configured to use only 1 connection per Cloud Run instance:
```javascript
// In api/src/server.ts
// With 5 max instances × 1 connection = 5 total connections
// Well under Supabase's 15 direct connection limit!
```

### 3. Use Redis for Caching

Redis reduces database queries by 80-90%:
- Election data: Cached for 5 minutes
- Results: Cached for 30-60 seconds
- Positions/Candidates: Cached for 10 minutes

This keeps database load minimal and prevents hitting rate limits.

---

## Monitoring

### Supabase Dashboard

Monitor your database usage:
```bash
# Go to Supabase Dashboard → Database → Connection Pooling
# You should see:
#   - Active connections: 1-5 (under 15 limit)
#   - Pooled connections: Higher is OK
#   - Database size: Should grow slowly to ~50-100MB for 3,000 voters
```

### Upstash Dashboard

Monitor Redis usage:
```bash
# Go to Upstash Console → Database → Stats
# You should see:
#   - Commands/day: 2,000-8,000 (under 10,000 limit)
#   - Storage: <10MB
#   - Hit rate: 70-85% (good caching!)
```

### Cloud Run Metrics

```bash
# View API logs
gcloud run services logs read electragh-api --limit=50

# View metrics
gcloud run services describe electragh-api --region=$REGION
```

---

## Troubleshooting

### Connection Pool Exhausted

**Symptom**: `remaining connection slots reserved for non-replication superuser connections`

**Solution**:
```bash
# 1. Verify you're using port 6543 (pooler), not 5432
echo $DATABASE_URL | grep "6543"

# 2. Reduce Cloud Run max instances temporarily
gcloud run services update electragh-api --max-instances 3

# 3. Check Supabase connection count
# Go to Supabase Dashboard → Database → Connection Pooling
```

### Redis Connection Errors

**Symptom**: `Redis connection error: ECONNREFUSED`

**Solution**:
```bash
# 1. Verify Redis URL is correct
curl https://console.upstash.com/

# 2. Check if you hit the 10,000 commands/day limit
# Go to Upstash Console → Database → Stats

# 3. App will automatically fall back to database if Redis fails
# Check logs: "Redis cache not available - running without cache"
```

### Database Migrations Failed

**Symptom**: `P1001: Can't reach database server`

**Solution**:
```bash
# 1. Use direct connection (port 5432) for migrations
export DATABASE_URL="postgresql://...@aws-0-REGION.pooler.supabase.com:5432/postgres"

# 2. Run migrations manually
cd api
npx prisma db push

# 3. Rebuild and redeploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/electragh-api
```

### Slow Response Times

**Symptom**: API responses >2 seconds

**Solution**:
```bash
# 1. Check Redis cache hit rate (should be >70%)
# Go to Upstash Console → Stats

# 2. Verify database indexes are created
# Run: SELECT * FROM pg_indexes WHERE schemaname = 'public';

# 3. Check Supabase region - should be close to Cloud Run region

# 4. Increase Cloud Run instances temporarily
gcloud run services update electragh-api --min-instances 2
```

---

## Cost Optimization Tips

### 1. Scale to Zero When Idle

```bash
# After election ends, scale everything to zero
gcloud run services update electragh-api --min-instances 0 --max-instances 1
gcloud run services update electragh-web --min-instances 0 --max-instances 1
```

**Savings**: ~$30-40/month

### 2. Use Cloud Build Free Tier

- 120 build-minutes/day free
- Your builds take ~3-5 minutes each
- Can build 24-40 times per day for free!

### 3. Minimize Egress

Response compression (already enabled) reduces egress by 70%:
- API responses compressed with gzip
- Next.js automatically compresses pages
- Images served from S3/CloudFront (not through Cloud Run)

### 4. Monitor and Alert

```bash
# Set budget alert at $100 (well under $180 limit)
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="ElectraGH Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=80
```

---

## Deployment Checklist

### Before First Deploy
- [x] Supabase project created
- [x] Upstash Redis database created
- [x] GCP secrets configured
- [x] S3 bucket for photos created
- [x] Arkesel/Twilio SMS configured
- [ ] Test Docker builds locally

### During Deploy
- [ ] Build API image: `gcloud builds submit`
- [ ] Deploy API: `gcloud run deploy electragh-api`
- [ ] Build Web image with API URL
- [ ] Deploy Web: `gcloud run deploy electragh-web`
- [ ] Update API with Web URL
- [ ] Test `/health` endpoint
- [ ] Verify database connection
- [ ] Test Redis cache

### After Deploy
- [ ] Run database migrations (automatic via entrypoint)
- [ ] Import voter list
- [ ] Create admin users
- [ ] Test OTP flow
- [ ] Test voting flow
- [ ] Test results page
- [ ] Set up monitoring alerts

---

## Expected Performance

With Docker + Supabase + Upstash:

| Metric | Expected Value |
|--------|----------------|
| API Response Time | 50-500ms |
| Vote Submission | <1 second |
| Database Connections | 1-5 active |
| Redis Hit Rate | 70-85% |
| Supabase CPU | <10% |
| Storage Used | 50-100MB |
| Total Cost (2 days) | $58-75 |

---

## Quick Commands Reference

```bash
# Rebuild and deploy API
cd api && gcloud builds submit --tag gcr.io/$PROJECT_ID/electragh-api && \
gcloud run deploy electragh-api --image gcr.io/$PROJECT_ID/electragh-api --region=$REGION

# Rebuild and deploy Web
cd web && gcloud builds submit --tag gcr.io/$PROJECT_ID/electragh-web && \
gcloud run deploy electragh-web --image gcr.io/$PROJECT_ID/electragh-web --region=$REGION

# View API logs
gcloud run services logs read electragh-api --region=$REGION --limit=50

# Check health
curl $(gcloud run services describe electragh-api --region=$REGION --format='value(status.url)')/health

# Scale up for election day
gcloud run services update electragh-api --min-instances 2 --max-instances 10

# Scale down after election
gcloud run services update electragh-api --min-instances 0 --max-instances 1
```

---

## Summary

You're now using a **fully optimized, cost-effective stack**:

✅ **Supabase (FREE)**: 500MB PostgreSQL with unlimited pooled connections
✅ **Upstash (FREE)**: 10,000 Redis commands/day for caching
✅ **Cloud Run**: Pay only for what you use, scale to zero
✅ **Docker**: Reproducible builds, easy rollbacks
✅ **Total Cost**: **$58-75 for 2 days** (saves $30-40 vs Cloud SQL!)

**Budget Breakdown**:
- Supabase: $0 (free tier)
- Redis: $0 (free tier)
- Cloud Run: $55-75 (only charges)
- **Total: $55-75** out of $180 budget 🎉

You have **$105 buffer** for unexpected traffic!

---

**Ready to deploy!** 🚀
