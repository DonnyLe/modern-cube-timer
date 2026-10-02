import { useEffect, useRef, useState } from 'react';
export function Preview({ scramble }: { scramble: string }) {
  const ref = useRef<HTMLDivElement>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    let player: HTMLElement | undefined;
    if (scramble)
      import('cubing/twisty')
        .then(({ TwistyPlayer }) => {
          if (!alive) return;
          player = new TwistyPlayer({
            puzzle: '3x3x3',
            alg: scramble,
            visualization: '2D',
            background: 'none',
            controlPanel: 'none',
            hintFacelets: 'none',
            experimentalSetupAnchor: 'start',
          });
          (player as unknown as { timestamp: string }).timestamp = 'end';
          player.style.width = '100%';
          player.style.height = '100%';
          ref.current?.replaceChildren(player);
          setError(false);
        })
        .catch(() => setError(true));
    return () => {
      alive = false;
      player?.remove();
    };
  }, [scramble]);
  return (
    <>
      <div className="cube-preview" ref={ref} aria-label={`3 by 3 cube state for ${scramble}`} />
      <p className="preview-caption">
        {error
          ? 'Preview unavailable'
          : scramble
            ? '3×3 state preview'
            : 'Preparing your scramble…'}
      </p>
    </>
  );
}
