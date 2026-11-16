import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { diversifyLessons } from '../src/diversify-lessons';

test('prioriza matérias diferentes e limita repetições a 60 minutos acumulados', () => {
  const rows = [
    { id: 'a', minutes: 18 }, { id: 'b', minutes: 18 }, { id: 'c', minutes: 24 },
    { id: 'd', minutes: 24 }, { id: 'e', minutes: 1 },
  ];
  const subjects = new Map(rows.map(({ id }) => [id, id === 'c' ? 'Reforma' : 'Tributário']));
  assert.deepEqual(diversifyLessons(rows, subjects).map(({ id }) => id), ['a', 'c', 'b', 'd']);
});

test('mantém a primeira aula sem estimativa e não admite repetição sem tempo confirmado', () => {
  const rows = [{ id: 'a', minutes: null }, { id: 'b', minutes: 5 }, { id: 'c', minutes: 70 }];
  const subjects = new Map([['a', 'A'], ['b', 'A'], ['c', 'B']]);
  assert.deepEqual(diversifyLessons(rows, subjects).map(({ id }) => id), ['a', 'c']);
});
