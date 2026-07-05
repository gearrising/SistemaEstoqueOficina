import { z } from 'zod';

export const supplierSchema = z.object({
  legalName: z.string().min(2, 'Razão social obrigatória'),
  tradeName: z.string().optional(),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  contact: z.string().optional(),
  observations: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).default(7),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
