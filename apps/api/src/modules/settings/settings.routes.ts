import { Router } from 'express';
import { settingsUpdateSchema } from '@estoque/shared';
import * as service from './settings.service';
import { asyncHandler, validateBody } from '../../lib/utils';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('settings:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.getSettings());
  })
);

router.patch(
  '/',
  authorize('settings:write'),
  validateBody(settingsUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.updateSettings(req.body));
  })
);

router.get(
  '/audit-logs',
  authorize('audit:read'),
  asyncHandler(async (req, res) => {
    res.json(
      await service.listAuditLogs({
        entity: req.query.entity as string,
        userId: req.query.userId as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
      })
    );
  })
);

export default router;
