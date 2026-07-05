import { Router } from 'express';
import { purchaseOrderSchema, purchaseReceiveSchema } from '@estoque/shared';
import { z } from 'zod';
import * as service from './purchase.service';
import { asyncHandler, validateBody, getClientInfo } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('purchases:read'),
  asyncHandler(async (req, res) => {
    res.json(
      await service.list({
        status: req.query.status as string,
        supplierId: req.query.supplierId as string,
      })
    );
  })
);

router.get(
  '/purchase-list',
  authorize('purchases:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.getPurchaseList());
  })
);

router.get(
  '/suggestions',
  authorize('purchases:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listSuggestions());
  })
);

router.post(
  '/suggestions/generate',
  authorize('purchases:write'),
  asyncHandler(async (_req, res) => {
    res.json(await service.generateSuggestions());
  })
);

router.get(
  '/:id',
  authorize('purchases:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.getById(getParamId(req)));
  })
);

router.post(
  '/',
  authorize('purchases:write'),
  validateBody(purchaseOrderSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    res.status(201).json(await service.create(req.body, req.user!.userId));
  })
);

router.patch(
  '/:id/status',
  authorize('purchases:write'),
  validateBody(z.object({ status: z.string() })),
  asyncHandler(async (req, res) => {
    res.json(await service.updateStatus(getParamId(req), req.body.status));
  })
);

router.post(
  '/:id/receive',
  authorize('purchases:write'),
  validateBody(purchaseReceiveSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const meta = getClientInfo(req);
    res.json(await service.receive(getParamId(req), req.body, req.user!.userId, meta));
  })
);

router.post(
  '/:id/cancel',
  authorize('purchases:write'),
  asyncHandler(async (req, res) => {
    res.json(await service.cancel(getParamId(req)));
  })
);

export default router;
