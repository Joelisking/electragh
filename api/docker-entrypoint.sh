#!/bin/bash
set -e

echo "🚀 Starting Ghana Election Platform API..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run database migrations and generate Prisma client
echo "🔄 Running database migrations..."
npx prisma generate
npx prisma db push

# Seed database if environment variable is set
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npm run db:seed
fi

echo "🎯 Starting the application..."
exec "$@"