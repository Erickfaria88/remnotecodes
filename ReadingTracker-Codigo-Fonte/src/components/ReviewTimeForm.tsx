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
export function ReviewTimeForm({draft,value,onChange,disabled}:{draft:AuditDraft;value:ReviewTimeInput;onChange:(value:ReviewTimeInput)=>void;disabled:boolean}) {
  const counts=reviewedCardCounts(draft.cards,draft.histories,draft.startedAt,draft.endedAt??Date.now());
  const ids=[...new Set(draft.cards.flatMap(c=>c.lessonId?[c.lessonId]:[]))].sort();
  const preview=reviewTimePreview(draft,value);
  return <fieldset className="rt-review-selection" disabled={disabled}>
    <legend>Registro de tempo da revisão</legend>
    <label className="rt-pareto-toggle"><input type="checkbox" checked={value.enabled} onChange={e=>onChange({...value,enabled:e.target.checked})}/> Registrar tempo deste bloco</label>
    {value.enabled&&<>
      <div className="rt-exam-grid"><label>Tempo efetivo · hh:mm:ss<input maxLength={8} value={value.duration} placeholder="00:25:00" onChange={e=>onChange({...value,duration:e.target.value})}/></label>
        <label>Data da revisão<input type="date" max={studyDay()} value={value.day} onChange={e=>onChange({...value,day:e.target.value})}/></label></div>
      <p>A sugestão considera o intervalo de resolução até sair da fila. Ajuste se houve pausas. O tempo de conferência deste resumo não entra na sugestão.</p>
      <label className="rt-pareto-toggle"><input type="checkbox" checked={value.counted} onChange={e=>onChange({...value,counted:e.target.checked})}/> Descontar do tempo disponível para revisão</label>
      <p>Confirme as aulas realmente revisadas. A seleção inicial usa os cartões com avaliação detectada, incluindo flashcards sem link TEC.</p>
      {ids.map(id=><label className="rt-pareto-toggle" key={id}><input type="checkbox" checked={value.lessonIds.includes(id)} onChange={e=>onChange({...value,lessonIds:e.target.checked?[...value.lessonIds,id]:value.lessonIds.filter(x=>x!==id)})}/>
        {draft.lessonInfo?.[id]?.title??id} · {counts[id]??0} cartões avaliados detectados</label>)}
      {preview.error?<p role="alert">{preview.error}</p>:<ul>{preview.sessions.map(s=><li key={s.id}>{s.title} · {formatDuration(s.seconds)} · rateio estimado</li>)}</ul>}
      <p>O total será registrado uma única vez, dividido entre as aulas selecionadas. O rateio por aula é estimado; o histórico permite corrigir o tempo posteriormente.</p>
      <label>Observação<textarea maxLength={400} value={value.note} onChange={e=>onChange({...value,note:e.target.value})}/></label>
    </>}
  </fieldset>;
}
