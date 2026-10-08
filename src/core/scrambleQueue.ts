import type { PuzzleEvent } from './puzzles';
export type ScrambleGenerator = (event: PuzzleEvent) => Promise<string>;
export class ScrambleQueue {
  private pending = new Map<PuzzleEvent, Promise<string>>();
  constructor(private generate: ScrambleGenerator) {}
  private prepare(event: PuzzleEvent) {
    const request = this.generate(event);
    this.pending.set(event, request);
    void request.catch(() => {
      if (this.pending.get(event) === request) this.pending.delete(event);
    });
    return request;
  }
  async next(event: PuzzleEvent) {
    const request = this.pending.get(event) || this.prepare(event);
    this.pending.delete(event);
    const scramble = await request;
    if (!this.pending.has(event)) this.prepare(event);
    return scramble;
  }
}
