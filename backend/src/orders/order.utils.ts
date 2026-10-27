import { randomBytes } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { decimalString } from '../inventory/decimal.utils.js';

interface WhatsAppOrderSummary {
  publicCode: string;
  totalAmount: number;
  items: Array<{
    snapshotName: string;
    snapshotUnit: string;
    unitPrice: number;
    quantity: Prisma.Decimal;
    subtotalAmount: number;
  }>;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function createPublicCode(bytes = randomBytes(5)): string {
  if (bytes.length !== 5)
    throw new Error('Kode order memerlukan tepat 5 byte.');
  return `FS-${bytes.toString('hex').toUpperCase()}`;
}

export function buildWhatsAppMessage(order: WhatsAppOrderSummary): string {
  const lines = [
    'Halo Toko Farm Berkah, saya ingin memesan.',
    `Kode pesanan: ${order.publicCode}`,
    ...order.items.map(
      (item) =>
        `- ${item.snapshotName}: ${decimalString(item.quantity)} ${item.snapshotUnit} x Rp${item.unitPrice.toLocaleString('id-ID')} = Rp${item.subtotalAmount.toLocaleString('id-ID')}`,
    ),
    `Total: Rp${order.totalAmount.toLocaleString('id-ID')}`,
    'Mohon informasi pembayaran.',
  ];
  return lines.join('\n');
}
