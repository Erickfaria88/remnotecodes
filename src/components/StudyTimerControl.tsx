import {usePlugin,useTrackerPlugin} from '@remnote/plugin-sdk';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createTimerRepository,timerMilliseconds,type StudyTimer} from '../study-timer';
import {createRepository} from '../remnote/storage';
import {openLessonDashboard} from '../remnote/lesson-dashboard';
import {formatDuration,sessionCategories,type SessionInput} from '../study-sessions';
const button={padding:'5px 10px',border:'1px solid #b9c8e3',borderRadius:7,background:'#fff',color:'#2651ba',cursor:'pointer',font:'inherit'};
export function StudyTimerControl({baseId,lessonId,title}:{baseId:string;lessonId?:string;title?:string}) {
  const plugin=usePlugin();const repo=useMemo(()=>createTimerRepository(plugin.storage,baseId),[plugin,baseId]);
  const [revision,setRevision]=useState(0);const [now,setNow]=useState(Date.now());const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);const locked=useRef(false);const [discarding,setDiscarding]=useState(false);
  const [category,setCategory]=useState<SessionInput['category']>('theory');
  const state=useTrackerPlugin(async reactive=>{
    try{
      const timer=await createTimerRepository(reactive.storage,baseId).load();
      const saved=timer?!!(await createRepository(reactive.storage,baseId).load()).sessions?.[timer.id]:false;
      return {timer,saved,error:''};
    }catch(e){return {timer:undefined,saved:false,error:e instanceof Error?e.message:'Não foi possível ler o cronômetro.'};}
  },[baseId,revision]);
  useEffect(()=>{
    setNow(Date.now());if(state?.timer?.status!=='running')return;
    const interval=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(interval);
  },[state?.timer?.id,state?.timer?.status]);
  useEffect(()=>{const refresh=()=>setRevision(r=>r+1);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
  async function run(action:()=>Promise<unknown>){
    if(locked.current)return;locked.current=true;setBusy(true);setError('');
    try{if((await plugin.kb.getCurrentKnowledgeBaseData())._id!==baseId)throw new Error('A base ativa mudou. Reabra o painel.');await action();}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar o cronômetro.');}
    finally{locked.current=false;setBusy(false);setNow(Date.now());setRevision(r=>r+1);}
  }
  async function register(timer:StudyTimer){await openLessonDashboard(plugin,timer.lessonId,timer.id);}
  const timer=state?.timer;
  if(!state||!timer&&!lessonId&&!state.error)return null;
  return <section aria-label="Cronômetro de estudo" style={{marginTop:8,padding:10,border:'1px solid #b9c8e3',borderRadius:8,font:'13px/1.4 system-ui,sans-serif'}}>
    {timer?<>
      <strong>{timer.title}</strong>
      <span> · {sessionCategories.find(c=>c.id===timer.category)?.label}</span>
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,marginTop:6}}>
        <strong role="timer" aria-label="Tempo do estudo" style={{fontVariantNumeric:'tabular-nums',fontSize:18}}>{formatDuration(Math.floor(timerMilliseconds(timer,now)/1000))}</strong>
        <span>{state.saved?'Já registrado':timer.status==='running'?'Estudando':timer.status==='paused'?'Pausado':'Concluído · registro pendente'}</span>
        {!state.saved&&timer.status!=='finished'&&<>
          <button type="button" style={button} disabled={busy} onClick={()=>void run(()=>timer.status==='running'?repo.pause(timer.id):repo.resume(timer.id))}>{timer.status==='running'?'Pausar':'Retomar'}</button>
          <button type="button" style={button} disabled={busy} onClick={()=>void run(async()=>{const done=await repo.finish(timer.id);if(done)await register(done);})}>Concluir e registrar</button>
        </>}
        {!state.saved&&timer.status==='finished'&&<button type="button" style={button} disabled={busy} onClick={()=>void run(()=>register(timer))}>Registrar estudo cronometrado ↗</button>}
        {state.saved&&<button type="button" style={button} disabled={busy} onClick={()=>void run(()=>repo.clear(timer.id))}>Limpar cronômetro já registrado</button>}
        {timer.lessonId!==lessonId&&<button type="button" style={button} disabled={busy} onClick={()=>void run(async()=>{const rem=await plugin.rem.findOne(timer.lessonId);if(!rem)throw new Error('A aula não está disponível.');await plugin.window.openRem(rem);})}>Ir à aula</button>}
        {!state.saved&&<button type="button" style={button} disabled={busy} onClick={()=>setDiscarding(v=>!v)}>Descartar cronômetro</button>}
      </div>
      <small>O tempo só entra no planejamento após Salvar estudo. Pause antes de uma interrupção.</small>
      {discarding&&!state.saved&&<div><p>Descartar apenas este tempo ainda não registrado? Páginas e exercícios salvos serão preservados.</p><button style={button} type="button" disabled={busy} onClick={()=>void run(async()=>{await repo.clear(timer.id);setDiscarding(false);})}>Confirmar descarte</button><button type="button" style={button} onClick={()=>setDiscarding(false)}>Cancelar</button></div>}
    </>:lessonId&&title?<div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      <label>Atividade <select aria-label="Categoria do cronômetro" value={category} disabled={busy} onChange={e=>setCategory(e.target.value as SessionInput['category'])}>{sessionCategories.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <button type="button" style={button} disabled={busy||!!state.error} onClick={()=>void run(()=>repo.start(lessonId,title,category))}>▶ Iniciar estudo</button>
    </div>:null}
    {(error||state.error)&&<p role="alert" style={{color:'#9a312b'}}>{error||state.error}</p>}
  </section>;
}
