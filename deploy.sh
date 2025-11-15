#!/bin/bash
set -e

# ElectraGH Deployment Script for GCP Cloud Run
# This script builds and deploys both API and Web services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-""}
REGION=${GCP_REGION:-"us-central1"}

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: GCP_PROJECT_ID environment variable is not set${NC}"
  echo "Usage: export GCP_PROJECT_ID=your-project-id && ./deploy.sh"
  exit 1
fi

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}ElectraGH Deployment to Cloud Run${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set GCP project
echo -e "${YELLOW}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Build and deploy API
echo ""
echo -e "${GREEN}Step 1/4: Building API Docker image...${NC}"
cd api
gcloud builds submit --tag gcr.io/$PROJECT_ID/electragh-api

echo ""
echo -e "${GREEN}Step 2/4: Deploying API to Cloud Run...${NC}"
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
  --cpu-throttling \
  --execution-environment gen2

# Get API URL
API_URL=$(gcloud run services describe electragh-api --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✅ API deployed at: $API_URL${NC}"

# Build and deploy Web
cd ..
echo ""
echo -e "${GREEN}Step 3/4: Building Web Docker image...${NC}"
cd web
gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/electragh-web \
  --substitutions=NEXT_PUBLIC_API_URL=$API_URL

echo ""
echo -e "${GREEN}Step 4/4: Deploying Web to Cloud Run...${NC}"
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

# Get Web URL
WEB_URL=$(gcloud run services describe electragh-web --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✅ Web deployed at: $WEB_URL${NC}"

# Update API with Web URL for CORS
echo ""
echo -e "${YELLOW}Updating API with Web URL for CORS...${NC}"
cd ../api
gcloud run services update electragh-api \
  --update-env-vars FRONTEND_URL=$WEB_URL \
  --region=$REGION

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "API URL:  ${GREEN}$API_URL${NC}"
echo -e "Web URL:  ${GREEN}$WEB_URL${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test API health: curl $API_URL/health"
echo "2. Visit web app: open $WEB_URL"
echo "3. Check logs: gcloud run services logs read electragh-api --region=$REGION"
echo ""
echo -e "${YELLOW}Note: Make sure you have configured secrets for:${NC}"
echo "  - DATABASE_URL (Supabase connection string)"
echo "  - REDIS_URL (Upstash connection string)"
echo "  - JWT_SECRET and JWT_REFRESH_SECRET"
echo "  - SMS provider credentials (ARKESEL_API_KEY, etc.)"
echo ""
