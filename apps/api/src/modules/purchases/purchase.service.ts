import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { PurchaseOrderInput, PurchaseReceiveInput } from '@estoque/shared';
import { createMovement } from '../movements/movement.service';
import { createNotification } from '../notifications/notification.service';

export async function list(filters?: { status?: string; supplierId?: string }) {
  const where: Prisma.PurchaseOrderWhereInput = {};
  if (filters?.status) where.status = filters.status as Prisma.PurchaseOrderWhereInput['status'];
  if (filters?.supplierId) where.supplierId = filters.supplierId;

  return prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { id: true, legalName: true, tradeName: true } },
      user: { select: { name: true } },
      items: {
        include: { product: { select: { id: true, name: true, internalCode: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: { select: { name: true } },
      items: { include: { product: true } },
    },
  });
  if (!order) throw new AppError(404, 'Pedido não encontrado');
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    items: order.items.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      receivedQuantity: Number(i.receivedQuantity),
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  };
}

export async function create(data: PurchaseOrderInput, userId: string) {
  const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: data.supplierId,
      userId,
      status: data.status,
      observations: data.observations,
      totalAmount,
      items: {
        create: data.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
        })),
      },
    },
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
  });

  await createNotification({
    type: 'PURCHASE_NEW',
    title: 'Nova compra',
    message: `Pedido criado para ${order.supplier.legalName}`,
    data: { purchaseOrderId: order.id },
  });

  return order;
}

export async function updateStatus(id: string, status: string) {
  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: status as Prisma.PurchaseOrderUpdateInput['status'] },
  });
}

export async function receive(
  id: string,
  data: PurchaseReceiveInput,
  userId: string,
  meta: { ip?: string; userAgent?: string }
) {
  const order = await getById(id);
  if (order.status === 'RECEIVED') throw new AppError(400, 'Pedido já recebido');
  if (order.status === 'CANCELLED') throw new AppError(400, 'Pedido cancelado');

  await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const orderItem = order.items.find((i) => i.id === item.itemId);
      if (!orderItem) continue;

      const receivedQty = item.receivedQuantity;
      if (receivedQty <= 0) continue;

      let batchId: string | null = null;
      if (item.batchNumber) {
        const batch = await tx.stockBatch.upsert({
          where: {
            productId_batchNumber_locationId: {
              productId: orderItem.productId,
              batchNumber: item.batchNumber,
              locationId: item.locationId,
            },
          },
          update: {},
          create: {
            productId: orderItem.productId,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            locationId: item.locationId,
          },
        });
        batchId = batch.id;
      }

      await createMovement(
        {
          type: 'ENTRY',
          productId: orderItem.productId,
          locationId: item.locationId,
          batchId,
          quantity: receivedQty,
          reason: `Recebimento NF ${data.invoiceNumber}`,
          observation: `Pedido ${id}`,
        },
        userId,
        meta
      );

      const newReceived = Number(orderItem.receivedQuantity) + receivedQty;
      await tx.purchaseOrderItem.update({
        where: { id: item.itemId },
        data: { receivedQuantity: newReceived },
      });

      const product = await tx.product.findUnique({ where: { id: orderItem.productId } });
      if (product) {
        const currentAvg = Number(product.averagePrice);
        const currentStock = await tx.stockBalance.aggregate({
          where: { productId: orderItem.productId },
          _sum: { quantity: true },
        });
        const stockQty = Number(currentStock._sum.quantity || 0);
        const unitPrice = Number(orderItem.unitPrice);
        const newAvg =
          stockQty > 0
            ? (currentAvg * (stockQty - receivedQty) + unitPrice * receivedQty) / stockQty
            : unitPrice;

        await tx.product.update({
          where: { id: orderItem.productId },
          data: {
            purchasePrice: unitPrice,
            averagePrice: newAvg,
          },
        });
      }
    }

    const allReceived = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const fullyReceived = allReceived.every(
      (i) => Number(i.receivedQuantity) >= Number(i.quantity)
    );
    const partiallyReceived = allReceived.some((i) => Number(i.receivedQuantity) > 0);

    await tx.purchaseOrder.update({
      where: { id },
      data: {
        status: fullyReceived ? 'RECEIVED' : partiallyReceived ? 'PARTIAL' : order.status,
        invoiceNumber: data.invoiceNumber,
        receivedAt: new Date(),
      },
    });
  });

  return getById(id);
}

export async function cancel(id: string) {
  return updateStatus(id, 'CANCELLED');
}

export async function generateSuggestions() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { supplier: true, stockBalances: true },
  });

  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const days365 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const outboundTypes = ['EXIT', 'LOSS', 'BREAKAGE', 'INTERNAL_CONSUMPTION', 'EXCHANGE'];

  await prisma.purchaseSuggestion.deleteMany({});

  const suggestions = [];

  for (const product of products) {
    const currentStock = product.stockBalances.reduce((s, b) => s + Number(b.quantity), 0);
    const minQty = Number(product.minQuantity);
    const maxQty = product.maxQuantity ? Number(product.maxQuantity) : minQty * 2;

    const [mov30, mov90, mov365] = await Promise.all([
      prisma.stockMovement.aggregate({
        where: {
          productId: product.id,
          type: { in: outboundTypes as Prisma.EnumMovementTypeFilter['in'] },
          createdAt: { gte: days30 },
        },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          productId: product.id,
          type: { in: outboundTypes as Prisma.EnumMovementTypeFilter['in'] },
          createdAt: { gte: days90 },
        },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          productId: product.id,
          type: { in: outboundTypes as Prisma.EnumMovementTypeFilter['in'] },
          createdAt: { gte: days365 },
        },
        _sum: { quantity: true },
      }),
    ]);

    const avg30 = Number(mov30._sum.quantity || 0) / 30;
    const avg90 = Number(mov90._sum.quantity || 0) / 90;
    const avg365 = Number(mov365._sum.quantity || 0) / 365;

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonth, lastMonth] = await Promise.all([
      prisma.stockMovement.aggregate({
        where: {
          productId: product.id,
          type: { in: outboundTypes as Prisma.EnumMovementTypeFilter['in'] },
          createdAt: { gte: thisMonthStart },
        },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          productId: product.id,
          type: { in: outboundTypes as Prisma.EnumMovementTypeFilter['in'] },
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { quantity: true },
      }),
    ]);

    const thisMonthQty = Number(thisMonth._sum.quantity || 0);
    const lastMonthQty = Number(lastMonth._sum.quantity || 1);
    const seasonalFactor = Math.min(2, Math.max(0.5, thisMonthQty / lastMonthQty));

    const leadTime = product.supplier?.leadTimeDays || 7;
    const safetyStock = avg30 * leadTime * seasonalFactor;
    const suggestedQty = Math.max(0, maxQty - currentStock + safetyStock);

    if (suggestedQty > 0 || currentStock <= minQty) {
      const suggestion = await prisma.purchaseSuggestion.create({
        data: {
          productId: product.id,
          currentStock,
          avgConsumption30: avg30,
          avgConsumption90: avg90,
          avgConsumption365: avg365,
          seasonalFactor,
          leadTimeDays: leadTime,
          safetyStock,
          suggestedQty: Math.max(suggestedQty, currentStock <= minQty ? minQty * 2 - currentStock : 0),
        },
        include: {
          product: {
            select: { name: true, internalCode: true, supplier: { select: { legalName: true } } },
          },
        },
      });
      suggestions.push(suggestion);
    }
  }

  return suggestions.sort((a, b) => Number(b.suggestedQty) - Number(a.suggestedQty));
}

export async function listSuggestions() {
  return prisma.purchaseSuggestion.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          internalCode: true,
          minQuantity: true,
          supplier: { select: { legalName: true, leadTimeDays: true } },
        },
      },
    },
    orderBy: { suggestedQty: 'desc' },
  });
}

export async function getPurchaseList() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { stockBalances: true, supplier: true },
  });

  return products
    .map((p) => {
      const qty = p.stockBalances.reduce((s, b) => s + Number(b.quantity), 0);
      return {
        id: p.id,
        name: p.name,
        internalCode: p.internalCode,
        currentQuantity: qty,
        minQuantity: Number(p.minQuantity),
        supplier: p.supplier?.legalName,
        needed: Math.max(0, Number(p.minQuantity) * 2 - qty),
      };
    })
    .filter((p) => p.currentQuantity <= p.minQuantity)
    .sort((a, b) => a.currentQuantity - b.currentQuantity);
}
