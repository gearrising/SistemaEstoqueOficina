import { z } from 'zod';

export const stockLocationSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export type StockLocationInput = z.infer<typeof stockLocationSchema>;

export const stockBatchSchema = z.object({
  productId: z.string().uuid(),
  batchNumber: z.string().min(1, 'Número do lote obrigatório'),
  expiryDate: z.coerce.date().optional().nullable(),
  locationId: z.string().uuid(),
});

export type StockBatchInput = z.infer<typeof stockBatchSchema>;
