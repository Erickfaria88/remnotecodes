import type { Backup } from './remnote/storage';
import { paretoCoverage } from './pareto';

export type PhaseSelection = 'auto' | 'all' | number[];
export interface ReviewTagFilter { id: string; title: string; includeInherited: boolean; tags?:{id:string;title:string}[] }
export function selectedReviewTags(filter?:{id:string;title?:string;tags?:{id:string;title:string}[]}) {
 const tags=filter?(filter.tags?.length?filter.tags:[{id:filter.id,title:filter.title??filter.id}]):[];
 return [...new Map(tags.map(t=>[t.id,t])).values()];
}
export function reviewTagKey(filter?:ReviewTagFilter){return JSON.stringify([selectedReviewTags(filter).map(t=>t.id).sort(),filter?.includeInherited??false]);}
export function toggleReviewTag(filter:ReviewTagFilter|undefined,tag:{id:string;title:string}):ReviewTagFilter|undefined {
 const current=selectedReviewTags(filter);const tags=current.some(t=>t.id===tag.id)?current.filter(t=>t.id!==tag.id):[...current,tag];
 return tags.length?{...tags[0],tags,includeInherited:filter?.includeInherited??false}:undefined;
}

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

