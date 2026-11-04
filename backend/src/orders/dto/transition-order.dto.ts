import { IsIn } from 'class-validator';
import { ORDER_ACTIONS, type OrderAction } from '../order.constants.js';
export class TransitionOrderDto {
  @IsIn(ORDER_ACTIONS) action!: OrderAction;
}
