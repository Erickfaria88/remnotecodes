import type { RNPlugin, PluginRem } from '@remnote/plugin-sdk';
import type { Backup } from './storage';
import type { ReviewCandidate } from '../review-plan';
import { studyDay } from '../resume';
import {selectedReviewTags, type ReviewTagFilter } from '../study-scope';

export async function loadReviewCards(plugin: RNPlugin, baseId: string, lessonIds: string[], now = new Date(),
  tag?: Pick<ReviewTagFilter, 'id' | 'includeInherited' | 'tags'>) {
  if ((await plugin.kb.getCurrentKnowledgeBaseData())._id !== baseId) throw new Error('A base ativa mudou.');
  const lessons = new Set(lessonIds);
  if (!lessons.size) return new Map<string, { cardIds: string[]; overdue: boolean }>();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const all = await plugin.card.getAll();
  const due = all.filter((card) => typeof card.nextRepetitionTime === 'number' &&
    Number.isFinite(card.nextRepetitionTime) && card.nextRepetitionTime > 0 && card.nextRepetitionTime < end.getTime());
  const cache = new Map<string, PluginRem | undefined>();
  const ids = [...new Set(due.map((card) => card.remId))];
  let frontier = ids;
  while (frontier.length) {
    const next = new Set<string>();
    for (let offset = 0; offset < frontier.length; offset += 100) {
      const batch = frontier.slice(offset, offset + 100);
      const rems = await plugin.rem.findMany(batch);
      batch.forEach((id) => cache.set(id, undefined));
      for (const rem of rems ?? []) {
        cache.set(rem._id, rem);
        if (!lessons.has(rem._id) && rem.parent && !cache.has(rem.parent)) next.add(rem.parent);
      }
    }
    frontier = [...next].filter((id) => !cache.has(id));
  }
  const enabled = new Map<string, boolean>();
  const directions = new Map<string, string>();
  const owners = new Map<string, string>();
  for (const remId of ids) {
    let id: string | null | undefined = remId;
    const seen = new Set<string>();
    while (id && !lessons.has(id) && !seen.has(id)) { seen.add(id); id = cache.get(id)?.parent; }
    if (id && lessons.has(id)) owners.set(remId, id);
  }
  const selectedTags=new Set(selectedReviewTags(tag).map(t=>t.id));
  const tagged = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 16) {
    await Promise.all(ids.slice(offset, offset + 16).map(async (id) => {
      const rem = cache.get(id);
      if (!owners.has(id)) return;
      enabled.set(id, rem ? await rem.getEnablePractice() : false);
      if (rem) directions.set(id, await rem.getPracticeDirection());
      if (rem && tag && enabled.get(id)) {
        const tags = tag.includeInherited ? await rem.ancestorTagRem() : await rem.getTagRems();
        if (tags.some((row) => selectedTags.has(row._id))) tagged.add(id);
      }
    }));
  }
  const grouped = new Map<string, { cardIds: string[]; overdue: boolean }>();
  for (const card of due) {
    if (!enabled.get(card.remId)) continue;
    if (tag && !tagged.has(card.remId)) continue;
    const direction = directions.get(card.remId);
    if (typeof card.type === 'string' && direction !== 'both' && direction !== card.type) continue;
    const id = owners.get(card.remId);
    if (!id || !lessons.has(id)) continue;
    const group = grouped.get(id) ?? { cardIds: [], overdue: false };
    group.cardIds.push(card._id);
    group.overdue ||= card.nextRepetitionTime! < start.getTime();
    grouped.set(id, group);
  }
  if ((await plugin.kb.getCurrentKnowledgeBaseData())._id !== baseId) throw new Error('A base ativa mudou.');
  return grouped;
}

export function reviewCandidates(data: Backup, grouped: Map<string, { cardIds: string[]; overdue: boolean }>): ReviewCandidate[] {
  const today = studyDay();
  return [...grouped].map(([id, row]) => {
    const result = data.exercises[id];
    return {
      id, ...row,
      reviewDue: Object.values(data.reviews).some((review) => review.lessonId === id && !review.doneOn && review.dueOn <= today),
      accuracy: result ? result.correct / (result.correct + result.incorrect) : null,
      incidence: data.lessons[id]?.incidence,
    };
  });
}

