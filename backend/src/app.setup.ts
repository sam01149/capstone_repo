import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, type Request, type Response, type NextFunction } from 'express';
import { ApiError } from './common/http/api-error.js';

export function configureApplication(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.use(cookieParser());
  app.use(json({ limit: '1100kb' }));
  app.use(
    (
      error: unknown,
      _request: Request,
      _response: Response,
      next: NextFunction,
    ) => {
      const type =
        error && typeof error === 'object' && 'type' in error
          ? error.type
          : undefined;
      if (type === 'entity.parse.failed')
        return next(
          new ApiError(400, 'INVALID_JSON', 'Format JSON tidak valid.'),
        );
      if (type === 'entity.too.large')
        return next(
          new ApiError(
            413,
            'PAYLOAD_TOO_LARGE',
            'Ukuran permintaan melebihi batas yang diizinkan.',
          ),
        );
      next(error);
    },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_ORIGIN'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'X-CSRF-Token',
      'X-Request-Id',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
  });
}
