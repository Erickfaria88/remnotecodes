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
    app: { registerWidget: async (name: string, _location: string, options: { remIdFilter: string }) => {
      assert.equal(name, 'reading-dashboard');
      assert.equal(options.remIdFilter, note._id);
      actions.push('register');
    } },
    storage: { setSession: async (key: string, value: typeof request) => {
      assert.equal(key, lessonRequestKey('base'));
      request = value;
      actions.push('select');
    } },
    window: { openRem: async (value: unknown) => { assert.equal(value, note); actions.push('open'); } },
  } as unknown as RNPlugin;
  await openLessonDashboard(plugin, 'lesson');
  assert.deepEqual(actions, ['register', 'select', 'open']);
  assert.equal(request?.lessonId, 'lesson');
  assert.ok(request?.token);
});

test('uma falha no registro do painel impede a navegação para um dashboard vazio', async () => {
  let opened = false;
  const plugin = {
    kb: { getCurrentKnowledgeBaseData: async () => ({ _id: 'base' }) },
    rem: { findByName: async () => ({ _id: 'dashboard', isDocument: async () => true }) },
    app: { registerWidget: async () => { throw new Error('registro falhou'); } },
    window: { openRem: async () => { opened = true; } },
  } as unknown as RNPlugin;
  await assert.rejects(openLessonDashboard(plugin, 'lesson'), /registro falhou/);
  assert.equal(opened, false);
});
