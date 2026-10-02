import type { Solve } from './types';
export function value(s: Pick<Solve, 'duration' | 'penalty'>): number { return s.penalty === 'DNF' ? Infinity : s.duration + (s.penalty === '+2' ? 2000 : 0); }
export function average(solves: Solve[], count: number, trim = true): number | null {
  if (solves.length < count) return null;
  let values = solves.slice(-count).map(value).sort((a, b) => a - b);
  if (trim) { const drop = Math.ceil(count * .05); values = values.slice(drop, -drop); }
  return values.reduce((a, b) => a + b, 0) / values.length;
}
export function statistics(solves: Solve[]) {
  return { count: solves.length, best: solves.length ? Math.min(...solves.map(value)) : null, mean: solves.length ? solves.map(value).reduce((a, b) => a + b, 0) / solves.length : null, mo3: average(solves, 3, false), ao5: average(solves, 5), ao12: average(solves, 12), ao100: average(solves, 100) };
}
export function formatTime(ms: number | null, precision = 2): string {
  if (ms === null) return '—';
  if (!Number.isFinite(ms)) return 'DNF';
  const factor = 10 ** precision;
  const units = Math.floor(Math.max(0, ms) / 1000 * factor + 1e-7);
  const seconds = units / factor;
  return seconds < 60 ? seconds.toFixed(precision) : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(precision).padStart(precision + 3, '0')}`;
}
export function parseTime(input: string): number | null {
  if (!/^\d+(?::[0-5]?\d)?(?:\.\d{1,3})?$/.test(input.trim())) return null;
  const parts = input.trim().split(':').map(Number);
  const ms = Math.round((parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0]) * 1000);
  return Number.isFinite(ms) && ms > 0 && ms < 86400000 ? ms : null;
}
