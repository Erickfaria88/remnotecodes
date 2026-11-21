import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { groupReviews, reviewDate, reviewPages, type ScheduledReview } from '../src/review-agenda';
import { createRepository } from '../src/remnote/storage';

test('calcula o intervalo e agrupa revisões pela data e conclusão', () => {
  const row: ScheduledReview = { lessonId: 'aula', title: 'Aula', subject: 'Direito',
    studiedOn: '2026-11-30', dueOn: reviewDate('2026-11-30', 1), interval: 1, pages: 10 };
  assert.equal(row.dueOn, '2026-12-01');
  assert.equal(reviewPages(21, 30), 10);
  assert.equal(reviewPages(7, 7), 1);
  assert.throws(() => reviewPages(30, 21));
  assert.throws(() => reviewDate('2026-02-30', 1));
  const groups = groupReviews({ a: row, b: { ...row, dueOn: '2026-11-30' },
    c: { ...row, dueOn: '2026-12-02' }, d: { ...row, doneOn: '2026-12-01' } }, '2026-12-01');
  assert.deepEqual(groups.map(({ rows }) => rows.map(([id]) => id)), [['b'], ['a'], ['c'], ['d']]);
});

test('persiste revisão, bloqueia duplicata e mantém conclusão no backup', async () => {
  const store = new Map<string, unknown>();
  const storage = {
    async getSynced<T>(key: string) { return store.get(key) as T | undefined; },
    async setSynced(key: string, value: unknown) { store.set(key, JSON.parse(JSON.stringify(value))); },
  };
  const repo = createRepository(storage, 'a');
  const row = { lessonId: 'aula', title: 'Aula', subject: 'Direito', studiedOn: '2026-11-14',
    dueOn: '2026-11-15', interval: 1, pages: 10 };
  const data = await repo.scheduleReview(row);
  const [id] = Object.keys(data.reviews);
  await assert.rejects(repo.scheduleReview(row), /já tem/);
  assert.equal((await repo.updateReview(id, { dueOn: '2026-11-16' })).reviews[id].dueOn, '2026-11-16');
  await repo.updateReview(id, { pages: 10, firstPage: 21, lastPage: 30 });
  assert.equal((await repo.load()).reviews[id].firstPage, 21);
  assert.equal((await repo.load()).reviews[id].lastPage, 30);
  await repo.updateReview(id, { doneOn: '2026-11-16' });
  await assert.rejects(repo.updateReview(id, { dueOn: '2026-11-17' }), /já foi concluída/);
  assert.equal((await createRepository(storage, 'a').load()).reviews[id].doneOn, '2026-11-16');
  assert.equal(Object.keys((await createRepository(storage, 'b').load()).reviews).length, 0);
});
