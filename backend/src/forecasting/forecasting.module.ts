import { Module } from '@nestjs/common';
import { ForecastHistoryService } from './forecast-history.service.js';
import { ForecastingController } from './forecasting.controller.js';
import { ForecastingService } from './forecasting.service.js';
import { RecommendationsController } from './recommendations.controller.js';

@Module({
  controllers: [ForecastingController, RecommendationsController],
  providers: [ForecastHistoryService, ForecastingService],
})
export class ForecastingModule {}
