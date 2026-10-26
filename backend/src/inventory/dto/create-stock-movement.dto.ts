import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  DECIMAL_QUANTITY_PATTERN,
  MOVEMENT_ACTIONS,
  type MovementAction,
} from '../inventory.constants.js';

const REASON_CODES = [
  'OPENING_BALANCE',
  'PURCHASE',
  'RESTOCK',
  'MANUAL_REDUCTION',
  'PHYSICAL_COUNT',
  'DAMAGED',
  'EXPIRED',
  'CUSTOMER_RETURN',
  'OTHER',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateStockMovementDto {
  @IsUUID('4', { message: 'productId harus berupa UUID yang valid.' })
  productId!: string;

  @IsIn(MOVEMENT_ACTIONS)
  action!: MovementAction;

  @ValidateIf(
    (object: CreateStockMovementDto) => object.action !== 'ADJUST_TO_PHYSICAL',
  )
  @IsString()
  @Matches(DECIMAL_QUANTITY_PATTERN)
  quantity?: string;

  @ValidateIf(
    (object: CreateStockMovementDto) => object.action === 'ADJUST_TO_PHYSICAL',
  )
  @IsString()
  @Matches(DECIMAL_QUANTITY_PATTERN)
  physicalCount?: string;

  @IsIn(REASON_CODES)
  reasonCode!: (typeof REASON_CODES)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  referenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}
