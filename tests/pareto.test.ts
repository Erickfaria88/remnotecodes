import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { incidenceStars, paretoCoverage } from '../src/pareto';
import { createRepository } from '../src/remnote/storage';

test('seleciona o núcleo pelo percentual acumulado e calcula cobertura ponderada', () => {
  const weights = [9.8, 14.6, 18.7, 10.6, 5.7, 7.3, 12.2, 11.4, 4.9, 3.3, 1.5, 0.1];
  const records = Object.fromEntries(weights.map((incidence, index) => [
    'a' + index, { totalPages: 10, readPages: 10, incidence, completedSteps: ['theory' as const] },
  ]));
  const result = paretoCoverage(records, Object.keys(records));
  assert.equal(result.core.length, 7);
  assert.ok(Math.abs(result.incidence - 84.6) < 1e-9);
  assert.ok(Math.abs(result.reading - 100) < 1e-9);
  assert.ok(Math.abs(result.steps[0].percent - 100) < 1e-9);
  assert.equal(result.steps[1].percent, 0);
  assert.equal(result.issues.length, 0);
});

test('agrupa o mesmo assunto sem duplicar peso e exige todas as aulas para concluir etapa', () => {
  const records = {
    a: { totalPages: 20, readPages: 20, incidence: 50, incidenceTopic: 'Societário', completedSteps: ['theory' as const] },
    b: { totalPages: 20, readPages: 0, incidence: 50, incidenceTopic: 'societário' },
    c: { totalPages: 20, readPages: 20, incidence: 30 },
  };
  const result = paretoCoverage(records, ['a', 'b', 'c', 'a']);
  assert.equal(result.total, 80);
  assert.equal(result.core.length, 2);
  assert.equal(result.reading, 68.75);
  assert.equal(result.steps[0].percent, 0);
  assert.equal(paretoCoverage({ ...records, b: { ...records.b, incidence: 49 } }, ['a', 'b']).issues.length, 1);
  assert.equal(paretoCoverage({ ...records, c: { ...records.c, incidence: 90 } }, ['a', 'c']).issues.length, 1);
  assert.equal(paretoCoverage(records, ['c']).reachesTarget, false);
});

test('preserva incidência em gravações antigas, backup e isolamento entre bases', async () => {
  const values = new Map<string, unknown>();
  const storage = {
    async getSynced<T>(key: string) { return values.get(key) as T; },
    async setSynced(key: string, value: unknown) { values.set(key, JSON.parse(JSON.stringify(value))); },
  };
  const repo = createRepository(storage, 'base');
  await repo.saveStudy('a', { totalPages: 20, readPages: 0 }, null, 5, [], undefined, false, 18.7, 'Societário');
  await repo.saveLesson('a', { totalPages: 20, readPages: 10 });
  const saved = await repo.load();
  assert.equal(saved.lessons.a.incidence, 18.7);
  assert.equal(saved.lessons.a.incidenceTopic, 'Societário');
  assert.equal((await repo.restore(saved)).lessons.a.incidence, 18.7);
  assert.equal((await createRepository(storage, 'other').load()).lessons.a, undefined);
  await assert.rejects(repo.saveStudy('a', { totalPages: 20, readPages: 0 }, null, 5, [], undefined, false, 101));
  assert.equal((await repo.load()).lessons.a.incidence, 18.7);
  assert.deepEqual([18.7, 14.6, 9.8, 4.9, 0.1, 0].map(incidenceStars), [5, 4, 3, 2, 1, 0]);
});
