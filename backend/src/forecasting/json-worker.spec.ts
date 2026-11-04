import { describe, expect, it } from 'vitest';
import { runJsonWorker } from './json-worker.js';
import {
  runForecastPipeline,
  validatePipelineResult,
  type PipelineInput,
} from './pipeline-adapter.js';

const run = (
  script: string,
  overrides: Partial<Parameters<typeof runJsonWorker>[0]> = {},
) =>
  runJsonWorker({
    executable: process.execPath,
    args: ['-e', script],
    input: { product: 'example' },
    timeoutMs: 3000,
    maxOutputBytes: 1024,
    maxInputBytes: 1024,
    ...overrides,
  });

describe('isolated forecast worker transport', () => {
  it('exchanges JSON through standard streams', async () => {
    await expect(
      run(
        "let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>process.stdout.write(s))",
      ),
    ).resolves.toEqual({ product: 'example' });
  });
  it('does not pass application secrets to the child environment', async () => {
    process.env.FORECAST_TEST_SECRET = 'private';
    try {
      await expect(
        run(
          'process.stdout.write(JSON.stringify({present:!!process.env.FORECAST_TEST_SECRET}))',
        ),
      ).resolves.toEqual({ present: false });
    } finally {
      delete process.env.FORECAST_TEST_SECRET;
    }
  });
  it('rejects excessive input and invalid or oversized output', async () => {
    await expect(
      run('process.exit(0)', { maxInputBytes: 1 }),
    ).rejects.toMatchObject({ code: 'INPUT_LIMIT' });
    await expect(
      run("process.stdout.write('12345')", { maxOutputBytes: 4 }),
    ).rejects.toMatchObject({ code: 'OUTPUT_LIMIT' });
    await expect(run("process.stdout.write('not json')")).rejects.toMatchObject(
      { code: 'INVALID_OUTPUT' },
    );
  });
  it('times out stuck processes and hides error details', async () => {
    await expect(
      run('setInterval(()=>{},1000)', { timeoutMs: 100 }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(
      run("console.error('private');process.exit(1)"),
    ).rejects.toMatchObject({
      code: 'WORKER_FAILED',
      message: 'Proses analisis tidak dapat diselesaikan.',
    });
  });
  it('terminates a worker when its parent run is cancelled', async () => {
    const controller = new AbortController();
    const pending = run('setInterval(()=>{},1000)', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
  });
  it.skipIf(!process.env.FARMSIGHT_TEST_PYTHON)(
    'runs the notebook pipeline through the real Python boundary',
    async () => {
      const weeks = Array.from({ length: 15 }, (_, i) => ({
        week: new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10),
        quantity: i % 2 === 0 ? 2 : 0,
        event: [0, 0] as [number, number],
      }));
      const input: PipelineInput = {
        weeks,
        leadTimeDays: 7,
        pooledOutlierMultiplier: 4,
        trainEndWeek: weeks[11].week,
        knownMissingWeeks: [],
        futureEvents: [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      };
      const result = await runForecastPipeline(
        process.env.FARMSIGHT_TEST_PYTHON!,
        'forecast-worker/worker.py',
        input,
      );
      expect(result.status).toBe('SUCCESS');
      const serial = await runJsonWorker({
        executable: process.env.FARMSIGHT_TEST_PYTHON!,
        args: ['forecast-worker/worker.py'],
        input: { version: 1, method: 'pipeline', ...input },
        timeoutMs: 120000,
        maxInputBytes: 131072,
        maxOutputBytes: 131072,
      });
      expect({ ...result, invalidTuningCandidates: null }).toEqual(
        validatePipelineResult(serial, input),
      );
      const insufficient = await runForecastPipeline(
        process.env.FARMSIGHT_TEST_PYTHON!,
        'forecast-worker/worker.py',
        {
          weeks: weeks.slice(0, 4),
          leadTimeDays: 7,
          pooledOutlierMultiplier: null,
          trainEndWeek: weeks[2].week,
          knownMissingWeeks: [],
          futureEvents: [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0],
          ],
        },
      );
      expect(insufficient).toEqual({ status: 'INSUFFICIENT_DATA' });
    },
    90000,
  );
});
