import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
} from '../common/auth/auth.constants.js';

@Injectable()
export class AuthCookieService {
  private readonly secure: boolean;
  private readonly accessMaxAgeMs: number;
  private readonly sessionMaxAgeMs: number;

  constructor(config: ConfigService) {
    this.secure = config.getOrThrow<boolean>('COOKIE_SECURE');
    this.accessMaxAgeMs =
      config.getOrThrow<number>('ACCESS_TOKEN_TTL_SECONDS') * 1000;
    this.sessionMaxAgeMs =
      config.getOrThrow<number>('SESSION_ABSOLUTE_TTL_SECONDS') * 1000;
  }

  set(
    response: Response,
    values: { accessToken: string; refreshToken: string; csrfToken: string },
  ): void {
    const shared = {
      secure: this.secure,
      sameSite: 'lax' as const,
    };
    response.cookie(ACCESS_COOKIE, values.accessToken, {
      ...shared,
      httpOnly: true,
      maxAge: this.accessMaxAgeMs,
      path: '/',
    });
    response.cookie(REFRESH_COOKIE, values.refreshToken, {
      ...shared,
      httpOnly: true,
      maxAge: this.sessionMaxAgeMs,
      path: '/api/v1/auth',
    });
    response.cookie(CSRF_COOKIE, values.csrfToken, {
      ...shared,
      httpOnly: false,
      maxAge: this.sessionMaxAgeMs,
      path: '/',
    });
  }

  clear(response: Response): void {
    const shared = { secure: this.secure, sameSite: 'lax' as const };
    response.clearCookie(ACCESS_COOKIE, {
      ...shared,
      httpOnly: true,
      path: '/',
    });
    response.clearCookie(REFRESH_COOKIE, {
      ...shared,
      httpOnly: true,
      path: '/api/v1/auth',
    });
    response.clearCookie(CSRF_COOKIE, {
      ...shared,
      httpOnly: false,
      path: '/',
    });
  }
}
