export interface Progress {
  totalPages: number;
  readPages: number;
}

export function validProgress(value: unknown): value is Progress {
  if (typeof value !== 'object' || value === null) return false;
  const { totalPages, readPages } = value as Progress;
  return Number.isSafeInteger(totalPages) && totalPages > 0 &&
    Number.isSafeInteger(readPages) && readPages >= 0 && readPages <= totalPages;
}

export function validPace(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 &&
    Number.isFinite(Number.MAX_SAFE_INTEGER / value);
}

export function summarize(records: readonly Progress[], pace: number | null) {
  const totalPages = records.reduce((sum, record) => sum + record.totalPages, 0);
  const readPages = records.reduce((sum, record) => sum + record.readPages, 0);
  const remaining = totalPages - readPages;
  return {
    totalPages,
    readPages,
    remaining,
    percent: totalPages === 0 ? null : 100 * (readPages / totalPages),
    hours: totalPages === 0 || pace === null ? null : remaining / pace,
  };
}

export function effectivePace(globalPace: number | null, subjectPace: number | undefined) {
  return subjectPace ?? globalPace;
}
