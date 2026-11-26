import {test} from 'node:test';import {strict as assert} from 'node:assert';
import {applyManualAnswers,setManualAnswer,validManualAnswers,type ManualAnswer} from '../src/manual-answer';
import {approvedEntries,auditRows,countedQuestions,selectedAuditRows,type AuditCard} from '../src/question-audit';
import {createRepository} from '../src/remnote/storage';
import {reviewedCardCounts,defaultReviewTime} from '../src/review-time';
const at=Date.now()-1000;
const cards:AuditCard[]=[{cardId:'c',remId:'r',lessonId:'l',title:'Questão',baseline:[],questionKey:'tec:123'},{cardId:'d',remId:'other',lessonId:'l',title:'Outra direção',baseline:[],questionKey:'tec:123'}];
const answer:ManualAnswer={cardId:'c',lessonId:'l',questionKey:'tec:123',correct:true,at};
test('marcação explícita vale sem avaliação e prevalece sobre o resultado do algoritmo',()=>{
 const rows=auditRows(cards,{c:[{date:at,score:0}],d:[]},at-100,at+100);
 const result=applyManualAnswers(rows,cards,[answer]);const entries=approvedEntries(result);
 assert.equal(entries.length,1);assert.equal(entries[0].correct,true);assert.equal(entries[0].origin,'manual');assert.equal(entries[0].lessonId,'l');
 assert.equal(approvedEntries(applyManualAnswers([],cards,[{...answer,correct:false}]))[0].correct,false);
});
test('alterar não duplica questão; mesma identificação TEC em dois cartões conta uma vez',()=>{
 const marks=setManualAnswer([answer],{...answer,cardId:'d',correct:false,at:at+10});assert.equal(marks.length,1);
 const entries=approvedEntries(applyManualAnswers([],cards,marks));assert.equal(entries.length,1);assert.equal(entries[0].correct,false);
 assert.equal(applyManualAnswers([],cards,[]).length,0);
});
test('tópico sem TEC pode ser confirmado manualmente; identidade e aula precisam corresponder',()=>{
 const plain=[{...cards[0],questionKey:undefined}];const mark={...answer,questionKey:'rem:r'};
 assert.equal(validManualAnswers([mark],plain),true);assert.equal(approvedEntries(applyManualAnswers([],plain,[mark])).length,1);
 for(const invalid of [{...mark,cardId:'outside'},{...mark,lessonId:'wrong'},{...mark,questionKey:'tec:999'},{...mark,correct:null},{...mark,at:NaN}])assert.equal(validManualAnswers([invalid],plain),false);
});
test('tempo seleciona aula respondida manualmente sem duplicar cartão que também teve avaliação',()=>{
 const counts=reviewedCardCounts(cards,{c:[{date:at,score:1}]},at-100,at+100,[answer]);assert.equal(counts.l,1);
 const manualOnly=reviewedCardCounts(cards,{},at-100,at+100,[answer]);assert.equal(manualOnly.l,1);assert.deepEqual(defaultReviewTime(at-100,at+100,manualOnly).lessonIds,['l']);
});
test('salvar confirmação manual soma uma vez e respeita questão já registrada no dia',async()=>{
 const store=new Map<string,unknown>();const repo=createRepository({getSynced:async<T>(k:string)=>store.get(k) as T|undefined,setSynced:async(k:string,v:unknown)=>{store.set(k,v);}},'base');
 const entries=approvedEntries(applyManualAnswers([],cards,[answer]));const batch={id:'batch',createdAt:at,entries};await repo.commitAudit(batch);const saved=await repo.commitAudit(batch);assert.equal(saved.exercises.l.correct,1);
 assert.equal(selectedAuditRows(applyManualAnswers([],cards,[answer]),['l'],countedQuestions(saved.auditBatches??{})).length,0);
});

import {validDraft,type AuditDraft} from '../src/remnote/question-audit';
test('rascunho recuperado preserva resultado explícito e rejeita origem adulterada',()=>{
 const draft:AuditDraft={version:1,id:'batch',baseId:'base',startedAt:at-100,cards,histories:{c:[],d:[]},issues:{},phase:'running',manualAnswers:[answer]};
 const restored=JSON.parse(JSON.stringify(draft));assert.equal(validDraft(restored,'base'),true);
 assert.equal(approvedEntries(applyManualAnswers([],restored.cards,restored.manualAnswers))[0].correct,true);
 assert.equal(validDraft({...restored,manualAnswers:[{...answer,lessonId:'wrong'}]},'base'),false);
 assert.equal(validDraft({...restored,manualAnswers:undefined},'base'),true);
});
