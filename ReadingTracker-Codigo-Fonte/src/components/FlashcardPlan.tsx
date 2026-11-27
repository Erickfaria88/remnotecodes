import {createReviewQuery,reviewSnapshotFresh} from '../review-query';
import { usePlugin } from '@remnote/plugin-sdk';
import { ReviewPractice } from './ReviewPractice';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Backup } from '../remnote/storage';
import { loadReviewCards, reviewCandidates } from '../remnote/review-cards';
import { buildReviewBlocks } from '../review-plan';
import { remainingDailyTime } from '../study-sessions';
import { studyDay } from '../resume';
import { selectedReviewTags,reviewTagKey,filterStudySubjects, type ReviewTagFilter } from '../study-scope';
import { auditDraftKey, validDraft, type AuditDraft } from '../remnote/question-audit';
import { balancedReview, type ReviewSelection as Selection } from '../balanced-review';
import { ReviewSelection } from './ReviewSelection';
import {subjectSecondsRemaining,plannedReviewSeconds} from '../subject-budget';

export function FlashcardPlan({ data, titles, onOpen, busy, paretoOnly, tag, priorities, onResultsSaved,onPlanChange,compact=false }: {
  compact?:boolean;
  data: Backup;
  titles: Map<string, { title: string; subject: string; subjectId: string }>;
  onOpen: (id: string) => void;
  busy: boolean;
  paretoOnly: boolean;
  tag?: ReviewTagFilter;
  priorities?: Record<string,number>;
  onResultsSaved:(data:Backup)=>void;
  onPlanChange?:(seconds:Record<string,number>)=>void;
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
  const queryClient=useMemo(()=>createReviewQuery(plugin.storage,data.baseId),[plugin,data.baseId]);
  const queryLock=useRef(false);const live=useRef(true);const [consultedAt,setConsultedAt]=useState<number>();const [stale,setStale]=useState(false);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const [loadedScope, setLoadedScope] = useState('');
  const [selection,setSelection]=useState<Selection>({mode:'block',subjectCounts:{},lessonCounts:{}});
  const [expanded,setExpanded]=useState(true);
  const expansionReady=useRef(false);
  useEffect(()=>{
    if(compact)return;
    let live=true;expansionReady.current=false;
    void plugin.storage.getLocal<boolean>('reading-tracker:review-expanded:'+data.baseId).then(value=>{if(live&&typeof value==='boolean')setExpanded(value);})
      .catch(()=>undefined).finally(()=>{if(live)expansionReady.current=true;});
    return()=>{live=false;};
  },[plugin,data.baseId]);
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
  const scope = JSON.stringify([ids, reviewTagKey(tag), day]);
  const ready = loadedScope === scope && !loading&&!stale&&!!consultedAt&&Date.now()-consultedAt<10*60*1000;
  useEffect(()=>{
    let current=true;
    void queryClient.read().then(snapshot=>{
      if(current&&!queryLock.current&&reviewSnapshotFresh(snapshot,scope)){
        setGrouped(new Map(snapshot!.groups));setLoadedScope(snapshot!.scope);setConsultedAt(snapshot!.at);setStale(false);
      }
    }).catch(()=>undefined);
    return()=>{current=false;};
    // Restoring one local snapshot on mount never scans flashcards. Filter changes require Apply.
  },[queryClient]);
  useEffect(()=>{if(!consultedAt)return;const timer=setTimeout(()=>setStale(true),Math.max(0,consultedAt+10*60*1000-Date.now()));return()=>clearTimeout(timer);},[consultedAt]);
  async function consult(force=false){
    if(queryLock.current||active)return;
    queryLock.current=true;setLoading(true);setError('');
    try{
      const result=await queryClient.query(scope,()=>loadReviewCards(plugin,data.baseId,ids?ids.split(','):[],new Date(),tag),force);
      if(live.current){setGrouped(new Map(result.groups));setLoadedScope(result.scope);setConsultedAt(result.at);setStale(false);setRevision(v=>v+1);}
    }catch(cause){if(live.current)setError(cause instanceof Error?cause.message:'Falha ao consultar os flashcards.');}
    finally{queryLock.current=false;if(live.current)setLoading(false);}
  }  const blocks = useMemo(() => {
    const candidates=reviewCandidates(data,ready?grouped??new Map():new Map()).map(row=>priorities?{...row,incidence:priorities[row.id]??0}:row);
    const limits={subjectByLesson:subjects,remainingSeconds:subjectSecondsRemaining(data,subjects.values(),day)};
    if(selection.mode==='auto')return buildReviewBlocks(candidates,budget.review,seconds,limits);
    const eligible=[...titles].filter(([id])=>ids.split(',').includes(id));
    const subjectId=eligible.some(([,r])=>r.subjectId===selection.subjectId)?selection.subjectId:eligible[0]?.[1].subjectId;
    const lessonId=eligible.some(([id])=>id===selection.lessonId)?selection.lessonId:eligible[0]?.[0];
    return balancedReview(candidates,subjects,{...selection,subjectId,lessonId},budget.review,seconds,limits);
  }, [data, grouped, budget.review, seconds, ready, priorities, selection, titles, ids,day]);
  const total = blocks.reduce((sum, block) => sum + block.cards, 0);
  const plannedKey=JSON.stringify(plannedReviewSeconds(blocks,subjects,seconds));
  useEffect(()=>{onPlanChange?.(JSON.parse(plannedKey));},[onPlanChange,plannedKey,ready]);

  async function start(cardIds: string[]) {
    try {
      const cached=await queryClient.read();
      if(!ready||!reviewSnapshotFresh(cached,scope)||cached?.at!==consultedAt){setStale(true);throw new Error('Aplique os filtros e atualize a consulta antes de revisar.');}
      if ((await plugin.kb.getCurrentKnowledgeBaseData())._id !== data.baseId) throw new Error('A base ativa mudou.');
      setActive(cardIds);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a prática.'); }
  }
  return <details className="rt-review-plan" aria-label="Plano de revisão com flashcards" open={expanded} onToggle={e=>{
    const open=e.currentTarget.open;setExpanded(open);
    if(!compact&&expansionReady.current)void plugin.storage.setLocal('reading-tracker:review-expanded:'+data.baseId,open).catch(()=>undefined);
  }}>
    <summary><strong>Revisar antes de avançar</strong><span className="rt-review-summary"> · {ready?total+' flashcards · ~'+Math.ceil(total*seconds/60)+' min':'consulta manual'}{pendingAudit?' · registro pendente':''}</span></summary>
    {draftError&&<p role="alert">{draftError}</p>}
    {pendingAudit&&!active&&<div className="rt-confirm"><p>Há uma auditoria pendente nesta máquina. Os exercícios ainda não foram somados.</p>
      <button type="button" disabled={busy} onClick={()=>{setRecover(pendingAudit);setActive(pendingAudit.cards.map(c=>c.cardId));}}>Recuperar e conferir auditoria</button></div>}
    <p>{paretoOnly ? 'Núcleo de 80% da incidência · ' : ''}{tag ? 'Tags · ' + selectedReviewTags(tag).map(t=>t.title).join(' ou ') +
      (tag.includeInherited ? ' · inclui herança' : ' · marcação direta') : 'Todas as tags'}</p>
    <p>Até {budget.review} min · {seconds} s por flashcard · {total} cartões nos blocos sugeridos</p>
    <p>Limite diário por disciplina: {data.subjectDailyMinutes??120} min, somando revisão e avanço registrados.</p>
    {!compact&&<ReviewSelection value={selection} onChange={setSelection} titles={new Map([...titles].filter(([id])=>ids.split(',').includes(id)))}
      available={new Map([...(ready?grouped??new Map():new Map())].map(([id,row])=>[id,row.cardIds.length]))} busy={busy||loading||!!active}/>}
    <button type="button" disabled={busy || loading || !!active} onClick={() => void consult(ready)}>
      {loading ? 'Consultando flashcards…' : ready?'Atualizar consulta':consultedAt?'Aplicar filtros e buscar flashcards':'Buscar flashcards para revisão'}
    </button>
    {consultedAt&&<p>Última consulta: {new Date(consultedAt).toLocaleTimeString('pt-BR')}{ready?' · reutilizada por até 10 minutos':' · atualização necessária'}. Quantidades e duração dos blocos são recalculadas sem nova busca.</p>}
    {!ready&&!loading&&<p>Os flashcards só serão consultados ao clicar no botão. Selecione fases e tags primeiro; depois aplique os filtros. A reserva de revisão por disciplina será ajustada quando os blocos forem carregados.</p>}
    {error && <p role="alert">{error}</p>}
    {ready && grouped && blocks.length === 0 && <p>Nenhum flashcard disponível para os filtros, saldo e limite diário por disciplina.</p>}
    {compact&&blocks.length>2&&<p>Mostrando os dois primeiros blocos. Os demais ficam no dashboard.</p>}
    {!compact&&<p>Estimativa pelos cartões com data até hoje, incluindo atrasados. Cartões novos sem data ficam fora da contagem.
      A prática pode reapresentar cartões e alterar a duração.</p>}
    {active ? <ReviewPractice key={recover?.id??active.join(',')} cards={active} baseId={data.baseId}
      owners={new Map([...(grouped??new Map())].flatMap(([id,row])=>row.cardIds.map((cardId:string)=>[cardId,id] as const)))}
      titles={titles} onSaved={onResultsSaved} recovered={recover}
      onExit={() => { setActive(undefined); setRecover(undefined);setStale(true);void queryClient.invalidate().catch(()=>undefined); setRevision((value) => value + 1); }} /> : <ul>{(compact?blocks.slice(0,2):blocks).map((block, index) => <li className="rt-row" key={index}>
      <strong>Bloco de ~{Math.ceil(block.minutes)} min · {block.cards} flashcards</strong>
      {(compact?block.lessons.slice(0,3):block.lessons).map((lesson) => <div key={lesson.id}>
        <p>{titles.get(lesson.id)?.subject} · {titles.get(lesson.id)?.title}</p>
        <small>{lesson.cardIds.length} cartões neste bloco</small>
        <button type="button" disabled={busy} onClick={() => onOpen(lesson.id)}>Abrir aula</button>
      </div>)}
      {compact&&block.lessons.length>3&&<p>Mais {block.lessons.length-3} aulas neste bloco.</p>}
      <button className="rt-primary" type="button" disabled={busy || loading || !ready || !draftChecked || !!pendingAudit}
        onClick={() => void start(block.lessons.flatMap((lesson) => lesson.cardIds))}>Revisar bloco</button>
    </li>)}</ul>}
  </details>;
}






