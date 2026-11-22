import type {Backup} from './remnote/storage';
import {buildAdvancePlan} from './advance-plan';
import {buildExamPlan} from './exam-preparation';
import {remainingDailyTime} from './study-sessions';
import {studyDay} from './resume';
export function dailyActivities(data:Backup,subjects:Map<string,string>,reserved:Record<string,number>,today=studyDay()) {
 const post=data.preparation?.mode==='post';
 const budgetData=post?{...data,dailyMinutes:data.preparation!.availability[today]??data.dailyMinutes}:data;
 const time=remainingDailyTime(budgetData,today);
 if(post)return buildExamPlan(budgetData,data.preparation!,subjects,today,reserved).selected.filter(r=>r.lessonId&&r.kind!=='gap').map(r=>({id:r.lessonId!,minutes:r.minutes,finish:r.kind==='reading'&&r.remaining!==null&&r.remaining<=r.minutes,practice:r.kind==='questions'}));
 return buildAdvancePlan(data,subjects,time.study,today,null,reserved).selected.map(r=>({id:r.id,minutes:r.minutes,finish:!r.practice&&r.readingMinutes!==null&&r.readingMinutes<=r.minutes,practice:r.practice}));
}
