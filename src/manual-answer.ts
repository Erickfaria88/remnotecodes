import {validAuditId,validQuestionKey,type AuditCard,type AuditRow} from './question-audit';
import {studyDay} from './resume';
export interface ManualAnswer {cardId:string;lessonId:string;questionKey:string;correct:boolean;at:number}
export function validManualAnswers(value:unknown,cards:AuditCard[]):value is ManualAnswer[]{
 return Array.isArray(value)&&value.length<=4000&&value.every(m=>m&&validAuditId(m.cardId)&&validAuditId(m.lessonId)&&validQuestionKey(m.questionKey)&&typeof m.correct==='boolean'&&Number.isSafeInteger(m.at)&&m.at>0&&cards.some(c=>c.cardId===m.cardId&&c.lessonId===m.lessonId&&(c.questionKey?c.questionKey===m.questionKey:m.questionKey==='rem:'+c.remId)));
}
const key=(m:{questionKey?:string;at?:number})=>m.questionKey+'|'+studyDay(0,new Date(m.at!));
export function setManualAnswer(marks:ManualAnswer[],answer:ManualAnswer){return [...marks.filter(m=>key(m)!==key(answer)),answer];}
export function applyManualAnswers(rows:AuditRow[],cards:AuditCard[],marks:ManualAnswer[]=[]){
 if(!validManualAnswers(marks,cards))throw new Error('Marcação manual inválida.');
 let result=[...rows];
 for(const m of marks){const c=cards.find(c=>c.cardId===m.cardId)!;
 result=result.filter(r=>!(r.questionKey===m.questionKey&&r.at&&key(r)===key(m))&&!(r.cardIds.includes(m.cardId)&&(!r.at||studyDay(0,new Date(r.at))===studyDay(0,new Date(m.at)))));
 result.push({id:'manual_'+m.cardId+'_'+m.at,cardIds:[m.cardId],questionKey:m.questionKey,lessonId:m.lessonId,title:c.title,correct:m.correct,at:m.at,issue:'',responses:1,include:true,manual:true});}
 return result;
}
