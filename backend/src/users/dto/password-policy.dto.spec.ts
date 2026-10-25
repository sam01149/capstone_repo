import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto.js';
import { CreateUserDto } from './create-user.dto.js';
import { SetUserPasswordDto } from './set-user-password.dto.js';

describe('kebijakan password DTO pengguna', () => {
  it.each(['12345678', 'SixteenChars1234'])(
    'menerima password batas yang valid: %s',
    async (password) => {
      const create = plainToInstance(CreateUserDto, {
        name: 'Pengguna',
        email: 'USER@EXAMPLE.TEST',
        role: 'SALES_ADMIN',
        password,
      });
      const reset = plainToInstance(SetUserPasswordDto, { password });
      const change = plainToInstance(ChangePasswordDto, {
        currentPassword: 'PasswordLama123',
        newPassword: password,
      });

      await expect(validate(create)).resolves.toHaveLength(0);
      await expect(validate(reset)).resolves.toHaveLength(0);
      await expect(validate(change)).resolves.toHaveLength(0);
      expect(create.email).toBe('user@example.test');
    },
  );

  it.each(['1234567', 'SeventeenChars1234'])(
    'menolak password di luar batas: %s',
    async (password) => {
      const reset = plainToInstance(SetUserPasswordDto, { password });
      await expect(validate(reset)).resolves.not.toHaveLength(0);
    },
  );
});
