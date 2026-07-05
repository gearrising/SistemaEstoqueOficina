import { Router } from 'express';
import * as service from './dashboard.service';
import { asyncHandler } from '../../lib/utils';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  authorize('dashboard:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.getSummary());
  })
);

router.get(
  '/charts/entries',
  authorize('dashboard:read'),
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    res.json(await service.getEntriesChart(days));
  })
);

router.get(
  '/charts/exits',
  authorize('dashboard:read'),
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 30;
    res.json(await service.getExitsChart(days));
  })
);

router.get(
  '/charts/monthly',
  authorize('dashboard:read'),
  asyncHandler(async (req, res) => {
    const months = Number(req.query.months) || 12;
    res.json(await service.getMonthlyChart(months));
  })
);

export default router;
