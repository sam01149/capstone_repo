import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http/api-error.js';

export function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function createSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      'INVALID_SLUG_SOURCE',
      'Nama harus memiliki karakter yang dapat digunakan sebagai slug.',
    );
  }
  return slug;
}

export function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
