import {studyDay} from './resume';
import type {SessionInput} from './study-sessions';
import {sessionCategories} from './study-sessions';
export interface StudyTimer {
  version:1;id:string;baseId:string;lessonId:string;title:string;
  category:SessionInput['category'];status:'running'|'paused'|'finished';
  startedAt:number;runningSince:number|null;accumulatedMs:number;finishedAt?:number;
}
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,150}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
export function validStudyTimer(value:unknown,baseId:string):value is StudyTimer {
  const t=value as StudyTimer|undefined;
  return !!t&&t.version===1&&t.baseId===baseId&&validId(t.id)&&validId(t.lessonId)&&typeof t.title==='string'&&!!t.title.trim()&&
    sessionCategories.some(c=>c.id===t.category)&&['running','paused','finished'].includes(t.status)&&
    Number.isSafeInteger(t.startedAt)&&t.startedAt>0&&Number.isSafeInteger(t.accumulatedMs)&&t.accumulatedMs>=0&&
    (t.status==='running'?Number.isSafeInteger(t.runningSince)&&t.runningSince!>=t.startedAt:t.runningSince===null)&&
    (t.status==='finished'?Number.isSafeInteger(t.finishedAt)&&t.finishedAt!>=t.startedAt:t.finishedAt===undefined);
}
export function timerMilliseconds(timer:StudyTimer,now=Date.now()) {
  return timer.accumulatedMs+(timer.status==='running'?Math.max(0,now-timer.runningSince!):0);
}
export function newStudyTimer(baseId:string,lessonId:string,title:string,category:SessionInput['category']='theory',now=Date.now(),id='timer_'+crypto.randomUUID().replaceAll('-','')):StudyTimer {
  const timer:StudyTimer={version:1,id,baseId,lessonId,title,category,status:'running',startedAt:now,runningSince:now,accumulatedMs:0};
  if(!validStudyTimer(timer,baseId))throw new Error('Dados inválidos para iniciar o estudo.');
  return timer;
}
export function pauseStudyTimer(timer:StudyTimer,now=Date.now()):StudyTimer {
  if(timer.status==='finished')throw new Error('Este estudo já foi concluído. Abra o registro pendente.');
  if(timer.status==='paused')return timer;
  return {...timer,status:'paused',accumulatedMs:timerMilliseconds(timer,now),runningSince:null};
}
export function resumeStudyTimer(timer:StudyTimer,now=Date.now()):StudyTimer {
  if(timer.status==='finished')throw new Error('Este estudo já foi concluído. Abra o registro pendente.');
  if(timer.status==='running')return timer;
  return {...timer,status:'running',runningSince:Math.max(now,timer.startedAt)};
}
export function finishStudyTimer(timer:StudyTimer,now=Date.now()):StudyTimer {
  if(timer.status==='finished')return timer;
  return {...timer,status:'finished',runningSince:null,accumulatedMs:timerMilliseconds(timer,now),finishedAt:Math.max(now,timer.startedAt)};
}
export function timerSession(timer:StudyTimer):SessionInput {
  if(timer.status!=='finished')throw new Error('Conclua o cronômetro antes de registrar o estudo.');
  return {id:timer.id,seconds:Math.max(1,Math.floor(timer.accumulatedMs/1000)),day:studyDay(0,new Date(timer.finishedAt!)),
    category:timer.category,counted:true,note:'Tempo medido pelo cronômetro do Reading Tracker.'};
}
export const timerStorageKey=(baseId:string)=>'reading-tracker:study-timer:'+encodeURIComponent(baseId);
export const openedLessonKey=(baseId:string,lessonId:string)=>'reading-tracker:opened-lesson:'+encodeURIComponent(baseId)+':'+lessonId;
interface LocalStorage {getLocal<T>(key:string):Promise<T|undefined>;setLocal(key:string,value:unknown):Promise<void>}
export function createTimerRepository(storage:LocalStorage,baseId:string) {
  let pending:Promise<unknown>=Promise.resolve();const key=timerStorageKey(baseId);
  async function load(){const value=await storage.getLocal<unknown>(key);if(value===undefined||value===null)return undefined;
    if(!validStudyTimer(value,baseId))throw new Error('Cronômetro local inválido. Preserve o registro para conferência.');return value;}
  function write(update:(current:StudyTimer|undefined)=>StudyTimer|null){const operation=pending.then(async()=>{
    const next=update(await load());if(next&&!validStudyTimer(next,baseId))throw new Error('Cronômetro inválido.');
    await storage.setLocal(key,next);return next??undefined;
  });pending=operation.catch(()=>undefined);return operation;}
  const existing=(t:StudyTimer|undefined,id:string)=>{if(!t||t.id!==id)throw new Error('O cronômetro mudou. Atualize o painel.');return t;};
  return {load,
    start:(lessonId:string,title:string,category:SessionInput['category']='theory',now=Date.now())=>write(t=>{
      if(t)throw new Error('Já existe um estudo em andamento ou pendente de registro. Conclua ou descarte esse cronômetro primeiro.');
      return newStudyTimer(baseId,lessonId,title,category,now);
    }),
    pause:(id:string,now=Date.now())=>write(t=>pauseStudyTimer(existing(t,id),now)),
    resume:(id:string,now=Date.now())=>write(t=>resumeStudyTimer(existing(t,id),now)),
    finish:(id:string,now=Date.now())=>write(t=>finishStudyTimer(existing(t,id),now)),
    clear:(id:string)=>{const operation=pending.then(async()=>{const current=await load();if(current?.id!==id)return false;await storage.setLocal(key,null);return true;});pending=operation.catch(()=>undefined);return operation;},
  };
}
