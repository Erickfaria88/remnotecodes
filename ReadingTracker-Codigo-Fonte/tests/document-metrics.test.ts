import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { documentMetrics } from '../src/document-metrics';
import { parseBackup } from '../src/remnote/storage';

test('disciplina soma aulas e exige todas as etapas, mesmo com registro no pai', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', globalPace: null, subjectPaces: {},
    lessons: {
      subject: { totalPages: 28, readPages: 28, completedSteps: ['theory'] },
      a: { totalPages: 28, readPages: 28, completedSteps: ['theory', 'literal'] },
      b: { totalPages: 40, readPages: 0, completedSteps: ['literal'] },
    },
    exercises: { a: { correct: 8, incorrect: 2 }, b: { correct: 6, incorrect: 4 } },
  }, 'base');
  const total = documentMetrics(data, 'subject', ['a', 'b', 'unregistered']);
  assert.equal(total.readPages, 28);
  assert.equal(total.totalPages, 68);
  assert.equal(total.percent, 28 / 68 * 100);
  assert.deepEqual(total.steps, ['literal']);
  assert.deepEqual(total.exercise, { total: 20, percent: '70%', band: 'yellow' });
  assert.equal(documentMetrics(data, 'a', []).totalPages, 28);
  assert.equal(documentMetrics(data, 'a', []).exercise?.percent, '80%');
});
