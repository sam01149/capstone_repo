import { describe, expect, it } from 'vitest';
import {
  validatePipelineResult,
  type PipelineInput,
} from './pipeline-adapter.js';

const input: PipelineInput = {
  weeks: Array.from({ length: 10 }, (_, i) => ({
    week: new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10),
    quantity: i,
    event: [0, 0],
  })),
  leadTimeDays: 7,
  pooledOutlierMultiplier: 4,
  trainEndWeek: '2026-02-23',
  knownMissingWeeks: [],
  futureEvents: [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
};
const output = {
  version: 1,
  status: 'SUCCESS',
  method: 'croston_sba',
  parameter: 0.2,
  trainRmse: 1,
  evaluation: {
    mae: 1,
    rmse: 1,
    mase: null,
    baselineMae: 1,
    baselineRmse: 1,
    mape: 1,
    mapeMeaningful: true,
    periodCount: 2,
    positivePeriods: 2,
  },
  actualVsForecast: input.weeks
    .slice(8)
    .map((w) => ({ week: w.week, actual: w.quantity, prediction: 1 })),
  forecast: Array.from({ length: 4 }, (_, i) => ({
    week: new Date(Date.UTC(2026, 0, 5 + (10 + i) * 7))
      .toISOString()
      .slice(0, 10),
    prediction: 1,
  })),
  safetyStock: 1,
  reorderPoint: 2,
  leadTimeDays: 7,
  serviceLevel: 0.95,
  convergenceWarning: false,
  invalidTuningCandidates: 0,
  fallbackDuringTuning: false,
  fallbackDuringEvaluation: false,
  fallbackDuringForecast: false,
};

describe('pipeline output validation', () => {
  it('accepts a valid result and a distinct insufficient-data status', () => {
    expect(validatePipelineResult(output, input).status).toBe('SUCCESS');
    expect(
      validatePipelineResult(
        { version: 1, status: 'INSUFFICIENT_DATA' },
        input,
      ),
    ).toEqual({ status: 'INSUFFICIENT_DATA' });
  });
  it.each([
    { ...output, safetyStock: -1 },
    { ...output, reorderPoint: Infinity },
    { ...output, leadTimeDays: 8 },
    { ...output, forecast: output.forecast.slice(1) },
    {
      ...output,
      actualVsForecast: [
        { ...output.actualVsForecast[0], actual: 999 },
        output.actualVsForecast[1],
      ],
    },
    {
      ...output,
      forecast: [
        { ...output.forecast[0], week: '2020-01-01' },
        ...output.forecast.slice(1),
      ],
    },
  ])('rejects malformed or mismatched outputs', (invalid) => {
    expect(() => validatePipelineResult(invalid, input)).toThrow(
      'Proses analisis tidak dapat diselesaikan.',
    );
  });
});
