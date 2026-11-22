import {showDailyPlan} from '../remnote/daily-plan';
import { registerDashboardNote } from '../remnote/dashboard-note';
import { declareIndexPlugin, WidgetLocation, type ReactRNPlugin } from '@remnote/plugin-sdk';

const widgetName = 'reading-tracker';

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerWidget('today-plan',WidgetLocation.Popup,{dimensions:{width:940,height:720}});
  await plugin.app.registerWidget(widgetName, WidgetLocation.RightSidebar, {
    dimensions: { height: 600, width: 370 },
  });
  await plugin.app.registerWidget('document-progress', WidgetLocation.DocumentBelowTitle, {
    dimensions: { height: 'auto', width: '100%' },
  });
  await plugin.app.registerWidget('lesson-progress', WidgetLocation.UnderRemEditor, {
    dimensions: { height: 'auto', width: '100%' },
  });
  await plugin.app.registerCommand({
    id: 'open-reading-tracker',
    name: 'Abrir Reading Tracker',
    description: 'Abre o painel de progresso de leitura na barra lateral direita.',
    action: async () => {
      try {
        await plugin.window.openWidgetInRightSidebar(widgetName);
      } catch (error) {
        console.error('Reading Tracker:', error);
        await plugin.app.toast('Não foi possível abrir o Reading Tracker.');
      }
    },
  });

  await plugin.app.registerCommand({id:'open-daily-plan',name:'Abrir Plano de hoje',description:'Resumo das revisões e aulas sugeridas para hoje.',action:async()=>{try{await showDailyPlan(plugin);}catch(e){await plugin.app.toast('Não foi possível abrir o Plano de hoje.');}}});
  try {
    await registerDashboardNote(plugin);
  } catch (error) {
    console.error('Dashboard de Estudos: falha no registro', error);
  }
  void showDailyPlan(plugin,true).catch(error=>console.error('Plano de hoje:',error));
}

declareIndexPlugin(onActivate, async () => {});


