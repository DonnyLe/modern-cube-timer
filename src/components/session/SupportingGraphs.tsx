import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { consistencyBlocks, distribution, underTarget } from '../../core/sessionAnalysis';
import { formatTime, parseTime } from '../../core/statistics';
import { sessionLink } from '../../core/useSessionRoute';
import type { Solve } from '../../core/types';
import { Graph } from '../Graph';

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
        <h2>Time distribution</h2>
        {bins.length ? (
          <>
            <div className="session-large-chart">
              <BarChart
                responsive
                data={histogram}
                style={{ width: '100%', height: 220 }}
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
            <div className="session-bin-links">
              {histogram.map((bin) => (
                <a
                  key={bin.lower}
                  href={`${sessionLink(sessionId, 'solves')}?min=${bin.lower}&under=${bin.upper}`}
                >
                  {bin.label}s · {bin.count}
                </a>
              ))}
            </div>
          </>
        ) : (
          <p className="session-empty">No finished solves to plot.</p>
        )}
        <p className="subtle session-footnote">
          Finished solves, including +2. Each interval includes its lower bound.
        </p>
      </section>
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
                        {formatTime(block.median === null ? null : block.median * 1000, precision)}
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
                <a
                  key={block.start}
                  href={`${sessionLink(sessionId, 'solves')}?from=${block.start + 1}&to=${block.end}`}
                >
                  Solves {block.start + 1}–{block.end}
                </a>
              ))}
            </div>
          </>
        ) : (
          <p className="session-empty">Add solves to compare blocks.</p>
        )}
        <p className="subtle session-footnote">
          Bars show the middle 50%; the line shows the median. Blocks contain up to 50 attempts; DNF
          times are omitted.
        </p>
      </section>
      <section className="session-panel" aria-label="Under target">
        <div className="session-section-header">
          <h2>Under target</h2>
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
            <p className="session-target-summary">
              {progress.at(-1)!.count} / {solves.length}{' '}
              <span className="subtle">under {formatTime(target, precision)}s</span>
            </p>
            <Graph
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
            <a
              className="session-all-solves"
              href={`${sessionLink(sessionId, 'solves')}?under=${target}`}
            >
              View matching solves →
            </a>
          </>
        ) : (
          <p className="session-empty">Add solves to track your target.</p>
        )}
        <p className="subtle session-footnote">
          Share of all attempts so far, including DNFs in the total. +2 penalties apply.
        </p>
      </section>
    </div>
  );
}
