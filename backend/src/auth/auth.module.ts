import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { AuthCookieService } from './cookie.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          issuer: 'farmsight-backend',
          audience: 'farmsight-staff',
          algorithm: 'HS256' as const,
        },
        verifyOptions: {
          issuer: 'farmsight-backend',
          audience: 'farmsight-staff',
          algorithms: ['HS256'] as const,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    AuthService,
    AuthCookieService,
    PasswordService,
    SessionService,
    TokenService,
  ],
  exports: [AuthGuard, PasswordService],
})
export class AuthModule {}
