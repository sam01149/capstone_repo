import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateCategoryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(1, { message: 'Nama kategori wajib diisi.' })
  @MaxLength(100, { message: 'Nama kategori maksimal 100 karakter.' })
  name?: string;
}
