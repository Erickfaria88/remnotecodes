import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {isStudyDescendant} from '../src/study-descendant';
test('cronômetro acompanha filhos e netos pela hierarquia real da aula',async()=>{
 const parents:Record<string,string>={child:'lesson',grandchild:'child',sibling:'subject',lesson:'subject'};
 const get=async(id:string)=>parents[id];
 assert.equal(await isStudyDescendant('child','lesson',get),true);
 assert.equal(await isStudyDescendant('grandchild','lesson',get),true);
 assert.equal(await isStudyDescendant('lesson','lesson',get),true);
 assert.equal(await isStudyDescendant('sibling','lesson',get),false);
 assert.equal(await isStudyDescendant('subject','lesson',get),false);
});
test('pais ausentes e ciclos não vinculam o tempo a outra aula',async()=>{
 assert.equal(await isStudyDescendant('missing','lesson',async()=>undefined),false);
 assert.equal(await isStudyDescendant('a','lesson',async id=>id==='a'?'b':'a'),false);
});
