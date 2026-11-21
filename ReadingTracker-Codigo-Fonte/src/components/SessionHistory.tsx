import { useState } from 'react';
import { formatDuration, parseDuration, sessionCategories, type StudySession } from '../study-sessions';
import { studyDay } from '../resume';
import type {AuditBatch} from '../question-audit';

type Changes = Pick<StudySession, 'day' | 'category' | 'seconds' | 'counted' | 'note'>;
export function SessionHistory({ sessions, lessonId, busy, onSave, onRemove, auditBatches }: {
  sessions: Record<string, StudySession>; lessonId?: string; busy: boolean;
  onSave: (id: string, changes: Changes) => Promise<void>; onRemove: (id: string) => Promise<void>;
  auditBatches?:Record<string,AuditBatch>;
}) {
  const [editing, setEditing] = useState<string>();
  const [removing, setRemoving] = useState<string>();
  const [error, setError] = useState('');
  const rows = Object.values(sessions).filter((row) => !lessonId || row.lessonId === lessonId)
    .sort((a, b) => b.day.localeCompare(a.day) || b.id.localeCompare(a.id));
  return <details className="rt-card">
    <summary>Histórico de tempo · {rows.length} sessões</summary>
    <p>Editar ou remover o tempo recalcula o saldo do dia. Páginas e totais de exercícios são ajustados no formulário da aula.</p>
    {error && <p role="alert">{error}</p>}
    {rows.length === 0 ? <p>Nenhuma sessão registrada.</p> : <ul>{rows.map((row) => <li className="rt-row" key={row.id}>
      <strong>{row.title}</strong>
      <span>{row.subject} · {row.day.split('-').reverse().join('/')}</span>
      <span>{sessionCategories.find((item) => item.id === row.category)?.label} · {formatDuration(row.seconds)}
        {row.counted ? ' · contabilizado no planejamento' : ' · fora do planejamento'}</span>
      {row.auditId&&<span>Revisão em bloco · {row.reviewedCards??0} cartões avaliados detectados · {auditBatches?.[row.auditId]?.entries.filter(e=>e.lessonId===row.lessonId&&e.correct).length??0} acertos e {auditBatches?.[row.auditId]?.entries.filter(e=>e.lessonId===row.lessonId&&!e.correct).length??0} erros somados por este bloco</span>}
      {row.firstPage !== undefined && <span>Páginas {row.firstPage}–{row.lastPage}</span>}
      {row.note && <p>{row.note}</p>}
      {editing === row.id ? <form key={row.id + ':' + row.seconds + ':' + row.day + ':' + row.category} onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        try {
          const changes = { day: String(fields.get('day')), category: String(fields.get('category')) as StudySession['category'],
            seconds: parseDuration(String(fields.get('duration'))), counted: fields.has('counted'), note: String(fields.get('note')) };
          setError('');
          void onSave(row.id, changes).then(() => setEditing(undefined));
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dados inválidos.'); }
      }}>
        <label>Data<input type="date" name="day" required max={studyDay()} defaultValue={row.day} /></label>
        <label>Categoria<select name="category" defaultValue={row.category}>
          {sessionCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label>Duração · hh:mm:ss<input name="duration" required defaultValue={formatDuration(row.seconds)} /></label>
        <label>Observação<textarea name="note" maxLength={500} defaultValue={row.note} /></label>
        <label className="rt-pareto-toggle"><input type="checkbox" name="counted" defaultChecked={row.counted} /> Contabilizar no planejamento</label>
        <button disabled={busy}>Salvar correção do tempo</button>
        <button type="button" disabled={busy} onClick={() => setEditing(undefined)}>Cancelar</button>
      </form> : <button type="button" disabled={busy} onClick={() => { setEditing(row.id); setRemoving(undefined); }}>Editar tempo</button>}
      {removing === row.id ? <div className="rt-confirm">
        <p>Remover este registro de tempo e recalcular o saldo?</p>
        <button type="button" disabled={busy} onClick={() => void onRemove(row.id).then(() => setRemoving(undefined))}>Confirmar remoção do tempo</button>
        <button type="button" disabled={busy} onClick={() => setRemoving(undefined)}>Cancelar</button>
      </div> : <button type="button" disabled={busy} onClick={() => { setRemoving(row.id); setEditing(undefined); }}>Remover registro de tempo</button>}
    </li>)}</ul>}
  </details>;
}
