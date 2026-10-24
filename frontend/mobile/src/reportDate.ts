// FinSight's backend uses Asia/Bangkok for current-day and current-month reports.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function reportDate(now: Date = new Date()): string {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

export function reportMonth(now: Date = new Date()): string {
  return reportDate(now).slice(0, 7);
}

export function reportDatePlusDays(days: number, now: Date = new Date()): string {
  return reportDate(new Date(now.getTime() + days * DAY_MS));
}
