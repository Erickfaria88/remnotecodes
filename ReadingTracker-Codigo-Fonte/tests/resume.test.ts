import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calendarReminder, googleCalendarUrl, readingQueue, studyDay, validStudyDay } from '../src/resume';
import { createRepository } from '../src/remnote/storage';

test('trata datas locais e valida dias de calendário', () => {
  assert.equal(studyDay(1, new Date(2026, 10, 30, 23, 59)), '2026-12-01');
  assert.equal(validStudyDay('2028-02-29'), true);
  assert.equal(validStudyDay('2026-02-29'), false);
});

test('lista retomadas vencidas e futuras e separa leituras quase concluídas', () => {
  const records = {
    old: { totalPages: 40, readPages: 30, resumeOn: '2026-11-13' },
    next: { totalPages: 60, readPages: 35, resumeOn: '2026-11-16' },
    today: { totalPages: 40, readPages: 20, resumeOn: '2026-11-14' },
    fresh: { totalPages: 5, readPages: 0 },
    done: { totalPages: 40, readPages: 40, resumeOn: '2026-11-14' },
    missing: { totalPages: 10, readPages: 9 },
  };
  const result = readingQueue(records, '2026-11-14', 30, { fast: 60 },
    new Map([['old', 'normal'], ['next', 'fast'], ['today', 'fast'], ['fresh', 'normal'], ['done', 'fast']]));
  assert.deepEqual(result.due.map((row) => row.id), ['old', 'today']);
  assert.deepEqual(result.upcoming.map((row) => row.id), ['next']);
  assert.deepEqual(result.short.map((row) => row.id), ['old', 'today']);
  assert.equal(result.short[1].minutes, 20);
});

test('mantém compatibilidade com backups antigos e remove a retomada na conclusão', async () => {
  const values = new Map<string, string>();
  const storage = {
    async getSynced<T>(key: string) {
      const value = values.get(key);
      return value === undefined ? undefined : JSON.parse(value) as T;
    },
    async setSynced(key: string, value: unknown) { values.set(key, JSON.stringify(value)); },
  };
  const repo = createRepository(storage, 'a');
  await repo.restore({
    version: 1, baseId: 'a', lessons: { aula: { totalPages: 40, readPages: 30 } },
    globalPace: 30, subjectPaces: {},
  });
  assert.equal((await repo.load()).lessons.aula.resumeOn, undefined);
  await repo.saveLesson('aula', { totalPages: 40, readPages: 30 }, '2026-11-15');
  assert.equal((await createRepository(storage, 'a').load()).lessons.aula.resumeOn, '2026-11-15');
  assert.deepEqual(Object.keys((await createRepository(storage, 'b').load()).lessons), []);
  await assert.rejects(repo.saveLesson('aula', { totalPages: 40, readPages: 32 }, '2026-11-31'));
  assert.equal((await repo.load()).lessons.aula.readPages, 30);
  await repo.saveLesson('aula', { totalPages: 40, readPages: 40 });
  assert.equal((await repo.load()).lessons.aula.resumeOn, undefined);
});

test('exporta alarme iCalendar com horário local convertido, texto escapado e linhas dobradas', () => {
  const args = { id: 'base:aula', title: 'Ação, revisão; PDF\n' + 'ç'.repeat(75), day: '2026-11-15',
    time: '09:00', remaining: 10, now: new Date(2026, 10, 14, 9) };
  const file = calendarReminder(args);
  const expected = new Date(2026, 10, 15, 9).toISOString().replace(/[-:]|\.\d{3}/g, '');
  assert.ok(file.includes('DTSTART:' + expected + '\r\n'));
  assert.ok(file.includes('ACTION:DISPLAY\r\nTRIGGER:PT0S'));
  assert.ok(file.replace(/\r\n /g, '').includes('Ação\\, revisão\\; PDF\\n'));
  assert.ok(file.split('\r\n').every((line) => Buffer.byteLength(line) <= 75));
  assert.throws(() => calendarReminder({ ...args, day: '2026-11-13' }), /futuro/);
  assert.throws(() => calendarReminder({ ...args, time: '24:00' }), /válidos/);
});

test('preenche um evento do Google com horário, páginas e link da aula', () => {
  const args = { title: 'Economia & revisão', day: '2026-11-15', time: '09:00',
    remaining: 10, lessonId: 'abc', now: new Date(2026, 10, 14, 9) };
  const url = new URL(googleCalendarUrl(args));
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'Retomar: Economia & revisão');
  assert.equal(url.searchParams.get('dates'), stamp(new Date(2026, 10, 15, 9)) + '/' +
    stamp(new Date(2026, 10, 15, 9, 15)));
  assert.match(url.searchParams.get('details')!, /Faltam 10 páginas.*\n.*remnote\.com\/w\/abc/);
  assert.throws(() => googleCalendarUrl({ ...args, day: '2026-11-13' }), /futuro/);
});