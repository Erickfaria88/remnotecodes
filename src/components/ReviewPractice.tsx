import { Queue } from '@remnote/plugin-sdk';
import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';

/** Owns only the plugin iframe; never modifies the RemNote host document. */
export function ReviewPractice({ cards, onExit }: { cards: string[]; onExit: () => void }) {
  const exit = useRef<HTMLButtonElement>(null);
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
    exit.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.classList.remove('rt-reviewing');
      window.removeEventListener('resize', resize);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<section className="reading-tracker-panel rt-review-practice" aria-label="Resolver flashcards">
    <header className="rt-review-toolbar">
      <strong>Revisão de flashcards</strong>
      <button ref={exit} type="button" onClick={onExit} aria-label="Sair da prática e voltar ao plano">← Voltar ao plano</button>
    </header>
    <div className="rt-review-queue">
      <Queue cardIds={cards} height={height} width="100%" />
    </div>
  </section>, host);
}
