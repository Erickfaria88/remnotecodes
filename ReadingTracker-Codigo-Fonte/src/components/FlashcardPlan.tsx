import { Queue, usePlugin } from '@remnote/plugin-sdk';
import { useEffect, useMemo, useState } from 'react';
import type { Backup } from '../remnote/storage';
import { loadReviewCards, reviewCandidates } from '../remnote/review-cards';
import { buildReviewBlocks, reviewBudget } from '../review-plan';

export function FlashcardPlan({ data, titles, onOpen, busy }: {
  data: Backup;
  titles: Map<string, { title: string; subject: string; subjectId: string }>;
  onOpen: (id: string) => void;
  busy: boolean;
}) {
  const plugin = usePlugin();
  const [grouped, setGrouped] = useState<Awaited<ReturnType<typeof loadReviewCards>>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState<string[]>();
  const [revision, setRevision] = useState(0);
  const seconds = data.secondsPerCard ?? 30;
  const budget = reviewBudget(data.dailyMinutes, data.reviewShare ?? 100 / 3);
  const ids = [...titles.keys()].sort().join(',');
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setGrouped(undefined);
    void loadReviewCards(plugin, data.baseId, ids ? ids.split(',') : []).then((result) => {
      if (current) setGrouped(result);
    }).catch((cause) => {
      if (current) setError(cause instanceof Error ? cause.message : 'Falha ao consultar os flashcards.');
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [plugin, data.baseId, ids, revision]);
  const blocks = useMemo(() => buildReviewBlocks(reviewCandidates(data, grouped ?? new Map()),
    budget.review, seconds), [data, grouped, budget.review, seconds]);
  const total = blocks.reduce((sum, block) => sum + block.cards, 0);

  async function start(cardIds: string[]) {
    try {
      if ((await plugin.kb.getCurrentKnowledgeBaseData())._id !== data.baseId) throw new Error('A base ativa mudou.');
      setActive(cardIds);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a prática.'); }
  }
  return <section aria-label="Plano de revisão com flashcards">
    <h3>Revisar antes de avançar</h3>
    <p>Até {budget.review} min · {seconds} s por flashcard · {total} cartões nos blocos sugeridos</p>
    <button type="button" disabled={busy || loading || !!active} onClick={() => setRevision((value) => value + 1)}>
      {loading ? 'Consultando flashcards…' : 'Atualizar blocos'}
    </button>
    {error && <p role="alert">{error}</p>}
    {!loading && grouped && blocks.length === 0 && <p>Nenhum cartão com data de revisão até hoje cabe no orçamento das aulas cadastradas.</p>}
    <p>Estimativa pelos cartões com data até hoje, incluindo atrasados. Cartões novos sem data ficam fora da contagem.
      A prática pode reapresentar cartões e alterar a duração.</p>
    {active ? <div>
      <button type="button" onClick={() => { setActive(undefined); setRevision((value) => value + 1); }}>Voltar ao plano e atualizar</button>
      <Queue key={active.join(',')} cardIds={active} height={480} width="100%" />
    </div> : <ul>{blocks.map((block, index) => <li className="rt-row" key={index}>
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
