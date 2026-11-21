import type { RNPlugin, PluginRem } from '@remnote/plugin-sdk';
import { historyDelta, tecQuestionKeys, validAuditId, validQuestionKey, type AuditCard, type AuditRow, type Repetition } from '../question-audit';
import type {ReviewLessonInfo,ReviewTimeInput} from '../review-time';
import {validReviewTimeInput} from '../review-time';

export interface AuditDraft {
  version:1; id:string; baseId:string; startedAt:number; endedAt?:number;
  cards:AuditCard[]; histories:Record<string,Repetition[]|null>; issues:Record<string,string>;
  rows?:AuditRow[]; phase:'running'|'summary';
  practiceStartedAt?:number;
  lessonInfo?:Record<string,ReviewLessonInfo>;
  reviewTime?:ReviewTimeInput;
}
export const auditDraftKey=(baseId:string)=>'reading-tracker:audit-draft:'+encodeURIComponent(baseId);
const leaseKey=(baseId:string)=>'reading-tracker:audit-lease:'+encodeURIComponent(baseId);
export async function verifyAuditBase(plugin:RNPlugin,baseId:string) {
  if((await plugin.kb.getCurrentKnowledgeBaseData())._id!==baseId)throw new Error('A base ativa mudou. Reabra a base de origem para auditar.');
}
export function readHistory(value:unknown):Repetition[]|null {
  if(!Array.isArray(value) || value.some(r=>!r || !Number.isSafeInteger(r.date) || r.date<=0 || typeof r.score!=='number' || !Number.isFinite(r.score)))return null;
  return value.map(r=>({date:r.date,score:r.score,...(typeof r.responseTime==='number'?{responseTime:r.responseTime}:{}),
    ...(typeof r.scheduled==='number'?{scheduled:r.scheduled}:{}),...(typeof r.isCram==='boolean'?{isCram:r.isCram}:{})}));
}
export function validDraft(value:unknown,baseId:string):value is AuditDraft {
  const d=value as AuditDraft|undefined;
  return !!d && d.version===1 && validAuditId(d.id) && d.baseId===baseId && Number.isSafeInteger(d.startedAt) && d.startedAt>0 &&
    (d.practiceStartedAt===undefined||Number.isSafeInteger(d.practiceStartedAt)&&d.practiceStartedAt>0) &&
    (d.endedAt===undefined||Number.isSafeInteger(d.endedAt)&&d.endedAt>=d.startedAt) &&
    (d.reviewTime===undefined||validReviewTimeInput(d.reviewTime)) &&
    (d.lessonInfo===undefined||!!d.lessonInfo&&typeof d.lessonInfo==='object'&&Object.entries(d.lessonInfo).every(([id,info])=>validAuditId(id)&&info&&typeof info.title==='string'&&typeof info.subject==='string'&&validAuditId(info.subjectId))) &&
    ['running','summary'].includes(d.phase) && Array.isArray(d.cards) && d.cards.length<=2000 &&
    d.cards.every(c=>c && validAuditId(c.cardId) && typeof c.title==='string' && (c.remId===undefined||validAuditId(c.remId)) &&
      (c.lessonId===undefined||validAuditId(c.lessonId)) && (c.questionKey===undefined||validQuestionKey(c.questionKey)) &&
      (c.identityIssue===undefined||typeof c.identityIssue==='string') && (c.baseline===null || readHistory(c.baseline)!==null)) &&
    !!d.histories && typeof d.histories==='object' && !Array.isArray(d.histories) && Object.values(d.histories).every(h=>h===null||readHistory(h)!==null) &&
    !!d.issues && typeof d.issues==='object' && !Array.isArray(d.issues) && Object.values(d.issues).every(i=>typeof i==='string');
}
export async function claimAudit(plugin:RNPlugin,baseId:string,id:string,owner=id) {
  await verifyAuditBase(plugin,baseId);
  const old=await plugin.storage.getSession<{id:string;owner:string;at:number}>(leaseKey(baseId));
  if(old && old.owner!==owner && Date.now()-old.at<120000)throw new Error('Há outra revisão em auditoria nesta base. Encerre-a antes de iniciar ou recuperar outro bloco. Após uma interrupção, aguarde até dois minutos.');
  await plugin.storage.setSession(leaseKey(baseId),{id,owner,at:Date.now()});
  const own=await plugin.storage.getSession<{id:string;owner:string}>(leaseKey(baseId));
  if(own?.id!==id || own.owner!==owner)throw new Error('Outra tela iniciou a auditoria. Use apenas uma tela de revisão.');
}
export async function releaseAudit(plugin:RNPlugin,baseId:string,id:string,owner=id) {
  const lease=await plugin.storage.getSession<{id:string;owner:string}>(leaseKey(baseId));
  if(lease?.id===id && lease.owner===owner)await plugin.storage.setSession(leaseKey(baseId),null);
}
export async function prepareAudit(plugin:RNPlugin,baseId:string,id:string,cardIds:string[],owners:Map<string,string>,owner=id):Promise<AuditDraft> {
  await claimAudit(plugin,baseId,id,owner);
  const old=await plugin.storage.getLocal<unknown>(auditDraftKey(baseId));
  if(old)throw new Error('Existe uma auditoria pendente. Confira ou descarte o rascunho antes de iniciar.');
  const startedAt=Date.now();const all=await plugin.card.findMany(cardIds);const byId=new Map(all.map(c=>[c._id,c]));
  const cache=new Map<string,Promise<PluginRem|undefined>>();
  const rem=(id:string)=>{if(!cache.has(id))cache.set(id,plugin.rem.findOne(id));return cache.get(id)!;};
  const cards:AuditCard[]=[];const histories:AuditDraft['histories']={};
  // Bounded concurrency avoids a burst of ancestry and rich-text requests.
  for(let offset=0;offset<cardIds.length;offset+=8) {
    const rows=await Promise.all(cardIds.slice(offset,offset+8).map(async cardId=>{
      const card=byId.get(cardId);const lessonId=owners.get(cardId);const baseline=readHistory(card?.repetitionHistory);
      let title='Cartão '+cardId;let questionKey:string|undefined;let identityIssue='';
      if(!card || !lessonId)return {cardId,title,lessonId,baseline,identityIssue:'Cartão ou aula não identificados.'};
      let current:string|undefined=card.remId;const seen=new Set<string>();let reached=false;
      try {
      while(current && !seen.has(current) && seen.size<100) {
        if(current===lessonId){reached=true;break;}
        seen.add(current);const row=await rem(current);if(!row)break;
        if(current===card.remId && row.text)title=await plugin.richText.toString(row.text);
        const keys=tecQuestionKeys(row.text?await plugin.richText.findAllExternalURLs(row.text):[]);
        if(!questionKey && keys.length===1)questionKey=keys[0];
        if(keys.length>1)identityIssue='Mais de uma questão TEC no mesmo tópico; confira a identificação.';
        current=row.parent??undefined;
      }
      } catch { identityIssue='Falha ao consultar o conteúdo ou os links. Confira a questão e sua aula manualmente.'; }
      if(!reached)identityIssue='Não foi possível confirmar a hierarquia até a aula original.';
      if(!questionKey)identityIssue=identityIssue || 'Sem link TEC nos ancestrais do cartão. O ícone de livro sozinho não identifica uma questão.';
      // Preserve the block's original owner for manual auditing/time entry;
      // identityIssue prevents automatic exercise selection when ancestry failed.
      return {cardId,remId:card.remId,lessonId,title,questionKey,baseline,identityIssue};
    }));
    cards.push(...rows);rows.forEach(row=>histories[row.cardId]=row.baseline);
  }
  await verifyAuditBase(plugin,baseId);
  const draft:AuditDraft={version:1,id,baseId,startedAt,cards,histories,issues:{},phase:'running'};
  await plugin.storage.setLocal(auditDraftKey(baseId),draft);
  return draft;
}
export async function refreshAudit(plugin:RNPlugin,draft:AuditDraft,owner=draft.id):Promise<AuditDraft> {
  await claimAudit(plugin,draft.baseId,draft.id,owner);
  const cards=await plugin.card.findMany(draft.cards.map(c=>c.cardId));const map=new Map(cards.map(c=>[c._id,c]));
  const histories:AuditDraft['histories']={};const issues={...draft.issues};
  for(const card of draft.cards) {
    const latest=readHistory(map.get(card.cardId)?.repetitionHistory);
    histories[card.cardId]=latest;
    const delta=historyDelta(draft.histories[card.cardId]??null,latest);
    if(delta.issue)issues[card.cardId]=delta.issue;
  }
  const next={...draft,histories,issues};
  await verifyAuditBase(plugin,draft.baseId);
  await plugin.storage.setLocal(auditDraftKey(draft.baseId),next);
  return next;
}
