export type ReviewGroups=Map<string,{cardIds:string[];overdue:boolean}>;
export interface ReviewSnapshot {version:1;baseId:string;scope:string;at:number;groups:[string,{cardIds:string[];overdue:boolean}][]}
interface LocalStorage {getLocal<T>(key:string):Promise<T|undefined>;setLocal(key:string,value:unknown):Promise<unknown>}
const key=(base:string)=>'reading-tracker:review-cache:'+base;
export function validReviewSnapshot(value:unknown,base:string):value is ReviewSnapshot {
 const s=value as ReviewSnapshot|undefined;
 return !!s&&s.version===1&&s.baseId===base&&typeof s.scope==='string'&&Number.isSafeInteger(s.at)&&s.at>0&&Array.isArray(s.groups)&&s.groups.every(r=>Array.isArray(r)&&typeof r[0]==='string'&&r[1]&&typeof r[1].overdue==='boolean'&&Array.isArray(r[1].cardIds)&&r[1].cardIds.every(id=>typeof id==='string'));
}
/** Reads are cheap; only an explicit query may invoke the SDK loader. One cached snapshot per base. */
export function createReviewQuery(storage:LocalStorage,base:string,now=Date.now){
 let pending:Promise<ReviewSnapshot>|undefined;
 let generation=0;let invalidating:Promise<unknown>=Promise.resolve();
 return {
  async read(){const value=await storage.getLocal<unknown>(key(base));return validReviewSnapshot(value,base)?value:undefined;},
  query(scope:string,loader:()=>Promise<ReviewGroups>,force=false):Promise<ReviewSnapshot>{
   if(pending)return pending;
   const captured=generation;
   const operation=(async()=>{
    await invalidating;
    const cached=await storage.getLocal<unknown>(key(base));
    if(!force&&validReviewSnapshot(cached,base)&&cached.scope===scope&&now()-cached.at>=0&&now()-cached.at<10*60*1000)return cached;
    const groups=await loader();const result:ReviewSnapshot={version:1,baseId:base,scope,at:now(),groups:[...groups]};
    if(captured===generation)await storage.setLocal(key(base),result);
    return result;
   })();
   pending=operation;void operation.finally(()=>{if(pending===operation)pending=undefined;}).catch(()=>undefined);return operation;
  },
  async invalidate(){generation++;invalidating=storage.setLocal(key(base),null);await invalidating;}
 };
}
export const reviewSnapshotFresh=(snapshot:ReviewSnapshot|undefined,scope:string,now=Date.now())=>!!snapshot&&snapshot.scope===scope&&now>=snapshot.at&&now-snapshot.at<10*60*1000;

