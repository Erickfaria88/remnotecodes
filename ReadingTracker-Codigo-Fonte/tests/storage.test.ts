import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRepository } from '../src/remnote/storage';

function storageDouble() {
  const synced = new Map<string, string>();
  return {
    async getSynced<T>(key: string): Promise<T | undefined> {
      const data = synced.get(key);
      return data === undefined ? undefined : JSON.parse(data) as T;
    },
    async setSynced(key: string, value: unknown) {
      synced.set(key, JSON.stringify(value));
    },
  };
}

test('persiste registros por ID e distingue zero de ausência após recriar o repositório', async () => {
  const storage = storageDouble();
  const first = createRepository(storage, 'base-a');
  await first.saveLesson('aula-1', { totalPages: 17, readPages: 0 });
  const { lessons } = await createRepository(storage, 'base-a').load();
  assert.deepEqual(lessons['aula-1'], { totalPages: 17, readPages: 0 });
  assert.equal(lessons['aula-2'], undefined);
});

test('isola aulas e ritmos de duas bases no mesmo armazenamento sincronizado', async () => {
  const storage = storageDouble();
  const a = createRepository(storage, 'base-a');
  const b = createRepository(storage, 'base-b');
  await a.saveLesson('id-comum', { totalPages: 30, readPages: 5 });
  await b.saveLesson('id-comum', { totalPages: 80, readPages: 20 });
  await a.savePace(null, 30);
  await a.savePace('materia', 20);
  assert.equal((await a.load()).lessons['id-comum'].readPages, 5);
  assert.equal((await b.load()).lessons['id-comum'].readPages, 20);
  assert.equal((await b.load()).globalPace, null);
  assert.equal((await b.load()).subjectPaces.materia, undefined);
});

test('serializa gravações do mesmo painel e remove o ritmo específico ao limpar', async () => {
  const repo = createRepository(storageDouble(), 'base-a');
  await Promise.all([
    repo.saveLesson('aula-1', { totalPages: 10, readPages: 10 }),
    repo.saveLesson('aula-2', { totalPages: 90, readPages: 0 }),
    repo.savePace(null, 30),
    repo.savePace('materia', 20),
  ]);
  assert.deepEqual(Object.keys((await repo.load()).lessons), ['aula-1', 'aula-2']);
  assert.equal((await repo.load()).subjectPaces.materia, 20);
  await repo.savePace('materia', null);
  assert.equal((await repo.load()).subjectPaces.materia, undefined);
  assert.equal((await repo.load()).globalPace, 30);
});

test('exporta e restaura dados JSON da mesma base', async () => {
  const repo = createRepository(storageDouble(), 'base-a');
  await repo.saveLesson('aula-1', { totalPages: 10, readPages: 3 });
  await repo.savePace(null, 30);
  await repo.savePace('materia', 20);
  const exported = JSON.stringify(await repo.load());
  await repo.saveLesson('aula-2', { totalPages: 90, readPages: 80 });
  await repo.savePace(null, null);
  assert.equal(JSON.stringify(await repo.restore(JSON.parse(exported))), exported);
  assert.equal(JSON.stringify(await repo.load()), exported);
});

test('rejeita base diferente, esquema e registros inválidos sem gravação parcial', async () => {
  const repo = createRepository(storageDouble(), 'base-a');
  const baseline = await repo.saveLesson('aula-1', { totalPages: 10, readPages: 3 });
  for (const bad of [
    { ...baseline, baseId: 'base-b' },
    { ...baseline, version: 6 },
    { ...baseline, lessons: { bad: { totalPages: 5, readPages: 10 } } },
    { ...baseline, globalPace: 0 },
    { ...baseline, subjectPaces: { materia: '30' } },
    { ...baseline, lessons: JSON.parse('{"__proto__":{"totalPages":1,"readPages":0}}') },
  ]) {
    await assert.rejects(repo.restore(bad));
    assert.deepEqual(await repo.load(), baseline);
  }
  await repo.savePace(null, 15);
  assert.equal((await repo.load()).globalPace, 15);
});

test('uma falha do SDK não apaga dados e permite nova tentativa', async () => {
  const storage = storageDouble();
  let fail = true;
  const repo = createRepository({
    ...storage,
    async setSynced(key, value) {
      if (fail) throw new Error('falha simulada');
      await storage.setSynced(key, value);
    },
  }, 'base-a');
  await assert.rejects(repo.savePace(null, 30), /falha simulada/);
  assert.equal((await repo.load()).globalPace, null);
  fail = false;
  await repo.savePace(null, 30);
  assert.equal((await repo.load()).globalPace, 30);
});

test('trata null retornado pelo SDK como chave ainda vazia, sem gravar nem aceitar backup nulo', async () => {
  const storage = storageDouble();
  let writes = 0;
  const repo = createRepository({
    async getSynced<T>(key: string) {
      return (await storage.getSynced<T>(key)) ?? (null as T);
    },
    async setSynced(key, value) {
      writes++;
      await storage.setSynced(key, value);
    },
  }, 'base-a');
  assert.deepEqual(Object.keys((await repo.load()).lessons), []);
  await assert.rejects(repo.restore(null));
  assert.equal(writes, 0);
  await repo.saveLesson('aula-1', { totalPages: 10, readPages: 0 });
  assert.equal((await repo.load()).lessons['aula-1'].readPages, 0);
  assert.equal(writes, 1);
});

test('preserva dados existentes com versão desconhecida', async () => {
  const storage = storageDouble();
  const key = 'reading-tracker:v1:base-a';
  await storage.setSynced(key, { version: 6, baseId: 'base-a' });
  const repo = createRepository(storage, 'base-a');
  await assert.rejects(repo.load(), /versão incompatível/);
  await assert.rejects(repo.savePace(null, 30), /versão incompatível/);
  assert.deepEqual(await storage.getSynced(key), { version: 6, baseId: 'base-a' });
});
