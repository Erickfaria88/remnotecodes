import { paretoCoverage } from '../pareto';
import type { ReadingRecord } from '../resume';

const format = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

export function ParetoCoverage({ records, lessons, onSelect }: {
  records: Record<string, ReadingRecord>; lessons: { id: string; title: string }[]; onSelect: (id: string) => void;
}) {
  const result = paretoCoverage(records, lessons.map((row) => row.id));
  const names = new Map(lessons.map((row) => [row.id, row.title]));
  return <section className="rt-card" aria-label="Cobertura dos assuntos mais cobrados">
    <h3>Cobertura dos assuntos mais cobrados</h3>
    {!result.registered ? <p>Informe a incidência das aulas para selecionar os assuntos que somam pelo menos 80% do levantamento.</p> :
      result.issues.length ? <div role="alert">{[...new Set(result.issues)].map((issue) => <p key={issue}>{issue}</p>)}</div> : <>
        <p><strong>{result.core.length} de {result.topics} assuntos</strong> representam <strong>{format(result.incidence)}</strong> de incidência cadastrada.</p>
        {!result.reachesTarget && <p>Cadastro parcial · a incidência informada ainda não alcança 80%. Complete os assuntos restantes.</p>}
        <p>{result.registered} de {lessons.length} aulas com incidência · soma informada {format(result.total)}</p>
        <label>Leitura do núcleo prioritário · {format(result.reading)}
          <progress max={100} value={result.reading} style={{ width: '100%', display: 'block', accentColor: '#2651ba' }} />
        </label>
        <p>A leitura é ponderada pela incidência dos assuntos. As etapas só contam quando concluídas em todas as aulas do mesmo assunto.</p>
        <ul className="rt-pareto-steps">{result.steps.map((step) => <li key={step.id}>
          {step.label} · {format(step.percent)}
        </li>)}</ul>
        <details><summary>Assuntos do núcleo prioritário</summary>
          <ul>{result.core.map((topic) => <li key={topic.ids[0]}>
            <strong>{records[topic.ids[0]].incidenceTopic || names.get(topic.ids[0])} · {format(topic.weight)}</strong>
            {topic.ids.map((id) => <button type="button" key={id} onClick={() => onSelect(id)}>
              {names.get(id)} · {records[id].readPages}/{records[id].totalPages} páginas
            </button>)}
          </li>)}</ul>
        </details>
      </>}
    <p>A cobertura representa o levantamento cadastrado dos professores. A distribuição da próxima prova pode variar.</p>
  </section>;
}
