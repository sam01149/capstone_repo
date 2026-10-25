import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ApiError } from '../common/http/api-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthPrincipal } from '../common/auth/authenticated-request.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import { PasswordService } from './password.service.js';
import { SessionService, type IssuedSession } from './session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async login(dto: LoginDto, requestId: string): Promise<IssuedSession> {
    const emailNormalized = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
      include: { role: true },
    });
    const passwordValid = user
      ? await this.passwords.verify(user.passwordHash, dto.password)
      : await this.passwords.verifyDummy(dto.password);
    if (!user || !passwordValid || !user.isActive) {
      await this.recordFailedLogin(emailNormalized, requestId);
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email atau password tidak valid.',
      );
    }

    let verifiedPasswordHash = user.passwordHash;
    if (this.passwords.needsRehash(verifiedPasswordHash)) {
      const upgradedHash = await this.passwords.hash(dto.password);
      const upgraded = await this.prisma.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash },
        data: { passwordHash: upgradedHash },
      });
      if (upgraded.count === 1) verifiedPasswordHash = upgradedHash;
    }
    return this.sessions.issueForLogin(
      user.id,
      verifiedPasswordHash,
      requestId,
    );
  }

  async changePassword(
    principal: AuthPrincipal,
    dto: ChangePasswordDto,
    requestId: string,
  ): Promise<void> {
    if (dto.currentPassword === dto.newPassword) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'PASSWORD_UNCHANGED',
        'Password baru harus berbeda dari password saat ini.',
      );
    }
    const newHash = await this.passwords.hash(dto.newPassword);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${principal.userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({
          where: { id: principal.userId },
        });
        if (
          !user ||
          !user.isActive ||
          !(await this.passwords.verify(user.passwordHash, dto.currentPassword))
        ) {
          throw new ApiError(
            HttpStatus.BAD_REQUEST,
            'CURRENT_PASSWORD_INVALID',
            'Password saat ini tidak valid.',
          );
        }
        const now = new Date();
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newHash,
            mustChangePassword: false,
            passwordChangedAt: now,
          },
        });
        await tx.session.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now, revocationReason: 'PASSWORD_CHANGED' },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'AUTH_PASSWORD_CHANGED',
            targetType: 'USER',
            targetId: user.id,
            requestId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async recordFailedLogin(email: string, requestId: string) {
    const identifierFingerprint = createHash('sha256')
      .update(email)
      .digest('hex');
    await this.prisma.auditLog.create({
      data: {
        action: 'AUTH_LOGIN_FAILED',
        targetType: 'USER',
        requestId,
        safeMetadata: { identifierFingerprint },
      },
    });
  }
}
