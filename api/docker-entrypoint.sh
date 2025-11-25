#!/bin/bash
set -e

echo "🚀 Starting Ghana Election Platform API..."

# Run database migrations only if explicitly enabled (skip if SKIP_MIGRATIONS=true or unset)
# This prevents slow startups in production where schema is already deployed
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Running database migrations..."
  npx prisma db push --accept-data-loss --skip-generate
else
  echo "⏭️  Skipping database migrations (set RUN_MIGRATIONS=true to enable)"
fi

# Seed database if environment variable is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo "🎯 Starting the application..."
exec "$@"