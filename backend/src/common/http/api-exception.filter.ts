import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestWithId } from '../auth/authenticated-request.js';

interface ApiErrorBody {
  code?: string;
  message?: string | string[];
  details?: unknown[];
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp ? exception.getResponse() : undefined;
    const body: ApiErrorBody = typeof raw === 'object' ? raw : {};
    const validationMessages = Array.isArray(body.message) ? body.message : [];

    response.status(status).json({
      error: {
        code:
          body.code ??
          (status === HttpStatus.BAD_REQUEST
            ? 'VALIDATION_ERROR'
            : status === HttpStatus.TOO_MANY_REQUESTS
              ? 'RATE_LIMITED'
              : status === HttpStatus.INTERNAL_SERVER_ERROR
                ? 'INTERNAL_ERROR'
                : 'REQUEST_FAILED'),
        message:
          typeof body.message === 'string'
            ? body.message
            : status === HttpStatus.BAD_REQUEST
              ? 'Data yang dikirim tidak valid.'
              : status === HttpStatus.TOO_MANY_REQUESTS
                ? 'Terlalu banyak percobaan. Silakan coba lagi nanti.'
                : status === HttpStatus.INTERNAL_SERVER_ERROR
                  ? 'Terjadi kesalahan pada server.'
                  : 'Permintaan tidak dapat diproses.',
        details: body.details ?? validationMessages,
      },
      meta: { requestId: request.requestId },
    });
  }
}
