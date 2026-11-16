export const studySteps = [
  { id: 'theory', label: 'Teoria' },
  { id: 'literal', label: 'Literais' },
  { id: 'flashcard', label: 'Flashcard' },
  { id: 'strategic', label: 'Passo Estratégico' },
] as const;

export type StudyStep = typeof studySteps[number]['id'];

export function validStudySteps(value: unknown): value is StudyStep[] {
  return Array.isArray(value) && value.every((id) => studySteps.some((step) => step.id === id));
}
