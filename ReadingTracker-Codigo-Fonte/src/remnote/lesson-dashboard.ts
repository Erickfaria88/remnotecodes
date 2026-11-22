import type { RNPlugin, WidgetLocation } from '@remnote/plugin-sdk';

export async function attachDashboard(plugin: RNPlugin, noteId: string) {
  await plugin.app.registerWidget('reading-dashboard', 'DocumentBelowTitle' as WidgetLocation.DocumentBelowTitle, {
    remIdFilter: noteId,
    dimensions: { height: 'auto', width: '100%' },
  });
}

export interface LessonDashboardRequest { lessonId: string; token: string; timerId?:string }
export const lessonRequestKey = (baseId: string) => 'reading-tracker:open-lesson:' + baseId;

export async function openLessonDashboard(plugin: RNPlugin, lessonId: string, timerId?:string) {
  const base = await plugin.kb.getCurrentKnowledgeBaseData();
  const note = await plugin.rem.findByName(['Dashboard de Estudos'], null);
  if (!note || !await note.isDocument()) {
    throw new Error('Abra o comando Abrir Dashboard de Estudos uma vez para criar o dashboard.');
  }
  await attachDashboard(plugin, note._id);
  await plugin.storage.setSession(lessonRequestKey(base._id), {
    lessonId, token: crypto.randomUUID(), ...(timerId?{timerId}:{}),
  } satisfies LessonDashboardRequest);
  await plugin.window.openRem(note);
}
