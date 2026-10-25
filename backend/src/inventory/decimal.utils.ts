import { Prisma } from '../generated/prisma/client.js';

export function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

export function decimalString(value: Prisma.Decimal) {
  return value.toFixed(3);
}
