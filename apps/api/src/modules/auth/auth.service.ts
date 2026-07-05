import prisma from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../lib/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshExpiry } from '../../lib/jwt';
import { AppError } from '../../lib/utils';
import { ROLE_PERMISSIONS } from '@estoque/shared';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, permissions: { include: { permission: true } } },
  });

  if (!user || !user.active) {
    throw new AppError(401, 'E-mail ou senha incorretos');
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new AppError(401, 'E-mail ou senha incorretos');

  const payload = { userId: user.id, email: user.email, role: user.role.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshExpiry(),
    },
  });

  const rolePerms = ROLE_PERMISSIONS[user.role.name] || [];
  const userPermOverrides = new Map(user.permissions.map((p) => [p.permission.key, p.granted]));
  const permissions = new Set<string>(rolePerms);
  for (const [key, granted] of userPermOverrides) {
    if (granted) permissions.add(key);
    else permissions.delete(key);
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: Array.from(permissions),
    },
  };
}

export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token inválido');
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });

  if (!user || !user.active) throw new AppError(401, 'Usuário inválido');

  await prisma.refreshToken.delete({ where: { token: refreshToken } });

  const newPayload = { userId: user.id, email: user.email, role: user.role.name };
  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: user.id, expiresAt: getRefreshExpiry() },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, permissions: { include: { permission: true } } },
  });
  if (!user) throw new AppError(404, 'Usuário não encontrado');

  const rolePerms = ROLE_PERMISSIONS[user.role.name] || [];
  const userPermOverrides = new Map(user.permissions.map((p) => [p.permission.key, p.granted]));
  const permissions = new Set<string>(rolePerms);
  for (const [key, granted] of userPermOverrides) {
    if (granted) permissions.add(key);
    else permissions.delete(key);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions: Array.from(permissions),
  };
}
