import { z } from 'zod';
import { PRODUCT_STATUS } from '../enums';

export const productSchema = z.object({
  internalCode: z.string().min(1, 'Código interno obrigatório'),
  barcode: z.string().optional(),
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  categoryId: z.string().uuid('Categoria inválida'),
  brand: z.string().optional(),
  supplierId: z.string().uuid().optional().nullable(),
  physicalLocation: z.string().optional(),
  unit: z.string().default('UN'),
  purchasePrice: z.coerce.number().min(0).default(0),
  averagePrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  minQuantity: z.coerce.number().min(0).default(0),
  maxQuantity: z.coerce.number().min(0).optional().nullable(),
  observations: z.string().optional(),
  status: z.enum(PRODUCT_STATUS).default('ACTIVE'),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productSearchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  brand: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(PRODUCT_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
