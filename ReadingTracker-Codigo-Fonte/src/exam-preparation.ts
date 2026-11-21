import type { Backup } from './remnote/storage';
import { validStudyDay, studyDay } from './resume';
import { remainingDailyTime } from './study-sessions';
import { studySteps } from './study-steps';

export interface ExamTopic {
  id: string; name: string; lessonIds: string[]; incidence: number | null;
  source: string; priority: 'essential' | 'desirable' | 'optional';
  estimatedMinutes: number | null;
}
export interface ExamSubject {
  id: string; name: string; questions: number; weight: number;
  minimumPercent: number | null; block: string; topics: ExamTopic[];
}
export interface Exam {
  id: string; name: string; board: string; date: string; active: boolean;
  priority: number; penalty: number; notes: string;
  blocks: { id: string; name: string; minimumPercent: number }[];
  subjects: ExamSubject[];
}
export interface Preparation {
  mode: 'normal' | 'post'; exams: Exam[]; coreOnly: boolean;
  targetAccuracy: number; minimumSample: number;
  availability: Record<string, number>;
}
export const emptyPreparation = (): Preparation => ({ mode: 'normal', exams: [], coreOnly: false,
  targetAccuracy: 80, minimumSample: 20, availability: {} });
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const number = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const text = (x: unknown, max = 300): x is string => typeof x === 'string' && x.length <= max;
const id = (x: unknown): x is string => typeof x === 'string' && /^[\w-]{1,150}$/.test(x) && !['__proto__', 'prototype', 'constructor'].includes(x);
const unique = (rows: { id: string }[]) => new Set(rows.map(row => row.id)).size === rows.length;
export function parsePreparation(raw: unknown): Preparation {
  if (raw === undefined) return emptyPreparation();
  if (!object(raw) || !['normal', 'post'].includes(raw.mode as string) || !Array.isArray(raw.exams) || raw.exams.length > 30 ||
      typeof raw.coreOnly !== 'boolean' || !number(raw.targetAccuracy, 1, 100) || !Number.isSafeInteger(raw.minimumSample) || !number(raw.minimumSample, 1, 10000) || !object(raw.availability)) throw new Error('Configuração de concursos inválida.');
  for (const [day, minutes] of Object.entries(raw.availability)) if (!validStudyDay(day) || !number(minutes, 0, 1440) || !Number.isInteger(minutes)) throw new Error('Disponibilidade inválida.');
  for (const exam of raw.exams) {
    if (!object(exam) || !id(exam.id) || !text(exam.name) || !exam.name.trim() || !text(exam.board) || !validStudyDay(exam.date as string) ||
        typeof exam.active !== 'boolean' || !number(exam.priority, 1, 5) || !number(exam.penalty, 0, 100) || !text(exam.notes, 5000) ||
        !Array.isArray(exam.subjects) || !Array.isArray(exam.blocks)) throw new Error('Edital inválido.');
    for (const block of exam.blocks) if (!object(block) || !id(block.id) || !text(block.name) || !block.name.trim() || !number(block.minimumPercent, 0, 100)) throw new Error('Bloco eliminatório inválido.');
    if (!unique(exam.blocks)) throw new Error('Blocos repetidos.');
    for (const subject of exam.subjects) {
      if (!object(subject) || !id(subject.id) || !text(subject.name) || !subject.name.trim() || !Number.isSafeInteger(subject.questions) || !number(subject.questions, 1, 10000) ||
          !number(subject.weight, 0.001, 1000) || !(subject.minimumPercent === null || number(subject.minimumPercent, 0, 100)) ||
          !text(subject.block) || subject.block && !exam.blocks.some(b => b.id === subject.block) || !Array.isArray(subject.topics)) throw new Error('Disciplina do edital inválida.');
      for (const topic of subject.topics) {
        if (!object(topic) || !id(topic.id) || !text(topic.name) || !topic.name.trim() || !Array.isArray(topic.lessonIds) || !topic.lessonIds.every(id) ||
            new Set(topic.lessonIds).size !== topic.lessonIds.length || !(topic.incidence === null || number(topic.incidence, 0, 100)) ||
            !text(topic.source, 1000) || !['essential', 'desirable', 'optional'].includes(topic.priority as string) ||
            !(topic.estimatedMinutes === null || number(topic.estimatedMinutes, 1, 100000))) throw new Error('Assunto do edital inválido.');
      }
      if (!unique(subject.topics)) throw new Error('Assuntos repetidos.');
    }
    if (!unique(exam.subjects)) throw new Error('Disciplinas repetidas.');
  }
  if (!unique(raw.exams)) throw new Error('Editais repetidos.');
  return JSON.parse(JSON.stringify(raw)) as Preparation;
}
export function daysUntil(date: string, today = studyDay()) {
  return Math.max(0, Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000));
}
export function activeExams(prep: Preparation, today = studyDay()) { return prep.exams.filter(e => e.active && e.date > today); }
export function topicCore(subject: ExamSubject) {
  const rows = [...subject.topics].filter(t => t.incidence !== null && t.incidence > 0).sort((a,b) => b.incidence! - a.incidence! || a.id.localeCompare(b.id));
  const ids = new Set<string>(); let sum = 0;
  for (const row of rows) { if (sum >= 80) break; ids.add(row.id); sum += row.incidence!; }
  return ids;
}
export function examLessonIds(prep: Preparation, today = studyDay()) {
  return new Set(activeExams(prep, today).flatMap(e => e.subjects.flatMap(s => {
    const core = topicCore(s);
    return s.topics.filter(t => !prep.coreOnly || core.has(t.id) || t.priority === 'essential' || (s.minimumPercent ?? 0) > 0 || !!s.block)
      .flatMap(t => t.lessonIds);
  })));
}
export function examReviewPriorities(prep: Preparation, today = studyDay()) {
  const scores:Record<string,number> = Object.create(null);
  for(const exam of activeExams(prep,today)) {
    const points=exam.subjects.reduce((sum,s)=>sum+s.questions*s.weight,0)||1;
    for(const subject of exam.subjects) {
      const total=subject.topics.reduce((sum,t)=>sum+(t.incidence??0),0);
      for(const topic of subject.topics) {
        const weight=subject.questions*subject.weight/points * (total>100.5?1:topic.incidence??1) * exam.priority *
          (1+30/Math.max(1,daysUntil(exam.date,today))) * (topic.priority==='essential'?1.6:topic.priority==='optional'?0.6:1);
        for(const id of topic.lessonIds) scores[id]=(scores[id]??0)+weight/Math.max(1,topic.lessonIds.length);
      }
    }
  }
  return scores;
}
export function lessonMinutes(data: Backup, lessonId: string, subjectIds: Map<string,string>) {
  const row = data.lessons[lessonId];
  if (!row) return null;
  if (row.readPages === row.totalPages) return 0;
  const pace = data.subjectPaces[subjectIds.get(lessonId) ?? ''] ?? data.globalPace;
  return pace ? (row.totalPages - row.readPages) / pace * 60 : null;
}
export function topicMetrics(data: Backup, topic: ExamTopic, subjectIds: Map<string,string>) {
  const records = topic.lessonIds.map(id => data.lessons[id]);
  const total = records.reduce((s,r) => s + (r?.totalPages ?? 0),0);
  const read = records.reduce((s,r) => s + (r?.readPages ?? 0),0);
  const missing = !records.length || records.some(r => !r);
  const times = topic.lessonIds.map(id => lessonMinutes(data,id,subjectIds));
  const minutes = !missing && times.every(t => t !== null) ? times.reduce<number>((s,t) => s + t!,0) : topic.estimatedMinutes;
  const correct = topic.lessonIds.reduce((s,id) => s + (data.exercises[id]?.correct ?? 0),0);
  const incorrect = topic.lessonIds.reduce((s,id) => s + (data.exercises[id]?.incorrect ?? 0),0);
  return { coverage: missing ? 0 : total ? read / total : 0, partialRead: read, total, missing, minutes,
    questions: correct+incorrect, accuracy: correct+incorrect ? correct/(correct+incorrect)*100 : null,
    steps: studySteps.filter(step => records.length > 0 && records.every(r => r?.completedSteps?.includes(step.id))).map(step=>step.id) };
}
export function examMetrics(data: Backup, exam: Exam, subjectIds: Map<string,string>) {
  const maxPoints = exam.subjects.reduce((s,row) => s + row.questions*row.weight,0);
  let covered = 0, mapped = 0;
  const subjects = exam.subjects.map(subject => {
    const core = topicCore(subject);
    const incidence = subject.topics.reduce((s,t) => s+(t.incidence??0),0);
    const issues = incidence > 100.5;
    let coverage = 0, coreCoverage = 0, coreWeight = 0;
    const topics = subject.topics.map(topic => {
      const metrics = topicMetrics(data,topic,subjectIds);
      if (!issues) {
        coverage += (topic.incidence??0)*metrics.coverage;
        if (core.has(topic.id)) { coreCoverage += (topic.incidence??0)*metrics.coverage; coreWeight += topic.incidence??0; }
      }
      return { topic, ...metrics, core: core.has(topic.id) };
    });
    const factor = maxPoints ? subject.questions*subject.weight/maxPoints : 0;
    coverage = Math.min(100,coverage);
    covered += factor*coverage; mapped += issues ? 0 : factor*Math.min(100,incidence);
    const ids = [...new Set(subject.topics.flatMap(t => t.lessonIds))];
    const correct = ids.reduce((s,id) => s+(data.exercises[id]?.correct??0),0);
    const questions = ids.reduce((s,id) => s+(data.exercises[id]?.correct??0)+(data.exercises[id]?.incorrect??0),0);
    return { subject, topics, incidence, issues, coverage, coreCoverage: coreWeight ? coreCoverage/coreWeight*100 : null,
      accuracy: questions ? correct/questions*100 : null, questions };
  });
  return { maxPoints, covered, mapped, subjects };
}

/** Projection only: never writes simulated progress or exercise results. */
export function projectExamPlan(data: Backup, prep: Preparation, subjectIds: Map<string,string>, today = studyDay()) {
  const exams=activeExams(prep,today);
  const initial=buildExamPlan(data,prep,subjectIds,today);
  const candidates=[...initial.selected,...initial.excluded];
  const tasks=candidates.filter(row=>row.lessonId && row.kind!=='gap' && row.remaining!==null).map(row=>{
    const id=row.lessonId!;const e=data.exercises[id];const sample=(e?.correct??0)+(e?.incorrect??0);
    return {row,reading:row.kind==='reading'?row.remaining!:0,
      questions:sample<prep.minimumSample || !sample || e!.correct/sample*100<prep.targetAccuracy?20:0};
  });
  const simulated:Backup={...data,lessons:JSON.parse(JSON.stringify(data.lessons))};
  const totals={reading:0,questions:0};
  const milestones:Record<string,{coverage:number;reading:number;questions:number;pending:{id:string;title:string;minutes:number}[]}>={};
  const end=exams.map(e=>e.date).sort().at(-1)??today;
  const horizon=Math.min(daysUntil(end,today),730);
  for(let dayIndex=0;dayIndex<=horizon;dayIndex++) {
    const date=new Date(today+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+dayIndex);const day=date.toISOString().slice(0,10);
    for(const exam of exams.filter(e=>e.date===day)) {
      const ids=new Set(exam.subjects.flatMap(s=>s.topics.flatMap(t=>t.lessonIds)));
      milestones[exam.id]={coverage:examMetrics(simulated,exam,subjectIds).covered,reading:totals.reading,questions:totals.questions,
        pending:tasks.filter(t=>ids.has(t.row.lessonId!) && t.reading+t.questions>0.001)
          .map(t=>({id:t.row.lessonId!,title:t.row.title,minutes:t.reading+t.questions}))};
    }
    if(dayIndex===horizon)break;
    let available=remainingDailyTime({...data,dailyMinutes:prep.availability[day]??data.dailyMinutes},day).study;
    const bySubject=new Map<string,number>();
    const live=tasks.filter(t=>exams.some(e=>e.date>day && e.subjects.some(s=>s.topics.some(topic=>topic.lessonIds.includes(t.row.lessonId!)))));
    live.sort((a,b)=>Number(b.row.protected)-Number(a.row.protected)||
      b.row.score*(1+30/Math.max(1,daysUntil(b.row.deadline,day)))-a.row.score*(1+30/Math.max(1,daysUntil(a.row.deadline,day)))||a.row.id.localeCompare(b.row.id));
    // Round-robin blocks retain diversity while allowing another pass for long readings.
    let progressed=true;
    while(available>0.001 && progressed) {
      progressed=false;
      for(const task of live) {
        const id=task.row.lessonId!;const subject=subjectIds.get(id)??id;
        const cap=Math.min(available,60-(bySubject.get(subject)??0));
        const isReading=task.reading>0.001;const remaining=isReading?task.reading:task.questions;
        const amount=Math.min(cap,isReading?30:20,remaining);
        if(amount<=0.001)continue;
        progressed=true;available-=amount;bySubject.set(subject,(bySubject.get(subject)??0)+amount);
        if(isReading){
          task.reading-=amount;totals.reading+=amount;
          const record=simulated.lessons[id];const original=data.lessons[id];
          record.readPages=original.readPages+(original.totalPages-original.readPages)*(1-task.reading/task.row.remaining!);
        }else{task.questions-=amount;totals.questions+=amount;}
      }
    }
  }
  return {milestones,truncated:daysUntil(end,today)>730};
}

export function futureCapacity(data: Backup, prep: Preparation, deadline: string, today = studyDay()) {
  const days = daysUntil(deadline,today);
  const reviewShare = (data.reviewShare??100/3)/100;
  let total=0, advance=0, review=0;
  for (let i=0; i<Math.min(days,730); i++) {
    const date = new Date(today+'T00:00:00Z'); date.setUTCDate(date.getUTCDate()+i);
    const day = date.toISOString().slice(0,10);
    const minutes = prep.availability[day] ?? data.dailyMinutes;
    const budget = remainingDailyTime({...data,dailyMinutes:minutes},day);
    // Only today has elapsed sessions; future dates are bounded by their configured availability.
    total += budget.remainingSeconds/60; advance += budget.study; review += budget.review;
  }
  return { days, total, advance, review, reviewShare, truncated: days>730 };
}

export interface ExamActivity { id:string; lessonId?:string; title:string; minutes:number; kind:'reading'|'questions'|'gap';
  score:number; reasons:string[]; exams:string[]; deadline:string; protected:boolean; remaining:number|null; }
export function buildExamPlan(data: Backup, prep: Preparation, subjectIds: Map<string,string>, today = studyDay()) {
  const exams = activeExams(prep,today);
  const candidates = new Map<string,ExamActivity>();
  const warnings:string[]=[];
  const outsideCore:{title:string;exam:string;reason:string}[]=[];
  const lessonSet = new Set<string>();
  const prioritySet = new Set<string>();
  let gapMinutes=0, unknown=0, priorityGapMinutes=0, priorityUnknown=0;
  for (const exam of exams) {
    const metrics=examMetrics(data,exam,subjectIds);
    for (const row of metrics.subjects) {
      const subject=row.subject;
      if (row.issues) warnings.push(exam.name+' / '+subject.name+': incidência acima de 100%; corrija antes de confiar no núcleo.');
      if (row.incidence<99.5 || subject.topics.some(t=>t.incidence===null)) warnings.push(exam.name+' / '+subject.name+': levantamento de incidência incompleto.');
      if (!subject.topics.length) { unknown++; warnings.push(exam.name+' / '+subject.name+': conteúdo programático ainda não cadastrado.'); }
      const protectedSubject=(subject.minimumPercent??0)>0 || !!subject.block;
      const minimum=Math.max(subject.minimumPercent ?? 0,exam.blocks.find(b=>b.id===subject.block)?.minimumPercent ?? 0);
      const risk=protectedSubject && (row.questions<prep.minimumSample || (row.accuracy??0)<minimum);
      for (const m of row.topics) {
        const topic=m.topic;
        const priority=m.core || topic.priority==='essential' || protectedSubject;
        topic.lessonIds.forEach(id=>{lessonSet.add(id); if(priority) prioritySet.add(id);});
        if (!topic.lessonIds.length) {
          if(m.minutes===null) { unknown++; if(priority)priorityUnknown++; }
          else { gapMinutes+=m.minutes; if(priority)priorityGapMinutes+=m.minutes; }
        }
        if (prep.coreOnly && !priority) { outsideCore.push({title:topic.name,exam:exam.name,reason:'Fora do núcleo, dos essenciais e dos mínimos selecionados'}); continue; }
        const relevance=subject.questions*subject.weight/(metrics.maxPoints||1) * (row.issues ? 0.01 : (topic.incidence??1)/100);
        const urgency=1+30/Math.max(1,daysUntil(exam.date,today));
        const multiplier=topic.priority==='essential'?1.6:topic.priority==='optional'?0.6:1;
        const ids=topic.lessonIds.length?topic.lessonIds:[undefined];
        for (const lessonId of ids) {
          const progress=lessonId?data.lessons[lessonId]:undefined;
          const exercises=lessonId?data.exercises[lessonId]:undefined;
          const sample=(exercises?.correct??0)+(exercises?.incorrect??0);
          const accuracy=sample?exercises!.correct/sample*100:null;
          const reading=lessonId?lessonMinutes(data,lessonId,subjectIds):topic.estimatedMinutes;
          const missing=!lessonId || !progress;
          const kind:ExamActivity['kind']=missing?'gap':progress.readPages<progress.totalPages?'reading':'questions';
          if (kind==='questions' && sample>=prep.minimumSample && accuracy!>=prep.targetAccuracy) continue;
          const remaining=kind==='questions'?20:reading;
          const minutes=Math.min(kind==='questions'?20:30,remaining??30);
          if(minutes<=0) continue;
          const reasons=[risk?'Mínimo obrigatório sem evidência suficiente':protectedSubject?'Disciplina com mínimo obrigatório':'Prioridade pelo peso e incidência'];
          if(topic.incidence===null) reasons.push('Incidência desconhecida: prioridade provisória');
          if(kind==='gap') reasons.push('Vincular material ou cadastrar páginas e ritmo');
          if(kind==='questions') reasons.push(sample<prep.minimumSample?'Amostra de questões pequena':'Desempenho abaixo da meta');
          if(kind==='reading' && reading!==null && reading<=30) reasons.push('Conclusão rápida');
          if(progress?.resumeOn && progress.resumeOn<=today) reasons.push('Retomada pendente');
          const need=kind==='questions'?1+(prep.targetAccuracy-(accuracy??0))/100:1.5;
          const stars=1+(progress?.stars??3)/5;
          const resume=progress?.resumeOn && progress.resumeOn<=today?1.2:1;
          const quick=kind==='reading' && reading!==null && reading<=30?1.15:1;
          const score=(relevance/ids.length+0.001)*urgency*exam.priority*multiplier*need*stars*resume*quick/minutes;
          const key=lessonId??exam.id+'_'+subject.id+'_'+topic.id;
          const previous=candidates.get(key);
          if(previous) { previous.score+=score; if(!previous.exams.includes(exam.name)) previous.exams.push(exam.name);
            previous.protected ||= risk; previous.deadline=[previous.deadline,exam.date].sort()[0]; previous.reasons=[...new Set([...previous.reasons,...reasons])]; }
          else candidates.set(key,{id:key,lessonId,title:topic.name,minutes,kind,score,reasons,exams:[exam.name],deadline:exam.date,protected:risk,remaining});
        }
      }
    }
  }
  const budget=remainingDailyTime({...data,dailyMinutes:prep.availability[today]??data.dailyMinutes},today);
  const sorted=[...candidates.values()].sort((a,b)=>Number(b.protected)-Number(a.protected)||b.score-a.score||a.id.localeCompare(b.id));
  const selected:ExamActivity[]=[]; const excluded:ExamActivity[]=[]; let used=0;
  const bySubject=new Map<string,number>();
  for(const row of sorted) {
    const subject=row.lessonId?subjectIds.get(row.lessonId):undefined;
    const minutes=Math.min(row.minutes,budget.study-used);
    if(row.kind==='gap' || minutes<=0 || subject && (bySubject.get(subject)??0)>=60) { excluded.push(row); continue; }
    const allowed=Math.min(minutes,subject?60-(bySubject.get(subject)??0):minutes);
    selected.push({...row,minutes:allowed}); used+=allowed;
    if(subject) bySubject.set(subject,(bySubject.get(subject)??0)+allowed);
  }
  const estimate=(ids:Set<string>)=>{
    let minutes=0, missing=0, questionMinutes=0;
    for(const id of ids) {
      const n=lessonMinutes(data,id,subjectIds); if(n===null) missing++; else minutes+=n;
      const e=data.exercises[id]; const sample=(e?.correct??0)+(e?.incorrect??0);
      if(sample<prep.minimumSample || !sample || e!.correct/sample*100<prep.targetAccuracy)questionMinutes+=20;
    }
    return {minutes,missing,questionMinutes};
  };
  return {exams,selected,excluded,outsideCore,budget,used,warnings:[...new Set(warnings)],
    full:{...estimate(lessonSet),gapMinutes,unknown},priority:{...estimate(prioritySet),gapMinutes:priorityGapMinutes,unknown:priorityUnknown}};
}
