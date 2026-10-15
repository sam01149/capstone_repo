import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes } from 'node:crypto';
import type { RoleCode } from '../common/auth/auth.constants.js';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: RoleCode;
  type: 'access';
}

@Injectable()
export class TokenService {
  private readonly tokenPepper: string;
  private readonly accessTtlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.tokenPepper = config.getOrThrow<string>('SESSION_TOKEN_PEPPER');
    this.accessTtlSeconds = config.getOrThrow<number>(
      'ACCESS_TOKEN_TTL_SECONDS',
    );
  }

  createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashOpaqueToken(token: string): string {
    return createHmac('sha256', this.tokenPepper).update(token).digest('hex');
  }

  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): Promise<string> {
    return this.jwt.signAsync(
      { ...payload, type: 'access' as const },
      { expiresIn: this.accessTtlSeconds },
    );
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }
}
