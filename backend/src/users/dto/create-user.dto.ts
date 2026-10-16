import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ROLE_CODES, type RoleCode } from '../../common/auth/auth.constants.js';

export class CreateUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'Nama wajib diisi.' })
  @MaxLength(120, { message: 'Nama maksimal 120 karakter.' })
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254, { message: 'Email maksimal 254 karakter.' })
  email!: string;

  @IsIn(Object.values(ROLE_CODES), { message: 'Role tidak valid.' })
  role!: RoleCode;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter.' })
  @MaxLength(16, { message: 'Password maksimal 16 karakter.' })
  password!: string;
}
