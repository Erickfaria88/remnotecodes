export function diversifyLessons<T extends { id: string; minutes: number | null }>(
  rows: readonly T[], subjects: ReadonlyMap<string, string>,
): T[] {
  const bySubject = new Map<string, number | null>();
  const first: T[] = [];
  const repeats: T[] = [];

  for (const row of rows) {
    const subject = subjects.get(row.id) ?? row.id;
    const minutes = row.minutes === null ? null : Math.ceil(row.minutes);
    if (!bySubject.has(subject)) {
      first.push(row);
      bySubject.set(subject, minutes);
      continue;
    }
    const used = bySubject.get(subject);
    if (used != null && minutes !== null && used + minutes <= 60) {
      repeats.push(row);
      bySubject.set(subject, used + minutes);
    }
  }

  return [...first, ...repeats];
}
