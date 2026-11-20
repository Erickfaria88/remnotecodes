import type { RNPlugin } from '@remnote/plugin-sdk';

export interface LessonDashboardRequest { lessonId: string; token: string }
export const lessonRequestKey = (baseId: string) => 'reading-tracker:open-lesson:' + baseId;

export async function openLessonDashboard(plugin: RNPlugin, lessonId: string) {
  const base = await plugin.kb.getCurrentKnowledgeBaseData();
  const note = await plugin.rem.findByName(['Dashboard de Estudos'], null);
  if (!note || !await note.isDocument()) {
    throw new Error('Abra o comando Abrir Dashboard de Estudos uma vez para criar o dashboard.');
  }
  await plugin.storage.setSession(lessonRequestKey(base._id), {
    lessonId, token: crypto.randomUUID(),
  } satisfies LessonDashboardRequest);
  await plugin.window.openRem(note);
}
