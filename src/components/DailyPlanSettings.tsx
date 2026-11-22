import {useEffect,useState} from 'react';
import {usePlugin} from '@remnote/plugin-sdk';
import {dailyKeys,showDailyPlan} from '../remnote/daily-plan';
export function DailyPlanSettings({baseId,showOpen=true}:{baseId:string;showOpen?:boolean}) {
 const plugin=usePlugin();const [enabled,setEnabled]=useState<boolean>();const [error,setError]=useState('');
 useEffect(()=>{let live=true;void plugin.storage.getLocal(dailyKeys(baseId).enabled).then(v=>{if(live)setEnabled(v!==false);}).catch(()=>{if(live)setError('Não foi possível consultar a preferência.');});return()=>{live=false;};},[plugin,baseId]);
 return <section><h3>Plano de hoje</h3><label><input type="checkbox" checked={enabled??false} disabled={enabled===undefined} onChange={e=>{const next=e.target.checked;void plugin.storage.setLocal(dailyKeys(baseId).enabled,next).then(()=>setEnabled(next)).catch(()=>setError('Não foi possível salvar a preferência.'));}}/> Mostrar na primeira abertura do dia nesta máquina</label><p>Usa os últimos filtros deste dashboard. Você também pode abrir pelo comando Abrir Plano de hoje.</p>{showOpen&&<button type="button" onClick={()=>void showDailyPlan(plugin).catch(e=>setError(String(e)))}>Abrir Plano de hoje</button>}{error&&<p role="alert">{error}</p>}</section>;
}

