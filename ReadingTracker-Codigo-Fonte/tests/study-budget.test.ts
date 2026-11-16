import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { defaultDailyMinutes, remainingWork } from '../src/study-budget';
import { createRepository } from '../src/remnote/storage';

test('prevê dias para o material restante usando o ritmo de cada disciplina', () => {
  const records = {
    a: { totalPages: 240, readPages: 60 },
    b: { totalPages: 180, readPages: 0 },
    c: { totalPages: 10, readPages: 0 },
    done: { totalPages: 10, readPages: 10 },
  };
  const subjects = new Map([['a', 'normal'], ['b', 'fast']]);
  assert.deepEqual(remainingWork(records, subjects, 30, { fast: 60 }, 240),
    { pending: 3, unknown: 1, hours: 9, days: 3 });
  assert.equal(remainingWork(records, subjects, 30, { fast: 60 }, 120).days, 5);
  assert.deepEqual(remainingWork({}, subjects, null, {}, 240), { pending: 0, unknown: 0, hours: 0, days: 0 });
});

test('usa quatro horas e meia em backups antigos e persiste tempo diário por base', async () => {
  const records = new Map<string, unknown>();
  const storage = {
    async getSynced<T>(key: string) { return records.get(key) as T | undefined; },
    async setSynced(key: string, value: unknown) { records.set(key, value); },
  };
  const repo = createRepository(storage, 'a');
  assert.equal(defaultDailyMinutes, 270);
  assert.equal((await repo.restore({
    version: 1, baseId: 'a', lessons: {}, globalPace: null, subjectPaces: {},
  })).dailyMinutes, 270);
  records.set('reading-tracker:v1:a', { ...(await repo.load()), dailyMinutes: 240 });
  assert.equal((await repo.load()).dailyMinutes, 270);
  await repo.saveDailyMinutes(240);
  assert.equal((await repo.load()).dailyMinutes, 240);
  await repo.saveDailyMinutes(150);
  await assert.rejects(repo.saveDailyMinutes(0), /Tempo diário inválido/);
  assert.equal((await createRepository(storage, 'a').load()).dailyMinutes, 150);
  assert.equal((await createRepository(storage, 'b').load()).dailyMinutes, 270);
});
