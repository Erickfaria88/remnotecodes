import { validStudyDay } from './resume';

export interface ScheduledReview {
  lessonId: string;
  title: string;
  subject: string;
  studiedOn: string;
  dueOn: string;
  interval: number;
  pages: number;
  firstPage?: number;
  lastPage?: number;
  doneOn?: string;
}

export function reviewDate(day: string, interval: number) {
  if (!validStudyDay(day) || !Number.isInteger(interval) || interval < 1 || interval > 365) {
    throw new Error('Informe uma data válida e um intervalo entre 1 e 365 dias.');
  }
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + interval);
  return date.toISOString().slice(0, 10);
}

export function reviewPages(firstPage: number, lastPage: number) {
  if (!Number.isSafeInteger(firstPage) || !Number.isSafeInteger(lastPage) ||
      firstPage < 1 || lastPage < firstPage) {
    throw new Error('Informe páginas inteiras e uma página final igual ou maior que a inicial.');
  }
  return lastPage - firstPage + 1;
}

export function validReview(value: unknown): value is ScheduledReview {
  if (!value || typeof value !== 'object') return false;
  const row = value as ScheduledReview;
  return typeof row.lessonId === 'string' && !!row.lessonId &&
    typeof row.title === 'string' && !!row.title.trim() && typeof row.subject === 'string' &&
    validStudyDay(row.studiedOn) && validStudyDay(row.dueOn) && Number.isInteger(row.interval) &&
    row.interval >= 1 && row.interval <= 365 &&
    Number.isSafeInteger(row.pages) && row.pages > 0 &&
    (row.firstPage === undefined && row.lastPage === undefined ||
      Number.isSafeInteger(row.firstPage) && Number.isSafeInteger(row.lastPage) &&
      row.firstPage! >= 1 && row.lastPage! >= row.firstPage! &&
      row.lastPage! - row.firstPage! + 1 === row.pages) &&
    (row.doneOn === undefined || validStudyDay(row.doneOn));
}

export function groupReviews(reviews: Record<string, ScheduledReview>, today: string) {
  const rows = Object.entries(reviews).sort(([, a], [, b]) => a.dueOn.localeCompare(b.dueOn));
  return [
    { label: 'Atrasadas', rows: rows.filter(([, row]) => !row.doneOn && row.dueOn < today) },
    { label: 'Hoje', rows: rows.filter(([, row]) => !row.doneOn && row.dueOn === today) },
    { label: 'Próximas', rows: rows.filter(([, row]) => !row.doneOn && row.dueOn > today) },
    { label: 'Concluídas', rows: rows.filter(([, row]) => row.doneOn).reverse() },
  ];
}
