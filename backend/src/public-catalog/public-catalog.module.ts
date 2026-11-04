import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { PublicCatalogController } from './public-catalog.controller.js';
import { PublicCatalogService } from './public-catalog.service.js';
@Module({
  imports: [OrdersModule],
  controllers: [PublicCatalogController],
  providers: [PublicCatalogService],
})
export class PublicCatalogModule {}
