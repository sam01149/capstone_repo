import { Prisma } from '../generated/prisma/client.js';
import { pooledOutlierMultiplier } from './pooled-outlier.js';
import type { PipelineInput } from './pipeline-adapter.js';
import type { CreateForecastDto } from './dto/create-forecast.dto.js';

type Db = Prisma.TransactionClient;
const DAY = 86400000;
const JAKARTA_OFFSET = 7 * 60 * 60 * 1000;
const weekString = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function mondayOfJakarta(time: number): number {
  const local = new Date(time + JAKARTA_OFFSET);
  const day = local.getUTCDay() || 7;
  return Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - day + 1,
  );
}
function validMonday(value: string): number | null {
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(ms) &&
    weekString(ms) === value &&
    new Date(ms).getUTCDay() === 1
    ? ms
    : null;
}

export async function prepareInput(
  db: Db,
  productId: string,
  leadTimeDays: number,
  dto: CreateForecastDto,
  captureStart: string | undefined,
  now: Date,
): Promise<{ input: PipelineInput | null; reason?: string }> {
  const lastClosed = mondayOfJakarta(now.getTime()) - 7 * DAY;
  const history = await db.demandWeek.findMany({
    where: { productId },
    orderBy: { week: 'asc' },
    take: 1001,
  });
  if (history.length > 1000) return { input: null, reason: 'HISTORY_LIMIT' };
  const weeks: PipelineInput['weeks'] = history.map((row) => ({
    week: row.week.toISOString().slice(0, 10),
    quantity: row.quantity.toNumber(),
    event: [Number(row.bazaar), Number(row.miniBazaar)],
  }));
  const eventMap = new Map<string, [number, number]>();
  let captureMillis: number | null = null;
  const liveTotals = new Map<string, Map<string, Prisma.Decimal>>();
  for (const row of dto.observedEvents ?? []) {
    if (validMonday(row.week) === null || eventMap.has(row.week))
      return { input: null, reason: 'EVENTS_INVALID' };
    eventMap.set(row.week, [Number(row.bazaar), Number(row.miniBazaar)]);
  }
  if (captureStart) {
    const start = validMonday(captureStart);
    if (start === null) return { input: null, reason: 'CAPTURE_START_INVALID' };
    if (history.some((row) => row.week.getTime() >= start))
      return { input: null, reason: 'SOURCE_OVERLAP' };
    captureMillis = start;
    if (start <= lastClosed) {
      if ((lastClosed - start) / (7 * DAY) >= 1000)
        return { input: null, reason: 'HISTORY_LIMIT' };
      const sales = await db.stockMovement.findMany({
        where: {
          type: 'SALE_OUT',
          occurredAt: {
            gte: new Date(start - JAKARTA_OFFSET),
            lt: new Date(lastClosed + 7 * DAY - JAKARTA_OFFSET),
          },
        },
        select: { productId: true, quantity: true, occurredAt: true },
        take: 50001,
      });
      if (sales.length > 50000) return { input: null, reason: 'SALES_LIMIT' };
      for (const sale of sales) {
        const week = weekString(mondayOfJakarta(sale.occurredAt.getTime()));
        const totals =
          liveTotals.get(sale.productId) ?? new Map<string, Prisma.Decimal>();
        totals.set(
          week,
          (totals.get(week) ?? new Prisma.Decimal(0)).add(sale.quantity),
        );
        liveTotals.set(sale.productId, totals);
      }
      for (let ms = start; ms <= lastClosed; ms += 7 * DAY) {
        const week = weekString(ms);
        const event = eventMap.get(week);
        if (!event) return { input: null, reason: 'EVENTS_MISSING' };
        const amount =
          liveTotals.get(productId)?.get(week) ?? new Prisma.Decimal(0);
        if (amount.greaterThan('999999999999.999'))
          return { input: null, reason: 'QUANTITY_LIMIT' };
        weeks.push({ week, quantity: amount.toNumber(), event });
      }
      if (!history.length) {
        const firstSale = weeks.findIndex((row) => row.quantity > 0);
        if (firstSale < 0)
          return { input: null, reason: 'INSUFFICIENT_COVERAGE' };
        weeks.splice(0, firstSale);
      }
    }
  }
  if (leadTimeDays <= 0) return { input: null, reason: 'LEAD_TIME_MISSING' };
  if (
    !weeks.length ||
    weeks.length > 1000 ||
    weeks.at(-1)?.week !== weekString(lastClosed)
  )
    return { input: null, reason: 'INSUFFICIENT_COVERAGE' };
  // The source calendar distinguishes known unrecorded weeks from missing rows.
  const records = await db.demandWeek.findMany({
    orderBy: [{ productId: 'asc' }, { week: 'asc' }],
    take: 50001,
    select: { productId: true, week: true, quantity: true, sourceHash: true },
  });
  const datasets = await db.forecastDataset.findMany({
    select: {
      sourceHash: true,
      productCount: true,
      startWeek: true,
      endWeek: true,
      unrecordedWeeks: true,
    },
    take: 10001,
  });
  if (datasets.length > 10000) return { input: null, reason: 'DATASET_LIMIT' };
  const seenProducts = new Map<string, Set<string>>();
  for (const row of records) {
    const products = seenProducts.get(row.sourceHash) ?? new Set<string>();
    products.add(row.productId);
    seenProducts.set(row.sourceHash, products);
  }
  if (
    datasets.some(
      (dataset) =>
        (seenProducts.get(dataset.sourceHash)?.size ?? 0) !==
        dataset.productCount,
    )
  )
    return { input: null, reason: 'DATASET_INCOMPLETE' };
  const calendarStatus = new Map<number, boolean>();
  let calendarEntries = 0;
  for (const dataset of datasets) {
    if (
      !dataset.startWeek ||
      !dataset.endWeek ||
      !Array.isArray(dataset.unrecordedWeeks)
    )
      return { input: null, reason: 'CALENDAR_UNVERIFIED' };
    const start = dataset.startWeek.getTime();
    const end = dataset.endWeek.getTime();
    if (start > end || (end - start) / (7 * DAY) >= 1000)
      return { input: null, reason: 'HISTORY_INVALID' };
    const missing = new Set<number>();
    for (const week of dataset.unrecordedWeeks) {
      if (typeof week !== 'string')
        return { input: null, reason: 'HISTORY_INVALID' };
      const ms = validMonday(week);
      if (ms === null || ms < start || ms > end || missing.has(ms))
        return { input: null, reason: 'HISTORY_INVALID' };
      missing.add(ms);
    }
    for (let ms = start; ms <= end; ms += 7 * DAY) {
      if (++calendarEntries > 100000)
        return { input: null, reason: 'DATASET_LIMIT' };
      const recorded = !missing.has(ms);
      if (calendarStatus.has(ms) && calendarStatus.get(ms) !== recorded)
        return { input: null, reason: 'DATASET_CONFLICT' };
      calendarStatus.set(ms, recorded);
    }
  }
  if (captureMillis !== null && captureMillis <= lastClosed) {
    for (let ms = captureMillis; ms <= lastClosed; ms += 7 * DAY) {
      if (calendarStatus.has(ms))
        return { input: null, reason: 'SOURCE_OVERLAP' };
      calendarStatus.set(ms, true);
    }
  }
  const groups = new Map<string, { week: number; quantity: number }[]>();
  if (records.length > 50000) return { input: null, reason: 'HISTORY_LIMIT' };
  for (const row of records) {
    if (row.week.getTime() > lastClosed)
      return { input: null, reason: 'HISTORY_INVALID' };
    if (calendarStatus.get(row.week.getTime()) !== true)
      return { input: null, reason: 'DATASET_CONFLICT' };
    const group = groups.get(row.productId) ?? [];
    group.push({
      week: row.week.getTime(),
      quantity: row.quantity.toNumber(),
    });
    groups.set(row.productId, group);
  }
  if (captureMillis !== null && captureMillis <= lastClosed) {
    for (const group of groups.values()) {
      if (group.some((row) => row.week >= captureMillis!))
        return { input: null, reason: 'SOURCE_OVERLAP' };
    }
    const ids = new Set([...groups.keys(), ...liveTotals.keys()]);
    let totalWeeks = records.length;
    for (const id of ids) {
      const group = groups.get(id) ?? [];
      const totals = liveTotals.get(id);
      const firstLive = totals?.size
        ? Math.min(...[...totals.keys()].map((w) => validMonday(w)!))
        : null;
      if (!group.length && firstLive === null) continue;
      const start = group.length ? captureMillis : firstLive!;
      for (let ms = start; ms <= lastClosed; ms += 7 * DAY) {
        if (++totalWeeks > 100000)
          return { input: null, reason: 'HISTORY_LIMIT' };
        const amount = totals?.get(weekString(ms)) ?? new Prisma.Decimal(0);
        if (amount.greaterThan('999999999999.999'))
          return { input: null, reason: 'QUANTITY_LIMIT' };
        group.push({ week: ms, quantity: amount.toNumber() });
      }
      groups.set(id, group);
    }
  }
  const calendar = [...calendarStatus.keys()].sort((a, b) => a - b);
  if (
    calendar.length < 2 ||
    calendar.some(
      (week, index) => index > 0 && week !== calendar[index - 1] + 7 * DAY,
    )
  ) {
    return { input: null, reason: 'CALENDAR_GAP' };
  }
  const operationalCalendar = calendar.filter((week) =>
    calendarStatus.get(week),
  );
  if (operationalCalendar.length < 2)
    return { input: null, reason: 'INSUFFICIENT_COVERAGE' };
  const trainEndWeek = weekString(
    operationalCalendar[Math.floor(operationalCalendar.length * 0.8) - 1],
  );
  for (const group of groups.values()) {
    if (group.length > 1000 || group.at(-1)?.week !== lastClosed)
      return { input: null, reason: 'COHORT_GAP' };
    const observed = new Set(group.map((row) => row.week));
    for (const week of operationalCalendar) {
      if (week >= group[0].week && !observed.has(week))
        return { input: null, reason: 'COHORT_GAP' };
    }
  }
  const cohort = [...groups.entries()]
    .filter(
      ([, group]) =>
        group.length <= 1000 &&
        group.every((row) => calendarStatus.get(row.week)),
    )
    .map(([, group]) =>
      group.map((row) => ({
        week: weekString(row.week),
        quantity: row.quantity,
      })),
    );
  if (!cohort.length)
    cohort.push(
      weeks.map((row) => ({ week: row.week, quantity: row.quantity })),
    );
  const input: PipelineInput = {
    weeks,
    leadTimeDays,
    futureEvents: dto.futureEvents.map((e) => [
      Number(e.bazaar),
      Number(e.miniBazaar),
    ]),
    pooledOutlierMultiplier: pooledOutlierMultiplier(cohort, trainEndWeek),
    trainEndWeek,
    knownMissingWeeks: calendar
      .filter((week) => !calendarStatus.get(week))
      .map(weekString),
  };
  return { input };
}
