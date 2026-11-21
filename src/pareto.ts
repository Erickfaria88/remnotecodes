import type { ReadingRecord } from './resume';
import { studySteps } from './study-steps';

export const validIncidence = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

export function incidenceStars(value: number) {
  if (value >= 15) return 5;
  if (value >= 10) return 4;
  if (value >= 5) return 3;
  if (value >= 2) return 2;
  return value > 0 ? 1 : 0;
}

export function paretoCoverage(records: Record<string, ReadingRecord>, lessonIds: string[]) {
  const groups = new Map<string, { weight: number; ids: string[] }>();
  const issues: string[] = [];
  for (const id of new Set(lessonIds)) {
    const record = records[id];
    if (record?.incidence === undefined) continue;
    const topic = record.incidenceTopic?.trim().toLocaleLowerCase('pt-BR');
    const key = topic ? 'topic:' + topic : 'lesson:' + id;
    const previous = groups.get(key);
    if (previous && previous.weight !== record.incidence) issues.push('Um assunto compartilhado tem percentuais diferentes.');
    if (previous) previous.ids.push(id);
    else groups.set(key, { weight: record.incidence, ids: [id] });
  }
  const ranked = [...groups.values()].sort((a, b) => b.weight - a.weight || a.ids[0].localeCompare(b.ids[0]));
  const total = ranked.reduce((sum, row) => sum + row.weight, 0);
  if (total > 100.5) issues.push('A soma da incidência ultrapassa 100%. Confira percentuais e assuntos compartilhados.');
  let incidence = 0;
  const core = ranked.filter((row) => {
    if (incidence >= 80 || row.weight <= 0) return false;
    incidence += row.weight;
    return true;
  });
  const weighted = (ratio: (ids: string[]) => number) => incidence === 0 ? 0 :
    core.reduce((sum, row) => sum + row.weight * ratio(row.ids), 0) / incidence * 100;
  const reading = weighted((ids) => {
    const pages = ids.reduce((sum, id) => sum + records[id].totalPages, 0);
    return ids.reduce((sum, id) => sum + records[id].readPages, 0) / pages;
  });
  const steps = studySteps.map((step) => ({
    ...step, percent: weighted((ids) => ids.every((id) => records[id].completedSteps?.includes(step.id)) ? 1 : 0),
  }));
  return { total, incidence, core, reading, steps, issues,
    registered: [...groups.values()].reduce((sum, row) => sum + row.ids.length, 0),
    reachesTarget: incidence >= 80, topics: ranked.length };
}
