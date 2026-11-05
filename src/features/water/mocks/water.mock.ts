import type { WaterLog, WaterLogSource } from '../types/water';
import { localDateFromInstant, parseLocalDate } from '../utils/water-date';

function makeLog(id: string, date: Date, amountMl: number, source: WaterLogSource): WaterLog {
  return { id, amountMl, loggedAt: date.toISOString(), source };
}

/** Create one seed snapshot using local calendar dates and only past instants. */
export function createWaterSeed(now: Date): WaterLog[] {
  const today = parseLocalDate(localDateFromInstant(now));
  if (!today) return [];

  const preferredTimes = [[9, 15], [11, 30], [13, 20], [16, 10]] as const;
  const amounts = [250, 300, 450, 500] as const;
  const todayLogs = preferredTimes.map(([hour, minute], index) => {
    const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
    if (candidate.getTime() > now.getTime()) {
      const safeFallback = new Date(Math.max(today.getTime(), now.getTime() - (preferredTimes.length - index) * 60_000));
      return makeLog(`seed-today-${index + 1}`, safeFallback, amounts[index], 'quick-add');
    }
    return makeLog(`seed-today-${index + 1}`, candidate, amounts[index], 'quick-add');
  });

  const previousDays: WaterLog[] = [];
  const dailyAmounts = [1200, 1750, 900, 2100, 1450, 1800, 1250] as const;
  for (let daysAgo = 1; daysAgo <= dailyAmounts.length; daysAgo += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, 16, 20);
    const total = dailyAmounts[daysAgo - 1];
    previousDays.push(makeLog(`seed-${daysAgo}-a`, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 10), Math.round(total * 0.4), 'quick-add'));
    previousDays.push(makeLog(`seed-${daysAgo}-b`, date, total - Math.round(total * 0.4), 'custom'));
  }

  return [...todayLogs, ...previousDays];
}
