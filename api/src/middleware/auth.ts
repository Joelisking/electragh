import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    name: string;
    phone?: string | null;
  };
  voter?: {
    id: string;
    phone: string;
    fullName: string;
    hasVoted: boolean;
  };
}

// Middleware for admin/EC authentication
export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Admin authentication failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware for voter authentication (OTP-based)
export const authenticateVoter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const voter = await prisma.voter.findUnique({
      where: { id: decoded.voterId },
      select: {
        id: true,
        phone: true,
        fullName: true,
        hasVoted: true,
        status: true,
      },
    });

    if (!voter || voter.status !== 'VERIFIED') {
      return res
        .status(401)
        .json({ error: 'Invalid or expired voter session' });
    }

    req.voter = voter;
    next();
  } catch (error) {
    logger.error('Voter authentication failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

// EC member authorization (admin or EC member)
export const requireECAccess = requireRole('ADMIN', 'EC_MEMBER');

// Advisory council authorization
export const requireAdvisoryAccess = requireRole(
  'ADMIN',
  'EC_MEMBER',
  'ADVISORY_COUNCIL'
);
