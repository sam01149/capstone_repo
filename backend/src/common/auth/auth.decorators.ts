import { SetMetadata } from '@nestjs/common';
import {
  ALLOW_PASSWORD_CHANGE_KEY,
  IS_PUBLIC_KEY,
  ROLES_KEY,
  type RoleCode,
} from './auth.constants.js';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);
