import { Router } from 'express';
import { movementSchema, movementFilterSchema } from '@estoque/shared';
import * as service from './movement.service';
import { asyncHandler, validateBody, validateQuery, getClientInfo } from '../../lib/utils';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('movements:read'),
  validateQuery(movementFilterSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.listMovements(req.query as Parameters<typeof service.listMovements>[0]));
  })
);

router.get(
  '/recent',
  authorize('movements:read'),
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    res.json(await service.getRecentMovements(limit));
  })
);

router.post(
  '/',
  authorize('movements:write'),
  validateBody(movementSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const meta = getClientInfo(req);
    const result = await service.createMovement(req.body, req.user!.userId, meta);
    res.status(201).json(result);
  })
);

export default router;
