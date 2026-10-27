import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ORDER_SOURCES,
  ORDER_STATUSES,
  type OrderSource,
  type OrderStatus,
} from '../order.constants.js';
export class ListOrdersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  search?: string;
  @IsOptional() @IsIn(ORDER_STATUSES) status?: OrderStatus;
  @IsOptional() @IsIn(ORDER_SOURCES) source?: OrderSource;
  @IsOptional() @IsDateString({ strict: true }) createdFrom?: string;
  @IsOptional() @IsDateString({ strict: true }) createdTo?: string;
}
