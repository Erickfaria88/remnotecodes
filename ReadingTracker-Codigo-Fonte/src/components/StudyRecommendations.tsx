import { diversifyLessons } from '../diversify-lessons';
import { useState } from 'react';
import { studyRecommendations } from '../recommendations';
import type { Backup } from '../remnote/storage';

interface LessonName { title: string; subject: string; subjectId: string }

export function StudyRecommendations({ data, titles, busy, onOpen }: {
  data: Backup; titles: Map<string, LessonName>; busy: boolean; onOpen: (id: string) => void;
}) {
  const [duration, setDuration] = useState('');
  const subjects = new Map([...titles].map(([id, name]) => [id, name.subjectId]));
  const rows = studyRecommendations(data.lessons, subjects,
    data.subjectPhases, data.subjectPaces, data.globalPace);
  const phases = [...new Set(rows.flatMap((row) => row.phase === undefined ? [] : [row.phase]))].sort((a, b) => a - b);
  const [choice, setChoice] = useState('auto');
  const phase = choice === 'auto' ? phases[0] : Number(choice);
  const inPhase = rows.filter((row) => choice === 'all' || row.phase === phase);
  const budget = duration === '' ? data.dailyMinutes : Number(duration);
  const fitting = inPhase.filter((row) => row.minutes !== null && (budget <= 0 || row.minutes <= budget));
  const longer = budget > 0 ? inPhase.filter((row) => row.minutes !== null && row.minutes > budget) : [];
  const unknown = inPhase.filter((row) => row.minutes === null);

  function list(items: typeof rows) {
    return <ul>{diversifyLessons(items, subjects).slice(0, 3).map((item) => {
      const name = titles.get(item.id)!;
      return <li key={item.id} className="rt-row">
        <strong>{name.title}</strong>
        <span>{name.subject} · {item.phase ? 'Fase ' + item.phase : 'Sem fase'}</span>
        <span>{item.stars}/5 ★ · {item.remaining} páginas · {item.minutes === null ? 'Sem estimativa' : '~' + item.minutes + ' min'}</span>
        <button type="button" className="rt-inline" disabled={busy} onClick={() => onOpen(item.id)}>Abrir aula</button>
      </li>;
    })}</ul>;
  }

  return <section aria-label="O que estudar agora?">
    <h3>O que estudar agora?</h3>
    {rows.length === 0 ? <p>Classifique uma aula pendente em Disciplinas para receber sugestões.</p> : <>
      <div className="fields">
        <label>Fase<select value={choice} onChange={(event) => setChoice(event.target.value)}>
          <option value="auto">Automática{phases[0] ? ' · Fase ' + phases[0] : ''}</option>
          <option value="all">Todas</option>
          {phases.map((number) => <option key={number} value={number}>Fase {number}</option>)}
          {choice !== 'auto' && choice !== 'all' && !phases.includes(Number(choice)) &&
            <option value={choice}>Fase {choice}</option>}
        </select></label>
        <label>Tempo deste bloco (min)<input type="number" min="1" placeholder={String(data.dailyMinutes)} value={duration}
          onChange={(event) => setDuration(event.target.value)} /></label>
      </div>
      {fitting.length ? list(fitting) : <p>Nenhuma aula com estimativa dentro do filtro.</p>}
      {longer.length > 0 && <details><summary>Para um bloco maior</summary>{list(longer)}</details>}
      {unknown.length > 0 && <details><summary>Sem ritmo cadastrado</summary>{list(unknown)}</details>}
    </>}
  </section>;
}
