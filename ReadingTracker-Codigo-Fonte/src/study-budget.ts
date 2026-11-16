import { effectivePace, type Progress } from './progress';

export const defaultDailyMinutes = 270;

export function validDailyMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1440;
}

export function remainingWork(records: Record<string, Progress>, subjects: Map<string, string>,
  globalPace: number | null, subjectPaces: Record<string, number>, dailyMinutes: number) {
  let minutes = 0;
  let pending = 0;
  let unknown = 0;
  for (const [id, record] of Object.entries(records)) {
    const pages = record.totalPages - record.readPages;
    if (pages <= 0) continue;
    pending++;
    const subject = subjects.get(id);
    const pace = subject === undefined ? null : effectivePace(globalPace, subjectPaces[subject]);
    const estimate = pace === null ? Infinity : pages / pace * 60;
    if (Number.isFinite(estimate + minutes)) minutes += estimate;
    else unknown++;
  }
  return { pending, unknown, hours: minutes / 60, days: Math.ceil(minutes / dailyMinutes) };
}
