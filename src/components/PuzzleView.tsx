import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Pause, RotateCw } from 'lucide-react';
import type { TwistyPlayer, TwistyPlayerConfig } from 'cubing/twisty';
import { puzzles, type PuzzleEvent } from '../core/puzzles';
import { loadScramble, loadTwisty } from '../core/cubing';
import { puzzleFaces } from '../core/puzzleFaces';

interface PuzzleViewProps {
  event: PuzzleEvent;
  scramble?: string;
  variant?: 'net' | 'face' | '3d';
  randomized?: boolean;
  caption?: boolean;
  className?: string;
}

export function PuzzleView({ variant = 'net', ...props }: PuzzleViewProps) {
  return variant === '3d' ? (
    <RotatingPuzzleView event={props.event} scramble={props.scramble} />
  ) : (
    <FlatPuzzleView {...props} variant={variant} />
  );
}

// Keep decorative thumbnails stable while browsing and filtering sessions.
const previewScrambles = new Map<PuzzleEvent, Promise<string>>();

function randomPreviewScramble(event: PuzzleEvent) {
  let pending = previewScrambles.get(event);

  if (!pending) {
    pending = loadScramble()
      .then((module) => module.randomScrambleForEvent(event))
      .then((algorithm) => algorithm.toString())
      .catch((error: unknown) => {
        previewScrambles.delete(event);
        throw error;
      });
    previewScrambles.set(event, pending);
  }

  return pending;
}

function FlatPuzzleView({
  scramble = '',
  event,
  variant,
  randomized = false,
  caption = true,
  className,
}: PuzzleViewProps) {
  const faceOnly = variant === 'face';
  const ref = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const puzzle = puzzles[event];

  useEffect(() => {
    let alive = true;
    const container = ref.current!;

    container.replaceChildren();
    setStatus('loading');
    void loadTwisty()
      .then(async ({ puzzles: loaders, ExperimentalSVGAnimator }) => {
        const loader = loaders[puzzle.puzzleId];
        const [kpuzzle, svg, algorithm] = await Promise.all([
          loader.kpuzzle(),
          loader.svg(),
          randomized ? randomPreviewScramble(event) : scramble,
        ]);
        const pattern = kpuzzle.defaultPattern().applyAlg(algorithm);

        if (!alive) return;
        const preview = new ExperimentalSVGAnimator(kpuzzle, svg);
        const root = preview.svgElement;

        if (!(root instanceof SVGSVGElement)) throw new Error('Invalid puzzle preview');

        preview.drawPattern(pattern);
        root.setAttribute('width', '100%');
        root.setAttribute('height', '100%');
        container.replaceChildren(root);

        if (faceOnly) {
          const face = puzzleFaces[event];

          if (face.stickers) {
            const visible = new Set(face.stickers);

            root.querySelectorAll<SVGElement>('[id]').forEach((element) => {
              if (/-l\d+-o\d+$/.test(element.id) && !visible.has(element.id))
                element.style.visibility = 'hidden';
            });
            root.querySelectorAll('.hint-facelet').forEach((element) => element.remove());
          }

          root.setAttribute('viewBox', face.viewBox);
        }

        setStatus('ready');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });

    return () => {
      alive = false;
      container.replaceChildren();
    };
  }, [scramble, puzzle.puzzleId, faceOnly, event, randomized]);

  return (
    <>
      <div
        className={className ?? (faceOnly ? 'puzzle-face-preview' : 'cube-preview')}
        ref={ref}
        aria-label={
          randomized
            ? `${puzzle.label} randomized preview`
            : scramble
              ? `${puzzle.label} state for ${scramble}`
              : `${puzzle.label} solved state`
        }
        data-puzzle={event}
        data-status={status}
      />
      {caption && (
        <p className="preview-caption">
          {status === 'error'
            ? 'Preview unavailable'
            : status === 'ready'
              ? faceOnly
                ? 'One face of your scramble'
                : `${puzzle.label} state preview`
              : 'Preparing your preview…'}
        </p>
      )}
    </>
  );
}

function RotatingPuzzleView({
  event: puzzle,
  scramble = '',
}: Pick<PuzzleViewProps, 'event' | 'scramble'>) {
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
          cameraDistance: puzzle === 'minx' ? 7 : puzzle === '333' ? 6.3 : 6.6,
          cameraLatitude: 25,
          cameraLongitude: 30,
        });

        player.current = next;
        next.style.width = '100%';
        next.style.height = '100%';
        host.replaceChildren(next);
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

        if (alive) {
          player.current?.pause();
          host.replaceChildren();
          setMode('face');
        }
      });

    return () => {
      alive = false;
      clearTimeout(timeout);
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
      {mode === 'face' && <FlatPuzzleView event={puzzle} scramble={scramble} variant="face" />}
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
