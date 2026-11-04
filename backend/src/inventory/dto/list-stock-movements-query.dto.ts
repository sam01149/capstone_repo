import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  MOVEMENT_ACTIONS,
  MOVEMENT_TYPES,
  type MovementAction,
  type MovementType,
} from '../inventory.constants.js';

export class ListStockMovementsQueryDto {
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
  @IsUUID('4')
  productId?: string;

  @IsOptional()
  @IsIn(MOVEMENT_TYPES)
  type?: MovementType;

  @IsOptional()
  @IsIn(MOVEMENT_ACTIONS)
  action?: MovementAction;

  @IsOptional()
  @IsUUID('4')
  actorUserId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  occurredFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  occurredTo?: string;
}
