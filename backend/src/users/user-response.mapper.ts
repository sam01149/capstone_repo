import { Prisma } from '../generated/prisma/client.js';
import type { RoleCode } from '../common/auth/auth.constants.js';

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  passwordChangedAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { code: true } },
} satisfies Prisma.UserSelect;

export type SafeUserRecord = Prisma.UserGetPayload<{
  select: typeof safeUserSelect;
}>;

export function toUserResponse(user: SafeUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.code as RoleCode,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    passwordChangedAt: user.passwordChangedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
