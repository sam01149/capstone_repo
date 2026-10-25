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
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STOCK_MANAGER, ROLE_CODES.SALES_ADMIN)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() query: ListCategoriesQueryDto) {
    return this.categories.list(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) categoryId: string) {
    return this.categories.findOne(categoryId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() request: AuthenticatedRequest) {
    return this.categories.create(request.auth, dto, request.requestId);
  }

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categories.update(
      request.auth,
      categoryId,
      dto,
      request.requestId,
    );
  }

  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('id', new ParseUUIDPipe()) categoryId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.categories.deactivate(
      request.auth,
      categoryId,
      request.requestId,
    );
  }
}
