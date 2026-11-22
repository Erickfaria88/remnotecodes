import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {subjectUsage,subjectSecondsRemaining,plannedReviewSeconds} from '../src/subject-budget';
import {buildAdvancePlan} from '../src/advance-plan';
import {buildReviewBlocks,type ReviewCandidate} from '../src/review-plan';
import {balancedReview} from '../src/balanced-review';
import {buildExamPlan,emptyPreparation,projectExamPlan,type Exam} from '../src/exam-preparation';
import {parseBackup,createRepository} from '../src/remnote/storage';
import {studyDay} from '../src/resume';
import type {StudySession} from '../src/study-sessions';
const day=studyDay();
const session=(id:string,subjectId:string,seconds:number,category:StudySession['category']='review'):StudySession=>({id,subjectId,lessonId:subjectId+'1',title:'Aula',subject:'Disciplina',day,category,seconds,counted:true,note:''});
const data=()=>parseBackup({version:1,baseId:'base',globalPace:60,subjectPaces:{},subjectPhases:{ti:1,other:1},lessons:{
  ti1:{totalPages:200,readPages:0,stars:5},ti2:{totalPages:100,readPages:0,stars:5},other1:{totalPages:100,readPages:0,stars:1}}},'base');
const mapping=new Map([['ti1','ti'],['ti2','ti'],['other1','other']]);
const candidate=(id:string,n=100):ReviewCandidate=>({id,cardIds:Array.from({length:n},(_,i)=>id+'_'+i),reviewDue:false,overdue:false,accuracy:null});
test('limite diário soma revisão e avanço por ID de disciplina, respeitando dia e planejamento',()=>{
  const d=data();d.sessions={a:session('a','ti',3600),b:session('b','ti',1800,'theory'),old:{...session('old','ti',9999),day:studyDay(-1)},off:{...session('off','ti',9999),counted:false}};
  assert.equal(subjectUsage(d,day).used.ti,5400);assert.equal(subjectSecondsRemaining(d,['ti'],day).ti,1800);
  assert.equal(subjectSecondsRemaining(d,['ti'],studyDay(1)).ti,7200);
});
test('último bloco de revisão marca suas matérias para alternância, não só a última aula do rateio',()=>{
  const d=data();d.sessions={a:{...session('a','ti',100),auditId:'batch'},b:{...session('b','other',100),auditId:'batch'}};
  assert.deepEqual([...subjectUsage(d,day).recent].sort(),['other','ti']);
});
test('avanço não sugere matéria recém-estudada quando outra elegível existe, mesmo com estrelas maiores',()=>{
  const d=data();d.sessions={recent:session('recent','ti',1200,'theory')};
  const plan=buildAdvancePlan(d,mapping,60,day,null);
  assert.ok(plan.selected.length);assert.ok(plan.selected.every(r=>r.subjectId==='other'));assert.equal(plan.alternating,true);
});
test('teto atingido exclui matéria e reserva da revisão reduz o espaço do avanço sem duplicar orçamento',()=>{
  const d=data();d.sessions={recent:session('recent','ti',7200)};
  assert.ok(buildAdvancePlan(d,mapping,90,day,null).selected.every(r=>r.subjectId!=='ti'));
  d.sessions.recent.seconds=5400;
  const onlyTi=new Map([['ti1','ti'],['ti2','ti']]);const plan=buildAdvancePlan(d,onlyTi,90,day,null,{ti:1200});
  assert.equal(plan.totalMinutes,10);assert.ok(5400+1200+plan.totalMinutes*60<=7200);
});
test('revisões automática e configurável respeitam teto compartilhado entre aulas da mesma matéria',()=>{
  const d=data();d.sessions={used:session('used','ti',6900)};
  const limits={subjectByLesson:mapping,remainingSeconds:subjectSecondsRemaining(d,mapping.values(),day)};
  const candidates=[candidate('ti1'),candidate('ti2'),candidate('other1')];
  for(const blocks of [buildReviewBlocks(candidates,90,30,limits),balancedReview(candidates,mapping,{mode:'block',subjectCounts:{ti:100,other:100},lessonCounts:{}},90,30,limits),
    balancedReview(candidates,mapping,{mode:'subject',subjectId:'ti',subjectCounts:{},lessonCounts:{ti1:100,ti2:100}},90,30,limits)]){
    const reserved=plannedReviewSeconds(blocks,mapping,30);assert.ok((reserved.ti??0)<=300);
  }
});
test('saldo menor que um cartão ou minuto não ultrapassa o teto por arredondamento',()=>{
  const d=data();d.sessions={used:session('used','ti',7190)};
  const subjects=new Map([['ti1','ti']]);const limits={subjectByLesson:subjects,remainingSeconds:subjectSecondsRemaining(d,['ti'],day)};
  assert.deepEqual(buildReviewBlocks([candidate('ti1')],90,30,limits),[]);
  assert.equal(buildAdvancePlan(d,subjects,90,day,null).selected.length,0);
});
test('reservas não duplicam cartão repetido e limite configurado é persistente e isolado por base',async()=>{
  assert.equal(plannedReviewSeconds([{lessons:[{id:'ti1',cardIds:['x','x']},{id:'ti2',cardIds:['x','y']}]}],mapping,30).ti,60);
  const saved=new Map<string,unknown>();const storage={async getSynced<T>(k:string){return saved.get(k) as T|undefined;},async setSynced(k:string,v:unknown){saved.set(k,JSON.parse(JSON.stringify(v)));}};
  const a=createRepository(storage,'a');const b=createRepository(storage,'b');
  await a.saveSubjectDailyMinutes(90);assert.equal((await a.load()).subjectDailyMinutes,90);assert.equal((await b.load()).subjectDailyMinutes,120);
  const exported=await a.load();await a.restore(JSON.parse(JSON.stringify(exported)));assert.equal((await a.load()).subjectDailyMinutes,90);
  await assert.rejects(()=>a.saveSubjectDailyMinutes(0));assert.equal((await a.load()).subjectDailyMinutes,90);
});
test('edição e remoção dos tempos refletem imediatamente no limite diário',async()=>{
  const saved=new Map<string,unknown>();const storage={async getSynced<T>(k:string){return saved.get(k) as T|undefined;},async setSynced(k:string,v:unknown){saved.set(k,JSON.parse(JSON.stringify(v)));}};
  const repo=createRepository(storage,'base');await repo.saveStudy('ti1',undefined,undefined,undefined,undefined,undefined,false,undefined,undefined,session('s','ti',7200));
  assert.equal(subjectSecondsRemaining(await repo.load(),['ti'],day).ti,0);
  await repo.updateSession('s',{day,category:'review',seconds:3600,counted:true,note:''});assert.equal(subjectSecondsRemaining(await repo.load(),['ti'],day).ti,3600);
  await repo.removeSession('s');assert.equal(subjectSecondsRemaining(await repo.load(),['ti'],day).ti,7200);
});
test('pós-edital aplica o mesmo teto, reserva de revisão e projeção de hoje',()=>{
  const d=data();d.sessions={used:session('used','ti',6900)};
  const e:Exam={id:'exam',name:'Prova',board:'',date:studyDay(1),active:true,priority:3,penalty:0,notes:'',blocks:[],subjects:[{id:'sub',name:'TI',questions:10,weight:1,minimumPercent:null,block:'',topics:[{id:'topic',name:'SQL',lessonIds:['ti1'],incidence:100,source:'',priority:'desirable',estimatedMinutes:null}]}]};
  const p={...emptyPreparation(),mode:'post' as const,exams:[e]};const subjects=new Map([['ti1','ti']]);
  assert.equal(buildExamPlan(d,p,subjects,day,{ti:120}).used,3);
  assert.equal(projectExamPlan(d,p,subjects,day).milestones.exam.reading,5);
});
test('migra formato antigo com padrão de duas horas e rejeita limite inválido',()=>{
  assert.equal(data().subjectDailyMinutes,120);assert.equal(data().version,5);
  assert.throws(()=>parseBackup({...data(),subjectDailyMinutes:null},'base'));
});

import {attentionLessons} from '../src/study-attention';
test('lista de atenção respeita limite de hoje e reserva de revisão sem apagar necessidades futuras',()=>{
  const d=data(); d.subjectDailyMinutes=90; d.sessions={a:session('a','ti',5100)};
  assert.ok(attentionLessons(d,mapping,10,{day}).some(r=>r.id==='ti1'));
  const filtered=attentionLessons(d,mapping,10,{day,reservedReviewSeconds:{ti:300}});
  assert.deepEqual(filtered.map(r=>r.id),['other1']);
  assert.ok(attentionLessons(d,mapping,10,{day:studyDay(1)}).some(r=>r.id==='ti1'));
  assert.ok(attentionLessons(d,mapping,10).some(r=>r.id==='ti1'));
  d.sessions.a.seconds=5341;
  assert.ok(attentionLessons(d,mapping,10,{day}).every(r=>r.id==='other1'));
});
