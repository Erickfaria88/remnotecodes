import type { Backup } from './remnote/storage';
import { effectivePace } from './progress';
import { attentionLessons } from './study-attention';

export function buildAdvancePlan(data: Backup, subjects: Map<string, string>, budget: number,
  today: string, phase: number | null) {
  const attention = new Map(attentionLessons(data, subjects, 10).map((row) => [row.id, row]));
  const candidates = [...subjects].flatMap(([id, subjectId]) => {
    const record = data.lessons[id];
    const itemPhase = data.subjectPhases[subjectId];
    if (phase !== null && itemPhase !== phase) return [];
    const remaining = record ? record.totalPages - record.readPages : 0;
    const concern = attention.get(id);
    if (remaining <= 0 && !concern) return [];
    const pace = effectivePace(data.globalPace, data.subjectPaces[subjectId]);
    const readingMinutes = remaining > 0 && pace ? Math.max(1, Math.ceil(remaining / pace * 60)) : null;
    const practice = remaining <= 0 || Boolean(concern && concern.total >= 10 && concern.ratio !== null && concern.ratio < 0.6);
    const minutes = practice ? 20 : Math.min(readingMinutes ?? 30, 30);
    const due = Boolean(record?.resumeOn && record.resumeOn <= today && remaining > 0);
    const near = readingMinutes !== null && readingMinutes <= 30;
    const reasons = [
      ...(due ? ['Retomada de hoje ou atrasada'] : []),
      ...(near ? ['Leitura quase concluída'] : []),
      ...(concern ? [concern.reason] : []),
    ];
    const score = ((record?.stars ?? 0) + 1) * (1 + Number(due) * 0.5 + Number(near) * 0.5 +
      (concern ? concern.ratio === null ? 0.3 : 1 - concern.ratio : 0)) / minutes;
    return [{ id, subjectId, phase: itemPhase, stars: record?.stars ?? 0, minutes, remaining,
      readingMinutes, practice, score, reasons }];
  }).sort((a, b) => (a.phase ?? Infinity) - (b.phase ?? Infinity) || b.score - a.score || a.id.localeCompare(b.id));
  let available = Math.max(0, budget);
  const subjectTime = new Map<string, number>();
  const selected: typeof candidates = [];
  for (const item of candidates) {
    if (available < 1) break;
    const minutes = Math.min(item.minutes, available);
    const previous = subjectTime.get(item.subjectId) ?? 0;
    if (previous > 0 && previous + minutes > 60) continue;
    selected.push({ ...item, minutes });
    subjectTime.set(item.subjectId, previous + minutes);
    available -= minutes;
  }
  return { selected, totalMinutes: budget - available, available };
}
