import { MovementType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { MovementInput } from '@estoque/shared';
import { emitNotification } from '../../lib/socket';
import { createNotification } from '../notifications/notification.service';

const OUTBOUND_TYPES: MovementType[] = [
  'EXIT',
  'LOSS',
  'BREAKAGE',
  'INTERNAL_CONSUMPTION',
  'EXCHANGE',
];

const INBOUND_TYPES: MovementType[] = ['ENTRY', 'RETURN'];

async function getBalance(productId: string, locationId: string, batchId?: string | null) {
  const balance = await prisma.stockBalance.findFirst({
    where: { productId, locationId, batchId: batchId || null },
  });
  return Number(balance?.quantity || 0);
}

async function upsertBalance(
  productId: string,
  locationId: string,
  batchId: string | null,
  quantity: number
) {
  const existing = await prisma.stockBalance.findFirst({
    where: { productId, locationId, batchId },
  });

  if (existing) {
    return prisma.stockBalance.update({
      where: { id: existing.id },
      data: { quantity },
    });
  }

  return prisma.stockBalance.create({
    data: { productId, locationId, batchId, quantity },
  });
}

async function checkStockAlerts(productId: string, newQty: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const minQty = Number(product.minQuantity);

  if (newQty === 0) {
    await createNotification({
      type: 'STOCK_ZERO',
      title: 'Estoque zerado',
      message: `${product.name} está sem estoque`,
      data: { productId },
    });
    emitNotification('stock:zero', { productId, name: product.name });
  } else if (newQty <= minQty) {
    await createNotification({
      type: 'STOCK_MINIMUM',
      title: 'Estoque mínimo',
      message: `${product.name} atingiu o estoque mínimo (${newQty}/${minQty})`,
      data: { productId, current: newQty, minimum: minQty },
    });
    emitNotification('stock:minimum', { productId, name: product.name, current: newQty, minimum: minQty });
  }
}

export async function createMovement(
  data: MovementInput,
  userId: string,
  meta: { ip?: string; userAgent?: string }
) {
  if (data.type === 'TRANSFER') {
    if (!data.targetLocationId) throw new AppError(400, 'Localização de destino obrigatória');
    return transferStock(data, userId, meta);
  }

  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new AppError(404, 'Produto não encontrado');

  const currentQty = await getBalance(data.productId, data.locationId, data.batchId);
  let newQty = currentQty;
  let quantity = data.quantity;

  if (INBOUND_TYPES.includes(data.type) || data.type === 'ADJUSTMENT' || data.type === 'INVENTORY' || data.type === 'MANUAL_CORRECTION') {
    if (data.type === 'INVENTORY' || data.type === 'MANUAL_CORRECTION' || data.type === 'ADJUSTMENT') {
      newQty = quantity;
      quantity = Math.abs(newQty - currentQty);
    } else {
      newQty = currentQty + quantity;
    }
  } else if (OUTBOUND_TYPES.includes(data.type)) {
    newQty = currentQty - quantity;
    if (newQty < 0 && !data.allowNegative) {
      throw new AppError(400, 'Estoque insuficiente. Operação bloqueada.');
    }
  } else {
    throw new AppError(400, 'Tipo de movimentação inválido');
  }

  const warnings: string[] = [];
  if (OUTBOUND_TYPES.includes(data.type) && newQty === 0) {
    warnings.push('Atenção: o estoque será zerado após esta operação');
  }

  const movement = await prisma.$transaction(async (tx) => {
    await upsertBalance(data.productId, data.locationId, data.batchId || null, newQty);

    const mov = await tx.stockMovement.create({
      data: {
        type: data.type,
        productId: data.productId,
        locationId: data.locationId,
        batchId: data.batchId,
        userId,
        quantity,
        quantityBefore: currentQty,
        quantityAfter: newQty,
        reason: data.reason,
        observation: data.observation,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      include: {
        product: { select: { name: true, internalCode: true } },
        location: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: { lastMovementAt: new Date() },
    });

    return mov;
  });

  const totalStock = await prisma.stockBalance.aggregate({
    where: { productId: data.productId },
    _sum: { quantity: true },
  });
  await checkStockAlerts(data.productId, Number(totalStock._sum.quantity || 0));

  return { movement, warnings };
}

async function transferStock(
  data: MovementInput,
  userId: string,
  meta: { ip?: string; userAgent?: string }
) {
  const sourceQty = await getBalance(data.productId, data.locationId, data.batchId);
  if (sourceQty < data.quantity) {
    throw new AppError(400, 'Estoque insuficiente na origem');
  }

  const destQty = await getBalance(data.productId, data.targetLocationId!, data.batchId);
  const newSourceQty = sourceQty - data.quantity;
  const newDestQty = destQty + data.quantity;

  const result = await prisma.$transaction(async (tx) => {
    await upsertBalance(data.productId, data.locationId, data.batchId || null, newSourceQty);
    await upsertBalance(data.productId, data.targetLocationId!, data.batchId || null, newDestQty);

    const exitMov = await tx.stockMovement.create({
      data: {
        type: 'TRANSFER',
        productId: data.productId,
        locationId: data.locationId,
        targetLocationId: data.targetLocationId,
        batchId: data.batchId,
        userId,
        quantity: data.quantity,
        quantityBefore: sourceQty,
        quantityAfter: newSourceQty,
        reason: data.reason || 'Transferência',
        observation: data.observation,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    const entryMov = await tx.stockMovement.create({
      data: {
        type: 'TRANSFER',
        productId: data.productId,
        locationId: data.targetLocationId!,
        targetLocationId: data.locationId,
        batchId: data.batchId,
        userId,
        quantity: data.quantity,
        quantityBefore: destQty,
        quantityAfter: newDestQty,
        reason: data.reason || 'Transferência',
        observation: data.observation,
        relatedMovementId: exitMov.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    await tx.product.update({
      where: { id: data.productId },
      data: { lastMovementAt: new Date() },
    });

    return { exitMov, entryMov };
  });

  return { movement: result.exitMov, warnings: [] };
}

export async function listMovements(filters: {
  type?: MovementType;
  productId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const where: Record<string, unknown> = {};

  if (filters.type) where.type = filters.type;
  if (filters.productId) where.productId = filters.productId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
  }

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, internalCode: true } },
        location: { select: { name: true } },
        user: { select: { name: true } },
        batch: { select: { batchNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    items: items.map((m) => ({
      ...m,
      quantity: Number(m.quantity),
      quantityBefore: Number(m.quantityBefore),
      quantityAfter: Number(m.quantityAfter),
    })),
    total,
    page,
    limit,
  };
}

export async function getRecentMovements(limit = 10) {
  return listMovements({ limit, page: 1 });
}
