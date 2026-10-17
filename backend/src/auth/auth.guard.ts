import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  IS_PUBLIC_KEY,
  ROLE_CODES,
  ROLES_KEY,
  type RoleCode,
} from '../common/auth/auth.constants.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { ApiError } from '../common/http/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.readCookie(request.cookies, ACCESS_COOKIE);
    if (!accessToken) throw this.unauthorized();

    let payload;
    try {
      payload = await this.tokens.verifyAccessToken(accessToken);
    } catch {
      throw this.unauthorized();
    }
    if (payload.type !== 'access') throw this.unauthorized();

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: { include: { role: true } } },
    });
    const now = new Date();
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.absoluteExpiresAt <= now ||
      session.idleExpiresAt <= now ||
      !session.user.isActive ||
      session.user.role.code !== payload.role
    ) {
      throw this.unauthorized();
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const csrfCookie = this.readCookie(request.cookies, CSRF_COOKIE);
      const csrfHeader = request.header('x-csrf-token');
      if (
        !csrfCookie ||
        !csrfHeader ||
        !this.equal(csrfCookie, csrfHeader) ||
        !this.equal(
          this.tokens.hashOpaqueToken(csrfHeader),
          session.csrfTokenHash,
        )
      ) {
        throw new ApiError(
          HttpStatus.FORBIDDEN,
          'CSRF_INVALID',
          'Token CSRF tidak valid.',
        );
      }
    }

    const role = session.user.role.code as RoleCode;
    if (!Object.values(ROLE_CODES).includes(role)) throw this.unauthorized();
    request.auth = {
      userId: session.user.id,
      sessionId: session.id,
      name: session.user.name,
      email: session.user.email,
      role,
      mustChangePassword: session.user.mustChangePassword,
      passwordChangedAt: session.user.passwordChangedAt.toISOString(),
    };

    const roles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(role)) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Anda tidak memiliki izin untuk tindakan ini.',
      );
    }

    await this.sessions.touch(session.id, session.absoluteExpiresAt);
    return true;
  }

  private readCookie(cookies: unknown, name: string): string | undefined {
    if (!cookies || typeof cookies !== 'object') return undefined;
    const value = (cookies as Record<string, unknown>)[name];
    return typeof value === 'string' ? value : undefined;
  }

  private equal(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private unauthorized(): ApiError {
    return new ApiError(
      HttpStatus.UNAUTHORIZED,
      'SESSION_INVALID',
      'Sesi tidak valid atau sudah berakhir. Silakan login kembali.',
    );
  }
}
