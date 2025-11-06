# Multi-stage build for Node.js backend
FROM node:22 AS base

# Install PostgreSQL client and curl for health checks
RUN apt-get update && apt-get install -y postgresql-client curl && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
COPY prisma ./prisma/

# Generate Prisma client and build
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Copy production dependencies from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy and make entrypoint script executable
COPY --chown=nodejs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nodejs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]