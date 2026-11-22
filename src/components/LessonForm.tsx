import { useState, type FormEvent } from 'react';
import { validProgress, type Progress } from '../progress';
import { exerciseAccuracy, validExerciseResult, type ExerciseResult } from '../exercise-results';
import { calendarReminder, googleCalendarUrl, studyDay, validStudyDay, type ReadingRecord } from '../resume';

import { studySteps, type StudyStep } from '../study-steps';
import { incidenceStars, validIncidence } from '../pareto';
import { parseDuration, formatDuration, sessionCategories, type SessionInput } from '../study-sessions';

interface Props {
  title: string;
  progress: ReadingRecord | undefined;
  exercises?: ExerciseResult;
  busy: boolean;
  calendarId: string;
  lessonId: string;
  initialSession?:SessionInput;
  onSave: (progress: Progress | undefined, resumeOn: string | null, stars: number | null,
    steps: StudyStep[], exercises?: ExerciseResult, replaceExercises?: boolean,
    incidence?: number | null, incidenceTopic?: string, session?: SessionInput) => Promise<void>;
}

export function LessonForm({ title, progress, exercises, busy, calendarId, lessonId, onSave, initialSession }: Props) {
  const [total, setTotal] = useState(progress?.totalPages.toString() ?? '');
  const [read, setRead] = useState(progress?.readPages.toString() ?? '0');
  const [correct, setCorrect] = useState('');
  const [incorrect, setIncorrect] = useState('');
  const [correctingExercises, setCorrectingExercises] = useState(false);
  const [incidence, setIncidence] = useState(progress?.incidence?.toString() ?? '');
  const [incidenceTopic, setIncidenceTopic] = useState(progress?.incidenceTopic ?? '');
  const [sessionId] = useState(() => initialSession?.id??crypto.randomUUID());
  const [duration, setDuration] = useState(initialSession?formatDuration(initialSession.seconds):'');
  const [sessionDay, setSessionDay] = useState(initialSession?.day??studyDay());
  const [category, setCategory] = useState<SessionInput['category']>(initialSession?.category??'theory');
  const [counted, setCounted] = useState(initialSession?.counted??true);
  const [note, setNote] = useState(initialSession?.note??'');
  const [firstPage, setFirstPage] = useState('');
  const [lastPage, setLastPage] = useState('');
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
    let session: SessionInput | undefined;
    try {
      if (duration.trim()) {
        if (!validStudyDay(sessionDay) || sessionDay > studyDay()) throw new Error('Escolha hoje ou uma data anterior para o estudo.');
        session = { id: sessionId, seconds: parseDuration(duration.trim()), day: sessionDay, category, counted, note };
      } else if (firstPage || lastPage || note) throw new Error('Informe o tempo da sessão para salvar o trecho e a observação.');
      if (firstPage || lastPage) {
        const start = Number(firstPage);
        const end = Number(lastPage);
        if (!session || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
          start < 1 || end < start || !total || end > Number(total)) throw new Error('Informe um trecho válido dentro do total de páginas da aula.');
        session.firstPage = start;
        session.lastPage = end;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sessão inválida.');
      return;
    }
    const result = correct !== '' || incorrect !== '' ? { correct: Number(correct), incorrect: Number(incorrect) } : undefined;
    const readingChanged = total !== (progress?.totalPages.toString() ?? '') ||
      incidence !== (progress?.incidence?.toString() ?? '') || incidenceTopic !== (progress?.incidenceTopic ?? '') ||
      read !== (progress?.readPages.toString() ?? '0') || day !== (progress?.resumeOn ?? '') ||
      stars !== (progress?.stars?.toString() ?? '') ||
      studySteps.some(({ id }) => steps.includes(id) !== Boolean(progress?.completedSteps?.includes(id)));
    const advancePage = session?.lastPage !== undefined && ['theory', 'literal', 'strategic'].includes(category)
      ? Math.max(Number(read), session.lastPage) : Number(read);
    const next = readingChanged || advancePage !== Number(read) || (!result && !session)
      ? { totalPages: Number(total), readPages: advancePage } : undefined;
    if (result && !(correctingExercises && result.correct === 0 && result.incorrect === 0) && !validExerciseResult(result)) {
      setError('Informe números inteiros e pelo menos uma questão respondida.');
      return;
    }
    if (next && (!read.trim() || !validProgress(next))) {
      setError('Informe números inteiros. O total deve ser positivo e as páginas lidas devem estar entre zero e o total.');
      return;
    }
    setError('');
    if (incidence !== '' && !validIncidence(Number(incidence))) {
      setError('Informe uma incidência entre 0 e 100%.');
      return;
    }
    if (day && !validStudyDay(day)) {
      setError('Escolha uma data válida para a retomada.');
      return;
    }
    await onSave(next, day || null, stars === '' ? null : Number(stars), steps, result, correctingExercises,
      incidence === '' ? null : Number(incidence), incidenceTopic, session);
  }

  return <form onSubmit={submit}>
    <h3>{title}</h3>
    {initialSession&&<p role="status">Tempo do cronômetro carregado: {formatDuration(initialSession.seconds)}. Confira a duração e registre páginas, questões e demais informações antes de Salvar estudo.</p>}
    <fieldset className="rt-exercise-fields" disabled={busy}>
      <legend>Registro de tempo</legend>
      <div className="fields">
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value as SessionInput['category'])}>
          {sessionCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label>Data do estudo<input type="date" value={sessionDay} max={studyDay()}
          onChange={(event) => setSessionDay(event.target.value)} /></label>
        <label>Tempo de estudo · hh:mm:ss<input type="text" inputMode="text" placeholder="00:30:00" value={duration}
          onChange={(event) => setDuration(event.target.value)} /></label>
      </div>
      <label className="rt-pareto-toggle"><input type="checkbox" checked={counted}
        onChange={(event) => setCounted(event.target.checked)} /> Contabilizar no tempo disponível do dia</label>
      <div className="fields">
        <label>Página inicial desta sessão (opcional)<input type="number" min="1" step="1" value={firstPage}
          onChange={(event) => setFirstPage(event.target.value)} /></label>
        <label>Página final desta sessão (opcional)<input type="number" min="1" step="1" value={lastPage}
          onChange={(event) => setLastPage(event.target.value)} /></label>
      </div>
      <label>Observação da sessão<textarea maxLength={500} rows={2} value={note}
        onChange={(event) => setNote(event.target.value)} /></label>
      <p>Revisão desconta da reserva de revisão. As demais categorias descontam do avanço.
        Registros em dias anteriores entram no histórico. Um trecho de revisão mantém o avanço de leitura já salvo.</p>
    </fieldset>
    <div className="fields">
      <label>Páginas totais<input type="number" min="1" step="1" value={total}
        onChange={(event) => setTotal(event.target.value)} /></label>
      <label>Páginas lidas<input type="number" min="0" step="1" value={read}
        onChange={(event) => setRead(event.target.value)} /></label>
    </div>
    <fieldset className="rt-exercise-fields" disabled={busy}>
      <legend>Incidência na prova · Passo Estratégico</legend>
      <label>Incidência deste assunto (%)
        <input type="number" min="0" max="100" step="any" value={incidence}
          placeholder="Ex.: 18,7" onChange={(event) => {
            const value = event.target.value;
            setIncidence(value);
            if (value !== '' && validIncidence(Number(value))) setStars(String(incidenceStars(Number(value))));
          }} />
      </label>
      <label>Assunto compartilhado entre aulas (opcional)
        <input type="text" maxLength={200} value={incidenceTopic}
          placeholder="Ex.: Direito Societário" onChange={(event) => setIncidenceTopic(event.target.value)} />
      </label>
      <p>Use o percentual do levantamento dos professores. Ao preencher, as estrelas são sugeridas automaticamente e podem ser ajustadas.
        Se o assunto abranger várias aulas, use o mesmo nome e percentual em todas para contabilizá-lo uma vez.</p>
    </fieldset>
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
    <fieldset className="rt-exercise-fields" disabled={busy}>
      <legend>Exercícios</legend>
      {exercises && <p><strong>{exerciseAccuracy(exercises).percent} de acerto</strong>
        {' · '}{exercises.correct + exercises.incorrect} questões · {exercises.correct} acertos · {exercises.incorrect} erros</p>}
      {exercises && <button type="button" onClick={() => {
        setCorrectingExercises((value) => !value);
        setCorrect(correctingExercises ? '' : String(exercises.correct));
        setIncorrect(correctingExercises ? '' : String(exercises.incorrect));
        setError('');
      }}>{correctingExercises ? 'Cancelar correção dos exercícios' : 'Corrigir totais de exercícios'}</button>}
      {correctingExercises && <p>Informe os totais acumulados corretos desta aula. Ao confirmar, eles substituirão o registro atual.
        Para remover o registro de questões, informe zero nos dois campos.</p>}
      <div className="fields">
        <label>{correctingExercises ? 'Total correto de acertos' : 'Novos acertos'}<input type="number" min="0" step="1" value={correct}
          required={correctingExercises}
          onChange={(event) => setCorrect(event.target.value)} /></label>
        <label>{correctingExercises ? 'Total correto de erros' : 'Novos erros'}<input type="number" min="0" step="1" value={incorrect}
          required={correctingExercises}
          onChange={(event) => setIncorrect(event.target.value)} /></label>
      </div>
      {correctingExercises && validExerciseResult({ correct: Number(correct), incorrect: Number(incorrect) }) && <p>
        Novo total · {Number(correct) + Number(incorrect)} questões · {exerciseAccuracy({
          correct: Number(correct), incorrect: Number(incorrect),
        }).percent} de acerto
      </p>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <button className="rt-primary" disabled={busy}>{correctingExercises ? 'Confirmar correção e salvar estudo' : 'Salvar estudo'}</button>
  </form>;
}
