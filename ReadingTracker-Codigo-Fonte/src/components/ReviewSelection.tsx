import type { ReviewSelection as Selection } from '../balanced-review';
export function ReviewSelection({value,onChange,titles,available,busy}:{value:Selection;onChange:(v:Selection)=>void;
  titles:Map<string,{title:string;subject:string;subjectId:string}>;available:Map<string,number>;busy:boolean}) {
  const subjects=new Map<string,string>();for(const row of titles.values())subjects.set(row.subjectId,row.subject);
  const subjectId=subjects.has(value.subjectId??'')?value.subjectId:[...subjects.keys()][0];
  const lessons=[...titles].filter(([,row])=>row.subjectId===subjectId);
  const lessonId=titles.has(value.lessonId??'')?value.lessonId:[...titles.keys()][0];
  const chosen=value.subjects??[...subjects.keys()];
  const quota=(scope:'subject'|'lesson',id:string,n:string)=>onChange({...value,[scope==='subject'?'subjectCounts':'lessonCounts']:{...(scope==='subject'?value.subjectCounts:value.lessonCounts),[id]:n===''?NaN:Number(n)}});
  return <fieldset className="rt-review-selection" disabled={busy}>
    <legend>Como deseja revisar?</legend>
    <label>Modo de revisão<select value={value.mode} onChange={e=>onChange({...value,mode:e.target.value as Selection['mode']})}>
      <option value="block">Revisão por bloco</option><option value="subject">Revisão por disciplina</option><option value="lesson">Revisão por aula</option><option value="auto">Automática · blocos por prioridade</option>
    </select></label>
    {value.mode==='block'&&<>
      <p>Selecione as disciplinas e a quantidade de flashcards de cada uma. Padrão: 10 por disciplina, distribuídos entre suas aulas.</p>
      <details><summary>Selecionar disciplinas e editar quantidades ({chosen.length} selecionadas)</summary>
      <div className="rt-actions"><button type="button" onClick={()=>onChange({...value,subjects:[...subjects.keys()]})}>Selecionar todas</button><button type="button" onClick={()=>onChange({...value,subjects:[]})}>Limpar seleção</button></div>
      <div className="rt-exam-grid">{[...subjects].map(([id,name])=>{
        const count=[...titles].filter(([,row])=>row.subjectId===id).reduce((sum,[id])=>sum+(available.get(id)??0),0);
        return <div className="rt-row" key={id}>
          <label className="rt-pareto-toggle"><input type="checkbox" checked={chosen.includes(id)} onChange={e=>onChange({...value,subjects:e.target.checked?[...chosen,id]:chosen.filter(s=>s!==id)})}/>{name}</label>
          <label>Flashcards neste bloco<input type="number" min="0" max="2000" step="1" disabled={!chosen.includes(id)} value={Number.isNaN(value.subjectCounts[id])?'':value.subjectCounts[id]??10} onChange={e=>quota('subject',id,e.target.value)}/></label><small>{count} pendentes nos filtros atuais</small>
        </div>;
      })}</div>
      </details>
    </>}
    {value.mode==='subject'&&<>
      <label>Disciplina<select value={subjectId??''} onChange={e=>onChange({...value,subjectId:e.target.value})}>{[...subjects].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <p>Indique quantos flashcards deseja de cada aula. Zero exclui a aula do bloco.</p>
      <details><summary>Editar quantidade por aula</summary>
      <div className="rt-exam-grid">{lessons.map(([id,row])=><label className="rt-row" key={id}>{row.title}
        <input aria-label={'Quantidade de '+row.title} type="number" min="0" max="2000" step="1" value={Number.isNaN(value.lessonCounts[id])?'':value.lessonCounts[id]??10} onChange={e=>quota('lesson',id,e.target.value)}/><small>{available.get(id)??0} pendentes</small>
      </label>)}</div>
      </details>
    </>}
    {value.mode==='lesson'&&<>
      <label>Aula<select value={lessonId??''} onChange={e=>onChange({...value,lessonId:e.target.value})}>{[...titles].map(([id,row])=><option key={id} value={id}>{row.subject} · {row.title}</option>)}</select></label>
      {lessonId&&<label>Quantidade de flashcards<input type="number" min="0" max="2000" step="1" value={Number.isNaN(value.lessonCounts[lessonId])?'':value.lessonCounts[lessonId]??10} onChange={e=>quota('lesson',lessonId,e.target.value)}/></label>}
    </>}
    <p>As quantidades são de flashcards, não de questões únicas. Uma questão pode gerar vários cartões. O resumo de auditoria agrupa os identificados pelo mesmo número TEC. Se faltar tempo ou cartões pendentes, a prévia será menor que o solicitado.</p>
  </fieldset>;
}
