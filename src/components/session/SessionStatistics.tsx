import { sessionSummary } from '../../core/sessionAnalysis';
import { formatTime } from '../../core/statistics';
import type { Solve } from '../../core/types';

export function SessionStatistics({ solves, precision }: { solves: Solve[]; precision: number }) {
  const summary = sessionSummary(solves);
  const time = (ms: number | null) => formatTime(ms, precision);
  const metrics = [
    ['Session mean', time(summary.mean)],
    ['Mean (finished)', time(summary.finishedMean)],
    ['Median (finished)', time(summary.median)],
    ['Standard deviation', time(summary.standardDeviation)],
    ['Best single', time(summary.best)],
    ['Slowest finished', time(summary.slowest)],
    ['Range', time(summary.range)],
    ['Lower quartile', time(summary.q1)],
    ['Upper quartile', time(summary.q3)],
    ['Finished solves', `${summary.finishedCount} / ${summary.count}`],
    ['+2 penalties', String(summary.plusTwo)],
    ['DNFs', String(summary.dnfs)],
  ];

  return (
    <section aria-label="Session statistics">
      <h2 className="session-data-heading">Session statistics</h2>
      <dl className="session-data-metrics">
        {metrics.map(([label, result]) => (
          <div className="session-panel" key={label}>
            <dt>{label}</dt>
            <dd>{result}</dd>
          </div>
        ))}
      </dl>
      <p className="subtle session-footnote">
        Times include +2 penalties. The session mean is DNF when it contains a DNF. Finished-solve
        statistics omit DNFs; standard deviation uses the population of finished solves.
      </p>
    </section>
  );
}
