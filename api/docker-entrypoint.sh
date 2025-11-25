#!/bin/bash
set -e

echo "🚀 Starting Ghana Election Platform API..."

# Wait for database to be ready
# Extract host from DATABASE_URL (supports both TCP and Unix socket connections)
echo "⏳ Waiting for database..."
DB_HOST=$(echo "$DATABASE_URL" | grep -oP '(?<=@)[^/:]+' || echo "localhost")

# For Cloud SQL Unix socket or external PostgreSQL
if [[ "$DATABASE_URL" == *"/cloudsql/"* ]]; then
  echo "Using Cloud SQL Unix socket connection"
  # Cloud SQL doesn't need pg_isready check, connection is managed by Cloud SQL Proxy
elif [[ -n "$DB_HOST" ]]; then
  echo "Checking database connectivity at $DB_HOST"
  until pg_isready -h "$DB_HOST" -U postgres 2>/dev/null || echo "exit" | timeout 2 psql "$DATABASE_URL" >/dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done
fi

echo "✅ Database is ready!"

# Run database migrations (skip if SKIP_MIGRATIONS=true)
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "🔄 Running database migrations..."
  npx prisma db push --accept-data-loss --skip-generate
else
  echo "⏭️  Skipping database migrations (SKIP_MIGRATIONS=true)"
fi

# Seed database if environment variable is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo "🎯 Starting the application..."
exec "$@"