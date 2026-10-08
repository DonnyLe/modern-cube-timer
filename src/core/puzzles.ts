export const puzzleEvents = [
  '222',
  '333',
  '444',
  '555',
  '666',
  '777',
  'pyram',
  'skewb',
  'minx',
  'sq1',
  'clock',
] as const;
export type PuzzleEvent = (typeof puzzleEvents)[number];
export const puzzles: Record<PuzzleEvent, { label: string; puzzleId: string }> = {
  '222': { label: '2×2×2', puzzleId: '2x2x2' },
  '333': { label: '3×3×3', puzzleId: '3x3x3' },
  '444': { label: '4×4×4', puzzleId: '4x4x4' },
  '555': { label: '5×5×5', puzzleId: '5x5x5' },
  '666': { label: '6×6×6', puzzleId: '6x6x6' },
  '777': { label: '7×7×7', puzzleId: '7x7x7' },
  pyram: { label: 'Pyraminx', puzzleId: 'pyraminx' },
  skewb: { label: 'Skewb', puzzleId: 'skewb' },
  minx: { label: 'Megaminx', puzzleId: 'megaminx' },
  sq1: { label: 'Square-1', puzzleId: 'square1' },
  clock: { label: 'Clock', puzzleId: 'clock' },
};
// Standard csTimer scrambler IDs. Unrecognized training/events are not silently relabeled.
export const csTimerPuzzles: Record<string, PuzzleEvent> = {
  '222so': '222',
  '333': '333',
  '444wca': '444',
  '555wca': '555',
  '666wca': '666',
  '777wca': '777',
  pyrso: 'pyram',
  skbso: 'skewb',
  mgmp: 'minx',
  sqrs: 'sq1',
  clkwca: 'clock',
};
