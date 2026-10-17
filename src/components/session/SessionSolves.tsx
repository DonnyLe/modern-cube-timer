import { deleteSolves } from '../../data/actions/solve';
import { safeWrite } from '../../data/store';
import { VirtualSolveList } from './VirtualSolveList';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { useSearchParams } from 'react-router';
import { Link } from './SessionLinks';
import { reviewResults } from '../../core/sessionAnalysis';
import { sessionPath } from '../../core/routes';
import { useMemo, useState } from 'react';
import type { Solve } from '../../core/types';
import { formatTime, value } from '../../core/statistics';

export function SessionSolves({
  solves,
  precision,
  onOpenSolve,
  sessionId,
  onDeleted,
}: {
  solves: Solve[];
  precision: number;
  onOpenSolve: (solve: Solve) => void;
  sessionId: string;
  onDeleted: (solves: Solve[]) => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [query, setQuery] = useState('');
  const [penalty, setPenalty] = useState('all');
  const [notes, setNotes] = useState(false);
  const [order, setOrder] = useState('newest');
  const [params] = useSearchParams();
  const search = params.toString();
  const reviewIds = useMemo(
    () => new Set(reviewResults(solves).map((item) => item.solve.id)),
    [solves],
  );
  const from = Number(params.get('from') || 1);
  const to = Number(params.get('to') || solves.length);
  const target = params.has('under') ? Number(params.get('under')) : Infinity;
  const shown = solves
    .map((solve, index) => ({ solve, number: index + 1 }))
    .filter(
      ({ solve, number }) =>
        value(solve) >= Number(params.get('min') || 0) &&
        number >= from &&
        number <= to &&
        (!params.has('under') || value(solve) < target) &&
        (penalty === 'all' || solve.penalty === penalty) &&
        (!(notes || params.get('notes') === '1') || !!solve.note.trim()) &&
        (params.get('review') !== '1' || reviewIds.has(solve.id)) &&
        `${solve.scramble} ${solve.note} ${formatTime(value(solve), precision)} #${number}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    );

  shown.sort((a, b) =>
    order === 'fastest'
      ? value(a.solve) - value(b.solve) || a.number - b.number
      : order === 'oldest'
        ? a.number - b.number
        : b.number - a.number,
  );

  const selected = shown.filter(({ solve }) => checkedIds.has(solve.id));
  const allChecked = shown.length > 0 && selected.length === shown.length;

  const clearSelection = () => {
    setCheckedIds(new Set());
    setDeleteIds([]);
  };

  return (
    <section className="session-panel session-solves" aria-label="Session solves">
      {search && (
        <div className="session-filter-context">
          <span>
            {params.get('review') === '1'
              ? 'Results to review'
              : params.get('notes') === '1'
                ? 'Annotated solves'
                : params.has('from') || params.has('to')
                  ? `Solves ${from}–${to}`
                  : 'Selected time range'}
          </span>
          <Link to={sessionPath(sessionId, 'solves')}>Show all solves</Link>
        </div>
      )}
      <div className="session-list-toolbar" inert={working}>
        <label className="session-search">
          Search solves
          <input
            type="search"
            placeholder="Scramble, time, or note…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              clearSelection();
            }}
          />
        </label>
        <label>
          Penalty
          <Select
            label="Penalty"
            value={penalty}
            options={[
              { value: 'all', label: 'All results' },
              { value: 'none', label: 'No penalty' },
              { value: '+2', label: '+2' },
              { value: 'DNF', label: 'DNF' },
            ]}
            onValueChange={(next) => {
              setPenalty(next);
              clearSelection();
            }}
          />
        </label>
        <label>
          Order
          <Select
            label="Order"
            value={order}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'fastest', label: 'Fastest first' },
            ]}
            onValueChange={setOrder}
          />
        </label>
        <Checkbox
          className="session-check"
          label="With notes"
          checked={notes}
          onCheckedChange={(next) => {
            setNotes(next);
            clearSelection();
          }}
        />
      </div>
      <div className="session-selection-controls">
        <p className="subtle session-result-count" role="status">
          {shown.length} matching {shown.length === 1 ? 'solve' : 'solves'}
        </p>

        <button
          disabled={working || (!selecting && !shown.length)}
          onClick={() => {
            setSelecting(!selecting);
            clearSelection();
          }}
        >
          {selecting ? 'Done' : 'Select solves'}
        </button>
        {selecting && (
          <>
            <Checkbox
              label="Select all matching solves"
              checked={allChecked}
              indeterminate={!allChecked && selected.length > 0}
              disabled={working || !shown.length}
              onCheckedChange={(checked) => {
                setCheckedIds(new Set(checked ? shown.map(({ solve }) => solve.id) : []));
                setDeleteIds([]);
              }}
            />
            <span role="status">{selected.length} selected</span>
            <button
              className="danger"
              disabled={working || !selected.length}
              onClick={() => setDeleteIds(selected.map(({ solve }) => solve.id))}
            >
              Delete selected solves
            </button>
            <button disabled={working || !selected.length} onClick={clearSelection}>
              Clear
            </button>
          </>
        )}
      </div>
      {deleteIds.length > 0 && (
        <div className="session-delete-confirm" role="alert">
          <p>
            Delete {deleteIds.length} selected {deleteIds.length === 1 ? 'solve' : 'solves'}?
          </p>
          <button
            className="danger"
            disabled={working}
            onClick={() => {
              setWorking(true);
              void safeWrite(async () => {
                const deleted = await deleteSolves(sessionId, deleteIds);

                if (deleted.length) onDeleted(deleted);
              }).then((ok) => {
                setWorking(false);
                if (ok) clearSelection();
              });
            }}
          >
            Confirm delete
          </button>
          <button disabled={working} onClick={() => setDeleteIds([])}>
            Cancel
          </button>
        </div>
      )}
      {shown.length ? (
        <VirtualSolveList
          key={JSON.stringify([query, penalty, notes, order, search])}
          solves={shown}
          precision={precision}
          onOpenSolve={onOpenSolve}
          selection={
            selecting
              ? {
                  checkedIds,
                  disabled: working,
                  onToggle: (id, checked) => {
                    setCheckedIds((current) => {
                      const next = new Set(current);

                      if (checked) next.add(id);
                      else next.delete(id);

                      return next;
                    });
                    setDeleteIds([]);
                  },
                }
              : undefined
          }
        />
      ) : (
        <p className="session-empty">
          {solves.length ? 'No solves match these filters.' : 'No solves in this session yet.'}
        </p>
      )}
    </section>
  );
}
