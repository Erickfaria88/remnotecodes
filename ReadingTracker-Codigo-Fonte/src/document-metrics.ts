import type { Backup } from './remnote/storage';
import { summarize } from './progress';
import { studySteps } from './study-steps';
import { exerciseAccuracy } from './exercise-results';

export function documentMetrics(data: Backup, documentId: string, lessonIds: string[], role:'auto'|'lesson'|'subject'='auto') {
  const registeredChildren = lessonIds.filter((id) => data.lessons[id] || data.exercises[id]);
  const ids = role==='lesson'?[documentId]:registeredChildren.length ? registeredChildren : [documentId];
  const records = ids.flatMap((id) => data.lessons[id] ? [data.lessons[id]] : []);
  const results = ids.flatMap((id) => data.exercises[id] ? [data.exercises[id]] : []);
  const exercises = results.reduce((total, result) => ({
    correct: total.correct + result.correct,
    incorrect: total.incorrect + result.incorrect,
  }), { correct: 0, incorrect: 0 });
  const steps = records.length ? studySteps.filter((step) =>
    ids.every((id) => data.lessons[id]?.completedSteps?.includes(step.id))).map((step) => step.id) : null;
  return {
    ...summarize(records, null),
    steps,
    exercise: results.length ? { ...exerciseAccuracy(exercises), total: exercises.correct + exercises.incorrect } : null,
  };
}

/** Legacy records on a discipline must not override its children; a registered lesson owns its metrics. */
export function progressRole(data:Backup,id:string,children:string[]):'lesson'|'subject' {
 const knownSubject=data.subjectPhases[id]!==undefined||data.subjectPaces[id]!==undefined||Object.values(data.sessions??{}).some(s=>s.subjectId===id);
 if(knownSubject)return 'subject';
 if(data.lessons[id]||data.exercises[id])return 'lesson';
 return children.some(child=>data.lessons[child]||data.exercises[child])?'subject':'lesson';
}
