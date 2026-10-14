import { puzzles, type PuzzleEvent } from '../core/puzzles';
import { PuzzlePreview } from './PuzzlePreview';

export function Preview({
  scramble,
  event,
  faceOnly = false,
}: {
  scramble: string;
  event: PuzzleEvent;
  faceOnly?: boolean;
}) {
  return (
    <PuzzlePreview scramble={scramble} event={event} faceOnly={faceOnly}>
      {(status) => (
        <p className="preview-caption">
          {status === 'error'
            ? 'Preview unavailable'
            : status === 'ready'
              ? faceOnly
                ? 'One face of your scramble'
                : `${puzzles[event].label} state preview`
              : 'Preparing your preview…'}
        </p>
      )}
    </PuzzlePreview>
  );
}
