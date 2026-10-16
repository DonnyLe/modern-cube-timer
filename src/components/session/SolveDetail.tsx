import { useRef, useEffect, useState } from 'react';
import { Copy, X } from 'lucide-react';
import type { Session, Solve, Penalty } from '../../core/types';
import { average, formatTime, parseTime, value } from '../../core/statistics';
import { safeWrite } from '../../data/store';
import { editSolve, deleteSolve } from '../../data/actions/solve';
import { PuzzleView } from '../PuzzleView';

export function SolveDetail({
  solve,
  solves,
  session,
  precision,
  onClose,
  onSelect,
  onDeleted,
}: {
  solve: Solve;
  solves: Solve[];
  session: Session;
  precision: number;
  onClose: () => void;
  onSelect: (solve: Solve) => void;
  onDeleted: (solve: Solve) => void;
}) {
  const [time, setTime] = useState(String(solve.duration / 1000));
  const [penalty, setPenalty] = useState<Penalty>(solve.penalty);
  const [note, setNote] = useState(solve.note);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [working, setWorking] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const index = solves.findIndex((item) => item.id === solve.id);
  const preceding = solves.slice(0, index + 1);

  useEffect(() => {
    title.current?.focus();
  }, []);

  return (
    <aside className="session-panel session-solve-detail" aria-label="Solve details">
      <header className="session-section-header">
        <h2 ref={title} tabIndex={-1}>
          Solve #{index + 1}
        </h2>
        <button className="icon-button" aria-label="Close solve details" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <p className="session-detail-time">{formatTime(value(solve), precision)}</p>
      <p className="subtle session-footnote">{new Date(solve.timestamp).toLocaleString()}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const duration = parseTime(time);

          if (duration === null) {
            setError('Enter a time such as 12.84 or 1:02.34.');

            return;
          }

          setWorking(true);
          setError('');
          void safeWrite(() => editSolve(solve.id, { duration, penalty, note })).then((ok) => {
            setWorking(false);
            if (ok) setMessage('Solve saved.');
          });
        }}
      >
        <label>
          Time before penalty
          <input
            value={time}
            inputMode="decimal"
            onChange={(event) => {
              setTime(event.target.value);
              setMessage('');
            }}
          />
        </label>
        <label>
          Penalty
          <select
            aria-label="Solve penalty"
            value={penalty}
            onChange={(event) => {
              setPenalty(event.target.value as Penalty);
              setMessage('');
            }}
          >
            <option value="none">None</option>
            <option value="+2">+2</option>
            <option value="DNF">DNF</option>
          </select>
        </label>
        <div className="session-section-header">
          <h3>Scramble</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Copy solve scramble"
            onClick={() => {
              void navigator.clipboard.writeText(solve.scramble).then(
                () => setMessage('Scramble copied.'),
                () => setMessage('Could not copy. Select the scramble text to copy it.'),
              );
            }}
          >
            <Copy size={16} />
          </button>
        </div>
        <p className="session-scramble">{solve.scramble || 'No scramble recorded'}</p>
        {solve.scramble && (
          <PuzzleView
            event={session.puzzle}
            scramble={solve.scramble}
            caption={false}
            className="session-detail-net"
          />
        )}
        <dl className="session-facts">
          <div>
            <dt>ao5 at this solve</dt>
            <dd>{formatTime(average(preceding, 5), precision)}</dd>
          </div>
          <div>
            <dt>ao12 at this solve</dt>
            <dd>{formatTime(average(preceding, 12), precision)}</dd>
          </div>
        </dl>
        <label>
          Note
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setMessage('');
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <p role="status" className="subtle session-footnote">
          {message}
        </p>
        <button className="primary" disabled={working}>
          Save solve
        </button>
      </form>
      <div className="session-pagination">
        <button disabled={working || index <= 0} onClick={() => onSelect(solves[index - 1])}>
          Previous solve
        </button>
        <button
          disabled={working || index >= solves.length - 1}
          onClick={() => onSelect(solves[index + 1])}
        >
          Next solve
        </button>
      </div>
      {confirmDelete ? (
        <div className="session-delete-confirm">
          <p>Delete this solve?</p>
          <button
            className="danger"
            disabled={working}
            onClick={() => {
              setWorking(true);
              void safeWrite(async () => {
                const deleted = await deleteSolve(solve.id);

                if (deleted) onDeleted(deleted);
              }).then((ok) => {
                setWorking(false);
                if (ok) onClose();
              });
            }}
          >
            Confirm delete
          </button>
          <button disabled={working} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="text-button danger" onClick={() => setConfirmDelete(true)}>
          Delete solve
        </button>
      )}
    </aside>
  );
}
