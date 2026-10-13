import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Pause, RotateCw } from 'lucide-react';
import type { TwistyPlayer, TwistyPlayerConfig } from 'cubing/twisty';
import { loadTwisty } from '../core/cubing';
import { puzzles, type PuzzleEvent } from '../core/puzzles';
import { Preview } from './Preview';

export function PuzzleArtwork({ puzzle, scramble }: { puzzle: PuzzleEvent; scramble: string }) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<TwistyPlayer | null>(null);
  const scrambleRef = useRef(scramble);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<'loading' | '3d' | 'face'>('loading');
  const [spinning, setSpinning] = useState(true);

  useEffect(() => {
    scrambleRef.current = scramble;
    if (player.current) player.current.experimentalSetupAlg = scramble;
  }, [scramble]);

  useEffect(() => {
    let alive = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let resize: ResizeObserver | undefined;
    const host = container.current!;
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');

    if (!context || puzzle === 'clock' || puzzle === 'sq1') {
      setMode('face');
      context?.getExtension('WEBGL_lose_context')?.loseContext();

      return;
    }

    context.getExtension('WEBGL_lose_context')?.loseContext();
    setMode('loading');
    void loadTwisty()
      .then(async ({ TwistyPlayer: Player }) => {
        if (!alive) return;
        const next = new Player({
          puzzle: puzzles[puzzle].puzzleId as TwistyPlayerConfig['puzzle'],
          experimentalSetupAlg: scrambleRef.current,
          visualization: '3D',
          background: 'none',
          controlPanel: 'none',
          hintFacelets: 'none',
          backView: 'none',
          viewerLink: 'none',
          cameraDistance: 4.2,
          cameraLatitude: 25,
          cameraLongitude: 30,
        });

        player.current = next;
        next.style.width = '100%';
        next.style.height = '100%';
        host.replaceChildren(next);
        resize = new ResizeObserver(([entry]) => {
          next.cameraDistance = entry.contentRect.width > entry.contentRect.height ? 5.5 : 4.2;
        });
        resize.observe(host);
        await Promise.race([
          next.experimentalCurrentCanvases(),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('3D unavailable')), 6000);
          }),
        ]);
        clearTimeout(timeout);
        if (alive) setMode('3d');
      })
      .catch(() => {
        clearTimeout(timeout);
        resize?.disconnect();

        if (alive) {
          player.current?.pause();
          host.replaceChildren();
          setMode('face');
        }
      });

    return () => {
      alive = false;
      clearTimeout(timeout);
      resize?.disconnect();
      player.current?.pause();
      player.current = null;
      host.replaceChildren();
    };
  }, [puzzle]);

  useEffect(() => {
    if (mode !== '3d' || !spinning || reducedMotion) return;
    let frame = 0;
    let previous = 0;
    let longitude = 30;

    const animate = (now: number) => {
      if (previous) longitude += Math.min(now - previous, 100) * 0.012;
      previous = now;
      if (player.current) player.current.cameraLongitude = longitude % 360;
      frame = requestAnimationFrame(animate);
    };

    const visibility = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden) frame = requestAnimationFrame(animate);
    };

    visibility();
    document.addEventListener('visibilitychange', visibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [mode, spinning, reducedMotion]);

  return (
    <div className="puzzle-artwork" data-puzzle={puzzle} data-mode={mode}>
      <div
        className="puzzle-artwork-stage"
        ref={container}
        onPointerDown={() => setSpinning(false)}
        aria-label={`${puzzles[puzzle].label} 3D preview`}
      />
      {mode === 'face' && <Preview event={puzzle} scramble={scramble} faceOnly />}
      {mode === 'loading' && <p className="subtle">Preparing puzzle…</p>}
      {mode === '3d' && (
        <div className="puzzle-artwork-caption">
          <small>Drag to rotate</small>
          {!reducedMotion && (
            <button
              className="icon-button small"
              aria-label={spinning ? 'Pause puzzle rotation' : 'Rotate puzzle'}
              onClick={() => setSpinning(!spinning)}
            >
              {spinning ? <Pause size={16} /> : <RotateCw size={16} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
