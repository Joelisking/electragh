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
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Connection pool limits optimized for Cloud Run
  // Adjust based on your Cloud Run instance count and Cloud SQL connection limits
  // Formula: (max_connections - superuser_reserved_connections) / max_instances
  // For Cloud SQL default 100 connections: 100 / 10 instances = 10 per instance
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

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
    // In development, allow all localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['http://localhost:3000'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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

// Health check endpoint (includes Redis status)
app.get('/health', async (req, res) => {
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
});

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
