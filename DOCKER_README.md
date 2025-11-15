# Docker Deployment Quick Start

This guide helps you quickly deploy ElectraGH using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Supabase account (free tier)
- Upstash account (free tier)
- GCP account with billing enabled

## Local Development with Docker

### 1. Set up environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in your Supabase and Upstash credentials
nano .env
```

### 2. Run with Docker Compose
```bash
# Start all services
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### 3. Access the application
- Frontend: http://localhost:3000
- API: http://localhost:4000
- API Health: http://localhost:4000/health

## Production Deployment to GCP Cloud Run

### Quick Deploy (Recommended)

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Run deployment script
./deploy.sh
```

### Manual Deploy

See [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md) for detailed instructions.

## Key Files

- `api/Dockerfile` - API container configuration
- `web/Dockerfile` - Frontend container configuration
- `docker-compose.yml` - Local development setup
- `deploy.sh` - Automated deployment script
- `.env.example` - Environment variables template

## Environment Variables

### Required for API

```bash
DATABASE_URL=         # Supabase pooler (port 6543)
REDIS_URL=           # Upstash Redis URL
JWT_SECRET=          # Random 32+ char string
JWT_REFRESH_SECRET=  # Different random string
FRONTEND_URL=        # Your frontend URL
```

### Required for Web

```bash
NEXT_PUBLIC_API_URL=  # Your API URL
```

## Supabase Setup

1. Create project at https://supabase.com
2. Get connection strings from Dashboard → Settings → Database
3. Use **port 6543** (Transaction mode pooler) for production
4. Use **port 5432** only for running migrations

### Connection String Format

**For Production (use this in .env):**
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**For Migrations (run manually):**
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

## Upstash Redis Setup

1. Create database at https://console.upstash.com
2. Copy connection string from Database → Details
3. Use in your `.env` file

### Connection String Format
```
rediss://default:PASSWORD@REGION-ID.upstash.io:6379
```

## Running Database Migrations

### Automatic (Docker entrypoint)
Migrations run automatically when the container starts (using Prisma generate + db push).

### Manual (Recommended for Supabase)

```bash
# Use direct connection (port 5432) for migrations
export DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

cd api
npx prisma generate
npx prisma db push
```

## Troubleshooting

### Connection Pool Exhausted

**Problem**: Too many database connections

**Solution**: Ensure you're using port 6543 (pooler), not 5432
```bash
echo $DATABASE_URL | grep "6543"  # Should return your connection string
```

### Can't Push Schema with Supabase Pooler

**Problem**: `prisma db push` fails with pooler connection

**Solution**: Use direct connection (port 5432) only for migrations
```bash
# In api/docker-entrypoint.sh, migrations are skipped when using port 6543
# Run migrations manually with direct connection
```

### Redis Connection Failed

**Problem**: App can't connect to Upstash

**Solution**: Check your REDIS_URL format
```bash
# Should start with rediss:// (note the double 's' for SSL)
echo $REDIS_URL
```

### Image Build Takes Too Long

**Problem**: Docker build is slow

**Solution**:
1. Check `.dockerignore` excludes `node_modules`
2. Use Cloud Build instead of local builds
3. Enable BuildKit: `export DOCKER_BUILDKIT=1`

## Performance Tips

1. **Use Connection Pooler**: Always use port 6543 for app connections
2. **Minimize Direct Connections**: Each Cloud Run instance uses only 1 connection
3. **Enable Redis Caching**: Set REDIS_URL to enable 80% query reduction
4. **Scale Appropriately**:
   - API: min=1, max=5 during voting
   - Web: min=0, max=3 (scale to zero when idle)

## Cost Optimization

**Free Tier Usage:**
- Supabase: 500MB database (enough for 5,000+ voters)
- Upstash: 10,000 Redis commands/day
- Cloud Build: 120 build-minutes/day

**Cloud Run Costs (2-day election):**
- API (min=1): ~$40-50
- Web (min=0): ~$15-20
- **Total: $55-75** out of $180 budget ✅

## Quick Commands

```bash
# Test Docker build locally
docker build -t electragh-api ./api
docker build -t electragh-web ./web

# Run API locally
docker run -p 4000:4000 --env-file .env electragh-api

# View Cloud Run logs
gcloud run services logs read electragh-api --region=us-central1 --limit=50

# Scale up for voting day
gcloud run services update electragh-api --min-instances 2 --max-instances 10

# Scale down after election
gcloud run services update electragh-api --min-instances 0 --max-instances 1

# Rebuild and redeploy
./deploy.sh
```

## Support

- Full deployment guide: [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md)
- Optimization details: [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md)
- GCP Cloud Run guide: [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)

---

**Ready to deploy!** 🚀

For detailed instructions, see [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md)
