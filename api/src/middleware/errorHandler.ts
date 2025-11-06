import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  meta?: any;
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Conflict',
          message: 'A record with this data already exists',
          field: (err as any).meta?.target,
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Not Found',
          message: 'The requested record was not found',
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Foreign Key Constraint',
          message: 'Referenced record does not exist',
        });
      default:
        return res.status(500).json({
          error: 'Database Error',
          message: 'An error occurred while processing your request',
        });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid or expired token',
    });
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File Upload Error',
      message: err.message,
    });
  }

  // Custom API errors
  if ('statusCode' in err && err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.name || 'API Error',
      message: err.message,
    });
  }

  // Defensive: handle our custom error names even if statusCode is missing
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
  }
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: err.message,
    });
  }
  if (err.name === 'AuthorizationError') {
    return res.status(403).json({
      error: 'Authorization Error',
      message: err.message,
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
};

// Custom error classes
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
