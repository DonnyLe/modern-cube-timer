import { Link } from './SessionLinks';
import { useMemo } from 'react';
import { reviewResults } from '../../core/sessionAnalysis';
import { formatTime, value } from '../../core/statistics';
import { sessionPath } from '../../core/routes';
import type { Solve } from '../../core/types';

export function SessionReview({
  solves,
  sessionId,
  precision,
  onOpenSolve,
}: {
  solves: Solve[];
  sessionId: string;
  precision: number;
  onOpenSolve: (solve: Solve) => void;
}) {
  const review = useMemo(() => reviewResults(solves), [solves]);
  const annotated = solves
    .map((solve, index) => ({ solve, number: index + 1 }))
    .filter(({ solve }) => !!solve.note.trim());

  return (
    <div className="session-overview-grid session-review-grid">
      <section className="session-panel" aria-label="Results to review">
        <h2>Results to review</h2>
        <p className="subtle">
          Unusual times and penalties. Nothing is excluded from your statistics.
        </p>
        {review.length ? (
          <>
            {review.slice(0, 5).map(({ solve, number, reasons }) => (
              <button
                className="session-review-row"
                key={solve.id}
                onClick={() => onOpenSolve(solve)}
              >
                <span>#{number}</span>
                <strong>{formatTime(value(solve), precision)}</strong>
                <span className="subtle">{reasons.join(' · ')}</span>
                <span className="session-scramble">{solve.scramble || 'No scramble recorded'}</span>
              </button>
            ))}
            <Link
              className="session-all-solves"
              to={`${sessionPath(sessionId, 'solves')}?review=1`}
            >
              Review all {review.length} results →
            </Link>
          </>
        ) : (
          <p className="session-empty">No unusual results or penalties to review.</p>
        )}
        <p className="subtle session-footnote">
          Unusual times fall outside 1.5× the interquartile range of finished results. At least four
          finished solves are needed. A flag does not mean a solve is invalid.
        </p>
      </section>
      <section className="session-panel" aria-label="Practice notes">
        <h2>Practice notes</h2>
        {annotated.length ? (
          <>
            {annotated
              .slice(-5)
              .reverse()
              .map(({ solve, number }) => (
                <button
                  className="session-note-row"
                  key={solve.id}
                  onClick={() => onOpenSolve(solve)}
                >
                  <strong>
                    #{number} · {formatTime(value(solve), precision)}
                  </strong>
                  <span>{solve.note}</span>
                </button>
              ))}
            <Link className="session-all-solves" to={`${sessionPath(sessionId, 'solves')}?notes=1`}>
              View all {annotated.length} annotated solves →
            </Link>
          </>
        ) : (
          <p className="session-empty">Add a note to any solve to keep your observations here.</p>
        )}
      </section>
    </div>
  );
}
