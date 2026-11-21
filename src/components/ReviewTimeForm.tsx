import {reviewedCardCounts,reviewSessions,type ReviewTimeInput} from '../review-time';
import {formatDuration} from '../study-sessions';
import {studyDay} from '../resume';
import type {AuditDraft} from '../remnote/question-audit';
export function reviewTimePreview(draft:AuditDraft|undefined,input:ReviewTimeInput) {
  try{
    if(!draft)return {sessions:[],error:'Auditoria não preparada.'};
    const counts=reviewedCardCounts(draft.cards,draft.histories,draft.startedAt,draft.endedAt??Date.now());
    return {sessions:reviewSessions(draft.id,input,counts,draft.lessonInfo??{}),error:''};
  }catch(e){return {sessions:[],error:e instanceof Error?e.message:'Tempo inválido.'};}
}
export function ReviewTimeForm({draft,value,onChange,disabled,results}:{draft:AuditDraft;value:ReviewTimeInput;onChange:(value:ReviewTimeInput)=>void;disabled:boolean;
  results:Map<string,{correct:number;incorrect:number}>}) {
  const counts=reviewedCardCounts(draft.cards,draft.histories,draft.startedAt,draft.endedAt??Date.now());
  const ids=[...new Set(draft.cards.flatMap(c=>c.lessonId?[c.lessonId]:[]))].sort();
  const preview=reviewTimePreview(draft,value);
  const answered=ids.filter(id=>(counts[id]??0)>0);
  const visible=ids.filter(id=>value.lessonIds.includes(id));
  const toggle=(id:string,selected:boolean)=>onChange({...value,lessonIds:selected?[...new Set([...value.lessonIds,id])]:value.lessonIds.filter(x=>x!==id)});
  return <fieldset className="rt-review-selection" disabled={disabled}>
    <legend>Tempo da revisão</legend>
    <label className="rt-pareto-toggle"><input type="checkbox" checked={value.enabled} onChange={e=>onChange({...value,enabled:e.target.checked})}/> Registrar tempo deste bloco</label>
    {value.enabled&&<>
      <div className="rt-exam-grid"><label>Tempo efetivo · hh:mm:ss<input maxLength={8} value={value.duration} placeholder="00:25:00" onChange={e=>onChange({...value,duration:e.target.value})}/></label>
        <label>Data da revisão<input type="date" max={studyDay()} value={value.day} onChange={e=>onChange({...value,day:e.target.value})}/></label></div>
      <p>Ajuste o tempo se houve pausas.</p>
      <label className="rt-pareto-toggle"><input type="checkbox" checked={value.counted} onChange={e=>onChange({...value,counted:e.target.checked})}/> Descontar do tempo disponível para revisão</label>
      {preview.error&&<p role="alert">{preview.error}</p>}
    </>}
    <h3>Aulas respondidas</h3>
    <div className="rt-exam-grid">{visible.map(id=>{
      const sum=results.get(id)??{correct:0,incorrect:0};const seconds=preview.sessions.find(s=>s.lessonId===id)?.seconds;
      return <article className="rt-row" key={id}>
        <label className="rt-pareto-toggle"><input type="checkbox" checked onChange={()=>toggle(id,false)}/><strong>{draft.lessonInfo?.[id]?.title??id}</strong></label>
        <p>{draft.lessonInfo?.[id]?.subject}</p><p><strong>{sum.correct} acertos · {sum.incorrect} erros</strong> · {sum.correct+sum.incorrect} respostas para registrar</p>
        {!counts[id]&&<small>Aula incluída manualmente, sem avaliação detectada.</small>}
        {seconds!==undefined&&<small>{formatDuration(seconds)} · tempo rateado estimado</small>}
      </article>;
    })}</div>
    {!visible.length&&<p>Nenhuma aula respondida selecionada.</p>}
    <details><summary>Alterar aulas selecionadas</summary>
      {answered.map(id=><label className="rt-pareto-toggle" key={id}><input type="checkbox" checked={value.lessonIds.includes(id)} onChange={e=>toggle(id,e.target.checked)}/>{draft.lessonInfo?.[id]?.title??id}</label>)}
      {!!ids.filter(id=>!answered.includes(id)).length&&<details><summary>Aulas sem avaliação detectada</summary>
        {ids.filter(id=>!answered.includes(id)).map(id=><label className="rt-pareto-toggle" key={id}><input type="checkbox" checked={value.lessonIds.includes(id)} onChange={e=>toggle(id,e.target.checked)}/>{draft.lessonInfo?.[id]?.title??id}</label>)}
      </details>}
    </details>
    <details><summary>Observação e detalhes do tempo</summary>
      <p>O total é dividido entre as aulas selecionadas. O rateio por aula é estimado; você pode corrigi-lo no histórico.</p>
      <label>Observação<textarea maxLength={400} value={value.note} onChange={e=>onChange({...value,note:e.target.value})}/></label>
    </details>
  </fieldset>;
}
