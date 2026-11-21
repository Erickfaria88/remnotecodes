import { effectivePace, type Progress } from './progress';

import type { StudyStep } from './study-steps';

export interface ReadingRecord extends Progress {
  incidence?: number;
  incidenceTopic?: string;
  resumeOn?: string;
  stars?: number;
  completedSteps?: StudyStep[];
  completedAt?: number;
  reviewedAt?: number;
}

export function studyDay(offset = 0, now = new Date()) {
  const local = new Date(now.getTime());
  local.setDate(local.getDate() + offset);
  return [String(local.getFullYear()).padStart(4, '0'), String(local.getMonth() + 1).padStart(2, '0'),
    String(local.getDate()).padStart(2, '0')].join('-');
}

export function validStudyDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const day = new Date(value + 'T12:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

export function readingQueue(records: Record<string, ReadingRecord>, today: string,
  globalPace: number | null, subjectPaces: Record<string, number>, subjectByLesson: Map<string, string>) {
  const pending = Object.entries(records).flatMap(([id, record]) => {
    const remaining = record.totalPages - record.readPages;
    if (!remaining || !subjectByLesson.has(id)) return [];
    const pace = effectivePace(globalPace, subjectPaces[subjectByLesson.get(id)!]);
    return [{ id, record, remaining, minutes: pace === null ? null : remaining / pace * 60 }];
  });
  const scheduled = pending.filter(({ record }) => record.resumeOn)
    .sort((a, b) => a.record.resumeOn!.localeCompare(b.record.resumeOn!) || a.remaining - b.remaining);
  return {
    due: scheduled.filter(({ record }) => record.resumeOn! <= today),
    upcoming: scheduled.filter(({ record }) => record.resumeOn! > today),
    short: pending.filter(({ record, remaining, minutes }) =>
      record.readPages > 0 && (remaining <= 10 || (minutes !== null && minutes <= 20)))
      .sort((a, b) => a.remaining - b.remaining),
  };
}

function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[,;]/g, (character) => '\\' + character);
}

function fold(line: string) {
  const encoder = new TextEncoder();
  let bytes = 0;
  let output = '';
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      output += '\r\n ';
      bytes = 1;
    }
    output += character;
    bytes += size;
  }
  return output;
}

function eventStart(day: string, time: string, now: Date) {
  if (!validStudyDay(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Escolha uma data e um horário válidos.');
  }
  const start = new Date(day + 'T' + time + ':00');
  if (start <= now || studyDay(0, start) !== day ||
      start.getHours() !== Number(time.slice(0, 2)) || start.getMinutes() !== Number(time.slice(3))) {
    throw new Error('Escolha um horário local futuro.');
  }
  return start;
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');

export function googleCalendarUrl({ title, day, time, remaining, lessonId, now = new Date() }: {
  title: string; day: string; time: string; remaining: number; lessonId: string; now?: Date;
}) {
  const start = eventStart(day, time, now);
  const end = new Date(start.getTime() + 15 * 60_000);
  const lesson = new URL('/w/' + encodeURIComponent(lessonId), 'https://www.remnote.com');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');
  url.search = new URLSearchParams({
    action: 'TEMPLATE',
    dates: stamp(start) + '/' + stamp(end),
    stz: zone,
    etz: zone,
    text: 'Retomar: ' + title,
    details: 'Faltam ' + remaining + ' páginas.\nAula no RemNote: ' + lesson.href,
  }).toString();
  return url.href;
}

export function calendarReminder({ id, title, day, time, remaining, now = new Date() }: {
  id: string; title: string; day: string; time: string; remaining: number; now?: Date;
}) {
  const start = eventStart(day, time, now);
  const description = escapeText('Faltam ' + remaining + ' páginas.');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reading Tracker//Retomar estudos//PT-BR',
    'BEGIN:VEVENT', 'UID:' + encodeURIComponent(id) + '@reading-tracker.local',
    'DTSTAMP:' + stamp(now), 'DTSTART:' + stamp(start), 'DURATION:PT15M',
    'SUMMARY:' + escapeText('Retomar: ' + title), 'DESCRIPTION:' + description,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', 'DESCRIPTION:' + description,
    'END:VALARM', 'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}
