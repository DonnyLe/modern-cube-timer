import { Activity, ChartNoAxesColumn, Flame, TrendingUp } from 'lucide-react';
import { Link } from './SessionLinks';
import { formatTime, value } from '../../core/statistics';
import { sessionSummary } from '../../core/sessionAnalysis';
import type { Solve } from '../../core/types';
import { sessionPath } from '../../core/routes';
import { formatSessionDuration } from '../../utils/date';
import { Trend } from '../Trend';

const insightSlots = [
  { title: 'Progress', icon: TrendingUp },
  { title: 'Consistency', icon: Activity },
  { title: 'Streaks', icon: Flame },
  { title: 'Session comparison', icon: ChartNoAxesColumn },
];

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
  const best = solves.find(
    (solve) => Number.isFinite(value(solve)) && value(solve) === summary.best,
  );
  const bestNumber = best ? solves.indexOf(best) + 1 : null;
  const clock = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="session-sections session-insight-workspace">
      <div className="session-summary-grid">
        <section className="session-panel session-duration" aria-label="Session length">
          <h2>Session length</h2>
          <div className="session-duration-content">
            <div>
              <p className="session-duration-value">{formatSessionDuration(summary.elapsedMs)}</p>
              <p className="subtle session-time-range">
                {solves.length
                  ? `${clock(solves[0].timestamp - solves[0].duration)} – ${clock(solves.at(-1)!.timestamp)}`
                  : 'No solves yet'}
              </p>
            </div>
            <dl className="session-duration-facts">
              <div>
                <dt>Solves</dt>
                <dd>{solves.length}</dd>
              </div>
              <div>
                <dt>Time solving</dt>
                <dd>{formatSessionDuration(summary.solvingMs)}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="session-panel" aria-label="Best performances">
          <h2>Best performances</h2>
          <div className="session-best-grid">
            <div className="session-best-tile">
              <p className="subtle">Best single</p>
              {best ? (
                <button
                  className="text-button session-best-value"
                  onClick={() => onOpenSolve(best)}
                  aria-label={`Open best solve ${bestNumber}: ${formatTime(value(best), precision)}`}
                >
                  {formatTime(value(best), precision)}
                </button>
              ) : (
                <p className="session-best-value">{formatTime(summary.best, precision)}</p>
              )}
              <p className="subtle">
                {bestNumber ? `Solve #${bestNumber}` : 'No finished solves yet'}
              </p>
            </div>
            {[
              { name: 'Best ao5', result: summary.best5 },
              { name: 'Best ao12', result: summary.best12 },
            ].map(({ name, result }) => (
              <div className="session-best-tile" key={name}>
                <p className="subtle">{name}</p>
                {result ? (
                  <Link
                    className="session-best-value"
                    aria-label={`View ${name.toLowerCase()}: ${formatTime(result.time, precision)}`}
                    to={`${sessionPath(sessionId, 'solves')}?from=${result.start + 1}&to=${result.end + 1}`}
                  >
                    {formatTime(result.time, precision)}
                  </Link>
                ) : (
                  <p className="session-best-value">—</p>
                )}
                <p className="subtle">
                  {result
                    ? `Solves #${result.start + 1}–${result.end + 1}`
                    : 'Not enough valid solves'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="session-workspace-grid">
        <section className="session-panel" aria-label="Session trend overview">
          <div className="session-section-header session-trend-heading">
            <h2>Session trend</h2>
            <dl className="session-trend-mean">
              <div>
                <dt>Session mean</dt>
                <dd>{formatTime(summary.mean, precision)}</dd>
              </div>
            </dl>
            <Link className="session-all-solves" to={sessionPath(sessionId, 'data')}>
              All data ↗
            </Link>
          </div>
          <Trend solves={solves} fill />
        </section>
        <section className="session-panel" aria-label="Session insight placeholders">
          <h2>Session insights</h2>
          <div className="session-placeholder-grid">
            {insightSlots.map(({ title, icon: Icon }) => (
              <div className="session-insight-placeholder" key={title}>
                <div className="session-placeholder-heading">
                  <Icon size={18} aria-hidden="true" />
                  <h3>{title}</h3>
                  <span className="session-placeholder-badge">Placeholder</span>
                </div>
                <p className="subtle">Insight content to be defined.</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
