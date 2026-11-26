import type {ManualAnswer} from './manual-answer';
import {historyDelta,outcome,validAuditId,type AuditCard,type Repetition} from './question-audit';
import {formatDuration,parseDuration,type StudySession} from './study-sessions';
import {studyDay,validStudyDay} from './resume';
export interface ReviewLessonInfo {title:string;subject:string;subjectId:string}
export interface ReviewTimeInput {enabled:boolean;duration:string;day:string;lessonIds:string[];counted:boolean;note:string}
export function validReviewTimeInput(value:unknown):value is ReviewTimeInput {
  const v=value as ReviewTimeInput|undefined;
  return !!v && typeof v.enabled==='boolean' && typeof v.duration==='string' && v.duration.length<=20 && typeof v.day==='string'&&(v.day===''||validStudyDay(v.day)) &&
    Array.isArray(v.lessonIds)&&v.lessonIds.every(validAuditId)&&new Set(v.lessonIds).size===v.lessonIds.length && typeof v.counted==='boolean' && typeof v.note==='string'&&v.note.length<=400;
}
export function reviewedCardCounts(cards:AuditCard[],histories:Record<string,Repetition[]|null>,startedAt:number,endedAt:number,manualAnswers:ManualAnswer[]=[]) {
  const counts:Record<string,number>={};const seen=new Set<string>();
  for(const card of cards)if(card.lessonId&&!seen.has(card.cardId)) {
    seen.add(card.cardId);
    const delta=historyDelta(card.baseline,histories[card.cardId]??null);
    if(manualAnswers.some(m=>m.cardId===card.cardId&&m.lessonId===card.lessonId&&m.at>=startedAt&&m.at<=endedAt)||delta.entries.some(r=>r.date>=startedAt&&r.date<=endedAt&&outcome(r.score)!==null))counts[card.lessonId]=(counts[card.lessonId]??0)+1;
  }
  return counts;
}
export function defaultReviewTime(practiceStartedAt:number|undefined,endedAt:number|undefined,counts:Record<string,number>):ReviewTimeInput {
  const seconds=practiceStartedAt&&endedAt?Math.round((endedAt-practiceStartedAt)/1000):0;
  return {enabled:true,duration:seconds>0&&seconds<=86400?formatDuration(seconds):'',day:studyDay(0,new Date(endedAt??Date.now())),
    lessonIds:Object.keys(counts).sort(),counted:true,note:''};
}
/** Largest remainder allocation preserves the exact block total in seconds. */
export function allocateReviewTime(seconds:number,ids:string[],counts:Record<string,number>) {
  if(!Number.isSafeInteger(seconds)||seconds<1||seconds>86400)throw new Error('Tempo de revisão inválido.');
  const lessons=[...new Set(ids)].sort();
  if(!lessons.length)throw new Error('Selecione as aulas realmente revisadas para registrar o tempo.');
  if(seconds<lessons.length)throw new Error('O tempo deve permitir pelo menos um segundo por aula selecionada.');
  const weights=lessons.map(id=>Math.max(1,counts[id]??0));const total=weights.reduce((a,b)=>a+b,0);
  const distributable=seconds-lessons.length;
  const rows=lessons.map((id,i)=>{const raw=distributable*weights[i]/total;return {id,seconds:1+Math.floor(raw),fraction:raw-Math.floor(raw)};});
  let rest=seconds-rows.reduce((sum,r)=>sum+r.seconds,0);
  for(const row of [...rows].sort((a,b)=>b.fraction-a.fraction||a.id.localeCompare(b.id))){if(rest--<=0)break;row.seconds++;}
  return rows.map(({id,seconds})=>({lessonId:id,seconds}));
}
export function reviewSessions(batchId:string,input:ReviewTimeInput,counts:Record<string,number>,info:Record<string,ReviewLessonInfo>):StudySession[] {
  if(!input.enabled)return [];
  if(!validStudyDay(input.day)||input.day>studyDay())throw new Error('Escolha uma data de revisão válida, até hoje.');
  if(input.note.length>400)throw new Error('A observação deve ter até 400 caracteres.');
  const allocation=allocateReviewTime(parseDuration(input.duration),input.lessonIds,counts);
  return allocation.map((row,index)=>{
    const lesson=info[row.lessonId];
    if(!lesson?.subjectId||!lesson.title||!lesson.subject)throw new Error('Não foi possível identificar a disciplina de uma aula. Reabra a auditoria na base de origem.');
    return {id:batchId+'_rev_'+index,auditId:batchId,lessonId:row.lessonId,subjectId:lesson.subjectId,title:lesson.title,subject:lesson.subject,
      day:input.day,category:'review',seconds:row.seconds,counted:input.counted,reviewedCards:counts[row.lessonId]??0,
      note:('Revisão em bloco · rateio estimado por cartões avaliados. '+input.note.trim()).trim()};
  });
}

