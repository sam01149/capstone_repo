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

const PRODUCT_SORT_FIELDS = ['createdAt', 'name', 'sku', 'price'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListProductsQueryDto {
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
  @IsUUID('4', { message: 'categoryId harus berupa UUID yang valid.' })
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive harus bernilai true atau false.' })
  isActive?: boolean;

  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sort: ProductSortField = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: SortOrder = 'desc';
}
