import { Router } from 'express';
import { stockLocationSchema, stockBatchSchema } from '@estoque/shared';
import * as service from '../stock/stock.service';
import { asyncHandler, validateBody } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('stock:read'),
  asyncHandler(async (req, res) => {
    res.json(
      await service.listStock({
        lowStock: req.query.lowStock === 'true',
        outOfStock: req.query.outOfStock === 'true',
        locationId: req.query.locationId as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
      })
    );
  })
);

router.get(
  '/summary',
  authorize('stock:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.getStockSummary());
  })
);

router.post(
  '/recalculate',
  authorize('stock:write'),
  asyncHandler(async (_req, res) => {
    res.json(await service.recalculateStock());
  })
);

router.get(
  '/locations',
  authorize('stock:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listLocations());
  })
);

router.post(
  '/locations',
  authorize('stock:write'),
  validateBody(stockLocationSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createLocation(req.body));
  })
);

router.put(
  '/locations/:id',
  authorize('stock:write'),
  validateBody(stockLocationSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.updateLocation(getParamId(req), req.body));
  })
);

router.delete(
  '/locations/:id',
  authorize('stock:write'),
  asyncHandler(async (req, res) => {
    await service.deleteLocation(getParamId(req));
    res.json({ message: 'Localização removida' });
  })
);

router.get(
  '/batches',
  authorize('stock:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.listBatches(req.query.productId as string));
  })
);

router.post(
  '/batches',
  authorize('stock:write'),
  validateBody(stockBatchSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.createBatch(req.body));
  })
);

export default router;
