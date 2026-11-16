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
