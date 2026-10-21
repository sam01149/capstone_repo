import { describe, expect, it } from 'vitest';
import { createSlug, normalizeKey } from './catalog.utils.js';

describe('catalog utilities', () => {
  it('membuat slug deterministik dan menghapus diakritik', () => {
    expect(createSlug('  Pupuk NPK Mutiára 16-16-16  ')).toBe(
      'pupuk-npk-mutiara-16-16-16',
    );
  });

  it('menolak nama yang tidak dapat membentuk slug', () => {
    expect(() => createSlug('---')).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('menormalkan kapital dan spasi untuk kunci unik', () => {
    expect(normalizeKey('  Pupuk   Daun ')).toBe('pupuk daun');
  });
});
