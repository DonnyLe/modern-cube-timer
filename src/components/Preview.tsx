import { useEffect, useRef, useState } from 'react';
import { puzzles, type PuzzleEvent } from '../core/puzzles';
import { loadTwisty } from '../core/cubing';
export function Preview({ scramble, event }: { scramble: string; event: PuzzleEvent }) {
  const ref = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const puzzle = puzzles[event];
  useEffect(() => {
    let alive = true;
    const container = ref.current!;
    container.replaceChildren();
    setStatus('loading');
    if (scramble)
      void loadTwisty()
        .then(async ({ puzzles: loaders, ExperimentalSVGAnimator }) => {
          const loader = loaders[puzzle.puzzleId];
          const [kpuzzle, svg] = await Promise.all([loader.kpuzzle(), loader.svg()]);
          const pattern = kpuzzle.defaultPattern().applyAlg(scramble);
          if (!alive) return;
          const preview = new ExperimentalSVGAnimator(kpuzzle, svg);
          preview.drawPattern(pattern);
          preview.svgElement.setAttribute('width', '100%');
          preview.svgElement.setAttribute('height', '100%');
          container.replaceChildren(preview.svgElement);
          setStatus('ready');
        })
        .catch(() => {
          if (alive) setStatus('error');
        });
    return () => {
      alive = false;
      container.replaceChildren();
    };
  }, [scramble, puzzle.puzzleId]);
  return (
    <>
      <div
        className="cube-preview"
        ref={ref}
        aria-label={`${puzzle.label} state for ${scramble}`}
        data-puzzle={event}
        data-status={status}
      />
      <p className="preview-caption">
        {status === 'error'
          ? 'Preview unavailable'
          : status === 'ready'
            ? `${puzzle.label} state preview`
            : 'Preparing your preview…'}
      </p>
    </>
  );
}
