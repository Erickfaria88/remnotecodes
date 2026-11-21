export function ReviewToolbar({summary,running,working,onLeave,onFinish}:{summary:boolean;running:boolean;working:boolean;onLeave:()=>void;onFinish:()=>void}) {
  return <header className="rt-review-toolbar">
    <strong>{summary?'Resumo do bloco':'Revisão de flashcards'}</strong>
    <div className="rt-actions">
      {running&&<button type="button" disabled={working} onClick={onFinish}>Encerrar e registrar</button>}
      <button data-action="leave-review" type="button" onClick={onLeave} title="Voltar sem registrar; mantém o rascunho para depois">← Voltar ao plano</button>
    </div>
  </header>;
}
