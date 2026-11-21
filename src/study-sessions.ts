import { studyDay, validStudyDay } from './resume';
import { reviewBudget } from './review-plan';

export const sessionCategories = [
  { id: 'theory', label: 'Teoria' }, { id: 'literal', label: 'Literais' },
  { id: 'questions', label: 'Questões' }, { id: 'review', label: 'Revisão' },
  { id: 'strategic', label: 'Passo Estratégico' },
] as const;
export interface StudySession {
  id: string; lessonId: string; subjectId: string; title: string; subject: string;
  day: string; category: typeof sessionCategories[number]['id']; seconds: number;
  counted: boolean; note: string;
  firstPage?: number; lastPage?: number;
}
export type SessionInput = Omit<StudySession, 'lessonId' | 'subjectId' | 'title' | 'subject'>;
export function parseDuration(value: string) {
  if (!/^\d{1,2}:[0-5]\d:[0-5]\d$/.test(value)) throw new Error('Informe a duração como hh:mm:ss. Exemplo: 00:30:00.');
  const [hours, minutes, seconds] = value.split(':').map(Number);
  const result = hours * 3600 + minutes * 60 + seconds;
  if (result < 1 || result > 86400) throw new Error('Informe um tempo maior que zero e de até 24 horas.');
  return result;
}
export function formatDuration(seconds: number) {
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
}
export function validSession(value: unknown): value is StudySession {
  if (!value || typeof value !== 'object') return false;
  const row = value as StudySession;
  return [row.id, row.lessonId, row.subjectId, row.title, row.subject].every((text) => typeof text === 'string' && text.length > 0) &&
    validStudyDay(row.day) && sessionCategories.some((category) => category.id === row.category) &&
    Number.isSafeInteger(row.seconds) && row.seconds > 0 && row.seconds <= 86400 &&
    typeof row.counted === 'boolean' && typeof row.note === 'string' && row.note.length <= 500 &&
    (row.firstPage === undefined && row.lastPage === undefined ||
      Number.isSafeInteger(row.firstPage) && Number.isSafeInteger(row.lastPage) && row.firstPage! >= 1 && row.lastPage! >= row.firstPage!);
}
export function remainingDailyTime(data: {
  dailyMinutes: number; reviewShare?: number; sessions?: Record<string, StudySession>;
}, day = studyDay()) {
  const planned = reviewBudget(data.dailyMinutes, data.reviewShare ?? 100 / 3);
  const rows = Object.values(data.sessions ?? {}).filter((row) => row.counted && row.day === day);
  const reviewUsed = rows.filter((row) => row.category === 'review').reduce((sum, row) => sum + row.seconds, 0);
  const studyUsed = rows.filter((row) => row.category !== 'review').reduce((sum, row) => sum + row.seconds, 0);
  const used = reviewUsed + studyUsed;
  const remaining = Math.max(0, data.dailyMinutes * 60 - used);
  const review = Math.min(remaining, Math.max(0, planned.review * 60 - reviewUsed));
  const study = Math.min(remaining, Math.max(0, planned.study * 60 - studyUsed));
  return { review: Math.floor(review / 60), study: Math.floor(study / 60),
    remainingSeconds: remaining, usedSeconds: used, reviewUsed, studyUsed, planned,
    overtimeSeconds: Math.max(0, used - data.dailyMinutes * 60) };
}
