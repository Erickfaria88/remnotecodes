import { renderWidget, usePlugin, useTrackerPlugin, WidgetLocation, type RNPlugin } from '@remnote/plugin-sdk';
import { lessonRequestKey, type LessonDashboardRequest } from '../remnote/lesson-dashboard';
import { DocumentProgress } from '../components/DocumentProgress';
import { ParetoCoverage } from '../components/ParetoCoverage';
import { SessionHistory } from '../components/SessionHistory';
import type { SessionInput } from '../study-sessions';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { SubjectPicker } from '../components/SubjectPicker';
import { StudyFilters } from '../components/StudyFilters';
import { AuditHistory } from '../components/AuditHistory';
import { ExamDashboard, ExamManager } from '../components/ExamPreparation';
import { emptyPreparation, examLessonIds, examReviewPriorities, type Preparation } from '../exam-preparation';
import { filterStudySubjects, type PhaseSelection, type ReviewTagFilter } from '../study-scope';
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
  const [view, setView] = useState<'resume' | 'subjects' | 'settings' | 'agenda' | 'exercises' | 'exams'>('resume');
  const [phaseSelection, setPhaseSelection] = useState<PhaseSelection>('auto');
  const [paretoOnly, setParetoOnly] = useState(false);
  const [reviewTag, setReviewTag] = useState<ReviewTagFilter>();
  const [scopeSubjects, setScopeSubjects] = useState<Map<string, string>>(new Map());
  const [scopeError, setScopeError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [lessonPaneId, setLessonPaneId] = useState<string>();
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const scopeIds = JSON.stringify([...new Set([
    ...Object.keys(data?.lessons ?? {}), ...Object.keys(data?.exercises ?? {}),
    ...Object.values(data?.reviews ?? {}).map((row) => row.lessonId),
  ])].sort());
  useEffect(() => {
    let current = true;
    setScopeError('');
    void plugin.rem.findMany(JSON.parse(scopeIds) as string[]).then((rems) => {
      if (!rems) throw new Error('Aulas indisponíveis.');
      if (current) setScopeSubjects(new Map(rems.flatMap((rem) => rem.parent ? [[rem._id, rem.parent] as const] : [])));
    }).catch(() => { if (current) { setScopeSubjects(new Map()); setScopeError('Não foi possível filtrar a agenda por disciplina.'); } });
    return () => { current = false; };
  }, [plugin, scopeIds, formRevision]);
  const handledRequest = useRef<string>();
  const request = useTrackerPlugin((reactive) =>
    reactive.storage.getSession<LessonDashboardRequest>(lessonRequestKey(baseId)), [baseId]);

  useEffect(() => {
    if (!isDashboard || !request?.lessonId || !request.token || !data || busy ||
        handledRequest.current === request.token) return;
    handledRequest.current = request.token;
    setCollapsed(false);
    setView('exercises');
    void run(async () => {
      await loadSelectedLesson(request.lessonId);
      const latest = await plugin.storage.getSession<LessonDashboardRequest>(lessonRequestKey(baseId));
      if (latest?.token === request.token) await plugin.storage.setSession(lessonRequestKey(baseId), null);
    });
  }, [request, data, busy, baseId, plugin]);

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

  async function savePreparation(preparation: Preparation) {
    if (action.current || busy) throw new Error('Aguarde a operação atual.');
    action.current = true; setBusy(true); setError(''); setStatus('');
    try {
      await verifyBase(plugin, baseId);
      setData(await repository.savePreparation(preparation));
      setStatus('Preparação salva. As aulas e os registros existentes foram preservados.');
    } catch (cause) { setError(errorText(cause)); throw cause; }
    finally { action.current = false; setBusy(false); }
  }

  function selectSubject(next: Subject) {
    void run(async () => {
      const items = await loadLessons(plugin, next.rem._id);
      setSubject(next);
      setLessons(items);
      setSelected(null);
      setPickerOpen(false);
    });
  }

  function selectResume(id: string) {
    if (view === 'agenda') setView('resume');
    if (selected === id) {
      lessonEditor.current?.scrollIntoView({ block: 'nearest' });
      return;
    }
    void run(() => loadSelectedLesson(id));
  }

  async function loadSelectedLesson(id: string) {
      const rem = await plugin.rem.findOne(id);
      const parent = rem && await rem.getParentRem();
      if (!parent || !(await parent.isDocument())) throw new Error('Disciplina indisponível.');
      const items = await loadLessons(plugin, parent._id);
      if (!items.some((item) => item.rem._id === id)) throw new Error('Aula indisponível.');
      setSubject({ rem: parent, title: await documentTitle(plugin, parent), parent: undefined });
      setLessons(items);
      setSelected(id);
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
  const preparation = data?.preparation ?? emptyPreparation();
  const post = preparation.mode === 'post';
  const postLessons = examLessonIds(preparation);
  const reviewScope = post ? postLessons : data ? filterStudySubjects(data, scopeSubjects, phaseSelection, paretoOnly) : new Map<string, string>();
  const scopedReviews = Object.fromEntries(Object.entries(data?.reviews ?? {}).filter(([, row]) => reviewScope.has(row.lessonId)));

  async function saveLesson(progress: Progress | undefined, resumeOn: string | null, stars: number | null,
    steps: StudyStep[], exercises?: ExerciseResult, replaceExercises = false,
    incidence?: number | null, incidenceTopic?: string, session?: SessionInput) {
    if (!lesson || !subjectId) return;
    await run(async () => {
      const current = await plugin.rem.findOne(lesson.rem._id);
      if (!current || current.parent !== subjectId || !(await current.isDocument())) {
        throw new Error('A aula mudou de disciplina ou está indisponível. Atualize a lista.');
      }
      setData(await repository.saveStudy(lesson.rem._id, progress, resumeOn, stars, steps, exercises, replaceExercises,
        incidence, incidenceTopic, session ? { ...session, lessonId: lesson.rem._id, subjectId,
          title: lesson.title, subject: subject!.title } : undefined));
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
    {pickerOpen && data && <SubjectPicker plugin={plugin} phases={data.subjectPhases} busy={busy}
      onClose={() => setPickerOpen(false)} onSelect={selectSubject} />}
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
        <button type="button" aria-pressed={view === 'exams'} onClick={() => setView('exams')}>Concursos</button>
        <button type="button" aria-pressed={view === 'settings'} onClick={() => setView('settings')}>Ajustes</button>
      </nav>}
    </header>
    {data && !collapsed && <section className="rt-card rt-preparation-mode" aria-label="Modo de preparação">
      <label>Preparação<select disabled={busy} value={preparation.mode}
        onChange={(event) => void savePreparation({ ...preparation, mode: event.target.value as Preparation['mode'] }).catch(() => undefined)}>
        <option value="normal">Normal · fases e preparação contínua</option>
        <option value="post">Pós-edital · concursos ativos</option>
      </select></label>
      <p>{post ? 'Sugestões e revisões seguem os editais ativos. O progresso das aulas e o saldo diário continuam compartilhados.' : 'Suas fases e prioridades habituais continuam valendo. Os editais ficam cadastrados na aba Concursos.'}</p>
    </section>}
    {data && (view === 'resume' || view === 'agenda') && <StudyFilters plugin={plugin}
      phases={data.subjectPhases} selection={phaseSelection} onPhases={setPhaseSelection}
      paretoOnly={paretoOnly} onPareto={setParetoOnly} tag={reviewTag} onTag={setReviewTag} tagsOnly={post} />}
    {collapsed && <div className="rt-dashboard-progress">
      <DocumentProgress location={WidgetLocation.DocumentBelowTitle} paneId={lessonPaneId} />
    </div>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!data && <button disabled={busy} onClick={() => void run(async () => setData(await repository.load()))}>
      Recarregar progresso
    </button>}
    {data && <div hidden={view !== 'resume'} className="rt-view">
      {view === 'resume' && post && <ExamDashboard plugin={plugin} data={data} busy={busy} onSelect={selectResume} onOpen={openResume}
        onManage={() => setView('exams')} onSave={savePreparation} reviewTag={reviewTag} onResultsSaved={setData} />}
      {view === 'resume' && !post && <ResumePanel plugin={plugin} data={data} onSelect={selectResume} onOpen={openResume} onPublish={publishResume}
        onReviews={() => setView('agenda')} busy={busy} phaseSelection={phaseSelection} paretoOnly={paretoOnly} reviewTag={reviewTag} onResultsSaved={setData} />}
    </div>}
    {data && <div hidden={view !== 'agenda'} className="rt-view">
      {view === 'agenda' && <ResumePanel plugin={plugin} data={post ? {...data, dailyMinutes: preparation.availability[studyDay()] ?? data.dailyMinutes} : data} onSelect={selectResume} onOpen={openResume}
        onPublish={publishResume} onReviews={() => setView('agenda')} busy={busy} reviewOnly
        phaseSelection={post ? 'all' : phaseSelection} paretoOnly={post ? false : paretoOnly} reviewTag={reviewTag}
        allowedLessonIds={post ? postLessons : undefined} reviewPriorities={post ? examReviewPriorities(preparation) : undefined} onResultsSaved={setData} />}
      {scopeError && <p role="alert">{scopeError}</p>}
      <ReviewAgenda reviews={scopedReviews} busy={busy} onOpen={openResume}
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
    {data && view === 'exams' && <ExamManager plugin={plugin} data={data} busy={busy} onSave={savePreparation} />}
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
      <AuditHistory data={data}/>
    </div>}
    {data && <div hidden={view !== 'subjects'} className="rt-view">
      <div className="rt-card rt-subject-heading">
        <div><strong>{subject?.title ?? 'Selecione uma disciplina'}</strong>
          {subject && <p>{data.subjectPhases[subject.rem._id] ? 'Fase ' + data.subjectPhases[subject.rem._id] : 'Sem fase cadastrada'}</p>}</div>
        <button className="rt-primary" type="button" disabled={busy} onClick={() => setPickerOpen(true)}>
          {subject ? 'Trocar disciplina' : 'Selecionar disciplina'}
        </button>
      </div>
      {subject && <section className="rt-card">
        <h2>{subject.title}</h2>
        <details><summary>Configurar fase da disciplina</summary>
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
        </form></details>
        <button disabled={busy} onClick={() => void run(async () => {
          const current = await loadLessons(plugin, subject.rem._id);
          setLessons(current);
          if (!current.some((item) => item.rem._id === selected)) setSelected(null);
          setData(await repository.load());
          setFormRevision((revision) => revision + 1);
        })}>Atualizar aulas e progresso</button>
        <details><summary>Cobertura dos assuntos mais cobrados</summary>
          <ParetoCoverage records={data.lessons} lessons={lessons.map((item) => ({ id: item.rem._id, title: item.title }))}
            onSelect={setSelected} />
        </details>
        <details open={!lesson}><summary>Lista e progresso das aulas · {lessons.length}</summary>
        <SubjectDashboard lessons={lessons} records={data.lessons} pace={pace}
          selected={selected} onSelect={setSelected} />
        </details>
      </section>}
    </div>}
    {data && lesson && subject && <section key={lesson.rem._id + ':' + formRevision} className="rt-card rt-view"
      hidden={view === 'settings' || view === 'agenda'} ref={lessonEditor} aria-label="Progresso da aula">
          <nav className="rt-lesson-nav" aria-label="Navegar pelas aulas">
            <button type="button" disabled={busy || lessons[0]?.rem._id === selected}
              onClick={() => setSelected(lessons[lessons.findIndex((item) => item.rem._id === selected) - 1]?.rem._id ?? selected)}>← Anterior</button>
            <label>Aula<select value={selected ?? ''} disabled={busy} onChange={(event) => setSelected(event.target.value)}>
              {lessons.map((item) => <option key={item.rem._id} value={item.rem._id}>{item.title}</option>)}
            </select></label>
            <button type="button" disabled={busy || lessons[lessons.length - 1]?.rem._id === selected}
              onClick={() => setSelected(lessons[lessons.findIndex((item) => item.rem._id === selected) + 1]?.rem._id ?? selected)}>Próxima →</button>
          </nav>
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
          <SessionHistory auditBatches={data.auditBatches} sessions={data.sessions ?? {}} lessonId={lesson.rem._id} busy={busy}
            onSave={(id, changes) => run(async () => { setData(await repository.updateSession(id, changes)); setStatus('Tempo da sessão atualizado.'); })}
            onRemove={(id) => run(async () => { setData(await repository.removeSession(id)); setStatus('Registro de tempo removido.'); })} />
          <button disabled={busy} onClick={() => void run(() => openLesson(lesson.rem))}>
            Abrir aula no RemNote
          </button>
    </section>}
    <div hidden={!!data && view !== 'settings'} className="rt-view">
      {data && <details><summary>Organizar disciplinas por fase</summary>
        <PhasedSubjects plugin={plugin} phases={data.subjectPhases} records={data.lessons} refresh={formRevision} busy={busy}
          onSelect={(next) => { setView('subjects'); selectSubject(next); }}
          onRemove={(id) => void run(async () => {
            setData(await repository.savePhase(id, null)); setStatus('Disciplina removida da fase.');
          })} />
      </details>}
      {data && <SessionHistory auditBatches={data.auditBatches} sessions={data.sessions ?? {}} busy={busy}
        onSave={(id, changes) => run(async () => { setData(await repository.updateSession(id, changes)); setStatus('Tempo da sessão atualizado.'); })}
        onRemove={(id) => run(async () => { setData(await repository.removeSession(id)); setStatus('Registro de tempo removido.'); })} />}
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
        <summary>Planejamento das revisões</summary>
        <form key={'review-settings:' + formRevision} onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          void run(async () => {
            setData(await repository.saveReviewSettings(Number(fields.get('share')), Number(fields.get('seconds'))));
            setStatus('Configuração das revisões salva.');
          });
        }}>
          <label>Percentual do dia para revisão
            <select name="share" defaultValue={String(data.reviewShare ?? 100 / 3)}>
              <option value={String(100 / 3)}>Um terço · 33,3%</option>
              {[20, 25, 30, 40, 50, 75, 100].map((value) => <option key={value} value={value}>{value}%</option>)}
            </select>
          </label>
          <label>Segundos por flashcard<input name="seconds" type="number" min="1" max="600" step="1"
            required defaultValue={data.secondsPerCard ?? 30} /></label>
          <button disabled={busy}>Salvar planejamento de revisão</button>
        </form>
      </details>}
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
