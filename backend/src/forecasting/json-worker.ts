import { spawn } from 'node:child_process';

export class ForecastWorkerError extends Error {
  constructor(
    readonly code:
      | 'START_FAILED'
      | 'TIMEOUT'
      | 'OUTPUT_LIMIT'
      | 'INPUT_LIMIT'
      | 'CANCELLED'
      | 'INVALID_OUTPUT'
      | 'WORKER_FAILED',
  ) {
    super('Proses analisis tidak dapat diselesaikan.');
  }
}

/** Run one isolated worker. Neither stderr nor process details are exposed to callers. */
export function runJsonWorker(options: {
  executable: string;
  args: string[];
  input: unknown;
  timeoutMs: number;
  maxOutputBytes: number;
  maxInputBytes: number;
  signal?: AbortSignal;
}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new ForecastWorkerError('CANCELLED'));
      return;
    }
    let input: string | undefined;
    try {
      input = JSON.stringify(options.input);
    } catch {
      reject(new ForecastWorkerError('WORKER_FAILED'));
      return;
    }
    if (
      input === undefined ||
      Buffer.byteLength(input, 'utf8') > options.maxInputBytes
    ) {
      reject(new ForecastWorkerError('INPUT_LIMIT'));
      return;
    }
    const env = Object.fromEntries(
      ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG'].flatMap(
        (name) =>
          process.env[name] === undefined ? [] : [[name, process.env[name]!]],
      ),
    );
    Object.assign(env, {
      PYTHONUTF8: '1',
      PYTHONNOUSERSITE: '1',
      PYTHONDONTWRITEBYTECODE: '1',
      OPENBLAS_NUM_THREADS: '1',
      OMP_NUM_THREADS: '1',
      MKL_NUM_THREADS: '1',
    });
    const child = spawn(options.executable, options.args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'ignore'],
      env,
    });
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const abort = () => finish(new ForecastWorkerError('CANCELLED'));
    const finish = (error?: ForecastWorkerError, value?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (error) {
        child.kill();
        reject(error);
      } else resolve(value);
    };
    const timer = setTimeout(
      () => finish(new ForecastWorkerError('TIMEOUT')),
      options.timeoutMs,
    );
    options.signal?.addEventListener('abort', abort, { once: true });
    child.on('error', () => finish(new ForecastWorkerError('START_FAILED')));
    child.stdin.on('error', () =>
      finish(new ForecastWorkerError('WORKER_FAILED')),
    );
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > options.maxOutputBytes)
        return finish(new ForecastWorkerError('OUTPUT_LIMIT'));
      chunks.push(chunk);
    });
    child.on('close', (code) => {
      if (code !== 0) return finish(new ForecastWorkerError('WORKER_FAILED'));
      try {
        finish(
          undefined,
          JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown,
        );
      } catch {
        finish(new ForecastWorkerError('INVALID_OUTPUT'));
      }
    });
    try {
      child.stdin.end(input);
    } catch {
      finish(new ForecastWorkerError('WORKER_FAILED'));
    }
  });
}
