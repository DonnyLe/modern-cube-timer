import { bestAverage, sessionSummary } from '../../core/sessionAnalysis';
import { average, formatTime } from '../../core/statistics';
import type { Solve } from '../../core/types';
import { SessionDataInfo } from './SessionDataInfo';

export function SessionStatistics({ solves, precision }: { solves: Solve[]; precision: number }) {
  const summary = sessionSummary(solves);
  const time = (ms: number | null) => formatTime(ms, precision);
  const performance = [
    ['Mean', time(summary.mean)],
    ['Median', time(summary.median)],
    ['Best single', time(summary.best)],
    ['Slowest', time(summary.slowest)],
  ];
  const consistency = [
    ['Std. deviation', time(summary.standardDeviation)],
    ['Middle 50%', summary.q1 === null ? '—' : `${time(summary.q1)} – ${time(summary.q3)}`],
    ['DNFs', String(summary.dnfs)],
    ['+2 penalties', String(summary.plusTwo)],
  ];

  return (
    <section className="session-data-statistics" aria-label="Session statistics">
      <section className="session-panel" aria-label="Performance statistics">
        <div className="session-data-panel-heading">
          <h2>Performance</h2>
          <SessionDataInfo label="performance statistics">
            Times include +2 penalties. Mean includes every attempt and is DNF when it contains a
            DNF. Median and slowest omit DNFs. Finished mean: {time(summary.finishedMean)}.
          </SessionDataInfo>
        </div>
        <dl className="session-stat-cells session-performance-cells">
          {performance.map(([label, result]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{result}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="session-panel" aria-label="Rolling average statistics">
        <div className="session-data-panel-heading">
          <h2>Rolling averages</h2>
          <SessionDataInfo label="rolling averages">
            Current uses the latest attempts; Best is the fastest completed window in this session.
            Averages use the timer’s trimming rules. A dash means there are not enough attempts.
          </SessionDataInfo>
        </div>
        <table className="session-average-table" aria-label="Current and best rolling averages">
          <thead>
            <tr>
              <td />
              <th scope="col">Current</th>
              <th scope="col">Best</th>
            </tr>
          </thead>
          <tbody>
            {[5, 12, 50].map((count) => (
              <tr key={count}>
                <th scope="row">ao{count}</th>
                <td>{time(average(solves, count))}</td>
                <td>{time(bestAverage(solves, count)?.time ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="session-panel" aria-label="Consistency statistics">
        <div className="session-data-panel-heading">
          <h2>Consistency</h2>
          <SessionDataInfo label="consistency statistics">
            Standard deviation and the middle 50% use finished solves, including +2 penalties.
            Standard deviation uses the entire finished-solve population. {summary.finishedCount} /{' '}
            {summary.count} finished solves. Range: {time(summary.range)}.
          </SessionDataInfo>
        </div>
        <dl className="session-stat-cells session-consistency-cells">
          {consistency.map(([label, result]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{result}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
