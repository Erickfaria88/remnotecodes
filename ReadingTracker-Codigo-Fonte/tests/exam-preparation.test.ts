import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {parseBackup,createRepository} from '../src/remnote/storage';
import {emptyPreparation,parsePreparation,buildExamPlan,examMetrics,examLessonIds,examReviewPriorities,futureCapacity,topicMetrics,daysUntil,projectExamPlan,type Exam,type Preparation} from '../src/exam-preparation';
const today='2026-11-21';
const exam=(id='e1',lesson='l1'):Exam=>({id,name:id,board:'Banca',date:'2026-11-25',active:true,priority:3,penalty:0,notes:'',blocks:[],subjects:[{
  id:'s',name:'Direito',questions:20,weight:2,minimumPercent:null,block:'',topics:[{
    id:'t',name:'Assunto',lessonIds:[lesson],incidence:100,source:'Professor',priority:'desirable',estimatedMinutes:null}]}]});
const prep=(exams:Exam[]=[exam()]):Preparation=>({...emptyPreparation(),mode:'post',exams});
const data=()=>parseBackup({version:1,baseId:'base',globalPace:60,subjectPaces:{},lessons:{
  l1:{totalPages:40,readPages:10,stars:5},l2:{totalPages:20,readPages:0},l3:{totalPages:10,readPages:10}},exercises:{}},'base');
const subjects=new Map([['l1','s1'],['l2','s2'],['l3','s3']]);

test('backups antigos permanecem em preparação normal; valida edital, vínculos, blocos e disponibilidade',()=>{
  assert.equal(data().version,2);assert.equal(data().preparation!.mode,'normal');assert.equal(parsePreparation(prep()).exams.length,1);
  const invalid=(edit:(p:Preparation)=>void)=>{const p=prep();edit(p);assert.throws(()=>parsePreparation(p));};
  invalid(p=>p.exams[0].date='2026-02-30');invalid(p=>p.exams[0].subjects[0].weight=0);
  invalid(p=>p.exams[0].subjects[0].block='missing');invalid(p=>p.exams[0].subjects[0].topics[0].lessonIds=['__proto__']);
  invalid(p=>p.exams[0].subjects[0].topics[0].incidence=101);invalid(p=>p.exams.push(p.exams[0]));
  invalid(p=>p.availability['2026-11-22']=-1);invalid(p=>p.exams[0].subjects[0].topics[0].lessonIds=['l1','l1']);
});

test('dois editais compartilham aula, cobertura e tempo sem duplicar atividade ou estimativa',()=>{
  const p=prep([exam('a'),exam('b')]);const d=data();const plan=buildExamPlan(d,p,subjects,today);
  assert.equal(plan.selected.length,1);assert.equal(plan.selected[0].minutes,30);assert.deepEqual(plan.selected[0].exams,['a','b']);
  assert.equal(plan.full.minutes,30);assert.equal(examLessonIds(p,today).size,1);
  assert.equal(examMetrics(d,p.exams[0],subjects).covered,25);assert.equal(examMetrics(d,p.exams[1],subjects).covered,25);
  d.lessons.l1.readPages=40;
  assert.equal(examMetrics(d,p.exams[0],subjects).covered,100);assert.equal(examMetrics(d,p.exams[1],subjects).covered,100);
});

test('mínimo obrigatório protege assunto de baixa incidência e núcleo preserva essenciais',()=>{
  const e=exam();const s=e.subjects[0];s.minimumPercent=50;
  s.topics.push({...s.topics[0],id:'tail',lessonIds:['l2'],incidence:10});s.topics[0].incidence=90;
  const p={...prep([e]),coreOnly:true};assert.deepEqual([...examLessonIds(p,today)].sort(),['l1','l2']);
  assert.ok(buildExamPlan(data(),p,subjects,today).selected.every(r=>r.protected));
  s.minimumPercent=null;assert.deepEqual([...examLessonIds(p,today)],['l1']);
  assert.equal(buildExamPlan(data(),p,subjects,today).outsideCore.length,1);
  s.topics[1].priority='essential';assert.ok(examLessonIds(p,today).has('l2'));
});

test('pondera pela pontuação da disciplina, não pela média simples; incidência desconhecida não vira cobertura',()=>{
  const e=exam();e.subjects[0].topics[0].lessonIds=['l3'];
  e.subjects.push({...e.subjects[0],id:'s2',questions:10,weight:1,topics:[{...e.subjects[0].topics[0],lessonIds:['l2']}]});
  const m=examMetrics(data(),e,subjects);assert.equal(m.maxPoints,50);assert.equal(m.covered,80);
  e.subjects[0].topics[0].incidence=null;assert.equal(examMetrics(data(),e,subjects).covered,0);
  const plan=buildExamPlan(data(),prep([e]),subjects,today);assert.ok(plan.warnings.some(w=>w.includes('incompleto')));
});

test('soma inconsistente suspende cobertura ponderada e material ausente gera lacuna explícita',()=>{
  const e=exam();e.subjects[0].topics.push({...e.subjects[0].topics[0],id:'extra',lessonIds:[],incidence:10,estimatedMinutes:60});
  const m=examMetrics(data(),e,subjects);assert.equal(m.covered,0);assert.equal(m.subjects[0].issues,true);
  const p=buildExamPlan(data(),prep([e]),subjects,today);assert.ok(p.excluded.some(r=>r.kind==='gap'));
  assert.equal(p.full.gapMinutes,60);assert.ok(p.warnings.length);
  const partial=topicMetrics(data(),{...e.subjects[0].topics[0],lessonIds:['l3','not-registered']},subjects);
  assert.equal(partial.coverage,0);assert.equal(partial.missing,true);
});

test('saldo diário é único, respeita exceções, sessões, dias locais e exclui o dia da prova',()=>{
  const d=data();const p=prep();p.availability[today]=90;p.availability['2026-11-22']=0;
  const plan=buildExamPlan(d,p,subjects,today);assert.equal(plan.budget.review,30);assert.equal(plan.budget.study,60);
  const c=futureCapacity(d,p,'2026-11-23',today);assert.equal(c.days,2);assert.equal(c.total,90);assert.equal(c.advance,60);
  d.sessions={x:{id:'x',lessonId:'l1',subjectId:'s1',title:'Aula',subject:'Direito',day:today,category:'theory',seconds:3600,counted:true,note:''}};
  assert.equal(buildExamPlan(d,p,subjects,today).used,0);assert.equal(futureCapacity(d,p,'2026-11-23',today).total,30);
  assert.equal(daysUntil('2027-01-01','2026-12-31'),1);assert.equal(daysUntil(today,today),0);
});

test('provas encerradas e editais arquivados saem das sugestões e revisão',()=>{
  const old=exam('old');old.date=today;const archived=exam('archived');archived.active=false;
  const p=prep([old,archived]);assert.equal(examLessonIds(p,today).size,0);assert.equal(buildExamPlan(data(),p,subjects,today).selected.length,0);
});

test('questões consideram amostra e meta; etapas exigem todas as aulas vinculadas',()=>{
  const e=exam('e','l3');const d=data();d.exercises.l3={correct:2,incorrect:0};
  assert.equal(buildExamPlan(d,prep([e]),subjects,today).selected[0].kind,'questions');
  d.exercises.l3={correct:20,incorrect:0};assert.equal(buildExamPlan(d,prep([e]),subjects,today).selected.length,0);
  d.exercises.l3={correct:10,incorrect:10};assert.equal(buildExamPlan(d,prep([e]),subjects,today).selected.length,1);
  const t={...e.subjects[0].topics[0],lessonIds:['l1','l3']};d.lessons.l1.completedSteps=['theory'];
  assert.deepEqual(topicMetrics(d,t,subjects).steps,[]);d.lessons.l3.completedSteps=['theory'];assert.deepEqual(topicMetrics(d,t,subjects).steps,['theory']);
});

test('plano respeita limite por disciplina, saldo e prioridade do concurso sem repetir a mesma aula',()=>{
  const e=exam();e.subjects[0].topics[0].lessonIds=['l1','l2','l4','l5'];
  const d=data();d.lessons.l4={totalPages:60,readPages:0};d.lessons.l5={totalPages:60,readPages:0};
  const same=new Map(['l1','l2','l4','l5'].map(id=>[id,'same']));const p=buildExamPlan(d,prep([e]),same,today);
  assert.equal(p.used,60);assert.ok(p.excluded.length>0);assert.equal(new Set(p.selected.map(r=>r.lessonId)).size,p.selected.length);
});

test('persiste modo e dois editais por base; backup restaura tudo e gravação de estudo preserva preparação',async()=>{
  const memory=new Map<string,unknown>();const storage={async getSynced<T>(key:string){return memory.get(key) as T|undefined;},async setSynced(key:string,value:unknown){memory.set(key,JSON.parse(JSON.stringify(value)));}};
  const a=createRepository(storage,'a');const b=createRepository(storage,'b');
  await a.savePreparation(prep([exam('a'),exam('b')]));await a.saveLesson('l1',{totalPages:40,readPages:20});
  const saved=await a.load();assert.equal(saved.preparation!.exams.length,2);assert.equal((await b.load()).preparation!.mode,'normal');
  await a.savePreparation({...saved.preparation!,mode:'normal'});assert.equal((await a.load()).lessons.l1.readPages,20);
  await a.restore(JSON.parse(JSON.stringify(saved)));assert.equal((await a.load()).preparation!.mode,'post');
  await assert.rejects(()=>b.restore(saved));const invalid=prep();invalid.exams[0].subjects[0].weight=-1;
  await assert.rejects(()=>a.savePreparation(invalid));assert.equal((await a.load()).preparation!.exams.length,2);
});

test('projeção diária reserva questões e revisão, compartilha esforço e não grava progresso simulado',()=>{
  const a=exam('a');a.date='2026-11-22';const b=exam('b');b.date='2026-11-23';
  const d=data();const original=JSON.stringify(d);const p=prep([a,b]);
  const projected=projectExamPlan(d,p,subjects,today);
  assert.equal(projected.milestones.a.coverage,100);assert.equal(projected.milestones.b.coverage,100);
  assert.equal(projected.milestones.b.reading,30);assert.equal(projected.milestones.b.questions,20);
  assert.equal(projected.milestones.a.pending.length,0);assert.equal(JSON.stringify(d),original);
});

test('projeção mostra o que não cabe até cada prova e respeita folga ou excesso de tempo registrado',()=>{
  const e=exam();e.date='2026-11-22';const p=prep([e]);p.availability[today]=30;
  const projected=projectExamPlan(data(),p,subjects,today).milestones.e1;
  assert.equal(projected.reading,20);assert.equal(projected.questions,0);assert.equal(projected.pending[0].minutes,30);
  assert.ok(Math.abs(projected.coverage-75)<1e-8);
  p.availability[today]=0;assert.equal(projectExamPlan(data(),p,subjects,today).milestones.e1.coverage,25);
});

test('núcleo e mínimo por bloco influenciam plano; projeção longa fica limitada a 730 dias',()=>{
  const e=exam();e.blocks=[{id:'block',name:'Básicos',minimumPercent:50}];e.subjects[0].block='block';
  e.subjects[0].topics.push({...e.subjects[0].topics[0],id:'tail',incidence:1,lessonIds:['l2']});e.subjects[0].topics[0].incidence=99;
  const p={...prep([e]),coreOnly:true};assert.equal(examLessonIds(p,today).size,2);
  assert.ok(buildExamPlan(data(),p,subjects,today).selected.every(r=>r.protected));
  p.exams[0].date='2030-01-01';assert.equal(projectExamPlan(data(),p,subjects,today).truncated,true);
  assert.equal(futureCapacity(data(),p,'2030-01-01',today).truncated,true);
});

test('revisão soma relevância compartilhada e exclui o peso de editais arquivados',()=>{
  const a=exam('a');const b=exam('b');const single=examReviewPriorities(prep([a]),today).l1;
  assert.equal(examReviewPriorities(prep([a,b]),today).l1,single*2);
  b.active=false;assert.equal(examReviewPriorities(prep([a,b]),today).l1,single);
  b.active=true;b.date=today;assert.equal(examReviewPriorities(prep([a,b]),today).l1,single);
});
