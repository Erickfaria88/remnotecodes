import {test} from 'node:test';import {strict as assert} from 'node:assert';
import {createReviewQuery,reviewSnapshotFresh,type ReviewGroups} from '../src/review-query';
function memory(){const values=new Map<string,unknown>();return{getLocal:async<T>(key:string)=>values.get(key) as T|undefined,setLocal:async(key:string,v:unknown)=>{values.set(key,v);}};}
const groups=()=>new Map([['lesson',{cardIds:['c1','c2'],overdue:true}]]);
test('ler cache na abertura não dispara busca; consulta explícita reutiliza resultado válido',async()=>{
 const storage=memory();let calls=0;let time=1000000;const q=createReviewQuery(storage,'base',()=>time);const load=async()=>{calls++;return groups();};
 assert.equal(await q.read(),undefined);assert.equal(calls,0);
 const first=await q.query('fase1',load);assert.equal(calls,1);assert.equal(reviewSnapshotFresh(first,'fase1',time),true);
 await q.query('fase1',load);assert.equal(calls,1);
 const remounted=createReviewQuery(storage,'base',()=>time);assert.deepEqual((await remounted.read())?.groups,first.groups);assert.equal(calls,1);
 await remounted.query('fase1',load,true);assert.equal(calls,2);
 time+=600001;await q.query('fase1',load);assert.equal(calls,3);
 await q.query('outras-tags',load);assert.equal(calls,4);assert.equal(reviewSnapshotFresh(first,'outras-tags',time),false);
 assert.equal(await createReviewQuery(storage,'other').read(),undefined);
});
test('cliques concorrentes compartilham uma consulta e falhas permitem tentar novamente',async()=>{
 const q=createReviewQuery(memory(),'base');let calls=0;let complete!:(v:ReviewGroups)=>void;
 const loader=()=>{calls++;return new Promise<ReviewGroups>(resolve=>{complete=resolve;});};
 const a=q.query('scope',loader);const b=q.query('scope',loader);assert.equal(a,b);
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,1);complete(groups());await Promise.all([a,b]);
 await assert.rejects(q.query('scope',async()=>{throw new Error('offline');},true));
 assert.equal((await q.query('scope',async()=>groups(),true)).groups.length,1);
});
test('finalizar revisão invalida cache e consulta em andamento não restaura dados invalidados',async()=>{
 const storage=memory();const q=createReviewQuery(storage,'base');await q.query('scope',async()=>groups());await q.invalidate();assert.equal(await q.read(),undefined);
 let complete!:(v:ReviewGroups)=>void;const pending=q.query('scope',()=>new Promise(resolve=>{complete=resolve;}));await new Promise(resolve=>setTimeout(resolve,0));await q.invalidate();complete(groups());await pending;assert.equal(await q.read(),undefined);
});
