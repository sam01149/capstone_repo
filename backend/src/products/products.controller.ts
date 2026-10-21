import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER, ROLE_CODES.SALES_ADMIN)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.products.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) productId: string) {
    return this.products.findOne(productId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto, @Req() request: AuthenticatedRequest) {
    return this.products.create(request.auth, dto, request.requestId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) productId: string,
    @Body() dto: UpdateProductDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.products.update(
      request.auth,
      productId,
      dto,
      request.requestId,
    );
  }

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', new ParseUUIDPipe()) productId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.products.deactivate(request.auth, productId, request.requestId);
  }
}
