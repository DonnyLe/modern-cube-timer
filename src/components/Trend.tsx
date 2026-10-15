import { useState } from 'react';
import { average, formatTime, value } from '../core/statistics';
import type { Solve } from '../core/types';
import { Graph } from './Graph';
import { Select } from './ui/Select';

const options = [
  { value: 'time', label: 'Solve times' },
  { value: 'ao12', label: 'Rolling ao12' },
] as const;
const pageSize = 50;

export function Trend({ solves }: { solves: Solve[] }) {
  const [metric, setMetric] = useState<'time' | 'ao12'>('time');
  const [older, setOlder] = useState(0);
  const end = Math.max(Math.min(pageSize, solves.length), solves.length - older);
  const start = Math.max(0, end - pageSize);
  const points = solves.slice(start, end).map((solve, i) => {
    const index = start + i;
    const ms =
      metric === 'time'
        ? value(solve)
        : average(solves.slice(Math.max(0, index - 11), index + 1), 12);

    return {
      x: index + 1,
      y: ms === null ? null : ms / 1000,
      label: `Solve ${index + 1}${metric === 'ao12' ? ' ao12' : ''}: ${formatTime(ms)}`,
    };
  });

  return (
    <>
      {solves.length > pageSize && (
        <div className="trend-navigation">
          <button
            className="text-button"
            aria-label="Older solves"
            disabled={start === 0}
            onClick={() => setOlder(solves.length - Math.max(pageSize, end - pageSize))}
          >
            ←
          </button>
          <span className="subtle">
            {start + 1}–{end}
          </span>
          <button
            className="text-button"
            aria-label="Newer solves"
            disabled={end === solves.length}
            onClick={() => setOlder(Math.max(0, solves.length - end - pageSize))}
          >
            →
          </button>
        </div>
      )}
      <div className="trend-view">
        <div className="trend-selector">
          <Select label="Graph type" value={metric} options={options} onValueChange={setMetric} />
        </div>
        {!solves.length ? (
          <div className="empty">
            <span className="empty-line">↗</span>
            <p>Your progress, one solve at a time.</p>
            <small>Your session trend will appear here.</small>
          </div>
        ) : metric === 'ao12' && solves.length < 12 ? (
          <div className="empty">
            <p>Rolling ao12 needs 12 solves.</p>
            <small>{12 - solves.length} more to see your first average.</small>
          </div>
        ) : (
          <Graph
            key={`${metric}-${start}`}
            points={points}
            label={`${metric === 'time' ? 'Solve times' : 'Rolling ao12'}, solves ${start + 1}–${end}`}
            xLabel="Solve"
            yLabel="Time (s)"
          />
        )}
      </div>
    </>
  );
}
