#!/bin/bash
set -e

echo "🚀 Starting Ghana Election Platform API..."

# Run database migrations (skip only if SKIP_MIGRATIONS=true)
if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "⏭️  Skipping database migrations (SKIP_MIGRATIONS=true)"
else
  echo "🔄 Running database migrations..."
  npx prisma db push --accept-data-loss --skip-generate
fi

# Seed database if environment variable is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo "🎯 Starting the application..."
exec "$@"