import type { Backup } from './remnote/storage';
import { exerciseAccuracy } from './exercise-results';

export function attentionLessons(data: Backup, subjects: Map<string, string>, minimumQuestions: number) {
  return Object.entries(data.exercises).flatMap(([id, result]) => {
    const total = result.correct + result.incorrect;
    const subject = subjects.get(id);
    if (!subject || total < minimumQuestions || result.correct / total >= 0.8) return [];
    return [{
      id, total, correct: result.correct, incorrect: result.incorrect,
      ratio: result.correct / total, ...exerciseAccuracy(result),
      stars: data.lessons[id]?.stars ?? 0,
      phase: data.subjectPhases[subject] ?? null,
    }];
  }).sort((a, b) => a.ratio - b.ratio || b.stars - a.stars ||
    (a.phase ?? Infinity) - (b.phase ?? Infinity) || b.total - a.total || a.id.localeCompare(b.id));
}
