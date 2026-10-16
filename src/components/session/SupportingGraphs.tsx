import { Link } from './SessionLinks';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { consistencyBlocks, distribution, underTarget } from '../../core/sessionAnalysis';
import { formatTime, parseTime } from '../../core/statistics';
import { sessionPath } from '../../core/routes';
import type { Solve } from '../../core/types';
import { Graph } from '../Graph';
import { SessionDataInfo } from './SessionDataInfo';

export function SupportingGraphs({
  solves,
  sessionId,
  precision,
}: {
  solves: Solve[];
  sessionId: string;
  precision: number;
}) {
  const [targetText, setTargetText] = useState('15');
  const target = parseTime(targetText);
  const bins = useMemo(() => distribution(solves), [solves]);
  const blocks = useMemo(() => consistencyBlocks(solves), [solves]);
  const progress = useMemo(
    () => (target === null ? [] : underTarget(solves, target)),
    [solves, target],
  );
  const histogram = bins.map((bin) => ({
    ...bin,
    label: `${bin.lower / 1000}–${bin.upper / 1000}`,
  }));
  const ranges = blocks.map((block) => ({
    ...block,
    label: `${block.start + 1}–${block.end}`,
    band: block.q1 === null ? null : [block.q1 / 1000, block.q3! / 1000],
    median: block.median === null ? null : block.median / 1000,
  }));

  return (
    <div className="session-supporting-grid">
      <section className="session-panel" aria-label="Time distribution">
        <div className="session-data-panel-heading">
          <h2>Time distribution</h2>
          <SessionDataInfo label="time distribution">
            Finished solves, including +2. Each interval includes its lower bound. Select a time
            band below the chart to see its solves.
          </SessionDataInfo>
        </div>
        {bins.length ? (
          <>
            <div className="session-large-chart">
              <BarChart
                responsive
                data={histogram}
                style={{ width: '100%', height: 145 }}
                accessibilityLayer
                aria-label="Solve time distribution"
              >
                <CartesianGrid vertical={false} stroke="var(--outline)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis width={35} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  isAnimationActive={false}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="graph-tooltip" role="status">
                        {payload[0].payload.label}s: {payload[0].value} solves
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="count" fill="var(--accent)" isAnimationActive={false} />
              </BarChart>
            </div>
            <details className="session-distribution-bands">
              <summary>View time bands (seconds)</summary>
              <div className="session-bin-links">
                {histogram.map((bin) => (
                  <Link
                    key={bin.lower}
                    to={`${sessionPath(sessionId, 'solves')}?min=${bin.lower}&under=${bin.upper}`}
                  >
                    {bin.label}s · {bin.count}
                  </Link>
                ))}
              </div>
            </details>
          </>
        ) : (
          <p className="session-empty">No finished solves to plot.</p>
        )}
      </section>
      <section className="session-panel" aria-label="Under target">
        <div className="session-section-header">
          <div className="session-data-panel-heading">
            <h2>Under target</h2>
            <SessionDataInfo label="under target">
              Share of all attempts so far, including DNFs in the total. +2 penalties apply.
            </SessionDataInfo>
          </div>
          <label className="session-target">
            Target (seconds)
            <input
              aria-label="Target in seconds"
              value={targetText}
              inputMode="decimal"
              onChange={(event) => setTargetText(event.target.value)}
            />
          </label>
        </div>
        {target === null ? (
          <p role="status">Enter a positive target time.</p>
        ) : progress.length ? (
          <>
            <Graph
              height={105}
              points={progress.map((point) => ({
                x: point.number,
                y: point.percent,
                label: `Through solve ${point.number}: ${point.count} below target (${point.percent.toFixed(1)}%)`,
              }))}
              label="Share under target through each solve"
              xLabel="Solve"
              yLabel="Share (%)"
              formatTick={(value) => `${Math.round(value)}%`}
            />
            <Link
              className="session-all-solves"
              aria-label="View matching solves"
              to={`${sessionPath(sessionId, 'solves')}?under=${target}`}
            >
              {progress.at(-1)!.count} / {solves.length} under {(target / 1000).toFixed(precision)}s
              →
            </Link>
          </>
        ) : (
          <p className="session-empty">Add solves to track your target.</p>
        )}
      </section>
      <details className="session-more-charts">
        <summary>Consistency by block</summary>
        <section className="session-panel" aria-label="Consistency by block">
          <h2>Consistency by block</h2>
          {blocks.length ? (
            <>
              <div className="session-large-chart">
                <ComposedChart
                  responsive
                  data={ranges}
                  style={{ width: '100%', height: 220 }}
                  accessibilityLayer
                  aria-label="Middle 50 percent and median by solve block"
                >
                  <CartesianGrid vertical={false} stroke="var(--outline)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis width={35} unit="s" tickLine={false} axisLine={false} />
                  <Tooltip
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const block = payload[0].payload;

                      return (
                        <div className="graph-tooltip" role="status">
                          Solves {block.label}
                          <br />
                          Median:{' '}
                          {formatTime(
                            block.median === null ? null : block.median * 1000,
                            precision,
                          )}
                          <br />
                          {block.count} finished solves
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="band"
                    fill="var(--accent)"
                    fillOpacity={0.4}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="median"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </div>
              <div className="session-bin-links">
                {blocks.map((block) => (
                  <Link
                    key={block.start}
                    to={`${sessionPath(sessionId, 'solves')}?from=${block.start + 1}&to=${block.end}`}
                  >
                    Solves {block.start + 1}–{block.end}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="session-empty">Add solves to compare blocks.</p>
          )}
          <p className="subtle session-footnote">
            Bars show the middle 50%; the line shows the median. Blocks contain up to 50 attempts;
            DNF times are omitted.
          </p>
        </section>
      </details>
    </div>
  );
}
