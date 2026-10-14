import { useEffect, useRef, useState, type ReactNode } from 'react';
import { puzzles, type PuzzleEvent } from '../core/puzzles';
import { loadTwisty } from '../core/cubing';

export function PuzzlePreview({
  scramble = '',
  event,
  faceOnly = false,
  className,
  children,
}: {
  scramble?: string;
  event: PuzzleEvent;
  faceOnly?: boolean;
  className?: string;
  children?: (status: 'loading' | 'ready' | 'error') => ReactNode;
}) {
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
        const [kpuzzle, svg] = await Promise.all([loader.kpuzzle(), loader.svg()]);
        const pattern = kpuzzle.defaultPattern().applyAlg(scramble);

        if (!alive) return;
        const preview = new ExperimentalSVGAnimator(kpuzzle, svg);
        const root = preview.svgElement;

        if (!(root instanceof SVGSVGElement)) throw new Error('Invalid puzzle preview');
        const stickers = Array.from(root.querySelectorAll<SVGGraphicsElement>('[id]')).filter(
          (element) => element instanceof SVGGraphicsElement && /-l\d+-o\d+$/.test(element.id),
        );
        // Read face membership from the solved source; the animator replaces fills with gradients.
        const source = new DOMParser().parseFromString(svg, 'image/svg+xml');
        const sourceStickers = Array.from(source.querySelectorAll<SVGElement>('[id]')).filter(
          (element) => /-l\d+-o\d+$/.test(element.id),
        );
        const color =
          event === 'sq1'
            ? 'white'
            : ['limegreen', '#44ee00', '#008800'].find((fill) =>
                sourceStickers.some((element) => element.style.fill === fill),
              ) || sourceStickers[0]?.style.fill;
        const faceIds = new Set(
          sourceStickers
            .filter((element) => element.style.fill === color)
            .map((element) => element.id),
        );
        const face = stickers.filter((element) => faceIds.has(element.id));

        preview.drawPattern(pattern);
        root.setAttribute('width', '100%');
        root.setAttribute('height', '100%');
        container.replaceChildren(root);

        if (faceOnly) {
          if (event === 'clock') {
            const box = root.viewBox.baseVal;

            root.setAttribute('viewBox', `${box.x} ${box.y} ${box.width / 2} ${box.height}`);
          } else if (face.length) {
            const inverse = root.getScreenCTM()!.inverse();
            const points = face.flatMap((element) => {
              const box = element.getBBox();
              const matrix = inverse.multiply(element.getScreenCTM()!);

              return [
                [box.x, box.y],
                [box.x + box.width, box.y],
                [box.x, box.y + box.height],
                [box.x + box.width, box.y + box.height],
              ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
            });
            const x = Math.min(...points.map((point) => point.x));
            const y = Math.min(...points.map((point) => point.y));
            const width = Math.max(...points.map((point) => point.x)) - x;
            const height = Math.max(...points.map((point) => point.y)) - y;
            const padding = Math.max(width, height) * 0.04;

            for (const sticker of stickers)
              if (!face.includes(sticker)) sticker.style.visibility = 'hidden';
            preview.svgElement
              .querySelectorAll('.hint-facelet')
              .forEach((element) => element.remove());
            root.setAttribute(
              'viewBox',
              `${x - padding} ${y - padding} ${width + 2 * padding} ${height + 2 * padding}`,
            );
          }
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
  }, [scramble, puzzle.puzzleId, faceOnly, event]);

  return (
    <>
      <div
        className={className ?? (faceOnly ? 'puzzle-face-preview' : 'cube-preview')}
        ref={ref}
        aria-label={
          scramble ? `${puzzle.label} state for ${scramble}` : `${puzzle.label} solved state`
        }
        data-puzzle={event}
        data-status={status}
      />
      {children?.(status)}
    </>
  );
}
