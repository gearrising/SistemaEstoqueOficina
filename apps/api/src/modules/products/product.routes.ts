import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { productSchema, productSearchSchema } from '@estoque/shared';
import * as service from './product.service';
import { asyncHandler, validateBody, validateQuery, AppError } from '../../lib/utils';
import { getParamId } from '../../lib/params';
import { authenticate, authorize } from '../../middleware/auth';

const uploadDir = process.env.UPLOAD_DIR || './uploads/produtos';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  },
});

const router = Router();

router.use(authenticate);

router.get(
  '/search',
  authorize('products:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.search(req.query.q as string));
  })
);

router.get(
  '/',
  authorize('products:read'),
  validateQuery(productSearchSchema),
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.query as Parameters<typeof service.list>[0]));
  })
);

router.get(
  '/:id',
  authorize('products:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.getById(getParamId(req)));
  })
);

router.get(
  '/:id/qrcode',
  authorize('products:read'),
  asyncHandler(async (req, res) => {
    res.json(await service.getQrCode(getParamId(req)));
  })
);

router.post(
  '/',
  authorize('products:write'),
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  })
);

router.put(
  '/:id',
  authorize('products:write'),
  validateBody(productSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await service.update(getParamId(req), req.body));
  })
);

router.post(
  '/:id/image',
  authorize('products:write'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'Imagem não fornecida');
    const id = getParamId(req);
    const filename = `${id}.webp`;
    const filepath = path.join(uploadDir, filename);
    await sharp(req.file.buffer).resize(800, 800, { fit: 'inside' }).webp().toFile(filepath);
    const imageUrl = `/uploads/produtos/${filename}`;
    res.json(await service.updateImage(id, imageUrl));
  })
);

router.delete(
  '/:id',
  authorize('products:write'),
  asyncHandler(async (req, res) => {
    await service.remove(getParamId(req));
    res.json({ message: 'Produto removido' });
  })
);

export default router;
