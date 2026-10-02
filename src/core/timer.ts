import type { Penalty } from './types';
export type Phase = 'idle' | 'inspection' | 'holding' | 'ready' | 'running';
export interface Result {
  duration: number;
  penalty: Penalty;
}
// All timestamps are supplied by a monotonic clock, independently of rendering.
export class TimerEngine {
  phase: Phase = 'idle';
  private held = false;
  private downAt = 0;
  private startedAt = 0;
  private inspectionAt: number | null = null;
  private penalty: Penalty = 'none';
  constructor(
    public inspection = false,
    public holdMs = 300,
  ) {}
  press(now: number): Result | null {
    if (this.held) return null;
    this.held = true;
    if (this.phase === 'running') {
      const result = { duration: Math.max(0, now - this.startedAt), penalty: this.penalty };
      this.phase = 'idle';
      this.inspectionAt = null;
      return result;
    }
    if (this.phase === 'idle' && this.inspection) {
      this.inspectionAt = now;
      this.phase = 'inspection';
      return null;
    }
    this.downAt = now;
    this.phase = 'holding';
    return null;
  }
  release(now: number) {
    if (!this.held) return;
    this.held = false;
    if (this.phase !== 'holding' && this.phase !== 'ready') return;
    if (now - this.downAt < this.holdMs) {
      this.phase = this.inspectionAt === null ? 'idle' : 'inspection';
      return;
    }
    const elapsed = this.inspectionAt === null ? 0 : now - this.inspectionAt;
    this.penalty = elapsed >= 17000 ? 'DNF' : elapsed >= 15000 ? '+2' : 'none';
    this.startedAt = now;
    this.phase = 'running';
  }
  tick(now: number) {
    if (this.phase === 'holding' && now - this.downAt >= this.holdMs) this.phase = 'ready';
    return this.phase === 'running'
      ? now - this.startedAt
      : this.inspectionAt !== null
        ? Math.max(0, 15000 - (now - this.inspectionAt))
        : 0;
  }
  inspectionPenalty(now: number): Penalty {
    const t = this.inspectionAt === null ? 0 : now - this.inspectionAt;
    return t >= 17000 ? 'DNF' : t >= 15000 ? '+2' : 'none';
  }
  cancel() {
    this.phase = 'idle';
    this.held = false;
    this.inspectionAt = null;
  }
}
