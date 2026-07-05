import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { SupplierInput } from '@estoque/shared';

export async function list(search?: string) {
  return prisma.supplier.findMany({
    where: search
      ? {
          OR: [
            { legalName: { contains: search, mode: 'insensitive' } },
            { tradeName: { contains: search, mode: 'insensitive' } },
            { cnpj: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { legalName: 'asc' },
  });
}

export async function getById(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new AppError(404, 'Fornecedor não encontrado');
  return supplier;
}

export async function create(data: SupplierInput) {
  return prisma.supplier.create({ data });
}

export async function update(id: string, data: SupplierInput) {
  await getById(id);
  return prisma.supplier.update({ where: { id }, data });
}

export async function remove(id: string) {
  const count = await prisma.product.count({ where: { supplierId: id } });
  if (count > 0) throw new AppError(400, 'Fornecedor possui produtos vinculados');
  return prisma.supplier.delete({ where: { id } });
}
