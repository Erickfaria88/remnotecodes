import { usePlugin } from '@remnote/plugin-sdk';
import { ReviewPractice } from './ReviewPractice';
import { useEffect, useMemo, useState } from 'react';
import type { Backup } from '../remnote/storage';
import { loadReviewCards, reviewCandidates } from '../remnote/review-cards';
import { buildReviewBlocks } from '../review-plan';
import { remainingDailyTime } from '../study-sessions';
import { studyDay } from '../resume';
import { filterStudySubjects, type ReviewTagFilter } from '../study-scope';
import { auditDraftKey, validDraft, type AuditDraft } from '../remnote/question-audit';
import { balancedReview, type ReviewSelection as Selection } from '../balanced-review';
import { ReviewSelection } from './ReviewSelection';

export function FlashcardPlan({ data, titles, onOpen, busy, paretoOnly, tag, priorities, onResultsSaved }: {
  data: Backup;
  titles: Map<string, { title: string; subject: string; subjectId: string }>;
  onOpen: (id: string) => void;
  busy: boolean;
  paretoOnly: boolean;
  tag?: ReviewTagFilter;
  priorities?: Record<string,number>;
  onResultsSaved:(data:Backup)=>void;
}) {
  const plugin = usePlugin();
  const [grouped, setGrouped] = useState<Awaited<ReturnType<typeof loadReviewCards>>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<string[]>();
  const [pendingAudit,setPendingAudit]=useState<AuditDraft>();
  const [recover,setRecover]=useState<AuditDraft>();
  const [draftChecked,setDraftChecked]=useState(false);
  const [draftError,setDraftError]=useState('');
  const [revision, setRevision] = useState(0);
  const [loadedScope, setLoadedScope] = useState('');
  const [selection,setSelection]=useState<Selection>({mode:'block',subjectCounts:{},lessonCounts:{}});
  const seconds = data.secondsPerCard ?? 30;
  const [day, setDay] = useState(studyDay);
  const budget = remainingDailyTime(data, day);
  useEffect(()=>{
    let live=true;setDraftChecked(false);setDraftError('');
    void plugin.storage.getLocal<unknown>(auditDraftKey(data.baseId)).then(value=>{
      if(!live)return;
      if(value && !validDraft(value,data.baseId))throw new Error('Rascunho de auditoria incompatível; preserve-o para conferência manual.');
      setPendingAudit(value as AuditDraft|undefined);
      setDraftChecked(true);
    }).catch(e=>{if(live)setDraftError(e instanceof Error?e.message:'Falha ao ler auditoria pendente.');});
    return()=>{live=false;};
  },[plugin,data.baseId,revision]);
  useEffect(() => {
    const interval = setInterval(() => setDay(studyDay()), 30000);
    return () => clearInterval(interval);
  }, []);
  const subjects = new Map([...titles].map(([id, row]) => [id, row.subjectId]));
  const ids = [...filterStudySubjects(data, subjects, 'all', paretoOnly).keys()].sort().join(',');
  const scope = JSON.stringify([ids, tag?.id, tag?.includeInherited, day]);
  const ready = loadedScope === scope && !loading;
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setGrouped(undefined);
    setActive(undefined);
    void loadReviewCards(plugin, data.baseId, ids ? ids.split(',') : [], new Date(), tag).then((result) => {
      if (current) { setGrouped(result); setLoadedScope(scope); }
    }).catch((cause) => {
      if (current) setError(cause instanceof Error ? cause.message : 'Falha ao consultar os flashcards.');
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [plugin, data.baseId, ids, revision, day, tag?.id, tag?.includeInherited]);
  const blocks = useMemo(() => {
    const candidates=reviewCandidates(data,ready?grouped??new Map():new Map()).map(row=>priorities?{...row,incidence:priorities[row.id]??0}:row);
    if(selection.mode==='auto')return buildReviewBlocks(candidates,budget.review,seconds);
    const eligible=[...titles].filter(([id])=>ids.split(',').includes(id));
    const subjectId=eligible.some(([,r])=>r.subjectId===selection.subjectId)?selection.subjectId:eligible[0]?.[1].subjectId;
    const lessonId=eligible.some(([id])=>id===selection.lessonId)?selection.lessonId:eligible[0]?.[0];
    return balancedReview(candidates,subjects,{...selection,subjectId,lessonId},budget.review,seconds);
  }, [data, grouped, budget.review, seconds, ready, priorities, selection, titles, ids]);
  const total = blocks.reduce((sum, block) => sum + block.cards, 0);

  async function start(cardIds: string[]) {
    try {
      if ((await plugin.kb.getCurrentKnowledgeBaseData())._id !== data.baseId) throw new Error('A base ativa mudou.');
      setActive(cardIds);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a prática.'); }
  }
  return <section aria-label="Plano de revisão com flashcards">
    <h3>Revisar antes de avançar</h3>
    {draftError&&<p role="alert">{draftError}</p>}
    {pendingAudit&&!active&&<div className="rt-confirm"><p>Há uma auditoria pendente nesta máquina. Os exercícios ainda não foram somados.</p>
      <button type="button" disabled={busy} onClick={()=>{setRecover(pendingAudit);setActive(pendingAudit.cards.map(c=>c.cardId));}}>Recuperar e conferir auditoria</button></div>}
    <p>{paretoOnly ? 'Núcleo de 80% da incidência · ' : ''}{tag ? 'Tag · ' + tag.title +
      (tag.includeInherited ? ' · inclui herança' : ' · marcação direta') : 'Todas as tags'}</p>
    <p>Até {budget.review} min · {seconds} s por flashcard · {total} cartões nos blocos sugeridos</p>
    <ReviewSelection value={selection} onChange={setSelection} titles={new Map([...titles].filter(([id])=>ids.split(',').includes(id)))}
      available={new Map([...(ready?grouped??new Map():new Map())].map(([id,row])=>[id,row.cardIds.length]))} busy={busy||loading||!!active}/>
    <button type="button" disabled={busy || loading || !!active} onClick={() => setRevision((value) => value + 1)}>
      {loading ? 'Consultando flashcards…' : 'Atualizar blocos'}
    </button>
    {error && <p role="alert">{error}</p>}
    {!loading && grouped && blocks.length === 0 && <p>Nenhum flashcard pendente encontrado para os filtros e o tempo disponíveis.</p>}
    <p>Estimativa pelos cartões com data até hoje, incluindo atrasados. Cartões novos sem data ficam fora da contagem.
      A prática pode reapresentar cartões e alterar a duração.</p>
    {active && (ready || recover) ? <ReviewPractice key={recover?.id??active.join(',')} cards={active} baseId={data.baseId}
      owners={new Map([...(grouped??new Map())].flatMap(([id,row])=>row.cardIds.map((cardId:string)=>[cardId,id] as const)))}
      titles={titles} onSaved={onResultsSaved} recovered={recover}
      onExit={() => { setActive(undefined); setRecover(undefined); setRevision((value) => value + 1); }} /> : <ul>{blocks.map((block, index) => <li className="rt-row" key={index}>
      <strong>Bloco de ~{Math.ceil(block.minutes)} min · {block.cards} flashcards</strong>
      {block.lessons.map((lesson) => <div key={lesson.id}>
        <p>{titles.get(lesson.id)?.subject} · {titles.get(lesson.id)?.title}</p>
        <small>{lesson.cardIds.length} cartões neste bloco</small>
        <button type="button" disabled={busy} onClick={() => onOpen(lesson.id)}>Abrir aula</button>
      </div>)}
      <button className="rt-primary" type="button" disabled={busy || loading || !draftChecked || !!pendingAudit}
        onClick={() => void start(block.lessons.flatMap((lesson) => lesson.cardIds))}>Revisar bloco</button>
    </li>)}</ul>}
  </section>;
}
