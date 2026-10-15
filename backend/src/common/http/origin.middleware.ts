import { HttpStatus, Injectable, type NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './api-error.js';

@Injectable()
export class OriginMiddleware implements NestMiddleware {
  private readonly allowedOrigin: string;

  constructor(config: ConfigService) {
    this.allowedOrigin = config.getOrThrow<string>('FRONTEND_ORIGIN');
  }

  use(request: Request, _response: Response, next: NextFunction): void {
    const origin = request.header('origin');
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (unsafe && origin && origin !== this.allowedOrigin) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'ORIGIN_NOT_ALLOWED',
        'Asal permintaan tidak diizinkan.',
      );
    }
    next();
  }
}
