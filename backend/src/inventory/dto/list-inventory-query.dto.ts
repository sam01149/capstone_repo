import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { STOCK_STATUS, type StockStatus } from '../inventory.constants.js';

const SORT_FIELDS = ['updatedAt', 'name', 'sku', 'currentStock'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;
export type InventorySortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListInventoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(STOCK_STATUS)
  stockStatus?: StockStatus;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sort: InventorySortField = 'updatedAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: SortOrder = 'desc';
}
