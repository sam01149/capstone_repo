import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import type { RoleCode } from '../common/auth/auth.constants.js';
import { ApiError } from '../common/http/api-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { TokenService } from './token.service.js';

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  principal: AuthPrincipal;
}

@Injectable()
export class SessionService {
  private readonly idleTtlMs: number;
  private readonly absoluteTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    config: ConfigService,
  ) {
    this.idleTtlMs =
      config.getOrThrow<number>('SESSION_IDLE_TTL_SECONDS') * 1000;
    this.absoluteTtlMs =
      config.getOrThrow<number>('SESSION_ABSOLUTE_TTL_SECONDS') * 1000;
  }

  async issueForLogin(
    userId: string,
    verifiedPasswordHash: string,
    requestId: string,
  ): Promise<IssuedSession> {
    const now = new Date();
    const absoluteExpiresAt = new Date(now.getTime() + this.absoluteTtlMs);
    const idleExpiresAt = new Date(
      Math.min(now.getTime() + this.idleTtlMs, absoluteExpiresAt.getTime()),
    );
    const refreshToken = this.tokens.createOpaqueToken();
    const csrfToken = this.tokens.createOpaqueToken();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
      if (
        !user ||
        !user.isActive ||
        user.passwordHash !== verifiedPasswordHash
      ) {
        return null;
      }
      const created = await tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: this.tokens.hashOpaqueToken(refreshToken),
          csrfTokenHash: this.tokens.hashOpaqueToken(csrfToken),
          absoluteExpiresAt,
          idleExpiresAt,
          lastSeenAt: now,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'AUTH_LOGIN_SUCCEEDED',
          targetType: 'USER',
          targetId: user.id,
          requestId,
        },
      });
      return { session: created, user };
    });

    if (!result) throw this.invalidCredentials();
    return this.buildIssuedSession(
      result.session.id,
      result.user,
      refreshToken,
      csrfToken,
    );
  }

  async refresh(
    refreshToken: string | undefined,
    csrfCookie: string | undefined,
    csrfHeader: string | undefined,
  ): Promise<IssuedSession> {
    if (!refreshToken || !this.validCsrfPair(csrfCookie, csrfHeader)) {
      throw this.invalidSession();
    }

    const refreshTokenHash = this.tokens.hashOpaqueToken(refreshToken);
    const newRefreshToken = this.tokens.createOpaqueToken();
    const newCsrfToken = this.tokens.createOpaqueToken();
    const now = new Date();

    const result = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.session.findUnique({
          where: { refreshTokenHash },
          include: { user: { include: { role: true } } },
        });
        if (!current) return null;

        await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${current.id}::uuid FOR UPDATE`;
        const session = await tx.session.findUnique({
          where: { id: current.id },
          include: { user: { include: { role: true } } },
        });
        if (
          !session ||
          session.refreshTokenHash !== refreshTokenHash ||
          session.revokedAt ||
          session.absoluteExpiresAt <= now ||
          session.idleExpiresAt <= now ||
          !session.user.isActive ||
          !this.validStoredCsrf(session.csrfTokenHash, csrfHeader)
        ) {
          return null;
        }
        const idleExpiresAt = new Date(
          Math.min(
            now.getTime() + this.idleTtlMs,
            session.absoluteExpiresAt.getTime(),
          ),
        );
        await tx.session.update({
          where: { id: session.id },
          data: {
            refreshTokenHash: this.tokens.hashOpaqueToken(newRefreshToken),
            csrfTokenHash: this.tokens.hashOpaqueToken(newCsrfToken),
            idleExpiresAt,
            lastSeenAt: now,
          },
        });
        return session;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    if (!result) throw this.invalidSession();
    return this.buildIssuedSession(
      result.id,
      result.user,
      newRefreshToken,
      newCsrfToken,
    );
  }

  async revoke(
    sessionId: string,
    userId: string,
    requestId: string,
  ): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: now, revocationReason: 'LOGOUT' },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'AUTH_LOGOUT',
          targetType: 'SESSION',
          targetId: sessionId,
          requestId,
        },
      });
    });
  }

  async revokeByRefreshToken(
    refreshToken: string | undefined,
    requestId: string,
  ): Promise<void> {
    if (!refreshToken) return;
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: this.tokens.hashOpaqueToken(refreshToken) },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!session || session.revokedAt) return;
    await this.revoke(session.id, session.userId, requestId);
  }

  async touch(sessionId: string, absoluteExpiresAt: Date): Promise<void> {
    const now = new Date();
    const idleExpiresAt = new Date(
      Math.min(now.getTime() + this.idleTtlMs, absoluteExpiresAt.getTime()),
    );
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { lastSeenAt: now, idleExpiresAt },
    });
  }

  private async buildIssuedSession(
    sessionId: string,
    user: {
      id: string;
      name: string;
      email: string;
      mustChangePassword: boolean;
      passwordChangedAt: Date;
      role: { code: string };
    },
    refreshToken: string,
    csrfToken: string,
  ): Promise<IssuedSession> {
    const role = user.role.code as RoleCode;
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      sid: sessionId,
      role,
    });
    return {
      accessToken,
      refreshToken,
      csrfToken,
      principal: {
        userId: user.id,
        sessionId,
        name: user.name,
        email: user.email,
        role,
        mustChangePassword: user.mustChangePassword,
        passwordChangedAt: user.passwordChangedAt.toISOString(),
      },
    };
  }

  private validCsrfPair(
    cookie: string | undefined,
    header: string | undefined,
  ) {
    if (!cookie || !header) return false;
    const left = Buffer.from(cookie);
    const right = Buffer.from(header);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private validStoredCsrf(storedHash: string, token: string | undefined) {
    if (!token) return false;
    const actual = Buffer.from(this.tokens.hashOpaqueToken(token), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private invalidSession(): ApiError {
    return new ApiError(
      HttpStatus.UNAUTHORIZED,
      'SESSION_INVALID',
      'Sesi tidak valid atau sudah berakhir. Silakan login kembali.',
    );
  }

  private invalidCredentials(): ApiError {
    return new ApiError(
      HttpStatus.UNAUTHORIZED,
      'INVALID_CREDENTIALS',
      'Email atau password tidak valid.',
    );
  }
}
