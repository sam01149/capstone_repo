import { Controller, Get, Query } from '@nestjs/common';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import { DashboardQueryDto } from './dashboard-query.dto.js';
import { DashboardsService } from './dashboards.service.js';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER)
  @Get('inventory')
  inventory(@Query() query: DashboardQueryDto) {
    return this.dashboards.inventory(query);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.SALES_ADMIN)
  @Get('sales')
  sales(@Query() query: DashboardQueryDto) {
    return this.dashboards.sales(query);
  }
}
