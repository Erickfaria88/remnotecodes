import type { Backup } from './remnote/storage';
import { exerciseAccuracy } from './exercise-results';

export function attentionLessons(data: Backup, subjects: Map<string, string>, minimumQuestions: number) {
  return [...subjects.keys()].flatMap((id) => {
    const result = data.exercises[id];
    const total = result ? result.correct + result.incorrect : 0;
    const subject = subjects.get(id);
    const ratio = result ? result.correct / total : null;
    if (!subject || total >= minimumQuestions && ratio !== null && ratio >= 0.8) return [];
    const reason = total === 0 ? 'Sem exercícios cadastrados' :
      total < minimumQuestions ? 'Poucos exercícios cadastrados' : 'Baixo percentual de acertos';
    return [{
      id, total, correct: result?.correct ?? 0, incorrect: result?.incorrect ?? 0, reason,
      ratio, ...(result ? exerciseAccuracy(result) : { percent: 'Sem avaliação', band: 'yellow' as const }),
      stars: data.lessons[id]?.stars ?? 0,
      phase: data.subjectPhases[subject] ?? null,
    }];
  }).sort((a, b) => (a.phase ?? Infinity) - (b.phase ?? Infinity) || b.stars - a.stars ||
    (a.ratio ?? 0.8) - (b.ratio ?? 0.8) || a.total - b.total || a.id.localeCompare(b.id));
}
