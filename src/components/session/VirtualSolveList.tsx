import { Checkbox } from '../ui/Checkbox';
import { useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatTime, value } from '../../core/statistics';
import type { Solve } from '../../core/types';

export function VirtualSolveList({
  solves,
  precision,
  onOpenSolve,
  selection,
}: {
  solves: { solve: Solve; number: number }[];
  precision: number;
  onOpenSolve: (solve: Solve) => void;
  selection?: {
    checkedIds: Set<string>;
    disabled: boolean;
    onToggle: (id: string, checked: boolean) => void;
  };
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const getItemKey = useCallback((index: number) => solves[index].solve.id, [solves]);
  const virtualizer = useVirtualizer({
    count: solves.length,
    getScrollElement: () => scrollRef.current,
    getItemKey,
    estimateSize: () => 100,
    overscan: 6,
  });

  return (
    <div
      ref={scrollRef}
      className="session-solve-scroll"
      role="region"
      aria-label="Scrollable solves"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !['Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        virtualizer.scrollToIndex(event.key === 'Home' ? 0 : solves.length - 1, {
          align: event.key === 'Home' ? 'start' : 'end',
        });
      }}
    >
      <div
        className="session-solve-list"
        role="list"
        aria-label="Solves"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const { solve, number } = solves[row.index];

          return (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={row.index}
              role="listitem"
              aria-posinset={row.index + 1}
              aria-setsize={solves.length}
              className={`session-virtual-solve ${selection ? 'session-selectable-solve' : ''}`}
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {selection && (
                <Checkbox
                  className="session-solve-checkbox"
                  label={`Select solve ${number}`}
                  checked={selection.checkedIds.has(solve.id)}
                  disabled={selection.disabled}
                  onCheckedChange={(checked) => selection.onToggle(solve.id, checked)}
                />
              )}
              <button
                className="session-solve-row"
                id={`session-solve-${solve.id}`}
                onClick={() => onOpenSolve(solve)}
                aria-label={`Open solve ${number}: ${formatTime(value(solve), precision)}`}
              >
                <span className="subtle">#{number}</span>
                <strong>
                  {formatTime(value(solve), precision)}
                  {solve.penalty === '+2' && <small> +2</small>}
                </strong>
                <span>
                  <span className="session-scramble">
                    {solve.scramble || 'No scramble recorded'}
                  </span>
                  {solve.note && <span className="session-row-note">{solve.note}</span>}
                </span>
                <time dateTime={new Date(solve.timestamp).toISOString()}>
                  {new Date(solve.timestamp).toLocaleString()}
                </time>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
