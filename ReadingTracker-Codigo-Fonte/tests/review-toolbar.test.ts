import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReviewToolbar} from '../src/components/ReviewToolbar';
test('resumo sempre apresenta uma saída habilitada, inclusive durante erro ou operação pendente',()=>{
  for(const working of [false,true]){
    const html=renderToStaticMarkup(createElement(ReviewToolbar,{summary:true,running:false,working,onLeave(){},onFinish(){}}));
    const exit=html.match(/<button[^>]*data-action="leave-review"[^>]*>/)?.[0];
    assert.ok(exit);assert.doesNotMatch(exit,/disabled|hidden/);assert.match(html,/Voltar ao plano/);
  }
});
test('preparação e prática mantêm saída independente do botão de encerrar',()=>{
  for(const running of [true,false]){
    const html=renderToStaticMarkup(createElement(ReviewToolbar,{summary:false,running,working:true,onLeave(){},onFinish(){}}));
    const exit=html.match(/<button[^>]*data-action="leave-review"[^>]*>/)?.[0];assert.ok(exit);assert.doesNotMatch(exit,/disabled|hidden/);
  }
});
