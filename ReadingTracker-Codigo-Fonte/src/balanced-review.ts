import { orderReviewCandidates, type ReviewCandidate } from './review-plan';
export interface ReviewSelection {
  mode:'block'|'subject'|'lesson'|'auto';
  subjects?:string[];
  subjectId?:string;lessonId?:string;
  subjectCounts:Record<string,number>;lessonCounts:Record<string,number>;
}
export const validQuota=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=2000;
export function balancedReview(candidates:ReviewCandidate[],subjectByLesson:Map<string,string>,selection:ReviewSelection,minutes:number,secondsPerCard:number) {
  if(!Number.isFinite(minutes)||minutes<=0||!Number.isFinite(secondsPerCard)||secondsPerCard<=0)return [];
  const groups=new Map<string,{limit:number;lessons:{id:string;cards:string[]}[];taken:number;cursor:number}>();
  for(const lesson of orderReviewCandidates(candidates)) {
    const subject=subjectByLesson.get(lesson.id);if(!subject)continue;
    if(selection.mode==='block'&&selection.subjects&&!selection.subjects.includes(subject))continue;
    if(selection.mode==='subject'&&subject!==selection.subjectId)continue;
    if(selection.mode==='lesson'&&lesson.id!==selection.lessonId)continue;
    const key=selection.mode==='block'?subject:lesson.id;
    const quota=(selection.mode==='block'?selection.subjectCounts[subject]:selection.lessonCounts[lesson.id])??10;
    if(!validQuota(quota))continue;
    const group=groups.get(key)??{limit:quota,lessons:[],taken:0,cursor:0};
    group.lessons.push({id:lesson.id,cards:[...lesson.cardIds]});groups.set(key,group);
  }
  const seen=new Set<string>();const selected=new Map<string,string[]>();
  const capacity=Math.max(0,Math.floor(minutes*60/secondsPerCard));
  let remaining=capacity,progress=true;
  while(remaining>0&&progress) {
    progress=false;
    for(const group of groups.values()) {
      if(!remaining||group.taken>=group.limit)continue;
      for(let i=0;i<group.lessons.length;i++) {
        const lesson=group.lessons[group.cursor++%group.lessons.length];
        let card=lesson.cards.shift();while(card&&seen.has(card))card=lesson.cards.shift();
        if(!card)continue;
        seen.add(card);const rows=selected.get(lesson.id)??[];rows.push(card);selected.set(lesson.id,rows);
        group.taken++;remaining--;progress=true;break;
      }
    }
  }
  const cards=capacity-remaining;
  return cards?[{lessons:[...selected].map(([id,cardIds])=>({id,cardIds})),cards,minutes:cards*secondsPerCard/60}]:[];
}
