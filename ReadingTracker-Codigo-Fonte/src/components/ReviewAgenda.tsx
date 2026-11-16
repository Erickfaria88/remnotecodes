import { useEffect, useState } from 'react';
import { groupReviews, reviewDate, reviewPages, type ScheduledReview } from '../review-agenda';
import { studyDay } from '../resume';

const displayDay = (day: string) => day.split('-').reverse().join('/');

export function ScheduleReview({ lessonId, title, subject, busy, onSave }: {
  lessonId: string; title: string; subject: string; busy: boolean;
  onSave: (row: ScheduledReview) => void;
}) {
  const [day, setDay] = useState(studyDay);
  const [interval, setIntervalDays] = useState('1');

  const [error, setError] = useState('');
  return <details>
    <summary>Adicionar estudo à agenda</summary>
    <form onSubmit={(event) => {
      event.preventDefault();
      try {
        const days = Number(interval);
        const { firstPage, lastPage, pages } = readRange(event.currentTarget);

        if (day > studyDay()) throw new Error('A data de estudo deve ser hoje ou anterior.');
        const dueOn = reviewDate(day, days);
        setError('');
        onSave({ lessonId, title, subject, studiedOn: day, dueOn, interval: days, pages, firstPage, lastPage });
      } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    }}>
      <label>Estudado em<input type="date" required max={studyDay()} value={day}
        onChange={(event) => setDay(event.target.value)} /></label>
      <div className="fields">
        <RangeFields />

        <label>Revisar após (dias)<input type="number" min="1" max="365" required value={interval}
          onChange={(event) => setIntervalDays(event.target.value)} /></label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="rt-primary" disabled={busy}>Agendar revisão</button>
    </form>
  </details>;
}

function readRange(form: HTMLFormElement) {
  const data = new FormData(form);
  const firstPage = Number(data.get('firstPage'));
  const lastPage = Number(data.get('lastPage'));
  return { firstPage, lastPage, pages: reviewPages(firstPage, lastPage) };
}

function RangeFields({ row }: { row?: ScheduledReview }) {
  return <>
    <label>Página inicial<input name="firstPage" type="number" min="1" step="1" required defaultValue={row?.firstPage} /></label>
    <label>Página final<input name="lastPage" type="number" min="1" step="1" required defaultValue={row?.lastPage} /></label>
  </>;
}

export function ReviewAgenda({ reviews, busy, onAdd, onOpen, onDone, onMove, onRange }: {
  reviews: Record<string, ScheduledReview>; busy: boolean;
  onAdd: () => void; onOpen: (id: string) => void;
  onRange: (id: string, range: ReturnType<typeof readRange>) => void;
  onDone: (id: string) => void; onMove: (id: string, date: string) => void;
}) {
  const [today, setToday] = useState(studyDay);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(studyDay()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const [moving, setMoving] = useState<string>();
  const [date, setDate] = useState('');
  const [editing, setEditing] = useState<string>();
  const [rangeError, setRangeError] = useState('');
  const groups = groupReviews(reviews, today);

  return <section className="rt-card" aria-label="Agenda de revisões">
    <div className="rt-subject-heading">
      <h2>Agenda de revisões</h2>
      <button type="button" disabled={busy} onClick={onAdd}>Adicionar estudo</button>
    </div>
    {groups.filter(({ label, rows }) => rows.length || label === 'Hoje').map(({ label, rows }) =>
      <details key={label} open={label === 'Hoje' || label === 'Atrasadas'}>
        <summary>{label} · {rows.length}</summary>
        {!rows.length && <p>Nenhuma revisão prevista para hoje.</p>}
        <ul>{rows.map(([id, row]) => <li key={id} className="rt-row">
          <strong>{row.title}</strong>
          <span className="rt-review-subject">{row.subject}</span>
          <span>Estudado em {displayDay(row.studiedOn)} · {row.firstPage === undefined ? row.pages + ' pág. · trecho não informado' : 'pág. ' + row.firstPage + ' a ' + row.lastPage + ' (' + row.pages + ' pág.)'}</span>
          <span>{row.doneOn ? 'Revisada em ' + displayDay(row.doneOn) :
            'Revisão em ' + displayDay(row.dueOn) + ' · intervalo inicial de ' + row.interval + ' dia(s)'}</span>
          {!row.doneOn && <div className="rt-actions">
            <button type="button" className="rt-primary" disabled={busy} onClick={() => onOpen(row.lessonId)}>Revisar agora</button>
            <button type="button" disabled={busy} onClick={() => onDone(id)}>Concluir</button>
            <button type="button" disabled={busy} onClick={() => { setMoving(id); setDate(row.dueOn); }}>Reagendar</button>
          </div>}
          {!row.doneOn && <button type="button" disabled={busy} onClick={() => {
            setRangeError('');
            setEditing(editing === id ? undefined : id);
          }}>{editing === id ? 'Cancelar edição do trecho' : 'Editar trecho'}</button>}
          {!row.doneOn && editing === id && <form onSubmit={(event) => {
            event.preventDefault();
            try {
              const range = readRange(event.currentTarget);
              setRangeError('');
              onRange(id, range);
            } catch (cause) { setRangeError(cause instanceof Error ? cause.message : String(cause)); }
          }}>
            <div className="fields"><RangeFields row={row} /></div>
            {rangeError && <p role="alert">{rangeError}</p>}
            <button className="rt-primary" disabled={busy}>Salvar trecho</button>
          </form>}
          {!row.doneOn && moving === id && <form onSubmit={(event) => {
            event.preventDefault();
            onMove(id, date);
          }}>
            <label>Nova data<input type="date" min={today} required value={date}
              onChange={(event) => setDate(event.target.value)} /></label>
            <div className="rt-actions">
              <button className="rt-primary" disabled={busy}>Salvar data</button>
              <button type="button" onClick={() => setMoving(undefined)}>Cancelar</button>
            </div>
          </form>}
        </li>)}</ul>
      </details>)}
  </section>;
}
