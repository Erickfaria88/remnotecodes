import {usePlugin} from '@remnote/plugin-sdk';
import {useEffect,useState} from 'react';
import type {Backup} from '../remnote/storage';
import {documentTitle} from '../remnote/documents';
import {formatDuration} from '../study-sessions';
export function AuditHistory({data}:{data:Backup}) {
  const plugin=usePlugin();const [open,setOpen]=useState(false);const [names,setNames]=useState<Record<string,string>>({});
  const batches=Object.values(data.auditBatches??{}).sort((a,b)=>b.createdAt-a.createdAt).slice(0,20);
  const ids=[...new Set(batches.flatMap(b=>[...b.entries.map(e=>e.lessonId),...(b.reviewSessions??[]).map(s=>s.lessonId)]))].sort().join(',');
  useEffect(()=>{if(!open)return;let live=true;
    void plugin.rem.findMany(ids?ids.split(','):[]).then(async rows=>{
      const pairs=await Promise.all((rows??[]).map(async r=>[r._id,await documentTitle(plugin,r)] as const));if(live)setNames(Object.fromEntries(pairs));
    }).catch(()=>undefined);return()=>{live=false;};
  },[plugin,open,ids]);
  return <details className="rt-card" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Auditorias confirmadas ({Object.keys(data.auditBatches??{}).length})</summary>
    <p>Últimos 20 blocos confirmados. O backup JSON inclui todo o histórico. Correções posteriores nos totais de exercícios não reescrevem estes registros de origem.</p>
    {!batches.length&&<p>Nenhuma auditoria confirmada.</p>}
    {open&&batches.map(batch=><details className="rt-row" key={batch.id}>
      <summary>{new Date(batch.createdAt).toLocaleString('pt-BR')} · {batch.entries.length} questões somadas · {formatDuration(Object.values(data.sessions??{}).filter(s=>s.auditId===batch.id).reduce((sum,s)=>sum+s.seconds,0))} de tempo no histórico</summary>
      <ul>{[...new Set([...batch.entries.map(e=>e.lessonId),...(batch.reviewSessions??[]).map(s=>s.lessonId)])].map(id=>{
        const entries=batch.entries.filter(e=>e.lessonId===id);const sessions=Object.values(data.sessions??{}).filter(s=>s.auditId===batch.id&&s.lessonId===id);
        const original=batch.reviewSessions?.find(s=>s.lessonId===id);
        return <li key={id}><strong>{names[id]??original?.title??id}</strong> · {original?.subject??sessions[0]?.subject??''} · {formatDuration(sessions.reduce((sum,s)=>sum+s.seconds,0))} · {entries.filter(e=>e.correct).length} acertos · {entries.filter(e=>!e.correct).length} erros registrados</li>;
      })}</ul>
      <ul>{batch.entries.map(entry=><li key={entry.day+'|'+entry.questionKey}>
        {names[entry.lessonId]??entry.lessonId} · {entry.questionKey} · {entry.correct?'Acerto':'Erro'} · {entry.day.split('-').reverse().join('/')} · {entry.origin==='manual'?'conferido manualmente':'proposto pelo histórico e confirmado'}
      </li>)}</ul>
    </details>)}
  </details>;
}
