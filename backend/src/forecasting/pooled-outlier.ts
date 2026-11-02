/** Notebook's pooled outlier multiplier, using each product's training segment. */
export function pooledOutlierMultiplier(
  series: { week: string; quantity: number }[][],
  trainEndWeek: string,
): number | null {
  const values: number[] = [];
  for (const observations of series) {
    const training = observations
      .filter((x) => x.week <= trainEndWeek)
      .map((x) => x.quantity);
    if (training.some((x) => !Number.isFinite(x) || x < 0)) return null;
    const positives = training.filter((x) => x > 0).sort((a, b) => a - b);
    if (positives.length < 8) continue;
    const middle = Math.floor(positives.length / 2);
    const median =
      positives.length % 2
        ? positives[middle]
        : (positives[middle - 1] + positives[middle]) / 2;
    for (const value of positives) values.push(Math.log(value / median));
  }
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const quantile = (p: number) => {
    const i = (values.length - 1) * p;
    const lo = Math.floor(i);
    return values[lo] + (values[Math.ceil(i)] - values[lo]) * (i - lo);
  };
  const q1 = quantile(0.25);
  const q3 = quantile(0.75);
  const multiplier = Math.exp(q3 + 1.5 * (q3 - q1));
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : null;
}
