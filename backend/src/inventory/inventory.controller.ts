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
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto.js';
import { ListStockMovementsQueryDto } from './dto/list-stock-movements-query.dto.js';
import { InventoryService } from './inventory.service.js';

@Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER, ROLE_CODES.SALES_ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query() query: ListInventoryQueryDto) {
    return this.inventory.list(query);
  }

  @Get('movements')
  listMovements(@Query() query: ListStockMovementsQueryDto) {
    return this.inventory.listMovements(query);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER)
  @Post('movements')
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.inventory.createMovement(
      request.auth,
      dto,
      idempotencyKey,
      request.requestId,
    );
  }

  @Get(':productId')
  findOne(@Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.inventory.findOne(productId);
  }
}
