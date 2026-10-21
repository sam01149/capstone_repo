import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CATEGORY_SORT_FIELDS = ['createdAt', 'name'] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;
export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export class ListCategoriesQueryDto {
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
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isActive harus bernilai true atau false.' })
  isActive?: boolean;

  @IsOptional()
  @IsIn(CATEGORY_SORT_FIELDS)
  sort: CategorySortField = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order: SortOrder = 'desc';
}
