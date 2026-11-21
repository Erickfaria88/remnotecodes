import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import type {RNPlugin} from '@remnote/plugin-sdk';
import {outcome,historyDelta,auditRows,approvedEntries,tecQuestionKeys,simplifyAuditRows,selectedAuditRows,type AuditCard,type AuditBatch} from '../src/question-audit';
import {createRepository,parseBackup} from '../src/remnote/storage';
import {auditDraftKey,prepareAudit,refreshAudit,validDraft,readHistory,claimAudit,releaseAudit,stableAuditRecovery,keepAuditDraft,type AuditDraft} from '../src/remnote/question-audit';
import {studyDay} from '../src/resume';
const t=Date.now()-3*86400000;
const baseline=[{date:t-86400000,score:1}];
const card=(id='c1',lesson='lesson'):AuditCard=>({cardId:id,remId:'rem_'+id,lessonId:lesson,title:'Questão',questionKey:'tec:2417266',baseline});
const row=(score=0)=>auditRows([card()],{c1:[...baseline,{date:t+100,score}]},t,t+1000)[0];
function memory() {
  const values=new Map<string,unknown>();
  return {values,async getSynced<T>(key:string){return values.get(key) as T|undefined;},async setSynced(key:string,value:unknown){values.set(key,JSON.parse(JSON.stringify(value)));}};
}
test('classifica somente Esqueci como erro e os três botões de acerto; ignora outras operações',()=>{
  assert.equal(outcome(0),false);for(const score of [.5,1,1.5])assert.equal(outcome(score),true);
  for(const score of [.01,2,3,4,5,NaN,99])assert.equal(outcome(score),null);
});
test('identifica a questão pelo domínio e caminho TEC, sem confundir rótulos, ícones ou sites parecidos',()=>{
  assert.deepEqual(tecQuestionKeys(['https://www.tecconcursos.com.br/questoes/2417266?x=1','https://tecconcursos.com.br/questoes/02417266/']),['tec:2417266']);
  assert.deepEqual(tecQuestionKeys(['📖','#2417266','https://tecconcursos.com.br.evil.test/questoes/2417266','javascript:alert(1)','https://www.tecconcursos.com.br/blog/2417266']),[]);
});
test('usa primeira resposta e não infla o acerto quando a questão errada reaparece',()=>{
  const rows=auditRows([card()],{c1:[...baseline,{date:t+10,score:0},{date:t+20,score:1},{date:t+30,score:1.5}]},t,t+1000);
  assert.equal(rows.length,1);assert.equal(rows[0].correct,false);assert.equal(rows[0].responses,3);assert.equal(rows[0].include,true);
  assert.equal(approvedEntries(rows)[0].correct,false);
});
test('agrupa cartões da mesma questão e bloqueia atribuição ambígua a aulas diferentes',()=>{
  const histories={c1:[...baseline,{date:t+10,score:1}],c2:[...baseline,{date:t+20,score:0}]};
  const same=auditRows([card(),card('c2')],histories,t,t+1000);assert.equal(same.length,1);assert.equal(same[0].correct,true);
  const ambiguous=auditRows([card(),card('c2','other')],histories,t,t+1000);assert.equal(ambiguous[0].include,false);assert.match(ambiguous[0].issue,/ambígua/);
});
test('ausência de histórico, desfazer e resultados conflitantes exigem conferência manual',()=>{
  assert.ok(historyDelta(baseline,[]).issue);assert.ok(historyDelta(null,[]).issue);
  const missing=auditRows([{...card(),baseline:null}],{c1:[{date:t+100,score:1}]},t,t+1000)[0];assert.equal(missing.include,false);
  const conflict=auditRows([card()],{c1:[...baseline,{date:t+10,score:0},{date:t+10,score:1}]},t,t+1000)[0];assert.equal(conflict.include,false);
  const undo=auditRows([card()],{c1:[...baseline,{date:t+10,score:1}]},t,t+1000,{c1:'Resposta desfeita durante a sessão.'})[0];assert.equal(undo.include,false);
  assert.throws(()=>approvedEntries([{...undo,include:true}]));
  assert.equal(approvedEntries([{...undo,manual:true,include:true}]).length,1);
});
test('não contabiliza cartões sem resposta ou sem identificação; edição manual é explícita',()=>{
  const untouched=auditRows([card()],{c1:baseline},t,t+1000)[0];assert.equal(untouched.include,false);assert.equal(untouched.correct,null);
  const unknown=auditRows([{...card(),questionKey:undefined,identityIssue:'Sem link TEC.'}],{c1:[...baseline,{date:t+20,score:1}]},t,t+1000)[0];assert.equal(unknown.include,false);
  assert.throws(()=>approvedEntries([{...unknown,manual:true,include:true}]));
  assert.equal(approvedEntries([{...unknown,questionKey:'rem:c1',manual:true,include:true}]).length,1);
});
test('separa dias locais em bloco que cruza meia-noite e sinaliza tentativa anterior ao bloco no dia',()=>{
  const midnight=new Date(2026,10,22,0).getTime();
  const rows=auditRows([card()],{c1:[...baseline,{date:midnight-100,score:0},{date:midnight+100,score:1}]},midnight-1000,midnight+1000);
  assert.equal(rows.length,2);assert.equal(new Set(approvedEntries(rows).map(r=>r.day)).size,2);
  const earlier=auditRows([{...card(),baseline:[{date:t-100,score:0}]}],{c1:[{date:t-100,score:0},{date:t+100,score:1}]},t,t+1000)[0];
  assert.equal(earlier.include,false);assert.match(earlier.issue,/antes do bloco/);
});
test('soma por aula somente após confirmação, mantém progresso, isola bases e permite replay sem duplicar',async()=>{
  const store=memory();const repo=createRepository(store,'base');const other=createRepository(store,'other');
  await repo.saveLesson('lesson',{totalPages:40,readPages:30});await repo.saveExercise('lesson',{correct:4,incorrect:1});
  const batch:AuditBatch={id:'audit1',createdAt:t+1000,entries:approvedEntries([row(0)])};
  assert.deepEqual((await repo.load()).exercises.lesson,{correct:4,incorrect:1});
  await Promise.all([repo.commitAudit(batch),repo.commitAudit(batch)]);
  const saved=await repo.load();assert.deepEqual(saved.exercises.lesson,{correct:4,incorrect:2});assert.equal(saved.lessons.lesson.readPages,30);
  assert.deepEqual(Object.keys((await other.load()).exercises),[]);
  const next={...batch,id:'audit2',entries:[{...batch.entries[0],correct:true}]};await repo.commitAudit(next);
  assert.deepEqual((await repo.load()).exercises.lesson,saved.exercises.lesson);assert.equal((await repo.load()).auditBatches!.audit2.entries.length,0);
  const exported=JSON.parse(JSON.stringify(await repo.load()));await repo.restore(exported);assert.equal((await repo.load()).auditBatches!.audit1.entries.length,1);
  await assert.rejects(()=>other.restore(exported));
});
test('rejeita resumo inconsistente e replay alterado sem gravação parcial; questão pode contar no dia seguinte',async()=>{
  const repo=createRepository(memory(),'base');const entries=approvedEntries([row(1)]);const batch={id:'a1',createdAt:t+1000,entries};
  await assert.rejects(()=>repo.commitAudit({...batch,entries:[...entries,...entries]}));assert.deepEqual(Object.keys((await repo.load()).exercises),[]);
  await repo.commitAudit(batch);await assert.rejects(()=>repo.commitAudit({...batch,entries:[{...entries[0],correct:false}]}));
  const tomorrow=t+86400000;await repo.commitAudit({id:'a2',createdAt:tomorrow+1000,entries:[{...entries[0],at:tomorrow,day:studyDay(0,new Date(tomorrow))}]});
  assert.equal((await repo.load()).exercises.lesson.correct,2);
});
test('falha ao salvar não altera totais nem histórico; retry registra uma única vez',async()=>{
  const store=memory();let fail=true;const repo=createRepository({...store,async setSynced(key:string,value:unknown){if(fail)throw new Error('offline');await store.setSynced(key,value);}},'base');
  const batch={id:'a1',createdAt:t+1000,entries:approvedEntries([row(1)])};
  await assert.rejects(()=>repo.commitAudit(batch));assert.equal((await repo.load()).exercises.lesson,undefined);
  fail=false;await repo.commitAudit(batch);await repo.commitAudit(batch);assert.equal((await repo.load()).exercises.lesson.correct,1);
});

test('se a resposta do SDK falhar após gravar, consulta e retry encontram o mesmo bloco sem duplicar',async()=>{
  const store=memory();let fail=true;
  const repo=createRepository({...store,async setSynced(key:string,value:unknown){await store.setSynced(key,value);if(fail){fail=false;throw new Error('resposta perdida');}}},'base');
  const batch={id:'lost_reply',createdAt:t+1000,entries:approvedEntries([row(1)])};
  await assert.rejects(()=>repo.commitAudit(batch));const verified=await repo.load();
  assert.equal(verified.auditBatches!.lost_reply.entries.length,1);assert.equal(verified.exercises.lesson.correct,1);
  await repo.commitAudit(batch);assert.equal((await repo.load()).exercises.lesson.correct,1);
});
test('converte backups antigos para formato 4 e rejeita ledger duplicado ou incompleto',()=>{
  const old={version:1,baseId:'base',globalPace:null,subjectPaces:{},lessons:{}};
  const migrated=parseBackup(old,'base');assert.equal(migrated.version,4);assert.deepEqual(Object.keys(migrated.auditBatches!),[]);
  const entry=approvedEntries([row(1)])[0];assert.throws(()=>parseBackup({...migrated,auditBatches:{a1:{id:'a1',createdAt:t+1000,entries:[entry]},a2:{id:'a2',createdAt:t+1000,entries:[entry]}}},'base'));
  assert.throws(()=>parseBackup({...migrated,auditBatches:undefined},'base'));
});

test('captura consulta apenas cartões selecionados e confirma link e hierarquia sem escrever em Rems',async()=>{
  const local=new Map<string,unknown>();const session=new Map<string,unknown>();let history=[...baseline];
  const sdk={kb:{async getCurrentKnowledgeBaseData(){return {_id:'base'};}},
    storage:{async getSession(k:string){return session.get(k);},async setSession(k:string,v:unknown){session.set(k,v);},async getLocal(k:string){return local.get(k);},async setLocal(k:string,v:unknown){local.set(k,JSON.parse(JSON.stringify(v)));}},
    card:{async findMany(ids:string[]){assert.deepEqual(ids,['c1']);return [{_id:'c1',remId:'r1',repetitionHistory:history}];}},
    rem:{async findOne(id:string){return id==='r1'?{_id:'r1',parent:'link',text:['📖 Julgue o item']}:id==='link'?{_id:'link',parent:'lesson',text:['https://www.tecconcursos.com.br/questoes/2417266']}:undefined;}},
    richText:{async toString(text:string[]){return text.join('');},async findAllExternalURLs(text:string[]){return text.filter(s=>s.startsWith('https://'));}}} as unknown as RNPlugin;
  const draft=await prepareAudit(sdk,'base','audit1',['c1'],new Map([['c1','lesson']]));
  assert.equal(draft.cards[0].questionKey,'tec:2417266');assert.equal(draft.cards[0].lessonId,'lesson');assert.equal(validDraft(draft,'base'),true);assert.equal(validDraft(draft,'other'),false);
  history=[...baseline,{date:Date.now(),score:0}];const after=await refreshAudit(sdk,draft);
  assert.equal(auditRows(after.cards,after.histories,draft.startedAt,Date.now()+1000)[0].correct,false);
  assert.equal(local.has(auditDraftKey('base')),true);assert.equal(readHistory(undefined),null);
});

test('duas telas não recuperam simultaneamente o mesmo bloco e outra base não usa a sessão',async()=>{
  const session=new Map<string,unknown>();let base='base';
  const sdk={kb:{async getCurrentKnowledgeBaseData(){return {_id:base};}},storage:{async getSession(key:string){return session.get(key);},async setSession(key:string,value:unknown){session.set(key,value);}}} as unknown as RNPlugin;
  await claimAudit(sdk,'base','audit1','screen1');await claimAudit(sdk,'base','audit1','screen1');
  await assert.rejects(()=>claimAudit(sdk,'base','audit1','screen2'));
  await releaseAudit(sdk,'base','audit1','screen2');await assert.rejects(()=>claimAudit(sdk,'base','audit1','screen2'));
  await releaseAudit(sdk,'base','audit1','screen1');await claimAudit(sdk,'base','audit1','screen2');
  base='other';await assert.rejects(()=>claimAudit(sdk,'base','audit1','screen2'));
});

test('questão de livro sem TEC usa o tópico quando resposta e aula são confirmadas',()=>{
  const source={...card(),questionKey:undefined,identityIssue:'Sem link TEC.',allowCardIdentity:true};
  const rows=simplifyAuditRows(auditRows([source],{c1:[...baseline,{date:t+10,score:0}]},t,t+100),[source]);
  assert.equal(rows[0].include,true);assert.equal(rows[0].questionKey,'rem:rem_c1');assert.equal(rows[0].recordByCard,true);
  assert.equal(approvedEntries(rows)[0].correct,false);
});
test('simplificação não inclui resposta ausente ou incerta, nem flashcard comum sem identidade',()=>{
  const source={...card(),questionKey:undefined,identityIssue:'Sem link TEC.',allowCardIdentity:true};
  const untouched=simplifyAuditRows(auditRows([source],{c1:baseline},t,t+100),[source]);assert.equal(untouched[0].include,false);
  const uncertain=simplifyAuditRows(auditRows([source],{c1:[...baseline,{date:t+10,score:1}]},t,t+100,{c1:'Histórico alterado.'}),[source]);assert.equal(uncertain[0].include,false);
  const normal={...source,allowCardIdentity:false};assert.equal(simplifyAuditRows(auditRows([normal],{c1:[...baseline,{date:t+10,score:1}]},t,t+100),[normal])[0].include,false);
});
test('cartões do mesmo tópico sem TEC são agrupados, preservando o primeiro erro',()=>{
  const sources=[{...card(),questionKey:undefined,identityIssue:'Sem link TEC.',allowCardIdentity:true},
    {...card('c2'),remId:'rem_c1',questionKey:undefined,identityIssue:'Sem link TEC.',allowCardIdentity:true}];
  const histories={c1:[...baseline,{date:t+10,score:0}],c2:[...baseline,{date:t+20,score:1}]};
  const rows=simplifyAuditRows(auditRows(sources,histories,t,t+100),sources);
  assert.equal(rows.length,1);assert.equal(rows[0].correct,false);assert.equal(rows[0].responses,2);
  sources[0].baseline=[{date:t-100,score:0}];histories.c1=[...sources[0].baseline];
  const prior=simplifyAuditRows(auditRows(sources,histories,t,t+100),sources);assert.equal(prior.some(r=>r.include),false);
});
test('totais e gravação consideram somente as aulas selecionadas e excluem questão já contada',()=>{
  const a=row(1);const b={...row(0),id:'b',lessonId:'other',questionKey:'tec:999'};
  assert.equal(selectedAuditRows([a,b],['lesson'],new Set()).length,1);
  assert.equal(selectedAuditRows([a,b],[],new Set()).length,0);
  const known=new Set([studyDay(0,new Date(a.at!))+'|'+a.questionKey]);
  assert.equal(selectedAuditRows([a,b],['lesson','other'],known).length,1);
});
test('rascunho finalizado e inalterado mantém respostas, mas interrupção ou alteração exige conferência',()=>{
  const previous={phase:'summary',endedAt:t+100,histories:{c1:[{date:t+10,score:1}]}} as unknown as AuditDraft;
  assert.equal(stableAuditRecovery(previous,{...previous}),true);
  assert.equal(stableAuditRecovery({...previous,phase:'running'},{...previous}),false);
  assert.equal(stableAuditRecovery(previous,{...previous,histories:{c1:[{date:t+20,score:0}]}}),false);
  const legacy={...card(),title:'📖 Julgue o item',questionKey:undefined,identityIssue:'Sem link TEC nos ancestrais do cartão. O ícone de livro sozinho não identifica uma questão.'};
  const rows=simplifyAuditRows(auditRows([legacy],{c1:[...baseline,{date:t+10,score:1}]},t,t+100),[legacy]);
  assert.equal(rows[0].include,true);
});
test('pendência marcada e identificação inválida ficam fora do registro sem bloquear respostas válidas',()=>{
  const valid=row(1);const pending={...row(0),id:'pending',issue:'Histórico alterado.',include:true};
  const badKey={...row(1),id:'bad-key',questionKey:'https://www.tecconcursos.com.br/questoes/123',include:true};
  const selected=selectedAuditRows([valid,pending,badKey],['lesson'],new Set());
  assert.deepEqual(selected.map(r=>r.id),[valid.id]);assert.equal(approvedEntries(selected).length,1);
});
test('voltar preserva rascunho e não registra exercícios; não sobrescreve outro bloco',async()=>{
  const local=new Map<string,unknown>();let syncedWrites=0;
  const sdk={storage:{async getLocal(k:string){return local.get(k);},async setLocal(k:string,v:unknown){local.set(k,v);},async setSynced(){syncedWrites++;}}} as unknown as RNPlugin;
  const draft:AuditDraft={version:1,id:'a1',baseId:'base',phase:'summary',startedAt:t,endedAt:t+1000,cards:[card()],histories:{c1:baseline},issues:{},rows:[{...row(1),issue:'pendente'}]};
  await keepAuditDraft(sdk,draft);assert.equal((local.get(auditDraftKey('base')) as AuditDraft).rows![0].issue,'pendente');assert.equal(syncedWrites,0);
  await assert.rejects(()=>keepAuditDraft(sdk,{...draft,id:'a2'}));assert.equal((local.get(auditDraftKey('base')) as AuditDraft).id,'a1');
});
test('consulta que termina depois de fechar a tela não recria nem altera o rascunho',async()=>{
  const session=new Map<string,unknown>();const local=new Map<string,unknown>();let resume!:(value:unknown[])=>void;let entered!:()=>void;
  const started=new Promise<void>(resolve=>{entered=resolve;});
  const sdk={kb:{async getCurrentKnowledgeBaseData(){return {_id:'base'};}},storage:{
    async getSession(k:string){return session.get(k);},async setSession(k:string,v:unknown){session.set(k,v);},async getLocal(k:string){return local.get(k);},async setLocal(k:string,v:unknown){local.set(k,v);}},
    card:{async findMany(){entered();return new Promise<unknown[]>(resolve=>{resume=resolve;});}}} as unknown as RNPlugin;
  const draft:AuditDraft={version:1,id:'a1',baseId:'base',phase:'running',startedAt:t,cards:[card()],histories:{c1:baseline},issues:{}};
  const pending=refreshAudit(sdk,draft,'screen1');await started;await releaseAudit(sdk,'base','a1','screen1');
  resume([{_id:'c1',repetitionHistory:[...baseline,{date:t+100,score:1}]}]);
  await assert.rejects(()=>pending,/encerrada/);assert.equal(local.size,0);
});
