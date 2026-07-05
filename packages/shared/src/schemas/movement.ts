import { z } from 'zod';
import { MOVEMENT_TYPES } from '../enums';

export const movementSchema = z.object({
  type: z.enum(MOVEMENT_TYPES),
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  targetLocationId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  reason: z.string().optional(),
  observation: z.string().optional(),
  allowNegative: z.boolean().optional(),
});

export type MovementInput = z.infer<typeof movementSchema>;

export const movementFilterSchema = z.object({
  type: z.enum(MOVEMENT_TYPES).optional(),
  productId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
