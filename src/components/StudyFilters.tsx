import {selectedReviewTags,toggleReviewTag} from '../study-scope';
import type { PhaseSelection, ReviewTagFilter } from '../study-scope';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { documentTitle } from '../remnote/documents';
import { useState } from 'react';

export function StudyFilters({ plugin, phases, selection, onPhases, paretoOnly, onPareto, tag, onTag, tagsOnly = false }: {
  plugin: RNPlugin; phases: Record<string, number>; selection: PhaseSelection;
  onPhases: (value: PhaseSelection) => void; paretoOnly: boolean; onPareto: (value: boolean) => void;
  tag?: ReviewTagFilter; onTag: (value: ReviewTagFilter | undefined) => void;
  tagsOnly?: boolean;
}) {
  const choices = [...new Set(Object.values(phases))].sort((a, b) => a - b);
  const effective = Array.isArray(selection) ? selection : selection === 'all' ? [...choices, 0] : choices.slice(0, 1);
  const [query, setQuery] = useState('2.0 Foco');
  const [results, setResults] = useState<{ id: string; title: string; parent?: string | null }[]>([]);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  return <section className="rt-card rt-study-filters" aria-label="Filtros de estudo">
    <h2>{tagsOnly ? 'Filtro de flashcards' : 'Prioridades de hoje'}</h2>
    {!tagsOnly && <>
    <div className="rt-actions">
      <button type="button" aria-pressed={selection === 'auto'} onClick={() => onPhases('auto')}>
        Automática{choices[0] ? ' · Fase ' + choices[0] : ''}
      </button>
      <button type="button" aria-pressed={selection === 'all'} onClick={() => onPhases('all')}>Todas as fases</button>
    </div>
    <fieldset className="rt-phase-choices"><legend>Selecione uma ou mais fases</legend>
      {[...choices, 0].map((value) => <label className="rt-pareto-toggle" key={value}>
        <input type="checkbox" checked={effective.includes(value)} onChange={(event) =>
          onPhases(event.target.checked ? [...new Set([...effective, value])] : effective.filter((phase) => phase !== value))} />
        {value ? 'Fase ' + value : 'Sem fase'}
      </label>)}
    </fieldset>
    <p>As fases filtram atenção, cobertura, revisões e o plano de avanço.</p>
    <label className="rt-pareto-toggle"><input type="checkbox" checked={paretoOnly}
      onChange={(event) => onPareto(event.target.checked)} /> Focar no núcleo de 80% para sugestões e revisões</label>
    {paretoOnly && <p>O núcleo é calculado por disciplina. Confira os avisos de cadastro parcial na cobertura.</p>}
    </>}
    <details><summary>Filtrar flashcards por tag{tag ? ' · ' + selectedReviewTags(tag).map(t=>t.title).join(' ou ') : ''}</summary>
      <div className="rt-actions" aria-label="Tags frequentes">
        {['Erro', 'Foco', '80/20', 'Base Teórica'].map((name) => <button type="button" key={name}
          onClick={() => { setQuery(name); setResults([]); }}>{name}</button>)}
      </div>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!query.trim()) return;
        setSearching(true); setError(''); setResults([]);
        void plugin.search.search([query.trim()], undefined, { numResults: 30 }).then(async (rems) =>
          Promise.all(rems.map(async (rem) => ({
            id: rem._id, title: await documentTitle(plugin, rem),
            parent: await rem.getParentRem().then((parent) => parent ? documentTitle(plugin, parent).then((title) => title ?? undefined) : undefined),
          })))).then(setResults).catch(() => setError('Não foi possível pesquisar a tag.'))
          .finally(() => setSearching(false));
      }}>
        <label>Nome da tag<input value={query} required onChange={(event) => { setQuery(event.target.value); setResults([]); }} /></label>
        <button disabled={searching}>{searching ? 'Buscando…' : 'Buscar tag'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>{results.map((row) => <li key={row.id}>
        <button type="button" aria-pressed={selectedReviewTags(tag).some(t=>t.id===row.id)} onClick={() => onTag(toggleReviewTag(tag,row))}>
          {selectedReviewTags(tag).some(t=>t.id===row.id)?'✓ ':''}{row.title}{row.parent ? ' · Em ' + row.parent : ''}
        </button>
      </li>)}</ul>
      {tag && <>
        <p>Inclui cartões com qualquer uma das tags selecionadas (OU).</p><div className="rt-actions">{selectedReviewTags(tag).map(item=><button type="button" key={item.id} onClick={()=>onTag(toggleReviewTag(tag,item))} aria-label={"Remover tag "+item.title}>{item.title} ×</button>)}</div>
        <label className="rt-pareto-toggle"><input type="checkbox" checked={tag.includeInherited}
          onChange={(event) => onTag({ ...tag, includeInherited: event.target.checked })} /> Incluir tags herdadas dos tópicos-pai</label>
        <button type="button" onClick={() => onTag(undefined)}>Usar todos os flashcards pendentes</button>
      </>}
      <p>Busque e selecione uma ou mais tags. As seleções anteriores são mantidas ao fazer outra busca. O filtro de tag se aplica aos flashcards dos blocos.</p>
    </details>
  </section>;
}

