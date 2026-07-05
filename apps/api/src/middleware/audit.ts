import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from './auth';
import { getClientInfo } from '../lib/utils';

function paramId(id: string | string[] | undefined): string | undefined {
  return Array.isArray(id) ? id[0] : id;
}

export function auditLog(action: string, entity: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const { ip, userAgent } = getClientInfo(req);
    const entityId = paramId(req.params.id);

    res.json = function (body: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId,
              action,
              entity,
              entityId: entityId || (body as { id?: string })?.id,
              before: req.method === 'PUT' || req.method === 'PATCH' ? req.body : undefined,
              after: body as object,
              ip,
              userAgent,
            },
          })
          .catch(console.error);
      }
      return originalJson(body);
    };
    next();
  };
}

export async function createAuditEntry(data: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({ data: data as Parameters<typeof prisma.auditLog.create>[0]['data'] });
}
