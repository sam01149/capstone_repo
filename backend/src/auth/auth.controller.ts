import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AllowPasswordChange, Public } from '../common/auth/auth.decorators.js';
import { CSRF_COOKIE, REFRESH_COOKIE } from '../common/auth/auth.constants.js';
import type {
  AuthenticatedRequest,
  RequestWithId,
} from '../common/auth/authenticated-request.js';
import { AuthService } from './auth.service.js';
import { AuthCookieService } from './cookie.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SessionService } from './session.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const issued = await this.auth.login(dto, request.requestId);
    this.cookies.set(response, issued);
    return {
      user: this.publicUser(issued.principal),
      csrfToken: issued.csrfToken,
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request & RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    const issued = await this.sessions.refresh(
      cookies?.[REFRESH_COOKIE],
      cookies?.[CSRF_COOKIE],
      request.header('x-csrf-token'),
    );
    this.cookies.set(response, issued);
    return {
      user: this.publicUser(issued.principal),
      csrfToken: issued.csrfToken,
    };
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { user: this.publicUser(request.auth) };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request & RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    await this.sessions.revokeByRefreshToken(
      cookies?.[REFRESH_COOKIE],
      request.requestId,
    );
    this.cookies.clear(response);
    return { loggedOut: true };
  }

  @AllowPasswordChange()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.changePassword(request.auth, dto, request.requestId);
    this.cookies.clear(response);
    return { passwordChanged: true, loginRequired: true };
  }

  private publicUser(principal: AuthenticatedRequest['auth']) {
    return {
      id: principal.userId,
      name: principal.name,
      email: principal.email,
      role: principal.role,
      mustChangePassword: principal.mustChangePassword,
    };
  }
}
