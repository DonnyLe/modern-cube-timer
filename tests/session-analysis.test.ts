import { describe, expect, it } from 'vitest';
import {
  bestAverage,
  rollingAverage,
  sessionSummary,
  distribution,
  consistencyBlocks,
  underTarget,
  compareStretches,
} from '../src/core/sessionAnalysis';
import type { Solve } from '../src/core/types';

const solve = (duration: number, penalty: Solve['penalty'] = 'none'): Solve => ({
  id: String(duration),
  sessionId: 'session',
  duration,
  penalty,
  scramble: 'R U',
  timestamp: 1,
  note: '',
});

describe('session analysis', () => {
  it('keeps penalty and DNF semantics in rolling and best averages', () => {
    const solves = [
      solve(10000),
      solve(12000, '+2'),
      solve(14000),
      solve(16000),
      solve(20000, 'DNF'),
    ];

    expect(rollingAverage(solves, 5)).toEqual([null, null, null, null, 44000 / 3]);
    expect(bestAverage(solves, 5)).toEqual({ time: 44000 / 3, start: 0, end: 4 });
    expect(bestAverage([...solves.slice(1), solve(20000, 'DNF')], 5)).toBeNull();
  });

  it('reports finished median separately from the untrimmed session mean', () => {
    const summary = sessionSummary([solve(10000), solve(12000, '+2'), solve(15000, 'DNF')]);

    expect(summary.mean).toBe(Infinity);
    expect(summary.median).toBe(12000);
    expect(summary.plusTwo).toBe(1);
    expect(summary.dnfs).toBe(1);
    expect(summary.solvingMs).toBe(37000);
  });

  it('handles empty and incomplete sessions', () => {
    expect(sessionSummary([]).median).toBeNull();
    expect(bestAverage([solve(10000)], 5)).toBeNull();
  });
});

it('rolling windows continue across the 50-solve boundary', () => {
  const solves = Array.from({ length: 65 }, (_, i) => solve((i + 1) * 1000));

  expect(rollingAverage(solves, 12)[50]).toBe(45500);
  expect(rollingAverage(solves, 50)[49]).toBe(25500);
  expect(rollingAverage(solves, 100)[64]).toBeNull();
});

it('distribution and targets account for +2, zero, ties and DNFs', () => {
  const solves = [solve(0), solve(14000, '+2'), solve(15000), solve(14000, 'DNF')];
  const bins = distribution(solves);

  expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  expect(bins[0].count).toBe(1);
  expect(underTarget(solves, 15000).at(-1)).toEqual({ number: 4, count: 1, percent: 25 });
  expect(distribution([solve(12000), solve(12000)])).toEqual([
    { lower: 12000, upper: 13000, count: 2 },
  ]);
});

it('consistency blocks retain incomplete and all-DNF blocks without zero times', () => {
  const blocks = consistencyBlocks(
    [solve(10000), solve(12000), solve(14000), solve(16000), solve(0, 'DNF')],
    4,
  );

  expect(blocks[0]).toMatchObject({ start: 0, end: 4, q1: 11500, median: 13000, q3: 14500 });
  expect(blocks[1]).toMatchObject({ start: 4, end: 5, count: 0, median: null });
});

it('stretch comparisons do not overlap and explain DNF omission', () => {
  expect(compareStretches([solve(12000)])).toBeNull();
  const solves = Array.from({ length: 12 }, (_, i) => solve(i < 3 ? 20000 : 10000));

  expect(compareStretches(solves)).toEqual({
    size: 3,
    opening: 20000,
    closing: 10000,
    change: -10000,
  });
  solves[0].penalty = 'DNF';
  expect(compareStretches(solves)?.opening).toBe(20000);
  expect(compareStretches(Array.from({ length: 12 }, () => solve(12000, 'DNF')))).toBeNull();
});

it('summarizes finished-solve spread without changing the untrimmed DNF mean', () => {
  const result = sessionSummary([solve(1000), solve(1000, '+2'), solve(5000), solve(8000, 'DNF')]);

  expect(result).toMatchObject({
    mean: Infinity,
    finishedCount: 3,
    finishedMean: 3000,
    median: 3000,
    slowest: 5000,
    range: 4000,
    q1: 2000,
    q3: 4000,
    dnfs: 1,
    plusTwo: 1,
  });
  expect(result.standardDeviation).toBeCloseTo(Math.sqrt(8000000 / 3));
  expect(sessionSummary([])).toMatchObject({
    finishedCount: 0,
    finishedMean: null,
    standardDeviation: null,
    slowest: null,
    range: null,
    q1: null,
    q3: null,
  });
  expect(sessionSummary([solve(5000, 'DNF')]).standardDeviation).toBeNull();
  expect(sessionSummary([solve(5000)]).standardDeviation).toBe(0);
});
