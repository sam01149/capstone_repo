import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { NotificationsService } from './notifications.service.js';
class NotificationQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
@Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER, ROLE_CODES.SALES_ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(
    @Req() req: AuthenticatedRequest,
    @Query() query: NotificationQuery,
  ) {
    return this.notifications.list(req.auth, query.page, query.limit);
  }
  @Post(':id/read') read(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.read(req.auth, id);
  }
}
