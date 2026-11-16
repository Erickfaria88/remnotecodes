import { useState, type FormEvent } from 'react';
import { validProgress, type Progress } from '../progress';
import { calendarReminder, googleCalendarUrl, studyDay, validStudyDay, type ReadingRecord } from '../resume';

import { studySteps, type StudyStep } from '../study-steps';

interface Props {
  title: string;
  progress: ReadingRecord | undefined;
  busy: boolean;
  calendarId: string;
  lessonId: string;
  onSave: (progress: Progress, resumeOn?: string | null, stars?: number | null, steps?: StudyStep[]) => Promise<void>;
}

export function LessonForm({ title, progress, busy, calendarId, lessonId, onSave }: Props) {
  const [total, setTotal] = useState(progress?.totalPages.toString() ?? '');
  const [read, setRead] = useState(progress?.readPages.toString() ?? '0');
  const [error, setError] = useState('');
  const [day, setDay] = useState(progress?.resumeOn ?? '');
  const [stars, setStars] = useState(progress?.stars?.toString() ?? '');
  const [steps, setSteps] = useState(progress?.completedSteps ?? []);
  const [time, setTime] = useState('09:00');
  const [calendar, setCalendar] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const today = studyDay();
  const incomplete = Number(read) < Number(total);

  function prepareGoogleEvent() {
    if (!progress?.resumeOn) return;
    try {
      setGoogleUrl(googleCalendarUrl({
        title, day: progress.resumeOn, time, lessonId,
        remaining: progress.totalPages - progress.readPages,
      }));
      setError('');
    } catch (cause) {
      setGoogleUrl('');
      setError(cause instanceof Error ? cause.message : 'Falha ao preparar o evento.');
    }
  }

  function exportReminder() {
    if (!progress || progress.readPages >= progress.totalPages) return;
    try {
      const content = calendarReminder({
        id: calendarId, title, day: progress.resumeOn ?? day, time,
        remaining: progress.totalPages - progress.readPages,
      });
      setError('');
      setCalendar(content);
      const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'retomar-estudos.ics';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao exportar o lembrete.');
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next = { totalPages: Number(total), readPages: Number(read) };
    if (!read.trim() || !validProgress(next)) {
      setError('Informe números inteiros. O total deve ser positivo e as páginas lidas devem estar entre zero e o total.');
      return;
    }
    setError('');
    if (day && !validStudyDay(day)) {
      setError('Escolha uma data válida para a retomada.');
      return;
    }
    await onSave(next, day || null, stars === '' ? null : Number(stars), steps);
  }

  return <form onSubmit={submit}>
    <h3>{title}</h3>
    <div className="fields">
      <label>Páginas totais<input type="number" min="1" step="1" required value={total}
        onChange={(event) => setTotal(event.target.value)} /></label>
      <label>Páginas lidas<input type="number" min="0" step="1" required value={read}
        onChange={(event) => setRead(event.target.value)} /></label>
    </div>
    <label>Importância para a prova
      <select value={stars} onChange={(event) => setStars(event.target.value)}>
        <option value="">Sem classificação</option>
        {[0, 1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>
          {'★'.repeat(level) + '☆'.repeat(5 - level)} · {level}/5
        </option>)}
      </select>
    </label>
    <fieldset className="rt-study-steps" disabled={busy}>
      <legend>Etapas do estudo</legend>
      {studySteps.map(({ id, label }) => <label key={id}>
        <input type="checkbox" checked={steps.includes(id)} onChange={(event) => {
          const checked = event.currentTarget.checked;
          setSteps((current) => checked ? [...current, id] : current.filter((step) => step !== id));
        }} />
        {label}
      </label>)}
    </fieldset>
    {incomplete && <div>
      <label>Data de retomada<input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label>
      <button type="button" disabled={busy} onClick={() => setDay(studyDay(1))}>Retomar amanhã</button>
      {day && <button type="button" disabled={busy} onClick={() => setDay('')}>Limpar data</button>}
    </div>}
    {progress?.resumeOn && progress.resumeOn >= today && incomplete && <details>
      <summary>Notificação pelo calendário</summary>
      <label>Horário local<input type="time" value={time} onChange={(event) => { setTime(event.target.value); setGoogleUrl(''); }} /></label>
      <button type="button" disabled={busy} onClick={prepareGoogleEvent}>Preparar evento no Google Calendar</button>
      {googleUrl && <div>
        <a className="rt-link" href={googleUrl} target="_blank" rel="noopener noreferrer">Abrir no Google Calendar</a>
        <p>Confira o calendário e o alerta antes de salvar o evento.</p>
        <label>Link do evento<textarea readOnly rows={2} value={googleUrl}
          onFocus={(event) => event.currentTarget.select()} /></label>
      </div>}
      <button type="button" disabled={busy} onClick={exportReminder}>Baixar lembrete (.ics)</button>
      <p>Importe o arquivo no seu calendário e confira se o alerta está ativado.</p>
      {calendar && <label>Conteúdo do arquivo .ics<textarea rows={5} readOnly value={calendar}
        onFocus={(event) => event.currentTarget.select()} /></label>}
    </details>}
    {error && <p role="alert">{error}</p>}
    <button className="rt-primary" disabled={busy}>Salvar progresso</button>
  </form>;
}
