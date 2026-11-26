/** Walk actual parents, not portal references, to retain the original timer owner. */
export async function isStudyDescendant(id:string,lessonId:string,parentOf:(id:string)=>Promise<string|null|undefined>) {
 const seen=new Set<string>();let current:string|null|undefined=id;
 while(current&&!seen.has(current)){
  if(current===lessonId)return true;
  seen.add(current);current=await parentOf(current);
 }
 return false;
}
