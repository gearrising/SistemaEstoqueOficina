import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  description: z.string().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
