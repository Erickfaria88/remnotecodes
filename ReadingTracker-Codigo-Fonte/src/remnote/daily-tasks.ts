import type { RNPlugin, PluginRem, RichTextInterface } from '@remnote/plugin-sdk';

export interface DailyTask {
  id: string;
  title: string;
  subjectId: string;
  subject: string;
  remaining: number;
  minutes: number | null;
}

const heading = 'Reading Tracker · Quase concluídas';

async function append(plugin: RNPlugin, parent: PluginRem, text: RichTextInterface) {
  const rem = await plugin.rem.createRem();
  if (!rem) throw new Error('O RemNote não conseguiu criar o item.');
  await rem.setParent(parent);
  await rem.setText(text);
  return rem;
}

export async function publishDailyTasks(plugin: RNPlugin, baseId: string, rows: readonly DailyTask[]) {
  if (!rows.length) throw new Error('Selecione pelo menos uma aula.');
  const active = await plugin.kb.getCurrentKnowledgeBaseData();
  if (active?._id !== baseId) throw new Error('A base ativa mudou. Reabra o painel.');

  const today = await plugin.date.getTodaysDoc();
  if (!today) throw new Error('Abra a Nota de hoje (Alt+D no Windows) e tente novamente.');

  const sections = (await today.getChildrenRem()).filter((rem) =>
    rem.text?.length === 1 && rem.text[0] === heading);
  const existing = new Map<string, PluginRem>();
  const groups = new Map<string, PluginRem>();
  for (const section of sections) {
    for (const group of await section.getChildrenRem()) {
      const references = group.text && await plugin.richText.getRemIdsFromRichText(group.text);
      if (references?.length === 1) groups.set(references[0], group);
      for (const task of await group.getChildrenRem()) {
        const ids = task.text && await plugin.richText.getRemIdsFromRichText(task.text);
        if (ids?.length === 1) existing.set(ids[0], task);
      }
    }
  }

  let section = sections[0];
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const match = existing.get(row.id);
    if (match && await match.isTodo()) {
      skipped++;
      continue;
    }
    if (match) {
      await match.setIsTodo(true);
    } else {
      let group = groups.get(row.subjectId);
      if (!group) {
        section ??= await append(plugin, today, [heading]);
        const text = await plugin.richText.rem(row.subjectId).value();
        group = await append(plugin, section, text);
        groups.set(row.subjectId, group);
      }
      const duration = row.minutes === null ? '' : ' · ~' + Math.ceil(row.minutes) + ' min';
      const text = await plugin.richText.text('Retomar ').rem(row.id)
        .text(' · faltam ' + row.remaining + ' páginas' + duration).value();
      const task = await append(plugin, group, text);
      await task.setIsTodo(true);
      existing.set(row.id, task);
    }
    created++;
  }
  return { created, skipped, today };
}
