import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ROLE_CODES } from '../common/auth/auth.constants.js';
import { Roles } from '../common/auth/auth.decorators.js';
import type { AuthenticatedRequest } from '../common/auth/authenticated-request.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { TransitionOrderDto } from './dto/transition-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { OrdersService } from './orders.service.js';
@Roles(ROLE_CODES.SALES_ADMIN, ROLE_CODES.SUPER_ADMIN)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list(@Query() q: ListOrdersQueryDto) {
    return this.orders.list(q);
  }
  @Get(':id') find(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.orders.findOne(id);
  }
  @Post() create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orders.createInternal(req.auth, dto, key, req.requestId);
  }
  @Patch(':id') update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orders.update(req.auth, id, dto, key, req.requestId);
  }
  @Post(':id/transition') transition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: TransitionOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orders.transition(req.auth, id, dto.action, key, req.requestId);
  }
}
