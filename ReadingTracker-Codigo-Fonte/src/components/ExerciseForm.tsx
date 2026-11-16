import { useState } from 'react';
import { exerciseAccuracy, validExerciseResult, type ExerciseResult } from '../exercise-results';

export function ExerciseForm({ result, busy, onSave }: {
  result?: ExerciseResult; busy: boolean; onSave: (value: ExerciseResult) => void;
}) {
  const [correct, setCorrect] = useState(result?.correct.toString() ?? '');
  const [incorrect, setIncorrect] = useState(result?.incorrect.toString() ?? '');
  const [error, setError] = useState('');
  const value = { correct: Number(correct), incorrect: Number(incorrect) };
  const valid = correct !== '' && incorrect !== '' && validExerciseResult(value);

  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!valid) {
      setError('Informe números inteiros e pelo menos uma questão respondida.');
      return;
    }
    setError('');
    onSave(value);
  }}>
    <div className="fields">
      <label>Acertos<input type="number" min="0" step="1" required value={correct}
        onChange={(event) => setCorrect(event.target.value)} /></label>
      <label>Erros<input type="number" min="0" step="1" required value={incorrect}
        onChange={(event) => setIncorrect(event.target.value)} /></label>
    </div>
    {valid && <p><strong>{exerciseAccuracy(value).percent} de acerto</strong></p>}
    {error && <p role="alert">{error}</p>}
    <button className="rt-primary" disabled={busy}>Salvar exercícios</button>
  </form>;
}
