import { AppEvents, usePlugin } from '@remnote/plugin-sdk';
import { useEffect, useMemo, useRef, useState } from 'react';
import { approvedEntries, auditRows, countedQuestions, simplifyAuditRows, selectedAuditRows, type AuditRow } from '../question-audit';
import { auditDraftKey, claimAudit, prepareAudit, refreshAudit, releaseAudit, verifyAuditBase, stableAuditRecovery, type AuditDraft } from '../remnote/question-audit';
import { createRepository, type Backup } from '../remnote/storage';
import { studyDay } from '../resume';
import {defaultReviewTime,reviewedCardCounts,reviewSessions,type ReviewLessonInfo,type ReviewTimeInput} from '../review-time';
import {documentTitle} from '../remnote/documents';
import {ReviewTimeForm,reviewTimePreview} from './ReviewTimeForm';
import {formatDuration} from '../study-sessions';

export function useQuestionAudit({baseId,cards,owners,recovered,onSaved,onExit,titles}:{baseId:string;cards:string[];owners:Map<string,string>;titles:Map<string,ReviewLessonInfo>;
  recovered?:AuditDraft;onSaved:(data:Backup)=>void;onExit:()=>void}) {
  const plugin=usePlugin();const repo=useMemo(()=>createRepository(plugin.storage,baseId),[plugin,baseId]);
  const [draft,setDraft]=useState<AuditDraft>();const current=useRef<AuditDraft>();
  const [rows,setRows]=useState<AuditRow[]>([]);const [data,setData]=useState<Backup>();
  const [error,setError]=useState('');const [working,setWorking]=useState(false);
  const [savedCount,setSavedCount]=useState<number>();const [uncertain,setUncertain]=useState(false);
  const [timeInput,setTimeInput]=useState<ReviewTimeInput>({enabled:true,duration:'',day:studyDay(),lessonIds:[],counted:true,note:''});
  const mounted=useRef(true);const closing=useRef(false);const action=useRef(false);
  const chain=useRef<Promise<unknown>>(Promise.resolve());
  const id=useRef(recovered?.id??'audit_'+crypto.randomUUID().replaceAll('-',''));
  const owner=useRef(crypto.randomUUID());
  const publish=(next:AuditDraft)=>{current.current=next;if(mounted.current)setDraft(next);};
  useEffect(()=>{
    mounted.current=true;let live=true;
    void (async()=>{
      await claimAudit(plugin,baseId,id.current,owner.current);
      const loaded=await repo.load();if(live)setData(loaded);
      if(loaded.auditBatches?.[id.current] && recovered) {
        const next={...recovered,phase:'summary' as const};
        if(live){setSavedCount(loaded.auditBatches[id.current].entries.length);publish(next);}
        return;
      }
      let next:AuditDraft;
      if(recovered) {
        next=await refreshAudit(plugin,recovered,owner.current);
        const issues=stableAuditRecovery(recovered,next)?next.issues:Object.fromEntries(next.cards.map(c=>[c.cardId,'Auditoria recuperada após interrupção ou alteração do histórico. Confira este item manualmente.']));
        next={...next,phase:'summary',endedAt:recovered.endedAt??Date.now(),issues};
        next.rows=simplifyAuditRows(auditRows(next.cards,next.histories,next.startedAt,next.endedAt!,issues),next.cards);
        if(live)setRows(next.rows);
      }else next=await prepareAudit(plugin,baseId,id.current,cards,owners,owner.current);
      const lessonIds=[...new Set(next.cards.flatMap(c=>c.lessonId?[c.lessonId]:[]))];
      const info:Record<string,ReviewLessonInfo>={};
      for(const lessonId of lessonIds) {
        const known=next.lessonInfo?.[lessonId]??titles.get(lessonId);
        if(known?.subjectId)info[lessonId]=known;
        else {
          const rem=await plugin.rem.findOne(lessonId);
          const parent=rem?.parent?await plugin.rem.findOne(rem.parent):undefined;
          if(rem&&parent)info[lessonId]={title:await documentTitle(plugin,rem),subject:await documentTitle(plugin,parent),subjectId:parent._id};
        }
      }
      next={...next,lessonInfo:info,...(!recovered?{practiceStartedAt:Date.now()}:{})};
      if(recovered) {
        const counts=reviewedCardCounts(next.cards,next.histories,next.startedAt,next.endedAt!);
        const input=recovered.reviewTime??defaultReviewTime(recovered.practiceStartedAt,recovered.endedAt,counts);
        next.reviewTime=input;if(live)setTimeInput(input);
      }
      await plugin.storage.setLocal(auditDraftKey(baseId),next);
      if(live)publish(next);
    })().catch(e=>{if(live)setError(e instanceof Error?e.message:'Falha ao preparar auditoria.');void releaseAudit(plugin,baseId,id.current,owner.current).catch(()=>undefined);});
    return()=>{live=false;mounted.current=false;void releaseAudit(plugin,baseId,id.current,owner.current).catch(()=>undefined);};
  },[plugin,baseId,repo,cards.join(',')]);
  useEffect(()=>{
    if(!draft)return;
    const timer=setInterval(()=>void claimAudit(plugin,baseId,id.current,owner.current).catch(e=>{
      if(mounted.current)setError(e instanceof Error?e.message:'Falha ao renovar a sessão de auditoria.');
    }),30000);
    return()=>clearInterval(timer);
  },[plugin,baseId,draft?.id]);

  function scan() {
    const operation=chain.current.then(async()=>{
      if(!current.current)throw new Error('Auditoria ainda não preparada.');
      const next=await refreshAudit(plugin,current.current,owner.current);publish(next);return next;
    });
    chain.current=operation.catch(()=>undefined);return operation;
  }
  async function finish(finishedAt=Date.now()) {
    if(closing.current || !current.current || current.current.phase==='summary')return;
    closing.current=true;setWorking(true);setError('');
    let next=current.current;
    try {
      next=await scan();
      let stable=false;
      for(let i=0;i<3;i++) {
        const previous=next;
        await new Promise(resolve=>setTimeout(resolve,350));
        next=await scan();
        if(JSON.stringify(previous.histories)===JSON.stringify(next.histories)){stable=true;break;}
      }
      if(!stable)next={...next,issues:Object.fromEntries(next.cards.map(c=>[c.cardId,'Histórico ainda mudando ao encerrar; confira manualmente.']))};
      const latest=await repo.load();setData(latest);
    }catch(e) {
      next={...current.current!,issues:Object.fromEntries(next.cards.map(c=>[c.cardId,'Falha na conferência final; resultado exige auditoria manual.']))};
      setError(e instanceof Error?e.message:'Não foi possível conferir o histórico final.');
    }
    next={...next,phase:'summary',endedAt:finishedAt};
    next.rows=simplifyAuditRows(auditRows(next.cards,next.histories,next.startedAt,next.endedAt!,next.issues),next.cards);
    const counts=reviewedCardCounts(next.cards,next.histories,next.startedAt,finishedAt);
    next.reviewTime=defaultReviewTime(next.practiceStartedAt,finishedAt,counts);setTimeInput(next.reviewTime);
    publish(next);setRows(next.rows);
    try{await plugin.storage.setLocal(auditDraftKey(baseId),next);}catch{setError('Não foi possível guardar o rascunho local. Mantenha esta tela aberta até conferir.');}
    setWorking(false);
  }
  useEffect(()=>{
    if(draft?.phase!=='running')return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const refresh=()=>{
      if(closing.current)return;
      clearTimeout(timer);timer=setTimeout(()=>{if(!closing.current)void scan().catch(e=>{if(mounted.current)setError('Captura pendente: '+(e instanceof Error?e.message:'falha ao consultar histórico.'));});},250);
    };
    const exited=()=>{
      // Queue exit only requests a review form; it never records results/time.
      // Prompt even without a graded card, so reading time can be entered manually.
      if(closing.current)return;
      void finish(Date.now());
    };
    plugin.event.addListener(AppEvents.QueueCompleteCard,undefined,refresh);
    plugin.event.addListener(AppEvents.QueueExit,undefined,exited);
    const interval=setInterval(refresh,6000);
    return()=>{clearTimeout(timer);clearInterval(interval);plugin.event.removeListener(AppEvents.QueueCompleteCard,undefined,refresh);plugin.event.removeListener(AppEvents.QueueExit,undefined,exited);};
  },[plugin,draft?.id,draft?.phase]);
  useEffect(()=>{
    if(draft?.phase!=='summary')return;
    const timer=setTimeout(()=>{
      const write=chain.current.then(async()=>{
        if(current.current && mounted.current && !action.current){const next={...current.current,rows,reviewTime:timeInput};current.current=next;await plugin.storage.setLocal(auditDraftKey(baseId),next);}
      });
      chain.current=write.catch(()=>{if(mounted.current)setError('Não foi possível guardar as alterações do rascunho.');});
    },300);
    return()=>clearTimeout(timer);
  },[rows,timeInput,draft?.phase,plugin,baseId]);
  async function clear() {
    await chain.current;
    const saved=await plugin.storage.getLocal<AuditDraft>(auditDraftKey(baseId));
    if(saved && saved.id!==id.current)throw new Error('Há outro rascunho nesta base. Reabra o painel.');
    await plugin.storage.setLocal(auditDraftKey(baseId),null);
    await releaseAudit(plugin,baseId,id.current,owner.current);
  }
  async function confirm(includeQuestions=true) {
    if(action.current || !current.current || working || uncertain || savedCount!==undefined)return;
    action.current=true;setWorking(true);setError('');
    try {
      await verifyAuditBase(plugin,baseId);await claimAudit(plugin,baseId,id.current,owner.current);
      await chain.current;
      const fresh=includeQuestions?await refreshAudit(plugin,current.current,owner.current):current.current;
      if(includeQuestions&&JSON.stringify(fresh.histories)!==JSON.stringify(current.current.histories)) {
        const issues=Object.fromEntries(fresh.cards.map(c=>[c.cardId,'O histórico mudou durante a auditoria. Confira novamente antes de registrar.']));
        const next={...fresh,issues,endedAt:current.current.endedAt??Date.now()};
        next.rows=simplifyAuditRows(auditRows(next.cards,next.histories,next.startedAt,next.endedAt,issues),next.cards);
        publish(next);setRows(next.rows);
        throw new Error('O histórico mudou. O resumo foi atualizado e exige nova conferência.');
      }
      const latest=await repo.load();
      const selected=selectedAuditRows(rows,timeInput.lessonIds,countedQuestions(latest.auditBatches??{}));
      const entries=includeQuestions?approvedEntries(selected):[];
      const counts=reviewedCardCounts(current.current.cards,current.current.histories,current.current.startedAt,current.current.endedAt??Date.now());
      const sessions=reviewSessions(id.current,timeInput,counts,current.current.lessonInfo??{});
      if(!entries.length&&!sessions.length)throw new Error('Informe o tempo de revisão ou selecione questões conferidas.');
      const createdAt=Math.max(current.current.endedAt??Date.now(),...entries.map(e=>e.at));
      setUncertain(true);
      const next=await repo.commitAudit({id:id.current,createdAt,entries,...(sessions.length?{reviewSessions:sessions}:{})});
      const saved=next.auditBatches?.[id.current]?.entries.length??0;
      setUncertain(false);setSavedCount(saved);setData(next);onSaved(next);
      try{await clear();}catch{setError('A revisão foi registrada, mas o rascunho local não pôde ser removido. Use Fechar revisão registrada.');return;}
      await plugin.app.toast('Revisão salva · '+saved+' questões · '+sessions.reduce((sum,s)=>sum+s.seconds,0)+' s de tempo registrado.').catch(()=>undefined);
      onExit();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar o resumo.');}
    finally{action.current=false;if(mounted.current)setWorking(false);}
  }
  async function discard() {
    if(action.current||working||uncertain)return;
    action.current=true;setWorking(true);
    try{await clear();onExit();}catch(e){setError(e instanceof Error?e.message:'Falha ao descartar.');}
    finally{action.current=false;if(mounted.current)setWorking(false);}
  }
  async function verifyCommit() {
    if(action.current||working)return;
    action.current=true;setWorking(true);
    try{
      await verifyAuditBase(plugin,baseId);const latest=await repo.load();setData(latest);
      const saved=latest.auditBatches?.[id.current];
      if(saved){setSavedCount(saved.entries.length);onSaved(latest);setError('A gravação foi confirmada. Não registre estes itens manualmente.');}
      else setError('Nenhuma gravação deste bloco foi encontrada. Você pode tentar registrar novamente ou descartar.');
      setUncertain(false);
    }catch{setError('Ainda não foi possível verificar a gravação. Não registre manualmente até concluir esta conferência.');}
    finally{action.current=false;setWorking(false);}
  }
  return {draft,rows,setRows,data,error,working,finish,confirm,discard,savedCount,uncertain,verifyCommit,timeInput,setTimeInput,auditId:id.current};
}

export function QuestionAuditSummary({audit,titles}:{audit:ReturnType<typeof useQuestionAudit>;titles:Map<string,{title:string;subject:string}>}) {
  const {rows,setRows,data,working}=audit;
  const known=countedQuestions(data?.auditBatches??{});
  const counted=(row:AuditRow)=>!!row.questionKey&&known.has(studyDay(0,new Date(row.at??Date.now()))+'|'+row.questionKey);
  const eligible=selectedAuditRows(rows,audit.timeInput.lessonIds,known);
  const ids=new Set(eligible.map(r=>r.id));
  const pending=rows.filter(r=>!ids.has(r.id));
  const totals=new Map<string,{correct:number;incorrect:number}>();
  for(const row of eligible)if(row.lessonId&&row.correct!==null){const sum=totals.get(row.lessonId)??{correct:0,incorrect:0};sum.correct+=Number(row.correct);sum.incorrect+=Number(!row.correct);totals.set(row.lessonId,sum);}
  const correct=eligible.filter(r=>r.correct).length;
  const incorrect=eligible.length-correct;
  const byCard=eligible.filter(r=>r.recordByCard).length;
  const edit=(id:string,changes:Partial<AuditRow>)=>setRows(previous=>previous.map(r=>r.id===id?{...r,...changes,manual:true,recordByCard:false,include:false,at:r.at??Date.now()}:r));
  const invalid=eligible.some(r=>!r.questionKey||!r.lessonId||r.correct===null||r.issue&&!r.manual&&!(r.recordByCard&&r.cardFallbackEligible));
  const time=reviewTimePreview(audit.draft,audit.timeInput);
  const totalSeconds=time.sessions.reduce((sum,s)=>sum+s.seconds,0);
  const savedSeconds=Object.values(data?.sessions??{}).filter(s=>s.auditId===audit.auditId).reduce((sum,s)=>sum+s.seconds,0);
  if(audit.savedCount!==undefined)return <div className="rt-audit-summary"><h2>Revisão já registrada</h2><p>{audit.savedCount} respostas somadas · {formatDuration(savedSeconds)} de tempo registrado. Não repita o lançamento manualmente.</p><button type="button" disabled={working} onClick={()=>void audit.discard()}>Fechar revisão registrada</button></div>;
  function detail(row:AuditRow){return <details className="rt-row rt-audit-row" key={row.id}>
    <summary>{row.questionKey??'Sem identificação'} · {row.correct===null?'sem resposta confirmada':row.correct?'acerto':'erro'}{counted(row)?' · já registrada hoje':''}</summary>
    <p>{row.title}</p><p>{row.responses} avaliações detectadas; usa a primeira válida.</p>
    {row.issue&&<p>{row.recordByCard?'Questão 📖 sem link TEC: identificada pelo tópico do cartão.':row.issue}</p>}
    <label>Identificação<input value={row.questionKey??''} placeholder="tec:2417266" onChange={e=>edit(row.id,{questionKey:e.target.value.trim()})}/></label>
    {!row.questionKey&&<button type="button" onClick={()=>edit(row.id,{questionKey:'rem:'+row.cardIds[0]})}>Identificar pelo cartão após conferência manual</button>}
    <label>Aula<select value={row.lessonId??''} onChange={e=>edit(row.id,{lessonId:e.target.value||undefined})}><option value="">Selecione a aula</option>
      {row.lessonId&&!titles.has(row.lessonId)&&<option value={row.lessonId}>Aula original · {row.lessonId}</option>}
      {[...titles].map(([id,t])=><option key={id} value={id}>{t.subject} · {t.title}</option>)}</select></label>
    <label>Resultado<select value={row.correct===null?'':row.correct?'correct':'incorrect'} onChange={e=>edit(row.id,{correct:e.target.value===''?null:e.target.value==='correct'})}>
      <option value="">Não confirmado / não respondido</option><option value="correct">Acerto</option><option value="incorrect">Erro</option></select></label>
    {row.issue&&!row.manual&&!row.recordByCard&&<button type="button" onClick={()=>edit(row.id,{})}>Conferi este item manualmente</button>}
    <label className="rt-pareto-toggle"><input type="checkbox" disabled={counted(row)||!!row.issue&&!row.manual&&!(row.recordByCard&&row.cardFallbackEligible)} checked={row.include&&!counted(row)}
      onChange={e=>setRows(previous=>previous.map(r=>r.id===row.id?{...r,include:e.target.checked}:r))}/> Incluir no registro</label>
  </details>;}
  return <div className="rt-audit-summary">
    <h2>Registrar revisão do bloco</h2>
    <p>Esqueci = erro · Difícil, Bom ou Fácil = acerto. Confira os totais e salve.</p>
    {audit.uncertain&&<div role="alert"><p>A gravação precisa ser verificada antes de outro lançamento.</p><button type="button" disabled={working} onClick={()=>void audit.verifyCommit()}>Verificar se o bloco foi gravado</button></div>}
    {audit.draft&&<ReviewTimeForm draft={audit.draft} value={audit.timeInput} onChange={audit.setTimeInput} disabled={working||audit.uncertain} results={totals}/>}
    <section className="rt-confirm rt-block-total" aria-label="Total do bloco"><h3>Total do bloco</h3><strong>{correct} acertos · {incorrect} erros · {eligible.length} respostas</strong>
      <p>{eligible.length?(correct/eligible.length*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'% de acerto':'Nenhuma resposta selecionada'}{totalSeconds?' · '+formatDuration(totalSeconds)+' de revisão':''}</p>
    </section>
    {!!byCard&&<p className="rt-audit-notice">{byCard} respostas de questões 📖 sem link TEC identificadas pelo cartão. Cópias em outros tópicos não podem ser agrupadas automaticamente.</p>}
    <div className="rt-actions"><button className="rt-primary" type="button" disabled={working||audit.uncertain||!!time.error||!eligible.length&&!time.sessions.length||invalid} onClick={()=>void audit.confirm()}>{working?'Aguarde…':'Salvar revisão e resultados'}</button>
      <button type="button" disabled={working||audit.uncertain||!!time.error||!time.sessions.length} onClick={()=>void audit.confirm(false)}>Salvar somente o tempo</button>
      <button type="button" disabled={working||audit.uncertain} onClick={()=>void audit.discard()}>Descartar sem registrar</button></div>
    <fieldset disabled={working||audit.uncertain} className="rt-audit-items">
      <details><summary>Detalhes das respostas selecionadas ({eligible.length})</summary>{eligible.map(detail)}</details>
      <details><summary>Pendências e itens fora do registro ({pending.length})</summary><p>Não entram nos totais: respostas sem confirmação, questões já registradas no dia e itens excluídos. Abra apenas se quiser conferir.</p>{pending.map(detail)}</details>
    </fieldset>
    <details><summary>Resumo para copiar e registrar manualmente</summary><textarea readOnly rows={Math.max(3,totals.size+2)} aria-label="Resumo copiável"
      value={[...[...totals].map(([id,sum])=>(titles.get(id)?.title??id)+': '+sum.correct+' acertos; '+sum.incorrect+' erros.'),'Total: '+correct+' acertos; '+incorrect+' erros.'].join('\n')}/></details>
    <details><summary>Regras de contagem</summary><p>Usa a primeira resposta válida da questão no dia; reapresentações não aumentam o total. Questões TEC são agrupadas pelo número. Questões 📖 sem link usam o tópico do cartão. Itens incertos ficam fora até conferência opcional. Se já lançou estas questões manualmente, não as registre novamente. Descartar não desfaz avaliações enviadas ao RemNote.</p></details>
  </div>;
}
