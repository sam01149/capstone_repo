import { decimal, decimalString } from './decimal.utils.js';

describe('inventory decimal utilities', () => {
  it('menjaga tiga digit pecahan tanpa arithmetic floating point', () => {
    expect(decimalString(decimal('0.1').plus('0.2'))).toBe('0.300');
    expect(decimalString(decimal('1.250'))).toBe('1.250');
  });

  it('menghitung selisih adjustment secara exact', () => {
    const difference = decimal('8.125').minus('10.500');
    expect(decimalString(difference.abs())).toBe('2.375');
    expect(difference.isNegative()).toBe(true);
  });
});
