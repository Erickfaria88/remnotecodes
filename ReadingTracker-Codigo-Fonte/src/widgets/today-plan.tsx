import {renderWidget,usePlugin} from '@remnote/plugin-sdk';
import {useCallback,useEffect,useState} from 'react';
import {createRepository,type Backup} from '../remnote/storage';
import {documentTitle} from '../remnote/documents';
import {dailyKeys,openDailyDashboard} from '../remnote/daily-plan';
import {filterStudySubjects,type PhaseSelection,type ReviewTagFilter} from '../study-scope';
import {examLessonIds,examReviewPriorities} from '../exam-preparation';
import {remainingDailyTime,formatDuration} from '../study-sessions';
import {dailyActivities} from '../daily-plan';
import {FlashcardPlan} from '../components/FlashcardPlan';
import {DailyPlanSettings} from '../components/DailyPlanSettings';
import {openedLessonKey} from '../study-timer';
import {studyDay} from '../resume';
import './reading-tracker.css';
import './today-plan.css';
const css=new URL(import.meta.url);css.search='';css.pathname=css.pathname.replace(/\.js$/,'.css');const link=document.createElement('link');link.rel='stylesheet';link.href=css.href;document.head.append(link);
type Name={title:string;subject:string;subjectId:string};
function TodayPlan(){
 const plugin=usePlugin();const [data,setData]=useState<Backup>();const [titles,setTitles]=useState<Map<string,Name>>();
 const [scope,setScope]=useState<{phase:PhaseSelection;pareto:boolean;tag?:ReviewTagFilter}>({phase:'auto',pareto:false});
 const [reserved,setReserved]=useState<Record<string,number>>({});const [ready,setReady]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const onReviewPlan=useCallback((value:Record<string,number>)=>{setReserved(value);setReady(true);},[]);
 useEffect(()=>{window.dispatchEvent(new Event('reading-tracker-ready'));let live=true;
 async function load(){const base=await plugin.kb.getCurrentKnowledgeBaseData();const d=await createRepository(plugin.storage,base._id).load();
 const saved=await plugin.storage.getLocal<typeof scope>(dailyKeys(base._id).scope);
 const ids=[...new Set([...Object.keys(d.lessons),...Object.keys(d.exercises),...Object.values(d.sessions??{}).map(r=>r.lessonId),...Object.values(d.reviews).map(r=>r.lessonId)])];
 const rems=(ids.length?await plugin.rem.findMany(ids):[])??[];const names=new Map<string,string>();
 for(const rem of (await plugin.rem.findMany([...new Set(rems.flatMap(r=>r.parent?[r.parent]:[]))]))??[])if(await rem.isDocument())names.set(rem._id,await documentTitle(plugin,rem));
 const result=new Map<string,Name>();for(const rem of rems){if(rem.parent&&names.has(rem.parent)&&await rem.isDocument())result.set(rem._id,{title:await documentTitle(plugin,rem),subject:names.get(rem.parent)!,subjectId:rem.parent});}
 if(live){if(saved)setScope(saved);setData(d);setTitles(result);}}
 void load().catch(e=>{if(live)setError(String(e));});return()=>{live=false;};},[plugin]);
 async function action(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn();}catch(e){setError(String(e));}finally{setBusy(false);}}
 async function open(id:string){if(!data)return;if((await plugin.kb.getCurrentKnowledgeBaseData())._id!==data.baseId)throw new Error('A base mudou. Reabra o plano.');const rem=await plugin.rem.findOne(id);if(!rem)throw new Error('Aula indisponível.');await plugin.storage.setSession(openedLessonKey(data.baseId,id),true);await plugin.window.openRem(rem);await plugin.widget.closePopup();}
 const post=data?.preparation?.mode==='post';
 const all=new Map([...(titles??[])].map(([id,n])=>[id,n.subjectId]));
 const eligible=data?(post?new Map([...all].filter(([id])=>examLessonIds(data.preparation!).has(id))):filterStudySubjects(data,all,scope.phase,scope.pareto)):all;
 const scoped=new Map([...(titles??[])].filter(([id])=>eligible.has(id)));
 const today=studyDay();const effective=data&&post?{...data,dailyMinutes:data.preparation!.availability[today]??data.dailyMinutes}:data;
 const time=effective&&remainingDailyTime(effective,today);
 const activities=data&&ready?dailyActivities(data,eligible,reserved,today).slice(0,3):[];
 return <main className="reading-tracker-panel rt-today" aria-label="Plano de hoje"><header className="rt-today-header"><div><small>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(new Date())}</small><h1>Seu plano de hoje</h1></div><button aria-label="Fechar Plano de hoje" onClick={()=>void action(()=>plugin.widget.closePopup())}>✕</button></header>
 {error&&<p role="alert">{error}</p>}
 {!data||!titles?<p role="status">Consultando suas aulas e o saldo do dia…</p>:<>
 <p>{post?'Preparação pós-edital · concursos ativos':'Preparação normal · últimos filtros de fases e incidência'}</p>
 <section className="rt-today-budget"><strong>{formatDuration(time!.remainingSeconds)} disponíveis hoje</strong><span>{time!.review} min para revisão · {time!.study} min para avanço e questões</span></section>
 <FlashcardPlan compact data={effective!} titles={scoped} busy={busy} onOpen={id=>void action(()=>open(id))} paretoOnly={!post&&scope.pareto} tag={scope.tag} priorities={post?examReviewPriorities(data.preparation!):undefined} onResultsSaved={setData} onPlanChange={onReviewPlan}/>
 <section><h2>Avançar e concluir</h2>{!ready?<p>Calculando sugestões com a reserva de revisão…</p>:!activities.length?<p>Nenhuma atividade disponível para os filtros e o saldo de hoje. Consulte o dashboard para ajustar seu plano.</p>:activities.map(row=><article className="rt-today-task" key={row.id}><div><strong>{row.finish?'Concluir a leitura':row.practice?'Praticar questões':'Avançar na leitura'} · {scoped.get(row.id)?.title}</strong><p>{scoped.get(row.id)?.subject} · {row.minutes} min{row.finish&&data.lessons[row.id]?` · faltam ${Math.max(0,data.lessons[row.id].totalPages-data.lessons[row.id].readPages)} páginas`:''}</p></div><button disabled={busy} onClick={()=>void action(()=>open(row.id))}>Abrir aula</button></article>)}</section>
 <p>Estas atividades fazem parte do mesmo orçamento diário. O limite por disciplina soma revisão e avanço. Veja o plano completo no dashboard.</p>
 <details><summary>Preferências de abertura</summary><DailyPlanSettings baseId={data.baseId} showOpen={false}/></details>
 </>}
 <footer className="rt-today-footer"><button disabled={busy} onClick={()=>void action(()=>openDailyDashboard(plugin,'resume'))}>Ver dashboard</button><button disabled={busy} onClick={()=>void action(()=>openDailyDashboard(plugin,'agenda'))}>Revisões e aulas</button><button onClick={()=>void action(()=>plugin.widget.closePopup())}>Agora não</button></footer></main>;
}
renderWidget(TodayPlan);



