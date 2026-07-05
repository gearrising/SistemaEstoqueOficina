import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../lib/jwt';
import { AppError } from '../lib/utils';
import prisma from '../lib/prisma';
import { ROLE_PERMISSIONS, Permission } from '@estoque/shared';

export interface AuthRequest extends Request {
  user?: TokenPayload & { permissions: string[] };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError(401, 'Token não fornecido'));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: true,
        permissions: { include: { permission: true } },
      },
    });

    if (!user || !user.active) {
      return next(new AppError(401, 'Usuário inativo ou não encontrado'));
    }

    const rolePerms = ROLE_PERMISSIONS[user.role.name] || [];
    const userPermOverrides = new Map(
      user.permissions.map((p) => [p.permission.key, p.granted])
    );

    const permissions = new Set<string>(rolePerms);
    for (const [key, granted] of userPermOverrides) {
      if (granted) permissions.add(key);
      else permissions.delete(key);
    }

    req.user = {
      ...payload,
      permissions: Array.from(permissions),
    };
    next();
  } catch {
    next(new AppError(401, 'Token inválido ou expirado'));
  }
}

export function authorize(...required: Permission[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Não autenticado'));

    const hasPermission = required.some((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      return next(new AppError(403, 'Sem permissão para esta ação'));
    }
    next();
  };
}
