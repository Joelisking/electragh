import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import voterRoutes from './routes/voters';
import electionRoutes from './routes/elections';
import electionRoute from './routes/election';
import candidateRoutes from './routes/candidates';
import positionRoutes from './routes/positions';
import votingRoutes from './routes/voting';
import resultsRoutes from './routes/results';
import disputeRoutes from './routes/disputes';
import adminRoutes from './routes/admin';
import docsRoutes from './openapi';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { initializeSingleElection } from './utils/singleElection';
import { initializeRedis, closeRedis, checkRedisHealth } from './services/cacheService';

// Load environment variables (.env.local takes precedence over .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
dotenv.config({ override: false }); // Load .env only for missing variables

// Initialize Prisma client with connection pooling for high traffic
// Optimized for Supabase free tier: 15 connections max
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Connection pool limits optimized for Supabase free tier and Cloud Run
  // Supabase free tier: 15 direct connections max (+ unlimited pooled connections)
  // Cloud Run max instances: 5
  // Formula: 15 / 5 = 3 connections per instance (safe)
  // Using Supabase's connection pooler (port 6543) gives unlimited pooled connections
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Health check endpoint BEFORE CORS and other middleware
// This allows Cloud Run health checks and monitoring to work without CORS issues
app.get('/health', async (req, res) => {
  try {
    const redisHealthy = await checkRedisHealth();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: 'connected',
        cache: redisHealthy ? 'connected' : 'unavailable',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// Handle OPTIONS requests from Cloud Run internal services BEFORE CORS middleware
// This prevents CORS errors from GCP health checks and monitoring
app.options('*', (_req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(204);
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // CRITICAL: Always allow requests with no origin first
    // This includes Cloud Run health checks, internal GCP services, curl, mobile apps, etc.
    if (!origin) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // Allow requests from any Cloud Run service (including self and monitoring services)
    // This handles *.run.app and *.a.run.app domains
    const requestHost = origin.replace(/^https?:\/\//, '').split('/')[0];
    const isCloudRunService = requestHost.includes('.run.app') || requestHost.includes('.a.run.app');

    if (isCloudRunService) {
      logger.debug(`CORS: Allowing Cloud Run service: ${origin}`);
      return callback(null, true);
    }

    // Check against configured allowed origins
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['http://localhost:3000'];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log rejected origins for debugging (but don't throw error to avoid 500s)
    logger.warn(`CORS: Rejected origin: ${origin}`, {
      allowedOrigins,
      environment: process.env.NODE_ENV,
    });

    // Return false instead of throwing error to prevent 500 status codes
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Response compression for better performance
app.use(compression({
  // Only compress responses larger than 1kb
  threshold: 1024,
  // Compress all text-based responses
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Global rate limiting
app.use(rateLimiter);

// Audit logging middleware
app.use(auditLogger);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/election', electionRoute);
app.use('/api/candidates', candidateRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);

// API Documentation
app.use('/docs', docsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeRedis();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeRedis();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  logger.info(
    `🚀 Ghana Election Platform Backend running on port ${PORT}`
  );
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 Security headers enabled`);
  logger.info(`🗜️  Response compression enabled`);

  // Initialize Redis cache
  try {
    const redisClient = initializeRedis();
    if (redisClient) {
      logger.info('✅ Redis cache initialized');
    } else {
      logger.warn('⚠️  Redis cache not available - running without cache');
    }
  } catch (error) {
    logger.error('❌ Redis initialization failed, continuing without cache', error);
  }

  // Initialize single election system
  try {
    await initializeSingleElection();
    logger.info('✅ Single election system ready');
  } catch (error) {
    logger.error('❌ Failed to initialize single election system', error);
  }
});

export default app;
