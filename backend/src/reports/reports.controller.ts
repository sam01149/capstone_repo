import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { DashboardQueryDto } from '../dashboards/dashboard-query.dto.js';
import { ReportsService } from './reports.service.js';

@Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER, ROLE_CODES.SALES_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get(':type')
  report(
    @Param('type') type: string,
    @Query() query: DashboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reports.generate(type, query, req.auth.role);
  }

  @Get(':type/export/:format')
  async export(
    @Param('type') type: string,
    @Param('format') format: string,
    @Query() query: DashboardQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const file = await this.reports.export(type, format, query, req.auth.role);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="laporan-${type}.${format}"`,
    );
    res.send(file.buffer);
  }
}
