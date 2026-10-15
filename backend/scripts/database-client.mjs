import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib diisi.');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === 'true',
  application_name: 'farmsight-maintenance',
});

export const prisma = new PrismaClient({ adapter });
