export const ROLES = ['ADMIN', 'GERENTE', 'ESTOQUISTA', 'FUNCIONARIO'] as const;
export type RoleName = (typeof ROLES)[number];

export const MOVEMENT_TYPES = [
  'ENTRY',
  'EXIT',
  'TRANSFER',
  'ADJUSTMENT',
  'MANUAL_CORRECTION',
  'INVENTORY',
  'LOSS',
  'BREAKAGE',
  'INTERNAL_CONSUMPTION',
  'RETURN',
  'EXCHANGE',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
  TRANSFER: 'Transferência',
  ADJUSTMENT: 'Ajuste',
  MANUAL_CORRECTION: 'Correção manual',
  INVENTORY: 'Inventário',
  LOSS: 'Perda',
  BREAKAGE: 'Quebra',
  INTERNAL_CONSUMPTION: 'Consumo interno',
  RETURN: 'Devolução',
  EXCHANGE: 'Troca',
};

export const PRODUCT_STATUS = ['ACTIVE', 'INACTIVE'] as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[number];

export const PURCHASE_STATUS = ['DRAFT', 'BUDGET', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUS)[number];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  DRAFT: 'Rascunho',
  BUDGET: 'Orçamento',
  ORDERED: 'Pedido',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

export const NOTIFICATION_TYPES = [
  'STOCK_MINIMUM',
  'STOCK_ZERO',
  'PURCHASE_NEW',
  'SUCCESS',
  'ERROR',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
