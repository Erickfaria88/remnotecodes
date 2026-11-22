import { useEffect, useMemo, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import type { Backup } from '../remnote/storage';
import { searchSubjects, documentTitle } from '../remnote/documents';
import { studyDay } from '../resume';
import { activeExams, buildExamPlan, daysUntil, emptyPreparation, examLessonIds, examReviewPriorities, examMetrics, futureCapacity,
  projectExamPlan, type Exam, type ExamSubject, type ExamTopic, type Preparation } from '../exam-preparation';
import { studySteps } from '../study-steps';
import { FlashcardPlan } from './FlashcardPlan';
import type { ReviewTagFilter } from '../study-scope';

const uid = () => 'e_'+crypto.randomUUID().replaceAll('-','');
const percent = (n:number) => n.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const hours = (n:number) => (n/60).toLocaleString('pt-BR',{maximumFractionDigits:1})+' h';
const topic = ():ExamTopic => ({id:uid(),name:'Novo assunto',lessonIds:[],incidence:null,source:'',priority:'desirable',estimatedMinutes:null});
const subject = ():ExamSubject => ({id:uid(),name:'Nova disciplina',questions:10,weight:1,minimumPercent:null,block:'',topics:[]});

function LessonLinks({plugin, ids, onChange, busy}:{plugin:RNPlugin;ids:string[];onChange:(ids:string[])=>void;busy:boolean}) {
  const [query,setQuery]=useState(''); const [rows,setRows]=useState<Awaited<ReturnType<typeof searchSubjects>>>([]);
  const [names,setNames]=useState<Record<string,string>>({}); const [error,setError]=useState(''); const [searching,setSearching]=useState(false);
  useEffect(()=>{let active=true; void plugin.rem.findMany(ids).then(async rems=>{
    const pairs=await Promise.all((rems??[]).map(async r=>[r._id,await documentTitle(plugin,r)] as const));
    if(active)setNames(Object.fromEntries(pairs));
  }).catch(()=>{if(active)setError('Não foi possível consultar os títulos das aulas.');});return()=>{active=false;};},[plugin,ids.join(',')]);
  return <div className="rt-exam-links">
    <p>Aulas vinculadas: {ids.length}. O mesmo ID pode atender a outros editais.</p>
    <ul>{ids.map(id=><li key={id}>{names[id]??id} <button type="button" disabled={busy} onClick={()=>onChange(ids.filter(x=>x!==id))}>Desvincular</button></li>)}</ul>
    <label>Buscar aula existente<input value={query} onChange={e=>{setQuery(e.target.value);setRows([]);}} /></label>
    <button type="button" disabled={busy||searching||query.trim().length<2} onClick={()=>{
      setSearching(true);setError('');void searchSubjects(plugin,query.trim()).then(setRows)
        .catch(()=>setError('Falha na busca. Tente novamente.')).finally(()=>setSearching(false));
    }}>{searching?'Buscando…':'Buscar aulas'}</button>
    {error&&<p role="alert">{error}</p>}
    <ul className="rt-exam-search">{rows.filter(r=>!ids.includes(r.rem._id)).map(r=><li key={r.rem._id}>
      <button type="button" disabled={busy} onClick={()=>{onChange([...ids,r.rem._id]);setRows([]);setQuery('');}}>{r.title}{r.parent?' · '+r.parent:''}</button>
    </li>)}</ul>
  </div>;
}

export function ExamManager({plugin,data,busy,onSave}:{plugin:RNPlugin;data:Backup;busy:boolean;onSave:(prep:Preparation)=>Promise<void>}) {
  const prep=data.preparation??emptyPreparation();
  const [draft,setDraft]=useState<Exam>(); const [error,setError]=useState(''); const [confirm,setConfirm]=useState<string>();
  const [overrideDate,setOverrideDate]=useState(studyDay());const [overrideMinutes,setOverrideMinutes]=useState('0');
  const save=async(next:Preparation)=>{setError('');try{await onSave(next);return true;}catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.');return false;}};
  function updateSubject(id:string, next:ExamSubject){setDraft(d=>d&&({...d,subjects:d.subjects.map(s=>s.id===id?next:s)}));}
  return <section className="rt-card" aria-label="Concursos e editais">
    <h2>Concursos e editais</h2>
    <p>Cadastre o conteúdo do edital manualmente e confira pesos e regras. A preparação normal mantém suas fases; o pós-edital usa os concursos ativos e compartilha as aulas, sem duplicar progresso ou tempo.</p>
    {error&&<p role="alert">{error}</p>}
    {!draft&&<>
      <button type="button" disabled={busy} onClick={()=>setDraft({id:uid(),name:'',board:'',date:'',active:true,priority:3,penalty:0,notes:'',blocks:[],subjects:[]})}>Cadastrar edital</button>
      <div className="rt-exam-grid">{prep.exams.map(exam=><article className="rt-row rt-exam-summary" key={exam.id}>
        <h3>{exam.name}</h3><p>{exam.date.split('-').reverse().join('/')} · {exam.subjects.length} disciplinas · {exam.active?'Ativo':'Arquivado'}{exam.date<=studyDay()?' · prazo encerrado':''}</p>
        <div className="rt-actions"><button type="button" disabled={busy} onClick={()=>setDraft(JSON.parse(JSON.stringify(exam)))}>Editar edital</button>
          <button type="button" disabled={busy} onClick={()=>setDraft({...JSON.parse(JSON.stringify(exam)),id:uid(),name:exam.name+' · cópia',date:'',active:true})}>Usar como base para outro edital</button>
          <button type="button" disabled={busy} onClick={()=>void save({...prep,exams:prep.exams.map(e=>e.id===exam.id?{...e,active:!e.active}:e)})}>{exam.active?'Arquivar':'Ativar'}</button>
          <button type="button" disabled={busy} onClick={()=>setConfirm(exam.id)}>Excluir cadastro</button></div>
        {confirm===exam.id&&<div role="alert"><p>Excluir somente este edital? As aulas, exercícios e registros de estudo serão preservados.</p>
          <button type="button" disabled={busy} onClick={()=>void save({...prep,exams:prep.exams.filter(e=>e.id!==exam.id)}).then(ok=>{if(ok)setConfirm(undefined);})}>Confirmar exclusão</button>
          <button type="button" onClick={()=>setConfirm(undefined)}>Cancelar</button></div>}
      </article>)}</div>
      {!prep.exams.length&&<p>Nenhum edital cadastrado. Você pode manter dois ou mais ativos simultaneamente.</p>}
      <details><summary>Metas de questões e disponibilidade por data</summary>
        <form onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);void save({...prep,targetAccuracy:Number(fields.get('accuracy')),minimumSample:Number(fields.get('sample'))});}}>
          <label>Meta de acertos (%)<input name="accuracy" type="number" min="1" max="100" defaultValue={prep.targetAccuracy} required /></label>
          <label>Amostra mínima de questões<input name="sample" type="number" min="1" max="10000" defaultValue={prep.minimumSample} required /></label>
          <button disabled={busy}>Salvar metas</button>
        </form>
        <p>O tempo padrão vem de Ajustes. Use exceções para folgas, viagens ou dias com mais tempo; zero indica dia sem estudo. O dia da prova não entra na previsão.</p>
        <label>Data<input type="date" value={overrideDate} onChange={e=>setOverrideDate(e.target.value)} /></label>
        <label>Tempo disponível (min)<input type="number" min="0" max="1440" value={overrideMinutes} onChange={e=>setOverrideMinutes(e.target.value)} /></label>
        <button type="button" disabled={busy||!overrideDate||overrideMinutes===''} onClick={()=>void save({...prep,availability:{...prep.availability,[overrideDate]:Number(overrideMinutes)}})}>Salvar exceção</button>
        <ul>{Object.entries(prep.availability).sort().map(([day,n])=><li key={day}>{day.split('-').reverse().join('/')} · {n} min <button type="button" disabled={busy} onClick={()=>{const next={...prep.availability};delete next[day];void save({...prep,availability:next});}}>Usar padrão</button></li>)}</ul>
      </details>
    </>}
    {draft&&<form className="rt-exam-editor" onSubmit={e=>{e.preventDefault();const exams=prep.exams.some(x=>x.id===draft.id)?prep.exams.map(x=>x.id===draft.id?draft:x):[...prep.exams,draft];void save({...prep,exams}).then(ok=>{if(ok)setDraft(undefined);});}}>
      <fieldset disabled={busy}>
      <h3>{draft.name||'Novo edital'}</h3>
      <div className="rt-exam-grid">
        <label>Nome do concurso<input required maxLength={300} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
        <label>Banca<input maxLength={300} value={draft.board} onChange={e=>setDraft({...draft,board:e.target.value})}/></label>
        <label>Data da prova<input type="date" required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
        <label>Prioridade entre concursos (1–5)<input type="number" min="1" max="5" required value={draft.priority} onChange={e=>setDraft({...draft,priority:Number(e.target.value)})}/></label>
        <label>Penalização por erro (pontos)<input type="number" min="0" max="100" step="any" required value={draft.penalty} onChange={e=>setDraft({...draft,penalty:Number(e.target.value)})}/></label>
      </div>
      <p>A penalização e as regras abaixo são registradas para consulta. Os exercícios acumulados não distinguem banca ou questões em branco; o plugin não calcula nota líquida ou chance de aprovação.</p>
      <label>Regras, mínimos gerais e critérios eliminatórios<textarea maxLength={5000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
      <details><summary>Blocos com mínimo obrigatório ({draft.blocks.length})</summary>
        {draft.blocks.map(block=><div className="rt-exam-grid" key={block.id}>
          <label>Nome do bloco<input required value={block.name} onChange={e=>setDraft({...draft,blocks:draft.blocks.map(b=>b.id===block.id?{...b,name:e.target.value}:b)})}/></label>
          <label>Mínimo do bloco (%)<input required type="number" min="0" max="100" step="any" value={block.minimumPercent} onChange={e=>setDraft({...draft,blocks:draft.blocks.map(b=>b.id===block.id?{...b,minimumPercent:Number(e.target.value)}:b)})}/></label>
          <button type="button" onClick={()=>setDraft({...draft,blocks:draft.blocks.filter(b=>b.id!==block.id),subjects:draft.subjects.map(s=>s.block===block.id?{...s,block:''}:s)})}>Remover bloco</button>
        </div>)}
        <button type="button" onClick={()=>setDraft({...draft,blocks:[...draft.blocks,{id:uid(),name:'Novo bloco',minimumPercent:50}]})}>Adicionar bloco</button>
      </details>
      {draft.subjects.map(s=><details className="rt-card" key={s.id} open>
        <summary>{s.name} · {s.topics.length} assuntos</summary>
        <div className="rt-exam-grid">
          <label>Disciplina<input required maxLength={300} value={s.name} onChange={e=>updateSubject(s.id,{...s,name:e.target.value})}/></label>
          <label>Número de questões<input type="number" min="1" max="10000" required value={s.questions} onChange={e=>updateSubject(s.id,{...s,questions:Number(e.target.value)})}/></label>
          <label>Peso por questão<input type="number" min="0.001" max="1000" step="any" required value={s.weight} onChange={e=>updateSubject(s.id,{...s,weight:Number(e.target.value)})}/></label>
          <label>Mínimo da disciplina (%) · opcional<input type="number" min="0" max="100" step="any" value={s.minimumPercent??''} onChange={e=>updateSubject(s.id,{...s,minimumPercent:e.target.value===''?null:Number(e.target.value)})}/></label>
          <label>Bloco eliminatório<select value={s.block} onChange={e=>updateSubject(s.id,{...s,block:e.target.value})}><option value="">Sem bloco</option>{draft.blocks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        </div>
        <p>Incidência cadastrada: {percent(s.topics.reduce((n,t)=>n+(t.incidence??0),0))}. Cada assunto deve representar uma parcela distinta do levantamento.</p>
        {s.topics.map(t=><details className="rt-card" key={t.id}>
          <summary>{t.name} · {t.incidence===null?'Incidência desconhecida':percent(t.incidence)} · {t.lessonIds.length} aulas</summary>
          <label>Assunto do edital<input required maxLength={300} value={t.name} onChange={e=>updateSubject(s.id,{...s,topics:s.topics.map(x=>x.id===t.id?{...x,name:e.target.value}:x)})}/></label>
          <div className="rt-exam-grid">
            <label>Incidência dentro da disciplina (%)<input type="number" min="0" max="100" step="any" value={t.incidence??''} onChange={e=>updateSubject(s.id,{...s,topics:s.topics.map(x=>x.id===t.id?{...x,incidence:e.target.value===''?null:Number(e.target.value)}:x)})}/></label>
            <label>Prioridade manual<select value={t.priority} onChange={e=>updateSubject(s.id,{...s,topics:s.topics.map(x=>x.id===t.id?{...x,priority:e.target.value as ExamTopic['priority']}:x)})}>
              <option value="essential">Essencial</option><option value="desirable">Desejável</option><option value="optional">Se houver tempo</option></select></label>
            <label>Estimativa de leitura restante (min) · se faltar cadastro<input type="number" min="1" max="100000" value={t.estimatedMinutes??''} onChange={e=>updateSubject(s.id,{...s,topics:s.topics.map(x=>x.id===t.id?{...x,estimatedMinutes:e.target.value===''?null:Number(e.target.value)}:x)})}/></label>
          </div>
          <label>Fonte do levantamento / banca / período<input maxLength={1000} value={t.source} onChange={e=>updateSubject(s.id,{...s,topics:s.topics.map(x=>x.id===t.id?{...x,source:e.target.value}:x)})}/></label>
          <LessonLinks plugin={plugin} busy={busy} ids={t.lessonIds} onChange={ids=>updateSubject(s.id,{...s,topics:s.topics.map(x=>x.id===t.id?{...x,lessonIds:ids}:x)})}/>
          <button type="button" onClick={()=>updateSubject(s.id,{...s,topics:s.topics.filter(x=>x.id!==t.id)})}>Remover assunto deste edital</button>
        </details>)}
        <div className="rt-actions"><button type="button" onClick={()=>updateSubject(s.id,{...s,topics:[...s.topics,topic()]})}>Adicionar assunto</button>
          <button type="button" onClick={()=>setDraft({...draft,subjects:draft.subjects.filter(x=>x.id!==s.id)})}>Remover disciplina deste edital</button></div>
      </details>)}
      <div className="rt-actions"><button type="button" onClick={()=>setDraft({...draft,subjects:[...draft.subjects,subject()]})}>Adicionar disciplina</button>
        <button disabled={busy}>Salvar edital</button><button type="button" disabled={busy} onClick={()=>{setDraft(undefined);setError('');}}>Descartar edição</button></div>
      <p>Salvar altera apenas o cadastro do plugin. Nenhum documento, tag ou flashcard será modificado.</p>
      </fieldset>
    </form>}
  </section>;
}

export function ExamDashboard({plugin,data,busy,onSelect,onOpen,onManage,onSave,reviewTag,onResultsSaved}:{plugin:RNPlugin;data:Backup;busy:boolean;
  onSelect:(id:string)=>void;onOpen:(id:string)=>void;onManage:()=>void;onSave:(prep:Preparation)=>Promise<void>;reviewTag?:ReviewTagFilter;onResultsSaved:(data:Backup)=>void}) {
  const prep=data.preparation??emptyPreparation();
  const [titles,setTitles]=useState<Map<string,{title:string;subject:string;subjectId:string}>>();const [error,setError]=useState('');
  const [loadedIds,setLoadedIds]=useState<string>();
  const [today,setToday]=useState(studyDay);
  const [reservedReview,setReservedReview]=useState<Record<string,number>>({});
  useEffect(()=>{const timer=setInterval(()=>setToday(studyDay()),30000);return()=>clearInterval(timer);},[]);
  const allIds=[...new Set(activeExams(prep,today).flatMap(e=>e.subjects.flatMap(s=>s.topics.flatMap(t=>t.lessonIds))))].sort().join(',');
  useEffect(()=>{let active=true;setTitles(undefined);setError('');void (async()=>{
    const rems=allIds?await plugin.rem.findMany(allIds.split(',')):[];
    if(!rems)throw new Error('Não foi possível consultar as aulas vinculadas.');
    const parents=[...new Set(rems.flatMap(r=>r.parent?[r.parent]:[]))];const docs=parents.length?await plugin.rem.findMany(parents):[];
    const names=new Map(await Promise.all((docs??[]).map(async r=>[r._id,await documentTitle(plugin,r)] as const)));
    const pairs=await Promise.all(rems.map(async r=>[r._id,{title:await documentTitle(plugin,r),subject:names.get(r.parent??'')??'Sem disciplina',subjectId:r.parent??''}] as const));
    if(active){setTitles(new Map(pairs));setLoadedIds(allIds);}
  })().catch(e=>{if(active)setError(e instanceof Error?e.message:'Falha ao carregar.');});return()=>{active=false;};},[plugin,allIds]);
  const projection=useMemo(()=>titles ? projectExamPlan(data,prep,new Map([...titles].map(([id,row])=>[id,row.subjectId])),today):undefined,[data,titles,today]);
  if(error)return <section className="rt-card"><p role="alert">{error}</p></section>;
  if(!titles||loadedIds!==allIds)return <p>Carregando preparação pós-edital…</p>;
  const subjects=new Map([...titles].map(([id,row])=>[id,row.subjectId]));
  const plan=buildExamPlan(data,prep,subjects,today,reservedReview);
  const reviewIds=examLessonIds(prep,today);const reviewTitles=new Map([...titles].filter(([id])=>reviewIds.has(id)));
  const showActivity=(row:typeof plan.selected[number],selected:boolean)=><article className="rt-row rt-exam-summary" key={row.id}>
    <h3>{row.lessonId?titles.get(row.lessonId)?.title??row.title:row.title}</h3>
    <span className="rt-benefit-badge">{row.kind==='reading'?'Avançar na leitura':row.kind==='questions'?'Resolver questões':'Lacuna de material'}{selected?' · '+Math.round(row.minutes)+' min':''}</span>
    <p>Atende: {row.exams.join(' · ')}</p><p>{row.reasons.join(' · ')}</p>
    {row.remaining!==null&&row.kind==='reading'&&<p>Leitura restante: ~{Math.ceil(row.remaining)} min</p>}
    <div className="rt-actions">{row.lessonId&&<><button type="button" disabled={busy} onClick={()=>onSelect(row.lessonId!)}>Registrar estudo</button><button type="button" disabled={busy} onClick={()=>onOpen(row.lessonId!)}>Abrir aula</button></>}
      {!row.lessonId&&<button type="button" onClick={onManage}>Vincular material</button>}</div>
  </article>;
  return <section className="rt-card" aria-label="Preparação pós-edital">
    <h2>Seu plano pós-edital</h2>
    <p>{plan.exams.length} editais ativos com prova futura. Uma atividade compartilhada conta uma única vez no orçamento e atualiza todos os editais vinculados.</p>
    <button type="button" onClick={onManage}>Gerenciar editais e disponibilidade</button>
    {!plan.exams.length&&<p>Cadastre e ative um edital com data futura para gerar o plano. No dia da prova e depois dela, o concurso sai das sugestões.</p>}
    <label className="rt-pareto-toggle"><input type="checkbox" checked={prep.coreOnly} disabled={busy} onChange={e=>void onSave({...prep,coreOnly:e.target.checked}).catch(()=>undefined)}/> Focar no núcleo de 80%, essenciais e disciplinas com mínimos</label>
    <p>Os pesos vêm dos editais; a incidência vem do levantamento cadastrado. Sem incidência, a prioridade é provisória. Mínimos são alertas de preparação, não comprovação de nota.</p>
    <div className="rt-exam-grid"><div className="rt-row"><strong>Saldo de hoje</strong><p>{hours(plan.budget.remainingSeconds/60)}</p></div>
      <div className="rt-row"><strong>Revisão disponível</strong><p>{plan.budget.review} min</p></div><div className="rt-row"><strong>Avanço e questões</strong><p>{plan.budget.study} min · {Math.round(plan.used)} min distribuídos</p></div></div>
    {!!plan.warnings.length&&<details><summary>Avisos de cadastro ({plan.warnings.length})</summary><ul>{plan.warnings.map(w=><li key={w}>{w}</li>)}</ul></details>}
    <FlashcardPlan data={{...data,dailyMinutes:prep.availability[today]??data.dailyMinutes}} titles={reviewTitles} busy={busy} onOpen={onOpen} paretoOnly={false} tag={reviewTag} priorities={examReviewPriorities(prep,today)} onResultsSaved={onResultsSaved} onPlanChange={setReservedReview}/>
    <h3>O que estudar agora?</h3><p>Mínimos em risco de preparação vêm primeiro; depois, relevância por minuto, prioridade do concurso e proximidade da prova. Até 60 min por disciplina em cada plano.</p>
    <p>Máximo de {data.subjectDailyMinutes??120} min por disciplina no dia, somando registros e revisão sugerida. A alternância prioriza outras matérias após o último estudo.</p>
    <div className="rt-exam-grid">{plan.selected.map(row=>showActivity(row,true))}</div>
    {!plan.selected.length&&<p>Nenhuma atividade selecionada: confira o saldo, os vínculos e os avisos de cadastro.</p>}
    <details><summary>Fora do plano de hoje e lacunas ({plan.excluded.length})</summary><p>Atividades sem material, fora do saldo diário ou acima do limite por disciplina. Serão reconsideradas após novos registros.</p><div className="rt-exam-grid">{plan.excluded.map(row=>showActivity(row,false))}</div></details>
    {!!plan.outsideCore.length&&<details><summary>Assuntos fora do foco selecionado ({plan.outsideCore.length})</summary><ul>{plan.outsideCore.map((row,i)=><li key={i}>{row.exam} · {row.title}: {row.reason}</li>)}</ul></details>}
    {allIds.split(',').filter(id=>id&&!titles.has(id)).map(id=><p role="alert" key={id}>Aula vinculada indisponível nesta base: {id}. Confira o vínculo em Concursos.</p>)}
    {projection?.truncated&&<p role="alert">A projeção detalhada está limitada aos próximos 730 dias.</p>}
    <h3>Cobertura e viabilidade até cada prova</h3>
    {plan.exams.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(exam=>{
      const metrics=examMetrics(data,exam,subjects);const capacity=futureCapacity(data,prep,exam.date,today);
      const cumulative=buildExamPlan(data,{...prep,exams:prep.exams.filter(e=>e.date<=exam.date)},subjects,today);
      const full=cumulative.full;const priority=cumulative.priority;
      const projected=projection?.milestones[exam.id];
      return <details className="rt-card" key={exam.id} open><summary>{exam.name} · {daysUntil(exam.date,today)} dias · {percent(metrics.covered)} de cobertura ponderada</summary>
        <progress max={100} value={Math.min(100,metrics.covered)}/>
        <p>{metrics.maxPoints} pontos máximos cadastrados · incidência conhecida equivalente a {percent(metrics.mapped)} do peso da prova. Cobertura mede leitura, não domínio ou probabilidade de aprovação.</p>
        <p>{capacity.days} dias até a prova · {capacity.truncated?'capacidade dos primeiros 730 dias: ':''}{hours(capacity.total)} disponíveis: {hours(capacity.review)} reservadas à revisão e {hours(capacity.advance)} ao avanço/questões.</p>
        <div className="rt-exam-grid"><article className="rt-row"><strong>Cobertura completa</strong><p>Leitura restante conhecida: {hours(full.minutes+full.gapMinutes)}. Primeira rodada de questões: {hours(full.questionMinutes)}.</p><p>{full.missing+full.unknown} itens sem estimativa. {full.minutes+full.gapMinutes+full.questionMinutes>capacity.advance?'O trabalho conhecido já excede a reserva disponível.':'O trabalho conhecido cabe na reserva; confira lacunas e a projeção diária.'}</p></article>
          <article className="rt-row"><strong>Cobertura prioritária</strong><p>Núcleo de 80%, essenciais e mínimos: {hours(priority.minutes+priority.gapMinutes)} de leitura e {hours(priority.questionMinutes)} para uma rodada de questões · {priority.missing+priority.unknown} itens sem estimativa.</p></article>
          <article className="rt-row"><strong>Plano possível</strong><p>{projected?'Cobertura de leitura projetada para este edital: '+percent(projected.coverage):'Sem projeção neste horizonte.'}</p><p>Simulação diária do foco selecionado, com blocos, limites por disciplina e reserva de revisão. Não grava progresso futuro.</p><p>Hoje: {Math.round(plan.used)} min de avanço/questões e até {plan.budget.review} min de revisão.</p></article></div>
        <p>Os cenários completo e prioritário incluem os editais com prova até esta data; a projeção diária divide o tempo entre todos os ativos. Aulas compartilhadas contam uma vez no esforço. Os blocos de questões são uma rodada inicial de 20 min por aula com necessidade, sem garantir domínio ou nota mínima. As lacunas sem ritmo/material podem impedir a cobertura real.</p>
        {!!projected?.pending.length&&<details><summary>Trabalho conhecido que não cabe antes desta prova ({projected.pending.length} aulas)</summary><ul>{projected.pending.map(row=><li key={row.id}>{titles.get(row.id)?.title??row.title} · ~{Math.ceil(row.minutes)} min pendentes. Limites de tempo, disciplina e prioridades impediram a alocação.</li>)}</ul></details>}
        {exam.notes&&<details><summary>Regras e critérios registrados</summary><p style={{whiteSpace:'pre-wrap'}}>{exam.notes}</p><p>Penalização por erro: {exam.penalty} pontos (referência).</p></details>}
        {metrics.subjects.map(row=><details className="rt-card" key={row.subject.id}>
          <summary>{row.subject.name} · {row.subject.questions} questões × peso {row.subject.weight} · leitura {percent(row.coverage)}</summary>
          <p>Mínimo da disciplina: {row.subject.minimumPercent===null?'não informado':percent(row.subject.minimumPercent)}{row.subject.block?' · bloco '+exam.blocks.find(b=>b.id===row.subject.block)?.name+' · mínimo '+percent(exam.blocks.find(b=>b.id===row.subject.block)!.minimumPercent):''}</p>
          <p>Questões acumuladas: {row.questions} · {row.accuracy===null?'sem resultado':percent(row.accuracy)+' de acerto'}{row.questions<prep.minimumSample?' · amostra pequena':''}. Resultados são compartilhados entre concursos e não equivalem à nota da banca.</p>
          <p>Incidência cadastrada: {percent(row.incidence)}{row.issues?' · total inconsistente':''} · cobertura do núcleo: {row.coreCoverage===null?'indisponível':percent(row.coreCoverage)}</p>
          <ul>{row.topics.map(t=><li key={t.topic.id}><strong>{t.topic.name}</strong> · {t.core?'núcleo 80% · ':''}{t.topic.incidence===null?'incidência desconhecida':percent(t.topic.incidence)} · leitura {percent(t.coverage)} · {t.questions} questões{t.missing?' · material/progresso incompleto':''}
            {t.topic.source&&<span> · Fonte: {t.topic.source}</span>}
            <p>{studySteps.map(step=>step.label+': '+(t.steps.includes(step.id)?'OK':'pendente')).join(' · ')}</p>
            {t.topic.lessonIds.map(id=><button type="button" className="rt-inline" key={id} disabled={busy} onClick={()=>onSelect(id)}>{titles.get(id)?.title??id}</button>)}</li>)}</ul>
        </details>)}
      </details>;
    })}
  </section>;
}
