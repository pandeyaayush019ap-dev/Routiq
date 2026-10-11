import { Router, Response } from 'express';
import { authService } from '../auth/authService';
import { db } from '../database/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/auth/register', async (req: AuthenticatedRequest, res: Response) => {
  const { identifier, emailOrPhone, password, name, role, companyName } = req.body;
  const loginId = identifier || emailOrPhone;

  if (!loginId || !password || !name) {
    res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Name, phone/email identifier, and password are required.',
    });
    return;
  }

  try {
    const result = await authService.register({
      emailOrPhone: loginId,
      password,
      name,
      role,
      companyName,
    });

    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed.';
    res.status(400).json({ error: 'REGISTRATION_FAILED', message: msg });
  }
});

// POST /api/auth/login
authRouter.post('/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  const { identifier, emailOrPhone, password } = req.body;
  const loginId = identifier || emailOrPhone;

  if (!loginId || !password) {
    res.status(400).json({
      error: 'MISSING_CREDENTIALS',
      message: 'Phone/email identifier and password are required.',
    });
    return;
  }

  try {
    const result = await authService.login(loginId, password);
    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid credentials.';
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: msg });
  }
});

// GET /api/auth/me
authRouter.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated.' });
    return;
  }

  try {
    const user = await db.findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User profile not found.' });
      return;
    }

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('[AuthRouter] Get current user error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to retrieve user profile.' });
  }
});

// POST /api/auth/logout
authRouter.post('/auth/logout', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});
