import type { Backup } from './remnote/storage';
import { paretoCoverage } from './pareto';

export type PhaseSelection = 'auto' | 'all' | number[];
export interface ReviewTagFilter { id: string; title: string; includeInherited: boolean }

export function matchesPhase(phase: number | undefined, selection: PhaseSelection, phases: Record<string, number>) {
  if (selection === 'all') return true;
  if (selection === 'auto' && Object.values(phases).length === 0) return true;
  const choices = selection === 'auto' ? [Math.min(...Object.values(phases))] : selection;
  return choices.includes(phase ?? 0);
}

export function filterStudySubjects(data: Backup, subjects: Map<string, string>, selection: PhaseSelection, pareto = false) {
  const filtered = new Map([...subjects].filter(([, subject]) =>
    matchesPhase(data.subjectPhases[subject], selection, data.subjectPhases)));
  if (!pareto) return filtered;
  const allowed = new Set([...new Set(filtered.values())].flatMap((subject) => {
    const ids = [...filtered].filter(([, parent]) => parent === subject).map(([id]) => id);
    const result = paretoCoverage(data.lessons, ids);
    return result.issues.length ? [] : result.core.flatMap((row) => row.ids);
  }));
  return new Map([...filtered].filter(([id]) => allowed.has(id)));
}
