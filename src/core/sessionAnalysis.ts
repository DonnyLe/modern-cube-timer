import { average, statistics, value } from './statistics';
import type { Solve } from './types';

export function rollingAverage(solves: Solve[], count: number) {
  return solves.map((_, index) =>
    average(solves.slice(Math.max(0, index + 1 - count), index + 1), count),
  );
}

export function bestAverage(
  solves: Solve[],
  count: number,
): { time: number; start: number; end: number } | null {
  const windows = rollingAverage(solves, count);
  let best: { time: number; start: number; end: number } | null = null;

  windows.forEach((time, index) => {
    if (time !== null && Number.isFinite(time) && (!best || time < best.time))
      best = { time, start: index + 1 - count, end: index };
  });

  return best;
}

export function sessionSummary(solves: Solve[]) {
  const stats = statistics(solves);
  const finished = solves
    .map(value)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const middle = Math.floor(finished.length / 2);

  return {
    ...stats,
    best5: bestAverage(solves, 5),
    best12: bestAverage(solves, 12),
    median: finished.length
      ? (finished[middle] + finished[Math.floor((finished.length - 1) / 2)]) / 2
      : null,
    dnfs: solves.filter((s) => s.penalty === 'DNF').length,
    plusTwo: solves.filter((s) => s.penalty === '+2').length,
    solvingMs: solves.reduce((sum, solve) => sum + solve.duration, 0),
  };
}
