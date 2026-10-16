import { average, statistics, value } from './statistics';
import type { Solve } from './types';

export function quantile(sorted: number[], fraction: number): number | null {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);

  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}

export function distribution(solves: Solve[]) {
  const times = solves.map(value).filter(Number.isFinite);

  if (!times.length) return [];
  const min = Math.floor(Math.min(...times) / 1000) * 1000;
  const max = Math.max(...times);
  const width = Math.max(1000, Math.ceil((max - min + 1) / 8000) * 1000);

  return Array.from({ length: Math.ceil((max - min + 1) / width) }, (_, i) => {
    const lower = min + i * width;
    const upper = lower + width;

    return { lower, upper, count: times.filter((time) => time >= lower && time < upper).length };
  });
}

export function consistencyBlocks(solves: Solve[], size = 50) {
  return Array.from({ length: Math.ceil(solves.length / size) }, (_, index) => {
    const start = index * size;
    const end = Math.min(solves.length, start + size);
    const times = solves
      .slice(start, end)
      .map(value)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    return {
      start,
      end,
      count: times.length,
      q1: quantile(times, 0.25),
      median: quantile(times, 0.5),
      q3: quantile(times, 0.75),
    };
  });
}

export function underTarget(solves: Solve[], target: number) {
  let count = 0;

  return solves.map((solve, index) => {
    if (value(solve) < target) count++;

    return { number: index + 1, count, percent: (count / (index + 1)) * 100 };
  });
}

export function compareStretches(solves: Solve[]) {
  if (solves.length < 12) return null;
  const size = Math.min(50, Math.floor(solves.length / 4));

  const mean = (items: Solve[]) => {
    const times = items.map(value).filter(Number.isFinite);

    return times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : null;
  };

  const opening = mean(solves.slice(0, size));
  const closing = mean(solves.slice(-size));

  return opening === null || closing === null
    ? null
    : { size, opening, closing, change: closing - opening };
}

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
