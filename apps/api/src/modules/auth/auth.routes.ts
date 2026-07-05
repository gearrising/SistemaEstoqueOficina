import { Router } from 'express';
import { loginSchema } from '@estoque/shared';
import * as authService from './auth.service';
import { asyncHandler, validateBody, AppError } from '../../lib/utils';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken, user: result.user });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) throw new AppError(401, 'Refresh token não fornecido');
    const result = await authService.refresh(token);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.refreshToken);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout realizado' });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await authService.getMe(req.user!.userId);
    res.json(user);
  })
);

export default router;
