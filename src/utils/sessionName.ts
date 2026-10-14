import { puzzles, type PuzzleEvent } from '../core/puzzles';

export function sessionName(puzzle: PuzzleEvent, timestamp = Date.now()) {
  const hour = new Date(timestamp).getHours();
  const period =
    hour < 5
      ? 'Night'
      : hour < 12
        ? 'Morning'
        : hour < 17
          ? 'Afternoon'
          : hour < 22
            ? 'Evening'
            : 'Night';
  const label = /^[2-7]{3}$/.test(puzzle) ? `${puzzle[0]}x${puzzle[0]}` : puzzles[puzzle].label;

  return `${period} ${label} session`;
}
