import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const nullableText = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === ''
    ? null
    : typeof value === 'string'
      ? value.trim()
      : value;

export class UpdateProductDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  sku?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Transform(nullableText)
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4', { message: 'categoryId harus berupa UUID yang valid.' })
  categoryId?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt({ message: 'Harga harus berupa bilangan bulat rupiah.' })
  @Min(1)
  @Max(2_000_000_000)
  price?: number;

  @IsOptional()
  @Transform(nullableText)
  @ValidateIf((_object, value) => value !== null)
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
      require_valid_protocol: true,
    },
    { message: 'imageRef harus berupa URL HTTPS yang valid.' },
  )
  @MaxLength(2048)
  imageRef?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minimumStock?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  leadTimeDays?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  safetyStock?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  reorderPoint?: number;
}
