import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseBackup } from '../src/remnote/storage';
import { attentionLessons } from '../src/study-attention';

test('atenção inclui leitura concluída e poucas questões, mantendo acerto alto com amostra fora da fila', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', globalPace: null, subjectPaces: {},
    lessons: { done: { totalPages: 10, readPages: 10, stars: 5 } },
    exercises: {
      done: { correct: 5, incorrect: 5 },
      weak: { correct: 4, incorrect: 6 },
      almost: { correct: 7999, incorrect: 2001 },
      goal: { correct: 8, incorrect: 2 },
      few: { correct: 0, incorrect: 1 },
      missing: { correct: 0, incorrect: 10 },
    },
  }, 'base');
  const subjects = new Map(['done', 'weak', 'almost', 'goal', 'few'].map((id) => [id, 'subject']));
  const rows = attentionLessons(data, subjects, 10);
  assert.deepEqual(rows.map((row) => row.id), ['done', 'few', 'weak', 'almost']);
  assert.equal(rows[0].band, 'red');
  assert.equal(rows[3].band, 'yellow');
  assert.equal(rows.find((row) => row.id === 'few')?.reason, 'Poucos exercícios cadastrados');
});
