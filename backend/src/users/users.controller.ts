import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUserActivityQueryDto } from './dto/list-user-activity-query.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { SetUserPasswordDto } from './dto/set-user-password.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Roles(ROLE_CODES.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) userId: string) {
    return this.users.findOne(userId);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @Req() request: AuthenticatedRequest) {
    return this.users.create(request.auth, dto, request.requestId);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.update(request.auth, userId, dto, request.requestId);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.updateRole(request.auth, userId, dto, request.requestId);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.deactivate(request.auth, userId, request.requestId);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Body() dto: SetUserPasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.users.resetPassword(
      request.auth,
      userId,
      dto,
      request.requestId,
    );
  }

  @Get(':id/activity')
  activity(
    @Param('id', new ParseUUIDPipe()) userId: string,
    @Query() query: ListUserActivityQueryDto,
  ) {
    return this.users.activity(userId, query);
  }
}
