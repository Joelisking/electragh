import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest } from './auth';

export const auditLogger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Store original json method
  const originalJson = res.json;

  // Override json method to capture response
  res.json = function(body: any) {
    // Log significant actions
    if (shouldLogAction(req.method, req.path, res.statusCode)) {
      logAuditEvent(req, res.statusCode, body).catch(console.error);
    }
    
    // Call original json method
    return originalJson.call(this, body);
  };

  next();
};

const shouldLogAction = (method: string, path: string, statusCode: number): boolean => {
  // Log all POST, PUT, DELETE requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true;
  }
  
  // Log authentication attempts
  if (path.includes('/auth/')) {
    return true;
  }
  
  // Log voting actions
  if (path.includes('/voting/')) {
    return true;
  }
  
  // Log admin actions
  if (path.includes('/admin/')) {
    return true;
  }
  
  // Log error responses
  if (statusCode >= 400) {
    return true;
  }
  
  return false;
};

const logAuditEvent = async (
  req: AuthenticatedRequest,
  statusCode: number,
  responseBody: any
) => {
  try {
    let action = `${req.method} ${req.path}`;
    let resource = getResourceFromPath(req.path);
    let resourceId = req.params.id || null;
    
    // Extract election ID if available
    let electionId = req.params.electionId || req.body?.electionId || null;
    
    // Determine specific action type
    if (req.path.includes('/voting/')) {
      action = 'VOTE_CAST';
      resource = 'vote';
    } else if (req.path.includes('/auth/')) {
      action = req.path.includes('/login') ? 'LOGIN' : 'OTP_REQUEST';
      resource = 'auth';
    }

    await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId,
        userId: req.user?.id || null,
        voterId: req.voter?.id || null,
        electionId,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode,
          userAgent: req.get('User-Agent'),
          body: sanitizeRequestBody(req.body),
          query: req.query,
          responseStatus: statusCode >= 200 && statusCode < 300 ? 'success' : 'error'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

const getResourceFromPath = (path: string): string => {
  if (path.includes('/voters')) return 'voter';
  if (path.includes('/elections')) return 'election';
  if (path.includes('/candidates')) return 'candidate';
  if (path.includes('/positions')) return 'position';
  if (path.includes('/voting')) return 'vote';
  if (path.includes('/results')) return 'results';
  if (path.includes('/disputes')) return 'dispute';
  if (path.includes('/auth')) return 'auth';
  return 'unknown';
};

const sanitizeRequestBody = (body: any): any => {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = ['password', 'passwordHash', 'token', 'otp', 'code'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};