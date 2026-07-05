import { Prisma } from '@prisma/client';
import QRCode from 'qrcode';
import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { ProductInput } from '@estoque/shared';

async function getProductStock(productId: string): Promise<number> {
  const result = await prisma.stockBalance.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  return Number(result._sum.quantity || 0);
}

export async function list(filters: {
  q?: string;
  categoryId?: string;
  supplierId?: string;
  brand?: string;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const where: Prisma.ProductWhereInput = {};

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { internalCode: { contains: filters.q, mode: 'insensitive' } },
      { barcode: { contains: filters.q } },
      { brand: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  if (filters.location) where.physicalLocation = { contains: filters.location, mode: 'insensitive' };
  if (filters.status) where.status = filters.status as 'ACTIVE' | 'INACTIVE';

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, legalName: true, tradeName: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const withStock = await Promise.all(
    items.map(async (p) => ({
      ...p,
      purchasePrice: Number(p.purchasePrice),
      averagePrice: Number(p.averagePrice),
      salePrice: Number(p.salePrice),
      minQuantity: Number(p.minQuantity),
      maxQuantity: p.maxQuantity ? Number(p.maxQuantity) : null,
      currentQuantity: await getProductStock(p.id),
    }))
  );

  return { items: withStock, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      stockBalances: { include: { location: true, batch: true } },
      stockBatches: { include: { location: true } },
    },
  });
  if (!product) throw new AppError(404, 'Produto não encontrado');
  return {
    ...product,
    purchasePrice: Number(product.purchasePrice),
    averagePrice: Number(product.averagePrice),
    salePrice: Number(product.salePrice),
    minQuantity: Number(product.minQuantity),
    maxQuantity: product.maxQuantity ? Number(product.maxQuantity) : null,
    currentQuantity: await getProductStock(id),
    stockBalances: product.stockBalances.map((b) => ({
      ...b,
      quantity: Number(b.quantity),
    })),
  };
}

export async function create(data: ProductInput) {
  const exists = await prisma.product.findUnique({ where: { internalCode: data.internalCode } });
  if (exists) throw new AppError(400, 'Código interno já existe');

  const qrCodeData = JSON.stringify({ code: data.internalCode, name: data.name });
  const qrCodeUrl = await QRCode.toDataURL(qrCodeData);

  const product = await prisma.product.create({
    data: {
      ...data,
      qrCodeData,
      purchasePrice: data.purchasePrice,
      averagePrice: data.averagePrice,
      salePrice: data.salePrice,
      minQuantity: data.minQuantity,
      maxQuantity: data.maxQuantity,
      supplierId: data.supplierId || null,
    },
    include: { category: true, supplier: true },
  });

  const defaultLocation = await prisma.stockLocation.findFirst({ where: { isDefault: true } });
  if (defaultLocation) {
    await prisma.stockBalance.create({
      data: { productId: product.id, locationId: defaultLocation.id, quantity: 0 },
    });
  }

  return { ...product, qrCodeUrl, currentQuantity: 0 };
}

export async function update(id: string, data: Partial<ProductInput>) {
  await getById(id);
  if (data.internalCode) {
    const exists = await prisma.product.findFirst({
      where: { internalCode: data.internalCode, NOT: { id } },
    });
    if (exists) throw new AppError(400, 'Código interno já existe');
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      supplierId: data.supplierId === null ? null : data.supplierId,
    },
    include: { category: true, supplier: true },
  });

  return {
    ...product,
    currentQuantity: await getProductStock(id),
  };
}

export async function remove(id: string) {
  const movements = await prisma.stockMovement.count({ where: { productId: id } });
  if (movements > 0) {
    return prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
  }
  return prisma.product.delete({ where: { id } });
}

export async function updateImage(id: string, imageUrl: string) {
  return prisma.product.update({ where: { id }, data: { imageUrl } });
}

export async function getQrCode(id: string) {
  const product = await getById(id);
  const qrCodeUrl = await QRCode.toDataURL(
    product.qrCodeData || JSON.stringify({ code: product.internalCode, name: product.name })
  );
  return { qrCodeUrl, barcode: product.barcode, internalCode: product.internalCode };
}

export async function search(q: string) {
  return list({ q, limit: 10, page: 1 });
}
