import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { effectivePace, summarize, validPace, validProgress } from '../src/progress';

test('valida total e páginas lidas, incluindo zero lido', () => {
  assert.equal(validProgress({ totalPages: 10, readPages: 0 }), true);
  assert.equal(validProgress({ totalPages: 10, readPages: 10 }), true);
  for (const value of [
    undefined, null, {}, { totalPages: 0, readPages: 0 }, { totalPages: 10, readPages: -1 },
    { totalPages: 10, readPages: 11 }, { totalPages: 10, readPages: 0.5 },
    { totalPages: Infinity, readPages: 0 }, { totalPages: '10', readPages: 0 },
  ]) assert.equal(validProgress(value), false);
});

test('valida ritmo e prefere o ritmo da disciplina', () => {
  assert.equal(validPace(12.5), true);
  for (const value of [0, -1, Infinity, NaN, '30', null]) assert.equal(validPace(value), false);
  assert.equal(effectivePace(30, 20), 20);
  assert.equal(effectivePace(30, undefined), 30);
  assert.equal(effectivePace(null, undefined), null);
});

test('calcula percentual ponderado, páginas restantes e horas', () => {
  const data = summarize([{ totalPages: 10, readPages: 10 }, { totalPages: 90, readPages: 0 }], 30);
  assert.deepEqual(data, { totalPages: 100, readPages: 10, remaining: 90, percent: 10, hours: 3 });
  assert.equal(summarize([{ totalPages: 10, readPages: 10 }], 30).hours, 0);
});

test('distingue aula sem registro de progresso zero e omite horas sem ritmo', () => {
  assert.equal(summarize([], 30).percent, null);
  assert.equal(summarize([], 30).hours, null);
  const zero = summarize([{ totalPages: 90, readPages: 0 }], null);
  assert.equal(zero.percent, 0);
  assert.equal(zero.remaining, 90);
  assert.equal(zero.hours, null);
});
