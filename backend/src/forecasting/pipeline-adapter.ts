import { ForecastWorkerError, runJsonWorker } from './json-worker.js';

type Week = { week: string; quantity: number; event: [number, number] };
export type PipelineInput = {
  weeks: Week[];
  leadTimeDays: number;
  futureEvents: [number, number][];
  pooledOutlierMultiplier: number | null;
  trainEndWeek: string;
  knownMissingWeeks: string[];
};
type Point = { week: string; prediction: number };
export type PipelineResult =
  | { status: 'INSUFFICIENT_DATA' }
  | {
      status: 'SUCCESS';
      method: 'arima' | 'croston_sba';
      parameter: number | [number, number, number];
      trainRmse: number;
      evaluation: {
        mae: number;
        rmse: number;
        mase: number | null;
        mape: number;
        mapeMeaningful: boolean;
        periodCount: number;
        positivePeriods: number;
        baselineMae: number;
        baselineRmse: number;
      };
      actualVsForecast: (Point & { actual: number })[];
      forecast: Point[];
      safetyStock: number;
      reorderPoint: number;
      leadTimeDays: number;
      serviceLevel: number;
      convergenceWarning: boolean;
      invalidTuningCandidates: number | null;
      fallbackDuringTuning: boolean;
      fallbackDuringEvaluation: boolean;
      fallbackDuringForecast: boolean;
    };

const numeric = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0;
const object = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

export function validatePipelineResult(
  output: unknown,
  input: PipelineInput,
): PipelineResult {
  const invalid = () => {
    throw new ForecastWorkerError('INVALID_OUTPUT');
  };
  if (!object(output) || output.version !== 1) return invalid();
  if (output.status === 'INSUFFICIENT_DATA')
    return { status: 'INSUFFICIENT_DATA' };
  const evalData = output.evaluation;
  if (
    output.status !== 'SUCCESS' ||
    (output.method !== 'arima' && output.method !== 'croston_sba') ||
    !numeric(output.trainRmse) ||
    !numeric(output.safetyStock) ||
    !numeric(output.reorderPoint) ||
    output.leadTimeDays !== input.leadTimeDays ||
    output.serviceLevel !== 0.95 ||
    typeof output.convergenceWarning !== 'boolean' ||
    !(
      output.invalidTuningCandidates === null ||
      (typeof output.invalidTuningCandidates === 'number' &&
        Number.isInteger(output.invalidTuningCandidates) &&
        output.invalidTuningCandidates >= 0 &&
        output.invalidTuningCandidates <= 5)
    ) ||
    typeof output.fallbackDuringTuning !== 'boolean' ||
    typeof output.fallbackDuringEvaluation !== 'boolean' ||
    typeof output.fallbackDuringForecast !== 'boolean' ||
    !object(evalData) ||
    !numeric(evalData.mae) ||
    !numeric(evalData.rmse) ||
    !numeric(evalData.baselineMae) ||
    !numeric(evalData.baselineRmse) ||
    !numeric(evalData.mape) ||
    typeof evalData.mapeMeaningful !== 'boolean' ||
    !Number.isInteger(evalData.periodCount) ||
    !Number.isInteger(evalData.positivePeriods) ||
    !(evalData.mase === null || numeric(evalData.mase))
  )
    return invalid();
  let parameter: number | [number, number, number];
  if (
    output.method === 'croston_sba' &&
    numeric(output.parameter) &&
    output.parameter > 0 &&
    output.parameter <= 1
  ) {
    parameter = output.parameter;
  } else if (
    output.method === 'arima' &&
    Array.isArray(output.parameter) &&
    output.parameter.length === 3 &&
    output.parameter.every(
      (x: unknown) => Number.isInteger(x) && numeric(x) && x <= 2,
    )
  ) {
    parameter = output.parameter as [number, number, number];
  } else return invalid();
  const trainCount = input.weeks.filter(
    (w) => w.week <= input.trainEndWeek,
  ).length;
  const positivePeriods = input.weeks
    .slice(trainCount)
    .filter((w) => w.quantity > 0).length;
  if (
    evalData.periodCount !== input.weeks.length - trainCount ||
    evalData.positivePeriods !== positivePeriods ||
    evalData.mapeMeaningful !== positivePeriods >= 2
  )
    return invalid();
  if (
    !Array.isArray(output.actualVsForecast) ||
    output.actualVsForecast.length !== input.weeks.length - trainCount ||
    !Array.isArray(output.forecast) ||
    output.forecast.length !== 4 ||
    input.weeks.length === 0
  )
    return invalid();
  const actualVsForecast = output.actualVsForecast.map(
    (row: unknown, index: number) => {
      const expected = input.weeks[trainCount + index];
      if (
        !object(row) ||
        row.week !== expected.week ||
        row.actual !== expected.quantity ||
        !numeric(row.prediction)
      )
        return invalid();
      return {
        week: expected.week,
        actual: expected.quantity,
        prediction: row.prediction,
      };
    },
  );
  const lastWeek = Date.parse(
    `${input.weeks[input.weeks.length - 1].week}T00:00:00Z`,
  );
  if (!Number.isFinite(lastWeek)) return invalid();
  const forecast = output.forecast.map((row: unknown, index: number) => {
    const week = new Date(lastWeek + (index + 1) * 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    if (!object(row) || row.week !== week || !numeric(row.prediction))
      return invalid();
    return { week, prediction: row.prediction };
  });
  return {
    status: 'SUCCESS',
    method: output.method,
    parameter,
    trainRmse: output.trainRmse,
    evaluation: {
      mae: evalData.mae,
      rmse: evalData.rmse,
      mase: evalData.mase,
      baselineMae: evalData.baselineMae,
      baselineRmse: evalData.baselineRmse,
      mape: evalData.mape,
      mapeMeaningful: evalData.mapeMeaningful,
      periodCount: evalData.periodCount as number,
      positivePeriods: evalData.positivePeriods as number,
    },
    actualVsForecast,
    forecast,
    safetyStock: output.safetyStock,
    reorderPoint: output.reorderPoint,
    leadTimeDays: input.leadTimeDays,
    serviceLevel: 0.95,
    convergenceWarning: output.convergenceWarning,
    invalidTuningCandidates: output.invalidTuningCandidates as number | null,
    fallbackDuringTuning: output.fallbackDuringTuning,
    fallbackDuringEvaluation: output.fallbackDuringEvaluation,
    fallbackDuringForecast: output.fallbackDuringForecast,
  };
}

export async function runForecastPipeline(
  executable: string,
  script: string,
  input: PipelineInput,
): Promise<PipelineResult> {
  const orders = [
    [0, 1, 1],
    [1, 1, 0],
    [1, 1, 1],
    [2, 1, 1],
    [1, 1, 2],
  ];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  const invoke = (payload: unknown) =>
    runJsonWorker({
      executable,
      args: [script],
      input: payload,
      timeoutMs: 120000,
      maxInputBytes: 131072,
      maxOutputBytes: 131072,
      signal: controller.signal,
    });
  try {
    let tuning: unknown[];
    try {
      tuning = await Promise.all(
        orders.map((tuneOrder) =>
          invoke({
            version: 1,
            method: 'tune',
            ...input,
            tuneOrder,
          }),
        ),
      );
    } catch (error) {
      controller.abort();
      throw error;
    }
    if (
      tuning.every(
        (row) =>
          object(row) &&
          row.version === 1 &&
          row.status === 'INSUFFICIENT_DATA',
      )
    )
      return { status: 'INSUFFICIENT_DATA' };
    for (let i = 0; i < orders.length; i++) {
      const row = tuning[i];
      if (
        !object(row) ||
        row.version !== 1 ||
        row.status !== 'TUNED' ||
        !Array.isArray(row.order) ||
        row.order.length !== 3 ||
        row.order.some((value, index) => value !== orders[i][index]) ||
        !(
          ['OK', 'NAN', 'INFINITE'].includes(String(row.arimaScoreStatus)) &&
          (row.arimaScoreStatus === 'OK'
            ? numeric(row.arimaScore)
            : row.arimaScore === null)
        ) ||
        !numeric(row.crostonScore) ||
        typeof row.convergenceWarning !== 'boolean' ||
        typeof row.fallbackUsed !== 'boolean' ||
        typeof row.crostonAlpha !== 'number' ||
        ![0.1, 0.15, 0.2, 0.3].includes(row.crostonAlpha)
      )
        throw new ForecastWorkerError('INVALID_OUTPUT');
    }
    const output = await invoke({
      version: 1,
      method: 'finalize',
      ...input,
      tuningResults: tuning,
    });
    return validatePipelineResult(output, input);
  } finally {
    clearTimeout(timer);
  }
}
