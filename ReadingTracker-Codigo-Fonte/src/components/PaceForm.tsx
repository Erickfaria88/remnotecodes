import { useState, type FormEvent } from 'react';
import { validPace } from '../progress';

export function PaceForm({ globalPace, subjectPace, hasSubject, busy, onSave }: {
  globalPace: number | null;
  subjectPace: number | undefined;
  hasSubject: boolean;
  busy: boolean;
  onSave: (scope: 'global' | 'subject', pace: number | null) => Promise<void>;
}) {
  const [global, setGlobal] = useState(globalPace?.toString() ?? '');
  const [subject, setSubject] = useState(subjectPace?.toString() ?? '');
  const [error, setError] = useState('');

  async function submit(event: FormEvent, scope: 'global' | 'subject', raw: string) {
    event.preventDefault();
    const value = raw.trim() ? Number(raw) : null;
    if (value !== null && !validPace(value)) {
      setError('Informe um ritmo positivo em páginas por hora.');
      return;
    }
    setError('');
    await onSave(scope, value);
  }

  return <div className="pace">
    <form onSubmit={(event) => submit(event, 'global', global)}>
      <label>Ritmo global (páginas/h)<input type="number" step="any" value={global}
        onChange={(event) => setGlobal(event.target.value)} /></label>
      <button disabled={busy}>Salvar ritmo global</button>
    </form>
    {hasSubject && <form onSubmit={(event) => submit(event, 'subject', subject)}>
      <label>Ritmo da disciplina (páginas/h)<input type="number" step="any" value={subject}
        placeholder="Usar ritmo global" onChange={(event) => setSubject(event.target.value)} /></label>
      <button disabled={busy}>Salvar ritmo da disciplina</button>
    </form>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
