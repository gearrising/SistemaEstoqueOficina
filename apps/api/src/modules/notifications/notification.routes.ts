import { Router } from 'express';
import * as service from './notification.service';
import { asyncHandler } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    res.json(await service.list(req.user!.userId, req.query.unread === 'true'));
  })
);

router.get(
  '/count',
  asyncHandler(async (req: AuthRequest, res) => {
    res.json({ count: await service.getUnreadCount(req.user!.userId) });
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    res.json(await service.markAsRead(getParamId(req)));
  })
);

router.patch(
  '/read-all',
  asyncHandler(async (req: AuthRequest, res) => {
    await service.markAllAsRead(req.user!.userId);
    res.json({ message: 'Todas marcadas como lidas' });
  })
);

export default router;
