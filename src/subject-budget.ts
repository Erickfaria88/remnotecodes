import type {Backup} from './remnote/storage';
import {studyDay} from './resume';
export const defaultSubjectDailyMinutes=120;
export const validSubjectDailyMinutes=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=1&&v<=1440;
export function subjectUsage(data:Pick<Backup,'sessions'>,day=studyDay()) {
  const rows=Object.values(data.sessions??{}).filter(s=>s.counted&&s.day===day);
  const used:Record<string,number>=Object.create(null);
  for(const s of rows)used[s.subjectId]=(used[s.subjectId]??0)+s.seconds;
  const last=rows[rows.length-1];
  const recent=new Set(last?rows.filter(s=>s.id===last.id||!!last.auditId&&s.auditId===last.auditId).map(s=>s.subjectId):[]);
  return {used,recent};
}
export function subjectSecondsRemaining(data:Pick<Backup,'sessions'|'subjectDailyMinutes'>,subjects:Iterable<string>,day=studyDay(),reserved:Record<string,number>={}) {
  const {used}=subjectUsage(data,day);const result:Record<string,number>=Object.create(null);
  for(const id of subjects)result[id]=Math.max(0,(data.subjectDailyMinutes??defaultSubjectDailyMinutes)*60-(used[id]??0)-Math.max(0,reserved[id]??0));
  return result;
}
export interface ReviewSubjectLimits {subjectByLesson:Map<string,string>;remainingSeconds:Record<string,number>}
export function plannedReviewSeconds(blocks:{lessons:{id:string;cardIds:string[]}[]}[],subjects:Map<string,string>,secondsPerCard:number) {
  const result:Record<string,number>=Object.create(null);const seen=new Set<string>();
  for(const block of blocks)for(const lesson of block.lessons){const subject=subjects.get(lesson.id);if(!subject)continue;
    for(const card of lesson.cardIds)if(!seen.has(card)){seen.add(card);result[subject]=(result[subject]??0)+secondsPerCard;}
  }
  return result;
}
