import { useEffect, useState } from 'react';
import type { RNPlugin, PluginRem } from '@remnote/plugin-sdk';
import { documentTitle, loadLessons } from '../remnote/documents';
import { summarize, type Progress } from '../progress';

type Subject = { rem: PluginRem; title: string; parent: string | undefined };

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const pages = new Intl.NumberFormat('pt-BR');

export function PhasedSubjects({ plugin, phases, records, refresh, busy, onSelect, onRemove }: {
  plugin: RNPlugin; phases: Record<string, number>; records: Record<string, Progress>; refresh: number; busy: boolean; onSelect: (subject: Subject) => void; onRemove: (id: string) => void;
}) {
  const [subjects, setSubjects] = useState<(Subject & { lessonIds?: string[] })[]>([]);
  const [error, setError] = useState(false);
  const ids = JSON.stringify(Object.keys(phases).sort());

  useEffect(() => {
    let active = true;
    setError(false);
    async function load() {
      const keys: string[] = JSON.parse(ids);
      const rems = keys.length ? await plugin.rem.findMany(keys) : [];
      if (!rems) throw new Error('Disciplinas indisponíveis.');
      const names = await Promise.all(rems.map(async (rem) => ({
        rem, title: await documentTitle(plugin, rem), parent: undefined,
        lessonIds: await loadLessons(plugin, rem._id)
          .then((lessons) => lessons.map(({ rem: lesson }) => lesson._id))
          .catch(() => undefined),
      })));
      if (active) setSubjects(names.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')));
    }
    void load().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [plugin, ids, refresh]);

  const groups = [...new Set(subjects.map(({ rem }) => phases[rem._id]).filter(Boolean))].sort((a, b) => a - b);
  if (error) return <p role="alert">Não foi possível carregar as disciplinas por fase.</p>;
  if (!groups.length) return null;
  return <section className="rt-card" aria-label="Disciplinas por fase">
    <h2>Disciplinas por fase</h2>
    {groups.map((phase) => <details key={phase}>
      <summary>Fase {phase}</summary>
      <ul>{subjects.filter(({ rem }) => phases[rem._id] === phase).map((subject) => {
        const registered = (subject.lessonIds ?? []).flatMap((id) => records[id] ? [records[id]] : []);
        const metrics = summarize(registered, null);
        const missing = (subject.lessonIds?.length ?? 0) - registered.length;
        const caption = !subject.lessonIds ? 'Progresso indisponível' : metrics.percent === null
          ? (missing ? missing + ' sem cadastro' : 'Sem aulas cadastradas')
          : (metrics.remaining === 0 ? '0 páginas restantes' : 'Faltam ' + pages.format(metrics.remaining) +
            (metrics.remaining === 1 ? ' página' : ' páginas')) + (missing ? ' · ' + missing + ' sem cadastro' : '');
        return <li className="rt-row" key={subject.rem._id}><button className="rt-row-main" type="button" disabled={busy}
                    onClick={() => onSelect(subject)}>
            <div className="rt-subject-heading">
              <strong>{subject.title}</strong>
              {metrics.percent !== null && <span className="rt-subject-percent"
                aria-label={percent.format(metrics.remaining ? Math.min(0.999, metrics.percent / 100) : 1) + ' concluído' +
                  (missing ? ' nas aulas cadastradas' : '')}>
                {percent.format(metrics.remaining ? Math.min(0.999, metrics.percent / 100) : 1)}{missing > 0 && <small> cadastradas</small>}
              </span>}
            </div>
            <span>{caption}</span>
          </button>
          <button className="rt-inline" type="button" disabled={busy}
            aria-label={'Remover da fase: ' + subject.title}
            onClick={() => onRemove(subject.rem._id)}>Remover da fase</button>
        </li>;
      })}</ul>
    </details>)}
  </section>;
}
