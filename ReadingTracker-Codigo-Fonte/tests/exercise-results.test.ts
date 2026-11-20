import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { exerciseAccuracy, validExerciseResult } from '../src/exercise-results';
import { createRepository } from '../src/remnote/storage';

test('classifica os limites de 60% e 80% sem arredondar para outra faixa', () => {
  assert.deepEqual(exerciseAccuracy({ correct: 8, incorrect: 2 }), { percent: '80%', band: 'green' });
  assert.equal(exerciseAccuracy({ correct: 6, incorrect: 4 }).band, 'yellow');
  assert.deepEqual(exerciseAccuracy({ correct: 79999, incorrect: 20001 }), { percent: '79,99%', band: 'yellow' });
  assert.equal(exerciseAccuracy({ correct: 59999, incorrect: 40001 }).band, 'red');
  assert.deepEqual(exerciseAccuracy({ correct: 0, incorrect: 3 }), { percent: '0%', band: 'red' });
  assert.equal(validExerciseResult({ correct: 0, incorrect: 0 }), false);
  assert.equal(validExerciseResult({ correct: -1, incorrect: 2 }), false);
});

test('guarda exercícios mesmo sem progresso de leitura e isola por base', async () => {
  const values = new Map<string, unknown>();
  const store = {
    async getSynced<T>(key: string) { return values.get(key) as T | undefined; },
    async setSynced(key: string, value: unknown) { values.set(key, JSON.parse(JSON.stringify(value))); },
  };
  const repo = createRepository(store, 'base');
  await repo.saveExercise('aula', { correct: 8, incorrect: 2 });
  await repo.saveLesson('aula', { totalPages: 10, readPages: 5 });
  await assert.rejects(repo.saveExercise('aula', { correct: 0, incorrect: 0 }));
  assert.deepEqual((await createRepository(store, 'base').load()).exercises.aula, { correct: 8, incorrect: 2 });
  assert.equal((await createRepository(store, 'outra').load()).exercises.aula, undefined);
});

test('acumula os exercícios e salva os campos da aula na mesma gravação', async () => {
  let saved: unknown;
  let writes = 0;
  const repo = createRepository({
    async getSynced<T>() { return saved as T | undefined; },
    async setSynced(_key, value) { saved = JSON.parse(JSON.stringify(value)); writes++; },
  }, 'base');
  await repo.saveExercise('aula', { correct: 4, incorrect: 1 });
  const progress = { totalPages: 28, readPages: 12 };
  const result = await repo.saveStudy('aula', progress, '2026-11-17', 2, ['theory'], { correct: 10, incorrect: 0 });
  assert.equal(writes, 2);
  assert.deepEqual(result.exercises.aula, { correct: 14, incorrect: 1 });
  assert.equal(exerciseAccuracy(result.exercises.aula).percent, '93,33%');
  assert.deepEqual(result.lessons.aula, { ...progress, resumeOn: '2026-11-17', stars: 2, completedSteps: ['theory'] });
  await assert.rejects(repo.saveStudy('aula', { ...progress, readPages: 29 }, null, null, [], { correct: 1, incorrect: 0 }));
  assert.equal(writes, 2);
  assert.deepEqual((await repo.load()).exercises.aula, result.exercises.aula);
});

test('corrige totais sem somar, preserva leitura e permite novos lançamentos após corrigir', async () => {
  const values = new Map<string, unknown>();
  const storage = {
    async getSynced<T>(key: string) { return values.get(key) as T; },
    async setSynced(key: string, value: unknown) { values.set(key, JSON.parse(JSON.stringify(value))); },
  };
  const repo = createRepository(storage, 'base');
  await repo.saveLesson('aula', { totalPages: 62, readPages: 62 }, null, 5, ['theory']);
  await repo.saveExercise('aula', { correct: 43, incorrect: 45 });
  const corrected = await repo.saveStudy('aula', undefined, undefined, undefined, undefined,
    { correct: 43, incorrect: 2 }, true);
  assert.deepEqual(corrected.exercises.aula, { correct: 43, incorrect: 2 });
  assert.equal(exerciseAccuracy(corrected.exercises.aula).percent, '95,55%');
  assert.equal(corrected.lessons.aula.readPages, 62);
  assert.deepEqual(corrected.lessons.aula.completedSteps, ['theory']);
  assert.equal((await createRepository(storage, 'other').load()).exercises.aula, undefined);
  await assert.rejects(repo.saveStudy('aula', undefined, undefined, undefined, undefined,
    { correct: -1, incorrect: 2 }, true));
  assert.deepEqual((await repo.load()).exercises.aula, { correct: 43, incorrect: 2 });
  const added = await repo.saveExercise('aula', { correct: 1, incorrect: 0 });
  assert.deepEqual(added.exercises.aula, { correct: 44, incorrect: 2 });
  const cleared = await repo.saveStudy('aula', undefined, undefined, undefined, undefined,
    { correct: 0, incorrect: 0 }, true);
  assert.equal(cleared.exercises.aula, undefined);
  assert.equal(cleared.lessons.aula.totalPages, 62);
});
