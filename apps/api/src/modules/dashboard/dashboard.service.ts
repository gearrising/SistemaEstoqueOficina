import prisma from '../../lib/prisma';
import { getStockSummary } from '../stock/stock.service';
import { getRecentMovements } from '../movements/movement.service';
import { getPurchaseList } from '../purchases/purchase.service';

export async function getSummary() {
  const stockSummary = await getStockSummary();
  const recentMovements = await getRecentMovements(10);
  const purchaseList = await getPurchaseList();

  const topMoved = await prisma.stockMovement.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    _count: true,
    orderBy: { _count: { productId: 'desc' } },
    take: 5,
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const topProducts = await Promise.all(
    topMoved.map(async (t) => {
      const product = await prisma.product.findUnique({
        where: { id: t.productId },
        select: { id: true, name: true, internalCode: true },
      });
      return {
        ...product,
        totalMoved: Number(t._sum.quantity || 0),
        movementCount: t._count,
      };
    })
  );

  return {
    ...stockSummary,
    recentMovements: recentMovements.items,
    purchaseList,
    topMovedProducts: topProducts,
  };
}

export async function getEntriesChart(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const movements = await prisma.stockMovement.findMany({
    where: {
      type: 'ENTRY',
      createdAt: { gte: startDate },
    },
    select: { createdAt: true, quantity: true },
  });

  const byDay: Record<string, number> = {};
  for (const m of movements) {
    const day = m.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + Number(m.quantity);
  }

  return Object.entries(byDay)
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getExitsChart(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const outboundTypes = ['EXIT', 'LOSS', 'BREAKAGE', 'INTERNAL_CONSUMPTION', 'EXCHANGE'];

  const movements = await prisma.stockMovement.findMany({
    where: {
      type: { in: ['EXIT', 'LOSS', 'BREAKAGE', 'INTERNAL_CONSUMPTION', 'EXCHANGE'] },
      createdAt: { gte: startDate },
    },
    select: { createdAt: true, quantity: true },
  });

  const byDay: Record<string, number> = {};
  for (const m of movements) {
    const day = m.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + Number(m.quantity);
  }

  return Object.entries(byDay)
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMonthlyChart(months = 12) {
  const result = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [entries, exits] = await Promise.all([
      prisma.stockMovement.aggregate({
        where: { type: 'ENTRY', createdAt: { gte: start, lte: end } },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          type: { in: ['EXIT', 'LOSS', 'BREAKAGE', 'INTERNAL_CONSUMPTION'] },
          createdAt: { gte: start, lte: end },
        },
        _sum: { quantity: true },
      }),
    ]);

    result.push({
      month: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      entries: Number(entries._sum.quantity || 0),
      exits: Number(exits._sum.quantity || 0),
    });
  }

  return result;
}
