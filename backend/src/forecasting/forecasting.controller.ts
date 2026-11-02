import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { ImportHistoryDto } from './dto/import-history.dto.js';
import { CreateForecastDto } from './dto/create-forecast.dto.js';
import { ForecastHistoryService } from './forecast-history.service.js';
import { ForecastingService } from './forecasting.service.js';

@Controller('forecasts')
export class ForecastingController {
  constructor(
    private readonly history: ForecastHistoryService,
    private readonly forecasting: ForecastingService,
  ) {}

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Post('history/import')
  importHistory(
    @Body() dto: ImportHistoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.history.importHistory(request.auth, dto, request.requestId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER)
  @Post('runs')
  create(
    @Body() dto: CreateForecastDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.forecasting.create(request.auth, dto, key, request.requestId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER)
  @Get()
  list(@Query('productId', new ParseUUIDPipe()) productId: string) {
    return this.forecasting.list(productId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER)
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.forecasting.detail(id);
  }
}
