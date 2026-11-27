import {AppEvents,usePlugin} from '@remnote/plugin-sdk';
import {useEffect,useRef,useState} from 'react';
import type {AuditDraft} from '../remnote/question-audit';
export function ManualAnswerControl({draft,onMark,disabled}:{draft:AuditDraft;onMark:(id:string,correct:boolean|null)=>Promise<unknown>;disabled:boolean}){
 const plugin=usePlugin();const [id,setId]=useState<string>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);
 useEffect(()=>{let live=true;let pending=false;
 const refresh=async()=>{if(pending)return;pending=true;try{const card=await plugin.queue.getCurrentCard();if(live)setId(card&&draft.cards.some(c=>c.cardId===card._id&&c.remId===card.remId)?card._id:undefined);}catch{if(live)setId(undefined);}finally{pending=false;}};
 const changed=()=>{setId(undefined);void refresh();};void refresh();const timer=setInterval(()=>void refresh(),750);plugin.event.addListener(AppEvents.QueueLoadCard,undefined,changed);return()=>{live=false;clearInterval(timer);plugin.event.removeListener(AppEvents.QueueLoadCard,undefined,changed);};},[plugin,draft.id]);
 const card=draft.cards.find(c=>c.cardId===id);const answer=[...(draft.manualAnswers??[])].reverse().find(m=>m.questionKey===(card?.questionKey??'rem:'+card?.remId));
 async function mark(correct:boolean|null){if(!id||lock.current)return;lock.current=true;setBusy(true);setError('');try{await onMark(id,correct);}catch(e){setError(e instanceof Error?e.message:'Falha ao guardar marcação.');}finally{lock.current=false;setBusy(false);}}
 return <section className="rt-manual-answer" aria-label="Resultado manual da questão"><div><strong>Contar como questão</strong><small>{card?card.title:'Aguardando identificar o cartão deste bloco…'}</small></div><button disabled={disabled||busy||!card?.lessonId} aria-pressed={answer?.correct===true} onClick={()=>void mark(true)}>✅ Acertei</button><button disabled={disabled||busy||!card?.lessonId} aria-pressed={answer?.correct===false} onClick={()=>void mark(false)}>❌ Errei</button>{answer&&<><span role="status">{answer.correct?'Acerto':'Erro'} marcado</span><button disabled={disabled||busy} onClick={()=>void mark(null)}>Desfazer marcação</button></>}{error&&<p role="alert">{error}</p>}<small>Guardado no resumo deste bloco. Use os botões do RemNote para a repetição espaçada.</small></section>;
}

