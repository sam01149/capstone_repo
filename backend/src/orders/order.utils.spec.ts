import { decimal } from '../inventory/decimal.utils.js';
import {
  buildWhatsAppMessage,
  createPublicCode,
  stableJson,
} from './order.utils.js';

describe('order utilities', () => {
  it('membuat fingerprint stabil untuk object nested dengan urutan key berbeda', () => {
    expect(stableJson({ b: [{ y: 2, x: 1 }], a: 'nilai' })).toBe(
      stableJson({ a: 'nilai', b: [{ x: 1, y: 2 }] }),
    );
  });

  it('membuat public code acak tanpa PII atau timestamp', () => {
    expect(createPublicCode(Buffer.from('0102030405', 'hex'))).toBe(
      'FS-0102030405',
    );
    expect(() => createPublicCode(Buffer.alloc(4))).toThrow();
  });

  it('membentuk ringkasan WhatsApp dari snapshot server', () => {
    const message = buildWhatsAppMessage({
      publicCode: 'FS-0102030405',
      totalAmount: 37_500,
      items: [
        {
          snapshotName: 'Pupuk NPK',
          snapshotUnit: 'KG',
          unitPrice: 25_000,
          quantity: decimal('1.5'),
          subtotalAmount: 37_500,
        },
      ],
    });
    expect(message).toContain('Kode pesanan: FS-0102030405');
    expect(message).toContain('Pupuk NPK: 1.500 KG');
    expect(message).toContain('Total: Rp37.500');
    expect(message).not.toContain('undefined');
  });
});
