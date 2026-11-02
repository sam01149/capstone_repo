import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import { ForecastingService } from './forecasting.service.js';
import { ListRecommendationsDto } from './dto/list-recommendations.dto.js';

@Controller('recommendations')
@Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER)
export class RecommendationsController {
  constructor(private readonly forecasting: ForecastingService) {}

  @Get('restock')
  list(@Query() query: ListRecommendationsDto) {
    return this.forecasting.restockList(query.page, query.limit);
  }

  @Get(':productId')
  detail(@Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.forecasting.recommendation(productId);
  }
}
