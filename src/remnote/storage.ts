import { validReview, type ScheduledReview } from '../review-agenda';
import { validPace, validProgress, type Progress } from '../progress';
import { validPhase, validStars } from '../recommendations';
import { validStudyDay, type ReadingRecord } from '../resume';

import { defaultDailyMinutes, validDailyMinutes } from '../study-budget';

import { validStudySteps, type StudyStep } from '../study-steps';

import { validExerciseResult, type ExerciseResult } from '../exercise-results';

export interface Backup {
  version: 1;
  baseId: string;
  lessons: Record<string, ReadingRecord>;
  globalPace: number | null;
  subjectPaces: Record<string, number>;
  subjectPhases: Record<string, number>;
  dailyMinutes: number;
  reviews: Record<string, ScheduledReview>;
  exercises: Record<string, ExerciseResult>;
  dailyMinutesCustomized?: true;
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
  if (!isObject(value) || value.version !== 1 || typeof value.baseId !== 'string') {
    throw new Error('Backup inválido ou versão incompatível.');
  }
  if (value.baseId !== baseId) throw new Error('Este backup pertence a outra base do RemNote.');
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
  return { version: 1, baseId, reviews, exercises, lessons, globalPace: value.globalPace, subjectPaces, subjectPhases, dailyMinutes, ...(value.dailyMinutesCustomized === true ? { dailyMinutesCustomized: true as const } : {}) };
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

  return {
    load,
    saveLesson: (id: string, progress: Progress, resumeOn?: string | null, stars?: number | null, completedSteps?: StudyStep[]) => write(async () => {
      const data = await load();
      const date = resumeOn === undefined ? data.lessons[id]?.resumeOn : resumeOn;
      const importance = stars === undefined ? data.lessons[id]?.stars : stars;
      data.lessons[id] = { ...data.lessons[id], ...progress, resumeOn: date ?? undefined, stars: importance ?? undefined, completedSteps: completedSteps ?? data.lessons[id]?.completedSteps };
      return data;
    }),
    saveExercise: (lessonId: string, result: ExerciseResult) => write(async () => {
      const data = await load();
      data.exercises[lessonId] = result;
      return data;
    }),
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
