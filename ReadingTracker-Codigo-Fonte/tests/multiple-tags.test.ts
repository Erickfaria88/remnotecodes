import {test} from 'node:test';import {strict as assert} from 'node:assert';
import type {RNPlugin} from '@remnote/plugin-sdk';
import {selectedReviewTags,toggleReviewTag,reviewTagKey} from '../src/study-scope';
import {loadReviewCards} from '../src/remnote/review-cards';
test('seleção mantém tags anteriores, remove individualmente e aceita preferência antiga de uma tag',()=>{
 const old={id:'focus',title:'Foco',includeInherited:true};
 const both=toggleReviewTag(old,{id:'error',title:'Erro'})!;assert.deepEqual(selectedReviewTags(both).map(t=>t.id),['focus','error']);assert.equal(both.includeInherited,true);
 assert.notEqual(reviewTagKey(old),reviewTagKey(both));assert.equal(reviewTagKey(both),reviewTagKey({...both,tags:[...both.tags!].reverse()}));
 const only=toggleReviewTag(both,{id:'focus',title:'Foco'})!;assert.equal(only.id,'error');assert.equal(toggleReviewTag(only,{id:'error',title:'Erro'}),undefined);
 assert.deepEqual(selectedReviewTags(JSON.parse(JSON.stringify(both))),selectedReviewTags(both));assert.equal(selectedReviewTags(old).length,1);
});
test('revisão une cartões de qualquer tag, inclui herança quando pedida e não duplica cartões com ambas',async()=>{
 const now=new Date();const direct:Record<string,string[]>={a:['focus'],b:['error'],both:['focus','error'],none:[],inherited:[]};
 const rems=Object.keys(direct).map(id=>({_id:id,parent:'lesson',getEnablePractice:async()=>true,getPracticeDirection:async()=>'both',getTagRems:async()=>direct[id].map(_id=>({_id})),ancestorTagRem:async()=>[...direct[id],...(id==='inherited'?['error']:[])].map(_id=>({_id}))}));
 const plugin={kb:{getCurrentKnowledgeBaseData:async()=>({_id:'base'})},card:{getAll:async()=>Object.keys(direct).map(id=>({_id:'card_'+id,remId:id,nextRepetitionTime:now.getTime()-1000,type:'forward'}))},rem:{findMany:async(ids:string[])=>[...rems,{_id:'lesson',parent:null}].filter(r=>ids.includes(r._id))}} as unknown as RNPlugin;
 const filter=toggleReviewTag({id:'focus',title:'Foco',includeInherited:false},{id:'error',title:'Erro'})!;
 const result=await loadReviewCards(plugin,'base',['lesson'],now,filter);assert.deepEqual(result.get('lesson')?.cardIds,['card_a','card_b','card_both']);
 const inherited=await loadReviewCards(plugin,'base',['lesson'],now,{...filter,includeInherited:true});assert.deepEqual(inherited.get('lesson')?.cardIds,['card_a','card_b','card_both','card_inherited']);
 assert.equal((await loadReviewCards(plugin,'base',['lesson'],now)).get('lesson')?.cardIds.length,5);
});
