import { usePlugin, useTrackerPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import { createRepository } from '../remnote/storage';
import { summarize } from '../progress';
import { useEffect } from 'react';
import { studySteps } from '../study-steps';

import { exerciseAccuracy } from '../exercise-results';

const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const exerciseColors = {
  green: { background: '#e6f5ed', color: '#176343', borderColor: '#8cc9ab' },
  yellow: { background: '#fff1cc', color: '#704500', borderColor: '#d7aa50' },
  red: { background: '#ffe8e6', color: '#912d28', borderColor: '#ec9c97' },
};

export function DocumentProgress({ location, paneId }: {
  location: WidgetLocation.DocumentBelowTitle | WidgetLocation.UnderRemEditor;
  paneId?: string;
}) {
  const plugin = usePlugin();
  useEffect(() => { window.dispatchEvent(new Event('reading-tracker-ready')); }, []);
  const metrics = useTrackerPlugin(async (reactive) => {
    try {
      const inline = location === WidgetLocation.UnderRemEditor;
      const [base, id] = await Promise.all([
        reactive.kb.getCurrentKnowledgeBaseData(),
        paneId ? reactive.window.getOpenPaneRemId(paneId) :
          plugin.widget.getWidgetContext<WidgetLocation.DocumentBelowTitle | WidgetLocation.UnderRemEditor>()
            .then((context) => inline
              ? context && 'remId' in context ? context.remId : undefined
              : context && 'documentId' in context ? context.documentId : undefined),
      ]);
      if (!base?._id || !id) return null;
      const data = await createRepository(reactive.storage, base._id).load();
      const own = data.lessons[id];
      const exercise = data.exercises[id];
      if (own || exercise) return {
        ...summarize(own ? [own] : [], null), steps: own ? own.completedSteps ?? [] : null,
        exercise: exercise ? { ...exerciseAccuracy(exercise), total: exercise.correct + exercise.incorrect } : null,
      };
      if (inline) return null;
      const document = await reactive.rem.findOne(id);
      const records = (document?.children ?? []).flatMap((id) => data.lessons[id] ? [data.lessons[id]] : []);
      return { ...summarize(records, null), steps: null, exercise: null };
    } catch (error) {
      console.error('Reading Tracker: progresso do documento', error);
      return null;
    }
  }, [plugin, location, paneId]);

  if (!metrics || (metrics.percent === null && !metrics.exercise)) return null;
  return <section aria-label="Progresso de leitura" style={{
    padding: '4px 2px', font: '13px/1.35 system-ui, sans-serif', color: 'inherit',
  }}>
    {metrics.percent !== null && <><progress max={100} value={metrics.percent} aria-label="Leitura concluída"
      style={{ width: '100%', height: 9, accentColor: '#5279db', display: 'block' }} />
    <span>{percent.format(metrics.percent)}% concluído · {metrics.readPages}/{metrics.totalPages} páginas cadastradas</span></>}
    {(metrics.steps || metrics.exercise) && <ul aria-label="Etapas do estudo" style={{
      display: 'flex', flexWrap: 'wrap', gap: '4px 8px', padding: 0, margin: '5px 0 0', listStyle: 'none',
    }}>
      {metrics.steps && studySteps.map(({ id, label }) => {
        const done = metrics.steps?.includes(id);
        return <li key={id} style={{
          padding: '1px 6px', border: '1px solid', borderRadius: 8,
          ...(done ? { background: '#e6f5ed', color: '#176343', borderColor: '#8cc9ab' } : {}),
        }}>
          {label} · {done ? '✓ OK' : 'Pendente'}
        </li>;
      })}
      {metrics.exercise && <li style={{
        padding: '1px 6px', border: '1px solid', borderRadius: 8,
        ...exerciseColors[metrics.exercise.band],
      }}>{metrics.exercise.total} {metrics.exercise.total === 1 ? 'questão' : 'questões'} · {metrics.exercise.percent} de acerto</li>}
    </ul>}
  </section>;
}

