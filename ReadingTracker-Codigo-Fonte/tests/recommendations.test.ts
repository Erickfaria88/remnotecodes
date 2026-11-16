import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { studyRecommendations, validStars, validPhase } from '../src/recommendations';
import { createRepository } from '../src/remnote/storage';

test('ordena por importância por minuto e recalcula após progresso', () => {
  const rows = {
    a: { totalPages: 30, readPages: 0, stars: 5 },
    b: { totalPages: 5, readPages: 0, stars: 2 },
    c: { totalPages: 5, readPages: 0, stars: 0 },
    d: { totalPages: 2, readPages: 0 },
    e: { totalPages: 2, readPages: 2, stars: 5 },
    f: { totalPages: 2, readPages: 0, stars: 5 },
  };
  const subjects = new Map(Object.keys(rows).map((id) => [id, id === 'f' ? 'other' : 'main']));
  const rank = () => studyRecommendations(rows, subjects, { main: 2 }, { main: 60 }, null);
  assert.deepEqual(rank().map((row) => row.id), ['b', 'a', 'c', 'f']);
  assert.equal(rank()[0].phase, 2);
  assert.equal(rank()[3].minutes, null);
  rows.a.readPages = 25;
  assert.equal(rank()[0].id, 'a');
});

test('preserva fase e zero estrelas no backup e nas atualizações de progresso', async () => {
  let value: unknown;
  const repo = createRepository({
    async getSynced<T>() { return value as T | undefined; },
    async setSynced(_key, next) { value = JSON.parse(JSON.stringify(next)); },
  }, 'base');
  assert.equal(validPhase(99), true);
  assert.equal(validPhase(0), false);
  assert.equal(validStars(0), true);
  assert.equal(validStars(6), false);
  await repo.savePhase('d', 7);
  await repo.saveLesson('a', { totalPages: 10, readPages: 0 }, null, 0);
  await repo.saveLesson('a', { totalPages: 10, readPages: 2 });
  assert.equal((await repo.load()).lessons.a.stars, 0);
  assert.equal((await repo.load()).subjectPhases.d, 7);
  await assert.rejects(repo.savePhase('d', 0), /Fase/);
  await assert.rejects(repo.saveLesson('a', { totalPages: 10, readPages: 3 }, null, 6), /Importância/);
  assert.equal((await repo.load()).lessons.a.readPages, 2);
});
