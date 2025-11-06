#!/bin/bash
set -e

echo "🚀 Starting Ghana Election Platform API in Production Mode"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production not found${NC}"
    echo "Please copy .env.production.example to .env.production and configure it"
    echo "cp .env.production.example .env.production"
    exit 1
fi

# Verify critical environment variables
ENV_FILE=".env.production"
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "ARKESEL_API_KEY")

echo "🔍 Checking required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "^${var}=CHANGE_ME" "$ENV_FILE"; then
        echo -e "${RED}Error: $var is not properly configured in $ENV_FILE${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables check passed${NC}"

# Create production docker-compose override
cat > docker-compose.prod.yml << EOF
services:
  api:
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  postgres:
    restart: unless-stopped

  minio:
    restart: unless-stopped
EOF

echo "🏗️  Building and starting services..."

# Build and start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to be healthy..."

# Wait for services to be healthy
timeout 300 bash -c 'until docker-compose ps | grep -E "(api|postgres|minio)" | grep -v "Up (healthy)"; do sleep 5; done' || {
    echo -e "${RED}Services failed to start properly. Check logs:${NC}"
    docker-compose logs
    exit 1
}

echo -e "${GREEN}✅ All services are running and healthy${NC}"

# Show service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🌐 Service URLs:"
echo "  API Health: http://localhost:4000/health"
echo "  API Docs: http://localhost:4000/docs"
echo "  Database: localhost:5432"
echo "  MinIO Console: http://localhost:9001 (minio/minio123)"

echo ""
echo "📝 View logs with:"
echo "  docker-compose logs -f api"

echo ""
echo -e "${GREEN}🎉 Ghana Election Platform API is running in production mode!${NC}"