import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches } from 'class-validator';
import { DECIMAL_QUANTITY_PATTERN } from '../../inventory/inventory.constants.js';

export class OrderItemDto {
  @IsUUID('4') productId!: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(DECIMAL_QUANTITY_PATTERN, {
    message:
      'quantity harus berupa decimal positif maksimal tiga angka pecahan.',
  })
  quantity!: string;
}
