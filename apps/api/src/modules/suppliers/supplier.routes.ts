import { Router } from 'express';
import { supplierSchema } from '@estoque/shared';
import * as service from './supplier.service';
import { asyncHandler, validateBody } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('suppliers:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.query.search as string));
  })
);

router.get(
  '/:id',
  authorize('suppliers:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.getById(getParamId(req)));
  })
);

router.post(
  '/',
  authorize('suppliers:write'),
  validateBody(supplierSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  })
);

router.put(
  '/:id',
  authorize('suppliers:write'),
  validateBody(supplierSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.update(getParamId(req), req.body));
  })
);

router.delete(
  '/:id',
  authorize('suppliers:write'),
  asyncHandler(async (req, res) => {
    await service.remove(getParamId(req));
    res.json({ message: 'Fornecedor excluído' });
  })
);

export default router;
