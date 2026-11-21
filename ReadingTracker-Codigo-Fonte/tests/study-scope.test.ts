import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseBackup } from '../src/remnote/storage';
import { filterStudySubjects, matchesPhase } from '../src/study-scope';
import { buildReviewBlocks } from '../src/review-plan';

test('filtra fase única, múltiplas, todas e sem fase com o mesmo mapa', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', lessons: {}, globalPace: null, subjectPaces: {},
    subjectPhases: { a: 1, b: 2 },
  }, 'base');
  const subjects = new Map([['a1', 'a'], ['b1', 'b'], ['none', 'c']]);
  assert.deepEqual([...filterStudySubjects(data, subjects, [1]).keys()], ['a1']);
  assert.deepEqual([...filterStudySubjects(data, subjects, [1, 2]).keys()], ['a1', 'b1']);
  assert.equal(filterStudySubjects(data, subjects, 'all').size, 3);
  assert.deepEqual([...filterStudySubjects(data, subjects, [0]).keys()], ['none']);
  assert.equal(filterStudySubjects(data, subjects, []).size, 0);
  assert.deepEqual([...filterStudySubjects(data, subjects, 'auto').keys()], ['a1']);
  assert.equal(matchesPhase(undefined, 'auto', {}), true);
});

test('núcleo de 80% é calculado por disciplina após a seleção das fases', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', globalPace: null, subjectPaces: {},
    subjectPhases: { a: 1, b: 2 },
    lessons: {
      a1: { totalPages: 10, readPages: 0, incidence: 80 },
      a2: { totalPages: 10, readPages: 0, incidence: 20 },
      b1: { totalPages: 10, readPages: 0, incidence: 90 },
      b2: { totalPages: 10, readPages: 0, incidence: 10 },
    },
  }, 'base');
  const subjects = new Map([['a1', 'a'], ['a2', 'a'], ['b1', 'b'], ['b2', 'b']]);
  assert.deepEqual([...filterStudySubjects(data, subjects, [1], true).keys()], ['a1']);
  assert.deepEqual([...filterStudySubjects(data, subjects, [1, 2], true).keys()], ['a1', 'b1']);
});

test('incidência por cartão melhora o custo-benefício sem ultrapassar o orçamento', () => {
  const rows = [
    { id: 'low', cardIds: ['a', 'b'], overdue: false, reviewDue: false, accuracy: null, incidence: 1 },
    { id: 'high', cardIds: ['c', 'd'], overdue: false, reviewDue: false, accuracy: null, incidence: 20 },
  ];
  const result = buildReviewBlocks(rows, 1, 30);
  assert.equal(result[0].lessons[0].id, 'high');
  assert.equal(result.reduce((sum, block) => sum + block.minutes, 0), 1);
});
