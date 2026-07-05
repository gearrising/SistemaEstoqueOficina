import { Router } from 'express';
import * as service from './backup.service';
import { asyncHandler } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('backup:write'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listBackups());
  })
);

router.post(
  '/',
  authorize('backup:write'),
  asyncHandler(async (_req, res) => {
    res.status(201).json(await service.createBackup());
  })
);

router.post(
  '/:id/restore',
  authorize('backup:write'),
  asyncHandler(async (req, res) => {
    res.json(await service.restoreBackup(getParamId(req)));
  })
);

export default router;
