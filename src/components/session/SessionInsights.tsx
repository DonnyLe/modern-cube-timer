import { useMemo, useState } from 'react';
import { compareStretches, sessionSummary, underTarget } from '../../core/sessionAnalysis';
import { formatTime, parseTime } from '../../core/statistics';
import { sessionLink } from '../../core/useSessionRoute';
import type { Solve } from '../../core/types';

export function SessionInsights({
  solves,
  sessionId,
  precision,
}: {
  solves: Solve[];
  sessionId: string;
  precision: number;
}) {
  const summary = useMemo(() => sessionSummary(solves), [solves]);
  const comparison = useMemo(() => compareStretches(solves), [solves]);
  const [targetText, setTargetText] = useState('15');
  const target = parseTime(targetText);
  const matching = target === null ? 0 : (underTarget(solves, target).at(-1)?.count ?? 0);

  return (
    <div className="session-sections">
      <section className="session-panel session-insight-heading">
        <p className="subtle">Within this session</p>
        <h2>What changed as you practiced</h2>
        <p className="subtle">Explore the recorded times and the solves behind each observation.</p>
      </section>
      <div className="session-insight-cards">
        <section className="session-panel">
          <h2>Opening vs. closing pace</h2>
          {comparison ? (
            <>
              <p className="session-insight-lead">
                {comparison.change === 0
                  ? 'Your opening and closing means matched.'
                  : `Your final ${comparison.size} attempts averaged ${formatTime(Math.abs(comparison.change), precision)}s ${comparison.change < 0 ? 'faster' : 'slower'}.`}
              </p>
              <dl className="session-comparison">
                <div>
                  <dt>First {comparison.size} · finished mean</dt>
                  <dd>{formatTime(comparison.opening, precision)}</dd>
                  <span
                    style={{
                      width: `${(comparison.opening / Math.max(comparison.opening, comparison.closing)) * 100}%`,
                    }}
                  />
                </div>
                <div>
                  <dt>Last {comparison.size} · finished mean</dt>
                  <dd>{formatTime(comparison.closing, precision)}</dd>
                  <span
                    style={{
                      width: `${(comparison.closing / Math.max(comparison.opening, comparison.closing)) * 100}%`,
                    }}
                  />
                </div>
              </dl>
              <div className="session-bin-links">
                <a href={`${sessionLink(sessionId, 'solves')}?from=1&to=${comparison.size}`}>
                  Opening solves →
                </a>
                <a
                  href={`${sessionLink(sessionId, 'solves')}?from=${solves.length - comparison.size + 1}&to=${solves.length}`}
                >
                  Closing solves →
                </a>
              </div>
              <p className="subtle session-footnote">
                Compares finished solves within each stretch, including +2. DNFs are omitted from
                these means.
              </p>
            </>
          ) : (
            <p className="session-empty">
              {solves.length < 12
                ? 'Record at least 12 attempts to compare opening and closing stretches.'
                : 'Each stretch needs at least one finished solve to compare.'}
            </p>
          )}
        </section>
        <section className="session-panel">
          <h2>Your strongest average of 12</h2>
          {summary.best12 ? (
            <>
              <p className="session-insight-lead">
                {formatTime(summary.best12.time, precision)} seconds
              </p>
              <p className="subtle">
                Solves {summary.best12.start + 1}–{summary.best12.end + 1} formed your best ao12.
              </p>
              <a
                className="session-all-solves"
                href={`${sessionLink(sessionId, 'solves')}?from=${summary.best12.start + 1}&to=${summary.best12.end + 1}`}
              >
                View these 12 solves →
              </a>
              <p className="subtle session-footnote">
                Uses the same trimmed-average rules as your timer. Tied windows show the earliest
                match.
              </p>
            </>
          ) : (
            <p className="session-empty">
              {solves.length < 12
                ? `${12 - solves.length} more attempts to see your first ao12.`
                : 'No valid average of 12 yet.'}
            </p>
          )}
        </section>
        <section className="session-panel">
          <div className="session-section-header">
            <h2>Under your target</h2>
            <label className="session-target">
              Target (seconds)
              <input
                aria-label="Insight target in seconds"
                value={targetText}
                inputMode="decimal"
                onChange={(event) => setTargetText(event.target.value)}
              />
            </label>
          </div>
          {target === null ? (
            <p role="status">Enter a positive target time.</p>
          ) : (
            <>
              <p className="session-insight-lead">
                {matching} of {solves.length} attempts
              </p>
              <p className="subtle">
                {solves.length ? ((matching / solves.length) * 100).toFixed(1) : '0.0'}% finished
                below {formatTime(target, precision)} seconds.
              </p>
              <div className="session-proportion">
                <span
                  style={{ width: `${solves.length ? (matching / solves.length) * 100 : 0}%` }}
                />
              </div>
              <a
                className="session-all-solves"
                href={`${sessionLink(sessionId, 'solves')}?under=${target}`}
              >
                View matching solves →
              </a>
              <p className="subtle session-footnote">
                All attempts count toward the total. +2 penalties apply.
              </p>
            </>
          )}
        </section>
      </div>
      <p className="subtle session-footnote">
        Insights describe this session's recorded times. Solve phases and technique are not
        inferred.
      </p>
    </div>
  );
}
