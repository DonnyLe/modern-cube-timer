import { SessionStatistics } from './SessionStatistics';
import { SessionDataInfo } from './SessionDataInfo';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { SupportingGraphs } from './SupportingGraphs';
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
  sessionId,
  precision,
  onOpenSolve,
}: {
  solves: Solve[];
  sessionId: string;
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
      <div className="session-data-workspace">
        <SessionStatistics solves={solves} precision={precision} />
        <div className="session-data-charts">
          <section className="session-panel session-full-trend" aria-label="Full session trend">
            <div className="session-section-header">
              <div className="session-data-panel-heading">
                <h2>Solve times & averages</h2>
                <SessionDataInfo label="session trend">
                  Rolling averages use the timer’s trimming rules. Gaps indicate unavailable or DNF
                  averages. DNF attempts are marked rather than plotted as zero. Times include +2
                  penalties.
                </SessionDataInfo>
              </div>
              <label className="session-axis-label">
                Horizontal axis
                <Select
                  label="Horizontal axis"
                  value={axis}
                  options={[
                    { value: 'solve', label: 'By solve' },
                    { value: 'timestamp', label: 'By time' },
                  ]}
                  onValueChange={setAxis}
                />
              </label>
            </div>
            <div className="session-series">
              {series.map((key, index) => (
                <Checkbox
                  key={key}
                  label={<span style={{ color: colors[index] }}>{names[key]}</span>}
                  checked={visible.includes(key)}
                  onCheckedChange={(checked) =>
                    setVisible((current) =>
                      checked ? [...current, key] : current.filter((item) => item !== key),
                    )
                  }
                />
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
                  style={{ width: '100%', height: 'clamp(190px, 20vh, 300px)' }}
                  data={points}
                  margin={{ top: 12, right: 24, left: 0, bottom: 0 }}
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
                        : new Date(tick).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
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
            <div className="session-trend-footer">
              <span className="subtle">
                {solves.length} solves · Select a point to open a solve
              </span>
              <details className="session-inspect-disclosure">
                <summary>Find solve</summary>
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
                  <button
                    disabled={!canInspect}
                    onClick={() => onOpenSolve(solves[selectedNumber - 1])}
                  >
                    Open solve
                  </button>
                </div>
              </details>
            </div>
          </section>
          <SupportingGraphs solves={solves} sessionId={sessionId} precision={precision} />
        </div>
      </div>
    </div>
  );
}
