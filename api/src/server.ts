import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Load environment variables (.env.local takes precedence over .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
dotenv.config({ override: false }); // Load .env only for missing variables

// Initialize Prisma client
export const prisma = new PrismaClient();

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
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use(rateLimiter);

// Audit logging middleware
app.use(auditLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
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
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
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

  // Initialize single election system
  try {
    await initializeSingleElection();
    logger.info('✅ Single election system ready');
  } catch (error) {
    logger.error('❌ Failed to initialize single election system', error);
  }
});

export default app;
