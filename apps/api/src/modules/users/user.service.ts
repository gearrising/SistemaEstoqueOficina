import prisma from '../../lib/prisma';
import { AppError } from '../../lib/utils';
import { hashPassword } from '../../lib/bcrypt';
import { UserInput } from '@estoque/shared';

export async function list() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function getById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      role: { select: { id: true, name: true } },
      permissions: { include: { permission: true } },
      createdAt: true,
    },
  });
  if (!user) throw new AppError(404, 'Usuário não encontrado');
  return user;
}

export async function create(data: UserInput) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new AppError(400, 'E-mail já cadastrado');
  if (!data.password) throw new AppError(400, 'Senha obrigatória');

  const password = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password,
      roleId: data.roleId,
      active: data.active,
    },
    select: { id: true, name: true, email: true, active: true, role: true },
  });
}

export async function update(id: string, data: Partial<UserInput>) {
  await getById(id);
  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    roleId: data.roleId,
    active: data.active,
  };
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }
  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, active: true, role: true },
  });
}

export async function remove(id: string) {
  const user = await getById(id);
  if (user.role.name === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: { name: 'ADMIN' }, active: true },
    });
    if (adminCount <= 1) throw new AppError(400, 'Não é possível remover o único administrador');
  }
  return prisma.user.delete({ where: { id } });
}

export async function updatePermissions(
  userId: string,
  permissions: { permission: string; granted: boolean }[]
) {
  await getById(userId);
  for (const perm of permissions) {
    const permission = await prisma.permission.findUnique({ where: { key: perm.permission } });
    if (!permission) continue;
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      update: { granted: perm.granted },
      create: { userId, permissionId: permission.id, granted: perm.granted },
    });
  }
  return getById(userId);
}

export async function listRoles() {
  return prisma.role.findMany({ orderBy: { name: 'asc' } });
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: 'asc' } });
}
