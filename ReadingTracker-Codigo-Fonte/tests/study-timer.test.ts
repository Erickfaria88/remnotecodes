import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {newStudyTimer,timerMilliseconds,pauseStudyTimer,resumeStudyTimer,finishStudyTimer,timerSession,createTimerRepository,timerStorageKey,validStudyTimer} from '../src/study-timer';
import {createRepository} from '../src/remnote/storage';
import {remainingDailyTime} from '../src/study-sessions';
import {LessonForm} from '../src/components/LessonForm';
const t=Date.now()-3600000;
function storage(){const local=new Map<string,unknown>(),synced=new Map<string,unknown>();return {local,synced,
  async getLocal<T>(k:string){return local.get(k) as T|undefined;},async setLocal(k:string,v:unknown){local.set(k,JSON.parse(JSON.stringify(v)));},
  async getSynced<T>(k:string){return synced.get(k) as T|undefined;},async setSynced(k:string,v:unknown){synced.set(k,JSON.parse(JSON.stringify(v)));}};}
test('cronômetro soma apenas períodos em execução e pausa/retomada não reiniciam a contagem',()=>{
  let timer=newStudyTimer('base','lesson','Aula','theory',t,'timer1');
  assert.equal(timerMilliseconds(timer,t+10000),10000);
  timer=pauseStudyTimer(timer,t+10000);assert.equal(timerMilliseconds(timer,t+60000),10000);
  assert.deepEqual(pauseStudyTimer(timer,t+90000),timer);
  timer=resumeStudyTimer(timer,t+60000);assert.equal(timerMilliseconds(timer,t+65000),15000);
  assert.deepEqual(resumeStudyTimer(timer,t+90000),timer);
  timer=finishStudyTimer(timer,t+65000);assert.equal(timerSession(timer).seconds,15);
  assert.deepEqual(finishStudyTimer(timer,t+120000),timer);assert.throws(()=>resumeStudyTimer(timer,t+120000));
});
test('concluir durante pausa preserva o tempo e fornece a categoria e um ID estável ao formulário',()=>{
  const timer=pauseStudyTimer(newStudyTimer('base','lesson','Aula','review',t,'timer1'),t+90000);
  const done=finishStudyTimer(timer,t+900000);const session=timerSession(done);
  assert.equal(session.seconds,90);assert.equal(session.id,'timer1');assert.equal(session.category,'review');assert.equal(session.counted,true);
  assert.throws(()=>timerSession(timer));
});
test('mudança de tela/recriação do repositório mantém tempo, aula e pausa; bases são isoladas',async()=>{
  const s=storage();const a=createTimerRepository(s,'a');const started=await a.start('lesson','Aula','theory',t);
  assert.equal((await createTimerRepository(s,'a').load())?.id,started!.id);
  assert.equal(timerMilliseconds((await a.load())!,t+60000),60000);
  await a.pause(started!.id,t+60000);assert.equal(timerMilliseconds((await createTimerRepository(s,'a').load())!,t+360000),60000);
  assert.equal(await createTimerRepository(s,'b').load(),undefined);
  await assert.rejects(()=>a.start('other','Outra aula','theory',t+70000));
});
test('retomada e conclusão serializadas não duplicam tempo; limpeza não apaga outro cronômetro',async()=>{
  const repo=createTimerRepository(storage(),'base');const timer=(await repo.start('lesson','Aula','theory',t))!;
  await Promise.all([repo.pause(timer.id,t+10000),repo.pause(timer.id,t+20000)]);
  const paused=(await repo.load())!;assert.equal(paused.accumulatedMs,10000);
  await repo.finish(timer.id,t+30000);await repo.finish(timer.id,t+60000);assert.equal(timerSession((await repo.load())!).seconds,10);
  assert.equal(await repo.clear('another_id'),false);assert.ok(await repo.load());
  assert.equal(await repo.clear(timer.id),true);assert.equal(await repo.load(),undefined);
});
test('estado inválido e falha do armazenamento não são substituídos por um contador zerado',async()=>{
  const s=storage();s.local.set(timerStorageKey('base'),{version:99});
  await assert.rejects(()=>createTimerRepository(s,'base').load());assert.deepEqual(s.local.get(timerStorageKey('base')),{version:99});
  const empty=storage();const repo=createTimerRepository({...empty,async setLocal(){throw new Error('offline');}},'base');
  await assert.rejects(()=>repo.start('lesson','Aula'));assert.equal(await repo.load(),undefined);
  assert.equal(validStudyTimer({...newStudyTimer('base','lesson','Aula'),accumulatedMs:-1},'base'),false);
  assert.equal(validStudyTimer(newStudyTimer('base','lesson','Aula'),'other'),false);
});
test('o cronômetro não altera o saldo até salvar; salvar a mesma sessão não duplica exercícios nem tempo',async()=>{
  const s=storage();const clock=createTimerRepository(s,'base');const repo=createRepository(s,'base');
  const timer=(await clock.start('lesson','Aula','review',t))!;const done=(await clock.finish(timer.id,t+60000))!;
  assert.equal(remainingDailyTime(await repo.load()).review,90);
  const session={...timerSession(done),lessonId:'lesson',subjectId:'subject',title:'Aula',subject:'Disciplina'};
  await repo.saveStudy('lesson',{totalPages:40,readPages:30},undefined,undefined,undefined,{correct:4,incorrect:1},false,undefined,undefined,session);
  await repo.saveStudy('lesson',{totalPages:40,readPages:30},undefined,undefined,undefined,{correct:4,incorrect:1},false,undefined,undefined,session);
  const saved=await repo.load();assert.equal(Object.keys(saved.sessions!).length,1);assert.deepEqual(saved.exercises.lesson,{correct:4,incorrect:1});
  assert.equal(remainingDailyTime(saved,session.day).review,89);assert.equal(saved.lessons.lesson.readPages,30);
  assert.equal((await clock.load())!.status,'finished');await clock.clear(timer.id);assert.equal(await clock.load(),undefined);
});
test('formulário recebe tempo e categoria sem substituir as páginas já cadastradas',()=>{
  const timer=finishStudyTimer(newStudyTimer('base','lesson','Aula','review',t,'timer1'),t+65000);
  const html=renderToStaticMarkup(createElement(LessonForm,{title:'Aula',progress:{totalPages:40,readPages:30},busy:false,calendarId:'base:lesson',lessonId:'lesson',initialSession:timerSession(timer),async onSave(){}}));
  assert.match(html,/value="00:01:05"/);assert.match(html,/value="40"/);assert.match(html,/value="30"/);assert.match(html,/<option(?=[^>]*value="review")(?=[^>]*selected)[^>]*>/);assert.match(html,/Tempo do cronômetro carregado/);
});
