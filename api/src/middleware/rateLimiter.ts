import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP address and user agent for more specific limiting
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

// Strict rate limiter for OTP requests
export const otpRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 3, // 3 OTP requests per minute per phone
  message: {
    error: 'OTP request limit exceeded',
    message: 'Too many OTP requests, please wait before requesting again'
  },
  keyGenerator: (req: Request) => {
    return `otp-${req.body.phone || req.ip}`;
  },
  skip: (req: Request) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// Authentication rate limiter
export const authRateLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 5, // 5 failed attempts per 15 minutes
  message: {
    error: 'Authentication limit exceeded',
    message: 'Too many failed authentication attempts, please try again later'
  },
  keyGenerator: (req: Request) => {
    return `auth-${req.body.email || req.body.phone || req.ip}`;
  }
});

// Voting rate limiter (very strict)
export const votingRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 voting actions per minute
  message: {
    error: 'Voting rate limit exceeded',
    message: 'Please slow down your voting actions'
  },
  keyGenerator: (req: Request) => {
    return `vote-${req.ip}`;
  }
});