import { usePlugin } from '@remnote/plugin-sdk';
import { ReviewPractice } from './ReviewPractice';
import { useEffect, useMemo, useState } from 'react';
import type { Backup } from '../remnote/storage';
import { loadReviewCards, reviewCandidates } from '../remnote/review-cards';
import { buildReviewBlocks } from '../review-plan';
import { remainingDailyTime } from '../study-sessions';
import { studyDay } from '../resume';
import { filterStudySubjects, type ReviewTagFilter } from '../study-scope';

export function FlashcardPlan({ data, titles, onOpen, busy, paretoOnly, tag, priorities }: {
  data: Backup;
  titles: Map<string, { title: string; subject: string; subjectId: string }>;
  onOpen: (id: string) => void;
  busy: boolean;
  paretoOnly: boolean;
  tag?: ReviewTagFilter;
  priorities?: Record<string,number>;
}) {
  const plugin = usePlugin();
  const [grouped, setGrouped] = useState<Awaited<ReturnType<typeof loadReviewCards>>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<string[]>();
  const [revision, setRevision] = useState(0);
  const [loadedScope, setLoadedScope] = useState('');
  const seconds = data.secondsPerCard ?? 30;
  const [day, setDay] = useState(studyDay);
  const budget = remainingDailyTime(data, day);
  useEffect(() => {
    const interval = setInterval(() => setDay(studyDay()), 30000);
    return () => clearInterval(interval);
  }, []);
  const subjects = new Map([...titles].map(([id, row]) => [id, row.subjectId]));
  const ids = [...filterStudySubjects(data, subjects, 'all', paretoOnly).keys()].sort().join(',');
  const scope = JSON.stringify([ids, tag?.id, tag?.includeInherited, day]);
  const ready = loadedScope === scope && !loading;
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setGrouped(undefined);
    setActive(undefined);
    void loadReviewCards(plugin, data.baseId, ids ? ids.split(',') : [], new Date(), tag).then((result) => {
      if (current) { setGrouped(result); setLoadedScope(scope); }
    }).catch((cause) => {
      if (current) setError(cause instanceof Error ? cause.message : 'Falha ao consultar os flashcards.');
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [plugin, data.baseId, ids, revision, day, tag?.id, tag?.includeInherited]);
  const blocks = useMemo(() => buildReviewBlocks(reviewCandidates(data, ready ? grouped ?? new Map() : new Map())
    .map(row => priorities ? {...row,incidence:priorities[row.id]??0} : row),
    budget.review, seconds), [data, grouped, budget.review, seconds, ready, priorities]);
  const total = blocks.reduce((sum, block) => sum + block.cards, 0);

  async function start(cardIds: string[]) {
    try {
      if ((await plugin.kb.getCurrentKnowledgeBaseData())._id !== data.baseId) throw new Error('A base ativa mudou.');
      setActive(cardIds);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a prática.'); }
  }
  return <section aria-label="Plano de revisão com flashcards">
    <h3>Revisar antes de avançar</h3>
    <p>{paretoOnly ? 'Núcleo de 80% da incidência · ' : ''}{tag ? 'Tag · ' + tag.title +
      (tag.includeInherited ? ' · inclui herança' : ' · marcação direta') : 'Todas as tags'}</p>
    <p>Até {budget.review} min · {seconds} s por flashcard · {total} cartões nos blocos sugeridos</p>
    <button type="button" disabled={busy || loading || !!active} onClick={() => setRevision((value) => value + 1)}>
      {loading ? 'Consultando flashcards…' : 'Atualizar blocos'}
    </button>
    {error && <p role="alert">{error}</p>}
    {!loading && grouped && blocks.length === 0 && <p>Nenhum flashcard pendente encontrado para os filtros e o tempo disponíveis.</p>}
    <p>Estimativa pelos cartões com data até hoje, incluindo atrasados. Cartões novos sem data ficam fora da contagem.
      A prática pode reapresentar cartões e alterar a duração.</p>
    {active && ready ? <ReviewPractice key={active.join(',')} cards={active}
      onExit={() => { setActive(undefined); setRevision((value) => value + 1); }} /> : <ul>{blocks.map((block, index) => <li className="rt-row" key={index}>
      <strong>Bloco de ~{Math.ceil(block.minutes)} min · {block.cards} flashcards</strong>
      {block.lessons.map((lesson) => <div key={lesson.id}>
        <p>{titles.get(lesson.id)?.subject} · {titles.get(lesson.id)?.title}</p>
        <small>{lesson.cardIds.length} cartões neste bloco</small>
        <button type="button" disabled={busy} onClick={() => onOpen(lesson.id)}>Abrir aula</button>
      </div>)}
      <button className="rt-primary" type="button" disabled={busy || loading}
        onClick={() => void start(block.lessons.flatMap((lesson) => lesson.cardIds))}>Revisar bloco</button>
    </li>)}</ul>}
  </section>;
}
