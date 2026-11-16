import { diversifyLessons } from '../diversify-lessons';
import { useEffect, useState } from 'react';
import { remainingWork } from '../study-budget';
import { StudyRecommendations } from './StudyRecommendations';
import type { RNPlugin } from '@remnote/plugin-sdk';
import type { Backup } from '../remnote/storage';
import type { DailyTask } from '../remnote/daily-tasks';
import { documentTitle } from '../remnote/documents';
import { readingQueue, studyDay } from '../resume';

export function ResumePanel({ plugin, data, onSelect, onOpen, onPublish, busy }: {
  plugin: RNPlugin; data: Backup; busy: boolean; onSelect: (id: string) => void; onOpen: (id: string) => void;
  onPublish: (tasks: DailyTask[], day: string) => Promise<boolean>;
}) {
  const [titles, setTitles] = useState<Map<string, { title: string; subject: string; subjectId: string }>>();
  const [failed, setFailed] = useState(false);
  const [today, setToday] = useState(studyDay);
  const [minutes, setMinutes] = useState('');
  const [preview, setPreview] = useState<{ tasks: DailyTask[]; day: string }>();

  useEffect(() => {
    const update = () => setToday(studyDay());
    const interval = setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setFailed(false);
    async function load() {
      const ids = Object.keys(data.lessons).filter((id) => {
        const record = data.lessons[id];
        return record.readPages < record.totalPages;
      });
      const rems = ids.length ? await plugin.rem.findMany(ids) : [];
      if (!rems) throw new Error('Aulas indisponíveis.');
      const parents = [...new Set(rems.flatMap((rem) => rem.parent ? [rem.parent] : []))];
      const subjects = parents.length ? await plugin.rem.findMany(parents) : [];
      if (!subjects) throw new Error('Disciplinas indisponíveis.');
      const names = new Map(await Promise.all(subjects.map(async (rem) =>
        [rem._id, await rem.isDocument() ? await documentTitle(plugin, rem) : undefined] as const)));
      const rows = new Map<string, { title: string; subject: string; subjectId: string }>();
      await Promise.all(rems.map(async (rem) => {
        const subject = rem.parent && names.get(rem.parent);
        if (subject && rem.parent && await rem.isDocument()) {
          rows.set(rem._id, { title: await documentTitle(plugin, rem), subject, subjectId: rem.parent });
        }
      }));
      if (active) setTitles(rows);
    }
    void load().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [plugin, data]);

  const subjects = new Map(Array.from(titles ?? [], ([id, entry]) => [id, entry.subjectId]));
  const forecast = remainingWork(data.lessons, subjects, data.globalPace, data.subjectPaces, data.dailyMinutes);
  const queue = readingQueue(data.lessons, today, data.globalPace, data.subjectPaces, subjects);
  const limit = Number(minutes);
  const eligible = limit > 0 ? queue.short.filter((row) => row.minutes !== null && row.minutes <= limit) : queue.short;
  const short = diversifyLessons(eligible, subjects);

  function list(rows: typeof queue.due, showOpen = false) {
    return <ul>{rows.map((row) => {
      const entry = titles?.get(row.id);
      if (!entry) return null;
      const day = row.record.resumeOn;
      return <li className="rt-row" key={row.id}><button className="rt-row-main" type="button" disabled={busy} onClick={() => onSelect(row.id)}>
        <strong>{entry.title}</strong><span>{entry.subject}</span>
        <span>{row.record.readPages}/{row.record.totalPages} páginas · faltam {row.remaining}
          {row.minutes !== null && ' · ~' + Math.ceil(row.minutes) + ' min'}</span>
        {day && <span>{day < today ? 'Atrasada · ' : ''}{day.split('-').reverse().join('/')}</span>}
      </button>
        {showOpen && <button className="rt-inline" type="button" disabled={busy} aria-label={'Abrir aula: ' + entry.title}
          onClick={() => onOpen(row.id)}>Abrir aula</button>}
      </li>;
    })}</ul>;
  }

  return <section className="rt-card" aria-label="Retomar estudos">
    <h2>Retomar estudos</h2>
    {failed ? <p role="alert">Não foi possível consultar as aulas de retomada.</p> : !titles ? <p>Carregando…</p> : <>
      <section aria-label="Previsão de leitura">
        <h3>Previsão de conclusão</h3>
        {forecast.pending === 0 ? <p>Nenhum material cadastrado pendente.</p> : <>
          {forecast.unknown < forecast.pending &&
            <p><strong>{forecast.days} {forecast.days === 1 ? 'dia' : 'dias'}</strong> · {forecast.hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h restantes</p>}
          <p>{(data.dailyMinutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h de leitura por dia · materiais cadastrados</p>
          {forecast.unknown > 0 && <p>{forecast.unknown} {forecast.unknown === 1 ? 'aula pendente fora da estimativa' : 'aulas pendentes fora da estimativa'} por falta de ritmo ou documento indisponível.</p>}
        </>}
      </section>
      <StudyRecommendations data={data} titles={titles} busy={busy} onOpen={onOpen} />
      <h3>Para retomar hoje</h3>
      {queue.due.length ? list(queue.due) : <p>Nenhuma retomada para hoje.</p>}
      {queue.upcoming.length > 0 && <details><summary>Próximas retomadas ({queue.upcoming.length})</summary>
        {list(queue.upcoming)}</details>}
      {queue.short.length > 0 && <details open><summary>Quase concluídas</summary>
        <label>Tempo disponível em minutos
          <input type="number" min="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
        </label>
        {short.length ? list(short, true) : <p>Nenhuma leitura com estimativa dentro desse tempo.</p>}
        {!preview && short.length > 0 && <button type="button" disabled={busy} onClick={() => {
          const tasks = short.flatMap(({ id, remaining, minutes }) => {
            const entry = titles.get(id);
            return entry ? [{ id, remaining, minutes, ...entry }] : [];
          });
          setPreview({ tasks, day: studyDay() });
        }}>Enviar para a Nota de hoje</button>}
        {preview && <div className="rt-confirm">
          <h4>Prévia da Nota de hoje</h4>
          <p>As tarefas serão agrupadas por disciplina. Aulas já enviadas hoje serão ignoradas.</p>
          <ul>{preview.tasks.map((task) => <li key={task.id}>
            {task.subject} · {task.title} · faltam {task.remaining} páginas
            {task.minutes !== null && ' · ~' + Math.ceil(task.minutes) + ' min'}
          </li>)}</ul>
          <div className="rt-actions"><button className="rt-primary" type="button" disabled={busy} onClick={async () => {
            if (await onPublish(preview.tasks, preview.day)) setPreview(undefined);
          }}>Confirmar criação</button>
          <button type="button" disabled={busy} onClick={() => setPreview(undefined)}>Cancelar</button></div>
        </div>}
      </details>}
    </>}
  </section>;
}
