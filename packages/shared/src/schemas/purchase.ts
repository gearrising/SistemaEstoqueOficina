import { z } from 'zod';
import { PURCHASE_STATUS } from '../enums';

export const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  status: z.enum(PURCHASE_STATUS).default('DRAFT'),
  observations: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Adicione pelo menos um item'),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const purchaseReceiveSchema = z.object({
  invoiceNumber: z.string().min(1, 'Número da NF obrigatório'),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      receivedQuantity: z.coerce.number().min(0),
      batchNumber: z.string().optional(),
      expiryDate: z.coerce.date().optional().nullable(),
      locationId: z.string().uuid(),
    })
  ),
});

export type PurchaseReceiveInput = z.infer<typeof purchaseReceiveSchema>;
