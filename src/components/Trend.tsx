import { formatTime, value } from '../core/statistics';
import type { Solve } from '../core/types';
export function Trend({ solves }: { solves: Solve[] }) {
  const shown = solves.slice(-50),
    values = shown.map(value),
    finite = values.filter(Number.isFinite);
  if (!shown.length)
    return (
      <div className="empty">
        <span className="empty-line">↗</span>
        <p>Your progress, one solve at a time.</p>
        <small>Your session trend will appear here.</small>
      </div>
    );
  const min = finite.length ? Math.max(0, Math.floor(Math.min(...finite) / 2000) * 2 - 2) : 0,
    max = finite.length ? Math.max(min + 4, Math.ceil(Math.max(...finite) / 2000) * 2) : 20;
  const x = (i: number) => 42 + (shown.length === 1 ? 0.5 : i / (shown.length - 1)) * 408,
    y = (v: number) => 166 - ((v / 1000 - min) / (max - min)) * 132;
  const segments: string[] = [];
  let segment = '';
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) {
      if (segment) segments.push(segment);
      segment = '';
    } else segment += `${segment ? ' L' : 'M'}${x(i)},${y(v)}`;
  });
  if (segment) segments.push(segment);
  return (
    <>
      <svg
        viewBox="0 0 480 204"
        className="trend-chart"
        role="img"
        aria-label={`Session trend. ${shown.length} solves. ${shown.map((s, i) => `Solve ${solves.length - shown.length + i + 1}: ${formatTime(value(s))}`).join('; ')}`}
      >
        {[0, 1, 2, 3].map((i) => {
          const yy = 166 - i * 44;
          return (
            <g key={i}>
              <line x1="42" x2="458" y1={yy} y2={yy} className="gridline" />
              <text x="30" y={yy + 4} textAnchor="end">
                {(min + ((max - min) * i) / 3).toFixed(0)}
              </text>
            </g>
          );
        })}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" className="plot-line" />
        ))}
        {values.map((v, i) =>
          Number.isFinite(v) ? (
            <circle key={i} cx={x(i)} cy={y(v)} r="3.2" className="plot-point">
              <title>{formatTime(v)}</title>
            </circle>
          ) : (
            <text key={i} x={x(i)} y="22" textAnchor="middle" className="dnf-mark">
              ×<title>DNF</title>
            </text>
          ),
        )}
        {[0, Math.floor((shown.length - 1) / 2), shown.length - 1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => (
            <text key={i} x={x(i)} y="188" textAnchor="middle">
              {solves.length - shown.length + i + 1}
            </text>
          ))}
      </svg>
      <span className="chart-caption">Solve</span>
    </>
  );
}
