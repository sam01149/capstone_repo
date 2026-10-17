import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PasswordService } from '../auth/password.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUserActivityQueryDto } from './dto/list-user-activity-query.dto.js';
import type {
  ListUsersQueryDto,
  UserSortField,
} from './dto/list-users-query.dto.js';
import type { SetUserPasswordDto } from './dto/set-user-password.dto.js';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import {
  safeUserSelect,
  toUserResponse,
  type SafeUserRecord,
} from './user-response.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async list(query: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        {
          emailNormalized: {
            contains: query.search.toLowerCase(),
            mode: 'insensitive',
          },
        },
      ];
    }
    if (query.role) where.role = { code: query.role };
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const sortField = this.userSortField(query.sort);
    const orderBy = [
      { [sortField]: query.order },
      { id: 'asc' as const },
    ] as Prisma.UserOrderByWithRelationInput[];
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy,
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: records.map(toUserResponse),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async findOne(userId: string) {
    return toUserResponse(await this.findUserOrThrow(userId));
  }

  async create(actor: AuthPrincipal, dto: CreateUserDto, requestId: string) {
    const emailNormalized = dto.email.trim().toLowerCase();
    const duplicate = await this.prisma.user.findUnique({
      where: { emailNormalized },
      select: { id: true },
    });
    if (duplicate) throw this.emailAlreadyUsed();

    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const created = await this.runSerializable(async (tx) => {
        const role = await tx.role.findUnique({ where: { code: dto.role } });
        if (!role) throw this.invalidRole();
        const user = await tx.user.create({
          data: {
            name: dto.name,
            email: emailNormalized,
            emailNormalized,
            passwordHash,
            roleId: role.id,
            mustChangePassword: false,
          },
          select: safeUserSelect,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'USER_CREATED',
            targetType: 'USER',
            targetId: user.id,
            requestId,
            safeMetadata: { newRole: role.code },
          },
        });
        return user;
      });
      return toUserResponse(created);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) throw this.emailAlreadyUsed();
      throw error;
    }
  }

  async update(
    actor: AuthPrincipal,
    userId: string,
    dto: UpdateUserDto,
    requestId: string,
  ) {
    if (dto.name === undefined && dto.email === undefined) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Isi minimal satu perubahan nama atau email.',
      );
    }
    const emailNormalized = dto.email?.trim().toLowerCase();

    try {
      const updated = await this.runSerializable(async (tx) => {
        await this.lockUser(tx, userId);
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: safeUserSelect,
        });
        if (!current) throw this.userNotFound();

        const changedFields: string[] = [];
        const data: Prisma.UserUpdateInput = {};
        if (dto.name !== undefined && dto.name !== current.name) {
          data.name = dto.name;
          changedFields.push('name');
        }
        if (
          emailNormalized !== undefined &&
          emailNormalized !== current.email.toLowerCase()
        ) {
          data.email = emailNormalized;
          data.emailNormalized = emailNormalized;
          changedFields.push('email');
        }
        if (changedFields.length === 0) return current;

        const user = await tx.user.update({
          where: { id: userId },
          data,
          select: safeUserSelect,
        });
        if (changedFields.includes('email')) {
          await this.revokeSessions(tx, userId, 'EMAIL_CHANGED');
        }
        await tx.auditLog.create({
          data: {
            actorUserId: actor.userId,
            action: 'USER_UPDATED',
            targetType: 'USER',
            targetId: userId,
            requestId,
            safeMetadata: { changedFields },
          },
        });
        return user;
      });
      return toUserResponse(updated);
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) throw this.emailAlreadyUsed();
      throw error;
    }
  }

  async updateRole(
    actor: AuthPrincipal,
    userId: string,
    dto: UpdateUserRoleDto,
    requestId: string,
  ) {
    const updated = await this.runSerializable(async (tx) => {
      await this.lockSuperAdminInvariant(tx);
      await this.lockUser(tx, userId);
      const current = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!current) throw this.userNotFound();
      if (current.role.code === dto.role) {
        return tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: safeUserSelect,
        });
      }

      const role = await tx.role.findUnique({ where: { code: dto.role } });
      if (!role) throw this.invalidRole();
      if (
        current.isActive &&
        current.role.code === ROLE_CODES.SUPER_ADMIN &&
        dto.role !== ROLE_CODES.SUPER_ADMIN
      ) {
        await this.assertAnotherActiveSuperAdmin(tx, userId);
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: { roleId: role.id },
        select: safeUserSelect,
      });
      await this.revokeSessions(tx, userId, 'ROLE_CHANGED');
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: 'USER_ROLE_CHANGED',
          targetType: 'USER',
          targetId: userId,
          requestId,
          safeMetadata: {
            previousRole: current.role.code,
            newRole: role.code,
          },
        },
      });
      return user;
    });
    return toUserResponse(updated);
  }

  async deactivate(actor: AuthPrincipal, userId: string, requestId: string) {
    const updated = await this.runSerializable(async (tx) => {
      await this.lockSuperAdminInvariant(tx);
      await this.lockUser(tx, userId);
      const current = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (!current) throw this.userNotFound();
      if (!current.isActive) {
        return tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: safeUserSelect,
        });
      }
      if (current.role.code === ROLE_CODES.SUPER_ADMIN) {
        await this.assertAnotherActiveSuperAdmin(tx, userId);
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: safeUserSelect,
      });
      await this.revokeSessions(tx, userId, 'USER_DEACTIVATED');
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: 'USER_DEACTIVATED',
          targetType: 'USER',
          targetId: userId,
          requestId,
          safeMetadata: { previousStatus: 'ACTIVE', newStatus: 'INACTIVE' },
        },
      });
      return user;
    });
    return toUserResponse(updated);
  }

  async resetPassword(
    actor: AuthPrincipal,
    userId: string,
    dto: SetUserPasswordDto,
    requestId: string,
  ) {
    const passwordHash = await this.passwords.hash(dto.password);
    const updated = await this.runSerializable(async (tx) => {
      await this.lockUser(tx, userId);
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current || !current.isActive) throw this.userNotFound();

      const now = new Date();
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          passwordChangedAt: now,
        },
        select: safeUserSelect,
      });
      await this.revokeSessions(tx, userId, 'PASSWORD_RESET', now);
      await tx.auditLog.create({
        data: {
          actorUserId: actor.userId,
          action: 'AUTH_PASSWORD_RESET',
          targetType: 'USER',
          targetId: userId,
          requestId,
        },
      });
      return user;
    });
    return {
      passwordReset: true,
      user: toUserResponse(updated),
    };
  }

  async activity(userId: string, query: ListUserActivityQueryDto) {
    await this.findUserOrThrow(userId);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'INVALID_DATE_RANGE',
        'Tanggal mulai tidak boleh melewati tanggal akhir.',
      );
    }

    const where: Prisma.AuditLogWhereInput = {
      OR: [{ actorUserId: userId }, { targetType: 'USER', targetId: userId }],
    };
    if (query.action) where.action = query.action;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        action: record.action,
        actor: record.actor,
        targetType: record.targetType,
        targetId: record.targetId,
        metadata: this.safeAuditMetadata(record.safeMetadata),
        createdAt: record.createdAt.toISOString(),
      })),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  private async findUserOrThrow(userId: string): Promise<SafeUserRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });
    if (!user) throw this.userNotFound();
    return user;
  }

  private async lockUser(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  }

  private async lockSuperAdminInvariant(tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT id FROM roles WHERE code = ${ROLE_CODES.SUPER_ADMIN} FOR UPDATE`;
  }

  private async assertAnotherActiveSuperAdmin(
    tx: Prisma.TransactionClient,
    excludedUserId: string,
  ) {
    const count = await tx.user.count({
      where: {
        isActive: true,
        id: { not: excludedUserId },
        role: { code: ROLE_CODES.SUPER_ADMIN },
      },
    });
    if (count < 1) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'LAST_SUPER_ADMIN_REQUIRED',
        'Minimal satu Super Admin aktif harus tetap tersedia.',
      );
    }
  }

  private async revokeSessions(
    tx: Prisma.TransactionClient,
    userId: string,
    reason: string,
    now = new Date(),
  ) {
    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now, revocationReason: reason },
    });
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (attempt < 3 && this.hasPrismaCode(error, 'P2034')) continue;
        throw error;
      }
    }
    throw new Error('Retry transaksi tidak menghasilkan keputusan.');
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === code
    );
  }

  private userSortField(sort: UserSortField) {
    return sort === 'email' ? 'emailNormalized' : sort;
  }

  private pagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private safeAuditMetadata(metadata: Prisma.JsonValue | null) {
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
      return null;
    }
    const source = metadata as Record<string, Prisma.JsonValue>;
    const allowed = [
      'changedFields',
      'previousRole',
      'newRole',
      'previousStatus',
      'newStatus',
    ];
    const safe = Object.fromEntries(
      allowed.filter((key) => key in source).map((key) => [key, source[key]]),
    );
    return Object.keys(safe).length ? safe : null;
  }

  private userNotFound() {
    return new ApiError(
      HttpStatus.NOT_FOUND,
      'USER_NOT_FOUND',
      'Pengguna tidak ditemukan.',
    );
  }

  private emailAlreadyUsed() {
    return new ApiError(
      HttpStatus.CONFLICT,
      'EMAIL_ALREADY_USED',
      'Email sudah digunakan oleh pengguna lain.',
    );
  }

  private invalidRole() {
    return new ApiError(
      HttpStatus.BAD_REQUEST,
      'ROLE_INVALID',
      'Role tidak valid.',
    );
  }
}
