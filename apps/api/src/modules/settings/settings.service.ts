import prisma from '../../lib/prisma';

export async function getSettings() {
  const settings = await prisma.systemSetting.findMany();
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function updateSettings(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  return getSettings();
}

export async function listAuditLogs(filters?: {
  entity?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const where: Record<string, unknown> = {};
  if (filters?.entity) where.entity = filters.entity;
  if (filters?.userId) where.userId = filters.userId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, limit };
}
