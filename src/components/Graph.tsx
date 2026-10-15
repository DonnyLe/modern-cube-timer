import { useState } from 'react';

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
  formatTick = (value) => Number(value.toFixed(2)).toString(),
}: {
  points: GraphPoint[];
  label: string;
  xLabel: string;
  yLabel: string;
  formatTick?: (value: number) => string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const finite = points
    .map((point) => point.y)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const low = finite.length ? Math.min(...finite) : 0;
  const high = finite.length ? Math.max(...finite) : 20;
  const padding = Math.max((high - low) * 0.1, Math.abs(high) * 0.05, 1);
  const min = low >= 0 ? Math.max(0, low - padding) : low - padding;
  const max = high + padding;
  const first = points[0]?.x ?? 0;
  const last = points.at(-1)?.x ?? first;
  const x = (value: number) => 52 + (first === last ? 0.5 : (value - first) / (last - first)) * 398;
  const y = (value: number) => 166 - ((value - min) / (max - min)) * 132;
  const segments: string[] = [];
  let segment = '';

  points.forEach((point) => {
    if (point.y === null || !Number.isFinite(point.y)) {
      if (segment) segments.push(segment);
      segment = '';
    } else segment += `${segment ? ' L' : 'M'}${x(point.x)},${y(point.y)}`;
  });
  if (segment) segments.push(segment);
  const detail =
    points.find((point) => point.x === selected)?.label ?? 'Hover, tap, or focus a point.';

  return (
    <div className="graph">
      <span className="graph-unit">{yLabel}</span>
      <svg viewBox="0 0 480 204" className="graph-chart" role="group" aria-label={label}>
        {[0, 1, 2, 3].map((i) => {
          const yy = 166 - i * 44;

          return (
            <g key={i} aria-hidden="true">
              <line x1="52" x2="458" y1={yy} y2={yy} className="gridline" />
              <text x="42" y={yy + 4} textAnchor="end">
                {formatTick(min + ((max - min) * i) / 3)}
              </text>
            </g>
          );
        })}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" className="plot-line" aria-hidden="true" />
        ))}
        {points.map((point, index) =>
          point.y === null ? null : (
            <g
              key={point.x}
              role="button"
              tabIndex={0}
              aria-label={point.label}
              className="graph-target"
              onPointerEnter={() => setSelected(point.x)}
              onFocus={() => setSelected(point.x)}
              onClick={() => setSelected(point.x)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(point.x);
                }
              }}
            >
              <rect
                x={index === 0 ? 42 : (x(points[index - 1].x) + x(point.x)) / 2}
                y="10"
                width={
                  (index === points.length - 1 ? 460 : (x(point.x) + x(points[index + 1].x)) / 2) -
                  (index === 0 ? 42 : (x(points[index - 1].x) + x(point.x)) / 2)
                }
                height="164"
                className="graph-hit"
              />
              {Number.isFinite(point.y) ? (
                <circle cx={x(point.x)} cy={y(point.y)} r="3.2" className="plot-point" />
              ) : (
                <text x={x(point.x)} y="26" textAnchor="middle">
                  ×
                </text>
              )}
              <title>{point.label}</title>
            </g>
          ),
        )}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1]
          .filter((v, i, a) => v >= 0 && a.indexOf(v) === i)
          .map((i) => (
            <text key={i} x={x(points[i].x)} y="188" textAnchor="middle" aria-hidden="true">
              {points[i].x}
            </text>
          ))}
      </svg>
      <span className="chart-caption">{xLabel}</span>
      <p className="graph-detail" aria-live="polite">
        {detail}
      </p>
    </div>
  );
}
