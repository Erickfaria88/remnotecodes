import type { ReadingRecord } from './resume';
import { effectivePace } from './progress';

export function validPhase(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function validStars(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
}

export function studyRecommendations(
  records: Record<string, ReadingRecord>,
  subjects: Map<string, string>,
  phases: Record<string, number>,
  subjectPaces: Record<string, number>,
  globalPace: number | null,
) {
  return Object.entries(records).flatMap(([id, record]) => {
    const subject = subjects.get(id);
    const remaining = record.totalPages - record.readPages;
    if (!subject || remaining <= 0 || record.stars === undefined) return [];
    const pace = effectivePace(globalPace, subjectPaces[subject]);
    const estimate = pace === null ? Infinity : remaining / pace * 60;
    const minutes = Number.isFinite(estimate) ? Math.max(1, Math.ceil(estimate)) : null;
    const score = minutes === null ? 0 : (record.stars + 1) / minutes;
    return [{ id, remaining, minutes, stars: record.stars, phase: phases[subject], score }];
  }).sort((a, b) => b.score - a.score || b.stars - a.stars || a.remaining - b.remaining || a.id.localeCompare(b.id));
}
