import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { useSearchParams } from 'react-router';
import { Link } from './SessionLinks';
import { reviewResults } from '../../core/sessionAnalysis';
import { sessionPath } from '../../core/routes';
import { useMemo, useState } from 'react';
import type { Solve } from '../../core/types';
import { formatTime, value } from '../../core/statistics';

const pageSize = 25;

export function SessionSolves({
  solves,
  precision,
  onOpenSolve,
  sessionId,
}: {
  solves: Solve[];
  precision: number;
  onOpenSolve: (solve: Solve) => void;
  sessionId: string;
}) {
  const [query, setQuery] = useState('');
  const [penalty, setPenalty] = useState('all');
  const [notes, setNotes] = useState(false);
  const [order, setOrder] = useState('newest');
  const [page, setPage] = useState(0);
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
  const lastPage = Math.max(0, Math.ceil(shown.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * pageSize;

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
      <div className="session-list-toolbar">
        <label className="session-search">
          Search solves
          <input
            type="search"
            placeholder="Scramble, time, or note…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
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
              setPage(0);
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
            onValueChange={(next) => {
              setOrder(next);
              setPage(0);
            }}
          />
        </label>
        <Checkbox
          className="session-check"
          label="With notes"
          checked={notes}
          onCheckedChange={(next) => {
            setNotes(next);
            setPage(0);
          }}
        />
      </div>
      <p className="subtle session-result-count" role="status">
        {shown.length} matching {shown.length === 1 ? 'solve' : 'solves'}
      </p>
      {shown.length ? (
        <>
          <div className="session-solve-list">
            {shown.slice(start, start + pageSize).map(({ solve, number }) => (
              <button
                className="session-solve-row"
                id={`session-solve-${solve.id}`}
                key={solve.id}
                onClick={() => onOpenSolve(solve)}
                aria-label={`Open solve ${number}: ${formatTime(value(solve), precision)}`}
              >
                <span className="subtle">#{number}</span>
                <strong>
                  {formatTime(value(solve), precision)}
                  {solve.penalty === '+2' && <small> +2</small>}
                </strong>
                <span>
                  <span className="session-scramble">
                    {solve.scramble || 'No scramble recorded'}
                  </span>
                  {solve.note && <span className="session-row-note">{solve.note}</span>}
                </span>
                <time dateTime={new Date(solve.timestamp).toISOString()}>
                  {new Date(solve.timestamp).toLocaleString()}
                </time>
              </button>
            ))}
          </div>
          <div className="session-pagination">
            <span>
              {start + 1}–{Math.min(start + pageSize, shown.length)} of {shown.length}
            </span>
            <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous page
            </button>
            <button disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>
              Next page
            </button>
          </div>
        </>
      ) : (
        <p className="session-empty">
          {solves.length ? 'No solves match these filters.' : 'No solves in this session yet.'}
        </p>
      )}
    </section>
  );
}
