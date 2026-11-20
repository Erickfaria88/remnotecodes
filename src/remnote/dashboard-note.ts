import { WidgetLocation, type RNPlugin } from '@remnote/plugin-sdk';
import { attachDashboard } from './lesson-dashboard';

const title = 'Dashboard de Estudos';
const widget = 'reading-dashboard';

export async function registerDashboardNote(plugin: RNPlugin) {
  let registeredId: string | undefined;
  let pending = Promise.resolve();

  function load(open: boolean) {
    const operation = pending.then(async () => {
      let note = await plugin.rem.findByName([title], null);
      if (!note && open) {
        note = await plugin.rem.createSingleRemWithMarkdown(title);
        if (!note) throw new Error('O RemNote não conseguiu criar a nota do dashboard.');
        await note.setIsDocument(true);
      }
      if (!note) return;
      if (!await note.isDocument()) {
        if (!open) return;
        throw new Error('Já existe um tópico com esse nome. Transforme-o em documento ou renomeie-o.');
      }
      if (open || registeredId !== note._id) {
        if (registeredId) {
          await plugin.app.unregisterWidget(widget, WidgetLocation.DocumentBelowTitle);
          registeredId = undefined;
        }
        await attachDashboard(plugin, note._id);
        registeredId = note._id;
      }
      if (open) await plugin.window.openRem(note);
    });
    pending = operation.catch(() => {});
    return operation;
  }

  await plugin.app.registerCommand({
    id: 'open-reading-dashboard',
    name: 'Abrir Dashboard de Estudos',
    description: 'Cria ou abre a nota do Dashboard de Estudos.',
    action: async () => {
      try {
        await load(true);
      } catch (error) {
        console.error('Dashboard de Estudos:', error);
        await plugin.app.toast(error instanceof Error ? error.message : 'Não foi possível abrir o dashboard.');
      }
    },
  });
  await load(false);
}
