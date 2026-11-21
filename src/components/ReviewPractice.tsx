import { Queue } from '@remnote/plugin-sdk';
import { createPortal } from 'react-dom';
import { useLayoutEffect, useState } from 'react';
import { QuestionAuditSummary, useQuestionAudit } from './QuestionAudit';
import type { Backup } from '../remnote/storage';
import type { AuditDraft } from '../remnote/question-audit';
import type {ReviewLessonInfo} from '../review-time';
import {ReviewToolbar} from './ReviewToolbar';

/** Owns only the plugin iframe; never modifies the RemNote host document. */
export function ReviewPractice({ cards, onExit, baseId, owners, titles, onSaved, recovered }: {
  cards:string[];onExit:()=>void;baseId:string;owners:Map<string,string>;
  titles:Map<string,ReviewLessonInfo>;onSaved:(data:Backup)=>void;recovered?:AuditDraft;
}) {
  const audit=useQuestionAudit({baseId,cards,owners,onExit,onSaved,recovered,titles});
  const [host] = useState(() => document.querySelector('.reading-tracker-panel')?.parentElement ?? document.body);
  const [height, setHeight] = useState(480);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const resize = () => {
      const dashboard = new URLSearchParams(location.search).get('widgetName') === 'reading-dashboard';
      // Document widgets have automatic height. Leave room for the app chrome;
      // sidebar widgets retain their fixed viewport and fit within it.
      const available = dashboard && window.screen.availHeight
        ? Math.max(320, window.screen.availHeight - 160)
        : window.innerHeight;
      setHeight(Math.max(180, available - 84));
    };
    document.documentElement.classList.add('rt-reviewing');
    resize();
    window.addEventListener('resize', resize);
    host.querySelector<HTMLButtonElement>('[data-action="leave-review"]')?.focus({ preventScroll: true });
    return () => {
      document.documentElement.classList.remove('rt-reviewing');
      window.removeEventListener('resize', resize);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<section className="reading-tracker-panel rt-review-practice" aria-label="Resolver flashcards"
    style={audit.draft?.phase==='summary'?{maxHeight:Math.max(280,height+56),overflowY:'auto'}:undefined}>
    <ReviewToolbar summary={audit.draft?.phase==='summary'} running={audit.draft?.phase==='running'} working={audit.working}
      onLeave={()=>void audit.leave()} onFinish={()=>void audit.finish()}/>
    {audit.error&&<p role="alert">{audit.error}</p>}
    {!audit.draft&&<p>Preparando a identificação das questões e a leitura inicial dos históricos…</p>}
    {audit.working&&<p role="status">Conferindo os históricos; aguarde…</p>}
    {audit.draft?.phase==='summary'?<QuestionAuditSummary audit={audit} titles={titles}/>:audit.draft&&<>
    <p className="rt-audit-notice">Modo de auditoria · exercícios só serão somados após sua confirmação. Use uma única fila de revisão por vez.</p>
    {!!audit.draft.cards.filter(c=>c.identityIssue||!c.baseline).length&&<p className="rt-audit-notice">{audit.draft.cards.filter(c=>c.identityIssue||!c.baseline).length} cartões precisarão de identificação ou conferência manual no resumo.</p>}
    <div className="rt-review-queue">
      <Queue cardIds={cards} height={height} width="100%" />
    </div>
    </>}
  </section>, host);
}
