import { useEffect, useRef, useState } from 'react';
import type { RNPlugin } from '@remnote/plugin-sdk';
import { documentTitle, searchSubjects } from '../remnote/documents';

type Subject = Awaited<ReturnType<typeof searchSubjects>>[number];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function SubjectPicker({ plugin, phases, busy, onSelect, onClose }: {
  plugin: RNPlugin; phases: Record<string, number>; busy: boolean;
  onSelect: (subject: Subject) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('');
  const [known, setKnown] = useState<Subject[]>([]);
  const [found, setFound] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      const rems = await plugin.rem.findMany(Object.keys(phases));
      if (!rems) throw new Error('Disciplinas indisponíveis.');
      const rows = await Promise.all(rems.map(async (rem) => ({
        rem, title: await documentTitle(plugin, rem),
        parent: await rem.getParentRem().then((parent) => parent ? documentTitle(plugin, parent) : undefined),
      })));
      if (active) setKnown(rows);
    })().catch(() => { if (active) setError('Não foi possível carregar as disciplinas cadastradas. Tente pesquisar pelo nome.'); });
    return () => { active = false; };
  }, [plugin, phases]);
  useEffect(() => {
    let active = true;
    setFound([]);
    if (query.trim().length < 2) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      void searchSubjects(plugin, query.trim()).then((rows) => {
        if (active) { setFound(rows); setError(''); }
      }).catch(() => { if (active) setError('A pesquisa falhou. Altere o texto para tentar novamente.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [plugin, query]);
  const rows = [...new Map([...known, ...found].map((row) => [row.rem._id, row])).values()]
    .filter((row) => (!phase || phases[row.rem._id] === Number(phase)) &&
      normalize(row.title + ' ' + (row.parent ?? '')).includes(normalize(query.trim())))
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  return <dialog className="rt-subject-dialog" ref={dialog} aria-labelledby="rt-subject-dialog-title"
    onCancel={onClose}>
    <div className="rt-subject-heading">
      <h2 id="rt-subject-dialog-title">Selecionar disciplina</h2>
      <button type="button" onClick={onClose} aria-label="Fechar seleção de disciplina">✕</button>
    </div>
    <label>Filtrar pelo nome<input type="search" autoFocus value={query}
      placeholder="Digite para filtrar ou pesquisar no RemNote"
      onChange={(event) => setQuery(event.target.value)} /></label>
    <label>Fase<select value={phase} onChange={(event) => setPhase(event.target.value)}>
      <option value="">Todas</option>
      {[...new Set(Object.values(phases))].sort((a, b) => a - b).map((value) =>
        <option key={value} value={value}>Fase {value}</option>)}
    </select></label>
    {loading && <p role="status">Pesquisando…</p>}
    {error && <p role="alert">{error}</p>}
    <ul className="rt-subject-results" aria-label="Disciplinas encontradas">
      {rows.map((row) => <li key={row.rem._id}>
        <button type="button" className="rt-row-main" disabled={busy} onClick={() => onSelect(row)}>
          <strong>{row.title}</strong>
          <span>{phases[row.rem._id] ? 'Fase ' + phases[row.rem._id] : 'Sem fase cadastrada'}</span>
          {row.parent && <span>Em {row.parent}</span>}
        </button>
      </li>)}
    </ul>
    {!loading && rows.length === 0 && <p>{query.trim().length < 2
      ? 'Digite pelo menos duas letras para buscar outras disciplinas no RemNote.' : 'Nenhuma disciplina encontrada.'}</p>}
  </dialog>;
}
