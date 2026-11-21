import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildReviewBlocks, reviewBudget, type ReviewCandidate } from '../src/review-plan';
import { createRepository } from '../src/remnote/storage';
import { loadReviewCards } from '../src/remnote/review-cards';
import type { RNPlugin } from '@remnote/plugin-sdk';

const candidate = (id: string, count: number, changes: Partial<ReviewCandidate> = {}): ReviewCandidate => ({
  id, cardIds: Array.from({ length: count }, (_, i) => id + i), overdue: false,
  reviewDue: false, accuracy: null, ...changes,
});

test('divide 4h30 em 90min de revisão e 180min de avanço e limita os blocos a 30min', () => {
  assert.deepEqual(reviewBudget(270, 100 / 3), { review: 90, study: 180 });
  assert.deepEqual(reviewBudget(270, 30), { review: 81, study: 189 });
  const blocks = buildReviewBlocks([candidate('a', 150), candidate('b', 60)], 90, 30);
  assert.equal(blocks.reduce((sum, block) => sum + block.cards, 0), 180);
  assert.ok(blocks.every((block) => block.minutes <= 30));
  assert.equal(blocks.reduce((sum, block) => sum + block.minutes, 0), 90);
});

test('prioriza revisão vencida e atrasados, agrupa filas pequenas e elimina cartões duplicados', () => {
  const blocks = buildReviewBlocks([
    candidate('easy', 10), candidate('due', 20, { reviewDue: true }),
    candidate('late', 15, { overdue: true }), candidate('duplicate', 20, { cardIds: ['due0'] }),
  ], 90, 30);
  assert.equal(blocks[0].lessons[0].id, 'due');
  const ids = blocks.flatMap((block) => block.lessons.flatMap((lesson) => lesson.cardIds));
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(ids.length, 45);
  assert.deepEqual(buildReviewBlocks([candidate('a', 30)], 0, 30), []);
  assert.equal(buildReviewBlocks([candidate('a', 100)], 15, 60)[0].cards, 15);
});

test('persiste configuração da revisão, valida limites e mantém isolamento entre bases', async () => {
  const values = new Map<string, unknown>();
  const storage = {
    async getSynced<T>(key: string) { return values.get(key) as T; },
    async setSynced(key: string, value: unknown) { values.set(key, JSON.parse(JSON.stringify(value))); },
  };
  const repo = createRepository(storage, 'a');
  assert.equal((await repo.load()).secondsPerCard, 30);
  await repo.saveReviewSettings(30, 45);
  assert.equal((await createRepository(storage, 'a').load()).reviewShare, 30);
  assert.equal((await createRepository(storage, 'b').load()).secondsPerCard, 30);
  await assert.rejects(repo.saveReviewSettings(101, 30));
  await assert.rejects(repo.saveReviewSettings(30, 0));
  assert.equal((await repo.load()).secondsPerCard, 45);
});

test('consulta cartões devidos de descendentes, exclui futuros e prática desativada', async () => {
  const now = new Date(2026, 10, 20, 12);
  const today = new Date(2026, 10, 20, 0).getTime();
  const cards = [
    { _id: 'due', remId: 'child', nextRepetitionTime: today + 1000, type: 'forward' },
    { _id: 'late', remId: 'child', nextRepetitionTime: today - 1, type: 'backward' },
    { _id: 'future', remId: 'child', nextRepetitionTime: today + 86400000, type: 'forward' },
    { _id: 'new', remId: 'child', type: 'forward' },
    { _id: 'disabled', remId: 'disabled', nextRepetitionTime: today, type: 'forward' },
  ];
  const rems = [
    { _id: 'child', parent: 'lesson', getEnablePractice: async () => true, getPracticeDirection: async () => 'both',
      getTagRems: async () => [{ _id: 'focus' }], ancestorTagRem: async () => [{ _id: 'focus' }, { _id: 'inherited' }] },
    { _id: 'disabled', parent: 'lesson', getEnablePractice: async () => false, getPracticeDirection: async () => 'both' },
    { _id: 'lesson', parent: null },
  ];
  const plugin = {
    kb: { getCurrentKnowledgeBaseData: async () => ({ _id: 'base' }) },
    card: { getAll: async () => cards },
    rem: { findMany: async (ids: string[]) => rems.filter((rem) => ids.includes(rem._id)) },
  } as unknown as RNPlugin;
  const result = await loadReviewCards(plugin, 'base', ['lesson'], now);
  assert.deepEqual(result.get('lesson'), { cardIds: ['due', 'late'], overdue: true });
  assert.equal((await loadReviewCards(plugin, 'base', ['lesson'], now, { id: 'focus', includeInherited: false })).get('lesson')?.cardIds.length, 2);
  assert.equal((await loadReviewCards(plugin, 'base', ['lesson'], now, { id: 'inherited', includeInherited: false })).size, 0);
  assert.equal((await loadReviewCards(plugin, 'base', ['lesson'], now, { id: 'inherited', includeInherited: true })).get('lesson')?.cardIds.length, 2);
  await assert.rejects(loadReviewCards(plugin, 'other', ['lesson'], now));
});
