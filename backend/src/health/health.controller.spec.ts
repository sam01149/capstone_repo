import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;
  const prisma = {
    $queryRaw: vi.fn(),
  };

  beforeEach(async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('melaporkan aplikasi dan database sehat', async () => {
    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('meneruskan kegagalan database', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(controller.check()).rejects.toThrow('database unavailable');
  });
});
