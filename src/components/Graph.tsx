import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';

export interface GraphPoint {
  x: number;
  y: number | null;
  label: string;
}

// Values and labels belong to callers; null leaves a gap, Infinity marks an invalid result.
export function Graph({
  points,
  label,
  xLabel,
  yLabel,
  fill = false,
  formatTick = (value) => Number(value.toFixed(2)).toString(),
}: {
  points: GraphPoint[];
  label: string;
  xLabel: string;
  yLabel: string;
  fill?: boolean;
  formatTick?: (value: number) => string;
}) {
  const data = points.map((point) => ({
    ...point,
    y: point.y !== null && Number.isFinite(point.y) ? point.y : null,
  }));

  const hasValues = data.some((point) => point.y !== null);

  return (
    <div
      className={fill ? 'graph graph-fill' : 'graph'}
      role="group"
      aria-label={label}
      onKeyDown={(event) => {
        // Space belongs to the focused chart, rather than starting the timer.
        if (event.key === ' ') event.preventDefault();
      }}
    >
      <span className="graph-unit">{yLabel}</span>
      <LineChart
        responsive
        className="graph-chart"
        style={{ width: '100%', height: fill ? '100%' : 183 }}
        data={data}
        margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
        accessibilityLayer
        aria-label={`${label}. Use arrow keys to explore values.`}
      >
        <CartesianGrid vertical={false} stroke="var(--outline)" strokeDasharray="3 3" />
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin', 'dataMax']}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={hasValues ? [0, 'auto'] : [0, 20]}
          allowDataOverflow={!hasValues}
          tickFormatter={formatTick}
          width={48}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          filterNull={false}
          isAnimationActive={false}
          cursor={{ stroke: 'var(--outline)' }}
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <div className="graph-tooltip" role="status">
                {payload[0].payload.label}
              </div>
            ) : null
          }
        />
        <Line
          dataKey="y"
          type="linear"
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={{ r: 3.2, fill: 'var(--accent)', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
          isAnimationActive={false}
        />
        {points
          .filter((point) => point.y !== null && !Number.isFinite(point.y))
          .map((point) => (
            <ReferenceLine
              key={point.x}
              x={point.x}
              stroke="none"
              label={{ value: '×', position: 'insideTop', fill: 'var(--accent)' }}
            />
          ))}
      </LineChart>
      <span className="chart-caption">{xLabel}</span>
    </div>
  );
}
