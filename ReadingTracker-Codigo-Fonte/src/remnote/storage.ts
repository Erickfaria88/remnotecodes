import { validReview, type ScheduledReview } from '../review-agenda';
import { validPace, validProgress, type Progress } from '../progress';
import { validPhase, validStars } from '../recommendations';
import { studyDay, validStudyDay, type ReadingRecord } from '../resume';

import { defaultDailyMinutes, validDailyMinutes } from '../study-budget';

import { validStudySteps, type StudyStep } from '../study-steps';

import { validExerciseResult, type ExerciseResult } from '../exercise-results';
import { validIncidence } from '../pareto';
import { validSession, type StudySession } from '../study-sessions';
import { parsePreparation, type Preparation } from '../exam-preparation';
import { validAuditBatch, countedQuestions, type AuditBatch } from '../question-audit';
import {defaultSubjectDailyMinutes,validSubjectDailyMinutes} from '../subject-budget';

export interface Backup {
  version: 5;
  baseId: string;
  lessons: Record<string, ReadingRecord>;
  globalPace: number | null;
  subjectPaces: Record<string, number>;
  subjectPhases: Record<string, number>;
  dailyMinutes: number;
  reviews: Record<string, ScheduledReview>;
  exercises: Record<string, ExerciseResult>;
  dailyMinutesCustomized?: true;
  reviewShare?: number;
  secondsPerCard?: number;
  sessions?: Record<string, StudySession>;
  preparation?: Preparation;
  auditBatches?: Record<string, AuditBatch>;
  subjectDailyMinutes?:number;
}

interface SyncedStorage {
  getSynced<T>(key: string): Promise<T | undefined>;
  setSynced(key: string, value: Backup): Promise<void>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validId(id: string) {
  return /^[A-Za-z0-9_-]+$/.test(id) &&
    id !== '__proto__' && id !== 'constructor' && id !== 'prototype';
}

export function parseBackup(value: unknown, baseId: string): Backup {
  if (!isObject(value) || ![1, 2, 3, 4, 5].includes(value.version as number) || typeof value.baseId !== 'string') {
    throw new Error('Backup inválido ou versão incompatível.');
  }
  if (value.baseId !== baseId) throw new Error('Este backup pertence a outra base do RemNote.');
  if (value.version !== 1 && value.preparation === undefined) throw new Error('Cadastro de preparação ausente no backup.');
  if ((value.version as number)>=3 && value.auditBatches === undefined) throw new Error('Histórico de auditorias ausente no backup.');
  if(value.version===5&&value.subjectDailyMinutes===undefined)throw new Error('Limite diário por disciplina ausente no backup.');
  const subjectDailyMinutes=value.subjectDailyMinutes===undefined?defaultSubjectDailyMinutes:value.subjectDailyMinutes;
  if(!validSubjectDailyMinutes(subjectDailyMinutes))throw new Error('Limite diário por disciplina inválido.');
  if (!isObject(value.lessons) || !isObject(value.subjectPaces) ||
      (value.globalPace !== null && !validPace(value.globalPace))) {
    throw new Error('Estrutura de backup inválida.');
  }

  const lessons: Backup['lessons'] = Object.create(null);
  for (const [id, record] of Object.entries(value.lessons)) {
    if (!validId(id) || !validProgress(record)) throw new Error('Registro de aula inválido.');
    const resumeOn = (record as ReadingRecord).resumeOn;
    if (resumeOn !== undefined && !validStudyDay(resumeOn)) throw new Error('Data de retomada inválida.');
    lessons[id] = { totalPages: record.totalPages, readPages: record.readPages };
    const stars = (record as ReadingRecord).stars;
    if (stars !== undefined && !validStars(stars)) throw new Error('Importância da aula inválida.');
    if (stars !== undefined) lessons[id].stars = stars;
    const { incidence, incidenceTopic } = record as ReadingRecord;
    if (incidence !== undefined) {
      if (!validIncidence(incidence)) throw new Error('Incidência inválida. Informe um percentual de 0 a 100.');
      lessons[id].incidence = incidence;
    }
    if (incidenceTopic !== undefined) {
      if (typeof incidenceTopic !== 'string' || incidenceTopic.length > 200) throw new Error('Assunto compartilhado inválido.');
      if (incidenceTopic.trim()) lessons[id].incidenceTopic = incidenceTopic.trim();
    }
    const steps = (record as ReadingRecord).completedSteps;
    if (steps !== undefined) {
      if (!validStudySteps(steps)) throw new Error('Etapas de estudo inválidas.');
      lessons[id].completedSteps = [...new Set(steps)];
    }
    if (record.readPages === record.totalPages) {
      const { completedAt, reviewedAt } = record as ReadingRecord;
      for (const stamp of [completedAt, reviewedAt]) {
        if (stamp !== undefined && (!Number.isSafeInteger(stamp) || stamp <= 0)) {
          throw new Error('Data de revisão inválida.');
        }
      }
      if (completedAt !== undefined) lessons[id].completedAt = completedAt;
      if (reviewedAt !== undefined && completedAt !== undefined && reviewedAt >= completedAt) {
        lessons[id].reviewedAt = reviewedAt;
      }
    }
    if (resumeOn && record.readPages < record.totalPages) lessons[id].resumeOn = resumeOn;
  }

  const subjectPaces: Backup['subjectPaces'] = Object.create(null);
  for (const [id, pace] of Object.entries(value.subjectPaces)) {
    if (!validId(id) || !validPace(pace)) throw new Error('Ritmo de disciplina inválido.');
    subjectPaces[id] = pace;
  }

  const rawPhases = value.subjectPhases === undefined ? {} : value.subjectPhases;
  if (!isObject(rawPhases)) throw new Error('Fases inválidas.');
  const subjectPhases: Backup['subjectPhases'] = Object.create(null);
  for (const [id, phase] of Object.entries(rawPhases)) {
    if (!validId(id) || !validPhase(phase)) throw new Error('Fase da disciplina inválida.');
    subjectPhases[id] = phase;
  }
  const dailyMinutes = value.dailyMinutes === undefined ? defaultDailyMinutes : value.dailyMinutes;
  if (!validDailyMinutes(dailyMinutes)) throw new Error('Tempo diário inválido.');
  const reviewShare = value.reviewShare === undefined ? 100 / 3 : value.reviewShare;
  const secondsPerCard = value.secondsPerCard === undefined ? 30 : value.secondsPerCard;
  if (typeof reviewShare !== 'number' || !Number.isFinite(reviewShare) || reviewShare < 0 || reviewShare > 100 ||
      typeof secondsPerCard !== 'number' || !Number.isFinite(secondsPerCard) || secondsPerCard < 1 || secondsPerCard > 600) {
    throw new Error('Configuração de revisão inválida.');
  }
  const rawReviews = value.reviews === undefined ? {} : value.reviews;
  if (!isObject(rawReviews)) throw new Error('Agenda de revisões inválida.');
  const reviews: Backup['reviews'] = Object.create(null);
  for (const [id, row] of Object.entries(rawReviews)) {
    if (!validId(id) || !validReview(row) || !validId(row.lessonId)) throw new Error('Revisão inválida.');
    const { lessonId, title, subject, studiedOn, dueOn, interval, pages, doneOn, firstPage, lastPage } = row;
    reviews[id] = { lessonId, title, subject, studiedOn, dueOn, interval, pages, ...(firstPage === undefined ? {} : { firstPage, lastPage }), ...(doneOn ? { doneOn } : {}) };
  }
  const rawExercises = value.exercises === undefined ? {} : value.exercises;
  if (!isObject(rawExercises)) throw new Error('Resultados de exercícios inválidos.');
  const exercises: Backup['exercises'] = Object.create(null);
  for (const [id, result] of Object.entries(rawExercises)) {
    if (!validId(id) || !validExerciseResult(result)) throw new Error('Resultado de exercícios inválido.');
    exercises[id] = { correct: result.correct, incorrect: result.incorrect };
  }
  const sessions: Record<string, StudySession> = Object.create(null);
  if (value.sessions !== undefined) {
    if (!isObject(value.sessions)) throw new Error('Histórico de tempo inválido.');
    for (const [id, row] of Object.entries(value.sessions)) {
      if (!validId(id) || !validSession(row) || row.id !== id || !validId(row.lessonId) || !validId(row.subjectId)) {
        throw new Error('Sessão de estudo inválida.');
      }
      sessions[id] = { ...row };
    }
  }
  const auditBatches:Record<string,AuditBatch>=Object.create(null);
  if(value.auditBatches!==undefined) {
    if(!isObject(value.auditBatches))throw new Error('Histórico de auditorias inválido.');
    const counted=new Set<string>();
    for(const [id,batch] of Object.entries(value.auditBatches)) {
      if(!validAuditBatch(batch) || batch.id!==id)throw new Error('Auditoria inválida.');
      for(const entry of batch.entries) {
        const key=entry.day+'|'+entry.questionKey;
        if(counted.has(key))throw new Error('Questão duplicada no histórico de auditorias do dia.');
        counted.add(key);
      }
      auditBatches[id]={id:batch.id,createdAt:batch.createdAt,entries:batch.entries.map(e=>({...e})),
        ...(batch.reviewSessions?{reviewSessions:batch.reviewSessions.map(s=>({...s}))}:{})};
    }
  }
  return { version: 5, baseId, reviews, exercises, lessons, globalPace: value.globalPace, subjectPaces, subjectPhases, dailyMinutes, sessions, auditBatches,subjectDailyMinutes,
    reviewShare, secondsPerCard, preparation: parsePreparation(value.preparation), ...(value.dailyMinutesCustomized === true ? { dailyMinutesCustomized: true as const } : {}) };
}

function migrateDailyDefault(value: unknown) {
  if (isObject(value) && value.dailyMinutes === 240 && value.dailyMinutesCustomized !== true) {
    return { ...value, dailyMinutes: defaultDailyMinutes };
  }
  return value;
}

export function storageKey(baseId: string) {
  return 'reading-tracker:v1:' + encodeURIComponent(baseId);
}

export function createRepository(storage: SyncedStorage, baseId: string) {
  const key = storageKey(baseId);
  let pending: Promise<unknown> = Promise.resolve();

  async function load(): Promise<Backup> {
    const value = await storage.getSynced<unknown>(key);
    return parseBackup(value === undefined || value === null
      ? { version: 1, baseId, lessons: {}, globalPace: null, subjectPaces: {} }
      : migrateDailyDefault(value), baseId);
  }

  function write(next: () => Backup | Promise<Backup>) {
    const operation = pending.then(async () => {
      const data = parseBackup(await next(), baseId);
      await storage.setSynced(key, data);
      return data;
    });
    pending = operation.catch(() => undefined);
    return operation;
  }

  function saveStudy(id: string, progress?: Progress, resumeOn?: string | null, stars?: number | null,
    completedSteps?: StudyStep[], result?: ExerciseResult, replaceExercises = false,
    incidence?: number | null, incidenceTopic?: string, session?: StudySession) {
    return write(async () => {
      const data = await load();
      if (session) {
        if (!validSession(session) || session.lessonId !== id || session.day > studyDay()) throw new Error('Sessão de estudo inválida.');
        const existing = data.sessions?.[session.id];
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(session)) throw new Error('Esta sessão já foi salva. Reabra a aula para registrar outro estudo.');
          return data;
        }
      }
      if (progress) {
        const previous = data.lessons[id];
        const date = resumeOn === undefined ? previous?.resumeOn : resumeOn;
        const importance = stars === undefined ? previous?.stars : stars;
        data.lessons[id] = { ...previous, ...progress, resumeOn: date ?? undefined, stars: importance ?? undefined, completedSteps: completedSteps ?? previous?.completedSteps };
        if (incidence !== undefined) data.lessons[id].incidence = incidence ?? undefined;
        if (incidenceTopic !== undefined) data.lessons[id].incidenceTopic = incidenceTopic.trim() || undefined;
      }
      if (result !== undefined) {
        const clear = replaceExercises && result.correct === 0 && result.incorrect === 0;
        if (!clear && !validExerciseResult(result)) throw new Error('Resultado de exercícios inválido.');
        const previous = data.exercises[id];
        if (clear) delete data.exercises[id];
        else data.exercises[id] = {
          correct: (replaceExercises ? 0 : previous?.correct ?? 0) + result.correct,
          incorrect: (replaceExercises ? 0 : previous?.incorrect ?? 0) + result.incorrect,
        };
      }
      if (session) data.sessions = { ...data.sessions, [session.id]: session };
      return data;
    });
  }

  return {
    load,
    saveStudy,
    saveSubjectDailyMinutes:(subjectDailyMinutes:number)=>write(async()=>({...await load(),subjectDailyMinutes})),
    commitAudit: (batch: AuditBatch) => write(async () => {
      if(!validAuditBatch(batch) || batch.createdAt>Date.now()+60000 || batch.entries.some(e=>e.at>batch.createdAt))throw new Error('Resumo de auditoria inválido.');
      const data=await load();
      const other=Object.fromEntries(Object.entries(data.auditBatches??{}).filter(([id])=>id!==batch.id));
      const counted=countedQuestions(other);const entries:AuditBatch['entries']=[];
      const submitted=new Set<string>();
      for(const entry of batch.entries) {
        const key=entry.day+'|'+entry.questionKey;
        if(submitted.has(key))throw new Error('Selecione uma única resposta por questão e dia.');
        submitted.add(key);
        if(!counted.has(key))entries.push({...entry});
      }
      if(batch.reviewSessions?.some(s=>s.day>studyDay()))throw new Error('Não é possível registrar tempo no futuro.');
      const accepted={id:batch.id,createdAt:batch.createdAt,entries,
        ...(batch.reviewSessions?.length?{reviewSessions:batch.reviewSessions.map(s=>({...s}))}:{})};
      const previous=data.auditBatches?.[batch.id];
      if(previous) {
        if(JSON.stringify(previous)!==JSON.stringify(accepted))throw new Error('Este bloco já foi confirmado. Confira o histórico antes de fazer correções manuais.');
        return data;
      }
      for(const session of accepted.reviewSessions??[]) {
        if(data.sessions?.[session.id])throw new Error('O registro de tempo deste bloco já existe. Confira o histórico.');
        data.sessions={...data.sessions,[session.id]:session};
      }
      for(const entry of entries) {
        const result=data.exercises[entry.lessonId]??{correct:0,incorrect:0};
        data.exercises[entry.lessonId]={correct:result.correct+Number(entry.correct),incorrect:result.incorrect+Number(!entry.correct)};
      }
      data.auditBatches={...data.auditBatches,[batch.id]:accepted};
      return data;
    }),
    savePreparation: (preparation: Preparation) => write(async () => ({ ...await load(), preparation: parsePreparation(preparation) })),
    updateSession: (id: string, changes: Pick<StudySession, 'day' | 'category' | 'seconds' | 'counted' | 'note'>) => write(async () => {
      const data = await load();
      const previous = data.sessions?.[id];
      if (!previous) throw new Error('Sessão indisponível. Atualize o painel.');
      const updated = { ...previous, ...changes };
      if (!validSession(updated) || updated.day > studyDay()) throw new Error('Sessão de estudo inválida.');
      data.sessions![id] = updated;
      return data;
    }),
    removeSession: (id: string) => write(async () => {
      const data = await load();
      if (!data.sessions?.[id]) throw new Error('Sessão indisponível. Atualize o painel.');
      delete data.sessions[id];
      return data;
    }),
    saveLesson: (id: string, progress: Progress, resumeOn?: string | null, stars?: number | null, completedSteps?: StudyStep[]) =>
      saveStudy(id, progress, resumeOn, stars, completedSteps),
    saveExercise: (id: string, result: ExerciseResult) => saveStudy(id, undefined, undefined, undefined, undefined, result),
    scheduleReview: (row: ScheduledReview) => write(async () => {
      const data = await load();
      const id = [row.lessonId, row.studiedOn, row.interval, row.firstPage, row.lastPage, row.pages].join('_');
      if (Object.values(data.reviews).some((saved) =>
        saved.lessonId === row.lessonId && saved.studiedOn === row.studiedOn && saved.interval === row.interval &&
        saved.firstPage === row.firstPage && saved.lastPage === row.lastPage && saved.pages === row.pages)) {
        throw new Error('Este estudo já tem uma revisão agendada.');
      }
      let key = id;
      for (let suffix = 2; data.reviews[key]; suffix++) key = id + '_' + suffix;
      data.reviews[key] = row;
      return data;
    }),
    updateReview: (id: string, changes: { dueOn: string } | { doneOn: string } | { pages: number; firstPage: number; lastPage: number }) => write(async () => {
      const data = await load();
      const review = data.reviews[id];
      if (!review || review.doneOn) throw new Error('Esta revisão já foi concluída ou está indisponível.');
      data.reviews[id] = { ...review, ...changes };
      return data;
    }),
    saveDailyMinutes: (dailyMinutes: number) => write(async () => {
      const data = await load();
      return { ...data, dailyMinutes, dailyMinutesCustomized: true };
    }),
    saveReviewSettings: (reviewShare: number, secondsPerCard: number) => write(async () => ({
      ...await load(), reviewShare, secondsPerCard,
    })),
    savePhase: (subjectId: string, phase: number | null) => write(async () => {
      const data = await load();
      if (phase === null) delete data.subjectPhases[subjectId];
      else data.subjectPhases[subjectId] = phase;
      return data;
    }),
    savePace: (subjectId: string | null, pace: number | null) => write(async () => {
      const data = await load();
      if (subjectId === null) data.globalPace = pace;
      else if (pace === null) delete data.subjectPaces[subjectId];
      else data.subjectPaces[subjectId] = pace;
      return data;
    }),
    restore: (backup: unknown) => write(() => parseBackup(backup, baseId)),
  };
}
