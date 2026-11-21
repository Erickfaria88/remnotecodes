import { studyDay, validStudyDay } from './resume';
import {validSession,type StudySession} from './study-sessions';

export interface Repetition { date: number; score: number; responseTime?: number; scheduled?: number; isCram?: boolean }
export interface AuditCard {
  cardId: string; remId?: string; lessonId?: string; title: string;
  questionKey?: string; identityIssue?: string;
  baseline: Repetition[] | null;
}
export interface AuditRow {
  id: string; cardIds: string[]; questionKey?: string; lessonId?: string; title: string;
  correct: boolean | null; at?: number; issue: string; responses: number;
  include: boolean; manual: boolean;
}
export interface AuditEntry {
  questionKey: string; lessonId: string; day: string; correct: boolean; at: number; origin: 'history' | 'manual';
}
export interface AuditBatch { id: string; createdAt: number; entries: AuditEntry[]; reviewSessions?:StudySession[] }
export const validAuditId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,150}$/.test(id) && !['__proto__','constructor','prototype'].includes(id);
export const validQuestionKey = (key: unknown): key is string => typeof key === 'string' && /^(tec:\d{1,20}|rem:[A-Za-z0-9_-]{1,150})$/.test(key);
export function tecQuestionKeys(urls: string[]) {
  const keys = new Set<string>();
  for (const text of urls) {
    try {
      const url = new URL(text);
      if (!['https:','http:'].includes(url.protocol) || !['tecconcursos.com.br','www.tecconcursos.com.br'].includes(url.hostname.toLowerCase())) continue;
      const match = /^\/questoes\/(\d{1,20})\/?$/.exec(url.pathname);
      if (match) keys.add('tec:' + match[1].replace(/^0+(?=\d)/,''));
    } catch { /* A display label or unsupported URL is not an identity. */ }
  }
  return [...keys];
}
export function outcome(score: number): boolean | null {
  return score === 0 ? false : [0.5,1,1.5].includes(score) ? true : null;
}
const signature = (row: Repetition) => JSON.stringify([row.date,row.score,row.responseTime,row.scheduled,row.isCram]);
export function historyDelta(before: Repetition[] | null, after: Repetition[] | null) {
  if (!before || !after) return { entries: [] as Repetition[], issue: 'Histórico indisponível; confira manualmente.' };
  const remaining = new Map<string,number>();
  for (const row of before) remaining.set(signature(row),(remaining.get(signature(row))??0)+1);
  const entries: Repetition[] = [];
  for (const row of after) {
    const key=signature(row);const count=remaining.get(key)??0;
    if(count)remaining.set(key,count-1);else entries.push(row);
  }
  return { entries, issue:[...remaining.values()].some(n=>n>0) ? 'Histórico alterado ou resposta desfeita; confira manualmente.' : '' };
}
export function auditRows(cards: AuditCard[], histories: Record<string,Repetition[]|null>, startedAt: number,
  endedAt: number, issues: Record<string,string> = {}): AuditRow[] {
  const groups = new Map<string, {cards:AuditCard[]; entries:Repetition[]; issues:string[]}>();
  for(const card of cards) {
    const key=card.questionKey??'card:'+card.cardId;
    const group=groups.get(key)??{cards:[],entries:[],issues:[]};
    group.cards.push(card);
    const delta=historyDelta(card.baseline,histories[card.cardId]??null);
    const within=delta.entries.filter(r=>Number.isFinite(r.date)&&r.date>=startedAt&&r.date<=endedAt&&outcome(r.score)!==null);
    group.entries.push(...within);
    group.issues.push(...[card.identityIssue,delta.issue,issues[card.cardId]].filter((x):x is string=>!!x));
    if(delta.entries.some(r=>outcome(r.score)!==null && (r.date<startedAt || r.date>endedAt))) group.issues.push('Há avaliações fora do intervalo do bloco; confira manualmente.');
    groups.set(key,group);
  }
  return [...groups].flatMap(([key,whole])=>{
    const days=[...new Set(whole.entries.map(r=>studyDay(0,new Date(r.date))))];
    return (days.length?days:['']).map(day=>{
    const id=key+(day?'|'+day:'');
    const group={...whole,issues:[...whole.issues],entries:whole.entries.filter(r=>!day || studyDay(0,new Date(r.date))===day)};
    const lessons=[...new Set(group.cards.map(c=>c.lessonId).filter(Boolean))];
    const first=group.entries.slice().sort((a,b)=>a.date-b.date)[0];
    if(day && group.cards.some(c=>c.baseline?.some(r=>outcome(r.score)!==null && studyDay(0,new Date(r.date))===day)))
      group.issues.push('O cartão já tinha avaliação neste dia antes do bloco; confira a primeira tentativa manualmente.');
    if(lessons.length!==1 || group.cards.some(c=>!c.lessonId)) group.issues.push('Aula de origem ausente ou ambígua.');
    const earliest=group.entries.filter(r=>r.date===first?.date);
    if(new Set(earliest.map(r=>outcome(r.score))).size>1)group.issues.push('Avaliações conflitantes no mesmo instante.');
    const issue=[...new Set(group.issues)].join(' ');
    return {id,cardIds:group.cards.map(c=>c.cardId),questionKey:group.cards[0].questionKey,
      lessonId:lessons.length===1?lessons[0]:undefined,title:group.cards[0].title,
      correct:first?outcome(first.score):null,at:first?.date,issue,responses:group.entries.length,
      include:!!first && !issue && !!group.cards[0].questionKey,manual:false};
    });
  });
}
export function validAuditBatch(value: unknown): value is AuditBatch {
  if(!value || typeof value!=='object')return false;
  const row=value as AuditBatch;
  return validAuditId(row.id) && Number.isSafeInteger(row.createdAt) && row.createdAt>0 &&
    (row.reviewSessions===undefined || Array.isArray(row.reviewSessions)&&row.reviewSessions.length<=2000 &&
      row.reviewSessions.every(s=>validSession(s)&&s.auditId===row.id&&s.category==='review') && new Set(row.reviewSessions.map(s=>s.id)).size===row.reviewSessions.length &&
      new Set(row.reviewSessions.map(s=>s.lessonId)).size===row.reviewSessions.length && row.reviewSessions.reduce((sum,s)=>sum+s.seconds,0)<=86400) &&
    Array.isArray(row.entries) && row.entries.length<=2000 && row.entries.every(e=>
    e && validQuestionKey(e.questionKey) && validAuditId(e.lessonId) && validStudyDay(e.day) && typeof e.correct==='boolean' &&
    Number.isSafeInteger(e.at)&&e.at>0 && ['history','manual'].includes(e.origin));
}
export function approvedEntries(rows: AuditRow[], now = Date.now()): AuditEntry[] {
  return rows.filter(row=>row.include).map(row=>{
    if(!validQuestionKey(row.questionKey) || !validAuditId(row.lessonId) || row.correct===null || row.issue && !row.manual) throw new Error('Resolva as pendências dos itens selecionados antes de confirmar.');
    const at=row.at??now;
    return {questionKey:row.questionKey,lessonId:row.lessonId,correct:row.correct,at,day:studyDay(0,new Date(at)),origin:row.manual?'manual':'history'};
  });
}
export function countedQuestions(batches: Record<string,AuditBatch>) {
  return new Set(Object.values(batches).flatMap(b=>b.entries.map(e=>e.day+'|'+e.questionKey)));
}
