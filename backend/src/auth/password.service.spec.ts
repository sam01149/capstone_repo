import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService(
    new ConfigService({ PASSWORD_PEPPER: 'p'.repeat(32) }),
  );

  beforeAll(async () => service.onModuleInit());

  it('meng-hash dan memverifikasi password tanpa menyimpan plaintext', async () => {
    const hash = await service.hash('PasswordAman123');
    expect(hash).not.toContain('PasswordAman123');
    await expect(service.verify(hash, 'PasswordAman123')).resolves.toBe(true);
    await expect(service.verify(hash, 'salah')).resolves.toBe(false);
  });
});
