import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { rollingAverage } from '../../core/sessionAnalysis';
import { formatTime, value } from '../../core/statistics';
import type { Solve } from '../../core/types';

const series = ['single', 'ao5', 'ao12', 'ao50', 'ao100'] as const;

type Series = (typeof series)[number];

const names = { single: 'Singles', ao5: 'ao5', ao12: 'ao12', ao50: 'ao50', ao100: 'ao100' };
const colors = ['var(--accent)', '#84a8a0', '#9298ce', '#be9a82', '#9eabba'];

export function SessionGraphs({
  solves,
  precision,
  onOpenSolve,
}: {
  solves: Solve[];
  precision: number;
  onOpenSolve: (solve: Solve) => void;
}) {
  const [visible, setVisible] = useState<Series[]>(['single', 'ao12']);
  const [axis, setAxis] = useState('solve');
  const [inspect, setInspect] = useState('1');
  const points = useMemo(() => {
    const windows = [5, 12, 50, 100].map((count) => rollingAverage(solves, count));

    return solves.map((solve, i) => {
      const times = [value(solve), ...windows.map((window) => window[i])];

      return {
        number: i + 1,
        timestamp: solve.timestamp,
        ...Object.fromEntries(
          series.map((key, j) => [
            key,
            times[j] !== null && Number.isFinite(times[j]) ? times[j]! / 1000 : null,
          ]),
        ),
      };
    });
  }, [solves]);
  const selectedNumber = Number(inspect);
  const canInspect =
    Number.isInteger(selectedNumber) && selectedNumber >= 1 && selectedNumber <= solves.length;

  return (
    <div className="session-sections">
      <section className="session-panel session-full-trend" aria-label="Full session trend">
        <div className="session-section-header">
          <h2>Solve times & rolling averages</h2>
          <label className="session-axis-label">
            Horizontal axis
            <select
              aria-label="Horizontal axis"
              value={axis}
              onChange={(event) => setAxis(event.target.value)}
            >
              <option value="solve">By solve</option>
              <option value="timestamp">By time</option>
            </select>
          </label>
        </div>
        <div className="session-series">
          {series.map((key, index) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={visible.includes(key)}
                onChange={() =>
                  setVisible((current) =>
                    current.includes(key)
                      ? current.filter((item) => item !== key)
                      : [...current, key],
                  )
                }
              />
              <span style={{ color: colors[index] }}>{names[key]}</span>
            </label>
          ))}
        </div>
        {!solves.length ? (
          <p className="session-empty">Add solves to see your session graphs.</p>
        ) : !visible.length ? (
          <p className="session-empty">Choose a series to display.</p>
        ) : (
          <div className="session-large-chart" role="group" aria-label="Session trend chart">
            <LineChart
              responsive
              style={{ width: '100%', height: 320 }}
              data={points}
              margin={{ top: 24, right: 24, left: 0, bottom: 8 }}
              accessibilityLayer
              aria-label="Full session solve times and rolling averages"
              onClick={(state) => {
                if (state.activeTooltipIndex === undefined || state.activeTooltipIndex === null)
                  return;
                const index = Number(state.activeTooltipIndex);

                if (Number.isInteger(index) && solves[index]) onOpenSolve(solves[index]);
              }}
            >
              <CartesianGrid vertical={false} stroke="var(--outline)" strokeDasharray="3 3" />
              <XAxis
                dataKey={axis === 'solve' ? 'number' : 'timestamp'}
                type="number"
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
                tickFormatter={(tick) =>
                  axis === 'solve'
                    ? String(tick)
                    : new Date(tick).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                }
              />
              <YAxis width={48} tickLine={false} axisLine={false} unit="s" />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: 'var(--outline)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const number = payload[0].payload.number as number;

                  return (
                    <div className="graph-tooltip" role="status">
                      <strong>
                        Solve {number}: {formatTime(value(solves[number - 1]), precision)}
                      </strong>
                      {payload
                        .filter((item) => item.dataKey !== 'single')
                        .map((item) => (
                          <div key={String(item.dataKey)}>
                            {String(item.dataKey)}:{' '}
                            {formatTime(
                              typeof item.value === 'number' ? item.value * 1000 : null,
                              precision,
                            )}
                          </div>
                        ))}
                    </div>
                  );
                }}
              />
              {series.map(
                (key, index) =>
                  visible.includes(key) && (
                    <Line
                      key={key}
                      dataKey={key}
                      stroke={colors[index]}
                      strokeWidth={key === 'single' ? 1 : 2}
                      dot={false}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ),
              )}
              {visible.includes('single') &&
                solves.map((solve, index) =>
                  solve.penalty === 'DNF' ? (
                    <ReferenceLine
                      key={solve.id}
                      x={axis === 'solve' ? index + 1 : solve.timestamp}
                      stroke="var(--outline)"
                      strokeDasharray="2 4"
                      label={{
                        value: 'DNF',
                        position: 'insideTop',
                        fill: 'var(--accent)',
                        fontSize: 10,
                      }}
                    />
                  ) : null,
                )}
            </LineChart>
          </div>
        )}
        <div className="session-inspect">
          <label>
            Inspect solve
            <input
              aria-label="Inspect solve number"
              type="number"
              min="1"
              max={solves.length}
              value={inspect}
              onChange={(event) => setInspect(event.target.value)}
            />
          </label>
          <button disabled={!canInspect} onClick={() => onOpenSolve(solves[selectedNumber - 1])}>
            Open solve
          </button>
          <span className="subtle">{solves.length} solves · Times include +2 penalties</span>
        </div>
        <p className="subtle session-footnote">
          Rolling averages use the app's trimmed-average rules. Gaps indicate unavailable or DNF
          averages. DNF attempts are marked rather than plotted as zero.
        </p>
      </section>
    </div>
  );
}
