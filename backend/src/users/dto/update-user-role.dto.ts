import { IsIn } from 'class-validator';
import { ROLE_CODES, type RoleCode } from '../../common/auth/auth.constants.js';

export class UpdateUserRoleDto {
  @IsIn(Object.values(ROLE_CODES), { message: 'Role tidak valid.' })
  role!: RoleCode;
}
