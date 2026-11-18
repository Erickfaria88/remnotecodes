import { renderWidget, usePlugin, WidgetLocation, type RNPlugin } from '@remnote/plugin-sdk';
import { DocumentProgress } from '../components/DocumentProgress';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { validPhase } from '../recommendations';
import { PhasedSubjects } from '../components/PhasedSubjects';
import { ReviewAgenda, ScheduleReview } from '../components/ReviewAgenda';
import type { StudyStep } from '../study-steps';
import type { ExerciseResult } from '../exercise-results';
import { LessonForm } from '../components/LessonForm';
import { ResumePanel } from '../components/ResumePanel';
import { publishDailyTasks, type DailyTask } from '../remnote/daily-tasks';
import { studyDay } from '../resume';
import { PaceForm } from '../components/PaceForm';
import { LessonMetrics, SubjectDashboard, type Lesson } from '../components/SubjectDashboard';
import { effectivePace, type Progress } from '../progress';
import { documentTitle, loadLessons, searchSubjects } from '../remnote/documents';
import { createRepository, parseBackup, type Backup } from '../remnote/storage';
import './reading-tracker.css';

const styleUrl = new URL(import.meta.url);
styleUrl.search = '';
styleUrl.pathname = styleUrl.pathname.replace(/\.js$/, '.css');
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = styleUrl.href;
document.head.append(stylesheet);

type Subject = Awaited<ReturnType<typeof searchSubjects>>[number];
const isDashboard = new URLSearchParams(location.search).get('widgetName') === 'reading-dashboard';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Ocorreu uma falha inesperada.';
}

function ReadingTracker() {
  const plugin = usePlugin();
  const [baseId, setBaseId] = useState<string>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    window.dispatchEvent(new Event('reading-tracker-ready'));
  }, []);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (active) setError('O RemNote ainda não respondeu à consulta da base.');
    }, 8000);

    plugin.kb.getCurrentKnowledgeBaseData().then((base) => {
      if (!base?._id) throw new Error('O SDK não retornou o ID da base ativa.');
      if (active) {
        setError('');
        setBaseId(base._id);
      }
    }).catch((cause) => {
      if (active) setError('Não foi possível identificar a base. ' + errorText(cause));
    }).finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [plugin, attempt]);

  if (!baseId) return <main className="reading-tracker-panel" tabIndex={0} aria-label="Reading Tracker">
    <h1>Reading Tracker</h1>
    {error ? <>
      <p role="alert">{error}</p>
      <button onClick={() => { setError(''); setAttempt((value) => value + 1); }}>Tentar novamente</button>
    </> : <p role="status">Identificando a base do RemNote…</p>}
  </main>;

  return <BaseTracker key={baseId} baseId={baseId} />;
}

async function verifyBase(plugin: RNPlugin, baseId: string) {
  const current = await plugin.kb.getCurrentKnowledgeBaseData();
  if (current._id !== baseId) throw new Error('A base ativa mudou. Reabra o painel.');
}

function BaseTracker({ baseId }: { baseId: string }) {
  const plugin = usePlugin();
  const repository = useMemo(() => createRepository(plugin.storage, baseId), [plugin, baseId]);
  const [data, setData] = useState<Backup>();
  const [view, setView] = useState<'resume' | 'subjects' | 'settings' | 'agenda' | 'exercises'>('resume');
  const [collapsed, setCollapsed] = useState(false);
  const [lessonPaneId, setLessonPaneId] = useState<string>();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Subject[]>();
  const [subject, setSubject] = useState<Subject>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [imported, setImported] = useState<Backup>();
  const [exported, setExported] = useState('');
  const [formRevision, setFormRevision] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const action = useRef(false);
  const lessonEditor = useRef<HTMLElement>(null);

  useEffect(() => {
    if (selected) lessonEditor.current?.scrollIntoView({ block: 'nearest' });
  }, [selected, view]);

  useEffect(() => {
    let active = true;
    repository.load().then(
      (value) => { if (active) setData(value); },
      (cause) => { if (active) setError('Falha ao carregar o progresso. ' + errorText(cause)); },
    ).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [repository]);

  async function run(task: () => Promise<void>) {
    if (action.current || busy) return;
    action.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await verifyBase(plugin, baseId);
      await task();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      action.current = false;
      setBusy(false);
    }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    void run(async () => {
      setMatches(undefined);
      setMatches(await searchSubjects(plugin, query.trim()));
    });
  }

  function selectSubject(next: Subject) {
    void run(async () => {
      const items = await loadLessons(plugin, next.rem._id);
      setSubject(next);
      setLessons(items);
      setSelected(null);
      setMatches(undefined);
    });
  }

  function selectResume(id: string) {
    if (selected === id) {
      lessonEditor.current?.scrollIntoView({ block: 'nearest' });
      return;
    }
    void run(async () => {
      const rem = await plugin.rem.findOne(id);
      const parent = rem && await rem.getParentRem();
      if (!parent || !(await parent.isDocument())) throw new Error('Disciplina indisponível.');
      const items = await loadLessons(plugin, parent._id);
      if (!items.some((item) => item.rem._id === id)) throw new Error('Aula indisponível.');
      setSubject({ rem: parent, title: await documentTitle(plugin, parent), parent: undefined });
      setLessons(items);
      setMatches(undefined);
      setSelected(id);
    });
  }

  async function openLesson(rem: Lesson['rem']) {
    const paneId = isDashboard ? await plugin.window.getFocusedPaneId().catch(() => undefined) : undefined;
    await plugin.window.openRem(rem);
    if (isDashboard) {
      setLessonPaneId(paneId);
      setCollapsed(true);
    }
  }

  function openResume(id: string) {
    void run(async () => {
      const rem = await plugin.rem.findOne(id);
      if (!rem || !(await rem.isDocument())) throw new Error('A aula está indisponível.');
      await openLesson(rem);
    });
  }

  async function publishResume(tasks: DailyTask[], day: string) {
    let published = false;
    await run(async () => {
      if (day !== studyDay()) throw new Error('O dia mudou. Cancele e gere outra prévia.');
      const result = await publishDailyTasks(plugin, baseId, tasks);
      published = true;
      setStatus(result.created + ' tarefa(s) adicionada(s) · ' + result.skipped +
        ' já existente(s). Abra a Nota de hoje para conferir.');
    });
    return published;
  }

  const subjectId = subject?.rem._id;
  const lesson = lessons.find((item) => item.rem._id === selected);
  const record = lesson && data?.lessons[lesson.rem._id];
  const subjectPace = subjectId ? data?.subjectPaces[subjectId] : undefined;
  const pace = effectivePace(data?.globalPace ?? null, subjectPace);

  async function saveLesson(progress: Progress | undefined, resumeOn: string | null, stars: number | null,
    steps: StudyStep[], exercises?: ExerciseResult) {
    if (!lesson || !subjectId) return;
    await run(async () => {
      const current = await plugin.rem.findOne(lesson.rem._id);
      if (!current || current.parent !== subjectId || !(await current.isDocument())) {
        throw new Error('A aula mudou de disciplina ou está indisponível. Atualize a lista.');
      }
      setData(await repository.saveStudy(lesson.rem._id, progress, resumeOn, stars, steps, exercises));
      setFormRevision((revision) => revision + 1);
      setStatus('Estudo salvo.');
    });
  }

  function exportBackup() {
    void run(async () => {
      const current = await repository.load();
      const json = JSON.stringify(current, null, 2);
      setExported(json);
      const file = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reading-tracker-backup.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus('Download do backup solicitado.');
    });
  }

  function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImported(undefined);
    void run(async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error('O arquivo não contém um JSON válido.');
      }
      setImported(parseBackup(parsed, baseId));
    });
  }

  function restoreBackup() {
    if (!imported) return;
    void run(async () => {
      setData(await repository.restore(imported));
      setImported(undefined);
      setFormRevision((revision) => revision + 1);
      setStatus('Backup restaurado.');
    });
  }

  return <main className={collapsed ? 'reading-tracker-panel rt-dashboard-collapsed' : 'reading-tracker-panel'} tabIndex={0} aria-label="Reading Tracker" aria-busy={busy}>
    <header className="rt-header">
      {isDashboard ? <div className="rt-dashboard-heading">
        <button type="button" className="rt-dashboard-toggle" aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir Reading Tracker' : 'Recolher Reading Tracker'}
          title={collapsed ? 'Expandir Reading Tracker' : 'Recolher Reading Tracker'}
          onClick={() => setCollapsed((value) => !value)}>
          <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
          {collapsed && ' Reading Tracker'}
        </button>
        <h1 hidden={collapsed}>Reading Tracker</h1>
      </div> : <h1>Reading Tracker</h1>}
      {data && <nav hidden={collapsed} className="rt-tabs" aria-label="Seções do Reading Tracker">
        <button type="button" aria-pressed={view === 'resume'} onClick={() => setView('resume')}>Retomar</button>
        <button type="button" aria-pressed={view === 'subjects'} onClick={() => setView('subjects')}>Disciplinas</button>
        <button type="button" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Revisões</button>
        <button type="button" aria-pressed={view === 'exercises'} onClick={() => setView('exercises')}>Exercícios</button>
        <button type="button" aria-pressed={view === 'settings'} onClick={() => setView('settings')}>Ajustes</button>
      </nav>}
    </header>
    {collapsed && <div className="rt-dashboard-progress">
      <DocumentProgress location={WidgetLocation.DocumentBelowTitle} paneId={lessonPaneId} />
    </div>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!data && <button disabled={busy} onClick={() => void run(async () => setData(await repository.load()))}>
      Recarregar progresso
    </button>}
    {data && <div hidden={view !== 'resume'} className="rt-view">
      <ResumePanel plugin={plugin} data={data} onSelect={selectResume} onOpen={openResume} onPublish={publishResume} busy={busy} />
    </div>}
    {data && <div hidden={view !== 'agenda'} className="rt-view">
      <ReviewAgenda reviews={data.reviews} busy={busy} onOpen={openResume}
        onAdd={() => { setView('subjects'); setStatus('Escolha a aula e abra Adicionar estudo à agenda.'); }}
        onDone={(id) => void run(async () => {
          setData(await repository.updateReview(id, { doneOn: studyDay() }));
          setStatus('Revisão concluída.');
        })}
        onRange={(id, range) => void run(async () => {
          setData(await repository.updateReview(id, range));
          setStatus('Trecho da revisão salvo.');
        })}
        onMove={(id, day) => void run(async () => {
          if (day < studyDay()) throw new Error('Escolha hoje ou uma data futura.');
          setData(await repository.updateReview(id, { dueOn: day }));
          setStatus('Revisão reagendada.');
        })} />
    </div>}
    {data && <div hidden={view !== 'exercises'} className="rt-view">
      <section className="rt-card" aria-label="Exercícios">
        <h2>Exercícios</h2>
        {subject && <label>Aula de {subject.title}
          <select value={selected ?? ''} disabled={busy} onChange={(event) => setSelected(event.target.value || null)}>
            <option value="">Selecione uma aula</option>
            {lessons.map(({ rem, title }) => <option key={rem._id} value={rem._id}>{title}</option>)}
          </select>
        </label>}
        <button type="button" onClick={() => setView('subjects')}>Escolher disciplina</button>
      </section>
    </div>}
    {data && <div hidden={view !== 'subjects'} className="rt-view">
      <form className="rt-card rt-search" onSubmit={search}>
        <label>Disciplina<input type="search" value={query} required
          onChange={(event) => { setQuery(event.target.value); setMatches(undefined); }} /></label>
        <button className="rt-primary" disabled={busy}>Buscar</button>
      </form>
      {matches && (matches.length === 0 ? <p>Nenhum documento encontrado.</p> :
        <ul aria-label="Disciplinas encontradas">{matches.map((match) =>
          <li key={match.rem._id}><button className="rt-row-main" disabled={busy} onClick={() => selectSubject(match)}>
            <strong>{match.title}</strong><span>{data.subjectPhases[match.rem._id] ? 'Fase ' + data.subjectPhases[match.rem._id] : 'Sem fase'}</span>{match.parent && <span>Em {match.parent}</span>}
          </button></li>)}</ul>)}
      {subject && <section className="rt-card">
        <h2>{subject.title}</h2>
        <form key={subject.rem._id + ':' + (data.subjectPhases[subject.rem._id] ?? '')} onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get('phase') ?? '');
          void run(async () => {
            const phase = value === '' ? null : Number(value);
            if (phase !== null && !validPhase(phase)) throw new Error('Informe uma fase inteira a partir de 1.');
            setData(await repository.savePhase(subject.rem._id, phase));
            setStatus('Fase salva.');
          });
        }}>
          <label>Fase da disciplina<input name="phase" type="number" min="1" step="1"
            defaultValue={data.subjectPhases[subject.rem._id] ?? ''} placeholder="Sem fase" /></label>
          <button disabled={busy}>Salvar fase</button>
        </form>
        <button disabled={busy} onClick={() => void run(async () => {
          const current = await loadLessons(plugin, subject.rem._id);
          setLessons(current);
          if (!current.some((item) => item.rem._id === selected)) setSelected(null);
          setData(await repository.load());
          setFormRevision((revision) => revision + 1);
        })}>Atualizar aulas e progresso</button>
        <SubjectDashboard lessons={lessons} records={data.lessons} pace={pace}
          selected={selected} onSelect={setSelected} />
      </section>}
      <PhasedSubjects plugin={plugin} phases={data.subjectPhases} records={data.lessons} refresh={formRevision} busy={busy} onSelect={selectSubject}
        onRemove={(id) => void run(async () => {
          setData(await repository.savePhase(id, null));
          setStatus('Disciplina removida da fase.');
        })} />
    </div>}
    {data && lesson && subject && <section key={lesson.rem._id + ':' + formRevision} className="rt-card rt-view"
      hidden={view === 'settings' || view === 'agenda'} ref={lessonEditor} aria-label="Progresso da aula">
          <LessonForm title={lesson.title}
            progress={record} exercises={data.exercises[lesson.rem._id]} busy={busy}
            calendarId={baseId + ":" + lesson.rem._id} lessonId={lesson.rem._id} onSave={saveLesson} />
          <ScheduleReview lessonId={lesson.rem._id}
            title={lesson.title} subject={subject.title} busy={busy}
            onSave={(row) => void run(async () => {
              setData(await repository.scheduleReview(row));
              setView('agenda');
              setStatus('Revisão agendada.');
            })} />
          {record && <LessonMetrics progress={record} pace={pace} />}
          <button disabled={busy} onClick={() => void run(() => openLesson(lesson.rem))}>
            Abrir aula no RemNote
          </button>
    </section>}
    <div hidden={!!data && view !== 'settings'} className="rt-view">
      {data && <form className="rt-card" key={data.dailyMinutes + ':' + formRevision} onSubmit={(event) => {
        event.preventDefault();
        const value = Number(new FormData(event.currentTarget).get('dailyHours'));
        const dailyMinutes = Math.round(value * 60);
        void run(async () => {
          if (!Number.isFinite(value) || value <= 0 || value > 24 || dailyMinutes < 1) throw new Error('Informe um tempo diário entre 1 minuto e 24 horas.');
          setData(await repository.saveDailyMinutes(dailyMinutes));
          setStatus('Tempo diário salvo.');
        });
      }}>
        <label>Tempo livre por dia (horas)
          <input name="dailyHours" type="number" min="0.016666" max="24" step="any" required defaultValue={data.dailyMinutes / 60} />
        </label>
        <button className="rt-primary" disabled={busy}>Salvar tempo diário</button>
      </form>}
      {data && <details>
        <summary>Ritmo de leitura</summary>
        <PaceForm key={(subjectId ?? '') + ':' + formRevision} globalPace={data.globalPace}
          subjectPace={subjectPace} hasSubject={!!subjectId} busy={busy}
          onSave={(scope, value) => run(async () => {
            setData(await repository.savePace(scope === 'global' ? null : subjectId!, value));
            setStatus('Ritmo salvo.');
          })} />
      </details>}
      <details>
        <summary>Backup JSON</summary>
        <button disabled={busy || !data} onClick={exportBackup}>Exportar backup</button>
        {exported && <label>JSON do backup<textarea readOnly rows={6} value={exported}
          onFocus={(event) => event.currentTarget.select()} /></label>}
        <label>Importar arquivo<input type="file" accept=".json,application/json" disabled={busy}
          onChange={readBackup} /></label>
        {imported && <div className="rt-confirm rt-confirm-danger">
          <p>Este backup contém {Object.keys(imported.lessons).length} registros. Restaurá-lo substituirá todo o progresso e os ritmos desta base.</p>
          <button className="rt-danger" disabled={busy} onClick={restoreBackup}>Confirmar restauração</button>
          <button disabled={busy} onClick={() => setImported(undefined)}>Cancelar</button>
        </div>}
      </details>
    </div>
  </main>;
}

renderWidget(ReadingTracker);
