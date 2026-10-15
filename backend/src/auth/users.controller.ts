import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/auth/auth.decorators.js';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { AuthService } from './auth.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param('id', new ParseUUIDPipe()) targetUserId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.resetPassword(
      request.auth,
      targetUserId,
      request.requestId,
    );
  }
}
