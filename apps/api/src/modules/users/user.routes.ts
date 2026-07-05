import { Router } from 'express';
import { userSchema, userPermissionSchema } from '@estoque/shared';
import { z } from 'zod';
import * as service from './user.service';
import { asyncHandler, validateBody } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get(
  '/roles',
  authorize('users:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listRoles());
  })
);

router.get(
  '/permissions',
  authorize('users:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.listPermissions());
  })
);

router.get(
  '/',
  authorize('users:read'),
  asyncHandler(async (_req, res) => {
    res.json(await service.list());
  })
);

router.get(
  '/:id',
  authorize('users:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.getById(getParamId(req)));
  })
);

router.post(
  '/',
  authorize('users:write'),
  validateBody(userSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  })
);

router.put(
  '/:id',
  authorize('users:write'),
  validateBody(userSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await service.update(getParamId(req), req.body));
  })
);

router.put(
  '/:id/permissions',
  authorize('users:write'),
  validateBody(z.array(userPermissionSchema)),
  asyncHandler(async (req, res) => {
    res.json(await service.updatePermissions(getParamId(req), req.body));
  })
);

router.delete(
  '/:id',
  authorize('users:write'),
  asyncHandler(async (req, res) => {
    await service.remove(getParamId(req));
    res.json({ message: 'Usuário excluído' });
  })
);

export default router;
