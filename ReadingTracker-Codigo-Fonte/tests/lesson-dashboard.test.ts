import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { lessonRequestKey, openLessonDashboard } from '../src/remnote/lesson-dashboard';

test('abre o dashboard com a aula associada à base e publica a seleção antes de navegar', async () => {
  const actions: string[] = [];
  const note = { _id: 'dashboard', isDocument: async () => true };
  let request: { lessonId: string; token: string } | undefined;
  const plugin = {
    kb: { getCurrentKnowledgeBaseData: async () => ({ _id: 'base' }) },
    rem: { findByName: async () => note },
    storage: { setSession: async (key: string, value: typeof request) => {
      assert.equal(key, lessonRequestKey('base'));
      request = value;
      actions.push('select');
    } },
    window: { openRem: async (value: unknown) => { assert.equal(value, note); actions.push('open'); } },
  } as unknown as RNPlugin;
  await openLessonDashboard(plugin, 'lesson');
  assert.deepEqual(actions, ['select', 'open']);
  assert.equal(request?.lessonId, 'lesson');
  assert.ok(request?.token);
});
