import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { StockLocationInput, StockBatchInput } from '@estoque/shared';
import { Prisma } from '@prisma/client';

export async function listLocations() {
  return prisma.stockLocation.findMany({ orderBy: { name: 'asc' } });
}

export async function createLocation(data: StockLocationInput) {
  if (data.isDefault) {
    await prisma.stockLocation.updateMany({ data: { isDefault: false } });
  }
  return prisma.stockLocation.create({ data });
}

export async function updateLocation(id: string, data: StockLocationInput) {
  if (data.isDefault) {
    await prisma.stockLocation.updateMany({ data: { isDefault: false } });
  }
  return prisma.stockLocation.update({ where: { id }, data });
}

export async function deleteLocation(id: string) {
  const balances = await prisma.stockBalance.count({
    where: { locationId: id, quantity: { gt: 0 } },
  });
  if (balances > 0) throw new AppError(400, 'Localização possui estoque');
  return prisma.stockLocation.delete({ where: { id } });
}

export async function listBatches(productId?: string) {
  return prisma.stockBatch.findMany({
    where: productId ? { productId } : undefined,
    include: { product: { select: { id: true, name: true } }, location: true },
    orderBy: { expiryDate: 'asc' },
  });
}

export async function createBatch(data: StockBatchInput) {
  const batch = await prisma.stockBatch.create({ data });
  const existing = await prisma.stockBalance.findFirst({
    where: { productId: data.productId, locationId: data.locationId, batchId: batch.id },
  });
  if (!existing) {
    await prisma.stockBalance.create({
      data: { productId: data.productId, locationId: data.locationId, batchId: batch.id, quantity: 0 },
    });
  }
  return batch;
}

export async function listStock(filters?: {
  lowStock?: boolean;
  outOfStock?: boolean;
  locationId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: { select: { name: true } },
      supplier: { select: { legalName: true } },
      stockBalances: { include: { location: true, batch: true } },
    },
    orderBy: { name: 'asc' },
  });

  let items = await Promise.all(
    products.map(async (p) => {
      const totalQty = p.stockBalances.reduce((sum, b) => sum + Number(b.quantity), 0);
      return {
        id: p.id,
        internalCode: p.internalCode,
        name: p.name,
        brand: p.brand,
        category: p.category?.name ?? null,
        supplier: p.supplier?.legalName,
        physicalLocation: p.physicalLocation,
        minQuantity: Number(p.minQuantity),
        maxQuantity: p.maxQuantity ? Number(p.maxQuantity) : null,
        currentQuantity: totalQty,
        salePrice: Number(p.salePrice),
        imageUrl: p.imageUrl,
        status: totalQty === 0 ? 'out' : totalQty <= Number(p.minQuantity) ? 'low' : 'ok',
        balances: p.stockBalances.map((b) => ({
          location: b.location.name,
          batch: b.batch?.batchNumber,
          expiryDate: b.batch?.expiryDate,
          quantity: Number(b.quantity),
        })),
      };
    })
  );

  if (filters?.outOfStock) items = items.filter((i) => i.currentQuantity === 0);
  if (filters?.lowStock) items = items.filter((i) => i.currentQuantity > 0 && i.currentQuantity <= i.minQuantity);
  if (filters?.locationId) {
    items = items.filter((i) =>
      i.balances.some((b) => products.find((p) => p.id === i.id)?.stockBalances.some(
        (sb) => sb.locationId === filters.locationId && Number(sb.quantity) > 0
      ))
    );
  }

  const total = items.length;
  const paginated = items.slice((page - 1) * limit, page * limit);

  return { items: paginated, total, page, limit };
}

export async function recalculateStock() {
  const products = await prisma.product.findMany({ select: { id: true } });
  let fixed = 0;

  for (const product of products) {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: 'asc' },
    });

    const balanceMap = new Map<string, number>();

    for (const mov of movements) {
      const key = `${mov.locationId}:${mov.batchId || 'null'}`;
      balanceMap.set(key, Number(mov.quantityAfter));
    }

    for (const [key, qty] of balanceMap) {
      const [locationId, batchPart] = key.split(':');
      const batchId = batchPart === 'null' ? null : batchPart;

      const existing = await prisma.stockBalance.findFirst({
        where: {
          productId: product.id,
          locationId,
          batchId: batchId ?? null,
        },
      });

      if (existing) {
        await prisma.stockBalance.update({
          where: { id: existing.id },
          data: { quantity: qty },
        });
      } else {
        await prisma.stockBalance.create({
          data: { productId: product.id, locationId, batchId, quantity: qty },
        });
      }
      fixed++;
    }
  }

  return { message: 'Estoque recalculado', balancesUpdated: fixed };
}

export async function getStockSummary() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { stockBalances: true },
  });

  let totalValue = 0;
  let totalItems = 0;
  let outOfStock = 0;
  let belowMinimum = 0;

  for (const p of products) {
    const qty = p.stockBalances.reduce((s, b) => s + Number(b.quantity), 0);
    totalValue += qty * Number(p.averagePrice || p.purchasePrice);
    totalItems += qty;
    if (qty === 0) outOfStock++;
    else if (qty <= Number(p.minQuantity)) belowMinimum++;
  }

  return { totalValue, totalItems, outOfStock, belowMinimum, productCount: products.length };
}
