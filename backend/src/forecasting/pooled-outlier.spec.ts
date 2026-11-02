import { describe, expect, it } from 'vitest';
import { pooledOutlierMultiplier } from './pooled-outlier.js';

const series = (values: number[]) =>
  values.map((quantity, i) => ({
    week: `2026-${String(i + 1).padStart(2, '0')}`,
    quantity,
  }));
describe('pooled outlier multiplier', () => {
  it('uses the shared training cutoff and sufficiently populated products', () => {
    expect(
      pooledOutlierMultiplier([series(Array(10).fill(2))], '2026-08'),
    ).toBeCloseTo(1);
    expect(pooledOutlierMultiplier([series([1, 2, 3])], '2026-08')).toBeNull();
    expect(
      pooledOutlierMultiplier(
        [series([...Array(10).fill(2), Infinity])],
        '2026-08',
      ),
    ).toBe(1);
  });
  it('rejects invalid values inside training data', () => {
    expect(
      pooledOutlierMultiplier(
        [series([...Array(8).fill(2), -1, 2])],
        '2026-09',
      ),
    ).toBeNull();
  });
});
