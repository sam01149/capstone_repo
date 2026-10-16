import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetUserPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter.' })
  @MaxLength(16, { message: 'Password maksimal 16 karakter.' })
  password!: string;
}
