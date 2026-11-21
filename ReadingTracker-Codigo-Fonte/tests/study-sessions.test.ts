import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createRepository } from '../src/remnote/storage';
import { formatDuration, parseDuration, remainingDailyTime, type StudySession } from '../src/study-sessions';
import { studyDay } from '../src/resume';

function storageDouble() {
  const values = new Map<string, unknown>();
  return {
    async getSynced<T>(key: string) { return values.get(key) as T; },
    async setSynced(key: string, value: unknown) { values.set(key, JSON.parse(JSON.stringify(value))); },
  };
}
const session = (id: string, seconds: number, category: StudySession['category'] = 'theory'): StudySession => ({
  id, lessonId: 'lesson', subjectId: 'subject', title: 'Aula', subject: 'Disciplina',
  day: studyDay(), category, seconds, counted: true, note: '',
});

test('interpreta hh:mm:ss e rejeita duração inválida', () => {
  assert.equal(parseDuration('00:06:10'), 370);
  assert.equal(formatDuration(370), '00:06:10');
  for (const value of ['00:00:00', '00:60:00', '-1:00:00', '25:00:00', '30']) assert.throws(() => parseDuration(value));
});

test('desconta revisão e avanço, preserva segundos e limita saldo quando ultrapassa reserva', () => {
  const data = { dailyMinutes: 270, sessions: {
    r: session('r', 30 * 60, 'review'), s: session('s', 60 * 60), ignored: { ...session('ignored', 60 * 60), counted: false },
    past: { ...session('past', 60 * 60), day: '2020-01-01' },
  } };
  const result = remainingDailyTime(data);
  assert.equal(result.review, 60);
  assert.equal(result.study, 120);
  assert.equal(result.remainingSeconds, 180 * 60);
  const overflow = remainingDailyTime({ dailyMinutes: 270, sessions: { r: session('r', 100 * 60, 'review') } });
  assert.equal(overflow.review, 0);
  assert.equal(overflow.study, 170);
  const exhausted = remainingDailyTime({ dailyMinutes: 270, sessions: { r: session('r', 300 * 60) } });
  assert.equal(exhausted.remainingSeconds, 0);
  assert.equal(exhausted.overtimeSeconds, 30 * 60);
  assert.equal(remainingDailyTime({ dailyMinutes: 270, sessions: { s: session('s', 370) } }).remainingSeconds, 270 * 60 - 370);
});

test('salva tempo, exercícios e páginas juntos e impede duplicação em retry', async () => {
  const storage = storageDouble();
  const repo = createRepository(storage, 'base');
  const row = session('session', 370);
  const save = () => repo.saveStudy('lesson', { totalPages: 40, readPages: 10 }, null, 5, [],
    { correct: 4, incorrect: 1 }, false, undefined, undefined, row);
  await save();
  await save();
  const data = await repo.load();
  assert.equal(Object.keys(data.sessions ?? {}).length, 1);
  assert.deepEqual(data.exercises.lesson, { correct: 4, incorrect: 1 });
  assert.equal(data.lessons.lesson.readPages, 10);
  await assert.rejects(repo.saveStudy('lesson', undefined, undefined, undefined, undefined,
    undefined, false, undefined, undefined, { ...row, seconds: 400 }));
  assert.equal((await createRepository(storage, 'other').load()).sessions?.session, undefined);
  await repo.restore(data);
  assert.equal((await repo.load()).sessions?.session.seconds, 370);
});

test('corrigir ou excluir tempo recalcula o saldo e preserva os dados da aula', async () => {
  const repo = createRepository(storageDouble(), 'base');
  const row = session('session', 1800);
  await repo.saveStudy('lesson', { totalPages: 40, readPages: 10 }, null, 5, [],
    { correct: 4, incorrect: 1 }, false, undefined, undefined, row);
  const changed = await repo.updateSession(row.id, { day: row.day, seconds: 3600, category: 'review', counted: true, note: 'Corrigido' });
  assert.equal(remainingDailyTime(changed).review, 30);
  assert.equal(remainingDailyTime(changed).study, 180);
  await assert.rejects(repo.updateSession(row.id, { day: row.day, seconds: -1, category: 'review', counted: true, note: '' }));
  const cleared = await repo.removeSession(row.id);
  assert.equal(remainingDailyTime(cleared).remainingSeconds, 270 * 60);
  assert.equal(cleared.lessons.lesson.readPages, 10);
  assert.equal(cleared.exercises.lesson.correct, 4);
});
