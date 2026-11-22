export interface ReviewCandidate {
  id: string;
  cardIds: string[];
  overdue: boolean;
  reviewDue: boolean;
  accuracy: number | null;
  incidence?: number;
}

export function reviewBudget(dailyMinutes: number, share: number) {
  const review = Math.round(dailyMinutes * share / 100);
  return { review, study: dailyMinutes - review };
}

export function orderReviewCandidates(candidates: ReviewCandidate[]) {
  return [...candidates].sort((a, b) =>
    Number(b.reviewDue) - Number(a.reviewDue) || Number(b.overdue) - Number(a.overdue) ||
    (b.incidence ?? 0) / Math.max(1, b.cardIds.length) - (a.incidence ?? 0) / Math.max(1, a.cardIds.length) ||
    (a.accuracy ?? 1) - (b.accuracy ?? 1) || a.cardIds.length - b.cardIds.length || a.id.localeCompare(b.id));
}
export function buildReviewBlocks(candidates: ReviewCandidate[], minutes: number, secondsPerCard: number,limits?:ReviewSubjectLimits) {
  const capacity = Math.floor(minutes * 60 / secondsPerCard);
  const maximum = Math.max(1, Math.floor(30 * 60 / secondsPerCard));
  const minimum = Math.max(1, Math.floor(15 * 60 / secondsPerCard));
  const ordered=orderReviewCandidates(candidates);
  const blocks: { lessons: { id: string; cardIds: string[] }[]; cards: number; minutes: number }[] = [];
  const seen = new Set<string>();
  const used:Record<string,number>=Object.create(null);
  let remaining = capacity;
  for (const lesson of ordered) {
    const cards = lesson.cardIds.filter((id) => !seen.has(id));
    cards.forEach((id) => seen.add(id));
    while (cards.length && remaining > 0) {
      const subject=limits?.subjectByLesson.get(lesson.id);
      const room=subject?Math.floor(((limits?.remainingSeconds[subject]??Infinity)-(used[subject]??0))/secondsPerCard):Infinity;
      if(room<1)break;
      let block = blocks[blocks.length - 1];
      if (!block || block.cards >= minimum) {
        block = { lessons: [], cards: 0, minutes: 0 };
        blocks.push(block);
      }
      const selected = cards.splice(0, Math.min(maximum - block.cards, remaining,room));
      block.lessons.push({ id: lesson.id, cardIds: selected });
      block.cards += selected.length;
      block.minutes = block.cards * secondsPerCard / 60;
      remaining -= selected.length;
      if(subject)used[subject]=(used[subject]??0)+selected.length*secondsPerCard;
    }
  }
  return blocks;
}
import type {ReviewSubjectLimits} from './subject-budget';
