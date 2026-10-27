import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/auth/auth.decorators.js';
import type { RequestWithId } from '../common/auth/authenticated-request.js';
import { CreatePublicDraftDto } from '../orders/dto/create-public-draft.dto.js';
import { OrdersService } from '../orders/orders.service.js';
import { ListPublicProductsQueryDto } from './dto/list-public-products-query.dto.js';
import { PublicCatalogService } from './public-catalog.service.js';
@Public()
@Controller('public')
export class PublicCatalogController {
  constructor(
    private readonly catalog: PublicCatalogService,
    private readonly orders: OrdersService,
  ) {}
  @Get('products') list(@Query() q: ListPublicProductsQueryDto) {
    return this.catalog.list(q);
  }
  @Get('products/:slug') find(@Param('slug') slug: string) {
    return this.catalog.find(slug);
  }
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @Post('order-drafts')
  create(
    @Body() dto: CreatePublicDraftDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: RequestWithId,
  ) {
    return this.orders.createPublic(dto, key, req.requestId);
  }
}
