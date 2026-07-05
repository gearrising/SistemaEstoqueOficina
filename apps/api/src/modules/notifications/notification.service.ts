import prisma from '../../lib/prisma';
import { NotificationType } from '@prisma/client';
import { emitNotification } from '../../lib/socket';

export async function createNotification(data: {
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  data?: Record<string, unknown>;
}) {
  const notification = await prisma.notification.create({
    data: {
      type: data.type,
      title: data.title,
      message: data.message,
      userId: data.userId,
      data: data.data as object,
    },
  });

  const eventMap: Record<string, string> = {
    STOCK_MINIMUM: 'stock:minimum',
    STOCK_ZERO: 'stock:zero',
    PURCHASE_NEW: 'purchase:new',
    SUCCESS: 'system:success',
    ERROR: 'system:error',
  };

  emitNotification(eventMap[data.type] || 'notification', notification, data.userId);
  return notification;
}

export async function list(userId?: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markAsRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { OR: [{ userId }, { userId: null }], read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId?: string) {
  return prisma.notification.count({
    where: { OR: [{ userId }, { userId: null }], read: false },
  });
}
