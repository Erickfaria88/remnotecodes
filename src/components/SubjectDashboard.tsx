import { summarize, type Progress } from '../progress';
import type { PluginRem } from '@remnote/plugin-sdk';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export type Lesson = { rem: PluginRem; title: string };

function Metrics({ records, pace }: { records: Progress[]; pace: number | null }) {
  const metrics = summarize(records, pace);
  if (metrics.percent === null) return <p>Sem páginas cadastradas.</p>;
  return <>
    <progress value={metrics.percent} max={100} aria-label="Percentual concluído" />
    <p>{percent.format(metrics.percent / 100)} · {metrics.readPages} de {metrics.totalPages} páginas</p>
    <p>{metrics.remaining} restantes · {metrics.hours === null ? 'Configure o ritmo para estimar as horas' : number.format(metrics.hours) + ' h estimadas'}</p>
  </>;
}

export function SubjectDashboard({ lessons, records, pace, selected, onSelect }: {
  lessons: Lesson[];
  records: Record<string, Progress>;
  pace: number | null;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const registered = lessons.flatMap(({ rem }) => records[rem._id] ? [records[rem._id]] : []);
  return <section aria-label="Resumo da disciplina">
    <p>{registered.length} de {lessons.length} aulas cadastradas</p>
    {registered.length > 0 && registered.length < lessons.length && <p>Totais das aulas cadastradas.</p>}
    <Metrics records={registered} pace={pace} />
    <ul>{lessons.map(({ rem, title }) => {
      const record = records[rem._id];
      return <li key={rem._id}>
        <button className="rt-row-main" type="button" aria-pressed={selected === rem._id} onClick={() => onSelect(rem._id)}>
          <strong>{title}</strong>
          <span>{record ? percent.format(record.readPages / record.totalPages) + ' · ' +
            record.readPages + '/' + record.totalPages + ' páginas' : 'Sem cadastro'}</span>
          {record && <progress max={100} value={100 * record.readPages / record.totalPages}
            aria-label="Percentual concluído da aula" />}
        </button>
      </li>;
    })}</ul>
  </section>;
}

export function LessonMetrics({ progress, pace }: { progress: Progress; pace: number | null }) {
  return <Metrics records={[progress]} pace={pace} />;
}
