import { usePlugin, useTrackerPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import { createRepository } from '../remnote/storage';
import { documentMetrics } from '../document-metrics';
import { useEffect, useState } from 'react';
import { openLessonDashboard } from '../remnote/lesson-dashboard';
import { studySteps } from '../study-steps';


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
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  useEffect(() => { window.dispatchEvent(new Event('reading-tracker-ready')); }, []);
  const metrics = useTrackerPlugin(async (reactive) => {
    try {
      const inline = location === WidgetLocation.UnderRemEditor;
      const [base, id] = await Promise.all([
        reactive.kb.getCurrentKnowledgeBaseData(),
        paneId ? reactive.window.getOpenPaneRemId(paneId) :
          reactive.widget.getWidgetContext<WidgetLocation.DocumentBelowTitle | WidgetLocation.UnderRemEditor>()
            .then((context) => inline
              ? context && 'remId' in context ? context.remId : undefined
              : context && 'documentId' in context ? context.documentId : undefined),
      ]);
      if (!base?._id || !id) return null;
      const data = await createRepository(reactive.storage, base._id).load();
      const document = await reactive.rem.findOne(id);
      return { ...documentMetrics(data, id, document?.children ?? []), id,
        isLesson: !(document?.children ?? []).some((child) => data.lessons[child] || data.exercises[child]) };
    } catch (error) {
      console.error('Reading Tracker: progresso do documento', error);
      return null;
    }
  }, [plugin, location, paneId]);

  if (!metrics || (metrics.percent === null && !metrics.exercise)) return null;
  async function openDashboard() {
    setOpening(true);
    setOpenError('');
    try { await openLessonDashboard(plugin, metrics!.id); }
    catch (cause) { setOpenError(cause instanceof Error ? cause.message : 'Não foi possível abrir o dashboard.'); }
    finally { setOpening(false); }
  }
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
      }}>{metrics.isLesson ? <button type="button" disabled={opening} onClick={() => void openDashboard()}
        title="Registrar exercícios e progresso desta aula"
        style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
        {metrics.exercise.total} {metrics.exercise.total === 1 ? 'questão' : 'questões'} · {metrics.exercise.percent} de acerto ↗
      </button> : <>{metrics.exercise.total} questões · {metrics.exercise.percent} de acerto</>}</li>}
    </ul>}
    {metrics.isLesson && <button type="button" disabled={opening} onClick={() => void openDashboard()}
      style={{ marginTop: 6, padding: '4px 8px', border: '1px solid #d7dfed', borderRadius: 6,
        background: '#fff', color: '#2651ba', cursor: 'pointer' }}>
      {opening ? 'Abrindo…' : 'Registrar estudo desta aula ↗'}
    </button>}
    {openError && <p role="alert">{openError}</p>}
  </section>;
}

