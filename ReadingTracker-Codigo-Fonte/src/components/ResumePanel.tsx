import { diversifyLessons } from '../diversify-lessons';
import { useEffect, useState } from 'react';
import { remainingWork } from '../study-budget';
import { StudyRecommendations } from './StudyRecommendations';
import { DailyOverview } from './DailyOverview';
import { FlashcardPlan } from './FlashcardPlan';
import { remainingDailyTime } from '../study-sessions';
import { ParetoCoverage } from './ParetoCoverage';
import type { RNPlugin } from '@remnote/plugin-sdk';
import type { Backup } from '../remnote/storage';
import type { DailyTask } from '../remnote/daily-tasks';
import { documentTitle } from '../remnote/documents';
import { readingQueue, studyDay } from '../resume';
import { filterStudySubjects, type PhaseSelection, type ReviewTagFilter } from '../study-scope';

export function ResumePanel({ plugin, data, onSelect, onOpen, onPublish, onReviews, busy, reviewOnly = false,
  phaseSelection, paretoOnly, reviewTag, allowedLessonIds, reviewPriorities, onResultsSaved }: {
  plugin: RNPlugin; data: Backup; busy: boolean; onSelect: (id: string) => void; onOpen: (id: string) => void;
  onPublish: (tasks: DailyTask[], day: string) => Promise<boolean>;
  onReviews: () => void;
  reviewOnly?: boolean;
  phaseSelection: PhaseSelection;
  paretoOnly: boolean;
  reviewTag?: ReviewTagFilter;
  allowedLessonIds?: Set<string>;
  reviewPriorities?: Record<string,number>;
  onResultsSaved:(data:Backup)=>void;
}) {
  const [allTitles, setTitles] = useState<Map<string, { title: string; subject: string; subjectId: string }>>();
  const [failed, setFailed] = useState(false);
  const [today, setToday] = useState(studyDay);
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
      const ids = [...new Set([...Object.keys(data.lessons), ...Object.keys(data.exercises),
        ...Object.values(data.sessions ?? {}).map((row) => row.lessonId),
        ...Object.values(data.reviews).map((row) => row.lessonId)])];
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

  const allSubjects = new Map(Array.from(allTitles ?? [], ([id, entry]) => [id, entry.subjectId] as const).filter(([id]) => !allowedLessonIds || allowedLessonIds.has(id)));
  const subjects = filterStudySubjects(data, allSubjects, phaseSelection);
  const titles = allTitles && new Map([...allTitles].filter(([id]) => subjects.has(id)));
  const studyMinutes = remainingDailyTime(data, today).study;
  const plannedStudyMinutes = Math.max(0, data.dailyMinutes - Math.round(data.dailyMinutes * (data.reviewShare ?? 100 / 3) / 100));
  const scopedLessons = Object.fromEntries(Object.entries(data.lessons).filter(([id]) => subjects.has(id)));
  const forecast = remainingWork(scopedLessons, subjects, data.globalPace, data.subjectPaces, Math.max(1, plannedStudyMinutes));
  const reviewSubjects = filterStudySubjects(data, allSubjects, phaseSelection, paretoOnly);
  const scopedReviews = Object.fromEntries(Object.entries(data.reviews).filter(([, row]) => reviewSubjects.has(row.lessonId)));
  const queue = readingQueue(scopedLessons, today, data.globalPace, data.subjectPaces, subjects);
  const short = diversifyLessons(queue.short, subjects);

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

  if (reviewOnly) return <section className="rt-card" aria-label="Blocos de revisão">
    {failed ? <p role="alert">Não foi possível consultar as aulas.</p> : !titles ? <p>Carregando aulas…</p> :
      <FlashcardPlan data={data} titles={titles} busy={busy} onOpen={onOpen} paretoOnly={paretoOnly} tag={reviewTag} priorities={reviewPriorities} onResultsSaved={onResultsSaved} />}
  </section>;

  return <section className="rt-card" aria-label="Retomar estudos">
    <h2>Retomar estudos</h2>
    {failed ? <p role="alert">Não foi possível consultar as aulas de retomada.</p> : !titles ? <p>Carregando…</p> : <>
      <DailyOverview data={{ ...data, reviews: scopedReviews }} titles={titles} today={today} busy={busy}
        onSelect={onSelect} onOpen={onOpen} onReviews={onReviews} />
      <details><summary>Cobertura dos assuntos mais cobrados por disciplina</summary>
        {[...new Set([...titles.values()].map((row) => row.subjectId))].map((subjectId) => {
          const items = [...titles].filter(([, row]) => row.subjectId === subjectId);
          return <section key={subjectId}>
            <h3>{items[0][1].subject}</h3>
            <ParetoCoverage records={data.lessons} lessons={items.map(([id, row]) => ({ id, title: row.title }))}
              onSelect={onSelect} />
          </section>;
        })}
      </details>
      <section aria-label="Previsão de leitura">
        <h3>Previsão de conclusão</h3>
        {forecast.pending === 0 ? <p>Nenhum material cadastrado pendente.</p> : <>
          {plannedStudyMinutes > 0 && forecast.unknown < forecast.pending &&
            <p><strong>{forecast.days} {forecast.days === 1 ? 'dia' : 'dias'}</strong> · {forecast.hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h restantes</p>}
          <p>{(plannedStudyMinutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h planejadas por dia para avançar · reserva de revisão descontada</p>
          {plannedStudyMinutes === 0 && <p>Ajuste a reserva de revisão para estimar a conclusão das leituras.</p>}
          {forecast.unknown > 0 && <p>{forecast.unknown} {forecast.unknown === 1 ? 'aula pendente fora da estimativa' : 'aulas pendentes fora da estimativa'} por falta de ritmo ou documento indisponível.</p>}
        </>}
      </section>
      <FlashcardPlan data={data} titles={titles} busy={busy} onOpen={onOpen} paretoOnly={paretoOnly} tag={reviewTag} onResultsSaved={onResultsSaved} />
      <StudyRecommendations data={data} titles={titles} busy={busy} onOpen={onOpen} onSelect={onSelect}
        availableMinutes={studyMinutes} paretoOnly={paretoOnly} />
      {queue.due.length > 0 && <details><summary>Consultar retomadas de hoje e atrasadas · {queue.due.length}</summary>
        <p>As retomadas concorrem por tempo no plano único de avanço.</p>
        {list(queue.due, true)}
      </details>}
      {queue.upcoming.length > 0 && <details><summary>Próximas retomadas ({queue.upcoming.length})</summary>
        {list(queue.upcoming)}</details>}
      {queue.short.length > 0 && <details><summary>Enviar leituras curtas para a Nota de hoje</summary>
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
