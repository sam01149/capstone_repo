import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { PrismaService } from '../database/prisma.service.js';
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(actor: AuthPrincipal, page: number, limit: number) {
    const where = { recipientRole: actor.role };
    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reads: { where: { userId: actor.userId }, select: { readAt: true } },
        },
      }),
    ]);
    return {
      items: rows.map(({ reads, recipientRole: _role, ...n }) => ({
        ...n,
        readAt: reads[0]?.readAt ?? null,
      })),
      page,
      limit,
      total,
    };
  }
  async read(actor: AuthPrincipal, id: string) {
    const item = await this.prisma.notification.findFirst({
      where: { id, recipientRole: actor.role },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Notifikasi tidak ditemukan.');
    await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: { notificationId: id, userId: actor.userId },
      },
      create: { notificationId: id, userId: actor.userId },
      update: {},
    });
    return { id, read: true };
  }
}
