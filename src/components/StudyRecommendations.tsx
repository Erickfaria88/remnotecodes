import { buildAdvancePlan } from '../advance-plan';
import { studyDay } from '../resume';
import { remainingDailyTime } from '../study-sessions';
import type { Backup } from '../remnote/storage';
import { paretoCoverage } from '../pareto';

interface LessonName { title: string; subject: string; subjectId: string }

export function StudyRecommendations({ data, titles, busy, onOpen, onSelect, availableMinutes, paretoOnly }: {
  data: Backup; titles: Map<string, LessonName>; busy: boolean; onOpen: (id: string) => void;
  onSelect: (id: string) => void; availableMinutes?: number;
  paretoOnly: boolean;
}) {
  const subjects = new Map([...titles].map(([id, name]) => [id, name.subjectId]));
  const priorityIds = new Set([...new Set(subjects.values())].flatMap((subjectId) => {
    const ids = [...subjects].filter(([, value]) => value === subjectId).map(([id]) => id);
    const result = paretoCoverage(data.lessons, ids);
    return result.issues.length ? [] : result.core.flatMap((row) => row.ids);
  }));
  const candidates = paretoOnly ? new Map([...subjects].filter(([id]) => priorityIds.has(id))) : subjects;
  const budget = availableMinutes ?? remainingDailyTime(data).study;
  const plan = buildAdvancePlan(data, candidates, budget, studyDay(), null);
  return <section aria-label="O que estudar agora?">
    <h3>O que estudar agora?</h3>
    <div className="fields">
      <label>Tempo para avançar (min)<input type="number" readOnly value={budget} /></label>
    </div>
    {paretoOnly && <p>O filtro usa a análise de cada disciplina. Confira os avisos de cadastro parcial no painel de cobertura.</p>}
    <p>Plano único de leitura e questões · {plan.totalMinutes} de {budget} min distribuídos.
      Retomadas, leituras quase concluídas e reforços entram neste mesmo orçamento.</p>
    <p>Prioridade por fase e benefício por minuto, considerando estrelas, retomadas e necessidade de exercícios.
      Blocos de leitura de até 30 min e sessões de questões de até 20 min.</p>
    {plan.selected.length === 0 ? <p>Nenhuma atividade disponível nesta fase. Confira as aulas cadastradas ou selecione Todas.</p> :
      <ul>{plan.selected.map((item) => {
        const name = titles.get(item.id)!;
        return <li className="rt-row" key={item.id}>
          <button className="rt-row-main" type="button" disabled={busy} onClick={() => onSelect(item.id)}>
            <strong>{name.title}</strong>
            <span>{name.subject} · {item.phase ? 'Fase ' + item.phase : 'Sem fase'} · {item.stars}/5 ★</span>
            <span><strong>{item.minutes} min · {item.practice ? 'Resolver questões / reforçar' : 'Avançar na leitura'}</strong></span>
            {!item.practice && item.readingMinutes !== null && item.readingMinutes <= 30 &&
              <span className="rt-benefit-badge">Melhor custo-benefício · leitura quase concluída</span>}
            {item.remaining > 0 && <span>Faltam {item.remaining} páginas{item.readingMinutes ? ' · ~' + item.readingMinutes + ' min para terminar a leitura' : ' · sem ritmo de leitura cadastrado'}</span>}
            <span>{item.reasons.join(' · ') || 'Avanço do material prioritário'}</span>
          </button>
          <div className="rt-actions">
            <button type="button" disabled={busy} onClick={() => onSelect(item.id)}>Registrar estudo</button>
            <button type="button" disabled={busy} onClick={() => onOpen(item.id)}>Abrir aula</button>
          </div>
        </li>;
      })}</ul>}
    {plan.available > 0 && <p>{plan.available} min livres após as atividades sugeridas. Você pode ampliar uma sessão ou escolher outra fase.</p>}
  </section>;
}
