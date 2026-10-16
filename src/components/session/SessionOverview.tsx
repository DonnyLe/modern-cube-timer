import { Link } from './SessionLinks';
import { formatTime, value } from '../../core/statistics';
import { compareStretches, sessionSummary } from '../../core/sessionAnalysis';
import type { Solve } from '../../core/types';
import { sessionPath } from '../../core/routes';
import { Trend } from '../Trend';

export function SessionOverview({
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
  const summary = sessionSummary(solves);
  const comparison = compareStretches(solves);
  const metrics = [
    ['Solves', String(solves.length)],
    ['Session mean', formatTime(summary.mean, precision)],
    ['Best single', formatTime(summary.best, precision)],
    ['Best ao5', formatTime(summary.best5?.time ?? null, precision)],
    ['Best ao12', formatTime(summary.best12?.time ?? null, precision)],
  ];

  return (
    <div className="session-sections">
      <dl className="session-metrics session-panel">
        {metrics.map(([label, time]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{time}</dd>
          </div>
        ))}
      </dl>
      <div className="session-overview-grid">
        <section className="session-panel">
          <h2>Session trend</h2>
          <Trend solves={solves} />
        </section>
        <section className="session-panel">
          <h2>Session recap</h2>
          {comparison && (
            <p className="session-recap">
              Your final {comparison.size} attempts averaged{' '}
              {(Math.abs(comparison.change) / 1000).toFixed(precision)}s{' '}
              {comparison.change <= 0 ? 'faster' : 'slower'} than your first {comparison.size},
              among finished solves.
            </p>
          )}
          <dl className="session-facts">
            <div>
              <dt>Median (finished solves)</dt>
              <dd>{formatTime(summary.median, precision)}</dd>
            </div>
            <div>
              <dt>Elapsed session time</dt>
              <dd>{Math.round(summary.elapsedMs / 60000)} min</dd>
            </div>
            <div>
              <dt>Time solving</dt>
              <dd>{Math.round(summary.solvingMs / 60000)} min</dd>
            </div>
            <div>
              <dt>+2 penalties</dt>
              <dd>{summary.plusTwo}</dd>
            </div>
            <div>
              <dt>DNFs</dt>
              <dd>{summary.dnfs}</dd>
            </div>
          </dl>
          <p className="subtle session-footnote">
            Averages include penalties. An untrimmed mean containing a DNF is DNF.
          </p>
          <Link className="session-all-solves" to={sessionPath(sessionId, 'insights')}>
            All insights →
          </Link>
        </section>
      </div>
      <section className="session-panel">
        <h2>Recent solves</h2>
        {solves.length ? (
          <div className="session-solve-list">
            {solves
              .slice(-5)
              .reverse()
              .map((solve, index) => (
                <button
                  className="session-solve-row"
                  key={solve.id}
                  onClick={() => onOpenSolve(solve)}
                  aria-label={`Open solve ${solves.length - index}: ${formatTime(value(solve), precision)}`}
                >
                  <span className="subtle">#{solves.length - index}</span>
                  <strong>
                    {formatTime(value(solve), precision)}
                    {solve.penalty === '+2' && <small> +2</small>}
                  </strong>
                  <span className="session-scramble">
                    {solve.scramble || 'No scramble recorded'}
                  </span>
                  <time dateTime={new Date(solve.timestamp).toISOString()}>
                    {new Date(solve.timestamp).toLocaleString()}
                  </time>
                </button>
              ))}
          </div>
        ) : (
          <p className="subtle">Your solves and their scrambles will appear here.</p>
        )}
      </section>
    </div>
  );
}
