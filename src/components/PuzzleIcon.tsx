import type { PuzzleEvent } from '../core/puzzles';

// Small puzzle identifiers, rather than thumbnails of a session's last scramble.
export function PuzzleIcon({ puzzle }: { puzzle: PuzzleEvent }) {
  const colors = ['#ffda00', '#ff8b00', '#00c853', '#1976ff', '#ed2929', '#f7fafc'];
  const stroke = '#17202c';
  const size = /^[2-7]{3}$/.test(puzzle) ? Number(puzzle[0]) : 3;

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="manager-puzzle-icon">
      {puzzle === 'pyram' ? (
        <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M24 3 14 21h20Z" fill={colors[4]} />
          <path d="M14 21 4 40h20Z" fill={colors[2]} />
          <path d="m14 21 10 19 10-19Z" fill={colors[0]} />
          <path d="M34 21 24 40h20Z" fill={colors[3]} />
        </g>
      ) : puzzle === 'clock' ? (
        <g stroke={stroke} strokeWidth="1.5">
          <rect x="3" y="3" width="42" height="42" rx="7" fill="#72c7e7" />
          {[12, 24, 36].flatMap((x) =>
            [12, 24, 36].map((y) => (
              <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r="4.5" fill="#f7fafc" />
                <path d={`M${x} ${y - 3}v3h2`} fill="none" />
              </g>
            )),
          )}
        </g>
      ) : puzzle === 'minx' ? (
        <g stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
          <path d="m24 3 21 15-8 25H11L3 18Z" fill={colors[2]} />
          <path d="m24 3 0 21L3 18Z" fill={colors[0]} />
          <path d="m24 3 21 15-21 6Z" fill={colors[4]} />
          <path d="m24 24 21-6-8 25Z" fill={colors[3]} />
          <path d="m24 24-13 19H37Z" fill={colors[1]} />
          <path d="m24 15 9 7-3 10H18l-3-10Z" fill={colors[5]} />
        </g>
      ) : (
        <g stroke={stroke} strokeWidth={size > 4 ? 1 : 1.6}>
          {Array.from({ length: size * size }, (_, index) => (
            <rect
              key={index}
              x={3 + (index % size) * (42 / size)}
              y={3 + Math.floor(index / size) * (42 / size)}
              width={42 / size}
              height={42 / size}
              rx="1.5"
              fill={colors[(index * 5 + Math.floor(index / size)) % colors.length]}
            />
          ))}
          {puzzle === 'skewb' && <path d="m3 3 42 42M45 3 3 45" fill="none" />}
          {puzzle === 'sq1' && <path d="M3 24h42M24 3v42" fill="none" strokeWidth="3" />}
        </g>
      )}
    </svg>
  );
}
