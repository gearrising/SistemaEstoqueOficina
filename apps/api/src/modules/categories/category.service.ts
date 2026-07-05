import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { CategoryInput } from '@estoque/shared';

export async function list(search?: string) {
  return prisma.category.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
}

export async function getById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw new AppError(404, 'Categoria não encontrada');
  return category;
}

export async function create(data: CategoryInput) {
  return prisma.category.create({ data });
}

export async function update(id: string, data: CategoryInput) {
  await getById(id);
  return prisma.category.update({ where: { id }, data });
}

export async function remove(id: string) {
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw new AppError(400, 'Categoria possui produtos vinculados');
  return prisma.category.delete({ where: { id } });
}
