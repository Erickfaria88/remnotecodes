import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { documentMetrics } from '../src/document-metrics';
import { parseBackup } from '../src/remnote/storage';

test('disciplina soma aulas e exige todas as etapas, mesmo com registro no pai', () => {
  const data = parseBackup({
    version: 1, baseId: 'base', globalPace: null, subjectPaces: {},
    lessons: {
      subject: { totalPages: 28, readPages: 28, completedSteps: ['theory'] },
      a: { totalPages: 28, readPages: 28, completedSteps: ['theory', 'literal'] },
      b: { totalPages: 40, readPages: 0, completedSteps: ['literal'] },
    },
    exercises: { a: { correct: 8, incorrect: 2 }, b: { correct: 6, incorrect: 4 } },
  }, 'base');
  const total = documentMetrics(data, 'subject', ['a', 'b', 'unregistered']);
  assert.equal(total.readPages, 28);
  assert.equal(total.totalPages, 68);
  assert.equal(total.percent, 28 / 68 * 100);
  assert.deepEqual(total.steps, ['literal']);
  assert.deepEqual(total.exercise, { total: 20, percent: '70%', band: 'yellow' });
  assert.equal(documentMetrics(data, 'a', []).totalPages, 28);
  assert.equal(documentMetrics(data, 'a', []).exercise?.percent, '80%');
});

import {progressRole} from '../src/document-metrics';
test('aula registrada usa seu próprio progresso mesmo quando há registros em documentos filhos',()=>{
 const data=parseBackup({version:1,baseId:'base',globalPace:null,subjectPaces:{},subjectPhases:{subject:1},lessons:{lesson:{totalPages:58,readPages:0},child:{totalPages:537,readPages:432}},exercises:{child:{correct:1095,incorrect:125}}},'base');
 const role=progressRole(data,'lesson',['child']);assert.equal(role,'lesson');
 const result=documentMetrics(data,'lesson',['child'],role);assert.equal(result.totalPages,58);assert.equal(result.readPages,0);assert.equal(result.exercise,null);
 assert.equal(progressRole(data,'subject',['lesson']),'subject');assert.equal(documentMetrics(data,'subject',['lesson'],'subject').totalPages,58);
});
test('disciplina conhecida continua somando aulas mesmo com cadastro antigo no próprio documento',()=>{
 const data=parseBackup({version:1,baseId:'base',globalPace:null,subjectPaces:{},subjectPhases:{subject:1},lessons:{subject:{totalPages:28,readPages:28},a:{totalPages:58,readPages:0},b:{totalPages:42,readPages:10}}},'base');
 const role=progressRole(data,'subject',['a','b']);assert.equal(role,'subject');assert.equal(documentMetrics(data,'subject',['a','b'],role).totalPages,100);assert.equal(documentMetrics(data,'subject',['a','b'],role).readPages,10);
});
