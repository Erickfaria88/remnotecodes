import type { Backup } from '../remnote/storage';
import { attentionLessons } from '../study-attention';
import { useState } from 'react';
import { reviewBudget } from '../review-plan';

type LessonName = { title: string; subject: string; subjectId: string };

export function DailyOverview({ data, titles, today, busy, onSelect, onOpen, onReviews }: {
  data: Backup; titles: Map<string, LessonName>; today: string; busy: boolean;
  onSelect: (id: string) => void; onOpen: (id: string) => void; onReviews: () => void;
}) {
  const [minimum, setMinimum] = useState('10');
  const subjects = new Map([...titles].map(([id, row]) => [id, row.subjectId]));
  const rows = attentionLessons(data, subjects, Number(minimum));
  const reviews = Object.values(data.reviews).filter((row) => !row.doneOn && row.dueOn <= today);
  const overdue = reviews.filter((row) => row.dueOn < today).length;
  const reviewMinutes = reviewBudget(data.dailyMinutes, data.reviewShare ?? 100 / 3).review;
  const few = [...titles.keys()].filter((id) => {
    const result = data.exercises[id];
    return result && result.correct + result.incorrect < Number(minimum);
  }).length;
  return <>
    <section aria-label="Resumo do dia">
      <h3>Seu dia de estudos</h3>
      <div className="rt-daily-grid">
        <div><strong>{data.dailyMinutes} min disponíveis</strong><p>Tempo diário definido em Ajustes</p></div>
        <div><strong>{reviewMinutes} min para revisão</strong><p>Reserva configurada em Ajustes</p></div>
        <div><strong>{data.dailyMinutes - reviewMinutes} min para avançar e reforçar</strong><p>Leitura e questões</p></div>
      </div>
      <button type="button" disabled={busy} onClick={onReviews}>
        Ver revisões pendentes · {reviews.length}
      </button>
      {overdue > 0 && <p>{overdue} {overdue === 1 ? 'revisão atrasada' : 'revisões atrasadas'}</p>}
    </section>
    <section aria-label="Aulas que precisam de atenção">
      <h3>Aulas que precisam de atenção</h3>
      <label>Quantidade mínima de questões para esta consulta
        <select value={minimum} onChange={(event) => setMinimum(event.target.value)}>
          {[1, 5, 10, 20, 30].map((value) => <option key={value} value={value}>{value} questões</option>)}
        </select>
      </label>
      <p>Aulas abaixo de 80% de acerto. Menor percentual primeiro, seguido de importância e fase.</p>
      {rows.length === 0 ? <p>Nenhuma aula atende a esse filtro.</p> : <ul>{rows.map((row) => {
        const name = titles.get(row.id)!;
        return <li key={row.id} className={'rt-row rt-attention-' + row.band}>
          <button className="rt-row-main" type="button" disabled={busy} onClick={() => onSelect(row.id)}>
            <strong>{name.title}</strong>
            <span>{name.subject}{row.phase ? ' · Fase ' + row.phase : ''}</span>
            <span><strong>{row.percent} de acerto</strong> · {row.total} questões</span>
            <span>{row.correct} acertos · {row.incorrect} erros · {row.stars}/5 ★</span>
            <span>{row.band === 'red' ? 'Prioridade de reforço' : 'Precisa consolidar'}</span>
          </button>
          <div className="rt-actions">
            <button type="button" disabled={busy} onClick={() => onSelect(row.id)}>Registrar estudo</button>
            <button type="button" disabled={busy} onClick={() => onOpen(row.id)}>Abrir aula</button>
          </div>
        </li>;
      })}</ul>}
      {few > 0 && <p>{few} {few === 1 ? 'aula com poucas questões para este filtro' : 'aulas com poucas questões para este filtro'}.</p>}
    </section>
  </>;
}
