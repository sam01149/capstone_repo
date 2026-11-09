import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ORDER_ACTIONS, type OrderAction } from '../order.constants.js';
export class TransitionOrderDto {
  @IsIn(ORDER_ACTIONS) action!: OrderAction;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) amount?: number;
  @IsOptional() @IsString() @MaxLength(1024000) proofImage?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
