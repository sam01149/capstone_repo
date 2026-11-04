import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsIn,
  Matches,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  DECIMAL_QUANTITY_PATTERN,
  STOCK_UNITS,
  type StockUnit,
} from '../../inventory/inventory.constants.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const nullableText = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === ''
    ? null
    : typeof value === 'string'
      ? value.trim()
      : value;

export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'SKU wajib diisi.' })
  @MaxLength(64, { message: 'SKU maksimal 64 karakter.' })
  sku!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Nama produk wajib diisi.' })
  @MaxLength(160, { message: 'Nama produk maksimal 160 karakter.' })
  name!: string;

  @IsOptional()
  @Transform(nullableText)
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(1000, { message: 'Deskripsi maksimal 1000 karakter.' })
  description?: string | null;

  @IsUUID('4', { message: 'categoryId harus berupa UUID yang valid.' })
  categoryId!: string;

  @Type(() => Number)
  @IsInt({ message: 'Harga harus berupa bilangan bulat rupiah.' })
  @Min(1, { message: 'Harga harus lebih dari nol.' })
  @Max(2_000_000_000, { message: 'Harga melebihi batas yang didukung.' })
  price!: number;

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
  @MaxLength(2048, { message: 'imageRef maksimal 2048 karakter.' })
  imageRef?: string | null;

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_QUANTITY_PATTERN)
  minimumStock = '0';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  leadTimeDays = 0;

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_QUANTITY_PATTERN)
  safetyStock = '0';

  @IsOptional()
  @IsString()
  @Matches(DECIMAL_QUANTITY_PATTERN)
  reorderPoint = '0';

  @IsOptional()
  @IsIn(STOCK_UNITS)
  stockUnit: StockUnit = 'UNIT';
}
