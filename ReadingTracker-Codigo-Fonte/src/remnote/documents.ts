import type { RNPlugin, PluginRem } from '@remnote/plugin-sdk';

export async function documentTitle(plugin: RNPlugin, rem: PluginRem) {
  return rem.text ? (await plugin.richText.toString(rem.text)).trim() || 'Sem título' : 'Sem título';
}

export async function searchSubjects(plugin: RNPlugin, query: string) {
  const results = await plugin.search.search([query], undefined, { numResults: 30 });
  const documents = await onlyDocuments(results);
  return Promise.all(documents.map(async (rem) => {
    const parent = await rem.getParentRem();
    return { rem, title: await documentTitle(plugin, rem), parent: parent && await documentTitle(plugin, parent) };
  }));
}

async function onlyDocuments(rems: PluginRem[]) {
  const flags = await Promise.all(rems.map((rem) => rem.isDocument()));
  return rems.filter((_, index) => flags[index]);
}

export async function loadLessons(plugin: RNPlugin, subjectId: string) {
  const subject = await plugin.rem.findOne(subjectId);
  if (!subject || !(await subject.isDocument())) throw new Error('Disciplina indisponível.');
  const ids = subject.children ?? [];
  const children = ids.length ? await plugin.rem.findMany(ids) : [];
  if (!children) throw new Error('Não foi possível consultar as aulas.');
  const documents = await onlyDocuments(children.filter((rem) => rem?.parent === subjectId));
  const order = new Map(ids.map((id, index) => [id, index]));
  documents.sort((a, b) => order.get(a._id)! - order.get(b._id)!);
  return Promise.all(documents.map(async (rem) => ({ rem, title: await documentTitle(plugin, rem) })));
}
