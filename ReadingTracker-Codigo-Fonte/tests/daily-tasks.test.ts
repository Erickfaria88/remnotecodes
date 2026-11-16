import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { publishDailyTasks } from '../src/remnote/daily-tasks';

class FakeRem {
  children: FakeRem[] = [];
  text: string[] = [];
  todo = false;
  async getChildrenRem() { return this.children; }
  async setParent(parent: FakeRem) { parent.children.push(this); }
  async setText(text: string[]) { this.text = text; }
  async setIsTodo(todo: boolean) { this.todo = todo; }
  async isTodo() { return this.todo; }
}

function fakePlugin() {
  const today = new FakeRem();
  const builder = (...values: string[]) => ({
    text: (text: string) => builder(...values, text),
    rem: (id: string) => builder(...values, '@' + id),
    value: async () => values,
  });
  const plugin = {
    kb: { getCurrentKnowledgeBaseData: async () => ({ _id: 'test' }) },
    date: { getTodaysDoc: async () => today },
    app: { transaction: async (fn: () => Promise<unknown>) => { await fn(); } },
    rem: { createRem: async () => new FakeRem() },
    richText: { ...builder(), getRemIdsFromRichText: async (text: string[]) =>
      text.filter((part) => part.startsWith('@')).map((part) => part.slice(1)) },
  };
  return { today, plugin: plugin as unknown as RNPlugin };
}

const rows = [
  { id: 'a', title: 'Aula A', subject: 'Disciplina', subjectId: 'd', remaining: 10, minutes: 20 },
  { id: 'b', title: 'Aula B', subject: 'Disciplina', subjectId: 'd', remaining: 5, minutes: null },
];

test('gera tarefas com referências agrupadas e não duplica em novo envio', async () => {
  const { today, plugin } = fakePlugin();
  assert.equal((await publishDailyTasks(plugin, 'test', rows)).created, 2);
  assert.equal((await publishDailyTasks(plugin, 'test', rows)).skipped, 2);
  assert.equal(today.children.length, 1);
  const [group] = today.children[0].children;
  assert.deepEqual(group.text, ['@d']);
  assert.equal(group.children.length, 2);
  assert.ok(group.children.every((rem) => rem.todo));
  assert.ok(group.children[0].text.includes('@a'));
});

test('recusa gravação em outra base', async () => {
  const { today, plugin } = fakePlugin();
  await assert.rejects(publishDailyTasks(plugin, 'outra', rows), /base ativa mudou/);
  assert.equal(today.children.length, 0);
});
