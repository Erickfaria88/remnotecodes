import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {allocateReviewTime,defaultReviewTime,reviewedCardCounts,reviewSessions,validReviewTimeInput,type ReviewTimeInput} from '../src/review-time';
import {validAuditBatch,type AuditBatch,type AuditCard} from '../src/question-audit';
import {createRepository,parseBackup} from '../src/remnote/storage';
import {remainingDailyTime} from '../src/study-sessions';
import {studyDay} from '../src/resume';
const now=Date.now();const day=studyDay();
const info={a:{title:'Aula A',subject:'Matéria A',subjectId:'sa'},b:{title:'Aula B',subject:'Matéria B',subjectId:'sb'}};
const input=():ReviewTimeInput=>({enabled:true,duration:'00:20:00',day,lessonIds:['a','b'],counted:true,note:'Bloco misto'});
function storage(){const memory=new Map<string,unknown>();return {async getSynced<T>(k:string){return memory.get(k) as T|undefined;},async setSynced(k:string,v:unknown){memory.set(k,JSON.parse(JSON.stringify(v)));}};}
test('rateia o tempo sem multiplicá-lo por aula, preservando segundos e distribuição estimada',()=>{
  const result=allocateReviewTime(1200,['a','b','a'],{a:5,b:15});
  assert.equal(result.reduce((s,r)=>s+r.seconds,0),1200);assert.ok(Math.abs(result[0].seconds-300)<=1);assert.ok(Math.abs(result[1].seconds-900)<=1);
  assert.throws(()=>allocateReviewTime(0,['a'],{}));assert.throws(()=>allocateReviewTime(1,['a','b'],{}));assert.throws(()=>allocateReviewTime(20,[],{}));
});
test('detecta aulas avaliadas mesmo sem link TEC e não presume que toda aula do bloco foi estudada',()=>{
  const cards:AuditCard[]=[{cardId:'c1',title:'Sem TEC',lessonId:'a',baseline:[]},{cardId:'c2',title:'Sem TEC',lessonId:'b',baseline:[]}];
  const counts=reviewedCardCounts(cards,{c1:[{date:now-500,score:0},{date:now-400,score:1}],c2:[]},now-1000,now);
  assert.deepEqual(counts,{a:1});assert.equal(reviewedCardCounts(cards,{c1:[{date:now-500,score:3}],c2:[]},now-1000,now).a,undefined);
});
test('sugestão termina ao sair da prática e rascunho sem fim conhecido exige duração manual',()=>{
  assert.equal(defaultReviewTime(now-60000,now,{a:2}).duration,'00:01:00');
  assert.equal(defaultReviewTime(now-60000,undefined,{a:2}).duration,'');
  assert.deepEqual(defaultReviewTime(now-60000,now,{a:2}).lessonIds,['a']);
  assert.equal(validReviewTimeInput({...input(),day:'',duration:''}),true);
});
test('gera sessões de revisão identificadas, permite desativar tempo e valida data e aulas',()=>{
  const sessions=reviewSessions('audit1',input(),{a:2,b:8},info);
  assert.equal(sessions.reduce((s,r)=>s+r.seconds,0),1200);assert.ok(sessions.every(s=>s.category==='review'&&s.auditId==='audit1'&&s.counted));
  assert.deepEqual(reviewSessions('audit1',{...input(),enabled:false},{},{}),[]);
  assert.throws(()=>reviewSessions('audit1',{...input(),duration:''},{},info));
  assert.throws(()=>reviewSessions('audit1',{...input(),day:studyDay(1)},{},info));
  assert.throws(()=>reviewSessions('audit1',input(),{},{}));
});
test('salva tempo e exercícios juntos; saldo de revisão diminui pelo total real uma única vez',async()=>{
  const synced=storage();const repo=createRepository(synced,'base');const other=createRepository(synced,'other');
  await repo.saveLesson('a',{totalPages:40,readPages:30});await repo.saveExercise('a',{correct:4,incorrect:1});
  const batch:AuditBatch={id:'audit1',createdAt:now,entries:[{questionKey:'tec:123',lessonId:'a',day,correct:false,at:now-1000,origin:'history'}],reviewSessions:reviewSessions('audit1',input(),{a:2,b:8},info)};
  await repo.commitAudit(batch);await repo.commitAudit(batch);
  const data=await repo.load();assert.equal(Object.keys(data.sessions!).length,2);
  assert.deepEqual(data.exercises.a,{correct:4,incorrect:2});assert.equal(data.lessons.a.readPages,30);
  assert.equal(remainingDailyTime(data,day).review,70);assert.equal(remainingDailyTime(data,day).study,180);assert.equal(remainingDailyTime(data,day).usedSeconds,1200);
  assert.equal(remainingDailyTime(await other.load(),day).review,90);
  const copy=await repo.restore(JSON.parse(JSON.stringify(data)));assert.equal(copy.auditBatches!.audit1.reviewSessions!.length,2);
});
test('salva somente o tempo, inclusive em aula sem questões; opções fora do planejamento não descontam',async()=>{
  const repo=createRepository(storage(),'base');
  await repo.commitAudit({id:'time1',createdAt:now,entries:[],reviewSessions:reviewSessions('time1',input(),{},info)});
  const saved=await repo.load();assert.equal(Object.keys(saved.exercises).length,0);assert.equal(remainingDailyTime(saved,day).review,70);
  await repo.commitAudit({id:'time2',createdAt:now,entries:[],reviewSessions:reviewSessions('time2',{...input(),counted:false},{},info)});
  assert.equal(remainingDailyTime(await repo.load(),day).review,70);
});
test('outro bloco pode consumir tempo real mesmo quando a questão já foi contabilizada no dia',async()=>{
  const repo=createRepository(storage(),'base');const entries=[{questionKey:'tec:123',lessonId:'a',day,correct:true,at:now-1,origin:'history' as const}];
  for(const id of ['block1','block2'])await repo.commitAudit({id,createdAt:now,entries,reviewSessions:reviewSessions(id,{...input(),lessonIds:['a']},{a:1},info)});
  const data=await repo.load();assert.equal(data.exercises.a.correct,1);assert.equal(data.auditBatches!.block2.entries.length,0);
  assert.equal(remainingDailyTime(data,day).review,50);assert.equal(remainingDailyTime(data,day).usedSeconds,2400);
});
test('corrigir ou remover tempo recalcula saldo, preserva questões e retry não recria tempo removido',async()=>{
  const repo=createRepository(storage(),'base');const sessions=reviewSessions('a1',{...input(),lessonIds:['a']},{a:2},info);
  const batch:AuditBatch={id:'a1',createdAt:now,entries:[{questionKey:'tec:123',lessonId:'a',day,correct:true,at:now-1,origin:'manual'}],reviewSessions:sessions};
  await repo.commitAudit(batch);await repo.updateSession(sessions[0].id,{day,category:'review',seconds:600,counted:true,note:'Ajustado'});
  assert.equal(remainingDailyTime(await repo.load(),day).review,80);
  await repo.removeSession(sessions[0].id);await repo.commitAudit(batch);
  const data=await repo.load();assert.equal(Object.keys(data.sessions!).length,0);assert.equal(data.exercises.a.correct,1);assert.equal(remainingDailyTime(data,day).review,90);
});
test('falha de gravação e lote inválido não salvam parcialmente tempo ou exercícios',async()=>{
  const synced=storage();let fail=true;const repo=createRepository({...synced,async setSynced(k:string,v:unknown){if(fail)throw new Error('offline');await synced.setSynced(k,v);}},'base');
  const batch:AuditBatch={id:'a1',createdAt:now,entries:[],reviewSessions:reviewSessions('a1',input(),{},info)};
  await assert.rejects(()=>repo.commitAudit(batch));assert.equal(Object.keys((await repo.load()).sessions!).length,0);
  fail=false;assert.equal(validAuditBatch({...batch,reviewSessions:[null]}),false);
  await assert.rejects(()=>repo.commitAudit({...batch,reviewSessions:[{...batch.reviewSessions![0],auditId:'wrong'}]}));
  await repo.commitAudit(batch);assert.equal(remainingDailyTime(await repo.load(),day).usedSeconds,1200);
});
test('formato antigo com auditoria sem tempo continua legível no formato 4',()=>{
  const before=parseBackup({version:1,baseId:'base',lessons:{},subjectPaces:{},globalPace:null},'base');
  const old={...before,version:3,auditBatches:{a1:{id:'a1',createdAt:now,entries:[]}}};
  const upgraded=parseBackup(old,'base');assert.equal(upgraded.version,4);assert.equal(upgraded.auditBatches!.a1.reviewSessions,undefined);
});
