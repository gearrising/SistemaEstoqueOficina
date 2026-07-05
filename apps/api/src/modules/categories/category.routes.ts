import { Router } from 'express';
import { categorySchema } from '@estoque/shared';
import * as service from './category.service';
import { asyncHandler, validateBody } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('categories:read'),
  asyncHandler(async (req, res) => {
    const data = await service.list(req.query.search as string);
    res.json(data);
  })
);

router.get(
  '/:id',
  authorize('categories:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.getById(getParamId(req)));
  })
);

router.post(
  '/',
  authorize('categories:write'),
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  })
);

router.put(
  '/:id',
  authorize('categories:write'),
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    res.json(await service.update(getParamId(req), req.body));
  })
);

router.delete(
  '/:id',
  authorize('categories:write'),
  asyncHandler(async (req, res) => {
    await service.remove(getParamId(req));
    res.json({ message: 'Categoria excluída' });
  })
);

export default router;
