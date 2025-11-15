#!/bin/bash
set -e

echo "🚀 Starting Ghana Election Platform API..."

# Wait for database to be ready
echo "⏳ Waiting for database..."

# Extract host from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | grep -oP '(?<=@)[^/:]+' || echo "localhost")

# For Supabase, Cloud SQL Unix socket, or external PostgreSQL
if [[ "$DATABASE_URL" == *"/cloudsql/"* ]]; then
  echo "✅ Using Cloud SQL Unix socket connection"
  # Cloud SQL doesn't need pg_isready check
elif [[ "$DATABASE_URL" == *"supabase.com"* ]]; then
  echo "✅ Using Supabase connection (no health check needed)"
  # Supabase is always ready
elif [[ -n "$DB_HOST" ]]; then
  echo "Checking database connectivity at $DB_HOST"
  RETRY_COUNT=0
  MAX_RETRIES=10

  until pg_isready -h "$DB_HOST" -U postgres 2>/dev/null || echo "exit" | timeout 2 psql "$DATABASE_URL" >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "❌ Failed to connect to database after $MAX_RETRIES attempts"
      exit 1
    fi
    echo "Database is unavailable - attempt $RETRY_COUNT/$MAX_RETRIES - sleeping"
    sleep 2
  done
  echo "✅ Database is ready!"
else
  echo "✅ Database connection ready"
fi

# Run database migrations and generate Prisma client
echo "🔄 Running database migrations..."
npx prisma generate

# Only push schema if not using Supabase pooler (port 6543)
if [[ "$DATABASE_URL" != *":6543/"* ]]; then
  echo "📊 Pushing database schema..."
  npx prisma db push --accept-data-loss
else
  echo "⚠️  Skipping schema push (using Supabase connection pooler)"
  echo "   Run migrations manually with direct connection (port 5432)"
fi

# Seed database if environment variable is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo "🎯 Starting the application..."
exec "$@"