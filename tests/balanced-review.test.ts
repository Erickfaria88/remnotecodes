import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {balancedReview,validQuota,type ReviewSelection} from '../src/balanced-review';
import type {ReviewCandidate} from '../src/review-plan';
const candidate=(id:string,n=30):ReviewCandidate=>({id,cardIds:Array.from({length:n},(_,i)=>id+'_'+i),reviewDue:false,overdue:false,accuracy:null});
const settings=():ReviewSelection=>({mode:'block',subjectCounts:{},lessonCounts:{}});
const subjects=new Map([['a1','a'],['a2','a'],['b1','b']]);
const rows=[candidate('a1'),candidate('a2'),candidate('b1')];
const counts=(result:ReturnType<typeof balancedReview>)=>new Map(result.flatMap(b=>b.lessons.map(l=>[l.id,l.cardIds.length] as const)));
test('bloco padrão seleciona 10 por disciplina e distribui entre aulas da mesma matéria',()=>{
  const plan=balancedReview(rows,subjects,settings(),90,30);const n=counts(plan);
  assert.equal(plan[0].cards,20);assert.equal(n.get('a1'),5);assert.equal(n.get('a2'),5);assert.equal(n.get('b1'),10);
});
test('quantidades editadas, seleção de matérias e tempo curto preservam distribuição justa',()=>{
  const s=settings();s.subjectCounts={a:20,b:5};assert.equal(balancedReview(rows,subjects,s,90,30)[0].cards,25);
  s.subjects=['b'];assert.deepEqual([...counts(balancedReview(rows,subjects,s,90,30)).keys()],['b1']);
  s.subjects=undefined;s.subjectCounts={};const n=counts(balancedReview(rows,subjects,s,3,30));
  assert.equal((n.get('a1')??0)+(n.get('a2')??0),3);assert.equal(n.get('b1'),3);
});
test('disciplina permite quota por aula; aula individual respeita quantidade e disponibilidade',()=>{
  const s:ReviewSelection={...settings(),mode:'subject',subjectId:'a',lessonCounts:{a1:2,a2:4}};
  assert.deepEqual([...counts(balancedReview(rows,subjects,s,90,30))].sort(),[['a1',2],['a2',4]]);
  s.mode='lesson';s.lessonId='b1';s.lessonCounts.b1=50;
  assert.equal(balancedReview(rows,subjects,s,90,30)[0].cards,30);
});
test('não repete cartões, respeita zero e não admite quota inválida ou saldo zerado',()=>{
  const s=settings();s.subjectCounts.a=0;
  assert.equal(balancedReview(rows,subjects,s,90,30)[0].cards,10);
  s.subjects=[];assert.deepEqual(balancedReview(rows,subjects,s,90,30),[]);
  assert.deepEqual(balancedReview(rows,subjects,settings(),0,30),[]);
  const duplicated=[candidate('a1',2),{...candidate('b1',2),cardIds:['a1_0','b1_0']}];
  const ids=balancedReview(duplicated,subjects,settings(),90,30).flatMap(b=>b.lessons.flatMap(l=>l.cardIds));assert.equal(ids.length,new Set(ids).size);
  for(const q of [-1,NaN,Infinity,1.5,2001])assert.equal(validQuota(q),false);
});
