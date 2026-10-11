import { Request, Response, NextFunction } from 'express';
import { authService, UserSessionPayload } from '../auth/authService';

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload;
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || req.headers['x-auth-token'];
  if (!authHeader || typeof authHeader !== 'string') {
    return next();
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const session = authService.verifyToken(token);
  if (session) {
    req.user = session;
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || req.headers['x-auth-token'];
  if (!authHeader || typeof authHeader !== 'string') {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required to access this resource.',
    });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const session = authService.verifyToken(token);
  if (!session) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Session has expired or token is invalid. Please sign in again.',
    });
    return;
  }

  req.user = session;
  next();
}
