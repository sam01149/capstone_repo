import 'dotenv/config';
import argon2 from 'argon2';
import { prisma } from './database-client.mjs';

const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim();
const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
const pepper = process.env.PASSWORD_PEPPER;

if (!name || !email || !password || !pepper) {
  throw new Error(
    'Isi BOOTSTRAP_SUPER_ADMIN_NAME, BOOTSTRAP_SUPER_ADMIN_EMAIL, ' +
      'BOOTSTRAP_SUPER_ADMIN_PASSWORD, dan PASSWORD_PEPPER hanya pada proses ini.',
  );
}
if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
  throw new Error('Email bootstrap tidak valid.');
}
if (password.length < 8 || password.length > 128) {
  throw new Error('Password bootstrap harus 8 sampai 128 karakter.');
}
if (pepper.length < 32) {
  throw new Error('PASSWORD_PEPPER minimal 32 karakter.');
}

try {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: { code: 'SUPER_ADMIN' } },
    select: { id: true },
  });
  if (existingAdmin) {
    throw new Error(
      'Super Admin sudah ada. Gunakan alur pengelolaan pengguna, bukan bootstrap.',
    );
  }

  const role = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    create: { code: 'SUPER_ADMIN', name: 'Super Admin' },
    update: { name: 'Super Admin' },
  });
  const passwordHash = await argon2.hash(`${password}\u0000${pepper}`, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await prisma.user.create({
    data: {
      name,
      email,
      emailNormalized: email,
      passwordHash,
      roleId: role.id,
      mustChangePassword: false,
    },
  });
  console.log('Super Admin pertama berhasil dibuat. Password tidak ditampilkan.');
} finally {
  await prisma.$disconnect();
}
