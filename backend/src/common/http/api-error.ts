import { HttpException, type HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details: unknown[] = [],
  ) {
    super({ code, message, details }, status);
  }
}
