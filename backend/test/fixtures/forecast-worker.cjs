let data = '';
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  const input = JSON.parse(data);
  if (input.method === 'tune') {
    setTimeout(() => process.stdout.write(JSON.stringify({ version: 1, status: 'TUNED', order: input.tuneOrder,
      arimaScore: 2, arimaScoreStatus: 'OK', crostonScore: 1, crostonAlpha: 0.2, convergenceWarning: false, fallbackUsed: false })), 400);
    return;
  }
  const split = input.weeks.filter((week) => week.week <= input.trainEndWeek).length;
  const last = Date.parse(`${input.weeks.at(-1).week}T00:00:00.000Z`);
  const response = {
    version: 1, status: 'SUCCESS', method: 'croston_sba', parameter: 0.2, trainRmse: 1,
    evaluation: { mae: 1, rmse: 1, mase: null, baselineMae: 1, baselineRmse: 1, mape: 1,
      mapeMeaningful: input.weeks.slice(split).filter((week) => week.quantity > 0).length >= 2,
      periodCount: input.weeks.length - split, positivePeriods: input.weeks.slice(split).filter((week) => week.quantity > 0).length },
    actualVsForecast: input.weeks.slice(split).map((week) => ({ week: week.week, actual: week.quantity, prediction: 1 })),
    forecast: Array.from({ length: 4 }, (_, i) => ({ week: new Date(last + (i + 1) * 7 * 86400000).toISOString().slice(0, 10), prediction: 2 })),
    safetyStock: 1.2341, reorderPoint: 3.4561, leadTimeDays: input.leadTimeDays, serviceLevel: 0.95, convergenceWarning: false, invalidTuningCandidates: 0,
    fallbackDuringTuning: false, fallbackDuringEvaluation: false, fallbackDuringForecast: false,
  };
  setTimeout(() => process.stdout.write(JSON.stringify(response)), 400);
});
