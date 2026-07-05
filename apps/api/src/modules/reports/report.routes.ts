import { Router } from 'express';
import * as service from './report.service';
import { asyncHandler } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/types',
  authorize('reports:read'),
  asyncHandler(async (_req, res) => {
    res.json(service.REPORT_TYPES);
  })
);

router.get(
  '/:type',
  authorize('reports:read'),
  asyncHandler(async (req, res) => {
    const format = (req.query.format as string) || 'json';
    const reportType = getParamId(req, 'type') as Parameters<typeof service.generateReport>[0];
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    if (format === 'json') {
      const data = await service.generateReport(reportType, 'json', filters);
      res.json(data);
      return;
    }

    await service.generateReport(
      reportType,
      format as 'csv' | 'xlsx' | 'pdf',
      filters,
      res
    );
  })
);

export default router;
