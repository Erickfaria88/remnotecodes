export interface ExerciseResult {
  correct: number;
  incorrect: number;
}

export function validExerciseResult(value: unknown): value is ExerciseResult {
  if (!value || typeof value !== 'object') return false;
  const { correct, incorrect } = value as ExerciseResult;
  return Number.isSafeInteger(correct) && correct >= 0 &&
    Number.isSafeInteger(incorrect) && incorrect >= 0 &&
    Number.isSafeInteger(correct + incorrect) && correct + incorrect > 0;
}

const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function exerciseAccuracy({ correct, incorrect }: ExerciseResult): { band: 'green' | 'yellow' | 'red'; percent: string } {
  const ratio = correct / (correct + incorrect);
  const band = ratio >= 0.8 ? 'green' : ratio >= 0.6 ? 'yellow' : 'red';
  const percent = format.format(Math.floor(ratio * 10_000 + 1e-10) / 100) + '%';
  return { band, percent };
}
