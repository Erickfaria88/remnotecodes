import type {RNPlugin} from '@remnote/plugin-sdk';
import {studyDay} from '../resume';
export const dailyKeys=(base:string)=>({enabled:'reading-tracker:daily-enabled:'+base,seen:'reading-tracker:daily-seen:'+base,scope:'reading-tracker:daily-scope:'+base,nav:'reading-tracker:daily-nav:'+base});
/** Per installation and knowledge base. Claim before opening to avoid repeated activation. */
export async function showDailyPlan(plugin:RNPlugin,automatic=false,day=studyDay()) {
  const base=await plugin.kb.getCurrentKnowledgeBaseData(); if(!base?._id)return;
  const keys=dailyKeys(base._id);
  if(automatic&&(await plugin.storage.getLocal(keys.enabled)===false||await plugin.storage.getLocal(keys.seen)===day))return;
  const previous=await plugin.storage.getLocal(keys.seen);
  await plugin.storage.setLocal(keys.seen,day);
  try {await plugin.widget.openPopup('today-plan',{},false);}
  catch(error){await plugin.storage.setLocal(keys.seen,previous??null);throw error;}
}
export async function openDailyDashboard(plugin:RNPlugin,view:'resume'|'agenda') {
  const base=await plugin.kb.getCurrentKnowledgeBaseData();
  const note=await plugin.rem.findByName(['Dashboard de Estudos'],null);
  if(!note||!await note.isDocument())throw new Error('Use o comando Abrir Dashboard de Estudos uma vez para criar a nota.');
  const {attachDashboard}=await import('./lesson-dashboard');
  await attachDashboard(plugin,note._id);
  await plugin.storage.setSession(dailyKeys(base._id).nav,{view,token:crypto.randomUUID()});
  await plugin.window.openRem(note);
  await plugin.widget.closePopup();
}
