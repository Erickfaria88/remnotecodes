import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseBackup } from '../src/remnote/storage';
import { buildAdvancePlan } from '../src/advance-plan';
import { attentionLessons } from '../src/study-attention';
import { reviewBudget } from '../src/review-plan';

test('unifica retomada e quase concluída sem duplicar aula e respeita o orçamento líquido', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', globalPace: 10, subjectPaces: {},
    lessons: {
      short: { totalPages: 40, readPages: 37, stars: 5, resumeOn: '2026-11-19' },
      long: { totalPages: 80, readPages: 0, stars: 5 },
      done: { totalPages: 20, readPages: 20, stars: 5 },
    },
    exercises: { done: { correct: 2, incorrect: 8 } },
    subjectPhases: { tax: 1, accounting: 1 },
  }, 'base');
  const subjects = new Map([['short', 'tax'], ['long', 'tax'], ['done', 'accounting']]);
  const budget = reviewBudget(270, 100 / 3).study;
  const plan = buildAdvancePlan(data, subjects, budget, '2026-11-20', 1);
  assert.ok(plan.totalMinutes <= 180);
  assert.equal(new Set(plan.selected.map((row) => row.id)).size, plan.selected.length);
  assert.ok(plan.selected.find((row) => row.id === 'short')?.reasons.includes('Leitura quase concluída'));
  assert.equal(plan.selected.find((row) => row.id === 'done')?.practice, true);
  assert.equal(buildAdvancePlan(data, subjects, 0, '2026-11-20', null).totalMinutes, 0);
  assert.equal(buildAdvancePlan(data, subjects, 7, '2026-11-20', null).totalMinutes, 7);
});

test('atenção inclui zero e poucos exercícios, ordena por fase e importância', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', globalPace: null, subjectPaces: {},
    lessons: {
      first: { totalPages: 40, readPages: 20, stars: 1 },
      important: { totalPages: 40, readPages: 20, stars: 5 },
      later: { totalPages: 40, readPages: 20, stars: 5 },
    },
    exercises: { important: { correct: 1, incorrect: 0 }, later: { correct: 0, incorrect: 20 } },
    subjectPhases: { a: 1, b: 2 },
  }, 'base');
  const subjects = new Map([['first', 'a'], ['important', 'a'], ['later', 'b']]);
  const attention = attentionLessons(data, subjects, 10);
  assert.deepEqual(attention.map((row) => row.id), ['important', 'first', 'later']);
  assert.equal(attention.find((row) => row.id === 'first')?.ratio, null);
  assert.equal(attention.find((row) => row.id === 'first')?.reason, 'Sem exercícios cadastrados');
  assert.ok(buildAdvancePlan(data, subjects, 180, '2026-11-20', 1).selected.every((row) => row.phase === 1));
});
